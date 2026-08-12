import type { CalendarEvent } from "@/app/api/google/calendar/route";
import type { GoogleTask } from "@/app/api/google/tasks/route";

export type Priority = "wysoki" | "sredni" | "niski";
export const PRIORITY_LEVELS: Priority[] = ["wysoki", "sredni", "niski"];
export const PRIORITY_LABEL: Record<Priority, string> = {
  wysoki: "Wysoki",
  sredni: "Średni",
  niski: "Niski",
};
export const PRIORITY_STYLE: Record<Priority, { bg: string; border: string; color: string }> = {
  wysoki: { bg: "var(--error-bg)", border: "var(--error-border)", color: "var(--error-text)" },
  sredni: {
    bg: "var(--warning-bg)",
    border: "var(--warning-border)",
    color: "var(--warning-text)",
  },
  niski: { bg: "var(--bg-hover)", border: "var(--border)", color: "var(--text-secondary)" },
};

export type DueStatus = "overdue" | "today" | "week" | "future";

// Wspólny wizualny język statusów terminu, używany w całym /planowanie.
export const DUE_STYLES: Record<DueStatus, { bg: string; border: string; color: string }> = {
  overdue: {
    bg: "rgba(255,69,58,0.13)",
    border: "rgba(255,69,58,0.35)",
    color: "var(--error-text)",
  },
  today: {
    bg: "rgba(255,159,10,0.13)",
    border: "rgba(255,159,10,0.40)",
    color: "var(--warning-text)",
  },
  week: {
    bg: "rgba(48,209,88,0.11)",
    border: "rgba(48,209,88,0.30)",
    color: "var(--success-text)",
  },
  // rgba(0,0,0,...) było reliktem jasnego motywu sprzed redesignu 2026-08-05 — czarne
  // wypełnienie na ciemnym tle jest praktycznie niewidoczne, więc chip "future" wyglądał jakby
  // nie miał tła wcale. Poprawione na ten sam wzorzec co pozostałe statusy (biały nad ciemnym).
  future: {
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.14)",
    color: "var(--text-secondary)",
  },
};

export interface TaskWithList {
  task: GoogleTask;
  listId: string;
  listTitle: string;
}

// Kształt patcha wysyłanego do PATCH /api/google/tasks. `due` różni się celowo od
// GoogleTask.due (który po odczycie z API jest pełnym ISO): przy zapisie serwer oczekuje
// krótkiej daty "yyyy-mm-dd" (patrz komentarz w app/api/google/tasks/route.ts), a `null`
// jawnie czyści termin (zadanie wraca do Nieprzypisanych) — czego zwykłe `undefined` w JSON
// nie potrafi wyrazić, bo JSON.stringify po prostu pomija klucze z wartością undefined.
export type TaskPatch = Partial<Omit<GoogleTask, "due">> & { due?: string | null };

// ── Powtarzalność, współdzielona między zadaniami (tag w notes) i wydarzeniami (RRULE) ────
// Google Tasks API nie ma pola powtarzalności w ogóle (w przeciwieństwie do Google Calendar,
// które ma pełne RRULE) — więc dla zadań powtarzalność jest tagiem w notes, tym samym
// mechanizmem co priorytet/godziny niżej. To NIE jest przechowywanie lokalne: tag jest
// zapisany wewnątrz prawdziwego pola notes realnego zadania Google przez Tasks API, więc
// przetrwa niezależnie od przeglądarki/urządzenia, dokładnie jak priorytet. Silnik, który
// faktycznie tworzy kolejne wystąpienie po ukończeniu (bo Google Tasks nie robi tego sam),
// żyje w page.tsx (toggleDone) — patrz advanceRecurrenceDate niżej.
export type RecurrenceInterval = "codziennie" | "tydzien" | "miesiac" | "rok";
export const RECURRENCE_LEVELS: RecurrenceInterval[] = ["codziennie", "tydzien", "miesiac", "rok"];
export const RECURRENCE_LABEL: Record<RecurrenceInterval, string> = {
  codziennie: "Codziennie",
  tydzien: "Co tydzień",
  miesiac: "Co miesiąc",
  rok: "Co rok",
};

