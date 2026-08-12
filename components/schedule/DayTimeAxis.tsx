"use client";

import { Check, Repeat, X } from "lucide-react";
import { useState } from "react";
import type { CalendarEvent } from "@/app/api/google/calendar/route";
import { Badge } from "@/components/ui/Badge";
import {
  type AxisRange,
  axisRangeHeightPx,
  DRAG_TYPE_EVENT,
  DRAG_TYPE_TASK,
  type DragPayload,
  type EventDragPayload,
  formatEventTime,
  MIN_BLOCK_DURATION_MIN,
  minutesToAxisPx,
  minutesToTimeStr,
  PRIORITY_STYLE,
  type Priority,
  PX_PER_HOUR,
  packOverlappingBlocks,
  parseRecurrenceFromNotes,
  type TaskWithList,
} from "@/lib/schedule/dateHelpers";

const AXIS_GUTTER = 30;

export interface AxisEventBlock {
  kind: "event";
  id: string;
  startMin: number;
  endMin: number;
  event: CalendarEvent;
}

export interface AxisTaskBlock {
  kind: "task";
  id: string;
  startMin: number;
  endMin: number;
  item: TaskWithList;
  priority: Priority | null;
}

export type AxisBlock = AxisEventBlock | AxisTaskBlock;

interface ResizeState {
  id: string;
  deltaMin: number;
}

function useBlockResize() {
  const [resizing, setResizing] = useState<ResizeState | null>(null);

  function start(id: string, onCommit: (deltaMin: number) => void) {
    return (downEvent: React.MouseEvent) => {
      downEvent.preventDefault();
      downEvent.stopPropagation();
      const startY = downEvent.clientY;
      // Throttle przez requestAnimationFrame: myszy o wysokiej częstotliwości raportowania
      // potrafią wywołać mousemove znacznie częściej niż odświeżanie ekranu, a każde wywołanie
      // to setState + re-render całej osi dnia — bez throttlingu to była realna przyczyna
      // "szarpanego" przeciągania/resize. Tylko OSTATNIA pozycja z danej klatki trafia do stanu.
      let rafId: number | null = null;
      let pendingClientY = downEvent.clientY;

      function deltaFromY(clientY: number): number {
        const rawMin = ((clientY - startY) / PX_PER_HOUR) * 60;
        return Math.round(rawMin / MIN_BLOCK_DURATION_MIN) * MIN_BLOCK_DURATION_MIN;
      }
      function flush() {
        rafId = null;
        setResizing({ id, deltaMin: deltaFromY(pendingClientY) });
      }
      function onMove(moveEvent: MouseEvent) {
        pendingClientY = moveEvent.clientY;
        if (rafId === null) rafId = requestAnimationFrame(flush);
      }
      function onUp(upEvent: MouseEvent) {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        if (rafId !== null) cancelAnimationFrame(rafId);
        const delta = deltaFromY(upEvent.clientY);
        setResizing(null);
        if (delta !== 0) onCommit(delta);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };
  }

  return { resizing, start };
}

// Cykl statusu odbycia: brak informacji -> odbyto -> nieodbyto -> z powrotem brak informacji.
// Ten sam okrąg co checkbox zadania (jedno kliknięcie = jeden krok), ale trójstanowy zamiast
// dwustanowego, bo wydarzenie ma trzy realnie odróżnialne stany (patrz relativeEventLabel):
// "minęło" (czas minął, brak informacji czy się odbyło) różni się od potwierdzonego odbycia
// i od potwierdzonego nieodbycia — te dwa ostatnie nie mogą się zlewać w jedno "zaznaczone".
export function nextAttendance(
  current: "odbyto" | "nieodbyto" | undefined,
): "odbyto" | "nieodbyto" | null {
  if (!current) return "odbyto";
  if (current === "odbyto") return "nieodbyto";
  return null;
}

export function AttendanceDot({
  status,
  onCycle,
  size = 9,
}: {
  status: "odbyto" | "nieodbyto" | undefined;
  onCycle: () => void;
  size?: number;
}) {
  const isOdbyto = status === "odbyto";
  const isNieodbyto = status === "nieodbyto";
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onCycle();
      }}
      title={
        isOdbyto
          ? "Odbyto — kliknij, żeby oznaczyć jako nieodbyte"
          : isNieodbyto
            ? "Nieodbyto — kliknij, żeby wyczyścić"
            : "Oznacz jako odbyte"
      }
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        padding: 0,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: isOdbyto
          ? "2px solid var(--success)"
          : isNieodbyto
            ? "2px solid var(--error)"
            : "2px solid #fff",
        background: isOdbyto ? "var(--success)" : isNieodbyto ? "var(--error)" : "transparent",
      }}
    >
      {isOdbyto && <Check size={size - 4} color="#fff" strokeWidth={3} />}
      {isNieodbyto && <X size={size - 4} color="#fff" strokeWidth={3} />}
    </button>
  );
}

