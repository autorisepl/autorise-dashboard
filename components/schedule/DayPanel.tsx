"use client";

import { ChevronDown, ChevronUp, Plus, Repeat } from "lucide-react";
import { useRef, useState } from "react";
import type { CalendarEvent } from "@/app/api/google/calendar/route";
import { NoTimeTaskCard } from "@/components/schedule/DayNoTimeTask";
import {
  AttendanceDot,
  type AxisBlock,
  DayTimeAxis,
  nextAttendance,
} from "@/components/schedule/DayTimeAxis";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  axisPxToMinutes,
  computeAxisRange,
  DRAG_TYPE_EVENT,
  DRAG_TYPE_TASK,
  type DragPayload,
  type EventDragPayload,
  formatEventTime,
  localDateKey,
  type Priority,
  parseTimeRangeFromNotes,
  STICKY_ROW1_HEIGHT,
  type TaskWithList,
  timeStrToMinutes,
} from "@/lib/schedule/dateHelpers";

const NO_TIME_VISIBLE_CAP = 4;

interface DayPanelProps {
  day: Date;
  isToday: boolean;
  tasks: TaskWithList[];
  events: CalendarEvent[];
  now: Date;
  dragOverZone: string | null;
  setDragOverZone: (v: string | null) => void;
  priorityMap: Record<string, Priority>;
  toggleDone: (item: TaskWithList) => void;
  onOpenNewTask: (day: Date) => void;
  onOpenNewEvent: (day: Date) => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onOpenTask: (item: TaskWithList) => void;
  onSetAttendance: (eventId: string, attendanceStatus: "odbyto" | "nieodbyto" | null) => void;
  onResizeTask: (item: TaskWithList, newEndMin: number) => void;
  onResizeEvent: (event: CalendarEvent, newEndMin: number) => void;
  onDropTaskNoTime: (taskId: string, day: Date) => void;
  onDropTaskTimed: (taskId: string, day: Date, startMin: number) => void;
  onDropEvent: (eventId: string, day: Date) => void;
}

