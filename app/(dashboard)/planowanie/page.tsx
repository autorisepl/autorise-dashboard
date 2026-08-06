"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarEvent, CalendarResponse } from "@/app/api/google/calendar/route";
import type { GoogleTask, GoogleTasksResponse } from "@/app/api/google/tasks/route";
import { FinancePanel } from "@/components/finance/FinancePanel";
import { DayPanel } from "@/components/schedule/DayPanel";
import {
  type EventDraft,
  EventEditor,
  eventToDraft,
  newDraftAt,
} from "@/components/schedule/EventEditor";
import { PlanningSidebar } from "@/components/schedule/PlanningSidebar";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  addDays,
  DRAG_TYPE_PRIORITIZED,
  DRAG_TYPE_UNASSIGNED,
  type DragPayload,
  eventDateKey,
  formatWeekRange,
  localDateKey,
  PRIORITY_LEVELS,
  type Priority,
  parsePriorityFromNotes,
  setPriorityInNotes,
  sortEventsChronologically,
  sortTasksChronologically,
  startOfWeek,
  type TaskWithList,
  taskDateKey,
} from "@/lib/schedule/dateHelpers";

const EXCLUDED_LIST_NAME = "Pomysły i inspiracje";
// Klucz legacy — priorytet dawniej trzymany wyłącznie w localStorage tej przeglądarki,
// migrowany jednorazowo do notes zadania (patrz efekt migracji niżej), potem usuwany.
const PRIORITY_STORAGE_KEY = "autorise_planowanie_priority";
const TICK_MS = 30_000;