function ResizeHandle({
  onMouseDown,
  liveLabel,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  // Godzina końca na żywo w trakcie przeciągania — bez tego resize działał "na ślepo" aż do
  // puszczenia przycisku myszy, trzeba było zgadywać dokąd się zajedzie.
  liveLabel?: string;
}) {
  return (
    <div
      draggable={false}
      onMouseDown={onMouseDown}
      onClick={(e) => e.stopPropagation()}
      title="Przeciągnij, żeby zmienić czas trwania"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -3,
        height: 7,
        cursor: "ns-resize",
      }}
    >
      {liveLabel && (
        <span
          style={{
            position: "absolute",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            background: "var(--accent)",
            borderRadius: "var(--radius-xs)",
            padding: "2px 7px",
            boxShadow: "var(--shadow-sm)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {liveLabel}
        </span>
      )}
    </div>
  );
}

interface DayTimeAxisProps {
  range: AxisRange;
  blocks: AxisBlock[];
  isToday: boolean;
  now: Date;
  onOpenEvent: (event: CalendarEvent) => void;
  onOpenTask: (item: TaskWithList) => void;
  onSetAttendance: (eventId: string, status: "odbyto" | "nieodbyto" | null) => void;
  toggleDone: (item: TaskWithList) => void;
  onResizeTask: (item: TaskWithList, newEndMin: number) => void;
  onResizeEvent: (event: CalendarEvent, newEndMin: number) => void;
}

