import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { NextResponse } from "next/server";
import { z } from "zod";
import { extractAndParseJson } from "@/lib/agents/parseJson";
import {
  AGENT_MODELS,
  KWALIFIKACJA_MERGED_SYSTEM_PROMPT,
  KWALIFIKACJA_MERGED_UZUPELNIENIE_SUFFIX,
  KWALIFIKACJA_MERGED_VERIFICATION_SUFFIX,
} from "@/lib/agents/prompts";
import {
  getClientPage,
  getKwalifikacjaKnowledge,
  saveKwalifikacjaMergedOutput,
} from "@/lib/notion/client";

export const maxDuration = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ReqSchema = z.object({
  transcript: z.string().min(10, "Transkrypt jest za krótki"),
  notion_page_id: z.string().optional(),
  // Domyślnie false — Etap 3 (weryfikacja porównawcza na realnych transkryptach) woła ten
  // endpoint wyłącznie po JSON, bez dotykania produkcyjnego Pipeline. Zapis do Notion wymaga
  // świadomego opt-in, nie jest zachowaniem domyślnym dopóki merge nie przejdzie weryfikacji.
  save_to_notion: z.boolean().optional().default(false),
  // Blok 0.2 — tryb weryfikacja/uzupełnienie przeniesiony ze starego Agenta 1.
  mode: z.enum(["standard", "weryfikacja", "uzupelnienie"]).default("standard"),
  existing_client_id: z.string().optional(),
});

interface MergedOutput {
  kwalifikacja: Record<string, unknown>;
  brief_discovery: Record<string, unknown> | null;
  prezentacja: Record<string, unknown> | null;
}

