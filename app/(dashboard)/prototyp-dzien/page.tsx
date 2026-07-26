"use client";

import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarEvent, CalendarResponse } from "@/app/api/google/calendar/route";
import type { GoogleTask, GoogleTasksResponse } from "@/app/api/google/tasks/route";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";

// A7 (2026-07-18) — PROTOTYP: Nieprzypisane / Strefa priorytetyzacji / Dzień (zadania +
// wydarzenia w jednym panelu) / edycja w miejscu.
// A8 (2026-07-26, zadanie 4/6) — rozbudowa z jednego dnia na pełny tydzień: góra dni robocze
// (poniedziałek-piątek), dół weekend (sobota-niedziela), przełączanie tygodni (poprzedni/
// następny). Cały mechanizm przeciągania/edycji z A7 zachowany bez zmian, tylko rozszerzony
// na 7 dni zamiast 1 — Nieprzypisane i Strefa priorytetyzacji zostają globalne (nie per-dzień,
// priorytet i brak terminu to pojęcia niezależne od tego, który tydzień jest wyświetlany).
// Świadomie NIE zastąpione tu /harmonogram — zostaje jako osobny prototyp pod /prototyp-dzien,
// dopóki Michał nie zaakceptuje kierunku; /harmonogram i /zadania nie zostały ruszone.
//
// Dwa świadome uproszczenia z A7, wciąż aktualne:
// 1. Priorytet jest WYŁĄCZNIE lokalny (localStorage w tej przeglądarce), nie zapisany do
//    Google Tasks — Tasks API nie ma pola priorytetu, jedyne miejsce na dodatkowe dane to
//    "notes", które Michał już realnie używa w /zadania. Do decyzji: osobne pole w Notion,
//    czy inny mechanizm, zanim to przestanie być prototypem.
// 2. "Czas rzeczywisty" ma różną precyzję dla zadań i wydarzeń — zadania (Google Tasks `due`
//    bez godziny) dostają etykietę dnia, wydarzenia (mają dateTime) dostają realne "za X min".
//
// Nowe w A8, do opisania wprost: zadania spóźnione (due < dziś) są "doklejane" wyłącznie do
// panelu DNIA DZISIEJSZEGO (jeśli wyświetlany tydzień go zawiera) — dokładnie tak jak w A7,
// gdzie "dzień" łączył dziś+zaległe. W pozostałych dniach panel pokazuje wyłącznie zadania
// z terminem dokładnie na ten dzień, bez zaległości z przeszłości doklejanych gdzie indziej.

const EXCLUDED_LIST_NAME = "Pomysły i inspiracje";
const PRIORITY_STORAGE_KEY = "autorise_prototyp_dzien_priority";
const TICK_MS = 30_000;

type Priority = "wysoki" | "sredni" | "niski";
const PRIORITY_LEVELS: Priority[] = ["wysoki", "sredni", "niski"];
const PRIORITY_LABEL: Record<Priority, string> = {
  wysoki: "Wysoki",
  sredni: "Średni",
  niski: "Niski",
};
const PRIORITY_STYLE: Record<Priority, { bg: string; border: string; color: string }> = {
  wysoki: { bg: "var(--error-bg)", border: "var(--error-border)", color: "var(--error)" },
  sredni: { bg: "var(--warning-bg)", border: "var(--warning-border)", color: "var(--warning)" },
  niski: { bg: "var(--bg-hover)", border: "var(--border)", color: "var(--text-secondary)" },
};

type DueStatus = "overdue" | "today" | "week" | "future";

// Skopiowane 1:1 z /zadania (DUE_STYLES/formatDue) — ten sam wizualny język statusów
// terminu dla zadań (dzień-granularność, Google Tasks nie ma godziny w `due`).
const DUE_STYLES: Record<DueStatus, { bg: string; border: string; color: string }> = {
  overdue: { bg: "rgba(255,69,58,0.13)", border: "rgba(255,69,58,0.35)", color: "var(--error)" },
  today: { bg: "rgba(255,159,10,0.13)", border: "rgba(255,159,10,0.40)", color: "var(--warning)" },
  week: {
    bg: "rgba(48,209,88,0.11)",
    border: "rgba(48,209,88,0.30)",
    color: "var(--success-text)",
  },
  future: { bg: "rgba(0,0,0,0.05)", border: "rgba(0,0,0,0.14)", color: "var(--text-secondary)" },
};

