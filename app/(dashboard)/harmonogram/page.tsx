"use client";

import {
  AlignLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent, CalendarResponse } from "@/app/api/google/calendar/route";
import type { GoogleTask, GoogleTasksResponse } from "@/app/api/google/tasks/route";
import { Panel } from "@/components/ui/Panel";

// ── Konfiguracja ──────────────────────────────────────────────────────

// Harmonogram pokazuje zadania wyłącznie z tej listy Google Tasks.
const HOME_TASK_LIST = "Zadania (Domowe)";

// ── Date helpers ──────────────────────────────────────────────────────

const PL_DAYS_LONG = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
];
const PL_DAYS_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];
const PL_MONTHS = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
];
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

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function getEventStart(e: CalendarEvent): Date {
  return new Date(e.start.dateTime ?? e.start.date ?? "");
}

function getEventEnd(e: CalendarEvent): Date {
  return new Date(e.end.dateTime ?? e.end.date ?? "");
}

// ── Event colours ─────────────────────────────────────────────────────

const EVENT_COLORS = [
  "#0a84ff",
  "#30d158",
  "#ff453a",
  "#ff9f0a",
  "#bf5af2",
  "#64d2ff",
  "#ff6961",
  "#ffb340",
  "#ac8e68",
  "#6e6e73",
];

function eventColor(e: CalendarEvent): string {
  if (e.colorId) {
    const idx = parseInt(e.colorId, 10);
    return EVENT_COLORS[idx % EVENT_COLORS.length] ?? EVENT_COLORS[0];
  }
  return EVENT_COLORS[0];
}

// ── Event chip ────────────────────────────────────────────────────────

function EventChip({
  event,
  compact = false,
  onClick,
}: {
  event: CalendarEvent;
  compact?: boolean;
  onClick: () => void;
}) {
  const color = eventColor(event);
  const time = formatTime(event.start.dateTime);

  return (
    <div
      onClick={(ev) => {
        ev.stopPropagation();
        onClick();
      }}
      style={{
        background: `${color}1a`,
        borderLeft: `2px solid ${color}`,
        borderRadius: "var(--radius-xs)",
        padding: compact ? "2px 6px" : "3px 8px",
        cursor: "pointer",
        overflow: "hidden",
        marginBottom: 2,
      }}
    >
      {!compact && time && (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 9, color, marginBottom: 1 }}>
          {time}
        </div>
      )}
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: compact ? 10 : 11,
          fontWeight: 500,
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {event.summary}
      </div>
    </div>
  );
}

// ── Task chip ─────────────────────────────────────────────────────────

function TaskChip({ task }: { task: GoogleTask }) {
  return (
    <div
      style={{
        background: "rgba(255,159,10,0.09)",
        borderLeft: "2px solid var(--warning)",
        borderRadius: "var(--radius-xs)",
        padding: "2px 6px",
        marginBottom: 2,
        display: "flex",
        alignItems: "center",
        gap: 4,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          border: "1.5px solid var(--warning)",
          flexShrink: 0,
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 500,
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {task.title}
      </div>
    </div>
  );
}

// ── Event detail panel ────────────────────────────────────────────────

function EventPanel({
  event,
  onClose,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const start = getEventStart(event);
  const end = getEventEnd(event);
  const color = eventColor(event);

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.10)" }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 320,
          zIndex: 41,
          background: "var(--glass)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderLeft: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-menu)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 4,
              alignSelf: "stretch",
              borderRadius: 2,
              background: color,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
                lineHeight: 1.3,
              }}
            >
              {event.summary}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Time */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 3,
              }}
            >
              Czas
            </div>
            <div
              style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-primary)" }}
            >
              {event.allDay
                ? `${PL_DAYS_LONG[start.getDay()]}, ${start.getDate()} ${PL_MONTHS[start.getMonth()]} ${start.getFullYear()} (cały dzień)`
                : `${PL_DAYS_LONG[start.getDay()]}, ${start.getDate()} ${PL_MONTHS[start.getMonth()]} ${start.getFullYear()}, ${formatTime(event.start.dateTime)} – ${formatTime(event.end.dateTime)}`}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 3,
                }}
              >
                Lokalizacja
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--text-primary)",
                }}
              >
                {event.location}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 3,
                }}
              >
                Opis
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {event.description.replace(/<[^>]+>/g, "").trim()}
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 6,
                }}
              >
                Uczestnicy ({event.attendees.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {event.attendees.map((a) => (
                  <div key={a.email} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "var(--accent-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-sans)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--accent)",
                        flexShrink: 0,
                      }}
                    >
                      {(a.displayName ?? a.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          color: "var(--text-primary)",
                        }}
                      >
                        {a.displayName ?? a.email}
                      </div>
                      {a.displayName && (
                        <div
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 10,
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {a.email}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {(onEdit || onDelete) && !event.allDay && (
            <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
              {onEdit && (
                <button
                  onClick={onEdit}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--bg-elevated)",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  <Pencil size={12} /> Edytuj
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--error-border)",
                    background: "var(--error-bg)",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--error)",
                  }}
                >
                  <Trash2 size={12} /> Usuń
                </button>
              )}
            </div>
          )}

          {/* Open in Calendar */}
          {event.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                textDecoration: "none",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: 2,
              }}
            >
              <ExternalLink size={12} />
              Otwórz w Google Calendar
            </a>
          )}
        </div>
      </div>
    </>
  );
}

