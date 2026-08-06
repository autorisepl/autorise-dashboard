import type { FinanceEntry } from "@/lib/notion/finance";

// Paleta kategoryczna — stałe przypisanie koloru do nazwy kategorii (nie do pozycji w
// tablicy), żeby kolor danej kategorii się nie zmieniał między odświeżeniami czy okresami.
const PALETTE = [
  "#0a84ff",
  "#ff9500",
  "#34c759",
  "#ff3b30",
  "#bf5af2",
  "#64d2ff",
  "#ff6961",
  "#ffb340",
  "#ac8e68",
  "#6e6e73",
];

const colorCache = new Map<string, string>();

export function colorForCategory(name: string): string {
  const cached = colorCache.get(name);
  if (cached) return cached;
  const color = PALETTE[colorCache.size % PALETTE.length];
  colorCache.set(name, color);
  return color;
}

export interface MonthRange {
  start: Date;
  end: Date;
  label: string;
}

const PL_MONTHS_NOM = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

export function monthRange(offset: number): MonthRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { start, end, label: `${PL_MONTHS_NOM[start.getMonth()]} ${start.getFullYear()}` };
}

export function isWithinRange(dateStr: string, range: MonthRange): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return d >= range.start && d <= range.end;
}

export interface CategoryTotal {
  name: string;
  value: number;
  color: string;
}

/** Suma kwot per kategoria. Wpis z wieloma kategoriami dolicza pełną kwotę do KAŻDEJ z nich
 * (tagowanie, nie podział) — suma słupków może więc przekraczać sumę wpisów, to świadome i
 * pokazane w UI, nie ukryty błąd zaokrągleń. */
export function categoryTotals(entries: FinanceEntry[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    const cats = e.kategoria.length > 0 ? e.kategoria : ["Bez kategorii"];
    for (const cat of cats) {
      totals.set(cat, (totals.get(cat) ?? 0) + e.kwota);
    }
  }
  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value, color: colorForCategory(name) }))
    .sort((a, b) => b.value - a.value);
}

export function sumKwota(entries: FinanceEntry[]): number {
  return entries.reduce((acc, e) => acc + e.kwota, 0);
}

export function formatPLN(n: number): string {
  return `${n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} zł`;
}