export function recurrenceToRRule(r: RecurrenceInterval): string {
  const freq =
    r === "codziennie"
      ? "DAILY"
      : r === "tydzien"
        ? "WEEKLY"
        : r === "miesiac"
          ? "MONTHLY"
          : "YEARLY";
  return `RRULE:FREQ=${freq}`;
}

// Przesunięcie daty o jeden cykl — używane po ukończeniu zadania powtarzalnego, żeby wyliczyć
// termin następnego wystąpienia. Miesiąc/rok liczone przez przesunięcie miesięcy/lat (nie
// ×30/×365 dni), żeby dzień miesiąca nie dryfował.
export function advanceRecurrenceDate(dueIso: string, recurrence: RecurrenceInterval): string {
  const d = new Date(dueIso);
  if (recurrence === "codziennie") d.setDate(d.getDate() + 1);
  else if (recurrence === "tydzien") d.setDate(d.getDate() + 7);
  else if (recurrence === "miesiac") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ── Priorytet, zakres godzin i powtarzalność trwałe w polu notes zadania (Google Tasks nie ma
// osobnych pól na żadne z nich) ───────────────────────────────────────────────────────────
const PRIORITY_TAG_RE = /\[priorytet:(wysoki|sredni|niski)\]\s*/;
const TIME_RANGE_TAG_RE = /\[godz:(\d{2}:\d{2})-(\d{2}:\d{2})\]\s*/;
const RECURRENCE_TAG_RE = /\[powtarzaj:(codziennie|tydzien|miesiac|rok)\]\s*/;

export interface TaskTimeRange {
  start: string; // HH:MM
  end: string; // HH:MM
}

export function parsePriorityFromNotes(notes: string | undefined): Priority | null {
  if (!notes) return null;
  const m = notes.match(PRIORITY_TAG_RE);
  return m ? (m[1] as Priority) : null;
}

export function parseTimeRangeFromNotes(notes: string | undefined): TaskTimeRange | null {
  if (!notes) return null;
  const m = notes.match(TIME_RANGE_TAG_RE);
  return m ? { start: m[1], end: m[2] } : null;
}

export function parseRecurrenceFromNotes(notes: string | undefined): RecurrenceInterval | null {
  if (!notes) return null;
  const m = notes.match(RECURRENCE_TAG_RE);
  return m ? (m[1] as RecurrenceInterval) : null;
}

// Tekst notatki bez żadnego znacznika metadanych (priorytet/godziny/powtarzalność), to co
// realnie widzi i edytuje użytkownik w polu notatki.
export function stripMetaTags(notes: string | undefined): string {
  if (!notes) return "";
  return notes
    .replace(PRIORITY_TAG_RE, "")
    .replace(TIME_RANGE_TAG_RE, "")
    .replace(RECURRENCE_TAG_RE, "")
    .trim();
}

// Kolejność tagów jest zawsze wymuszona (priorytet, potem godziny, potem powtarzalność, potem
// tekst) niezależnie od tego, który z nich został ustawiony jako ostatni — inaczej niezależne
// settery nadpisywałyby się nawzajem pozycją w stringu.
function buildNotes(
  priority: Priority | null,
  time: TaskTimeRange | null,
  recurrence: RecurrenceInterval | null,
  text: string,
): string {
  const tags: string[] = [];
  if (priority) tags.push(`[priorytet:${priority}]`);
  if (time) tags.push(`[godz:${time.start}-${time.end}]`);
  if (recurrence) tags.push(`[powtarzaj:${recurrence}]`);
  const tagStr = tags.join(" ");
  if (!tagStr) return text;
  return text ? `${tagStr} ${text}` : tagStr;
}

export function setPriorityInNotes(notes: string | undefined, priority: Priority | null): string {
  return buildNotes(
    priority,
    parseTimeRangeFromNotes(notes),
    parseRecurrenceFromNotes(notes),
    stripMetaTags(notes),
  );
}

export function setTimeRangeInNotes(notes: string | undefined, time: TaskTimeRange | null): string {
  return buildNotes(
    parsePriorityFromNotes(notes),
    time,
    parseRecurrenceFromNotes(notes),
    stripMetaTags(notes),
  );
}

// Edycja treści notatki widocznej użytkownikowi, zachowuje tagi priorytetu/godzin/powtarzalności.
export function updateNotesText(notes: string | undefined, newText: string): string {
  return buildNotes(
    parsePriorityFromNotes(notes),
    parseTimeRangeFromNotes(notes),
    parseRecurrenceFromNotes(notes),
    newText.trim(),
  );
}

// Złożenie notes z czterech pól naraz — używane przez TaskEditor (popover edycji), który
// zapisuje priorytet/godziny/powtarzalność/tekst jedną operacją zamiast kolejnych setterów
// nadpisujących się nawzajem.
export function composeTaskNotes(
  priority: Priority | null,
  time: TaskTimeRange | null,
  recurrence: RecurrenceInterval | null,
  text: string,
): string {
  return buildNotes(priority, time, recurrence, text.trim());
}

// Typ MIME niestandardowy dla przeciąganego zadania/wydarzenia — czytelny przez
// dataTransfer.types już w onDragOver, więc drop-strefa dnia rozpoznaje typ przeciąganego
// elementu bez czytania danych.
export const DRAG_TYPE_TASK = "application/x-autorise-task";
export const DRAG_TYPE_EVENT = "application/x-autorise-event";

export interface DragPayload {
  taskId: string;
}

export interface EventDragPayload {
  eventId: string;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Nd
  const diff = day === 0 ? -6 : 1 - day; // poniedziałek tego tygodnia
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function taskDateKey(due: string | undefined): string | null {
  if (!due) return null;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return null;
  return localDateKey(d);
}

export function eventDateKey(ev: CalendarEvent): string | null {
  const iso = ev.start.dateTime ?? ev.start.date;
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return localDateKey(d);
}

// Sortowanie chronologiczne: wydarzenia całodniowe najpierw (godzina 00:00), potem po realnej
// godzinie startu. Google Calendar zwraca events.list z orderBy "startTime" tylko w obrębie
// zapytania — po scaleniu z wielu dni/odświeżeń kolejność trzeba wymusić jawnie w UI.
export function sortEventsChronologically(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const aTime = new Date(a.start.dateTime ?? a.start.date ?? 0).getTime();
    const bTime = new Date(b.start.dateTime ?? b.start.date ?? 0).getTime();
    return aTime - bTime;
  });
}

// Zadania (Tasks API) mają wyłącznie datę w polu due, bez godziny — sortowanie chronologiczne
// więc jest ograniczone do porządku deterministycznego (termin, potem tytuł), zamiast surowej
// kolejności pobrania z API.
export function sortTasksChronologically(tasks: TaskWithList[]): TaskWithList[] {
  return [...tasks].sort((a, b) => {
    const aTime = a.task.due ? new Date(a.task.due).getTime() : 0;
    const bTime = b.task.due ? new Date(b.task.due).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;
    return a.task.title.localeCompare(b.task.title, "pl");
  });
}

export function formatDayHeader(d: Date): string {
  const s = d.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const startFmt = monday.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: sameMonth ? undefined : "long",
  });
  const endFmt = sunday.toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
  return `${startFmt}–${endFmt} ${sunday.getFullYear()}`;
}

