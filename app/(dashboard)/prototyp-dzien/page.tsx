"use client";

import { AlertTriangle, Calendar, CalendarDays, Check, Flag, Inbox, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarEvent, CalendarResponse } from "@/app/api/google/calendar/route";
import type { GoogleTask, GoogleTasksResponse } from "@/app/api/google/tasks/route";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";

// A7 (2026-07-18) — PROTOTYP rozbudowany o 4 elementy: Nieprzypisane / Strefa
// priorytetyzacji / Dzień (zadania + wydarzenia w jednym panelu) / edycja w miejscu.
// Świadomie NIE zbudowane tutaj: układ tygodniowy (dni robocze/weekend), przełączanie
// tygodni, połączenie z niezrealizowanymi dalszymi krokami z /kwalifikacja i /sprzedaz —
// to następny krok, po akceptacji tej rundy. Nadal NIE wpięte do sidebar.tsx, dostępne
// wyłącznie pod /prototyp-dzien wprost. Żadna z /harmonogram, /zadania nie została ruszona.
//
// Dwa świadome uproszczenia na tym etapie, opisane też w odpowiedzi do Michała:
// 1. Priorytet jest WYŁĄCZNIE lokalny (localStorage w tej przeglądarce), nie zapisany do
//    Google Tasks — Tasks API nie ma pola priorytetu, jedyne miejsce na dodatkowe dane to
//    "notes", które Michał już realnie używa w /zadania. Wpisywanie tam ukrytego znacznika
//    priorytetu zaśmieciłoby prawdziwe notatki widoczne w produkcyjnym /zadania. Do
//    decyzji: osobne pole w Notion, czy inny mechanizm, zanim to przestanie być prototypem.
// 2. "Czas rzeczywisty" ma różną precyzję dla zadań i wydarzeń, bo dane źródłowe są różne:
//    Google Tasks `due` to data bez godziny (bez znaczenia "za 45 minut"), więc zadania
//    mają etykietę dnia (dziś/jutro/spóźnione o N dni) odświeżaną co tick. Wydarzenia
//    kalendarza MAJĄ realną godzinę, więc dostają prawdziwe "za X min"/"w trakcie"/"X min
//    temu", też odświeżane co tick (30s).

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

function isDueTodayOrOverdue(iso: string | undefined): boolean {
  if (!iso) return false;
  const due = new Date(iso);
  const now = new Date();
  const dueLocal = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dueLocal.getTime() <= todayLocal.getTime();
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

function formatHeaderDate(d: Date): string {
  const s = d.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
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
          fontSize: 10,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          background: "transparent",
          border: "1px dashed var(--border)",
          borderRadius: "var(--radius-xs)",
          padding: "1px 6px",
          cursor: "pointer",
        }}
      >
        <Flag size={9} /> priorytet
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
        fontSize: 10,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: "var(--radius-xs)",
        padding: "1px 6px",
        cursor: "pointer",
      }}
    >
      <Flag size={9} /> {PRIORITY_LABEL[priority]}
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