function formatDue(iso: string | undefined): { label: string; status: DueStatus } | null {
  if (!iso) return null;
  const due = new Date(iso);
  const now = new Date();
  const dueLocal = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueLocal.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return { label: `spóźnione o ${days} ${days === 1 ? "dzień" : "dni"}`, status: "overdue" };
  }
  if (diffDays === 0) return { label: "dziś", status: "today" };
  if (diffDays === 1) return { label: "jutro", status: "week" };
  return { label: `za ${diffDays} dni`, status: diffDays <= 7 ? "week" : "future" };
}

function todayDateInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dueToInputValue(due?: string): string {
  if (!due) return todayDateInputValue();
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return todayDateInputValue();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Tydzień: pomocnicze funkcje daty ──────────────────────────────────

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Nd
  const diff = day === 0 ? -6 : 1 - day; // poniedziałek tego tygodnia
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function taskDateKey(due: string | undefined): string | null {
  if (!due) return null;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return null;
  return localDateKey(d);
}

function eventDateKey(ev: CalendarEvent): string | null {
  const iso = ev.start.dateTime ?? ev.start.date;
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return localDateKey(d);
}

function formatDayHeader(d: Date): string {
  const s = d.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const startFmt = monday.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: sameMonth ? undefined : "long",
  });
  const endFmt = sunday.toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
  return `${startFmt}–${endFmt} ${sunday.getFullYear()}`;
}

// Realna precyzja godzinowa — wydarzenia kalendarza mają dateTime, w przeciwieństwie do
// zadań. To jest to konkretne miejsce gdzie da się uczciwie pokazać "za 45 min"/"w trakcie".
function relativeEventLabel(event: CalendarEvent, now: Date): { label: string; status: DueStatus } {
  if (event.allDay) return { label: "cały dzień", status: "today" };
  const start = event.start.dateTime ? new Date(event.start.dateTime) : null;
  const end = event.end.dateTime ? new Date(event.end.dateTime) : null;
  if (!start) return { label: "", status: "today" };

  if (end && now >= start && now <= end) return { label: "w trakcie", status: "today" };
  if (end && now > end) {
    const minAgo = Math.round((now.getTime() - end.getTime()) / 60_000);
    if (minAgo < 60) return { label: `zakończone ${minAgo} min temu`, status: "future" };
    const hAgo = Math.round(minAgo / 60);
    return { label: `zakończone ${hAgo} godz. temu`, status: "future" };
  }
  const diffMin = Math.round((start.getTime() - now.getTime()) / 60_000);
  if (diffMin <= 0) return { label: "zaczyna się teraz", status: "today" };
  if (diffMin < 60) return { label: `za ${diffMin} min`, status: "today" };
  const diffH = Math.round(diffMin / 60);
  return { label: `za ${diffH} godz.`, status: "week" };
}

function formatEventTime(e: CalendarEvent): string {
  if (e.allDay) return "Cały dzień";
  const start = e.start.dateTime ? new Date(e.start.dateTime) : null;
  const end = e.end.dateTime ? new Date(e.end.dateTime) : null;
  const fmt = (d: Date) => d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (start && end) return `${fmt(start)}–${fmt(end)}`;
  if (start) return fmt(start);
  return "";
}

function timeToInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineDateAndTime(dateIso: string, hhmm: string): string {
  const base = new Date(dateIso);
  const [h, m] = hhmm.split(":").map(Number);
  base.setHours(h || 0, m || 0, 0, 0);
  return base.toISOString();
}

interface TaskWithList {
  task: GoogleTask;
  listId: string;
  listTitle: string;
}

// Dwa typy MIME niestandardowe jako "znacznik etapu" przeciąganego elementu — czytelne
// przez `dataTransfer.types` już w onDragOver (getData tam nie działa niezawodnie
// międzyprzeglądarkowo), więc drop-strefa Dnia może odrzucić drop wprost z Nieprzypisanych
// bez czytania samych danych, wymuszając dwuetapowe przeciąganie z instrukcji.
const DRAG_TYPE_UNASSIGNED = "application/x-autorise-unassigned";
const DRAG_TYPE_PRIORITIZED = "application/x-autorise-prioritized";

interface DragPayload {
  taskId: string;
}

