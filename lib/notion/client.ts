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
  if (upper === 'W TRAKCIE') return 'Discovery umówione'
  if (upper === 'NIE') return 'Niekwalifikowany'
  return 'Discovery umówione'
}

function ddMMYYYYtoISO(date: string): string | null {
  const match = date?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!match) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}

const POLISH_MONTHS: Record<string, string> = {
  stycznia: '01', styczeń: '01', styczen: '01',
  lutego: '02', luty: '02',
  marca: '03', marzec: '03',
  kwietnia: '04', kwiecień: '04', kwiecien: '04',
  maja: '05', maj: '05',
  czerwca: '06', czerwiec: '06',
  lipca: '07', lipiec: '07',
  sierpnia: '08', sierpień: '08', sierpien: '08',
  września: '09', wrzesień: '09', wrzesien: '09',
  października: '10', październik: '10', pazdziernika: '10', pazdziernik: '10',
  listopada: '11', listopad: '11',
  grudnia: '12', grudzień: '12', grudzien: '12',
}

function anyDateToISO(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const dot = s.match(/^(\d{1,2})\.(\d{2})\.(\d{4})$/)
  if (dot) return `${dot[3]}-${dot[2].padStart(2, '0')}-${dot[1].padStart(2, '0')}`
  const pl = s.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i)
  if (pl) {
    const month = POLISH_MONTHS[pl[2].toLowerCase()]
    if (month) return `${pl[3]}-${month}-${pl[1].padStart(2, '0')}`
  }
  return null
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

export interface ExistingClientData {
  firma?: string
  kontakt?: string
  telefon?: string
  notatki?: string
}

// --- public API ---

export async function getClientPage(pageId: string): Promise<ExistingClientData> {
  const page = (await notion.pages.retrieve({ page_id: pageId })) as PageObjectResponse
  const props = page.properties
  const result: ExistingClientData = {}

  const firma = props['Firma']
  if (firma?.type === 'title') {
    const val = firma.title.map((t) => t.plain_text).join('').trim()
    if (val) result.firma = val
  }
  const kontakt = props['Kontakt']
  if (kontakt?.type === 'rich_text') {
    const val = kontakt.rich_text.map((t) => t.plain_text).join('').trim()
    if (val) result.kontakt = val
  }
  const telefon = props['Telefon']
  if (telefon?.type === 'phone_number' && telefon.phone_number) {
    result.telefon = telefon.phone_number
  }
  const notatki = props['Notatki']
  if (notatki?.type === 'rich_text') {
    const val = notatki.rich_text.map((t) => t.plain_text).join('').trim()
    if (val) result.notatki = val
  }

  return result
}

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
    spedytorzy_biuro?: string | number | null
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
    decydent?: string | null
    dyskwalifikacja?: boolean
    dyskwalifikacja_powod?: string | null
  }

  const hasMeeting = Boolean(a1.meet_data)
  const isDiskwalifikowany = a1.dyskwalifikacja === true

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
  if (a1.spedytorzy_biuro != null) {
    const num = parseInt(String(a1.spedytorzy_biuro), 10)
    if (!isNaN(num)) props['Spedytorzy'] = { number: num }
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
  if (a1.poprzednie_proby) {
    props['Poprzednie próby'] = { rich_text: richText(a1.poprzednie_proby) }
  }

  const icpSelect = icpToSelect(a1.icp?.wynik ?? null)
  if (icpSelect) {
    props['Ocena ICP'] = { select: { name: icpSelect } }
  }

  if (isDiskwalifikowany) {
    props['Status'] = { select: { name: 'Niekwalifikowany' } }
  } else {
    const pipelineStatus = kwalifikacjaToStatus(a1.icp?.kwalifikacja ?? null, hasMeeting)
    props['Status'] = { select: { name: pipelineStatus } }

    if (a1.meet_data) {
      const isoDate = anyDateToISO(a1.meet_data)
      if (isoDate) props['Data discovery'] = { date: { start: isoDate } }
    }
    if (a1.nastepny_krok) {
      props['Następny krok'] = { rich_text: richText(a1.nastepny_krok) }
    }
  }

  if (a1.koszt_problemu?.koszt_miesiecznie != null) {
    props['Koszt problemu PLN/mc'] = { number: a1.koszt_problemu.koszt_miesiecznie }
  }
  if (a1.koszt_problemu?.koszt_roczny != null) {
    props['Koszt roczny PLN/rok'] = { number: a1.koszt_problemu.koszt_roczny }
  }
  if (a1.uwagi_agenta) {
    props['Uwagi Agenta 1'] = { rich_text: richText(a1.uwagi_agenta) }
  }

  const isWlasciciel =
    a1.wlasciciel_czy_manager?.toLowerCase().includes('właściciel') ||
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

// --- Agent 0: Lead Intake ---

export interface LeadIntakeData {
  firma: string | null
  kontakt: string | null
  telefon: string | null
  email: string | null
  nip: string | null
  jest_decydentem: boolean | null
  notatka_krs: string
}

export async function upsertLeadIntake(data: LeadIntakeData): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {}

  const firma = data.firma || data.kontakt
  if (firma) props['Firma'] = { title: richText(firma) }
  if (data.kontakt) props['Kontakt'] = { rich_text: richText(data.kontakt) }
  if (data.telefon) props['Telefon'] = { phone_number: data.telefon }

  const notesLines: string[] = []
  if (data.email) notesLines.push(`Email: ${data.email}`)
  if (data.nip) notesLines.push(`NIP: ${data.nip}`)
  if (notesLines.length > 0) notesLines.push('')
  notesLines.push(data.notatka_krs)
  props['Notatki'] = { rich_text: richText(notesLines.join('\n')) }

  if (data.jest_decydentem === true) props['Decydent'] = { checkbox: true }

  props['Status'] = { select: { name: 'Nowy lead' } }
  props['Data pierwszego kontaktu'] = { date: { start: todayISO() } }

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

// --- Agent 2: Pre-Discovery Brief ---

export async function saveAgent2Output(
  pageId: string,
  preDiscoveryBrief: Record<string, unknown>,
  planDiscovery: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {}

  const brief = preDiscoveryBrief as {
    hipoteza_bol_glowny?: string | null
    przewidywane_obiekcje?: Array<{ objekcja?: string }> | null
    ryzyka_rozmowy?: string | null
    uwagi_agenta?: string | null
  }

  if (brief.hipoteza_bol_glowny) {
    props['Hipoteza ból główny'] = { rich_text: richText(brief.hipoteza_bol_glowny) }
  }
  if (brief.przewidywane_obiekcje?.length) {
    const text = brief.przewidywane_obiekcje
      .map((o) => o.objekcja)
      .filter(Boolean)
      .join('\n')
    if (text) props['Przewidywane obiekcje'] = { rich_text: richText(text) }
  }
  if (brief.ryzyka_rozmowy) {
    props['Ryzyka rozmowy'] = { rich_text: richText(brief.ryzyka_rozmowy) }
  }
  if (brief.uwagi_agenta) {
    props['Uwagi Agenta 2'] = { rich_text: richText(brief.uwagi_agenta) }
  }

  await notion.pages.update({ page_id: pageId, properties: props })
  await createChildPage(pageId, 'Pre-Discovery Brief', planDiscovery, false)
}

// --- Agent 3: Personalizacja Prezentacji ---

export async function saveAgent3Output(
  pageId: string,
  personalizacjaJson: string
): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      'Personalizacja prezentacji': { rich_text: richText(personalizacjaJson) },
    },
  })
}

