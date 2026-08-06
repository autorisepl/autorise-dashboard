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
  sredni: { bg: "var(--warning-bg)", border: "var(--warning-border)", color: "var(--warning-text)" },
  niski: { bg: "var(--bg-hover)", border: "var(--border)", color: "var(--text-secondary)" },
};

export type DueStatus = "overdue" | "today" | "week" | "future";

// Wspólny wizualny język statusów terminu, używany w całym /planowanie.
export const DUE_STYLES: Record<DueStatus, { bg: string; border: string; color: string }> = {
  overdue: { bg: "rgba(255,69,58,0.13)", border: "rgba(255,69,58,0.35)", color: "var(--error-text)" },
  today: { bg: "rgba(255,159,10,0.13)", border: "rgba(255,159,10,0.40)", color: "var(--warning-text)" },
  week: {
    bg: "rgba(48,209,88,0.11)",
    border: "rgba(48,209,88,0.30)",
    color: "var(--success-text)",
  },
  future: { bg: "rgba(0,0,0,0.05)", border: "rgba(0,0,0,0.14)", color: "var(--text-secondary)" },
};

export interface TaskWithList {
  task: GoogleTask;
  listId: string;
  listTitle: string;
}

// ── Priorytet trwały w polu notes zadania (Google Tasks nie ma osobnego pola) ──
const PRIORITY_TAG_RE = /\[priorytet:(wysoki|sredni|niski)\]\s*/;

export function parsePriorityFromNotes(notes: string | undefined): Priority | null {
  if (!notes) return null;
  const m = notes.match(PRIORITY_TAG_RE);
  return m ? (m[1] as Priority) : null;
}

export function stripPriorityTag(notes: string | undefined): string {
  if (!notes) return "";
  return notes.replace(PRIORITY_TAG_RE, "").trim();
}

export function setPriorityInNotes(notes: string | undefined, priority: Priority | null): string {
  const clean = stripPriorityTag(notes);
  if (!priority) return clean;
  const tag = `[priorytet:${priority}]`;
  return clean ? `${tag} ${clean}` : tag;
}

// Edycja treści notatki widocznej użytkownikowi, zachowuje tag priorytetu jeśli istnieje.
export function updateNotesText(notes: string | undefined, newText: string): string {
  const priority = parsePriorityFromNotes(notes);
  return setPriorityInNotes(newText, priority);
}

// Dwa typy MIME niestandardowe jako znacznik etapu przeciąganego elementu — czytelne przez
// dataTransfer.types już w onDragOver, więc drop-strefa Dnia może odrzucić drop wprost z
// Nieprzypisanych bez czytania danych, wymuszając dwuetapowe przeciąganie z instrukcji.
export const DRAG_TYPE_UNASSIGNED = "application/x-autorise-unassigned";
export const DRAG_TYPE_PRIORITIZED = "application/x-autorise-prioritized";

export interface DragPayload {
  taskId: string;
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
