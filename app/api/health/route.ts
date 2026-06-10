import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Client } from '@notionhq/client'

const PIPELINE_DB_ID = '75ac8bc6fd6d4c36934bedc1270217eb'

export interface HealthStatus {
  ok: boolean
  label: string
  error?: string
}

export interface HealthResponse {
  anthropic: HealthStatus
  notion: HealthStatus
  timestamp: string
}

async function checkAnthropic(): Promise<HealthStatus> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return { ok: false, label: 'Brak klucza', error: 'ANTHROPIC_API_KEY nie ustawiony' }
  const client = new Anthropic({ apiKey: key })
  await client.models.list()
  return { ok: true, label: 'Połączono' }
}

async function checkNotion(): Promise<HealthStatus> {
  const token = process.env.NOTION_TOKEN
  if (!token) return { ok: false, label: 'Brak tokenu', error: 'NOTION_TOKEN nie ustawiony' }
  const notion = new Client({ auth: token })
  await notion.databases.retrieve({ database_id: PIPELINE_DB_ID })
  return { ok: true, label: 'Pipeline dostępny' }
}

export async function GET() {
  const [anthropicResult, notionResult] = await Promise.allSettled([
    checkAnthropic(),
    checkNotion(),
  ])

  const toStatus = (r: PromiseSettledResult<HealthStatus>): HealthStatus =>
    r.status === 'fulfilled'
      ? r.value
      : {
          ok: false,
          label: 'Błąd połączenia',
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        }

  return NextResponse.json<HealthResponse>({
    anthropic: toStatus(anthropicResult),
    notion: toStatus(notionResult),
    timestamp: new Date().toISOString(),
  })
}
