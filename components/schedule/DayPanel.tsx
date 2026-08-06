"use client";

import { AlertTriangle, Calendar, Check, Plus, Trash2, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/app/api/google/calendar/route";
import type { GoogleTask } from "@/app/api/google/tasks/route";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  combineDateAndTime,
  DRAG_TYPE_PRIORITIZED,
  DUE_STYLES,
  dueToInputValue,
  formatDue,
  formatEventTime,
  localDateKey,
  PRIORITY_LABEL,
  PRIORITY_STYLE,
  type Priority,
  relativeEventLabel,
  stripPriorityTag,
  type TaskWithList,
  timeToInputValue,
  updateNotesText,
} from "@/lib/schedule/dateHelpers";

const timeInputStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-secondary)",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  borderRadius: 4,
  padding: "2px 4px",
  width: 58,
  boxSizing: "border-box",
  flexShrink: 0,
};

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

// ── Edytowalna notatka zadania (opis, jak w Google Tasks) ──────────────

function TaskNotes({ value, onSave }: { value: string; onSave: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) areaRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  if (editing) {
    return (
      <textarea
        ref={areaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        placeholder="Notatka..."
        rows={2}
        style={{
          width: "100%",
          boxSizing: "border-box",
          marginTop: 4,
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          color: "var(--text-secondary)",
          background: "var(--bg)",
          border: "1px solid var(--accent)",
          borderRadius: "var(--radius-xs)",
          padding: "5px 7px",
          outline: "none",
          resize: "vertical",
        }}
      />
    );
  }

  if (value) {
    return (
      <div
        onClick={() => setEditing(true)}
        title="Kliknij, żeby edytować notatkę"
        style={{
          marginTop: 4,
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          color: "var(--text-tertiary)",
          cursor: "text",
          lineHeight: 1.4,
        }}
      >
        {value}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      style={{
        marginTop: 4,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 600,
        color: "var(--text-tertiary)",
      }}
    >
      + notatka
    </button>
  );
}

// ── Priority badge (klik = cykl Wysoki -> Średni -> Niski -> brak) ─────

function PriorityBadge({ priority, onCycle }: { priority: Priority | null; onCycle: () => void }) {
  if (!priority) {
    return (
      <button
        onClick={onCycle}
        title="Nadaj priorytet"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 700,
          color: "var(--text-tertiary)",
          background: "transparent",
          border: "1px dashed var(--border)",
          borderRadius: "var(--radius-xs)",
          padding: "2px 7px",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        priorytet
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
        gap: 4,
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: "var(--radius-xs)",
        padding: "2px 7px",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {PRIORITY_LABEL[priority]}
    </button>
  );
}

// ── Pozioma czerwona linia aktualnej godziny (widok dnia, tylko panel "dziś") ──────────

function NowLine({ now }: { now: Date }) {
  const label = now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "2px 0" }}>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 9,
          fontWeight: 700,
          color: "var(--error-text)",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1.5, background: "var(--error)", borderRadius: 1 }} />
    </div>
  );
}

// ── Potwierdzenie odbycia przeszłego wydarzenia (odbyto / nie odbyto / nieoznaczone) ──

function AttendanceControls({
  status,
  onSet,
}: {
  status: "odbyto" | "nieodbyto" | undefined;
  onSet: (next: "odbyto" | "nieodbyto" | null) => void;
}) {
  const btnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 3,
    fontFamily: "var(--font-sans)",
    fontSize: 9,
    fontWeight: 700,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text-tertiary)",
    borderRadius: "var(--radius-xs)",
    padding: "1px 6px",
    cursor: "pointer",
  };

  if (status) {
    return (
      <button onClick={() => onSet(null)} title="Cofnij potwierdzenie" style={btnStyle}>
        <X size={8} /> Cofnij
      </button>
    );
  }

  return (
    <>
      <button onClick={() => onSet("odbyto")} title="Potwierdź, że się odbyło" style={btnStyle}>
        <Check size={8} /> Odbyto
      </button>
      <button onClick={() => onSet("nieodbyto")} title="Oznacz jako nieodbyte" style={btnStyle}>
        <X size={8} /> Nie odbyto
      </button>
    </>
  );
}

