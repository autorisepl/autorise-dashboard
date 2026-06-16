import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

export const dynamic = 'force-dynamic'

const notion = new Client({ auth: process.env.NOTION_TOKEN })

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { pageId, fields } = body as {
      pageId: string
      fields: { koszt_problemu?: number; koszt_roczny?: number }
    }

    if (!pageId) {
      return NextResponse.json({ success: false, error: 'Brak pageId' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const properties: any = {}
    if (fields?.koszt_problemu != null) {
      properties['Koszt problemu PLN/mc'] = { number: fields.koszt_problemu }
    }
    if (fields?.koszt_roczny != null) {
      properties['Koszt roczny PLN/rok'] = { number: fields.koszt_roczny }
    }

    await notion.pages.update({ page_id: pageId, properties })

    const page = await notion.pages.retrieve({ page_id: pageId }) as Record<string, unknown>
    const props = (page.properties ?? {}) as Record<string, unknown>
    const nameField = props['Firma / Nazwa'] as { title?: Array<{ plain_text: string }> } | undefined
    const firmaNazwa = nameField?.title?.[0]?.plain_text ?? ''

    return NextResponse.json({ success: true, firmaNazwa })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Nieznany błąd'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