// Oś czasu dnia: zakres [range.startMin, range.endMin] (domyślnie 6-23, rozszerzany przez
// DayPanel gdy trzeba), stała skala PX_PER_HOUR — bloki nachodzące pakowane w kolumny obok
// siebie. Każdy blok jest jednocześnie: przeciągalny (DRAG_TYPE_TASK/DRAG_TYPE_EVENT),
// klikalny (otwiera wspólny popover edycji) i rozciągalny za dolną krawędź (zmiana godziny
// końca) — trzy niezależne interakcje na tym samym elemencie, celowo odseparowane tak żeby
// się nie gryzły (uchwyt resize ma draggable=false i zatrzymuje bąbelkowanie).
export function DayTimeAxis({
  range,
  blocks,
  isToday,
  now,
  onOpenEvent,
  onOpenTask,
  onSetAttendance,
  toggleDone,
  onResizeTask,
  onResizeEvent,
}: DayTimeAxisProps) {
  const { resizing, start } = useBlockResize();
  const axisHeight = axisRangeHeightPx(range);
  const packed = packOverlappingBlocks(blocks);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowVisible = isToday && nowMin >= range.startMin && nowMin <= range.endMin;

  const hourMarks: number[] = [];
  for (let h = Math.ceil(range.startMin / 60); h <= Math.floor(range.endMin / 60); h++) {
    hourMarks.push(h * 60);
  }

  return (
    <div style={{ position: "relative", height: axisHeight, flexShrink: 0, margin: "0 12px" }}>
      {hourMarks.map((min) => (
        <div
          key={min}
          style={{
            position: "absolute",
            top: minutesToAxisPx(min, range),
            left: 0,
            right: 0,
            borderTop: "1px solid var(--border)",
            height: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: -6,
              left: 0,
              fontFamily: "var(--font-sans)",
              fontSize: 8,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              background: "var(--bg-elevated)",
              padding: "0 2px",
            }}
          >
            {String(min / 60).padStart(2, "0")}
          </span>
        </div>
      ))}

      {nowVisible && (
        <div
          style={{
            position: "absolute",
            top: minutesToAxisPx(nowMin, range),
            left: AXIS_GUTTER,
            right: 0,
            height: 1.5,
            background: "var(--error)",
            zIndex: 3,
            transition: "top 400ms linear",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -4,
              top: -3.5,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--error)",
            }}
          />
        </div>
      )}

      {packed.map((b) => {
        const isResizing = resizing?.id === b.id;
        const effectiveEndMin = isResizing
          ? Math.max(
              b.startMin + MIN_BLOCK_DURATION_MIN,
              Math.min(range.endMin, b.endMin + resizing.deltaMin),
            )
          : b.endMin;
        const top = minutesToAxisPx(b.startMin, range);
        const height = Math.max(minutesToAxisPx(effectiveEndMin, range) - top, 20);
        const leftFrac = b.col / b.cols;
        const widthFrac = 1 / b.cols;
        // Ile linii tytułu realnie mieści dany blok — zamiast twardego wordBreak+overflow:hidden
        // (obcinało długie tytuły mid-word, brzydko wyglądające ucięcie widoczne na zrzutach
        // ekranu), tytuł zawija się do TYLU linii ile się mieści, z eleganckim "..." na końcu
        // ostatniej gdy i tak nie starczy miejsca — nigdy surowego obcięcia w połowie znaku.
        const titleLines = height >= 70 ? 3 : height >= 45 ? 2 : 1;
        const titleClamp: React.CSSProperties = {
          display: "-webkit-box",
          WebkitLineClamp: titleLines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        };
        // Ten sam rozmiar bazowy co karty "Bez godziny" (11px/waga 600).
        const style: React.CSSProperties = {
          position: "absolute",
          top,
          height,
          left: `calc(${AXIS_GUTTER}px + (100% - ${AXIS_GUTTER}px) * ${leftFrac})`,
          width: `calc((100% - ${AXIS_GUTTER}px) * ${widthFrac} - 2px)`,
          borderRadius: "var(--radius-xs)",
          overflow: "hidden",
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          lineHeight: 1.3,
          padding: "3px 6px",
          zIndex: isResizing ? 4 : 2,
          cursor: "grab",
          boxSizing: "border-box",
        };

        if (b.kind === "event") {
          const ev = b.event;
          // Realny zakres godzin (np. "17:00–18:00") — dawniej jedyną informacją o czasie na
          // bloku była etykieta względna ("za 2 godz."), bez konkretnych godzin. Zawsze w
          // tooltipie (dostępne nawet dla bardzo krótkich bloków), plus w drugiej linii gdy
          // blok jest wystarczająco wysoki.
          const timeRange = formatEventTime(ev);
          return (
            <div
              key={b.id}
              draggable
              onDragStart={(e) => {
                const payload: EventDragPayload = { eventId: ev.id };
                e.dataTransfer.setData(DRAG_TYPE_EVENT, JSON.stringify(payload));
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => onOpenEvent(ev)}
              title={`${ev.summary} (${timeRange})`}
              style={{
                ...style,
                background: "var(--accent-muted)",
                border: "1px solid var(--accent-border)",
                color: "var(--text-primary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                <AttendanceDot
                  status={ev.attendanceStatus}
                  onCycle={() => onSetAttendance(ev.id, nextAttendance(ev.attendanceStatus))}
                  size={13}
                />
                <span
                  style={{
                    fontWeight: 700,
                    flex: 1,
                    minWidth: 0,
                    overflowWrap: "break-word",
                    wordBreak: "break-word",
                    ...titleClamp,
                  }}
                >
                  {ev.summary}
                </span>
                {ev.recurringEventId && (
                  <Repeat
                    size={11}
                    color="var(--accent-text)"
                    style={{ flexShrink: 0, marginTop: 1 }}
                  />
                )}
              </div>
              {height >= 34 && (
                <div
                  style={{
                    color: "var(--text-secondary)",
                    marginTop: 2,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {timeRange}
                </div>
              )}
              <ResizeHandle
                liveLabel={isResizing ? minutesToTimeStr(effectiveEndMin) : undefined}
                onMouseDown={start(b.id, (deltaMin) =>
                  onResizeEvent(
                    ev,
                    Math.max(b.startMin + MIN_BLOCK_DURATION_MIN, b.endMin + deltaMin),
                  ),
                )}
              />
            </div>
          );
        }

        const { item, priority } = b;
        const done = item.task.status === "completed";
        const s = priority ? PRIORITY_STYLE[priority] : null;
        const isRecurring = Boolean(parseRecurrenceFromNotes(item.task.notes));
        // Zakres godzin zadania — dawniej pokazywany WYŁĄCZNIE dla wydarzeń, zadania na osi
        // nie miały żadnej etykiety godzin mimo posiadania realnego zakresu (b.startMin/endMin).
        const taskTimeRange = `${minutesToTimeStr(b.startMin)}–${minutesToTimeStr(b.endMin)}`;
        return (
          <div
            key={b.id}
            draggable
            onDragStart={(e) => {
              const payload: DragPayload = { taskId: item.task.id };
              e.dataTransfer.setData(DRAG_TYPE_TASK, JSON.stringify(payload));
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => onOpenTask(item)}
            title={`${item.task.title} (${taskTimeRange})`}
            style={{
              ...style,
              background: s ? s.bg : "var(--bg-hover)",
              border: `1px solid ${s ? s.border : "var(--border)"}`,
              color: "var(--text-primary)",
              opacity: done ? 0.55 : 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDone(item);
                }}
                title="Zaznacz jako wykonane"
                style={{
                  width: 14,
                  height: 14,
                  marginTop: 1,
                  borderRadius: "50%",
                  border: done ? "2px solid var(--success)" : "2px solid #fff",
                  background: done ? "var(--success)" : "transparent",
                  flexShrink: 0,
                  padding: 0,
                  cursor: "pointer",
                }}
              />
              <span
                style={{
                  fontWeight: 700,
                  flex: 1,
                  minWidth: 0,
                  textDecoration: done ? "line-through" : "none",
                  overflowWrap: "break-word",
                  wordBreak: "break-word",
                  ...titleClamp,
                }}
              >
                {item.task.title}
              </span>
              {isRecurring && (
                <Repeat
                  size={11}
                  color="var(--accent-text)"
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
              )}
            </div>
            {height >= 34 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 2,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {taskTimeRange}
                </span>
                {height >= 52 && (
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    <Badge size="xs">{item.listTitle}</Badge>
                  </span>
                )}
              </div>
            )}
            <ResizeHandle
              liveLabel={isResizing ? minutesToTimeStr(effectiveEndMin) : undefined}
              onMouseDown={start(b.id, (deltaMin) =>
                onResizeTask(
                  item,
                  Math.max(b.startMin + MIN_BLOCK_DURATION_MIN, b.endMin + deltaMin),
                ),
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