// ── Editable inline text ──────────────────────────────────────────────

function EditableText({
  value,
  onSave,
  fontSize = 13,
  fontWeight = 600,
  strike = false,
}: {
  value: string;
  onSave: (next: string) => void;
  fontSize?: number;
  fontWeight?: number;
  strike?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        style={{
          width: "100%",
          fontFamily: "var(--font-sans)",
          fontSize,
          fontWeight,
          color: "var(--text-primary)",
          background: "var(--bg)",
          border: "1px solid var(--accent)",
          borderRadius: 5,
          padding: "2px 6px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Kliknij, żeby edytować"
      style={{
        fontFamily: "var(--font-sans)",
        fontSize,
        fontWeight,
        color: "var(--text-primary)",
        cursor: "text",
        textDecoration: strike ? "line-through" : "none",
        opacity: strike ? 0.6 : 1,
        padding: "2px 6px",
        marginLeft: -6,
        borderRadius: 5,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {value}
    </div>
  );
}

// ── Priority badge (klik = cykl Wysoki → Średni → Niski → brak) ──────

function PriorityBadge({ priority, onCycle }: { priority: Priority | null; onCycle: () => void }) {
  if (!priority) {
    return (
      <button
        onClick={onCycle}
        title="Nadaj priorytet"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          fontFamily: "var(--font-sans)",
          fontSize: 9,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          background: "transparent",
          border: "1px dashed var(--border)",
          borderRadius: "var(--radius-xs)",
          padding: "1px 5px",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <Flag size={8} /> priorytet
      </button>
    );
  }
  const s = PRIORITY_STYLE[priority];
  return (
    <button
      onClick={onCycle}
      title="Kliknij, żeby zmienić priorytet"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        fontFamily: "var(--font-sans)",
        fontSize: 9,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: "var(--radius-xs)",
        padding: "1px 5px",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <Flag size={8} /> {PRIORITY_LABEL[priority]}
    </button>
  );
}

// ── Panel: Nieprzypisane (draggable chips, źródło etapu 1) ──────────

function UnassignedChip({ item }: { item: TaskWithList }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        const payload: DragPayload = { taskId: item.task.id };
        e.dataTransfer.setData(DRAG_TYPE_UNASSIGNED, JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "move";
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-primary)" }}>
        {item.task.title}
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 9,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          background: "var(--bg-hover)",
          borderRadius: "var(--radius-xs)",
          padding: "1px 5px",
        }}
      >
        {item.listTitle}
      </span>
    </div>
  );
}

// ── Panel: Strefa priorytetyzacji — chip przeciągalny dalej (etap 2 → 3) ─

function PrioritizedChip({ item }: { item: TaskWithList }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        const payload: DragPayload = { taskId: item.task.id };
        e.dataTransfer.setData(DRAG_TYPE_PRIORITIZED, JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "move";
      }}
      style={{
        padding: "6px 10px",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        cursor: "grab",
        userSelect: "none",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        color: "var(--text-primary)",
      }}
    >
      {item.task.title}
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          marginTop: 2,
        }}
      >
        {item.listTitle}
      </div>
    </div>
  );
}

// ── Panel dnia — zadania + wydarzenia razem, jeden dzień tygodnia ────