// --- Agent 4: Analiza Discovery Call ---

export async function updateDiscoveryAnalysis(
  pageId: string,
  data: Record<string, unknown>,
  analysisJson: string
) {
  const a4 = data as {
    wynik?: string | null
    nastepny_kontakt_data?: string | null
    nastepne_kroki?: string | null
    data_reengagement?: string | null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {}

  if (a4.wynik) {
    props['Status'] = { select: { name: wynikToStatus(a4.wynik) } }
    props['Wynik Discovery'] = { select: { name: a4.wynik.toUpperCase().trim() } }
  }
  if (a4.nastepny_kontakt_data) {
    const iso = anyDateToISO(a4.nastepny_kontakt_data) ?? ddMMYYYYtoISO(a4.nastepny_kontakt_data)
    if (iso) props['Data następnego kroku'] = { date: { start: iso } }
  }
  if (a4.nastepne_kroki) {
    props['Następny krok'] = { rich_text: richText(a4.nastepne_kroki) }
  }
  if (a4.data_reengagement) {
    const iso = anyDateToISO(a4.data_reengagement) ?? ddMMYYYYtoISO(a4.data_reengagement)
    if (iso) props['Re-engagement'] = { date: { start: iso } }
  }

  await notion.pages.update({ page_id: pageId, properties: props })
  await createChildPage(pageId, 'Analiza Discovery Call', analysisJson, true)
}

// --- Schema migration: add new Pipeline properties ---

export async function migrateNotionSchema(): Promise<{ added: string[]; errors: string[] }> {
  const added: string[] = []
  const errors: string[] = []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (notion.databases.update as any)({
      database_id: PIPELINE_DB_ID,
      properties: {
        'Hipoteza ból główny': { rich_text: {} },
        'Przewidywane obiekcje': { rich_text: {} },
        'Ryzyka rozmowy': { rich_text: {} },
        'Personalizacja prezentacji': { rich_text: {} },
        'Wynik Discovery': {
          select: {
            options: [
              { name: 'TAK', color: 'green' },
              { name: 'NIE', color: 'red' },
              { name: 'W TRAKCIE', color: 'yellow' },
            ],
          },
        },
        'Uwagi Agenta 2': { rich_text: {} },
        'Spedytorzy': { number: {} },
        'Poprzednie próby': { rich_text: {} },
        'Koszt problemu PLN/mc': { number: {} },
        'Koszt roczny PLN/rok': { number: {} },
        'Uwagi Agenta 1': { rich_text: {} },
        'Uwagi Agenta 4': { rich_text: {} },
      },
    })
    added.push(
      'Hipoteza ból główny',
      'Przewidywane obiekcje',
      'Ryzyka rozmowy',
      'Personalizacja prezentacji',
      'Wynik Discovery',
      'Uwagi Agenta 2',
      'Spedytorzy',
      'Poprzednie próby',
      'Koszt problemu PLN/mc',
      'Koszt roczny PLN/rok',
      'Uwagi Agenta 1',
      'Uwagi Agenta 4'
    )
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Błąd migracji schematu')
  }

  return { added, errors }
}