// ETAP 1 patcha "scalony Agent Kwalifikacja" — endpoint NIE zapisuje jeszcze do Notion
// (to jest Etap 2, osobna funkcja saveKwalifikacjaMergedOutput). Stare app/api/agents/
// agent1|agent2|agent3/route.ts zostają nietknięte jako działający fallback dopóki ten
// endpoint nie przejdzie weryfikacji porównawczej z Etapu 3.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ReqSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { transcript, notion_page_id, save_to_notion, mode, existing_client_id } = parsed.data;
    const targetPageId = mode === "uzupelnienie" ? existing_client_id : notion_page_id;

    // Identyczne wzbogacenie promptu jak w Agencie 1 (baza wiedzy + dane istniejącego
    // klienta z Notion), żeby jakość Części A nie regresowała względem starego agenta.
    let kbSection = "";
    try {
      const kb = await getKwalifikacjaKnowledge();
      if (kb.trim()) kbSection = `BAZA WIEDZY — ETAP 1 ROZMOWA KWALIFIKACYJNA:\n${kb}\n\n---\n\n`;
    } catch {
      /* non-fatal */
    }

    // Blok 0.2 — w trybie uzupełnienia potrzebujemy istniejących uwag Agenta 1, żeby dopisać
    // do nich nową adnotację zamiast ją nadpisać (identyczna logika co w starym Agencie 1).
    let userMessage = transcript;
    let existingUwagiAgenta1 = "";
    if (targetPageId) {
      try {
        const existing = await getClientPage(targetPageId);
        existingUwagiAgenta1 = existing.uwagiAgenta1 ?? "";
        const lines: string[] = [];
        if (existing.firma) lines.push(`Firma: ${existing.firma}`);
        if (existing.kontakt) lines.push(`Kontakt: ${existing.kontakt}`);
        if (existing.telefon) lines.push(`Telefon: ${existing.telefon}`);
        if (mode === "uzupelnienie" && existing.uwagiAgenta1) {
          lines.push(`Dotychczasowe uwagi z poprzednich analiz:\n${existing.uwagiAgenta1}`);
        }
        if (lines.length > 0) {
          const label =
            mode === "uzupelnienie"
              ? "ISTNIEJĄCY REKORD KLIENTA (uzupełniasz go nowym fragmentem poniżej)"
              : 'DANE Z NOTION (już zweryfikowane — użyj zamiast "(z adresu email)" itp.)';
          const fragmentLabel = mode === "uzupelnienie" ? "NOWY FRAGMENT" : "TRANSKRYPT";
          userMessage = `${label}:\n${lines.join("\n")}\n\n---\n${fragmentLabel}:\n${transcript}`;
        }
      } catch {
        // non-fatal — proceed with transcript only
      }
    }

    if (kbSection) userMessage = kbSection + userMessage;

    const systemPrompt =
      mode === "weryfikacja"
        ? KWALIFIKACJA_MERGED_SYSTEM_PROMPT + KWALIFIKACJA_MERGED_VERIFICATION_SUFFIX
        : mode === "uzupelnienie"
          ? KWALIFIKACJA_MERGED_SYSTEM_PROMPT + KWALIFIKACJA_MERGED_UZUPELNIENIE_SUFFIX
          : KWALIFIKACJA_MERGED_SYSTEM_PROMPT;

    const message = (await client.messages.create({
      model: AGENT_MODELS.kwalifikacjaMerged,
      max_tokens: 20000,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      metadata: { user_id: "autorise-agent-kwalifikacja" },
    })) as Message;

    if (message.stop_reason === "max_tokens") {
      console.warn("[agent-kwalifikacja] Response truncated — consider increasing max_tokens");
    }

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    let output: MergedOutput;
    try {
      output = extractAndParseJson(rawText) as unknown as MergedOutput;
    } catch (parseErr) {
      return NextResponse.json(
        {
          success: false,
          error: parseErr instanceof Error ? parseErr.message : "Agent zwrócił nieprawidłowy JSON",
          raw: rawText.slice(0, 500),
        },
        { status: 500 },
      );
    }

    // Blok 0.2 — w trybie uzupełnienia Część B/C mają zwracać dosłowny JSON null (patrz
    // KWALIFIKACJA_MERGED_UZUPELNIENIE_SUFFIX), więc walidacja struktury musi to tolerować.
    const briefDiscoveryOptional = mode === "uzupelnienie";
    if (
      !output.kwalifikacja ||
      (!briefDiscoveryOptional && (!output.brief_discovery || !output.prezentacja))
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Agent zwrócił niepełną strukturę — brakuje jednej z sekcji kwalifikacja/brief_discovery/prezentacja",
          raw: rawText.slice(0, 500),
        },
        { status: 500 },
      );
    }

    // Deterministyczny wynik ICP — identyczna logika jak w Agencie 1 (route.ts), nie ufamy
    // arytmetyce LLM. Źródło prawdy dla Notion/UI/historii.
    // Odporne na boolean true/false — Etap 3 (test na realnym transkrypcie Arka) pokazał że
    // scalony prompt czasem zwraca JSON boolean zamiast wymaganego stringu "TAK"/"NIE"/
    // "BRAK DANYCH", mimo że ta sama instrukcja w Części A jest identyczna jak w Agencie 1.
    // W trybie uzupełnienia: jeśli model nie dotknął żadnego pola ICP (wszystkie null, bo
    // fragment tego nie zmieniał), NIE przeliczaj i NIE nadpisuj — zostaw istniejący wynik
    // w Notion (identyczna zasada jak w starym Agencie 1).
    const icp = (output.kwalifikacja.icp ?? {}) as Record<string, unknown>;
    const icpFieldsTouched =
      mode !== "uzupelnienie" ||
      [icp.flota_ok, icp.biuro_ok, icp.decyzyjnosc_ok, icp.bol_ok, icp.aktywne_szukanie_ok].some(
        (v) => v != null,
      );
    const isYes = (v: unknown) =>
      v === true ||
      String(v ?? "")
        .trim()
        .toUpperCase() === "TAK";
    if (icpFieldsTouched) {
      const computedIcp = [
        icp.flota_ok,
        icp.biuro_ok,
        icp.decyzyjnosc_ok,
        icp.bol_ok,
        icp.aktywne_szukanie_ok,
      ].filter(isYes).length;
      icp.wynik = computedIcp;
      if (!icp.kwalifikacja || String(icp.kwalifikacja).trim() === "") {
        icp.kwalifikacja = computedIcp <= 1 ? "SŁABA" : computedIcp <= 3 ? "ŚREDNIA" : "MOCNA";
      }
      output.kwalifikacja.icp = icp;
    } else {
      output.kwalifikacja.icp = undefined;
    }

    // Tryb uzupełnienia: dopisz nową uwagę do historii zamiast ją nadpisać (identyczna
    // zasada jak w starym Agencie 1).
    if (
      mode === "uzupelnienie" &&
      typeof output.kwalifikacja.uwagi_agenta === "string" &&
      output.kwalifikacja.uwagi_agenta
    ) {
      output.kwalifikacja.uwagi_agenta = existingUwagiAgenta1
        ? `${existingUwagiAgenta1}\n\n${output.kwalifikacja.uwagi_agenta}`
        : output.kwalifikacja.uwagi_agenta;
    }

    // Pass-through firma/tms/koszt_roczny do sekcji prezentacja — identyczne, deterministyczne
    // zachowanie jak w Agencie 3 (route.ts), nie zależne od modelu. Pomijane gdy prezentacja
    // jest null (tryb uzupełnienia bez zmian w Części C).
    const kwal = output.kwalifikacja as {
      firma?: string | null;
      tms?: string | null;
      koszt_problemu?: { koszt_roczny?: number | null } | null;
    };
    if (output.prezentacja) {
      if (kwal.firma) output.prezentacja.client_firma = kwal.firma;
      if (kwal.tms) output.prezentacja.client_tms = kwal.tms;
      if (kwal.koszt_problemu?.koszt_roczny != null) {
        output.prezentacja.client_koszt_roczny = kwal.koszt_problemu.koszt_roczny;
      }
    }

    // Compute client name + status for immediate UI update — identyczna logika jak w Agencie 1.
    const o1 = output.kwalifikacja as {
      firma?: string;
      imie_nazwisko?: string;
      meet_data?: string | null;
      icp?: { kwalifikacja?: string | null };
      dyskwalifikacja?: boolean;
    };
    const notionClientName = o1.imie_nazwisko || o1.firma || "Nowy klient";
    const kwalStatus = o1.icp?.kwalifikacja ?? null;
    const hasMeeting = Boolean(o1.meet_data);
    let notionClientStatus = "Nowy lead";
    if (
      o1.dyskwalifikacja === true ||
      (kwalStatus && kwalStatus.toUpperCase().includes("NIE KWALIFIKUJE"))
    ) {
      notionClientStatus = "Niekwalifikowany";
    } else if (kwalStatus) {
      notionClientStatus = hasMeeting ? "Discovery umówione" : "Kwalifikacja";
    }

    let savedNotionPageId: string | null = null;
    let notionError: string | null = null;
    if (save_to_notion) {
      try {
        const result = await saveKwalifikacjaMergedOutput(targetPageId, output, notionClientStatus);
        savedNotionPageId = result.pageId;
        if (result.errors.length > 0) notionError = result.errors.join("; ");
      } catch (notionErr) {
        console.error("[agent-kwalifikacja] Notion error:", notionErr);
        notionError = notionErr instanceof Error ? notionErr.message : "Błąd Notion";
      }
    }

    return NextResponse.json({
      success: true,
      agent: "kwalifikacja",
      output,
      notion_page_id: savedNotionPageId,
      notion_error: notionError,
      notion_client_name: notionClientName,
      notion_client_status: notionClientStatus,
    });
  } catch (err) {
    console.error("[agent-kwalifikacja]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd serwera" },
      { status: 500 },
    );
  }
}
