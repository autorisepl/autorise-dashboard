import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { normalizePhonePL } from "@/lib/format/normalizePhonePL";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const PIPELINE_DB_ID = "75ac8bc6fd6d4c36934bedc1270217eb";
const PIPELINE_DATA_SOURCE_ID = "2ea38355-7529-48f9-8d7f-1c62f5570df3";

// "Autorise Statystyki Dzienne" — osobna baza do ręcznej rejestracji dziennych
// liczników (Dials, Rozmowy, SMS Wysłane) na potrzeby /statystyki. Jeden wiersz
// na dzień, klucz to pole "Data".
const DAILY_STATS_DB_ID = "48177ac606b84395a148da12a6ea10eb";
const DAILY_STATS_DATA_SOURCE_ID = "b3c20544-a5b1-450c-a757-8a0cb0ca2203";

// --- block helpers ---

function richText(text: string) {
  return [{ type: "text" as const, text: { content: text.slice(0, 2000) } }];
}

function paragraphBlock(text: string) {
  return {
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: { rich_text: richText(text) },
  };
}

function headingBlock(text: string) {
  return {
    object: "block" as const,
    type: "heading_2" as const,
    heading_2: { rich_text: richText(text) },
  };
}

function codeBlock(content: string) {
  const chunks: string[] = [];
  for (let i = 0; i < content.length; i += 1900) {
    chunks.push(content.slice(i, i + 1900));
  }
  return chunks.map((chunk) => ({
    object: "block" as const,
    type: "code" as const,
    code: { rich_text: richText(chunk), language: "json" as const },
  }));
}

// --- field mappers ---

function icpToSelect(wynik: number | null): string | null {
  if (wynik == null) return null;
  const map: Record<number, string> = {
    5: "5 - idealny",
    4: "4 - dobry",
    3: "3 - średni",
    2: "2 - słaby",
    1: "1 - nie pasuje",
    0: "1 - nie pasuje",
  };
  return map[Math.round(wynik)] ?? null;
}

function kwalifikacjaToStatus(kwalifikacja: string | null, hasMeeting: boolean): string {
  if (!kwalifikacja) return "Nowy lead";
  const upper = kwalifikacja.toUpperCase();
  if (upper.includes("NIE KWALIFIKUJE")) return "Niekwalifikowany";
  // BORDERLINE stays in pipeline — Michał decides after Discovery
  if (upper === "BORDERLINE" || upper.includes("BORDERLINE")) {
    return hasMeeting ? "Discovery umówione" : "Kwalifikacja";
  }
  if (upper.includes("KWALIFIKUJE") && !upper.includes("NIE") && !upper.includes("WYMAGA")) {
    return hasMeeting ? "Discovery umówione" : "Kwalifikacja";
  }
  return "Kwalifikacja";
}

function wynikToStatus(wynik: string): string {
  const upper = wynik.toUpperCase().trim();
  if (upper === "TAK") return "Finalizacja";
  if (upper === "W TRAKCIE") return "Discovery umówione";
  if (upper === "NIE") return "Niekwalifikowany";
  return "Discovery umówione";
}

