import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AGENT_MODELS, AGENT1_SYSTEM_PROMPT } from "@/lib/agents/prompts";
import {
  getClientPage,
  getKwalifikacjaKnowledge,
  saveOperationHistory,
  upsertClientInPipeline,
} from "@/lib/notion/client";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ReqSchema = z.object({
  transcript: z.string().min(10, "Transkrypt jest za krótki"),
  notion_page_id: z.string().optional(),
});

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

    const { transcript, notion_page_id } = parsed.data;

    // Fetch qualification knowledge base (5-min cache) — always injected
    let kbSection = "";
    try {
      const kb = await getKwalifikacjaKnowledge();
      if (kb.trim()) kbSection = `BAZA WIEDZY — ETAP 1 ROZMOWA KWALIFIKACYJNA:\n${kb}\n\n---\n\n`;
    } catch {
      /* non-fatal */
    }

    // Fetch existing Notion data so agent can use/reconcile with transcript
    let userMessage = transcript;
    if (notion_page_id) {
      try {
        const existing = await getClientPage(notion_page_id);
        const lines: string[] = [];
        if (existing.firma) lines.push(`Firma: ${existing.firma}`);
        if (existing.kontakt) lines.push(`Kontakt: ${existing.kontakt}`);
        if (existing.telefon) lines.push(`Telefon: ${existing.telefon}`);
        if (lines.length > 0) {
          userMessage = `DANE Z NOTION (już zweryfikowane — użyj zamiast "(z adresu email)" itp.):\n${lines.join("\n")}\n\n---\nTRANSKRYPT:\n${transcript}`;
        }
      } catch {
        // non-fatal — proceed with transcript only
      }
    }

    if (kbSection) userMessage = kbSection + userMessage;

    const message = await client.messages.create({
      model: AGENT_MODELS.agent1,
      max_tokens: 4096,
      system: AGENT1_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      metadata: { user_id: "autorise-agent1" },
    });

    if (message.stop_reason === "max_tokens") {
      console.warn("[agent1] Response truncated — consider increasing max_tokens");
    }

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonText = jsonMatch ? jsonMatch[1].trim() : rawText.trim();

    let output: Record<string, unknown>;
    try {
      output = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { success: false, error: "Agent zwrócił nieprawidłowy JSON", raw: rawText },
        { status: 500 },
      );
    }

    // Deterministyczny wynik ICP — nie ufamy arytmetyce LLM (model liczył 3/5 przy 1 TAK).
    // "TAK" = 1 pkt; "NIE" i "BRAK DANYCH" = 0. Źródło prawdy dla Notion/UI/historii.
    const icp = (output.icp ?? {}) as Record<string, unknown>;
    const isYes = (v: unknown) =>
      String(v ?? "")
        .trim()
        .toUpperCase() === "TAK";
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
    output.icp = icp;

    // Compute client name + status for immediate UI update (no Notion round-trip needed)
    const o1 = output as {
      firma?: string;
      imie_nazwisko?: string;
      meet_data?: string | null;
      icp?: { kwalifikacja?: string | null };
      bol_glowny_cytat?: string;
      dyskwalifikacja?: boolean;
      dyskwalifikacja_powod?: string | null;
    };
    // KLIENT = osoba (imię i nazwisko) ma priorytet nad nazwą firmy.
    const notionClientName = o1.imie_nazwisko || o1.firma || "Nowy klient";
    const kwal = o1.icp?.kwalifikacja ?? null;
    const hasMeeting = Boolean(o1.meet_data);
    let notionClientStatus = "Nowy lead";
    if (o1.dyskwalifikacja === true || (kwal && kwal.toUpperCase().includes("NIE KWALIFIKUJE"))) {
      // Dyskwalifikacja (np. flota < ICP, zła osoba, zaprzeczył formularzowi) → nie ląduje w kwalifikacji.
      notionClientStatus = "Niekwalifikowany";
    } else if (kwal) {
      const u = kwal.toUpperCase();
      if (u.includes("KWALIFIKUJE") && !u.includes("NIE") && !u.includes("WYMAGA")) {
        notionClientStatus = hasMeeting ? "Discovery umówione" : "Kwalifikacja";
      } else {
        notionClientStatus = hasMeeting ? "Discovery umówione" : "Kwalifikacja";
      }
    }

    let savedNotionPageId: string | null = null;
    let notionError: string | null = null;
    try {
      savedNotionPageId = await upsertClientInPipeline(notion_page_id, output);
    } catch (notionErr) {
      console.error("[agent1] Notion error:", notionErr);
      notionError = notionErr instanceof Error ? notionErr.message : "Błąd Notion";
    }

    if (savedNotionPageId) {
      const summary = [
        `Status: ${notionClientStatus}`,
        o1.icp?.kwalifikacja ? `ICP: ${o1.icp.kwalifikacja}` : null,
        o1.bol_glowny_cytat ? `Ból: ${String(o1.bol_glowny_cytat).slice(0, 120)}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      saveOperationHistory(
        savedNotionPageId,
        "Agent 01 — Analiza kwalifikacyjna",
        summary,
        JSON.stringify(output, null, 2),
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      agent: 1,
      output,
      notion_page_id: savedNotionPageId,
      notion_error: notionError,
      notion_client_name: notionClientName,
      notion_client_status: notionClientStatus,
    });
  } catch (err) {
    console.error("[agent1]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd serwera" },
      { status: 500 },
    );
  }
}
