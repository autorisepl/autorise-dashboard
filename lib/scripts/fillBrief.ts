import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { findCannedObjectionAnswer } from "@/lib/scripts/objectionAnswers";

function formatPln(value: number): string {
  return `${Math.round(value).toLocaleString("pl-PL")} PLN`;
}

export function fillBrief(text: string, client: PipelineClientDetailed): string {
  if (!text) return text;
  let out = text;
  out = out.replace(/\[nazwa\]/gi, client.firma || "firma klienta");
  out = out.replace(
    /\[X\]\s*pojazd(?:ów|y|u)?/gi,
    client.flota ? `${client.flota} pojazdów` : "[flota nieznana]",
  );
  out = out.replace(/\[TMS\]/gi, client.tms || "system klienta");
  out = out.replace(/\[imię\]/gi, client.kontakt?.split(" ")[0] || client.firma || "klient");
  out = out.replace(
    /\[kwota roczna\]|\[koszt roczny\]/gi,
    client.kosztRoczny
      ? `${formatPln(client.kosztRoczny)}/rok`
      : "kwota do wyliczenia z kalkulatora",
  );
  out = out.replace(
    /\[X\]/gi,
    client.flota
      ? `${client.flota}`
      : client.godzinyWpisywania
        ? `${client.godzinyWpisywania}`
        : "___",
  );
  return out;
}

// Agent 02 czasem zostawia niewypełnione placeholdery ([powód z rozmowy]) albo fragmenty
// własnej instrukcji jako gotowy tekst pitchu — fillBrief() zna tylko kilka wzorców, więc
// każdy nawias kwadratowy który przetrwa fillBrief() jest sygnałem realnego braku danych,
// nie stylistyki. Setter nie może przeczytać takiego tekstu na żywo klientowi.
// UWAGA: nie używać jednego globalnego /g regexu do wielu wywołań .test() — .test() na
// regexie z flagą "g" mutuje lastIndex między wywołaniami i przy współdzielonej stałej
// modułowej zwraca losowo false dla realnych trafień (klasyczna pułapka JS, złapana dopiero
// na żywym zrzucie ekranu: "[DANE]" w tekście, zero blokady i zero cichego oznaczenia).
export function hasUnfilledPlaceholders(filledText: string): boolean {
  if (!filledText) return false;
  return /\[[^\]]*\]/.test(filledText);
}

const POLISH_MONTHS: Record<string, number> = {
  stycznia: 0,
  styczeń: 0,
  lutego: 1,
  luty: 1,
  marca: 2,
  marzec: 2,
  kwietnia: 3,
  kwiecień: 3,
  maja: 4,
  maj: 4,
  czerwca: 5,
  czerwiec: 5,
  lipca: 6,
  lipiec: 6,
  sierpnia: 7,
  sierpień: 7,
  września: 8,
  wrzesień: 8,
  października: 9,
  październik: 9,
  listopada: 10,
  listopad: 10,
  grudnia: 11,
  grudzień: 11,
};

// Wersja bezpieczna do użycia w komponencie klienckim (odpowiednik anyDateToISO w
// lib/notion/client.ts, którego nie można zaimportować po stronie klienta — instancjonuje
// Notion SDK z sekretem środowiskowym). Zwraca Date albo null jeśli format nierozpoznany.
function parseDiscoveryDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dot = s.match(/^(\d{1,2})\.(\d{2})\.(\d{4})/);
  if (dot) return new Date(Number(dot[3]), Number(dot[2]) - 1, Number(dot[1]));
  const pl = s.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i);
  if (pl) {
    const month = POLISH_MONTHS[pl[2].toLowerCase()];
    if (month !== undefined) return new Date(Number(pl[3]), month, Number(pl[1]));
  }
  return null;
}

// Blokada briefu ma sens tylko przed spotkaniem które jeszcze się nie odbyło — jeśli data
// dyskusji już minęła, przygotować się i tak się nie da, więc UI ma pokazać ciche oznaczenie
// zamiast bannera blokującego widok (patrz BriefField w /sprzedaz). Brak/niesparsowana data
// domyślnie liczy się jako nadchodząca — bezpieczniej ostrzec niż przeoczyć.
export function isUpcomingMeeting(dataDiscovery: string | null | undefined): boolean {
  const date = parseDiscoveryDate(dataDiscovery);
  if (!date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

export interface CytatKlienta {
  cytat: string;
  kontekst: string;
}

export function parseCytatyKlienta(raw: string): CytatKlienta[] {
  if (!raw?.trim()) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [cytat, kontekst = ""] = line.split("|||");
      return { cytat: cytat.trim(), kontekst: kontekst.trim() };
    })
    .filter((c) => c.cytat);
}

export interface PrzewidywanaObiekcja {
  objekcja: string;
  odpowiedz: string;
}

// Ten sam format "|||" per linia co parseCytatyKlienta wyżej — jedno pole Notion (rich_text)
// trzyma tekst obiekcji i gotową odpowiedź razem. Gdy agent nie dostarczył `odpowiedz` (patrz
// realny bug opisany w objectionAnswers.ts), doklejamy odpowiedź z biblioteki gotowych
// wzorców zamiast pokazywać puste pole pod obiekcją.
export function parsePrzewidywaneObiekcje(raw: string): PrzewidywanaObiekcja[] {
  if (!raw?.trim()) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [objekcja, odpowiedzRaw = ""] = line.split("|||");
      const trimmedObjekcja = objekcja.trim();
      const odpowiedz = odpowiedzRaw.trim() || findCannedObjectionAnswer(trimmedObjekcja) || "";
      return { objekcja: trimmedObjekcja, odpowiedz };
    })
    .filter((o) => o.objekcja);
}

export function serializePrzewidywaneObiekcje(items: PrzewidywanaObiekcja[]): string {
  return items
    .filter((o) => o.objekcja.trim())
    .map((o) => (o.odpowiedz.trim() ? `${o.objekcja.trim()}|||${o.odpowiedz.trim()}` : o.objekcja.trim()))
    .join("\n");
}
