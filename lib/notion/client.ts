import { Client } from '@notionhq/client'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

const notion = new Client({ auth: process.env.NOTION_TOKEN })

const PIPELINE_DB_ID = '75ac8bc6fd6d4c36934bedc1270217eb'
const PIPELINE_DATA_SOURCE_ID = '2ea38355-7529-48f9-8d7f-1c62f5570df3'

// --- block helpers ---

function richText(text: string) {
  return [{ type: 'text' as const, text: { content: text.slice(0, 2000) } }]
}

function paragraphBlock(text: string) {
  return {
    object: 'block' as const,
    type: 'paragraph' as const,
    paragraph: { rich_text: richText(text) },
  }
}

function headingBlock(text: string) {
  return {
    object: 'block' as const,
    type: 'heading_2' as const,
    heading_2: { rich_text: richText(text) },
  }
}

function codeBlock(content: string) {
  const chunks: string[] = []
  for (let i = 0; i < content.length; i += 1900) {
    chunks.push(content.slice(i, i + 1900))
  }
  return chunks.map((chunk) => ({
    object: 'block' as const,
    type: 'code' as const,
    code: { rich_text: richText(chunk), language: 'json' as const },
  }))
}

// --- field mappers ---

function icpToSelect(wynik: number | null): string | null {
  if (wynik == null) return null
  const map: Record<number, string> = {
    5: '5 - idealny',
    4: '4 - dobry',
    3: '3 - średni',
    2: '2 - słaby',
    1: '1 - nie pasuje',
    0: '1 - nie pasuje',
  }
  return map[Math.round(wynik)] ?? null
}

function kwalifikacjaToStatus(kwalifikacja: string | null, hasMeeting: boolean): string {
  if (!kwalifikacja) return 'Nowy lead'
  if (kwalifikacja.toUpperCase().includes('NIE KWALIFIKUJE')) return 'Niekwalifikowany'
  if (
    kwalifikacja.toUpperCase().includes('KWALIFIKUJE') &&
    !kwalifikacja.toUpperCase().includes('NIE') &&
    !kwalifikacja.toUpperCase().includes('WYMAGA')
  ) {
    return hasMeeting ? 'Discovery umówione' : 'Kwalifikacja'
  }
  return 'Kwalifikacja'
}

function wynikToStatus(wynik: string): string {
  const upper = wynik.toUpperCase().trim()
  if (upper === 'TAK') return 'Finalizacja'
  if (upper === 'W TRAKCIE') return 'Oferta przedstawiona'
  if (upper === 'NIE') return 'Niekwalifikowany'
  return 'Oferta przedstawiona'
}

function ddMMYYYYtoISO(date: string): string | null {
  const match = date?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!match) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

// --- public types ---

export interface PipelineClient {
  id: string
  name: string
  status: string
}

// --- public API ---