function dayWord(n: number): string {
  return n === 1 ? "dzień" : "dni";
}

export function todayDateInputValue(): string {
  const d = new Date();
  return localDateKey(d);
}

export function dueToInputValue(due?: string): string {
  if (!due) return todayDateInputValue();
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return todayDateInputValue();
  return localDateKey(d);
}

export function formatDue(iso: string | undefined): { label: string; status: DueStatus } | null {
  if (!iso) return null;
  const due = new Date(iso);
  const now = new Date();
  const dueLocal = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueLocal.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return { label: `spóźnione o ${days} ${dayWord(days)}`, status: "overdue" };
  }
  if (diffDays === 0) return { label: "dziś", status: "today" };
  if (diffDays === 1) return { label: "jutro", status: "week" };
  return { label: `za ${diffDays} dni`, status: diffDays <= 7 ? "week" : "future" };
}

// Realna precyzja godzinowa: wydarzenia kalendarza mają dateTime, zadania (Tasks API) nie.
// Powyżej 24h etykieta łączy dni i godziny razem ("za 1 dzień 4 godz."), zamiast surowej
// liczby godzin, żeby nie pokazywać np. "za 30 godz." dla czegoś za ponad dobę.
//
// Wydarzenia przeszłe bez potwierdzenia NIE są opisywane jako "zakończone" (to sugerowałoby,
// że się odbyły) — neutralna etykieta "minęło" dopóki ktoś ręcznie nie potwierdzi
// attendanceStatus (przez GoogleCalendar extendedProperties.private, patrz CalendarEvent).
export function relativeEventLabel(
  event: CalendarEvent,
  now: Date,
): { label: string; status: DueStatus } {
  if (event.allDay) return { label: "cały dzień", status: "today" };
  const start = event.start.dateTime ? new Date(event.start.dateTime) : null;
  const end = event.end.dateTime ? new Date(event.end.dateTime) : null;
  if (!start) return { label: "", status: "today" };

  if (end && now >= start && now <= end) return { label: "w trakcie", status: "today" };

  if (end && now > end) {
    const minAgo = Math.round((now.getTime() - end.getTime()) / 60_000);
    const ago =
      minAgo < 60
        ? `${minAgo} min temu`
        : minAgo < 1440
          ? `${Math.round(minAgo / 60)} godz. temu`
          : `${Math.floor(minAgo / 1440)} ${dayWord(Math.floor(minAgo / 1440))} temu`;

    if (event.attendanceStatus === "odbyto") {
      return { label: `odbyto, zakończone ${ago}`, status: "week" };
    }
    if (event.attendanceStatus === "nieodbyto") {
      return { label: `nie odbyto, ${ago}`, status: "overdue" };
    }
    return { label: `minęło, ${ago}`, status: "future" };
  }

  const diffMin = Math.round((start.getTime() - now.getTime()) / 60_000);
  if (diffMin <= 0) return { label: "zaczyna się teraz", status: "today" };
  if (diffMin < 60) return { label: `za ${diffMin} min`, status: "today" };
  if (diffMin < 1440) {
    const diffH = Math.round(diffMin / 60);
    return { label: `za ${diffH} godz.`, status: "week" };
  }
  const days = Math.floor(diffMin / 1440);
  const remHours = Math.round((diffMin % 1440) / 60);
  const label =
    remHours > 0 ? `za ${days} ${dayWord(days)} ${remHours} godz.` : `za ${days} ${dayWord(days)}`;
  return { label, status: "future" };
}