// Kolumna dnia: strefa "Bez godziny" (zwarta, capowana + "N więcej") nad osią czasu.
// DayPanel jest wyłącznie prezentacyjny/koordynujący — mutacje danych idą przez
// onOpenTask/onOpenEvent (wspólne popovery edycji) i onDrop*/onResize* (page.tsx trzyma
// jedyne źródło prawdy). Cała kolumna to JEDNA strefa dropu: pozycja kursora względem
// obszaru osi (mierzona przez axisWrapRef) decyduje czy zadanie ląduje bez godziny, czy
// z konkretną godziną wyliczoną z pozycji Y.
export function DayPanel({
  day,
  isToday,
  tasks,
  events,
  now,
  dragOverZone,
  setDragOverZone,
  priorityMap,
  toggleDone,
  onOpenNewTask,
  onOpenNewEvent,
  onOpenEvent,
  onOpenTask,
  onSetAttendance,
  onResizeTask,
  onResizeEvent,
  onDropTaskNoTime,
  onDropTaskTimed,
  onDropEvent,
}: DayPanelProps) {
  const zoneKey = `day-${localDateKey(day)}`;
  const isOver = dragOverZone === zoneKey;
  const [showAllNoTime, setShowAllNoTime] = useState(false);
  const axisWrapRef = useRef<HTMLDivElement>(null);

  const noTimeTasksAll = tasks.filter((t) => !parseTimeRangeFromNotes(t.task.notes));
  const timedTasks = tasks.filter((t) => parseTimeRangeFromNotes(t.task.notes));
  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay && e.start.dateTime && e.end.dateTime);
  const noTimeTasks = showAllNoTime ? noTimeTasksAll : noTimeTasksAll.slice(0, NO_TIME_VISIBLE_CAP);
  const hiddenNoTimeCount = noTimeTasksAll.length - noTimeTasks.length;

  const axisBlocks: AxisBlock[] = [
    ...timedEvents.map((event) => {
      const start = new Date(event.start.dateTime as string);
      const end = new Date(event.end.dateTime as string);
      const startMin = start.getHours() * 60 + start.getMinutes();
      const endMin = Math.max(end.getHours() * 60 + end.getMinutes(), startMin + 15);
      return { kind: "event" as const, id: event.id, startMin, endMin, event };
    }),
    ...timedTasks.map((item) => {
      const range = parseTimeRangeFromNotes(item.task.notes)!;
      const startMin = timeStrToMinutes(range.start);
      const endMin = Math.max(timeStrToMinutes(range.end), startMin + 15);
      return {
        kind: "task" as const,
        id: item.task.id,
        startMin,
        endMin,
        item,
        priority: priorityMap[item.task.id] ?? null,
      };
    }),
  ];
  const range = computeAxisRange(axisBlocks);

  function handleContentDragOver(e: React.DragEvent) {
    if (
      e.dataTransfer.types.includes(DRAG_TYPE_TASK) ||
      e.dataTransfer.types.includes(DRAG_TYPE_EVENT)
    ) {
      e.preventDefault();
      setDragOverZone(zoneKey);
    }
  }

  function handleContentDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOverZone(null);
    const taskRaw = e.dataTransfer.getData(DRAG_TYPE_TASK);
    const eventRaw = e.dataTransfer.getData(DRAG_TYPE_EVENT);
    const axisRect = axisWrapRef.current?.getBoundingClientRect();
    const withinAxis =
      Boolean(axisRect) && e.clientY >= axisRect!.top && e.clientY <= axisRect!.bottom;

    if (taskRaw) {
      const payload = JSON.parse(taskRaw) as DragPayload;
      if (withinAxis && axisRect) {
        const startMin = axisPxToMinutes(e.clientY - axisRect.top, range);
        onDropTaskTimed(payload.taskId, day, startMin);
      } else {
        onDropTaskNoTime(payload.taskId, day);
      }
      return;
    }
    if (eventRaw) {
      const payload = JSON.parse(eventRaw) as EventDragPayload;
      onDropEvent(payload.eventId, day);
    }
  }

  return (
    <Panel
      solid
      style={{
        padding: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "visible",
        background: isOver ? "var(--accent-muted)" : undefined,
        // Wyróżnienie dzisiejszej kolumny wzmocnione (zgłoszenie: sam cieńszy niebieski tekst
        // nagłówka był za słaby) — obwódka 2px zamiast 1.5px na całej kolumnie.
        border: isOver
          ? "1.5px dashed var(--accent)"
          : isToday
            ? "2px solid var(--accent)"
            : "1px solid var(--border)",
        boxShadow: isToday && !isOver ? "0 0 0 1px var(--accent-muted)" : undefined,
        transition: "background 150ms ease, border-color 150ms ease",
      }}
    >
      <div
        onDragOver={handleContentDragOver}
        onDragLeave={() => setDragOverZone(dragOverZone === zoneKey ? null : dragOverZone)}
        onDrop={handleContentDrop}
        style={{ display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}
      >
        {isOver && (
          <div
            style={{
              position: "absolute",
              inset: 6,
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              border: "1.5px dashed var(--accent)",
              borderRadius: "var(--radius-sm)",
              background: "var(--accent-muted)",
              opacity: 0.92,
              transition: "opacity 120ms ease",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--accent-text)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--accent-border)",
                borderRadius: "var(--radius-xs)",
                padding: "4px 10px",
              }}
            >
              Upuść, żeby zaplanować na ten dzień
            </span>
          </div>
        )}

        {/* Header dnia — sticky poniżej sticky Rzędu 1 */}
        <div
          style={{
            position: "sticky",
            top: STICKY_ROW1_HEIGHT,
            zIndex: 8,
            padding: "10px 12px 8px",
            borderBottom: isToday ? "1px solid var(--accent-border)" : "1px solid var(--border)",
            // Nieprzezroczyste (nie --accent-muted) — to element sticky, półprzezroczyste tło
            // przy scrollu przebijało treścią przewijaną pod spodem (ghosting).
            background: isToday ? "var(--accent-tint-opaque)" : "var(--bg)",
            borderTopLeftRadius: "var(--radius-lg)",
            borderTopRightRadius: "var(--radius-lg)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
            title={day.toLocaleDateString("pl-PL", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          >
            {day.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          {isToday && (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#fff",
                background: "var(--accent)",
                borderRadius: "var(--radius-xs)",
                padding: "2px 6px",
                flexShrink: 0,
              }}
            >
              Dziś
            </span>
          )}
          <button
            onClick={() => onOpenNewEvent(day)}
            title="Nowe wydarzenie tego dnia"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              background: "var(--accent-muted)",
              border: "1px solid var(--accent-border)",
              borderRadius: "var(--radius-xs)",
              cursor: "pointer",
              color: "var(--accent)",
              flexShrink: 0,
            }}
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Strefa bez godziny: wydarzenia całodniowe + zadania bez zakresu godzin, capowane */}
        <div style={{ padding: "8px 12px" }}>
          {allDayEvents.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
              {allDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  draggable
                  onDragStart={(e) => {
                    const payload: EventDragPayload = { eventId: ev.id };
                    e.dataTransfer.setData(DRAG_TYPE_EVENT, JSON.stringify(payload));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => onOpenEvent(ev)}
                  title={ev.summary}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 8px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--accent-muted)",
                    border: "1px solid var(--accent-border)",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  <AttendanceDot
                    status={ev.attendanceStatus}
                    onCycle={() => onSetAttendance(ev.id, nextAttendance(ev.attendanceStatus))}
                    size={13}
                  />
                  <span style={{ flex: 1, minWidth: 0, overflowWrap: "break-word" }}>
                    {ev.summary}
                  </span>
                  {ev.recurringEventId && (
                    <Repeat size={11} color="var(--accent-text)" style={{ flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      flexShrink: 0,
                      marginLeft: "auto",
                      color: "var(--text-tertiary)",
                      fontWeight: 400,
                    }}
                  >
                    {formatEventTime(ev)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <SectionLabel paddingX={0} style={{ fontSize: 10, fontWeight: 700 }}>
            Bez godziny ({noTimeTasksAll.length})
          </SectionLabel>
          {noTimeTasksAll.length === 0 ? (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                padding: "4px 0",
                fontFamily: "var(--font-sans)",
              }}
            >
              Przeciągnij zadanie tutaj albo dodaj nowe.
            </div>
          ) : (
            <div>
              {noTimeTasks.map((item) => (
                <NoTimeTaskCard
                  key={item.task.id}
                  item={item}
                  priority={priorityMap[item.task.id] ?? null}
                  toggleDone={toggleDone}
                  onOpen={onOpenTask}
                />
              ))}
              {noTimeTasksAll.length > NO_TIME_VISIBLE_CAP && (
                <button
                  onClick={() => setShowAllNoTime((v) => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "3px 6px",
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--accent-text)",
                  }}
                >
                  {showAllNoTime ? (
                    <>
                      <ChevronUp size={11} /> Zwiń
                    </>
                  ) : (
                    <>
                      <ChevronDown size={11} /> +{hiddenNoTimeCount} więcej
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => onOpenNewTask(day)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px 0 0",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-tertiary)",
            }}
          >
            <Plus size={12} /> Dodaj zadanie na ten dzień
          </button>
        </div>

        <div ref={axisWrapRef}>
          <DayTimeAxis
            range={range}
            blocks={axisBlocks}
            isToday={isToday}
            now={now}
            onOpenEvent={onOpenEvent}
            onOpenTask={onOpenTask}
            onSetAttendance={onSetAttendance}
            toggleDone={toggleDone}
            onResizeTask={onResizeTask}
            onResizeEvent={onResizeEvent}
          />
        </div>
        <div style={{ height: 12 }} />
      </div>
    </Panel>
  );
}