interface DayPanelProps {
  day: Date;
  isToday: boolean;
  tasks: TaskWithList[];
  events: CalendarEvent[];
  now: Date;
  dragOverZone: string | null;
  setDragOverZone: (v: string | null) => void;
  onDrop: (e: React.DragEvent, day: Date) => void;
  patchTask: (listId: string, taskId: string, patch: Partial<GoogleTask>) => void;
  deleteTask: (listId: string, taskId: string) => void;
  toggleDone: (item: TaskWithList) => void;
  priorityMap: Record<string, Priority>;
  cyclePriority: (taskId: string) => void;
  onQuickAddTask: (day: Date, title: string) => void;
  onOpenNewEvent: (day: Date) => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onPatchEvent: (eventId: string, patch: Record<string, string>) => void;
  onSetAttendance: (eventId: string, attendanceStatus: "odbyto" | "nieodbyto" | null) => void;
}

export function DayPanel({
  day,
  isToday,
  tasks,
  events,
  now,
  dragOverZone,
  setDragOverZone,
  onDrop,
  patchTask,
  deleteTask,
  toggleDone,
  priorityMap,
  cyclePriority,
  onQuickAddTask,
  onOpenNewEvent,
  onEditEvent,
  onDeleteEvent,
  onPatchEvent,
  onSetAttendance,
}: DayPanelProps) {
  const zoneKey = `day-${localDateKey(day)}`;
  const isOver = dragOverZone === zoneKey;
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) addInputRef.current?.focus();
  }, [adding]);

  function submitAdd() {
    const t = newTitle.trim();
    if (!t) {
      setAdding(false);
      return;
    }
    onQuickAddTask(day, t);
    setNewTitle("");
    setAdding(false);
  }

  return (
    <Panel
      style={{
        padding: 0,
        minWidth: 0,
        height: 640,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: isOver ? "var(--accent-muted)" : isToday ? "var(--bg-elevated)" : undefined,
        border: isOver
          ? "1px dashed var(--accent)"
          : isToday
            ? "1.5px solid var(--accent)"
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
        style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}
      >
        {/* Header dnia */}
        <div
          style={{
            padding: "10px 12px 8px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
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
              color: isToday ? "var(--accent)" : "var(--text-primary)",
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

        {/* Treść przewijana */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "10px 12px" }}>
          <SectionLabel paddingX={0} style={{ fontSize: 10, fontWeight: 700 }}>
            Zadania ({tasks.length})
          </SectionLabel>
          {tasks.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                padding: "6px 0",
                fontFamily: "var(--font-sans)",
              }}
            >
              Przeciągnij zadanie tutaj albo dodaj nowe.
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
                      padding: "7px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <button
                      onClick={() => toggleDone(item)}
                      style={{
                        width: 16,
                        height: 16,
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
                        fontSize={12}
                        onSave={(next) => patchTask(item.listId, item.task.id, { title: next })}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          marginTop: 4,
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
                              fontSize: 10,
                              fontWeight: 700,
                              color: DUE_STYLES[dueInfo.status].color,
                              background: DUE_STYLES[dueInfo.status].bg,
                              border: `1px solid ${DUE_STYLES[dueInfo.status].border}`,
                              borderRadius: "var(--radius-xs)",
                              padding: "2px 6px",
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
                      <TaskNotes
                        value={stripPriorityTag(item.task.notes)}
                        onSave={(next) =>
                          patchTask(item.listId, item.task.id, {
                            notes: updateNotesText(item.task.notes, next) || undefined,
                          })
                        }
                      />
                    </div>
                    <button
                      onClick={() => deleteTask(item.listId, item.task.id)}
                      title="Usuń zadanie"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-tertiary)",
                        padding: 2,
                        flexShrink: 0,
                        display: "flex",
                        marginTop: 1,
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {adding ? (
            <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
              <input
                ref={addInputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitAdd();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewTitle("");
                  }
                }}
                onBlur={submitAdd}
                placeholder="Nazwa zadania..."
                style={{
                  flex: 1,
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-primary)",
                  background: "var(--bg)",
                  border: "1px solid var(--accent)",
                  borderRadius: "var(--radius-xs)",
                  padding: "5px 8px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px 0",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                marginTop: 4,
              }}
            >
              <Plus size={12} /> Dodaj zadanie na ten dzień
            </button>
          )}

          <div style={{ marginTop: 14 }}>
            <SectionLabel paddingX={0} style={{ fontSize: 10, fontWeight: 700 }}>
              Wydarzenia ({events.length})
            </SectionLabel>
            {events.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  padding: "6px 0",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Brak.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(() => {
                  let nowLineRendered = false;
                  return events.map((ev) => {
                    const rel = relativeEventLabel(ev, now);
                    const startVal = timeToInputValue(ev.start.dateTime);
                    const endVal = timeToInputValue(ev.end.dateTime);
                    const start = ev.start.dateTime ? new Date(ev.start.dateTime) : null;
                    const end = ev.end.dateTime ? new Date(ev.end.dateTime) : null;
                    const isPast = !ev.allDay && end !== null && now > end;
                    const showNowLineBefore =
                      isToday &&
                      !nowLineRendered &&
                      start !== null &&
                      start.getTime() > now.getTime();
                    if (showNowLineBefore) nowLineRendered = true;
                    return (
                      <Fragment key={ev.id}>
                        {showNowLineBefore && <NowLine now={now} />}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 6,
                            padding: "7px 8px",
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
                            <div
                              onClick={() => onEditEvent(ev)}
                              title="Kliknij, żeby edytować pełne wydarzenie"
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {ev.summary}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                marginTop: 3,
                                flexWrap: "wrap",
                              }}
                            >
                              {!ev.allDay && ev.start.dateTime && ev.end.dateTime ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                  <input
                                    type="time"
                                    defaultValue={startVal}
                                    onBlur={(e) => {
                                      if (e.target.value && e.target.value !== startVal) {
                                        onPatchEvent(ev.id, {
                                          startDateTime: combineDateAndTime(
                                            ev.start.dateTime as string,
                                            e.target.value,
                                          ),
                                        });
                                      }
                                    }}
                                    style={timeInputStyle}
                                  />
                                  <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                                    –
                                  </span>
                                  <input
                                    type="time"
                                    defaultValue={endVal}
                                    onBlur={(e) => {
                                      if (e.target.value && e.target.value !== endVal) {
                                        onPatchEvent(ev.id, {
                                          endDateTime: combineDateAndTime(
                                            ev.end.dateTime as string,
                                            e.target.value,
                                          ),
                                        });
                                      }
                                    }}
                                    style={timeInputStyle}
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
                                    padding: "1px 5px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                  }}
                                >
                                  <AlertTriangle size={7} />
                                  {rel.label}
                                </span>
                              )}
                              {isPast && (
                                <AttendanceControls
                                  status={ev.attendanceStatus}
                                  onSet={(next) => onSetAttendance(ev.id, next)}
                                />
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => onDeleteEvent(ev.id)}
                            title="Usuń wydarzenie"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--text-tertiary)",
                              padding: 2,
                              flexShrink: 0,
                              display: "flex",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </Fragment>
                    );
                  });
                })()}
                {isToday &&
                  events.every((ev) => !ev.start.dateTime || new Date(ev.start.dateTime) <= now) &&
                  events.some((ev) => ev.start.dateTime) && <NowLine now={now} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
