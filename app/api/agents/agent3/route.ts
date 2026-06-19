import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AGENT_MODELS, AGENT3_SYSTEM_PROMPT } from "@/lib/agents/prompts";
import { saveAgent3Output } from "@/lib/notion/client";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ReqSchema = z
  .object({
    transcript: z.string().optional(),
    agent1_json: z.string().optional(),
    agent2_json: z.string().optional(),
    notion_page_id: z.string().optional(),
  })
  .refine((d) => (d.agent1_json && d.agent2_json) || (d.transcript && d.transcript.length >= 10), {
    message: "Podaj JSON z Agenta 1 i Agenta 2, albo wklej je razem w pole transkryptu",
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

    const { transcript, agent1_json, agent2_json, notion_page_id } = parsed.data;

    const userContent =
      agent1_json && agent2_json
        ? `JSON OUTPUT AGENTA 1:\n${agent1_json}\n\nJSON PRE-DISCOVERY BRIEF (Agent 2):\n${agent2_json}`
        : (transcript ?? "");

    const message = await client.messages.create({
      model: AGENT_MODELS.agent3,
      max_tokens: 2048,
      system: AGENT3_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      metadata: { user_id: "autorise-agent3" },
    });

    if (message.stop_reason === "max_tokens") {
      console.warn("[agent3] Response truncated — consider increasing max_tokens");
    }

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonText = jsonMatch ? jsonMatch[1].trim() : rawText;

    let output: Record<string, unknown>;
    try {
      output = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { success: false, error: "Agent zwrócił nieprawidłowy JSON", raw: rawText },
        { status: 500 },
      );
    }

    let notionError: string | null = null;
    if (notion_page_id) {
      try {
        await saveAgent3Output(notion_page_id, JSON.stringify(output, null, 2));
      } catch (notionErr) {
        console.error("[agent3] Notion error:", notionErr);
        notionError = notionErr instanceof Error ? notionErr.message : "Błąd Notion";
      }
    }

    return NextResponse.json({
      success: true,
      agent: 3,
      output,
      notion_page_id: notion_page_id ?? null,
      notion_error: notionError,
    });
  } catch (err) {
    console.error("[agent3]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd serwera" },
      { status: 500 },
    );
  }
}
