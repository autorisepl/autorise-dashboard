import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDriveClient, getRefreshToken } from "@/lib/google/auth";
import { listAllFileNames } from "@/lib/google/driveFolder";
import { getDailyStatsRangeTotals } from "@/lib/notion/client";
import { classifyStage, hasMatchingTranscript } from "@/lib/transcripts/parse";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const PIPELINE_DATA_SOURCE_ID = "2ea38355-7529-48f9-8d7f-1c62f5570df3";

const SPRZEDAZ_STATUSES = ["Kickoff", "Wdrożenie", "Retainer", "Upsell"];

const MP3_FOLDER_ID = process.env.GOOGLE_DRIVE_TRANSCRIPTS_MP3_FOLDER_ID ?? "";
const TXT_FOLDER_ID = process.env.GOOGLE_DRIVE_TRANSCRIPTS_TXT_FOLDER_ID ?? "";

export interface StatsResponse {
  from: string;
  to: string;
  dials: number;
  rozmowy_kwalifikacja: number;
  rozmowy_sprzedaz: number;
  sms: number;
  nowe_leady: number;
  discovery_umowione: number;
  discovery_odbyte: number;
  no_show: number;
  show_rate: number;
  sprzedaze: number;
  wartosc_sprzedazy_pln: number;
  niekwalifikowani: number;
  odbyte_nieprzetworzone_kwalifikacja: number;
  odbyte_nieprzetworzone_sprzedaz: number;
  /** false gdy Google Drive niepodłączony — front-end pokazuje honest fallback, nie 0. */
  nagrania_dostepne: boolean;
}

// A6 (2026-07-18): "Odbyte, nieprzetworzone" — różnica między nagraniami mp3 faktycznie
// zebranymi na Drive a transkryptami które faktycznie powstały, rozbita na etap wg tagu w
// nazwie pliku (ten sam parser co /pliki, sprawdzony jako już zgodny format nazw).
async function countUnprocessedRecordings(): Promise<{
  kwalifikacja: number;
  sprzedaz: number;
  available: boolean;
}> {
  if (!MP3_FOLDER_ID || !TXT_FOLDER_ID) return { kwalifikacja: 0, sprzedaz: 0, available: false };

  const cookieStore = await cookies();
  const refreshToken = getRefreshToken({
    get: (name) => {
      const val = cookieStore.get(name);
      return val ? { value: val.value } : undefined;
    },
  });
  if (!refreshToken) return { kwalifikacja: 0, sprzedaz: 0, available: false };

  try {
    const drive = getDriveClient(refreshToken);
    const [mp3Names, txtNames] = await Promise.all([
      listAllFileNames(drive, MP3_FOLDER_ID),
      listAllFileNames(drive, TXT_FOLDER_ID),
    ]);

    let kwalifikacja = 0;
    let sprzedaz = 0;
    for (const name of mp3Names) {
      if (hasMatchingTranscript(name, txtNames)) continue;
      const stage = classifyStage(name);
      if (stage === "kwalifikacja") kwalifikacja += 1;
      else if (stage === "sprzedaz") sprzedaz += 1;
    }
    return { kwalifikacja, sprzedaz, available: true };
  } catch {
    return { kwalifikacja: 0, sprzedaz: 0, available: false };
  }
}

function extractDate(prop: PageObjectResponse["properties"][string] | undefined): string | null {
  if (prop?.type === "date") return prop.date?.start?.slice(0, 10) ?? null;
  return null;
}

function extractSelect(prop: PageObjectResponse["properties"][string] | undefined): string | null {
  if (prop?.type === "select") return prop.select?.name ?? null;
  return null;
}

function extractNumber(prop: PageObjectResponse["properties"][string] | undefined): number {
  if (prop?.type === "number") return prop.number ?? 0;
  return 0;
}

function isInRange(dateStr: string | null, from: string, to: string): boolean {
  if (!dateStr) return false;
  return dateStr >= from && dateStr <= to;
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const defaults = defaultRange();
    const from = searchParams.get("from") || defaults.from;
    const to = searchParams.get("to") || defaults.to;
    const todayISO = new Date().toISOString().slice(0, 10);

    const pages: PageObjectResponse[] = [];
    let cursor: string | undefined;
    do {
      const response = await notion.dataSources.query({
        data_source_id: PIPELINE_DATA_SOURCE_ID,
        page_size: 100,
        start_cursor: cursor,
      });
      pages.push(...response.results.filter((p): p is PageObjectResponse => p.object === "page"));
      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);

    let nowe_leady = 0;
    let discovery_umowione = 0;
    let discovery_odbyte = 0;
    let no_show = 0;
    let sprzedaze = 0;
    let wartosc_sprzedazy_pln = 0;
    let niekwalifikowani = 0;

    for (const page of pages) {
      const props = page.properties;
      const dataPierwszegoKontaktu = extractDate(props["Data pierwszego kontaktu"]);
      const dataDiscovery = extractDate(props["Data discovery"]);
      const wynikDiscovery = extractSelect(props["Wynik Discovery"]);
      const status = extractSelect(props["Status"]);
      const dataZamkniecia = extractDate(props["Data zamknięcia"]);

      if (isInRange(dataPierwszegoKontaktu, from, to)) {
        nowe_leady += 1;
        if (status === "Niekwalifikowany") niekwalifikowani += 1;
      }

      if (isInRange(dataDiscovery, from, to)) {
        discovery_umowione += 1;
        // A6 (2026-07-18): "NO-SHOW" to teraz realna wartość zapisywana przyciskiem w
        // /sprzedaz (PATCH pipeline-update, pole "Wynik Discovery"), nie tylko szacunek.
        // Heurystyka (pole puste + data w przeszłości) zostaje jako fallback wyłącznie dla
        // starszych kart sprzed wprowadzenia przycisku — bez tego historyczne no-show
        // zniknęłyby z raportu.
        if (wynikDiscovery === "NO-SHOW") {
          no_show += 1;
        } else if (wynikDiscovery != null) {
          discovery_odbyte += 1;
        } else if (dataDiscovery! < todayISO) {
          no_show += 1;
        }
      }

      if (status && SPRZEDAZ_STATUSES.includes(status) && isInRange(dataZamkniecia, from, to)) {
        sprzedaze += 1;
        wartosc_sprzedazy_pln +=
          extractNumber(props["Cena wdrożenia"]) + extractNumber(props["Retainer PLN/mc"]);
      }
    }

    const show_rate = discovery_umowione > 0 ? (discovery_odbyte / discovery_umowione) * 100 : 0;

    const [dailyTotals, recordings] = await Promise.all([
      getDailyStatsRangeTotals(from, to),
      countUnprocessedRecordings(),
    ]);

    const payload: StatsResponse = {
      from,
      to,
      dials: dailyTotals.dials,
      rozmowy_kwalifikacja: dailyTotals.rozmowy_kwalifikacja,
      rozmowy_sprzedaz: dailyTotals.rozmowy_sprzedaz,
      sms: dailyTotals.sms,
      nowe_leady,
      discovery_umowione,
      discovery_odbyte,
      no_show,
      show_rate,
      sprzedaze,
      wartosc_sprzedazy_pln,
      niekwalifikowani,
      odbyte_nieprzetworzone_kwalifikacja: recordings.kwalifikacja,
      odbyte_nieprzetworzone_sprzedaz: recordings.sprzedaz,
      nagrania_dostepne: recordings.available,
    };

    return NextResponse.json({ success: true, stats: payload });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Błąd pobierania statystyk",
      },
      { status: 500 },
    );
  }
}
