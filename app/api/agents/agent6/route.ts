import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { AGENT_MODELS, AGENT6_SYSTEM_PROMPT } from '@/lib/agents/prompts'

export const maxDuration = 300

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ReqSchema = z.object({
  transcript: z.string().min(10, 'Zapytanie jest za krótkie — minimum 10 znaków'),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = ReqSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { transcript: query } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = await (client.beta.messages as any).create({
      model: AGENT_MODELS.agent6,
      max_tokens: 12000,
      betas: ['web-search-2025-03-05'],
      thinking: { type: 'enabled', budget_tokens: 10000 },
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: AGENT6_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Przeprowadź wywiad rynkowy na temat:\n\n${query}\n\nUżyj web_search do zebrania aktualnych danych. Zwróć kompletny raport w formacie markdown.`,
        },
      ],
    })

    if (message.stop_reason === 'max_tokens') {
      console.warn('[agent6] Response truncated')
    }

    const markdownText = message.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { type: 'text'; text: string }) => b.text)
      .join('')

    if (!markdownText.trim()) {
      return NextResponse.json(
        { success: false, error: 'Agent nie zwrócił raportu. Sprawdź czy web_search jest dostępny dla tego modelu.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, agent: 6, output: markdownText })
  } catch (err) {
    console.error('[agent6]', err)
    const msg = err instanceof Error ? err.message : 'Błąd serwera'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
