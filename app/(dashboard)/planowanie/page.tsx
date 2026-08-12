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
import { type NewTaskInput, TaskEditor } from "@/components/schedule/TaskEditor";
import { WeekStatsBar } from "@/components/schedule/WeekStatsBar";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  addDays,
  advanceRecurrenceDate,
  detectRecurringTasks,
  eventDateKey,
  formatWeekRange,
  localDateKey,
  MIN_BLOCK_DURATION_MIN,
  MINUTES_IN_DAY,
  minutesToTimeStr,
  type Priority,
  parsePriorityFromNotes,
  parseRecurrenceFromNotes,
  parseTimeRangeFromNotes,
  recurrenceToRRule,
  STICKY_ROW1_HEIGHT,
  setPriorityInNotes,
  setTimeRangeInNotes,
  sortEventsChronologically,
  sortTasksChronologically,
  startOfWeek,
  type TaskPatch,
  type TaskWithList,
  taskDateKey,
  timeStrToMinutes,
  weekCompletionStats,
} from "@/lib/schedule/dateHelpers";

const EXCLUDED_LIST_NAME = "Pomysły i inspiracje";
// Klucz legacy — priorytet dawniej trzymany wyłącznie w localStorage tej przeglądarki,
// migrowany jednorazowo do notes zadania (patrz efekt migracji niżej), potem usuwany.
const PRIORITY_STORAGE_KEY = "autorise_planowanie_priority";
const TICK_MS = 30_000;
const DEFAULT_TASK_DURATION_MIN = 60;

