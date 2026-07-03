import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { extractAndParseJson } from "@/lib/agents/parseJson";
import { AGENT_MODELS, AGENT0_SYSTEM_PROMPT } from "@/lib/agents/prompts";
import { enrichByNIP } from "@/lib/krs/enrichClient";
import { upsertLeadIntake } from "@/lib/notion/client";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ReqSchema = z.object({
  transcript: z.string().min(5, "Wiadomość jest za krótka"),
});

function extractNIP(text: string): string | null {
  const match = text.match(/\b(\d[\d\s-]{8,12}\d)\b/);
  if (!match) return null;
  const cleaned = match[1].replace(/[\s-]/g, "");
  return cleaned.length === 10 ? cleaned : null;
}

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

    const { transcript: slackInput } = parsed.data;

    // Step 1: Try to extract NIP from Slack message and enrich from KRS
    const nip = extractNIP(slackInput);
    let krsText = "Brak NIP w wiadomości — brak danych z rejestrów publicznych.";
    let krsEnrichment = null;

    if (nip) {
      krsEnrichment = await enrichByNIP(nip);
      krsText = krsEnrichment.raw_text;
    }

    // Step 2: Claude parses + analyzes
    const userMessage = `WIADOMOŚĆ SLACK:\n${slackInput}\n\n${krsText}`;

    const message = await client.messages.create({
      model: AGENT_MODELS.agent0,
      max_tokens: 2048,
      system: AGENT0_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      metadata: { user_id: "autorise-agent0" },
    });

    if (message.stop_reason === "max_tokens") {
      console.warn("[agent0] Response truncated");
    }

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    let output: Record<string, unknown>;
    try {
      output = extractAndParseJson(rawText);
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

    // Merge KRS enrichment into output (so card has all data even if Claude missed something)
    if (krsEnrichment) {
      if (!output.firma_krs && krsEnrichment.firma_oficjalna)
        output.firma_krs = krsEnrichment.firma_oficjalna;
      if (!output.krs_numer && krsEnrichment.krs_numer) output.krs_numer = krsEnrichment.krs_numer;
      if (!output.regon && krsEnrichment.regon) output.regon = krsEnrichment.regon;
      if (!output.adres && krsEnrichment.adres) output.adres = krsEnrichment.adres;
      if (!output.vat_status && krsEnrichment.vat_status)
        output.vat_status = krsEnrichment.vat_status;
      if ((!output.pkd_glowne || output.pkd_glowne === null) && krsEnrichment.pkd_glowne) {
        output.pkd_glowne = krsEnrichment.pkd_glowne;
      }
      if (!Array.isArray(output.pkd_kody) || (output.pkd_kody as string[]).length === 0) {
        output.pkd_kody = krsEnrichment.pkd_kody;
      }
      if (!Array.isArray(output.zarzad) || (output.zarzad as unknown[]).length === 0) {
        output.zarzad = krsEnrichment.zarzad;
      }
      output.krs_source = krsEnrichment.source;
    }

    // Step 3: Create Notion page
    const o = output as {
      kontakt_imie?: string | null;
      kontakt_nazwisko?: string | null;
      telefon?: string | null;
      email?: string | null;
      nip?: string | null;
      firma_krs?: string | null;
      firma_slack?: string | null;
      jest_decydentem?: boolean | null;
      notatka_krs?: string | null;
    };

    const kontaktFull = [o.kontakt_imie, o.kontakt_nazwisko].filter(Boolean).join(" ");
    const firma = o.firma_krs || o.firma_slack || null;
    const notatka = o.notatka_krs ?? krsText.slice(0, 1800);

    let savedNotionPageId: string | null = null;
    let notionError: string | null = null;

    try {
      savedNotionPageId = await upsertLeadIntake({
        firma,
        kontakt: kontaktFull || null,
        telefon: o.telefon ?? null,
        email: o.email ?? null,
        nip: o.nip ?? nip,
        jest_decydentem: o.jest_decydentem ?? null,
        notatka_krs: notatka,
      });
    } catch (err) {
      console.error("[agent0] Notion error:", err);
      notionError = err instanceof Error ? err.message : "Błąd Notion";
    }

    const notionClientName = firma || kontaktFull || "Nowy lead";

    return NextResponse.json({
      success: true,
      agent: 0,
      output,
      notion_page_id: savedNotionPageId,
      notion_error: notionError,
      notion_client_name: notionClientName,
      notion_client_status: "Nowy lead",
    });
  } catch (err) {
    console.error("[agent0]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd serwera" },
      { status: 500 },
    );
  }
}