function DayPanel({
  day,
  isToday,
  tasks,
  events,
  now,
  dragOverZone,
  setDragOverZone,
  onDrop,
  patchTask,
  patchEvent,
  toggleDone,
  priorityMap,
  cyclePriority,
}: {
  day: Date;
  isToday: boolean;
  tasks: TaskWithList[];
  events: CalendarEvent[];
  now: Date;
  dragOverZone: string | null;
  setDragOverZone: (v: string | null) => void;
  onDrop: (e: React.DragEvent, day: Date) => void;
  patchTask: (listId: string, taskId: string, patch: Partial<GoogleTask>) => void;
  patchEvent: (eventId: string, patch: Record<string, string>) => void;
  toggleDone: (item: TaskWithList) => void;
  priorityMap: Record<string, Priority>;
  cyclePriority: (taskId: string) => void;
}) {
  const zoneKey = `day-${localDateKey(day)}`;
  const isOver = dragOverZone === zoneKey;

  return (
    <Panel
      style={{
        padding: 12,
        minWidth: 0,
        background: isOver ? "var(--accent-muted)" : isToday ? "var(--bg-elevated)" : undefined,
        border: isOver
          ? "1px dashed var(--accent)"
          : isToday
            ? "1px solid var(--accent-border)"
            : "1px solid var(--glass-border)",
      }}
    >
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_TYPE_PRIORITIZED)) {
            e.preventDefault();
            setDragOverZone(zoneKey);
          }
        }}
        onDragLeave={() => setDragOverZone(dragOverZone === zoneKey ? null : dragOverZone)}
        onDrop={(e) => onDrop(e, day)}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 700,
            color: isToday ? "var(--accent)" : "var(--text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 10,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={formatDayHeader(day)}
        >
          {formatDayHeader(day)}
        </div>

        <SectionLabel paddingX={0} style={{ fontSize: 9 }}>
          Zadania ({tasks.length})
        </SectionLabel>
        {tasks.length === 0 ? (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              padding: "6px 0",
              fontFamily: "var(--font-sans)",
            }}
          >
            Przeciągnij zadanie tutaj.
          </div>
        ) : (
          <div>
            {tasks.map((item) => {
              const dueInfo = formatDue(item.task.due);
              const done = item.task.status === "completed";
              const priority = priorityMap[item.task.id] ?? null;
              return (
                <div
                  key={item.task.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    padding: "6px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <button
                    onClick={() => toggleDone(item)}
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: "50%",
                      border: done ? "1.5px solid var(--success)" : "1.5px solid var(--border)",
                      background: done ? "var(--success)" : "transparent",
                      flexShrink: 0,
                      marginTop: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {done && <Check size={10} color="#fff" strokeWidth={3} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <EditableText
                      value={item.task.title}
                      strike={done}
                      fontSize={11}
                      onSave={(next) => patchTask(item.listId, item.task.id, { title: next })}
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 3,
                        flexWrap: "wrap",
                      }}
                    >
                      <PriorityBadge
                        priority={priority}
                        onCycle={() => cyclePriority(item.task.id)}
                      />
                      {dueInfo && (
                        <label
                          title="Kliknij, żeby zmienić termin"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            fontFamily: "var(--font-sans)",
                            fontSize: 9,
                            fontWeight: 700,
                            color: DUE_STYLES[dueInfo.status].color,
                            background: DUE_STYLES[dueInfo.status].bg,
                            border: `1px solid ${DUE_STYLES[dueInfo.status].border}`,
                            borderRadius: "var(--radius-xs)",
                            padding: "1px 5px",
                            cursor: "pointer",
                            position: "relative",
                          }}
                        >
                          {dueInfo.label}
                          <input
                            type="date"
                            value={dueToInputValue(item.task.due)}
                            onChange={(e) =>
                              patchTask(item.listId, item.task.id, {
                                due: e.target.value
                                  ? new Date(`${e.target.value}T00:00:00`).toISOString()
                                  : undefined,
                              })
                            }
                            style={{
                              position: "absolute",
                              inset: 0,
                              opacity: 0,
                              cursor: "pointer",
                              width: "100%",
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <SectionLabel paddingX={0} style={{ fontSize: 9 }}>
            Wydarzenia ({events.length})
          </SectionLabel>
          {events.length === 0 ? (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                padding: "6px 0",
                fontFamily: "var(--font-sans)",
              }}
            >
              Brak.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {events.map((ev) => {
                const rel = relativeEventLabel(ev, now);
                const startVal = timeToInputValue(ev.start.dateTime);
                const endVal = timeToInputValue(ev.end.dateTime);
                return (
                  <div
                    key={ev.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                      padding: "6px 8px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--accent-muted)",
                      border: "1px solid var(--accent-border)",
                    }}
                  >
                    <Calendar
                      size={12}
                      color="var(--accent)"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <EditableText
                        value={ev.summary}
                        fontSize={11}
                        onSave={(next) => patchEvent(ev.id, { summary: next })}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          marginTop: 2,
                          flexWrap: "wrap",
                        }}
                      >
                        {!ev.allDay && ev.start.dateTime && ev.end.dateTime ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <input
                              type="time"
                              defaultValue={startVal}
                              onBlur={(e) => {
                                if (e.target.value && e.target.value !== startVal) {
                                  patchEvent(ev.id, {
                                    startDateTime: combineDateAndTime(
                                      ev.start.dateTime as string,
                                      e.target.value,
                                    ),
                                  });
                                }
                              }}
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: 10,
                                color: "var(--text-secondary)",
                                border: "1px solid transparent",
                                background: "transparent",
                                borderRadius: 4,
                                padding: "1px 0",
                                width: 52,
                              }}
                            />
                            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>–</span>
                            <input
                              type="time"
                              defaultValue={endVal}
                              onBlur={(e) => {
                                if (e.target.value && e.target.value !== endVal) {
                                  patchEvent(ev.id, {
                                    endDateTime: combineDateAndTime(
                                      ev.end.dateTime as string,
                                      e.target.value,
                                    ),
                                  });
                                }
                              }}
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: 10,
                                color: "var(--text-secondary)",
                                border: "1px solid transparent",
                                background: "transparent",
                                borderRadius: 4,
                                padding: "1px 0",
                                width: 52,
                              }}
                            />
                          </div>
                        ) : (
                          <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                            {formatEventTime(ev)}
                          </span>
                        )}
                        {rel.label && (
                          <span
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 8,
                              fontWeight: 700,
                              color: DUE_STYLES[rel.status].color,
                              background: DUE_STYLES[rel.status].bg,
                              border: `1px solid ${DUE_STYLES[rel.status].border}`,
                              borderRadius: "var(--radius-xs)",
                              padding: "1px 4px",
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <AlertTriangle size={7} />
                            {rel.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

export default function PrototypDzienPage() {
  const [lists, setLists] = useState<{ id: string; title: string }[]>([]);
  const [tasksByList, setTasksByList] = useState<Record<string, GoogleTask[]>>({});
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [priorityMap, setPriorityMap] = useState<Record<string, Priority>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = addDays(startOfWeek(new Date()), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayKey = localDateKey(new Date());
  const weekContainsToday = weekDays.some((d) => localDateKey(d) === todayKey);

  // Priorytet: wyłącznie lokalny (patrz komentarz na górze pliku), przywracany z
  // localStorage tej przeglądarki, żeby przeładowanie strony w trakcie demo nie gubiło pracy.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRIORITY_STORAGE_KEY);
      if (raw) setPriorityMap(JSON.parse(raw));
    } catch {
      // brak/zły JSON — zaczynamy od pustej mapy
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(PRIORITY_STORAGE_KEY, JSON.stringify(priorityMap));
  }, [priorityMap]);

  // Tick co 30s — odświeża etykiety "za X min"/"dziś"/"spóźnione" bez ponownego fetchowania.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const [tasksRes, eventsRes] = await Promise.all([
        fetch("/api/google/tasks"),
        fetch(
          `/api/google/calendar?start=${encodeURIComponent(weekStart.toISOString())}&end=${encodeURIComponent(weekEnd.toISOString())}`,
        ),
      ]);
      const tasksData = (await tasksRes.json()) as GoogleTasksResponse & { error?: string };
      const eventsData = (await eventsRes.json()) as CalendarResponse & { error?: string };

      if (tasksData.error || eventsData.error) {
        setError("Brak połączenia z Google. Połącz konto na stronie profilu.");
        return;
      }

      setLists((tasksData.lists ?? []).filter((l) => l.title !== EXCLUDED_LIST_NAME));
      setTasksByList(tasksData.tasksByList ?? {});
      setEvents(eventsData.events ?? []);
    } catch {
      setError("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
    // weekStart zależy tylko od weekOffset — świadomie w deps zamiast obiektu Date, żeby nie
    // pobierać na nowo przy każdym renderze (nowy obiekt Date() ma inną referencję za każdym razem).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    void load();
  }, [load]);

  const findTask = useCallback(
    (taskId: string): TaskWithList | null => {
      for (const list of lists) {
        const t = (tasksByList[list.id] ?? []).find((x) => x.id === taskId);
        if (t) return { task: t, listId: list.id, listTitle: list.title };
      }
      return null;
    },
    [lists, tasksByList],
  );

  const patchTask = useCallback(
    (listId: string, taskId: string, patch: Partial<GoogleTask>) => {
      // Optymistyczny update lokalny, ten sam wzorzec co reszta dashboardu.
      setTasksByList((prev) => ({
        ...prev,
        [listId]: (prev[listId] ?? []).map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      }));
      void fetch("/api/google/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId, taskId, ...patch }),
      }).catch(() => void 0);
    },
    [],
  );

  const patchEvent = useCallback((eventId: string, patch: Record<string, string>) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              summary: patch.summary ?? e.summary,
              start: patch.startDateTime ? { ...e.start, dateTime: patch.startDateTime } : e.start,
              end: patch.endDateTime ? { ...e.end, dateTime: patch.endDateTime } : e.end,
            }
          : e,
      ),
    );
    void fetch(`/api/google/calendar/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => void 0);
  }, []);

  const cyclePriority = useCallback((taskId: string) => {
    setPriorityMap((prev) => {
      const current = prev[taskId];
      const idx = current ? PRIORITY_LEVELS.indexOf(current) : -1;
      const next = PRIORITY_LEVELS[idx + 1];
      const copy = { ...prev };
      if (next) copy[taskId] = next;
      else delete copy[taskId];
      return copy;
    });
  }, []);

  const toggleDone = useCallback(
    (item: TaskWithList) => {
      const nextStatus = item.task.status === "completed" ? "needsAction" : "completed";
      patchTask(item.listId, item.task.id, { status: nextStatus });
    },
    [patchTask],
  );

  // ── Grupowanie: nieprzypisane / prioritized-not-scheduled / per-dzień ────
  const allActive: TaskWithList[] = [];
  for (const list of lists) {
    for (const task of tasksByList[list.id] ?? []) {
      if (task.status === "completed") continue;
      allActive.push({ task, listId: list.id, listTitle: list.title });
    }
  }

  const unassigned = allActive.filter((t) => !t.task.due && !priorityMap[t.task.id]);
  const prioritizedByLevel: Record<Priority, TaskWithList[]> = {
    wysoki: [],
    sredni: [],
    niski: [],
  };
  for (const t of allActive) {
    if (!t.task.due && priorityMap[t.task.id]) {
      prioritizedByLevel[priorityMap[t.task.id]].push(t);
    }
  }

  function tasksForDay(dayKey: string, isToday: boolean): TaskWithList[] {
    return allActive.filter((t) => {
      const k = taskDateKey(t.task.due);
      if (!k) return false;
      if (k === dayKey) return true;
      // Zaległe (przed tym dniem) doklejane WYŁĄCZNIE do panelu dzisiejszego dnia — ten sam
      // wzorzec co A7 (tam "dzień" znaczył zawsze dziś+zaległe).
      if (isToday && k < dayKey) return true;
      return false;
    });
  }

  function eventsForDay(dayKey: string): CalendarEvent[] {
    return events.filter((ev) => eventDateKey(ev) === dayKey);
  }

  function handlePriorityDrop(e: React.DragEvent, level: Priority) {
    e.preventDefault();
    setDragOverZone(null);
    const raw =
      e.dataTransfer.getData(DRAG_TYPE_UNASSIGNED) || e.dataTransfer.getData(DRAG_TYPE_PRIORITIZED);
    if (!raw) return;
    const payload = JSON.parse(raw) as DragPayload;
    setPriorityMap((prev) => ({ ...prev, [payload.taskId]: level }));
  }

  function handleDayDrop(e: React.DragEvent, day: Date) {
    e.preventDefault();
    setDragOverZone(null);
    const raw = e.dataTransfer.getData(DRAG_TYPE_PRIORITIZED);
    if (!raw) return; // dwuetapowe przeciąganie: dzień przyjmuje wyłącznie z etapu 2
    const payload = JSON.parse(raw) as DragPayload;
    const found = findTask(payload.taskId);
    if (!found) return;
    const due = new Date(day);
    due.setHours(0, 0, 0, 0);
    patchTask(found.listId, found.task.id, { due: due.toISOString() });
  }

  const weekdayPanels = weekDays.slice(0, 5);
  const weekendPanels = weekDays.slice(5, 7);

  function renderDay(day: Date) {
    const key = localDateKey(day);
    const isToday = key === todayKey && weekContainsToday;
    return (
      <DayPanel
        key={key}
        day={day}
        isToday={isToday}
        tasks={tasksForDay(key, isToday)}
        events={eventsForDay(key)}
        now={now}
        dragOverZone={dragOverZone}
        setDragOverZone={setDragOverZone}
        onDrop={handleDayDrop}
        patchTask={patchTask}
        patchEvent={patchEvent}
        toggleDone={toggleDone}
        priorityMap={priorityMap}
        cyclePriority={cyclePriority}
      />
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PageHeader icon={<CalendarDays size={15} color="var(--accent)" />} title="Prototyp: Tydzień">
        <button
          onClick={() => void load()}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginLeft: "auto",
            padding: "5px 10px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            cursor: loading ? "default" : "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-secondary)",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Odśwież
        </button>
      </PageHeader>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        <div
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(255,149,0,0.1)",
            border: "1px solid var(--warning)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          Prototyp rozbudowany (A8) — pełny tydzień, nadal nie zamiennik dla /harmonogram ani
          /zadania. Przeciąganie dwuetapowe: Nieprzypisane → Strefa priorytetyzacji → konkretny
          dzień. Priorytet zapisywany wyłącznie lokalnie w tej przeglądarce (nie w Google Tasks).
        </div>

        {error && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
              background: "var(--error-bg)",
              border: "1px solid var(--error-border)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--error)",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
            {/* Panel 1: Nieprzypisane */}
            <Panel style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Inbox size={13} color="var(--text-tertiary)" />
                <SectionLabel paddingX={0} style={{ padding: 0 }}>
                  Nieprzypisane ({unassigned.length})
                </SectionLabel>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {loading ? (
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Ładowanie...</span>
                ) : unassigned.length === 0 ? (
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    Brak zadań bez terminu.
                  </span>
                ) : (
                  unassigned.map((item) => <UnassignedChip key={item.task.id} item={item} />)
                )}
              </div>
            </Panel>

            {/* Panel 2: Strefa priorytetyzacji */}
            <Panel style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Flag size={13} color="var(--text-tertiary)" />
                <SectionLabel paddingX={0} style={{ padding: 0 }}>
                  Strefa priorytetyzacji
                </SectionLabel>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {PRIORITY_LEVELS.map((level) => {
                  const zoneKey = `priority-${level}`;
                  const isOver = dragOverZone === zoneKey;
                  const s = PRIORITY_STYLE[level];
                  return (
                    <div
                      key={level}
                      onDragOver={(e) => {
                        if (
                          e.dataTransfer.types.includes(DRAG_TYPE_UNASSIGNED) ||
                          e.dataTransfer.types.includes(DRAG_TYPE_PRIORITIZED)
                        ) {
                          e.preventDefault();
                          setDragOverZone(zoneKey);
                        }
                      }}
                      onDragLeave={() => setDragOverZone(dragOverZone === zoneKey ? null : dragOverZone)}
                      onDrop={(e) => handlePriorityDrop(e, level)}
                      style={{
                        minHeight: 90,
                        padding: 8,
                        borderRadius: "var(--radius-sm)",
                        background: isOver ? s.bg : "var(--bg)",
                        border: `1px dashed ${isOver ? s.color : "var(--border)"}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        transition: "background 100ms, border-color 100ms",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 10,
                          fontWeight: 700,
                          color: s.color,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {PRIORITY_LABEL[level]} ({prioritizedByLevel[level].length})
                      </div>
                      {prioritizedByLevel[level].map((item) => (
                        <PrioritizedChip key={item.task.id} item={item} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>

          {/* Nawigacja tygodni */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                height: 30,
                padding: "0 10px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xs)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              <ChevronLeft size={13} /> Poprzedni tydzień
            </button>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
                minWidth: 200,
                textAlign: "center",
              }}
            >
              {formatWeekRange(weekStart)}
            </div>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                height: 30,
                padding: "0 10px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xs)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              Następny tydzień <ChevronRight size={13} />
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                style={{
                  height: 30,
                  padding: "0 10px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xs)",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--accent)",
                }}
              >
                Dziś
              </button>
            )}
          </div>

          {/* Dni robocze (poniedziałek-piątek) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(220px, 1fr))",
              gap: 12,
              overflowX: "auto",
            }}
          >
            {weekdayPanels.map((day) => renderDay(day))}
          </div>

          {/* Weekend (sobota-niedziela) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(220px, 1fr))",
              gap: 12,
              overflowX: "auto",
            }}
          >
            {weekendPanels.map((day) => renderDay(day))}
          </div>
        </div>
      </div>
    </div>
  );
}