export default function PlanowaniePage() {
  const [lists, setLists] = useState<{ id: string; title: string }[]>([]);
  const [tasksByList, setTasksByList] = useState<Record<string, GoogleTask[]>>({});
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  // Startowa wartość MUSI być deterministyczna i identyczna na serwerze i kliencie (epoch,
  // nie new Date()) — inaczej hydration mismatch przy każdym renderze, który akurat trafia na
  // przełom minuty/dnia między SSR a hydracją (np. właśnie o północy). Realny czas ustawiany
  // dopiero w efekcie po mouncie, czyli wyłącznie po stronie klienta.
  const [now, setNow] = useState<Date>(() => new Date(0));
  const [mounted, setMounted] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const [editorDraft, setEditorDraft] = useState<EventDraft | null>(null);
  const [editorSourceEvent, setEditorSourceEvent] = useState<CalendarEvent | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  // Jedyny popover tworzenia/edycji zadania w całym /planowanie (nagłówek nie ma odpowiednika
  // dla zadań, ale panel dnia i Nieprzypisane wcześniej miały osobne, ubogie inline-inputy
  // z samym tytułem — patrz audyt spójności przycisków dodawania w treści zadania).
  const [taskEditor, setTaskEditor] = useState<
    { mode: "edit"; item: TaskWithList } | { mode: "create"; date: string } | null
  >(null);

  const weekStart = addDays(startOfWeek(new Date()), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekdayDays = weekDays.slice(0, 5);
  const weekendDays = weekDays.slice(5, 7);
  // "dziś" istnieje wyłącznie po mouncie z tego samego powodu co stan `now` wyżej — przed
  // hydracją żadna kolumna nie jest oznaczana jako dzisiejsza (identyczne SSR i pierwszy
  // render klienta), korekta następuje bezpiecznie po hydracji.
  const todayKey = mounted ? localDateKey(now) : "";
  const weekContainsToday = mounted && weekDays.some((d) => localDateKey(d) === todayKey);

  const weekStats = useMemo(
    () => weekCompletionStats(lists, tasksByList, events, weekDays),
    // weekDays zależy tylko od weekOffset — świadomie referencja jest inna przy każdym renderze,
    // ale wartości pochodne (klucze dni) są identyczne, więc liczymy po weekOffset zamiast po
    // tablicy Date, ten sam wzorzec co load() niżej.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists, tasksByList, events, weekOffset],
  );
  const recurringTasks = useMemo(
    () => detectRecurringTasks(lists, tasksByList, weekDays),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists, tasksByList, weekOffset],
  );

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

  // Pierwsze ustawienie realnego czasu (po mouncie, wyłącznie klient) + tick co 30s —
  // odświeża etykiety "za X min"/"dziś"/"spóźnione" bez ponownego fetchowania.
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
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

  const patchTask = useCallback((listId: string, taskId: string, patch: TaskPatch) => {
    setTasksByList((prev) => ({
      ...prev,
      [listId]: (prev[listId] ?? []).map((t) =>
        t.id === taskId
          ? { ...t, ...patch, due: patch.due === null ? undefined : (patch.due ?? t.due) }
          : t,
      ),
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
    async (listId: string, title: string, due?: string, notes?: string) => {
      const tempId = `temp-${Date.now()}`;
      const tempTask: GoogleTask = {
        id: tempId,
        title,
        status: "needsAction",
        due,
        notes,
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
          body: JSON.stringify({ listId, title, due, notes }),
        });
        const json = (await res.json()) as { task?: GoogleTask };
        const realTask = json.task;
        if (realTask) {
          setTasksByList((prev) => {
            const list = prev[listId] ?? [];
            const optimistic = list.find((t) => t.id === tempId);
            // Jeśli w czasie między optymistycznym dodaniem a odpowiedzią POST użytkownik zdążył
            // ustawić priorytet/godzinę na tymczasowym ID, ten zapis poszedł przeciw
            // nieistniejącemu jeszcze zadaniu i się nie powiódł — realny task z serwera
            // nadpisywał go w całości, więc zmiana po cichu znikała. Zachowaj lokalną notatkę
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

  // Zaznaczenie zadania powtarzalnego jako wykonane od razu tworzy KOLEJNE realne zadanie w
  // Google Tasks (POST, nie lokalny stan) z terminem przesuniętym o jeden cykl — Google Tasks
  // API nie ma własnego mechanizmu powtarzalności, więc silnik musi żyć tutaj. Odznaczenie
  // (completed -> needsAction) świadomie NIE cofa/kasuje utworzonego już następnego wystąpienia.
  const toggleDone = useCallback(
    (item: TaskWithList) => {
      const completing = item.task.status !== "completed";
      const nextStatus = completing ? "completed" : "needsAction";
      patchTask(item.listId, item.task.id, { status: nextStatus });

      if (completing) {
        const recurrence = parseRecurrenceFromNotes(item.task.notes);
        if (recurrence && item.task.due) {
          const nextDue = advanceRecurrenceDate(item.task.due, recurrence);
          void createTaskInList(item.listId, item.task.title, nextDue, item.task.notes);
        }
      }
    },
    [patchTask, createTaskInList],
  );

  // ── Popover tworzenia/edycji zadania (jednolity kontrakt: KAŻDY przycisk "Dodaj zadanie"
  // i klik na dowolnej karcie otwierają dokładnie ten sam formularz) ──
  const openTask = useCallback((item: TaskWithList) => setTaskEditor({ mode: "edit", item }), []);
  const openNewTask = useCallback(
    (day?: Date) => setTaskEditor({ mode: "create", date: day ? localDateKey(day) : "" }),
    [],
  );

  const saveTaskFromEditor = useCallback(
    (patch: TaskPatch) => {
      if (taskEditor?.mode !== "edit") return;
      patchTask(taskEditor.item.listId, taskEditor.item.task.id, patch);
      setTaskEditor(null);
    },
    [taskEditor, patchTask],
  );

  const createTaskFromEditor = useCallback(
    (input: NewTaskInput) => {
      const listId = defaultListId();
      if (!listId) return;
      const due = input.due ? new Date(`${input.due}T00:00:00`).toISOString() : undefined;
      void createTaskInList(listId, input.title, due, input.notes);
      setTaskEditor(null);
    },
    [defaultListId, createTaskInList],
  );

  const deleteTaskFromEditor = useCallback(() => {
    if (taskEditor?.mode !== "edit") return;
    deleteTask(taskEditor.item.listId, taskEditor.item.task.id);
    setTaskEditor(null);
  }, [taskEditor, deleteTask]);

  // ── Drag&drop zadań: dowolna karta -> dowolny dzień (z godziną albo bez) -> Nieprzypisane ──
  const moveTaskNoTime = useCallback(
    (taskId: string, day: Date) => {
      const found = findTask(taskId);
      if (!found) return;
      patchTask(found.listId, found.task.id, {
        due: localDateKey(day),
        notes: setTimeRangeInNotes(found.task.notes, null) || undefined,
      });
    },
    [findTask, patchTask],
  );

  const moveTaskTimed = useCallback(
    (taskId: string, day: Date, startMin: number) => {
      const found = findTask(taskId);
      if (!found) return;
      const existingRange = parseTimeRangeFromNotes(found.task.notes);
      const durationMin = existingRange
        ? Math.max(
            timeStrToMinutes(existingRange.end) - timeStrToMinutes(existingRange.start),
            MIN_BLOCK_DURATION_MIN,
          )
        : DEFAULT_TASK_DURATION_MIN;
      const endMin = Math.min(startMin + durationMin, MINUTES_IN_DAY);
      patchTask(found.listId, found.task.id, {
        due: localDateKey(day),
        notes:
          setTimeRangeInNotes(found.task.notes, {
            start: minutesToTimeStr(startMin),
            end: minutesToTimeStr(endMin),
          }) || undefined,
      });
    },
    [findTask, patchTask],
  );

  const unassignTask = useCallback(
    (taskId: string) => {
      const found = findTask(taskId);
      if (!found) return;
      patchTask(found.listId, found.task.id, {
        due: null,
        notes: setTimeRangeInNotes(found.task.notes, null) || undefined,
      });
    },
    [findTask, patchTask],
  );

  const resizeTask = useCallback(
    (item: TaskWithList, newEndMin: number) => {
      const range = parseTimeRangeFromNotes(item.task.notes);
      const startStr =
        range?.start ?? minutesToTimeStr(Math.max(0, newEndMin - DEFAULT_TASK_DURATION_MIN));
      patchTask(item.listId, item.task.id, {
        notes:
          setTimeRangeInNotes(item.task.notes, {
            start: startStr,
            end: minutesToTimeStr(newEndMin),
          }) || undefined,
      });
    },
    [patchTask],
  );

  // ── Wydarzenia ──
  // Generalny inline-patch: obsługuje zarówno godzinowe (dateTime) jak i całodniowe (date)
  // pola naraz, bo drag&drop przenoszący wydarzenie między dniami musi działać dla obu typów.
  const patchEventInline = useCallback((eventId: string, patch: Record<string, string>) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          summary: patch.summary ?? e.summary,
          start: patch.startDateTime
            ? { dateTime: patch.startDateTime }
            : patch.startDate
              ? { date: patch.startDate }
              : e.start,
          end: patch.endDateTime
            ? { dateTime: patch.endDateTime }
            : patch.endDate
              ? { date: patch.endDate }
              : e.end,
          allDay: patch.startDate ? true : patch.startDateTime ? false : e.allDay,
        };
      }),
    );
    void fetch(`/api/google/calendar/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => void 0);
  }, []);

  const moveEventToDay = useCallback(
    (eventId: string, day: Date) => {
      const ev = events.find((e) => e.id === eventId);
      if (!ev) return;
      if (ev.allDay) {
        patchEventInline(eventId, {
          startDate: localDateKey(day),
          endDate: localDateKey(addDays(day, 1)),
        });
        return;
      }
      if (!ev.start.dateTime || !ev.end.dateTime) return;
      const origStart = new Date(ev.start.dateTime);
      const origEnd = new Date(ev.end.dateTime);
      const durationMs = origEnd.getTime() - origStart.getTime();
      const newStart = new Date(day);
      newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
      const newEnd = new Date(newStart.getTime() + durationMs);
      patchEventInline(eventId, {
        startDateTime: newStart.toISOString(),
        endDateTime: newEnd.toISOString(),
      });
    },
    [events, patchEventInline],
  );

  const resizeEvent = useCallback(
    (event: CalendarEvent, newEndMin: number) => {
      if (!event.start.dateTime) return;
      const dayStart = new Date(event.start.dateTime);
      dayStart.setHours(0, 0, 0, 0);
      const newEnd = new Date(dayStart.getTime() + newEndMin * 60_000);
      patchEventInline(event.id, { endDateTime: newEnd.toISOString() });
    },
    [patchEventInline],
  );

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
      // Godzina końca <= godzina startu = wydarzenie kończy się następnego dnia (np. impreza
      // 18:30-01:00), NIE błąd — dawniej blokowane twardą walidacją, zgłoszone jako realny
      // brak. EventEditor pokazuje użytkownikowi jawną informację o tym przesunięciu.
      const endDateBase =
        d.endTime <= d.startTime
          ? addDays(new Date(`${d.date}T00:00:00`), 1)
          : new Date(`${d.date}T00:00:00`);
      const endDateTime = new Date(`${localDateKey(endDateBase)}T${d.endTime}`).toISOString();
      const payload = {
        summary: d.summary.trim(),
        startDateTime,
        endDateTime,
        location: d.location.trim(),
        description: d.description.trim(),
        // recurrence wyłącznie przy tworzeniu (d.id brak) — patrz komentarz w EventDraft.
        recurrence: !d.id && d.recurrence ? [recurrenceToRRule(d.recurrence)] : undefined,
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

  // ── Grupowanie: nieprzypisane / per-dzień ─────────────────────────────────────────────
  const allActive: TaskWithList[] = [];
  for (const list of lists) {
    for (const task of tasksByList[list.id] ?? []) {
      if (task.status === "completed") continue;
      allActive.push({ task, listId: list.id, listTitle: list.title });
    }
  }

  // Priorytet jest polem widocznym wprost na zadaniu (Nieprzypisane albo w dniu), nie osobną
  // strefą przeciągania — zadanie bez terminu trafia tu niezależnie od tego, czy ma priorytet.
  const unassigned = allActive.filter((t) => !t.task.due);

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

  function renderDayColumn(day: Date) {
    const key = localDateKey(day);
    const isToday = key === todayKey && weekContainsToday;
    return (
      <div key={key} style={{ flex: 1, minWidth: 0 }}>
        <DayPanel
          day={day}
          isToday={isToday}
          tasks={tasksForDay(key, isToday)}
          events={eventsForDay(key)}
          now={now}
          dragOverZone={dragOverZone}
          setDragOverZone={setDragOverZone}
          priorityMap={priorityMap}
          toggleDone={toggleDone}
          onOpenNewTask={openNewTask}
          onOpenNewEvent={(d) => {
            setEditorSourceEvent(null);
            setEditorDraft(newDraftAt(d));
          }}
          onOpenEvent={(ev) => {
            setEditorSourceEvent(ev);
            setEditorDraft(eventToDraft(ev));
          }}
          onOpenTask={openTask}
          onSetAttendance={patchEventAttendance}
          onResizeTask={resizeTask}
          onResizeEvent={resizeEvent}
          onDropTaskNoTime={moveTaskNoTime}
          onDropTaskTimed={moveTaskTimed}
          onDropEvent={moveEventToDay}
        />
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PageHeader icon={<CalendarDays size={15} color="var(--accent)" />} title="Planowanie">
        <div style={{ flex: 1 }} />
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

        {/* Rząd 1: nawigacja tygodnia + Nowe wydarzenie, sticky przy scrollu pionowym.
            Wszystkie dzieci mają flexShrink:0 + whiteSpace:nowrap i kontener overflowX:auto —
            dawniej bez tego przyciski przy węższym viewporcie łamały tekst wewnątrz siebie
            (zamiast się zwyczajnie przewinąć), co rozciągało wysokość rzędu ponad sztywne
            STICKY_ROW1_HEIGHT i psuło offset "top" nagłówków dni (nakładały się na siebie). */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            height: STICKY_ROW1_HEIGHT,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--bg)",
            marginBottom: 14,
            overflowX: "auto",
            overflowY: "hidden",
          }}
        >
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
              whiteSpace: "nowrap",
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
              flexShrink: 0,
              whiteSpace: "nowrap",
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
              flexShrink: 0,
              whiteSpace: "nowrap",
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
          <button
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
            style={{
              flexShrink: 0,
              whiteSpace: "nowrap",
              height: 30,
              padding: "0 10px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              cursor: weekOffset === 0 ? "default" : "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: weekOffset === 0 ? "var(--text-tertiary)" : "var(--accent-text)",
              opacity: weekOffset === 0 ? 0.5 : 1,
            }}
          >
            Bieżący tydzień
          </button>
          <div style={{ flex: 1, minWidth: 12 }} />
          <button
            onClick={() => {
              setEditorSourceEvent(null);
              setEditorDraft(newDraftAt(weekContainsToday ? new Date() : weekStart));
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexShrink: 0,
              whiteSpace: "nowrap",
              height: 30,
              padding: "0 12px",
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
        </div>

        <WeekStatsBar stats={weekStats} recurring={recurringTasks} />

        {/* Rząd 2: pięć dni roboczych, pełna szerokość, bez panelu bocznego */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          {weekdayDays.map((day) => renderDayColumn(day))}
        </div>

        {/* Rząd 3: sobota + niedziela + Nieprzypisane + Finanse osobiste, jeden rząd */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14 }}>
          {weekendDays.map((day) => renderDayColumn(day))}
          <div style={{ flex: 1, minWidth: 0 }}>
            <PlanningSidebar
              unassigned={unassigned}
              priorityMap={priorityMap}
              loading={loading}
              toggleDone={toggleDone}
              onOpenNewTask={() => openNewTask()}
              onOpenTask={openTask}
              dragOverZone={dragOverZone}
              setDragOverZone={setDragOverZone}
              onDropUnassign={unassignTask}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FinancePanel compact />
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

      {taskEditor && (
        <TaskEditor
          item={taskEditor.mode === "edit" ? taskEditor.item : null}
          initialDate={taskEditor.mode === "create" ? taskEditor.date : undefined}
          priority={
            taskEditor.mode === "edit" ? (priorityMap[taskEditor.item.task.id] ?? null) : null
          }
          onSave={saveTaskFromEditor}
          onCreate={createTaskFromEditor}
          onDelete={taskEditor.mode === "edit" ? deleteTaskFromEditor : null}
          onClose={() => setTaskEditor(null)}
        />
      )}
    </div>
  );
}
