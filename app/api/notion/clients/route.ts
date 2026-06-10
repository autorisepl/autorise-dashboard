import { NextResponse } from 'next/server'
import { getPipelineClients } from '@/lib/notion/client'

export async function GET() {
  try {
    const clients = await getPipelineClients()
    return NextResponse.json({ success: true, clients })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Błąd Notion API' },
      { status: 500 }
    )
  }
}
