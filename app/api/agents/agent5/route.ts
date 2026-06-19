import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AGENT_MODELS, AGENT5_SYSTEM_PROMPT } from "@/lib/agents/prompts";

export const maxDuration = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ReqSchema = z.object({
  transcript: z.string().min(50, "Transkrypt jest za krótki — minimum 50 znaków"),
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

    const { transcript } = parsed.data;

    const message = await client.messages.create({
      model: AGENT_MODELS.agent5,
      max_tokens: 12000,
      thinking: { type: "adaptive" },
      system: AGENT5_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Transkrypt sesji Agency Leaders:\n\n${transcript}` }],
    });

    if (message.stop_reason === "max_tokens") {
      console.warn("[agent5] Response truncated");
    }

    const markdownText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    if (!markdownText.trim()) {
      return NextResponse.json(
        { success: false, error: "Agent nie zwrócił żadnej treści" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, agent: 5, output: markdownText });
  } catch (err) {
    console.error("[agent5]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd serwera" },
      { status: 500 },
    );
  }
}