function ddMMYYYYtoISO(date: string): string | null {
  const match = date?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

const POLISH_MONTHS: Record<string, string> = {
  stycznia: "01",
  styczeń: "01",
  styczen: "01",
  lutego: "02",
  luty: "02",
  marca: "03",
  marzec: "03",
  kwietnia: "04",
  kwiecień: "04",
  kwiecien: "04",
  maja: "05",
  maj: "05",
  czerwca: "06",
  czerwiec: "06",
  lipca: "07",
  lipiec: "07",
  sierpnia: "08",
  sierpień: "08",
  sierpien: "08",
  września: "09",
  wrzesień: "09",
  wrzesien: "09",
  października: "10",
  październik: "10",
  pazdziernika: "10",
  pazdziernik: "10",
  listopada: "11",
  listopad: "11",
  grudnia: "12",
  grudzień: "12",
  grudzien: "12",
};

function anyDateToISO(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dot = s.match(/^(\d{1,2})\.(\d{2})\.(\d{4})$/);
  if (dot) return `${dot[3]}-${dot[2].padStart(2, "0")}-${dot[1].padStart(2, "0")}`;
  const pl = s.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i);
  if (pl) {
    const month = POLISH_MONTHS[pl[2].toLowerCase()];
    if (month) return `${pl[3]}-${month}-${pl[1].padStart(2, "0")}`;
  }
  const dayOfMonthPattern = s.match(
    /(?:poniedziałek|wtorek|środa|czwartek|piątek|sobota|niedziela)\s+(\d{1,2})(?:\s*\(najbliższy\))?\s*[·-]?\s*(?:\d{2}:\d{2})?/i,
  );
  if (dayOfMonthPattern) {
    const targetDay = parseInt(dayOfMonthPattern[1]);
    const now = new Date();
    let candidate = new Date(now.getFullYear(), now.getMonth(), targetDay);
    if (candidate <= now) {
      candidate = new Date(now.getFullYear(), now.getMonth() + 1, targetDay);
    }
    const yyyy = candidate.getFullYear();
    const mm = String(candidate.getMonth() + 1).padStart(2, "0");
    const dd = String(candidate.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// --- public types ---

export interface PipelineClient {
  id: string;
  name: string;
  status: string;
}

export interface ExistingClientData {
  firma?: string;
  kontakt?: string;
  telefon?: string;
  notatki?: string;
  uwagiAgenta1?: string;
}

// --- public API ---

export async function getClientPage(pageId: string): Promise<ExistingClientData> {
  const page = (await notion.pages.retrieve({ page_id: pageId })) as PageObjectResponse;
  const props = page.properties;
  const result: ExistingClientData = {};

  const firma = props["Firma"];
  if (firma?.type === "title") {
    const val = firma.title
      .map((t) => t.plain_text)
      .join("")
      .trim();
    if (val) result.firma = val;
  }
  const kontakt = props["Kontakt"];
  if (kontakt?.type === "rich_text") {
    const val = kontakt.rich_text
      .map((t) => t.plain_text)
      .join("")
      .trim();
    if (val) result.kontakt = val;
  }
  const telefon = props["Telefon"];
  if (telefon?.type === "phone_number" && telefon.phone_number) {
    result.telefon = telefon.phone_number;
  }
  const notatki = props["Notatki"];
  if (notatki?.type === "rich_text") {
    const val = notatki.rich_text
      .map((t) => t.plain_text)
      .join("")
      .trim();
    if (val) result.notatki = val;
  }
  const uwagiAgenta1 = props["Uwagi Agenta 1"];
  if (uwagiAgenta1?.type === "rich_text") {
    const val = uwagiAgenta1.rich_text
      .map((t) => t.plain_text)
      .join("")
      .trim();
    if (val) result.uwagiAgenta1 = val;
  }

  return result;
}

export async function getPipelineClients(): Promise<PipelineClient[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = (await notion.dataSources.query({
    data_source_id: PIPELINE_DATA_SOURCE_ID,
    page_size: 100,
    sorts: [{ property: "Data pierwszego kontaktu", direction: "descending" }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)) as { results: PageObjectResponse[] };

  return response.results
    .filter((page): page is PageObjectResponse => page.object === "page")
    .map((page) => {
      const firma = page.properties["Firma"];
      const status = page.properties["Status"];
      return {
        id: page.id,
        name:
          firma?.type === "title"
            ? firma.title.map((t) => t.plain_text).join("") || "Bez nazwy"
            : "Bez nazwy",
        status: status?.type === "select" ? (status.select?.name ?? "") : "",
      };
    })
    .filter((c) => c.name !== "Bez nazwy");
}

export async function upsertClientInPipeline(
  pageId: string | undefined,
  data: Record<string, unknown>,
): Promise<string> {
  const a1 = data as {
    imie_nazwisko?: string | null;
    firma?: string | null;
    telefon?: string | null;
    pojazdy?: string | number | null;
    spedytorzy_biuro?: string | number | null;
    tms?: string | null;
    podejscie_integracyjne?: string | null;
    bol_glowny_cytat?: string | null;
    poprzednie_proby?: string | null;
    nastepny_krok?: string | null;
    koszt_problemu?: {
      koszt_miesiecznie?: number | null;
      koszt_roczny?: number | null;
    } | null;
    icp?: {
      wynik?: number | null;
      kwalifikacja?: string | null;
    } | null;
    meet_data?: string | null;
    uwagi_agenta?: string | null;
    wlasciciel_czy_manager?: string | null;
    decydent?: string | null;
    dyskwalifikacja?: boolean;
    dyskwalifikacja_powod?: string | null;
    kalkulator_dane?: {
      maile_dziennie?: number | null;
      godziny_wpisywania?: number | null;
      faktury_po_terminie?: number | null;
      srednia_wartosc_faktury?: number | null;
    } | null;
    followup?: {
      typ_followup?: string | null;
      data_followup?: string | null;
      kontekst_followup?: string | null;
    } | null;
  };

  const hasMeeting = Boolean(a1.meet_data);
  const isDiskwalifikowany = a1.dyskwalifikacja === true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {};

  if (a1.firma) {
    props["Firma"] = { title: richText(a1.firma) };
  } else if (a1.imie_nazwisko) {
    props["Firma"] = { title: richText(a1.imie_nazwisko) };
  }
  if (a1.imie_nazwisko) {
    props["Kontakt"] = { rich_text: richText(a1.imie_nazwisko) };
  }
  if (a1.telefon) {
    const normalized = normalizePhonePL(a1.telefon);
    if (!normalized) console.warn(`normalizePhonePL: nie udało się znormalizować "${a1.telefon}"`);
    props["Telefon"] = { phone_number: normalized ?? a1.telefon };
  }
  if (a1.pojazdy != null) {
    const num = parseInt(String(a1.pojazdy), 10);
    if (!isNaN(num)) props["Flota"] = { number: num };
  }
  if (a1.spedytorzy_biuro != null) {
    const num = parseInt(String(a1.spedytorzy_biuro), 10);
    if (!isNaN(num)) props["Spedytorzy"] = { number: num };
  }
  if (a1.tms) {
    props["TMS"] = { rich_text: richText(a1.tms) };
  }
  if (a1.podejscie_integracyjne) {
    props["Podejście TMS"] = { rich_text: richText(a1.podejscie_integracyjne) };
  }
  if (a1.bol_glowny_cytat) {
    props["Ból główny"] = { rich_text: richText(a1.bol_glowny_cytat) };
  }
  if (a1.poprzednie_proby) {
    props["Poprzednie próby"] = { rich_text: richText(a1.poprzednie_proby) };
  }

  const icpSelect = icpToSelect(a1.icp?.wynik ?? null);
  if (icpSelect) {
    props["Ocena ICP"] = { select: { name: icpSelect } };
  }

  // Aktualizacja istniejącego klienta bez nowego sygnału ICP (np. tryb uzupełnienia gdzie
  // fragment nie dotyczył kwalifikacji) — nie nadpisuj Statusu domyślną wartością.
  const skipStatusWrite = Boolean(pageId) && !isDiskwalifikowany && a1.icp?.kwalifikacja == null;

  if (skipStatusWrite) {
    if (a1.meet_data) {
      const isoDate = anyDateToISO(a1.meet_data);
      if (isoDate) props["Data discovery"] = { date: { start: isoDate } };
    }
    if (a1.nastepny_krok) {
      props["Następny krok"] = { rich_text: richText(a1.nastepny_krok) };
    }
  } else if (isDiskwalifikowany) {
    props["Status"] = { select: { name: "Niekwalifikowany" } };
  } else {
    let pipelineStatus = kwalifikacjaToStatus(a1.icp?.kwalifikacja ?? null, hasMeeting);
    // "Discovery umówione" is a MANUAL action only — never auto-set for existing clients
    if (pageId && pipelineStatus === "Discovery umówione") {
      pipelineStatus = "Kwalifikacja";
    }
    props["Status"] = { select: { name: pipelineStatus } };

    if (a1.meet_data) {
      const isoDate = anyDateToISO(a1.meet_data);
      if (isoDate) props["Data discovery"] = { date: { start: isoDate } };
    }
    if (a1.nastepny_krok) {
      props["Następny krok"] = { rich_text: richText(a1.nastepny_krok) };
    }
  }

  if (a1.koszt_problemu?.koszt_miesiecznie != null) {
    props["Koszt problemu PLN/mc"] = { number: a1.koszt_problemu.koszt_miesiecznie };
  }
  if (a1.koszt_problemu?.koszt_roczny != null) {
    props["Koszt roczny PLN/rok"] = { number: a1.koszt_problemu.koszt_roczny };
  }
  if (a1.uwagi_agenta) {
    props["Uwagi Agenta 1"] = { rich_text: richText(a1.uwagi_agenta) };
  }
  if (a1.kalkulator_dane?.maile_dziennie != null) {
    props["Maile ze zleceniami / dzień"] = { number: a1.kalkulator_dane.maile_dziennie };
  }
  if (a1.kalkulator_dane?.godziny_wpisywania != null) {
    props["Godziny wpisywania / spedytor"] = { number: a1.kalkulator_dane.godziny_wpisywania };
  }
  if (a1.kalkulator_dane?.faktury_po_terminie != null) {
    props["Faktury po terminie / mc"] = { number: a1.kalkulator_dane.faktury_po_terminie };
  }
  if (a1.kalkulator_dane?.srednia_wartosc_faktury != null) {
    props["Średnia wartość faktury PLN"] = { number: a1.kalkulator_dane.srednia_wartosc_faktury };
  }

  // Follow-up scenario: second decision-maker must join Discovery Call, or other deferral.
  // Graceful: missing Notion fields don't break the entire save.
  if (a1.followup?.typ_followup) {
    try {
      props["Typ follow-up"] = { select: { name: a1.followup.typ_followup } };
      if (a1.followup.data_followup) {
        const isoFollowup = anyDateToISO(a1.followup.data_followup);
        if (isoFollowup) props["Data następnego kroku"] = { date: { start: isoFollowup } };
      }
      if (a1.followup.kontekst_followup) {
        props["Następny krok"] = {
          rich_text: richText(
            `[Follow-up: ${a1.followup.typ_followup}] ${a1.followup.kontekst_followup}`,
          ),
        };
      }
    } catch {
      // Follow-up fields are optional — skip silently if Notion rejects them
    }
  }

  // NOTE: The following Pipeline fields are filled MANUALLY by Michał in the Notion UI.
  // They are NEVER written by any agent. Do not add agent logic for these:
  //   "Cena wdrożenia"    — PLN, negotiated price per client
  //   "Retainer PLN/mc"  — monthly retainer amount
  //   "Gotowość zakupowa" — Michał's subjective readiness assessment
  //   "Pilność"           — urgency flag set after Discovery Call

  const isWlasciciel =
    a1.wlasciciel_czy_manager?.toLowerCase().includes("właściciel") ||
    a1.wlasciciel_czy_manager?.toLowerCase().includes("wlasciciel");
  if (isWlasciciel) {
    props["Decydent"] = { checkbox: true };
  }

  if (!pageId) {
    props["Data pierwszego kontaktu"] = { date: { start: todayISO() } };
  }

  type NotionProps = Parameters<typeof notion.pages.update>[0]["properties"];

  const tryUpdate = async (p: Record<string, unknown>) => {
    const notionProps = p as NotionProps;
    if (pageId) {
      await notion.pages.update({ page_id: pageId, properties: notionProps });
      return pageId;
    }
    const page = await notion.pages.create({
      parent: { database_id: PIPELINE_DB_ID },
      properties: notionProps,
    });
    return page.id;
  };

  const extractInvalidProps = (errMsg: string): string[] =>
    [...errMsg.matchAll(/(?:body\.properties\.)?([^\n.]+?) is not a property that exists/g)].map(
      (m) => m[1].trim(),
    );

  try {
    return await tryUpdate(props);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("is not a property that exists")) throw err;

    // Run migration to add missing properties to the Notion DB schema
    try {
      await migrateNotionSchema();
    } catch {
      /* migration may partially succeed */
    }

    // Retry with full props — migration should have created the missing field
    try {
      return await tryUpdate(props);
    } catch (retryErr) {
      // Migration didn't help — strip the problematic fields and try once more
      const retryMsg = retryErr instanceof Error ? retryErr.message : "";
      const invalid = extractInvalidProps(retryMsg);
      const safeProps: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (!invalid.includes(k)) safeProps[k] = v;
      }
      return await tryUpdate(safeProps);
    }
  }
}

// --- Agent 0: Lead Intake ---

export interface LeadIntakeData {
  firma: string | null;
  kontakt: string | null;
  telefon: string | null;
  email: string | null;
  nip: string | null;
  jest_decydentem: boolean | null;
  notatka_krs: string;
}

export async function upsertLeadIntake(data: LeadIntakeData): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {};

  const firma = data.firma || data.kontakt;
  if (firma) props["Firma"] = { title: richText(firma) };
  if (data.kontakt) props["Kontakt"] = { rich_text: richText(data.kontakt) };
  if (data.telefon) {
    const normalized = normalizePhonePL(data.telefon);
    if (!normalized)
      console.warn(`normalizePhonePL: nie udało się znormalizować "${data.telefon}"`);
    props["Telefon"] = { phone_number: normalized ?? data.telefon };
  }

  if (data.email) props["Email"] = { email: data.email };

  const notesLines: string[] = [];
  if (data.email) notesLines.push(`Email: ${data.email}`);
  if (data.nip) notesLines.push(`NIP: ${data.nip}`);
  if (notesLines.length > 0) notesLines.push("");
  notesLines.push(data.notatka_krs);
  props["Notatki"] = { rich_text: richText(notesLines.join("\n")) };

  if (data.jest_decydentem === true) props["Decydent"] = { checkbox: true };

  props["Status"] = { select: { name: "Nowy lead" } };
  props["Data pierwszego kontaktu"] = { date: { start: todayISO() } };

  const page = await notion.pages.create({
    parent: { database_id: PIPELINE_DB_ID },
    properties: props,
  });
  return page.id;
}

export async function createChildPage(
  parentId: string,
  title: string,
  content: string,
  isJson = false,
) {
  const contentBlocks = isJson
    ? codeBlock(content)
    : content
        .split("\n\n")
        .filter(Boolean)
        .map((para) => paragraphBlock(para));

  await notion.pages.create({
    parent: { page_id: parentId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: { title: { title: richText(title) } } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children: [headingBlock(title), ...contentBlocks.slice(0, 95)] as any,
  });
}

// --- Agent 2: Pre-Discovery Brief ---

export async function saveAgent2Output(
  pageId: string,
  preDiscoveryBrief: Record<string, unknown>,
  planDiscovery: string,
  pitchRecipe?: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {};

  const brief = preDiscoveryBrief as {
    hipoteza_bol_glowny?: string | null;
    przewidywane_obiekcje?: Array<{ objekcja?: string }> | null;
    ryzyka_rozmowy?: string | null;
    uwagi_agenta?: string | null;
    cytaty_klienta?: Array<{ cytat?: string; kontekst?: string }> | null;
  };

  if (brief.hipoteza_bol_glowny) {
    props["Hipoteza ból główny"] = { rich_text: richText(brief.hipoteza_bol_glowny) };
  }
  if (brief.przewidywane_obiekcje?.length) {
    const text = brief.przewidywane_obiekcje
      .map((o) => o.objekcja)
      .filter(Boolean)
      .join("\n");
    if (text) props["Przewidywane obiekcje"] = { rich_text: richText(text) };
  }
  if (brief.ryzyka_rozmowy) {
    props["Ryzyka rozmowy"] = { rich_text: richText(brief.ryzyka_rozmowy) };
  }
  if (brief.uwagi_agenta) {
    props["Uwagi Agenta 2"] = { rich_text: richText(brief.uwagi_agenta) };
  }
  if (pitchRecipe) {
    props["Pitch Recipe"] = { rich_text: richText(pitchRecipe) };
  }
  if (brief.cytaty_klienta?.length) {
    // Format: "cytat|||kontekst" per linia, sparsowane z powrotem w BriefSection (/sprzedaz)
    const text = brief.cytaty_klienta
      .filter((c) => c.cytat)
      .map((c) => `${c.cytat}|||${c.kontekst ?? ""}`)
      .join("\n");
    if (text) props["Cytaty klienta"] = { rich_text: richText(text) };
  }

  await notion.pages.update({ page_id: pageId, properties: props });
  await createChildPage(pageId, "Pre-Discovery Brief", planDiscovery, false);
}

// --- Agent 3: Personalizacja Prezentacji ---

export async function saveAgent3Output(pageId: string, personalizacjaJson: string): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      "Personalizacja prezentacji": { rich_text: richText(personalizacjaJson) },
    },
  });
}