export default function PlanowaniePage() {
  const [lists, setLists] = useState<{ id: string; title: string }[]>([]);
  const [tasksByList, setTasksByList] = useState<Record<string, GoogleTask[]>>({});
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  const [editorDraft, setEditorDraft] = useState<EventDraft | null>(null);
  const [editorSourceEvent, setEditorSourceEvent] = useState<CalendarEvent | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const weekStart = addDays(startOfWeek(new Date()), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayKey = localDateKey(new Date());
  const weekContainsToday = weekDays.some((d) => localDateKey(d) === todayKey);

  // Priorytet: trwały w polu notes zadania Google Task (tag "[priorytet:...]"), więc przetrwa
  // niezależnie od przeglądarki/urządzenia. Mapa jest wyłącznie pochodną tasksByList.
  const priorityMap = useMemo(() => {
    const map: Record<string, Priority> = {};
    for (const list of lists) {
      for (const t of tasksByList[list.id] ?? []) {
        const p = parsePriorityFromNotes(t.notes);
        if (p) map[t.id] = p;
      }
    }
    return map;
  }, [lists, tasksByList]);

  // Migracja jednorazowa: stare priorytety z localStorage (dawny mechanizm) dopisywane do
  // notes zadania. Klucz lokalny jest czyszczony DOPIERO gdy WSZYSTKIE zapisy PATCH faktycznie
  // się powiodły — jeśli którykolwiek zawiedzie (np. brak sieci), localStorage zostaje
  // nietknięty i migratedRef nie jest ustawiany, więc próba powtórzy się przy kolejnym
  // odświeżeniu danych zamiast po cichu zgubić priorytet.
  const migratingPriorityRef = useRef(false);
  useEffect(() => {
    if (migratingPriorityRef.current) return;
    if (lists.length === 0 || Object.keys(tasksByList).length === 0) return;

    const raw = localStorage.getItem(PRIORITY_STORAGE_KEY);
    if (!raw) return;

    let legacy: Record<string, Priority>;
    try {
      legacy = JSON.parse(raw) as Record<string, Priority>;
    } catch {
      localStorage.removeItem(PRIORITY_STORAGE_KEY); // zły JSON — nic do migracji, nic do stracenia
      return;
    }

    const toMigrate: { listId: string; taskId: string; notes: string | undefined }[] = [];
    for (const list of lists) {
      for (const t of tasksByList[list.id] ?? []) {
        const legacyPriority = legacy[t.id];
        if (!legacyPriority || parsePriorityFromNotes(t.notes)) continue;
        toMigrate.push({ listId: list.id, taskId: t.id, notes: t.notes });
      }
    }
    if (toMigrate.length === 0) {
      localStorage.removeItem(PRIORITY_STORAGE_KEY);
      return;
    }

    migratingPriorityRef.current = true;
    void (async () => {
      const results = await Promise.all(
        toMigrate.map(({ listId, taskId, notes }) =>
          fetch("/api/google/tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              listId,
              taskId,
              notes: setPriorityInNotes(notes, legacy[taskId]),
            }),
          })
            .then((r) => r.ok)
            .catch(() => false),
        ),
      );

      if (results.every(Boolean)) {
        setTasksByList((prev) => {
          const next = { ...prev };
          for (const { listId, taskId, notes } of toMigrate) {
            next[listId] = (next[listId] ?? []).map((x) =>
              x.id === taskId ? { ...x, notes: setPriorityInNotes(notes, legacy[taskId]) } : x,
            );
          }
          return next;
        });
        localStorage.removeItem(PRIORITY_STORAGE_KEY);
      } else {
        // Część zapisów zawiodła — zostaw localStorage, spróbuj ponownie przy kolejnym ładowaniu.
        migratingPriorityRef.current = false;
      }
    })();
  }, [lists, tasksByList]);

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
    // weekStart zależy tylko od weekOffset — świadomie w deps zamiast obiektu Date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
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

  const defaultListId = useCallback((): string | null => {
    if (lists.length === 0) return null;
    const home = lists.find((l) => l.title.toLowerCase().includes("domow"));
    return (home ?? lists[0]).id;
  }, [lists]);

  const patchTask = useCallback((listId: string, taskId: string, patch: Partial<GoogleTask>) => {
    setTasksByList((prev) => ({
      ...prev,
      [listId]: (prev[listId] ?? []).map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }));
    void fetch("/api/google/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, taskId, ...patch }),
    }).catch(() => void 0);
  }, []);

  const deleteTask = useCallback((listId: string, taskId: string) => {
    setTasksByList((prev) => ({
      ...prev,
      [listId]: (prev[listId] ?? []).filter((t) => t.id !== taskId),
    }));
    void fetch("/api/google/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, taskId }),
    }).catch(() => void 0);
  }, []);

  const createTaskInList = useCallback(
    async (listId: string, title: string, due?: string) => {
      const tempId = `temp-${Date.now()}`;
      const tempTask: GoogleTask = {
        id: tempId,
        title,
        status: "needsAction",
        due,
        updated: new Date().toISOString(),
      };
      setTasksByList((prev) => ({
        ...prev,
        [listId]: [tempTask, ...(prev[listId] ?? [])],
      }));
      try {
        const res = await fetch("/api/google/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listId, title, due }),
        });
        const json = (await res.json()) as { task?: GoogleTask };
        const realTask = json.task;
        if (realTask) {
          setTasksByList((prev) => {
            const list = prev[listId] ?? [];
            const optimistic = list.find((t) => t.id === tempId);
            // Jeśli w czasie między optymistycznym dodaniem a odpowiedzią POST użytkownik zdążył
            // ustawić priorytet (cyklPriority/drag do strefy) na tymczasowym ID, ten zapis poszedł
            // przeciw nieistniejącemu jeszcze zadaniu i się nie powiódł — realny task z serwera
            // nadpisywał go w całości, więc priorytet po cichu znikał. Zachowaj lokalną notatkę
            // i dograj ją PATCH-em teraz, gdy mamy już prawdziwe ID.
            const merged: GoogleTask =
              optimistic?.notes && optimistic.notes !== realTask.notes
                ? { ...realTask, notes: optimistic.notes }
                : realTask;
            if (merged !== realTask) {
              void fetch("/api/google/tasks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId, taskId: realTask.id, notes: merged.notes }),
              }).catch(() => void 0);
            }
            return { ...prev, [listId]: list.map((t) => (t.id === tempId ? merged : t)) };
          });
        }
      } catch {
        void load();
      }
    },
    [load],
  );

  const cyclePriority = useCallback(
    (taskId: string) => {
      const found = findTask(taskId);
      if (!found) return;
      const current = parsePriorityFromNotes(found.task.notes);
      const idx = current ? PRIORITY_LEVELS.indexOf(current) : -1;
      const next = PRIORITY_LEVELS[idx + 1] ?? null;
      patchTask(found.listId, found.task.id, {
        notes: setPriorityInNotes(found.task.notes, next) || undefined,
      });
    },
    [findTask, patchTask],
  );

  const toggleDone = useCallback(
    (item: TaskWithList) => {
      const nextStatus = item.task.status === "completed" ? "needsAction" : "completed";
      patchTask(item.listId, item.task.id, { status: nextStatus });
    },
    [patchTask],
  );

  // ── Wydarzenia ──
  const patchEventInline = useCallback((eventId: string, patch: Record<string, string>) => {
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

  // Potwierdzenie odbycia przeszłego wydarzenia, trwałe w Google Calendar (extendedProperties),
  // null = cofnij potwierdzenie.
  const patchEventAttendance = useCallback(
    (eventId: string, attendanceStatus: "odbyto" | "nieodbyto" | null) => {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, attendanceStatus: attendanceStatus ?? undefined } : e,
        ),
      );
      void fetch(`/api/google/calendar/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceStatus }),
      }).catch(() => void 0);
    },
    [],
  );

  const saveEvent = useCallback(
    async (d: EventDraft) => {
      setSavingEvent(true);
      setEditorError(null);
      const startDateTime = new Date(`${d.date}T${d.startTime}`).toISOString();
      const endDateTime = new Date(`${d.date}T${d.endTime}`).toISOString();
      if (new Date(endDateTime) <= new Date(startDateTime)) {
        setEditorError("Godzina zakończenia musi być po godzinie rozpoczęcia.");
        setSavingEvent(false);
        return;
      }
      const payload = {
        summary: d.summary.trim(),
        startDateTime,
        endDateTime,
        location: d.location.trim(),
        description: d.description.trim(),
      };
      try {
        const res = d.id
          ? await fetch(`/api/google/calendar/${d.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/google/calendar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
        const json = await res.json();
        if (!res.ok) {
          setEditorError(json.error ?? "Nie udało się zapisać wydarzenia.");
          return;
        }
        setEditorDraft(null);
        setEditorSourceEvent(null);
        void load();
      } catch {
        setEditorError("Błąd połączenia z serwerem.");
      } finally {
        setSavingEvent(false);
      }
    },
    [load],
  );

  const deleteEventById = useCallback(
    async (id: string) => {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      try {
        await fetch(`/api/google/calendar/${id}`, { method: "DELETE" });
      } catch {
        void load();
      }
    },
    [load],
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
    const matched = allActive.filter((t) => {
      const k = taskDateKey(t.task.due);
      if (!k) return false;
      if (k === dayKey) return true;
      // Zaległe (przed tym dniem) doklejane WYŁĄCZNIE do panelu dzisiejszego dnia.
      if (isToday && k < dayKey) return true;
      return false;
    });
    return sortTasksChronologically(matched);
  }

  function eventsForDay(dayKey: string): CalendarEvent[] {
    return sortEventsChronologically(events.filter((ev) => eventDateKey(ev) === dayKey));
  }

  function handlePriorityDrop(e: React.DragEvent, level: Priority) {
    e.preventDefault();
    setDragOverZone(null);
    const raw =
      e.dataTransfer.getData(DRAG_TYPE_UNASSIGNED) || e.dataTransfer.getData(DRAG_TYPE_PRIORITIZED);
    if (!raw) return;
    const payload = JSON.parse(raw) as DragPayload;
    const found = findTask(payload.taskId);
    if (!found) return;
    patchTask(found.listId, found.task.id, { notes: setPriorityInNotes(found.task.notes, level) });
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
    patchTask(found.listId, found.task.id, {
      due: due.toISOString(),
      notes: setPriorityInNotes(found.task.notes, null) || undefined,
    });
  }

  function quickAddForDay(day: Date, title: string) {
    const listId = defaultListId();
    if (!listId) return;
    const due = new Date(day);
    due.setHours(0, 0, 0, 0);
    void createTaskInList(listId, title, due.toISOString());
  }

  function addUnassignedTask(title: string) {
    const listId = defaultListId();
    if (!listId) return;
    void createTaskInList(listId, title);
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PageHeader icon={<CalendarDays size={15} color="var(--accent)" />} title="Planowanie">
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            setEditorSourceEvent(null);
            setEditorDraft(newDraftAt(weekContainsToday ? new Date() : weekStart));
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 12px",
            background: "var(--accent)",
            border: "none",
            borderRadius: "var(--radius-xs)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
          }}
        >
          <Plus size={13} /> Nowe wydarzenie
        </button>
        <button
          onClick={() => void load()}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
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

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div
          style={{
            marginBottom: 14,
            padding: "9px 12px",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-hover)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          Priorytet zadania zapisywany jest w notatce zadania Google Task (tag "[priorytet:...]") —
          przetrwa niezależnie od przeglądarki i urządzenia.
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
              color: "var(--error-text)",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {/* Kolumna boczna: Nieprzypisane/Priorytetyzacja + Finanse osobiste, ten sam wąski
              format co Strefa priorytetyzacji, świadomie NIE pełnowymiarowa sekcja */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: 14, width: 300, flexShrink: 0 }}
          >
            <PlanningSidebar
              unassigned={unassigned}
              prioritizedByLevel={prioritizedByLevel}
              loading={loading}
              dragOverZone={dragOverZone}
              setDragOverZone={setDragOverZone}
              onPriorityDrop={handlePriorityDrop}
              onAddTask={addUnassignedTask}
            />
            <FinancePanel compact />
          </div>

          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
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

            {/* Siatka 7 dni */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(200px, 1fr))",
                gap: 10,
                overflowX: "auto",
                paddingBottom: 4,
              }}
            >
              {weekDays.map((day) => {
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
                    deleteTask={deleteTask}
                    toggleDone={toggleDone}
                    priorityMap={priorityMap}
                    cyclePriority={cyclePriority}
                    onQuickAddTask={quickAddForDay}
                    onOpenNewEvent={(d) => {
                      setEditorSourceEvent(null);
                      setEditorDraft(newDraftAt(d));
                    }}
                    onEditEvent={(ev) => {
                      setEditorSourceEvent(ev);
                      setEditorDraft(eventToDraft(ev));
                    }}
                    onDeleteEvent={(id) => void deleteEventById(id)}
                    onPatchEvent={patchEventInline}
                    onSetAttendance={patchEventAttendance}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {editorDraft && (
        <EventEditor
          initial={editorDraft}
          sourceEvent={editorSourceEvent}
          saving={savingEvent}
          error={editorError}
          onSave={saveEvent}
          onDelete={
            editorDraft.id
              ? () => {
                  const id = editorDraft.id!;
                  setEditorDraft(null);
                  setEditorSourceEvent(null);
                  void deleteEventById(id);
                }
              : null
          }
          onClose={() => {
            setEditorDraft(null);
            setEditorSourceEvent(null);
            setEditorError(null);
          }}
        />
      )}
    </div>
  );
}