// ── Week view ─────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07–21

function WeekView({
  weekStart,
  events,
  tasks,
  onEventClick,
  onCreate,
  today,
}: {
  weekStart: Date;
  events: CalendarEvent[];
  tasks: GoogleTask[];
  onEventClick: (e: CalendarEvent) => void;
  onCreate: (day: Date, hour: number) => void;
  today: Date;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const pendingTasks = tasks.filter((t) => t.status === "needsAction");
  const hasAllDayContent = days.some(
    (day) =>
      events.some((e) => e.allDay && isSameDay(getEventStart(e), day)) ||
      pendingTasks.some((t) => t.due && isSameDay(new Date(t.due), day)),
  );
  const undatedTasks = pendingTasks.filter((t) => !t.due);

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: "column" }}>
      {/* Single scrollable container — header inside prevents scrollbar-width misalignment */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Day headers — sticky */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 3,
            display: "grid",
            gridTemplateColumns: "48px repeat(7, 1fr)",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg)",
          }}
        >
          <div style={{ borderRight: "1px solid var(--border)" }} />
          {days.map((day, i) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={i}
                style={{
                  padding: "8px 6px",
                  textAlign: "center",
                  borderRight: i < 6 ? "1px solid var(--border)" : "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {PL_DAYS_SHORT[day.getDay()]}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? "#fff" : "var(--text-primary)",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: isToday ? "var(--accent)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                  }}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day events + tasks with due date */}
        {hasAllDayContent && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "48px repeat(7, 1fr)",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              minHeight: 32,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "flex-end",
                padding: "6px 8px 4px 0",
                fontFamily: "var(--font-sans)",
                fontSize: 9,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                lineHeight: 1.3,
                borderRight: "1px solid var(--border)",
              }}
            >
              całodniowe
            </div>
            {days.map((day, i) => {
              const dayAllDay = events.filter((e) => e.allDay && isSameDay(getEventStart(e), day));
              const dayTasks = pendingTasks.filter((t) => t.due && isSameDay(new Date(t.due), day));
              return (
                <div
                  key={i}
                  style={{
                    padding: "3px 4px",
                    borderRight: i < 6 ? "1px solid var(--border)" : "none",
                  }}
                >
                  {dayAllDay.map((e) => (
                    <EventChip key={e.id} event={e} compact onClick={() => onEventClick(e)} />
                  ))}
                  {dayTasks.map((t) => (
                    <TaskChip key={t.id} task={t} />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Undated tasks strip */}
        {undatedTasks.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "48px 1fr",
              borderBottom: "1px solid var(--border)",
              background: "rgba(255,159,10,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "flex-end",
                padding: "6px 8px 4px 0",
                fontFamily: "var(--font-sans)",
                fontSize: 9,
                color: "var(--warning)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                lineHeight: 1.3,
                borderRight: "1px solid var(--border)",
              }}
            >
              zadania
            </div>
            <div
              style={{
                padding: "4px 6px",
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                alignItems: "center",
              }}
            >
              {undatedTasks.slice(0, 8).map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: "rgba(255,159,10,0.10)",
                    border: "1px solid rgba(255,159,10,0.28)",
                    borderRadius: "var(--radius-xs)",
                    padding: "2px 8px",
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    fontWeight: 500,
                    color: "var(--warning)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.title}
                </div>
              ))}
              {undatedTasks.length > 8 && (
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                  }}
                >
                  +{undatedTasks.length - 8} więcej
                </span>
              )}
            </div>
          </div>
        )}

        {/* Time grid */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            style={{
              display: "grid",
              gridTemplateColumns: "48px repeat(7, 1fr)",
              borderBottom: "1px solid var(--border)",
              minHeight: 52,
            }}
          >
            <div
              style={{
                padding: "4px 8px 0 0",
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                color: "var(--text-tertiary)",
                textAlign: "right",
                borderRight: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              {`${hour.toString().padStart(2, "0")}:00`}
            </div>
            {days.map((day, i) => {
              const dayEvents = events.filter(
                (e) =>
                  !e.allDay &&
                  isSameDay(getEventStart(e), day) &&
                  getEventStart(e).getHours() === hour,
              );
              return (
                <div
                  key={i}
                  onClick={(ev) => {
                    if (ev.target === ev.currentTarget) onCreate(day, hour);
                  }}
                  title="Kliknij, aby dodać wydarzenie"
                  style={{
                    padding: "3px 4px",
                    borderRight: i < 6 ? "1px solid var(--border)" : "none",
                    minHeight: 52,
                    cursor: "pointer",
                    background: isSameDay(day, today) ? "rgba(10,132,255,0.02)" : "transparent",
                  }}
                >
                  {dayEvents.map((e) => (
                    <EventChip key={e.id} event={e} onClick={() => onEventClick(e)} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────────────

function MonthView({
  monthStart,
  events,
  tasks,
  onEventClick,
  today,
}: {
  monthStart: Date;
  events: CalendarEvent[];
  tasks: GoogleTask[];
  onEventClick: (e: CalendarEvent) => void;
  today: Date;
}) {
  const pendingTasks = tasks.filter((t) => t.status === "needsAction" && t.due);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (Date | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => (
          <div
            key={d}
            style={{
              padding: "8px 6px",
              textAlign: "center",
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {rows.map((row, ri) => (
          <div
            key={ri}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              borderBottom: "1px solid var(--border)",
              minHeight: 80,
            }}
          >
            {row.map((day, ci) => {
              const isToday = day ? isSameDay(day, today) : false;
              const dayEvents = day ? events.filter((e) => isSameDay(getEventStart(e), day)) : [];
              const dayTasks = day
                ? pendingTasks.filter((t) => t.due && isSameDay(new Date(t.due), day))
                : [];
              return (
                <div
                  key={ci}
                  style={{
                    padding: "4px 6px",
                    borderRight: ci < 6 ? "1px solid var(--border)" : "none",
                    background: isToday ? "rgba(10,132,255,0.03)" : "transparent",
                  }}
                >
                  {day && (
                    <>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          fontWeight: isToday ? 700 : 400,
                          color: isToday
                            ? "var(--accent)"
                            : day.getMonth() !== month
                              ? "var(--text-tertiary)"
                              : "var(--text-primary)",
                          marginBottom: 4,
                        }}
                      >
                        {day.getDate()}
                      </div>
                      {dayEvents.slice(0, 3).map((e) => (
                        <EventChip key={e.id} event={e} compact onClick={() => onEventClick(e)} />
                      ))}
                      {dayTasks.slice(0, 2).map((t) => (
                        <TaskChip key={t.id} task={t} />
                      ))}
                      {dayEvents.length > 3 && (
                        <div
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 10,
                            color: "var(--text-tertiary)",
                            paddingLeft: 6,
                          }}
                        >
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Day view ──────────────────────────────────────────────────────────

function DayView({
  day,
  events,
  tasks,
  onEventClick,
}: {
  day: Date;
  events: CalendarEvent[];
  tasks: GoogleTask[];
  onEventClick: (e: CalendarEvent) => void;
}) {
  const dayEvents = events.filter((e) => isSameDay(getEventStart(e), day));
  const timedEvents = dayEvents.filter((e) => !e.allDay);
  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const pendingTasks = tasks.filter((t) => t.status === "needsAction");
  const dayTasks = pendingTasks.filter((t) => t.due && isSameDay(new Date(t.due), day));

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {(allDayEvents.length > 0 || dayTasks.length > 0) && (
        <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border)" }}>
          {allDayEvents.map((e) => (
            <EventChip key={e.id} event={e} onClick={() => onEventClick(e)} />
          ))}
          {dayTasks.map((t) => (
            <TaskChip key={t.id} task={t} />
          ))}
        </div>
      )}
      {HOURS.map((hour) => {
        const hourEvents = timedEvents.filter((e) => getEventStart(e).getHours() === hour);
        return (
          <div
            key={hour}
            style={{
              display: "flex",
              gap: 12,
              padding: "8px 16px",
              borderBottom: "1px solid var(--border)",
              minHeight: 56,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-tertiary)",
                width: 44,
                flexShrink: 0,
                paddingTop: 2,
              }}
            >
              {`${hour.toString().padStart(2, "0")}:00`}
            </div>
            <div style={{ flex: 1 }}>
              {hourEvents.map((e) => (
                <EventChip key={e.id} event={e} onClick={() => onEventClick(e)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Event editor (create / edit) ──────────────────────────────────────

interface EventDraft {
  id?: string;
  summary: string;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: string;
  description: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function eventToDraft(e: CalendarEvent): EventDraft {
  const start = getEventStart(e);
  const end = getEventEnd(e);
  return {
    id: e.id,
    summary: e.summary ?? "",
    date: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-${pad2(start.getDate())}`,
    startTime: `${pad2(start.getHours())}:${pad2(start.getMinutes())}`,
    endTime: `${pad2(end.getHours())}:${pad2(end.getMinutes())}`,
    location: e.location ?? "",
    description: (e.description ?? "").replace(/<[^>]+>/g, "").trim(),
  };
}

function newDraftAt(date: Date, hour?: number): EventDraft {
  const h = hour ?? date.getHours();
  return {
    summary: "",
    date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    startTime: `${pad2(h)}:00`,
    endTime: `${pad2(Math.min(h + 1, 23))}:00`,
    location: "",
    description: "",
  };
}

const editorFieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--text-primary)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 11px",
  outline: "none",
};

function EventEditor({
  initial,
  saving,
  error,
  onSave,
  onDelete,
  onClose,
}: {
  initial: EventDraft;
  saving: boolean;
  error: string | null;
  onSave: (d: EventDraft) => void;
  onDelete: (() => void) | null;
  onClose: () => void;
}) {
  const [d, setD] = useState<EventDraft>(initial);
  const isEdit = Boolean(initial.id);
  const set = (patch: Partial<EventDraft>) => setD((p) => ({ ...p, ...patch }));
  const valid = d.summary.trim() && d.date && d.startTime && d.endTime;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "rgba(0,0,0,0.28)",
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          zIndex: 51,
          width: 440,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 48px)",
          overflowY: "auto",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-menu)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <Calendar size={15} color="var(--accent)" />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              flex: 1,
            }}
          >
            {isEdit ? "Edytuj wydarzenie" : "Nowe wydarzenie"}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              display: "flex",
              padding: 3,
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            autoFocus
            value={d.summary}
            onChange={(e) => set({ summary: e.target.value })}
            placeholder="Tytuł wydarzenia"
            style={{ ...editorFieldStyle, fontSize: 14, fontWeight: 600 }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1.4 }}>
              <Label icon={<Calendar size={11} />}>Data</Label>
              <input
                type="date"
                value={d.date}
                onChange={(e) => set({ date: e.target.value })}
                style={editorFieldStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Label icon={<Clock size={11} />}>Od</Label>
              <input
                type="time"
                value={d.startTime}
                onChange={(e) => set({ startTime: e.target.value })}
                style={editorFieldStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Label icon={<Clock size={11} />}>Do</Label>
              <input
                type="time"
                value={d.endTime}
                onChange={(e) => set({ endTime: e.target.value })}
                style={editorFieldStyle}
              />
            </div>
          </div>

          <div>
            <Label icon={<MapPin size={11} />}>Lokalizacja</Label>
            <input
              value={d.location}
              onChange={(e) => set({ location: e.target.value })}
              placeholder="Opcjonalnie"
              style={editorFieldStyle}
            />
          </div>

          <div>
            <Label icon={<AlignLeft size={11} />}>Opis</Label>
            <textarea
              value={d.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Opcjonalnie"
              rows={3}
              style={{ ...editorFieldStyle, resize: "vertical" }}
            />
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--error)",
                background: "var(--error-bg)",
                border: "1px solid var(--error-border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 18px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => valid && onSave(d)}
            disabled={!valid || saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              background: valid ? "var(--accent)" : "var(--border)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "8px 16px",
              cursor: valid && !saving ? "pointer" : "default",
            }}
          >
            {saving ? (
              <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} />
            ) : null}
            {isEdit ? "Zapisz zmiany" : "Utwórz"}
          </button>
          <button
            onClick={onClose}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-secondary)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            Anuluj
          </button>
          <div style={{ flex: 1 }} />
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={saving}
              title="Usuń wydarzenie"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--error)",
                background: "var(--error-bg)",
                border: "1px solid var(--error-border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} /> Usuń
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function Label({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        marginBottom: 4,
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--text-tertiary)",
      }}
    >
      {icon} {children}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

type ViewMode = "week" | "month" | "day";

export default function HarmonogramPage() {
  const [view, setView] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState(new Date());
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [tasks, setTasks] = useState<GoogleTask[]>([]);

  // Event editor
  const [editorDraft, setEditorDraft] = useState<EventDraft | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const today = new Date();
  const weekStart = getWeekStart(cursor);
  const monthStart = getMonthStart(cursor);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  function rangeLabel(): string {
    if (view === "day") {
      return `${PL_DAYS_LONG[cursor.getDay()]}, ${cursor.getDate()} ${PL_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    }
    if (view === "month") {
      return `${PL_MONTHS_NOM[monthStart.getMonth()]} ${monthStart.getFullYear()}`;
    }
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${weekStart.getDate()}–${weekEnd.getDate()} ${PL_MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    }
    return `${weekStart.getDate()} ${PL_MONTHS[weekStart.getMonth()]} – ${weekEnd.getDate()} ${PL_MONTHS[weekEnd.getMonth()]} ${weekStart.getFullYear()}`;
  }

  function navigate(dir: 1 | -1) {
    setCursor((prev) => {
      const next = new Date(prev);
      if (view === "day") next.setDate(prev.getDate() + dir);
      else if (view === "week") next.setDate(prev.getDate() + dir * 7);
      else next.setMonth(prev.getMonth() + dir);
      return next;
    });
  }

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ view });
      if (view === "week") {
        params.set("start", weekStart.toISOString());
        params.set("end", weekEnd.toISOString());
      } else if (view === "month") {
        const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
        params.set("start", monthStart.toISOString());
        params.set("end", end.toISOString());
      } else {
        const dayStart = new Date(cursor);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(cursor);
        dayEnd.setHours(23, 59, 59, 999);
        params.set("start", dayStart.toISOString());
        params.set("end", dayEnd.toISOString());
      }

      const res = await fetch(`/api/google/calendar?${params.toString()}`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Błąd połączenia z Google Calendar");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cursor.toDateString()]);

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 30_000);
    const onFocus = () => fetchEvents();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchEvents]);

  // Fetch tasks — tylko lista domowa „Zadania (Domowe)"
  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/google/tasks");
        if (!res.ok) return;
        const d: GoogleTasksResponse = await res.json();
        if (d.lists && d.tasksByList) {
          // tasksByList kluczowane po id listy — znajdź listę domową po tytule
          const homeList =
            d.lists.find((l) => l.title === HOME_TASK_LIST) ??
            d.lists.find((l) => l.title.toLowerCase().includes("domow"));
          setTasks(homeList ? (d.tasksByList[homeList.id] ?? []) : []);
        }
      } catch {
        /* tasks are optional */
      }
    }
    fetchTasks();
  }, []);

  const events = data?.events ?? [];

  // ── Event CRUD ──
  const openCreate = useCallback((date?: Date, hour?: number) => {
    setEditorError(null);
    setEditorDraft(newDraftAt(date ?? new Date(), hour));
  }, []);

  const openEdit = useCallback((e: CalendarEvent) => {
    setEditorError(null);
    setSelectedEvent(null);
    setEditorDraft(eventToDraft(e));
  }, []);

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
        void fetchEvents();
      } catch {
        setEditorError("Błąd połączenia z serwerem.");
      } finally {
        setSavingEvent(false);
      }
    },
    [fetchEvents],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      setSavingEvent(true);
      try {
        const res = await fetch(`/api/google/calendar/${id}`, { method: "DELETE" });
        if (res.ok) {
          setEditorDraft(null);
          void fetchEvents();
        } else {
          const j = await res.json().catch(() => ({}));
          setEditorError(j.error ?? "Nie udało się usunąć.");
        }
      } catch {
        setEditorError("Błąd połączenia z serwerem.");
      } finally {
        setSavingEvent(false);
      }
    },
    [fetchEvents],
  );

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 12px 0 20px",
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Calendar size={15} color="var(--accent)" />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          Harmonogram
        </span>

        {/* View switcher */}
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "var(--bg-hover)",
            borderRadius: "var(--radius-sm)",
            padding: 2,
            marginLeft: 8,
          }}
        >
          {(["day", "week", "month"] as ViewMode[]).map((v) => {
            const label = v === "day" ? "Dzień" : v === "week" ? "Tydzień" : "Miesiąc";
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-xs)",
                  border: "none",
                  background: view === v ? "var(--glass)" : "transparent",
                  boxShadow: view === v ? "var(--shadow-sm)" : "none",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: view === v ? 600 : 400,
                  color: view === v ? "var(--text-primary)" : "var(--text-tertiary)",
                  cursor: "pointer",
                  transition: "all 0.1s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "5px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            cursor: "pointer",
            color: "var(--text-secondary)",
          }}
        >
          <ChevronLeft size={13} />
        </button>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            minWidth: 200,
            textAlign: "center",
          }}
        >
          {rangeLabel()}
        </span>
        <button
          onClick={() => navigate(1)}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "5px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            cursor: "pointer",
            color: "var(--text-secondary)",
          }}
        >
          <ChevronRight size={13} />
        </button>

        <button
          onClick={() => setCursor(new Date())}
          style={{
            padding: "5px 10px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          Dziś
        </button>

        <div style={{ flex: 1 }} />

        {data?.calendarName && (
          <span
            style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-tertiary)" }}
          >
            {data.calendarName}
          </span>
        )}

        <button
          onClick={() => openCreate(view === "day" ? cursor : new Date())}
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
          <Plus size={13} /> Nowe
        </button>

        <button
          onClick={fetchEvents}
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
            style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}
          />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {error && (
          <Panel style={{ margin: 16, padding: 16, textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {error.includes("Not connected") || error.includes("Not authorized")
                ? "Brak połączenia z Google Calendar. Połącz konto na stronie profilu."
                : error}
            </div>
          </Panel>
        )}

        {loading && !error && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-tertiary)",
              textAlign: "center",
              paddingTop: 40,
            }}
          >
            Pobieranie wydarzeń...
          </div>
        )}

        {!loading && !error && (
          <>
            {view === "week" && (
              <WeekView
                weekStart={weekStart}
                events={events}
                tasks={tasks}
                onEventClick={setSelectedEvent}
                onCreate={(day, hour) => openCreate(day, hour)}
                today={today}
              />
            )}
            {view === "month" && (
              <MonthView
                monthStart={monthStart}
                events={events}
                tasks={tasks}
                onEventClick={setSelectedEvent}
                today={today}
              />
            )}
            {view === "day" && (
              <DayView day={cursor} events={events} tasks={tasks} onEventClick={setSelectedEvent} />
            )}
          </>
        )}
      </div>

      {selectedEvent && (
        <EventPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => openEdit(selectedEvent)}
          onDelete={() => {
            const id = selectedEvent.id;
            setSelectedEvent(null);
            void deleteEvent(id);
          }}
        />
      )}

      {editorDraft && (
        <EventEditor
          initial={editorDraft}
          saving={savingEvent}
          error={editorError}
          onSave={saveEvent}
          onDelete={editorDraft.id ? () => deleteEvent(editorDraft.id!) : null}
          onClose={() => setEditorDraft(null)}
        />
      )}
    </div>
  );
}