export default function PrototypDzienPage() {
  const [lists, setLists] = useState<{ id: string; title: string }[]>([]);
  const [tasksByList, setTasksByList] = useState<Record<string, GoogleTask[]>>({});
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [priorityMap, setPriorityMap] = useState<Record<string, Priority>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

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
      const [tasksRes, eventsRes] = await Promise.all([
        fetch("/api/google/tasks"),
        fetch("/api/google/calendar?view=day"),
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
  }, []);

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
    async (listId: string, taskId: string, patch: Partial<GoogleTask>) => {
      // Optymistyczny update lokalny, ten sam wzorzec co reszta dashboardu.
      setTasksByList((prev) => ({
        ...prev,
        [listId]: (prev[listId] ?? []).map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      }));
      await fetch("/api/google/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId, taskId, ...patch }),
      }).catch(() => void 0);
    },
    [],
  );

  const patchEvent = useCallback(async (eventId: string, patch: Record<string, string>) => {
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
    await fetch(`/api/google/calendar/${eventId}`, {
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
      void patchTask(item.listId, item.task.id, { status: nextStatus });
    },
    [patchTask],
  );

  // ── Grupowanie: nieprzypisane / prioritized-not-scheduled / dzień ────
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
  const dayTasks = allActive.filter((t) => isDueTodayOrOverdue(t.task.due));

  function handlePriorityDrop(e: React.DragEvent, level: Priority) {
    e.preventDefault();
    setDragOverZone(null);
    const raw =
      e.dataTransfer.getData(DRAG_TYPE_UNASSIGNED) || e.dataTransfer.getData(DRAG_TYPE_PRIORITIZED);
    if (!raw) return;
    const payload = JSON.parse(raw) as DragPayload;
    setPriorityMap((prev) => ({ ...prev, [payload.taskId]: level }));
  }

  function handleDayDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOverZone(null);
    const raw = e.dataTransfer.getData(DRAG_TYPE_PRIORITIZED);
    if (!raw) return; // dwuetapowe przeciąganie: dzień przyjmuje wyłącznie z etapu 2
    const payload = JSON.parse(raw) as DragPayload;
    const found = findTask(payload.taskId);
    if (!found) return;
    void patchTask(found.listId, found.task.id, { due: new Date().toISOString() });
  }

  const today = now;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PageHeader
        icon={<CalendarDays size={15} color="var(--accent)" />}
        title="Prototyp: Panel dnia"
      >
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
          <RefreshCw
            size={11}
            style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
          />
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
            maxWidth: 760,
          }}
        >
          Prototyp rozbudowany (A7) — nadal nie zamiennik dla /harmonogram ani /zadania.
          Przeciąganie dwuetapowe: Nieprzypisane → Strefa priorytetyzacji → Dzień. Priorytet jest na
          razie zapisywany wyłącznie lokalnie w tej przeglądarce (nie w Google Tasks) — patrz
          komentarz na górze pliku dla uzasadnienia.
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
              maxWidth: 760,
            }}
          >
            {error}
          </div>
        )}

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
                    onDragLeave={() => setDragOverZone((z) => (z === zoneKey ? null : z))}
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

          {/* Panel 3: Dzień — zadania + wydarzenia razem */}
          <Panel
            style={{
              padding: 16,
              background: dragOverZone === "day" ? "var(--accent-muted)" : undefined,
              border:
                dragOverZone === "day"
                  ? "1px dashed var(--accent)"
                  : "1px solid var(--glass-border)",
            }}
          >
            <div
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(DRAG_TYPE_PRIORITIZED)) {
                  e.preventDefault();
                  setDragOverZone("day");
                }
              }}
              onDragLeave={() => setDragOverZone((z) => (z === "day" ? null : z))}
              onDrop={handleDayDrop}
            >
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                  marginBottom: 14,
                }}
              >
                {formatHeaderDate(today)}
              </div>

              <SectionLabel paddingX={0}>Zadania ({dayTasks.length})</SectionLabel>
              {loading ? (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "8px 0" }}>
                  Ładowanie...
                </div>
              ) : dayTasks.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "8px 0" }}>
                  Brak zadań na dziś. Przeciągnij tu zadanie ze strefy priorytetyzacji.
                </div>
              ) : (
                <div>
                  {dayTasks.map((item) => {
                    const dueInfo = formatDue(item.task.due);
                    const done = item.task.status === "completed";
                    const priority = priorityMap[item.task.id] ?? null;
                    return (
                      <div
                        key={item.task.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "8px 0",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <button
                          onClick={() => toggleDone(item)}
                          style={{
                            width: 17,
                            height: 17,
                            borderRadius: "50%",
                            border: done
                              ? "1.5px solid var(--success)"
                              : "1.5px solid var(--border)",
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
                          {done && <Check size={11} color="#fff" strokeWidth={3} />}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <EditableText
                            value={item.task.title}
                            strike={done}
                            onSave={(next) =>
                              void patchTask(item.listId, item.task.id, { title: next })
                            }
                          />
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 4,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: 10,
                                fontWeight: 600,
                                color: "var(--text-tertiary)",
                                background: "var(--bg-hover)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-xs)",
                                padding: "1px 6px",
                              }}
                            >
                              {item.listTitle}
                            </span>
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
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: DUE_STYLES[dueInfo.status].color,
                                  background: DUE_STYLES[dueInfo.status].bg,
                                  border: `1px solid ${DUE_STYLES[dueInfo.status].border}`,
                                  borderRadius: "var(--radius-xs)",
                                  padding: "1px 6px",
                                  cursor: "pointer",
                                  position: "relative",
                                }}
                              >
                                {dueInfo.label}
                                <input
                                  type="date"
                                  value={dueToInputValue(item.task.due)}
                                  onChange={(e) =>
                                    void patchTask(item.listId, item.task.id, {
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

              <div style={{ marginTop: 16 }}>
                <SectionLabel paddingX={0}>Wydarzenia ({events.length})</SectionLabel>
                {loading ? (
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "8px 0" }}>
                    Ładowanie...
                  </div>
                ) : events.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "8px 0" }}>
                    Brak wydarzeń dziś w kalendarzu.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {events.map((ev) => {
                      const rel = relativeEventLabel(ev, now);
                      const startVal = timeToInputValue(ev.start.dateTime);
                      const endVal = timeToInputValue(ev.end.dateTime);
                      return (
                        <div
                          key={ev.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "9px 10px",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--accent-muted)",
                            border: "1px solid var(--accent-border)",
                          }}
                        >
                          <Calendar size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <EditableText
                              value={ev.summary}
                              onSave={(next) => void patchEvent(ev.id, { summary: next })}
                            />
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginTop: 2,
                                flexWrap: "wrap",
                              }}
                            >
                              {!ev.allDay && ev.start.dateTime && ev.end.dateTime ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <input
                                    type="time"
                                    defaultValue={startVal}
                                    onBlur={(e) => {
                                      if (e.target.value && e.target.value !== startVal) {
                                        void patchEvent(ev.id, {
                                          startDateTime: combineDateAndTime(
                                            ev.start.dateTime as string,
                                            e.target.value,
                                          ),
                                        });
                                      }
                                    }}
                                    style={{
                                      fontFamily: "var(--font-sans)",
                                      fontSize: 11,
                                      color: "var(--text-secondary)",
                                      border: "1px solid transparent",
                                      background: "transparent",
                                      borderRadius: 4,
                                      padding: "1px 2px",
                                      width: 62,
                                    }}
                                  />
                                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                                    –
                                  </span>
                                  <input
                                    type="time"
                                    defaultValue={endVal}
                                    onBlur={(e) => {
                                      if (e.target.value && e.target.value !== endVal) {
                                        void patchEvent(ev.id, {
                                          endDateTime: combineDateAndTime(
                                            ev.end.dateTime as string,
                                            e.target.value,
                                          ),
                                        });
                                      }
                                    }}
                                    style={{
                                      fontFamily: "var(--font-sans)",
                                      fontSize: 11,
                                      color: "var(--text-secondary)",
                                      border: "1px solid transparent",
                                      background: "transparent",
                                      borderRadius: 4,
                                      padding: "1px 2px",
                                      width: 62,
                                    }}
                                  />
                                </div>
                              ) : (
                                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                                  {formatEventTime(ev)}
                                </span>
                              )}
                              {rel.label && (
                                <span
                                  style={{
                                    fontFamily: "var(--font-sans)",
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: DUE_STYLES[rel.status].color,
                                    background: DUE_STYLES[rel.status].bg,
                                    border: `1px solid ${DUE_STYLES[rel.status].border}`,
                                    borderRadius: "var(--radius-xs)",
                                    padding: "1px 6px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  <AlertTriangle size={8} />
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
        </div>
      </div>
    </div>
  );
}
