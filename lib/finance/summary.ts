import type { FinanceEntry, RenewalInterval } from "@/lib/notion/finance";

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

// ── Subskrypcje ──────────────────────────────────────────────────────────────────────────
// Współczynnik przeliczający kwotę cyklu na miesięczny odpowiednik (MRR-style normalizacja),
// żeby subskrypcje tygodniowe/kwartalne/roczne były porównywalne na jednym wykresie/liczniku.
const MONTHLY_FACTOR: Record<RenewalInterval, number> = {
  Tydzień: 52 / 12,
  Miesiąc: 1,
  Kwartał: 1 / 3,
  Rok: 1 / 12,
};

export function monthlyEquivalent(kwota: number, interval: RenewalInterval): number {
  return kwota * MONTHLY_FACTOR[interval];
}

// Najbliższy termin odnowienia licząc od `data` (dzień pierwszego/ostatniego znanego
// odnowienia) — dolicza pełne cykle aż wynik wypadnie w przyszłości względem `from`. Miesiąc/
// kwartał/rok liczone przez przesunięcie miesięcy (nie *30 dni), żeby "co miesiąc od 15." zawsze
// trafiało na 15., a nie dryfowało w miarę różnej długości miesięcy.
export function nextRenewalDate(
  dataIso: string,
  interval: RenewalInterval,
  from: Date = new Date(),
): Date | null {
  const start = new Date(dataIso);
  if (Number.isNaN(start.getTime())) return null;
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  if (interval === "Tydzień") {
    let d = start;
    if (d >= fromDay) return d;
    const weeksBehind = Math.ceil((fromDay.getTime() - d.getTime()) / (7 * 86_400_000));
    d = new Date(d.getTime() + weeksBehind * 7 * 86_400_000);
    return d;
  }

  const stepMonths = interval === "Miesiąc" ? 1 : interval === "Kwartał" ? 3 : 12;
  let d = start;
  let guard = 0;
  while (d < fromDay && guard < 2400) {
    d = new Date(d.getFullYear(), d.getMonth() + stepMonths, d.getDate());
    guard++;
  }
  return d;
}

export function daysUntil(target: Date, from: Date = new Date()): number {
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetDay.getTime() - fromDay.getTime()) / 86_400_000);
}

export interface SubscriptionGroupStats {
  countExpense: number;
  countIncome: number;
  monthlyExpenseTotal: number;
  monthlyIncomeTotal: number;
  nextRenewal: { nazwa: string; date: Date; daysUntil: number } | null;
}

export interface SubscriptionsStats {
  // Subskrypcje osobiste (Netflix, Claude Code itp.).
  personal: SubscriptionGroupStats;
  // Retainer klienta Autorise — stały, cykliczny przychód od klienta na wdrożeniu/utrzymaniu.
  // Mechanicznie to samo co subskrypcja (kwota + cykl), ale semantycznie inna rzecz, więc
  // liczone i pokazywane osobno zamiast miksowane w jedną sumę.
  retainer: SubscriptionGroupStats;
}

function emptyGroupStats(): SubscriptionGroupStats {
  return {
    countExpense: 0,
    countIncome: 0,
    monthlyExpenseTotal: 0,
    monthlyIncomeTotal: 0,
    nextRenewal: null,
  };
}

/** Podsumowanie subskrypcji/retainerów na bardzo wysokim poziomie — liczniki + miesięczny
 * odpowiednik kosztu/przychodu + najbliższe odnowienie, osobno dla subskrypcji osobistych i
 * retainerów klientów. Liczone ze WSZYSTKICH wpisów (nie tylko bieżący miesiąc) — to stan
 * trwały, nie zdarzenie jednego okresu. Wpisy z nieznaną datą (`data: ""`) liczą się do sum
 * kwotowych, ale nie mają jak wyznaczyć najbliższego odnowienia. */
export function subscriptionsStats(entries: FinanceEntry[]): SubscriptionsStats {
  const personal = emptyGroupStats();
  const retainer = emptyGroupStats();
  const subs = entries.filter((e) => e.subskrypcja && e.cyklOdnawiania);

  for (const e of subs) {
    const group = e.rodzajCyklu === "Retainer klienta" ? retainer : personal;
    const interval = e.cyklOdnawiania as RenewalInterval;
    const monthly = monthlyEquivalent(e.kwota, interval);
    if (e.typ === "Wydatek") {
      group.monthlyExpenseTotal += monthly;
      group.countExpense++;
    } else if (e.typ === "Przychód") {
      group.monthlyIncomeTotal += monthly;
      group.countIncome++;
    }

    if (!e.data) continue;
    const renewal = nextRenewalDate(e.data, interval);
    if (renewal) {
      const days = daysUntil(renewal);
      if (!group.nextRenewal || days < group.nextRenewal.daysUntil) {
        group.nextRenewal = { nazwa: e.nazwa, date: renewal, daysUntil: days };
      }
    }
  }

  return { personal, retainer };
}