export function formatEventTime(e: CalendarEvent): string {
  if (e.allDay) return "Cały dzień";
  const start = e.start.dateTime ? new Date(e.start.dateTime) : null;
  const end = e.end.dateTime ? new Date(e.end.dateTime) : null;
  const fmt = (d: Date) => d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (start && end) return `${fmt(start)}–${fmt(end)}`;
  if (start) return fmt(start);
  return "";
}

export function timeToInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function combineDateAndTime(dateIso: string, hhmm: string): string {
  const base = new Date(dateIso);
  const [h, m] = hhmm.split(":").map(Number);
  base.setHours(h || 0, m || 0, 0, 0);
  return base.toISOString();
}

// ── Oś czasu dnia ────────────────────────────────────────────────────────────────────────
// Domyślny widoczny zakres 6:00-23:00 (nie pełna doba — 70% doby jest zwykle pusta, robiąc
// bloki drobne i nieczytelne). Jeśli w danym dniu istnieje wydarzenie/zadanie poza zakresem,
// kolumna tego dnia sama się rozszerza (computeAxisRange), ale skala pikseli na godzinę
// (PX_PER_HOUR) jest tym samym stałym stałym dla wszystkich kolumn, więc wysokości bloków
// zostają porównywalne między dniami.

export function timeStrToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Dodanie minut do godziny HH:MM z zawinięciem przez północ (w przeciwieństwie do
// minutesToTimeStr, który świadomie ucina do 23:59) — używane przez szybki wybór czasu
// trwania (15/30/60 min itd.), gdzie "18:30 + 3h" ma dać "21:30", a "23:30 + 90 min" ma
// poprawnie zawinąć na "01:00" następnego dnia, nie utknąć na 23:59.
export function addMinutesWrapped(time: string, minutes: number): string {
  const total =
    (((timeStrToMinutes(time) + minutes) % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

// Szybki wybór czasu trwania w edytorach zadania/wydarzenia — zamiast ręcznie liczyć godzinę
// końca, ustawia ją wprost od godziny startu (addMinutesWrapped wyżej).
export const DURATION_PRESETS_MIN = [15, 30, 45, 60, 90, 120, 180];
export function formatDurationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return Number.isInteger(h) ? `${h} godz.` : `${h.toFixed(1)} godz.`;
}

export function minutesToTimeStr(min: number): string {
  // Górny limit MINUTES_IN_DAY - 1 (23:59), nie MINUTES_IN_DAY (24:00) — "24:00" nie jest
  // poprawną wartością dla <input type="time">, więc drop/resize kończący się dokładnie o
  // północy musi ściąć się do 23:59, nie wygenerować niewczytywalny string.
  const clamped = Math.max(0, Math.min(Math.round(min), MINUTES_IN_DAY - 1));
  return `${pad2(Math.floor(clamped / 60))}:${pad2(clamped % 60)}`;
}

export const MINUTES_IN_DAY = 24 * 60;
// Podniesione z 26 — przy starej skali 30-60 min bloki miały 13-26px wysokości, za mało żeby
// zmieścić tytuł + godziny + checkbox czytelnie (zgłoszone jako "wydarzenia nie pokazują się
// całe"/nieczytelne). 40px/h daje typowemu 30 min blokowi 20px, godzinnemu 40px.
export const PX_PER_HOUR = 40;
// Wysokość sticky Rzędu 1 (nawigacja tygodnia) w page.tsx — nagłówki kolumn dnia (Rząd
// 2/3) sticky'ują się tuż pod nim, więc obie wartości muszą się zgadzać.
export const STICKY_ROW1_HEIGHT = 44;
export const DEFAULT_AXIS_START_MIN = 6 * 60;
export const DEFAULT_AXIS_END_MIN = 23 * 60;
export const MIN_BLOCK_DURATION_MIN = 15;

export interface AxisRange {
  startMin: number;
  endMin: number;
}

// Zakres osi dnia: domyślnie 6-23, rozszerzany (do pełnej godziny) o każdy blok, który
// wykracza poza domyślny zakres, tak żeby żadne wydarzenie/zadanie nigdy nie było ucięte.
export function computeAxisRange(items: { startMin: number; endMin: number }[]): AxisRange {
  let startMin = DEFAULT_AXIS_START_MIN;
  let endMin = DEFAULT_AXIS_END_MIN;
  for (const item of items) {
    if (item.startMin < startMin) startMin = Math.max(0, Math.floor(item.startMin / 60) * 60);
    if (item.endMin > endMin) endMin = Math.min(MINUTES_IN_DAY, Math.ceil(item.endMin / 60) * 60);
  }
  return { startMin, endMin };
}

export function minutesToAxisPx(min: number, range: AxisRange): number {
  return ((min - range.startMin) / 60) * PX_PER_HOUR;
}

export function axisRangeHeightPx(range: AxisRange): number {
  return ((range.endMin - range.startMin) / 60) * PX_PER_HOUR;
}

// Konwersja offsetu Y (px od góry osi) na minuty od północy, zaokrąglone do 15 minut —
// używane przy przeciąganiu karty na oś i przy zmianie czasu trwania uchwytem.
export function axisPxToMinutes(offsetPx: number, range: AxisRange): number {
  const rawMin = range.startMin + (offsetPx / PX_PER_HOUR) * 60;
  const snapped = Math.round(rawMin / MIN_BLOCK_DURATION_MIN) * MIN_BLOCK_DURATION_MIN;
  return Math.max(0, Math.min(MINUTES_IN_DAY, snapped));
}

export interface TimeBlockLayout {
  id: string;
  startMin: number;
  endMin: number;
}

// ── Statystyki tygodnia (pasek nad siatką dni) ──────────────────────────────────────────
export interface WeekCompletionStats {
  done: number;
  total: number;
  percent: number;
}

// Wykonane vs zaplanowane w bieżącym tygodniu: zadania liczone niezależnie od statusu
// (allActive w page.tsx odfiltrowuje ukończone, więc tu trzeba wejść bezpośrednio przez
// lists/tasksByList, żeby ukończone też się wliczały do mianownika).
export function weekCompletionStats(
  lists: { id: string; title: string }[],
  tasksByList: Record<string, GoogleTask[]>,
  events: CalendarEvent[],
  weekDays: Date[],
): WeekCompletionStats {
  const weekKeys = new Set(weekDays.map(localDateKey));
  let done = 0;
  let total = 0;
  for (const list of lists) {
    for (const t of tasksByList[list.id] ?? []) {
      const k = taskDateKey(t.due);
      if (!k || !weekKeys.has(k)) continue;
      total++;
      if (t.status === "completed") done++;
    }
  }
  for (const ev of events) {
    const k = eventDateKey(ev);
    if (!k || !weekKeys.has(k)) continue;
    total++;
    if (ev.attendanceStatus === "odbyto") done++;
  }
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

export interface RecurringTaskStat {
  title: string;
  daysCount: number;
}

// Zadania powtarzalne: ten sam (znormalizowany) tytuł na >=2 różnych dniach tego tygodnia,
// np. "Deep Work" codziennie rano. Regularność liczona z obecności terminu w danym dniu,
// niezależnie od tego czy zadanie zostało odhaczone — to wskaźnik trzymania się rytmu, nie
// wskaźnik ukończenia.
export function detectRecurringTasks(
  lists: { id: string; title: string }[],
  tasksByList: Record<string, GoogleTask[]>,
  weekDays: Date[],
  limit = 3,
): RecurringTaskStat[] {
  const weekKeys = new Set(weekDays.map(localDateKey));
  const daysByTitle = new Map<string, Set<string>>();
  const displayTitle = new Map<string, string>();
  for (const list of lists) {
    for (const t of tasksByList[list.id] ?? []) {
      const k = taskDateKey(t.due);
      if (!k || !weekKeys.has(k)) continue;
      const norm = t.title.trim().toLowerCase();
      if (!norm) continue;
      if (!daysByTitle.has(norm)) {
        daysByTitle.set(norm, new Set());
        displayTitle.set(norm, t.title.trim());
      }
      daysByTitle.get(norm)?.add(k);
    }
  }
  const title = (norm: string) => displayTitle.get(norm) ?? norm;
  return Array.from(daysByTitle.entries())
    .filter(([, days]) => days.size >= 2)
    .map(([norm, days]) => ({ title: title(norm), daysCount: days.size }))
    .sort((a, b) => b.daysCount - a.daysCount)
    .slice(0, limit);
}

// Pakowanie nachodzących na siebie bloków (wydarzenia + zadania z zakresem godzin) w kolumny,
// żeby renderować je obok siebie na osi zamiast jednego na drugim.
//
// Sweep-line po sortowaniu wg startu: dla każdego bloku wyznacza kolumnę wśród AKTUALNIE
// aktywnych bloków (te co się jeszcze nie skończyły), a `cols` (szerokość dzielona) liczy
// WYŁĄCZNIE z bloków lokalnie nakładających się w danym momencie, nie z całego "klastra"
// transytywnie połączonych bloków. Poprzednia wersja liczyła `cols` per cały klaster —
// blok A (9:00-10:00) i blok C (10:30-12:00) połączone transytywnie przez blok B (9:30-11:00)
// dostawały tę samą (za wąską) szerokość mimo że A i C w ogóle się nie nakładają, co
// renderowało je nienaturalnie wąsko i przycinało tekst mimo dostępnego miejsca w danym
// momencie ("Szkolenie strategiczne" ucięte, choć Deep Work już się skończył).
export function packOverlappingBlocks<T extends TimeBlockLayout>(
  items: T[],
): (T & { col: number; cols: number })[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const result: (T & { col: number; cols: number })[] = [];
  // Bloki wciąż "otwarte" w trakcie zamiatania — te same obiekty co w `result` (referencja,
  // nie kopia), więc aktualizacja `.cols` tutaj jest od razu widoczna w zwracanym wyniku.
  const active: (T & { col: number; cols: number })[] = [];

  for (const item of sorted) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].endMin <= item.startMin) active.splice(i, 1);
    }
    const usedCols = new Set(active.map((a) => a.col));
    let col = 0;
    while (usedCols.has(col)) col++;
    const withCol = { ...item, col, cols: col + 1 };
    active.push(withCol);
    result.push(withCol);
    const localCols = Math.max(...active.map((a) => a.col)) + 1;
    for (const a of active) a.cols = Math.max(a.cols, localCols);
  }

  return result;
}
