import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AGENT_MODELS, AGENT1_SYSTEM_PROMPT } from "@/lib/agents/prompts";
import { getClientPage, upsertClientInPipeline } from "@/lib/notion/client";

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

    // Compute client name + status for immediate UI update (no Notion round-trip needed)
    const o1 = output as {
      firma?: string;
      imie_nazwisko?: string;
      meet_data?: string | null;
      icp?: { kwalifikacja?: string | null };
    };
    const notionClientName = o1.firma || o1.imie_nazwisko || "Nowy klient";
    const kwal = o1.icp?.kwalifikacja ?? null;
    const hasMeeting = Boolean(o1.meet_data);
    let notionClientStatus = "Nowy lead";
    if (kwal) {
      const u = kwal.toUpperCase();
      if (u.includes("NIE KWALIFIKUJE")) notionClientStatus = "Niekwalifikowany";
      else if (u.includes("KWALIFIKUJE") && !u.includes("NIE") && !u.includes("WYMAGA")) {
        notionClientStatus = hasMeeting ? "Discovery umówione" : "Kwalifikacja";
      } else {
        notionClientStatus = "Kwalifikacja";
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