export async function getPipelineClients(): Promise<PipelineClient[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = (await notion.dataSources.query({
    data_source_id: PIPELINE_DATA_SOURCE_ID,
    page_size: 100,
    sorts: [{ property: 'Data pierwszego kontaktu', direction: 'descending' }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)) as { results: PageObjectResponse[] }

  return response.results
    .filter((page): page is PageObjectResponse => page.object === 'page')
    .map((page) => {
      const firma = page.properties['Firma']
      const status = page.properties['Status']
      return {
        id: page.id,
        name:
          firma?.type === 'title'
            ? firma.title.map((t) => t.plain_text).join('') || 'Bez nazwy'
            : 'Bez nazwy',
        status: status?.type === 'select' ? (status.select?.name ?? '') : '',
      }
    })
    .filter((c) => c.name !== 'Bez nazwy')
}

export async function upsertClientInPipeline(
  pageId: string | undefined,
  data: Record<string, unknown>
): Promise<string> {
  const a1 = data as {
    imie_nazwisko?: string | null
    firma?: string | null
    telefon?: string | null
    pojazdy?: string | number | null
    tms?: string | null
    podejscie_integracyjne?: string | null
    bol_glowny_cytat?: string | null
    poprzednie_proby?: string | null
    nastepny_krok?: string | null
    koszt_problemu?: {
      koszt_miesiecznie?: number | null
      koszt_roczny?: number | null
    } | null
    icp?: {
      wynik?: number | null
      kwalifikacja?: string | null
    } | null
    meet_data?: string | null
    uwagi_agenta?: string | null
    wlasciciel_czy_manager?: string | null
  }

  const hasMeeting = Boolean(a1.meet_data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {}

  if (a1.firma) {
    props['Firma'] = { title: richText(a1.firma) }
  } else if (a1.imie_nazwisko) {
    props['Firma'] = { title: richText(a1.imie_nazwisko) }
  }
  if (a1.imie_nazwisko) {
    props['Kontakt'] = { rich_text: richText(a1.imie_nazwisko) }
  }
  if (a1.telefon) {
    props['Telefon'] = { phone_number: a1.telefon }
  }
  if (a1.pojazdy != null) {
    const num = parseInt(String(a1.pojazdy), 10)
    if (!isNaN(num)) props['Flota'] = { number: num }
  }
  if (a1.tms) {
    props['TMS'] = { rich_text: richText(a1.tms) }
  }
  if (a1.podejscie_integracyjne) {
    props['Podejście TMS'] = { rich_text: richText(a1.podejscie_integracyjne) }
  }
  if (a1.bol_glowny_cytat) {
    props['Ból główny'] = { rich_text: richText(a1.bol_glowny_cytat) }
  }
  if (a1.nastepny_krok) {
    props['Następny krok'] = { rich_text: richText(a1.nastepny_krok) }
  }
  if (a1.koszt_problemu?.koszt_miesiecznie != null) {
    props['Koszt problemu PLN/mc'] = { number: a1.koszt_problemu.koszt_miesiecznie }
  }
  if (a1.koszt_problemu?.koszt_roczny != null) {
    props['Koszt roczny PLN/rok'] = { number: a1.koszt_problemu.koszt_roczny }
  }

  const icpSelect = icpToSelect(a1.icp?.wynik ?? null)
  if (icpSelect) {
    props['Ocena ICP'] = { select: { name: icpSelect } }
  }

  const pipelineStatus = kwalifikacjaToStatus(a1.icp?.kwalifikacja ?? null, hasMeeting)
  props['Status'] = { select: { name: pipelineStatus } }

  if (a1.meet_data) {
    props['Data discovery'] = { date: { start: a1.meet_data } }
  }
  if (a1.uwagi_agenta) {
    props['Notatki'] = { rich_text: richText(a1.uwagi_agenta) }
  }

  const isWlasciciel = a1.wlasciciel_czy_manager
    ?.toLowerCase()
    .includes('właściciel') ||
    a1.wlasciciel_czy_manager?.toLowerCase().includes('wlasciciel')
  if (isWlasciciel) {
    props['Decydent'] = { checkbox: true }
  }

  if (!pageId) {
    props['Data pierwszego kontaktu'] = { date: { start: todayISO() } }
  }

  if (pageId) {
    await notion.pages.update({ page_id: pageId, properties: props })
    return pageId
  }

  const page = await notion.pages.create({
    parent: { database_id: PIPELINE_DB_ID },
    properties: props,
  })
  return page.id
}

export async function createChildPage(
  parentId: string,
  title: string,
  content: string,
  isJson = false
) {
  const contentBlocks = isJson
    ? codeBlock(content)
    : content
        .split('\n\n')
        .filter(Boolean)
        .map((para) => paragraphBlock(para))

  await notion.pages.create({
    parent: { page_id: parentId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: { title: { title: richText(title) } } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children: [headingBlock(title), ...contentBlocks.slice(0, 95)] as any,
  })
}

export async function updateOfferAnalysis(
  pageId: string,
  data: Record<string, unknown>,
  analysisJson: string
) {
  const a4 = data as {
    wynik?: string | null
    nastepny_kontakt_data?: string | null
    nastepne_kroki?: string | null
    obiekcje?: Array<{ tresc_cytat?: string }> | null
    data_reengagement?: string | null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {}

  if (a4.wynik) {
    props['Status'] = { select: { name: wynikToStatus(a4.wynik) } }
  }
  if (a4.nastepny_kontakt_data) {
    const iso = ddMMYYYYtoISO(a4.nastepny_kontakt_data)
    if (iso) props['Data następnego kroku'] = { date: { start: iso } }
  }
  if (a4.nastepne_kroki) {
    props['Następny krok'] = { rich_text: richText(a4.nastepne_kroki) }
  }
  if (a4.obiekcje?.length) {
    const text = a4.obiekcje
      .map((o) => o.tresc_cytat)
      .filter(Boolean)
      .join('\n')
    if (text) props['Obiekcje'] = { rich_text: richText(text) }
  }
  if (a4.data_reengagement) {
    const iso = ddMMYYYYtoISO(a4.data_reengagement)
    if (iso) props['Re-engagement'] = { date: { start: iso } }
  }

  await notion.pages.update({ page_id: pageId, properties: props })
  await createChildPage(pageId, 'Analiza oferty', analysisJson, true)
}