// --- Agent 4: Analiza Discovery Call ---

export async function updateDiscoveryAnalysis(
  pageId: string,
  data: Record<string, unknown>,
  analysisJson: string,
) {
  const a4 = data as {
    wynik?: string | null;
    nastepny_kontakt_data?: string | null;
    nastepne_kroki?: string | null;
    data_reengagement?: string | null;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {};

  if (a4.wynik) {
    props["Status"] = { select: { name: wynikToStatus(a4.wynik) } };
    props["Wynik Discovery"] = { select: { name: a4.wynik.toUpperCase().trim() } };
  }
  if (a4.nastepny_kontakt_data) {
    const iso = anyDateToISO(a4.nastepny_kontakt_data) ?? ddMMYYYYtoISO(a4.nastepny_kontakt_data);
    if (iso) props["Data następnego kroku"] = { date: { start: iso } };
  }
  if (a4.nastepne_kroki) {
    props["Następny krok"] = { rich_text: richText(a4.nastepne_kroki) };
  }
  if (a4.data_reengagement) {
    const iso = anyDateToISO(a4.data_reengagement) ?? ddMMYYYYtoISO(a4.data_reengagement);
    if (iso) props["Re-engagement"] = { date: { start: iso } };
  }

  await notion.pages.update({ page_id: pageId, properties: props });
  await createChildPage(pageId, "Analiza Discovery Call", analysisJson, true);
}

// --- Schema migration: add new Pipeline properties ---

async function confirmSchemaFields(
  fieldNames: string[],
): Promise<{ confirmed: string[]; missing: string[] }> {
  const dataSource = await notion.dataSources.retrieve({ data_source_id: PIPELINE_DATA_SOURCE_ID });
  const liveProperties = dataSource.properties ?? {};
  const confirmed = fieldNames.filter((name) => name in liveProperties);
  const missing = fieldNames.filter((name) => !(name in liveProperties));
  return { confirmed, missing };
}

export async function migrateNotionSchema(): Promise<{ added: string[]; errors: string[] }> {
  const added: string[] = [];
  const errors: string[] = [];

  // Batch 1: core agent-written fields and calculators
  try {
    await notion.dataSources.update({
      data_source_id: PIPELINE_DATA_SOURCE_ID,
      properties: {
        "Hipoteza ból główny": { rich_text: {} },
        "Przewidywane obiekcje": { rich_text: {} },
        "Ryzyka rozmowy": { rich_text: {} },
        "Personalizacja prezentacji": { rich_text: {} },
        "Wynik Discovery": {
          select: {
            options: [
              { name: "TAK", color: "green" },
              { name: "NIE", color: "red" },
              { name: "W TRAKCIE", color: "yellow" },
            ],
          },
        },
        "Uwagi Agenta 2": { rich_text: {} },
        Spedytorzy: { number: {} },
        "Poprzednie próby": { rich_text: {} },
        "Koszt problemu PLN/mc": { number: {} },
        "Koszt roczny PLN/rok": { number: {} },
        "Uwagi Agenta 1": { rich_text: {} },
        "Uwagi Agenta 4": { rich_text: {} },
        "Maile ze zleceniami / dzień": { number: {} },
        "Godziny wpisywania / spedytor": { number: {} },
        "Faktury po terminie / mc": { number: {} },
        "Średnia wartość faktury PLN": { number: {} },
        // Contact fields written by Agent 1
        Kontakt: { rich_text: {} },
        Telefon: { phone_number: {} },
        Email: { email: {} },
        NIP: { rich_text: {} },
        Flota: { number: {} },
        Decydent: { checkbox: {} },
        // Pain & solution fields
        "Ból główny": { rich_text: {} },
        TMS: { rich_text: {} },
        "Podejście TMS": { rich_text: {} },
        Obiekcje: { rich_text: {} },
        Notatki: { rich_text: {} },
        "Następny krok": { rich_text: {} },
        "Pitch Recipe": { rich_text: {} },
        "Liczba prób kontaktu": { number: {} },
        "Cytaty klienta": { rich_text: {} },
      },
    });
    const { confirmed, missing } = await confirmSchemaFields([
      "Hipoteza ból główny",
      "Przewidywane obiekcje",
      "Ryzyka rozmowy",
      "Personalizacja prezentacji",
      "Wynik Discovery",
      "Uwagi Agenta 2",
      "Spedytorzy",
      "Poprzednie próby",
      "Koszt problemu PLN/mc",
      "Koszt roczny PLN/rok",
      "Uwagi Agenta 1",
      "Uwagi Agenta 4",
      "Maile ze zleceniami / dzień",
      "Godziny wpisywania / spedytor",
      "Faktury po terminie / mc",
      "Średnia wartość faktury PLN",
      "Kontakt",
      "Telefon",
      "Email",
      "NIP",
      "Flota",
      "Decydent",
      "Ból główny",
      "TMS",
      "Podejście TMS",
      "Obiekcje",
      "Notatki",
      "Następny krok",
      "Pitch Recipe",
      "Liczba prób kontaktu",
      "Cytaty klienta",
    ]);
    added.push(...confirmed);
    for (const name of missing) {
      errors.push(
        `Batch 1: pole "${name}" nie pojawiło się w schemacie po update (brak wyjątku, ale retrieve go nie potwierdza)`,
      );
    }
  } catch (err) {
    errors.push(`Batch 1: ${err instanceof Error ? err.message : "Błąd migracji schematu"}`);
  }

  // Batch 2: date fields, selects, and additional fields
  try {
    await notion.dataSources.update({
      data_source_id: PIPELINE_DATA_SOURCE_ID,
      properties: {
        "Data pierwszego kontaktu": { date: {} },
        "Data discovery": { date: {} },
        "Data następnego kroku": { date: {} },
        "Data oferty": { date: {} },
        "Data zamknięcia": { date: {} },
        "Re-engagement": { date: {} },
        Źródło: {
          select: {
            options: [
              { name: "META Ads", color: "blue" },
              { name: "Polecenie", color: "green" },
              { name: "LinkedIn", color: "purple" },
              { name: "Cold outreach", color: "orange" },
              { name: "Inne", color: "gray" },
            ],
          },
        },
        "Powód rezygnacji": { rich_text: {} },
        "Wszystkie transkrypty": { rich_text: {} },
        // Option names MUST match icpToSelect() in this file and real Notion schema
        "Ocena ICP": {
          select: {
            options: [
              { name: "5 - idealny", color: "green" },
              { name: "4 - dobry", color: "green" },
              { name: "3 - średni", color: "yellow" },
              { name: "2 - słaby", color: "orange" },
              { name: "1 - nie pasuje", color: "red" },
            ],
          },
        },
        // Fields filled MANUALLY by Michał in Notion UI — never written by agents
        "Cena wdrożenia": { number: {} },
        "Retainer PLN/mc": { number: {} },
        // Ustalane na żywo podczas rozmowy zamykającej, mini-formularz w /sprzedaz
        // (krok "cena"), do Załącznika nr 1 umowy — SZKIC_UMOWA_AUTORISE.md §2 ust. 1.
        "Warunki umowy — dni dostępów": { number: {} },
        "Warunki umowy — uwagi": { rich_text: {} },
        "Gotowość zakupowa": {
          select: {
            options: [
              { name: "5 - kupuje", color: "green" },
              { name: "4 - prawie", color: "green" },
              { name: "3 - zainteresowany", color: "yellow" },
              { name: "2 - waha się", color: "orange" },
              { name: "1 - zimny", color: "red" },
            ],
          },
        },
        Pilność: {
          select: {
            options: [
              { name: "Szuka teraz", color: "red" },
              { name: "W ciągu miesiąca", color: "orange" },
              { name: "Rozgląda się", color: "yellow" },
              { name: "Brak pilności", color: "gray" },
            ],
          },
        },
      },
    });
    const { confirmed, missing } = await confirmSchemaFields([
      "Data pierwszego kontaktu",
      "Data discovery",
      "Data następnego kroku",
      "Data oferty",
      "Data zamknięcia",
      "Re-engagement",
      "Źródło",
      "Powód rezygnacji",
      "Wszystkie transkrypty",
      "Ocena ICP",
      "Cena wdrożenia",
      "Retainer PLN/mc",
      "Warunki umowy — dni dostępów",
      "Warunki umowy — uwagi",
      "Gotowość zakupowa",
      "Pilność",
    ]);
    added.push(...confirmed);
    for (const name of missing) {
      errors.push(
        `Batch 2: pole "${name}" nie pojawiło się w schemacie po update (brak wyjątku, ale retrieve go nie potwierdza)`,
      );
    }
  } catch (err) {
    errors.push(`Batch 2: ${err instanceof Error ? err.message : "Błąd migracji schematu"}`);
  }

  return { added, errors };
}

// --- Operation History ---

export interface HistoryEntry {
  id: string;
  title: string;
  date: string;
  type: string;
}

export async function saveOperationHistory(
  pageId: string,
  type: string,
  summary: string,
  detailsJson?: string,
): Promise<void> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const title = `[Historia] ${dateStr} ${timeStr} — ${type}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [
    headingBlock(`${type}`),
    paragraphBlock(`${dateStr} ${timeStr}`),
    paragraphBlock(summary),
  ];
  if (detailsJson) {
    blocks.push(...codeBlock(detailsJson));
  }

  await notion.pages.create({
    parent: { page_id: pageId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: { title: { title: richText(title) } } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children: blocks.slice(0, 95) as any,
  });
}

export async function getOperationHistory(pageId: string): Promise<HistoryEntry[]> {
  const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
  const entries: HistoryEntry[] = [];

  for (const block of blocks.results) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = block as any;
    if (b.type === "child_page") {
      const title: string = b.child_page?.title ?? "";
      if (title.startsWith("[Historia]")) {
        const match = title.match(/\[Historia\] (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) — (.+)/);
        entries.push({
          id: block.id,
          title,
          date: match ? `${match[1]} ${match[2]}` : "",
          type: match ? match[3] : title.replace("[Historia] ", ""),
        });
      }
    }
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getOperationHistoryDetails(entryPageId: string): Promise<string> {
  const blocks = await notion.blocks.children.list({ block_id: entryPageId, page_size: 100 });
  const parts: string[] = [];
  for (const block of blocks.results) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = block as any;
    if (b.type === "code") {
      const text = (b.code?.rich_text ?? [])
        .map((r: { plain_text?: string }) => r.plain_text ?? "")
        .join("");
      parts.push(text);
    }
  }
  return parts.join("");
}

// --- Kwalifikacja Knowledge Base (Etap 1) ---
// Fetches and caches the content of the "Etap 1 - Rozmowa kwalifikacyjna" Notion page
// so Agent 01 always has up-to-date process knowledge injected into its context.

const KWALIFIKACJA_KB_PAGE_ID = "387b5106a69481f6aea8ed47a7ec279e";
const KB_TTL = 5 * 60 * 1000; // 5-minute in-memory cache

let kbCache: { text: string; fetchedAt: number } | null = null;

function richBlockToText(block: Record<string, unknown>): string {
  const t = block.type as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rt = (items: any[]) => (items ?? []).map((r: any) => r.plain_text ?? "").join("");

  if (t === "paragraph") return rt((block.paragraph as any)?.rich_text);
  if (t === "heading_1") return `# ${rt((block.heading_1 as any)?.rich_text)}`;
  if (t === "heading_2") return `## ${rt((block.heading_2 as any)?.rich_text)}`;
  if (t === "heading_3") return `### ${rt((block.heading_3 as any)?.rich_text)}`;
  if (t === "bulleted_list_item") return `- ${rt((block.bulleted_list_item as any)?.rich_text)}`;
  if (t === "numbered_list_item") return `• ${rt((block.numbered_list_item as any)?.rich_text)}`;
  if (t === "quote") return `> ${rt((block.quote as any)?.rich_text)}`;
  if (t === "callout") return `📌 ${rt((block.callout as any)?.rich_text)}`;
  if (t === "toggle") return `▶ ${rt((block.toggle as any)?.rich_text)}`;
  if (t === "to_do")
    return `[${(block.to_do as any)?.checked ? "x" : " "}] ${rt((block.to_do as any)?.rich_text)}`;
  return "";
}

