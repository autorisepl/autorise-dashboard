import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AGENT_MODELS, AGENT6_SYSTEM_PROMPT } from "@/lib/agents/prompts";

export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ReqSchema = z.object({
  transcript: z.string().min(10, "Opis narzędzia jest za krótki — minimum 10 znaków"),
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

    const { transcript: toolDescription } = parsed.data;

    const message = await client.messages.create({
      model: AGENT_MODELS.agent6,
      max_tokens: 4096,
      system: AGENT6_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Oceń następujące narzędzie / bibliotekę / koncepcję:\n\n${toolDescription}`,
        },
      ],
      metadata: { user_id: "autorise-agent6" },
    });

    if (message.stop_reason === "max_tokens") {
      console.warn("[agent6] Response truncated");
    }

    const markdownText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    if (!markdownText.trim()) {
      return NextResponse.json(
        { success: false, error: "Agent nie zwrócił analizy." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, agent: 6, output: markdownText });
  } catch (err) {
    console.error("[agent6]", err);
    const msg = err instanceof Error ? err.message : "Błąd serwera";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
