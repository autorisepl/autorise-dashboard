import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  upsertClientInPipeline,
  createChildPage,
  updateOfferAnalysis,
} from '@/lib/notion/client'

const ReqSchema = z.object({
  agent_id: z.enum(['agent1', 'agent2', 'agent3', 'agent4']),
  output: z.unknown(),
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

    const { agent_id, output, notion_page_id } = parsed.data
    let savedPageId: string | null = null

    if (agent_id === 'agent1') {
      savedPageId = await upsertClientInPipeline(
        notion_page_id,
        output as Record<string, unknown>
      )
    } else if (agent_id === 'agent2') {
      if (!notion_page_id)
        return NextResponse.json(
          { success: false, error: 'Wybierz klienta z listy przed zapisem do Notion' },
          { status: 400 }
        )
      const o = output as { client_brief: Record<string, unknown>; skrypt_ofertowy: string }
      await createChildPage(notion_page_id, 'Client Brief', JSON.stringify(o.client_brief, null, 2), true)
      await createChildPage(notion_page_id, 'Skrypt ofertowy', o.skrypt_ofertowy, false)
      savedPageId = notion_page_id
    } else if (agent_id === 'agent3') {
      if (!notion_page_id)
        return NextResponse.json(
          { success: false, error: 'Wybierz klienta z listy przed zapisem do Notion' },
          { status: 400 }
        )
      await createChildPage(notion_page_id, 'Oferta', output as string, false)
      savedPageId = notion_page_id
    } else if (agent_id === 'agent4') {
      if (!notion_page_id)
        return NextResponse.json(
          { success: false, error: 'Wybierz klienta z listy przed zapisem do Notion' },
          { status: 400 }
        )
      const analysisJson = JSON.stringify(output, null, 2)
      await updateOfferAnalysis(
        notion_page_id,
        output as Record<string, unknown>,
        analysisJson
      )
      savedPageId = notion_page_id
    }

    return NextResponse.json({ success: true, notion_page_id: savedPageId })
  } catch (err) {
    console.error('[notion/push]', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Błąd Notion' },
      { status: 500 }
    )
  }
}