export async function getKwalifikacjaKnowledge(): Promise<string> {
  const now = Date.now();
  if (kbCache && now - kbCache.fetchedAt < KB_TTL) return kbCache.text;

  try {
    const response = await notion.blocks.children.list({
      block_id: KWALIFIKACJA_KB_PAGE_ID,
      page_size: 100,
    });
    const lines = (response.results as Record<string, unknown>[])
      .map(richBlockToText)
      .filter(Boolean);
    const text = lines.join("\n");
    kbCache = { text, fetchedAt: now };
    return text;
  } catch {
    return kbCache?.text ?? "";
  }
}

// --- Statystyki Dzienne (ręczne liczniki: Dials / Rozmowy / SMS) ---

export type DailyStatType = "dial" | "rozmowa" | "sms";

const DAILY_STAT_FIELD: Record<DailyStatType, string> = {
  dial: "Dials",
  rozmowa: "Rozmowy",
  sms: "SMS Wysłane",
};

async function findDailyStatsRow(dateISO: string): Promise<PageObjectResponse | null> {
  const response = (await notion.dataSources.query({
    data_source_id: DAILY_STATS_DATA_SOURCE_ID,
    filter: { property: "Data", date: { equals: dateISO } },
    page_size: 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)) as { results: PageObjectResponse[] };

  return response.results.find((p): p is PageObjectResponse => p.object === "page") ?? null;
}

export async function incrementDailyStat(type: DailyStatType): Promise<void> {
  const dateISO = todayISO();
  const field = DAILY_STAT_FIELD[type];
  const existing = await findDailyStatsRow(dateISO);

  if (existing) {
    const currentProp = existing.properties[field];
    const current = currentProp?.type === "number" ? (currentProp.number ?? 0) : 0;
    await notion.pages.update({
      page_id: existing.id,
      properties: { [field]: { number: current + 1 } },
    });
    return;
  }

  await notion.pages.create({
    parent: { database_id: DAILY_STATS_DB_ID },
    properties: {
      Nazwa: { title: richText(dateISO) },
      Data: { date: { start: dateISO } },
      [field]: { number: 1 },
    },
  });
}

export interface DailyStatsTotals {
  dials: number;
  rozmowy: number;
  sms: number;
}

export async function getDailyStatsRangeTotals(
  from: string,
  to: string,
): Promise<DailyStatsTotals> {
  const totals: DailyStatsTotals = { dials: 0, rozmowy: 0, sms: 0 };
  let cursor: string | undefined;

  do {
    const response = (await notion.dataSources.query({
      data_source_id: DAILY_STATS_DATA_SOURCE_ID,
      filter: {
        and: [
          { property: "Data", date: { on_or_after: from } },
          { property: "Data", date: { on_or_before: to } },
        ],
      },
      page_size: 100,
      start_cursor: cursor,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as { results: PageObjectResponse[]; has_more: boolean; next_cursor: string | null };

    for (const page of response.results) {
      if (page.object !== "page") continue;
      const dials = page.properties["Dials"];
      const rozmowy = page.properties["Rozmowy"];
      const sms = page.properties["SMS Wysłane"];
      if (dials?.type === "number") totals.dials += dials.number ?? 0;
      if (rozmowy?.type === "number") totals.rozmowy += rozmowy.number ?? 0;
      if (sms?.type === "number") totals.sms += sms.number ?? 0;
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return totals;
}

// Cena standardowa z lib/agents/prompts.ts (Agent 1/2/5): 15 000 PLN netto wdrożenie
// + 4 000 PLN/mc retainer. "Cena wdrożenia"/"Retainer PLN/mc" są polami wypełnianymi
// WYŁĄCZNIE ręcznie przez Michała — jednorazowa migracja uzupełnia tylko puste karty,
// nigdy nie nadpisuje wartości już wpisanej (mogła być świadomie ustawiona inaczej).
const DOMYSLNA_CENA_WDROZENIA = 15000;
const DOMYSLNY_RETAINER = 4000;

export interface PipelineCardMissingPricing {
  id: string;
  name: string;
  cenaWdrozeniaPusta: boolean;
  retainerPusta: boolean;
}

export async function findPipelineCardsMissingPricing(): Promise<PipelineCardMissingPricing[]> {
  const results: PipelineCardMissingPricing[] = [];
  let cursor: string | undefined;

  do {
    const response = (await notion.dataSources.query({
      data_source_id: PIPELINE_DATA_SOURCE_ID,
      page_size: 100,
      start_cursor: cursor,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as { results: PageObjectResponse[]; has_more: boolean; next_cursor: string | null };

    for (const page of response.results) {
      if (page.object !== "page") continue;
      const firma = page.properties["Firma"];
      const cena = page.properties["Cena wdrożenia"];
      const retainer = page.properties["Retainer PLN/mc"];
      const cenaWdrozeniaPusta = cena?.type === "number" && !cena.number;
      const retainerPusta = retainer?.type === "number" && !retainer.number;
      if (cenaWdrozeniaPusta || retainerPusta) {
        results.push({
          id: page.id,
          name:
            firma?.type === "title"
              ? firma.title.map((t) => t.plain_text).join("") || "Bez nazwy"
              : "Bez nazwy",
          cenaWdrozeniaPusta,
          retainerPusta,
        });
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return results;
}

export interface FillDefaultPricingResult {
  updated: string[];
  errors: string[];
}

// Wypełnia TYLKO pola faktycznie puste (potwierdzone przez findPipelineCardsMissingPricing
// tuż przed wywołaniem) — nie ma tu ponownego sprawdzania stanu, więc karty muszą pochodzić
// ze świeżego preview, żeby uniknąć wyścigu z ręczną edycją w Notion między preview a apply.
export async function fillDefaultPricingForCards(
  cards: PipelineCardMissingPricing[],
): Promise<FillDefaultPricingResult> {
  const updated: string[] = [];
  const errors: string[] = [];

  for (const card of cards) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props: Record<string, any> = {};
    if (card.cenaWdrozeniaPusta) props["Cena wdrożenia"] = { number: DOMYSLNA_CENA_WDROZENIA };
    if (card.retainerPusta) props["Retainer PLN/mc"] = { number: DOMYSLNY_RETAINER };
    if (Object.keys(props).length === 0) continue;

    try {
      await notion.pages.update({ page_id: card.id, properties: props });
      updated.push(card.name);
    } catch (err) {
      errors.push(`${card.name}: ${err instanceof Error ? err.message : "Błąd zapisu"}`);
    }
  }

  return { updated, errors };
}

// Cena regularna po zmianie mechanizmu 2026-07-13 (SZKIC_UMOWA_AUTORISE.md §5 ust. 1):
// 18 000 PLN, rabat za terminowość -3 000 PLN (do 15 000 PLN) przy płatności w 14 dni ORAZ
// dostępach w ustalonym terminie. Migracja z poprzedniej sesji (fillDefaultPricingForCards
// wyżej, stała DOMYSLNA_CENA_WDROZENIA=15000 sprzed tej zmiany) zapisała 15000 jako
// SAMODZIELNĄ cenę w kartach z pustym polem — pod nowym mechanizmem te karty powinny
// pokazywać DWIE ceny (18000 przekreślona + 15000 wyróżniona), co wymaga pustego pola
// (fallback w prezentacja-dane/route.ts), nie zapisanej liczby. Ta migracja odwraca
// TYLKO karty z wartością dokładnie 15000 — realna, świadomie inna cena niestandardowa
// (np. 22000 dla dużej floty) zostaje nietknięta, bo nie pasuje do exact match.
const STARA_CENA_DOMYSLNA = 15000;

export interface PipelineCardOldDefaultPrice {
  id: string;
  name: string;
}

export async function findPipelineCardsWithOldDefaultPrice(): Promise<
  PipelineCardOldDefaultPrice[]
> {
  const results: PipelineCardOldDefaultPrice[] = [];
  let cursor: string | undefined;

  do {
    const response = (await notion.dataSources.query({
      data_source_id: PIPELINE_DATA_SOURCE_ID,
      page_size: 100,
      start_cursor: cursor,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as { results: PageObjectResponse[]; has_more: boolean; next_cursor: string | null };

    for (const page of response.results) {
      if (page.object !== "page") continue;
      const firma = page.properties["Firma"];
      const cena = page.properties["Cena wdrożenia"];
      if (cena?.type === "number" && cena.number === STARA_CENA_DOMYSLNA) {
        results.push({
          id: page.id,
          name:
            firma?.type === "title"
              ? firma.title.map((t) => t.plain_text).join("") || "Bez nazwy"
              : "Bez nazwy",
        });
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return results;
}

export interface ReconcilePricingResult {
  updated: string[];
  errors: string[];
}

// Czyści "Cena wdrożenia" (ustawia na pusty number) TYLKO dla kart przekazanych ze
// świeżego findPipelineCardsWithOldDefaultPrice, tuż przed wywołaniem — bez ponownego
// sprawdzania stanu, żeby uniknąć wyścigu z ręczną edycją w Notion między preview a apply.
export async function clearOldDefaultPriceForCards(
  cards: PipelineCardOldDefaultPrice[],
): Promise<ReconcilePricingResult> {
  const updated: string[] = [];
  const errors: string[] = [];

  for (const card of cards) {
    try {
      await notion.pages.update({
        page_id: card.id,
        properties: { "Cena wdrożenia": { number: null } },
      });
      updated.push(card.name);
    } catch (err) {
      errors.push(`${card.name}: ${err instanceof Error ? err.message : "Błąd zapisu"}`);
    }
  }

  return { updated, errors };
}
