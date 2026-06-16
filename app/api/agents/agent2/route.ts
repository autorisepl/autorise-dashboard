import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Message } from '@anthropic-ai/sdk/resources/messages'
import { z } from 'zod'
import { AGENT_MODELS, AGENT2_SYSTEM_PROMPT } from '@/lib/agents/prompts'
import { saveAgent2Output } from '@/lib/notion/client'

export const maxDuration = 300

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ReqSchema = z.object({
  transcript: z.string().min(10, 'Transkrypt jest za krótki'),
  notion_page_id: z.string().optional(),
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

    const { transcript, notion_page_id } = parsed.data

    const message = (await client.messages.create({
      model: AGENT_MODELS.agent2,
      max_tokens: 12000,
      thinking: { type: 'enabled', budget_tokens: 10000 },
      system: AGENT2_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
      metadata: { user_id: 'autorise-agent2' },
    })) as Message

    if (message.stop_reason === 'max_tokens') {
      console.warn('[agent2] Response truncated — consider increasing max_tokens')
    }

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonText = jsonMatch ? jsonMatch[1].trim() : rawText.trim()

    let output: { pre_discovery_brief: Record<string, unknown>; plan_discovery: string }
    try {
      output = JSON.parse(jsonText)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Agent zwrócił nieprawidłowy JSON', raw: rawText },
        { status: 500 }
      )
    }

    let notionError: string | null = null
    if (notion_page_id && output.pre_discovery_brief && output.plan_discovery) {
      try {
        await saveAgent2Output(notion_page_id, output.pre_discovery_brief, output.plan_discovery)
      } catch (notionErr) {
        console.error('[agent2] Notion error:', notionErr)
        notionError = notionErr instanceof Error ? notionErr.message : 'Błąd Notion'
      }
    }

    return NextResponse.json({
      success: true,
      agent: 2,
      output,
      notion_page_id: notion_page_id ?? null,
      notion_error: notionError,
    })
  } catch (err) {
    console.error('[agent2]', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    )
  }
}
