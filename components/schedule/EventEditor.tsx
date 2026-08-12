"use client";

import {
  AlignLeft,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Repeat,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { CalendarEvent } from "@/app/api/google/calendar/route";
import { TimeInput } from "@/components/schedule/TimeInput";
import {
  addMinutesWrapped,
  DURATION_PRESETS_MIN,
  formatDurationLabel,
  pad2,
  RECURRENCE_LABEL,
  RECURRENCE_LEVELS,
  type RecurrenceInterval,
} from "@/lib/schedule/dateHelpers";

export interface EventDraft {
  id?: string;
  summary: string;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: string;
  description: string;
  // Wyłącznie przy tworzeniu nowego wydarzenia (patrz UI niżej) — zmiana reguły powtarzalności
  // istniejącego cyklu w Google Calendar ma osobną, dużo bardziej złożoną semantykę
  // ("to wystąpienie" vs "to i kolejne" vs "cała seria"), świadomie poza zakresem tego edytora.
  recurrence: RecurrenceInterval | null;
}

function getEventStart(e: CalendarEvent): Date {
  return new Date(e.start.dateTime ?? e.start.date ?? "");
}

function getEventEnd(e: CalendarEvent): Date {
  return new Date(e.end.dateTime ?? e.end.date ?? "");
}

export function eventToDraft(e: CalendarEvent): EventDraft {
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
    recurrence: null,
  };
}

export function newDraftAt(date: Date, hour?: number): EventDraft {
  const h = hour ?? date.getHours();
  return {
    summary: "",
    date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    startTime: `${pad2(h)}:00`,
    endTime: `${pad2(Math.min(h + 1, 23))}:00`,
    location: "",
    description: "",
    recurrence: null,
  };
}

const fieldStyle: React.CSSProperties = {
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

export function EventEditor({
  initial,
  sourceEvent,
  saving,
  error,
  onSave,
  onDelete,
  onClose,
}: {
  initial: EventDraft;
  /** Pełne wydarzenie z Google Calendar (uczestnicy, link) — wyłącznie do odczytu, brak
   * odpowiednika w EventDraft, bo to pola których ten formularz nie edytuje. */
  sourceEvent?: CalendarEvent | null;
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
            style={{ ...fieldStyle, fontSize: 14, fontWeight: 600 }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1.4 }}>
              <Label icon={<Calendar size={11} />}>Data</Label>
              <input
                type="date"
                lang="pl-PL"
                value={d.date}
                onChange={(e) => set({ date: e.target.value })}
                style={fieldStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Label icon={<Clock size={11} />}>Od</Label>
              <TimeInput value={d.startTime} onChange={(startTime) => set({ startTime })} />
            </div>
            <div style={{ flex: 1 }}>
              <Label icon={<Clock size={11} />}>Do</Label>
              <TimeInput value={d.endTime} onChange={(endTime) => set({ endTime })} />
            </div>
          </div>

          {/* Szybki wybór czasu trwania — ustawia "Do" wprost od "Od", z zawinięciem przez
              północ (addMinutesWrapped), więc działa też blisko końca doby. */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {DURATION_PRESETS_MIN.map((min) => (
              <button
                key={min}
                onClick={() => set({ endTime: addMinutesWrapped(d.startTime, min) })}
                disabled={!d.startTime}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  background: "var(--bg-hover)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xs)",
                  padding: "3px 8px",
                  cursor: d.startTime ? "pointer" : "default",
                  whiteSpace: "nowrap",
                }}
              >
                {formatDurationLabel(min)}
              </button>
            ))}
          </div>

          {/* Wydarzenie przez północ (np. impreza 18:30-01:00) — dawniej blokowane błędem
              "godzina zakończenia musi być po rozpoczęciu". Teraz wykrywane automatycznie
              (koniec ląduje na kolejnym dniu, patrz saveEvent w page.tsx), tylko z jawną
              informacją co się faktycznie zapisze. */}
          {d.startTime && d.endTime && d.endTime <= d.startTime && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--accent-text)",
                background: "var(--accent-muted)",
                border: "1px solid var(--accent-border)",
                borderRadius: "var(--radius-sm)",
                padding: "7px 10px",
              }}
            >
              <Clock size={11} style={{ flexShrink: 0 }} />
              Wydarzenie kończy się następnego dnia o {d.endTime}.
            </div>
          )}

          {isEdit && sourceEvent?.recurringEventId ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-tertiary)",
                background: "var(--bg-hover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "7px 10px",
              }}
            >
              <Repeat size={11} color="var(--accent)" style={{ flexShrink: 0 }} />
              To wystąpienie cyklu — zmiany dotyczą tylko tego dnia, nie całej serii.
            </div>
          ) : (
            !isEdit && (
              <div>
                <Label icon={<Repeat size={11} />}>Powtarzalność</Label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    onClick={() => set({ recurrence: null })}
                    style={{
                      flex: "1 1 auto",
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      color: d.recurrence === null ? "var(--text-primary)" : "var(--text-tertiary)",
                      background: d.recurrence === null ? "var(--bg-hover)" : "var(--bg)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    Nie powtarza się
                  </button>
                  {RECURRENCE_LEVELS.map((level) => {
                    const active = d.recurrence === level;
                    return (
                      <button
                        key={level}
                        onClick={() => set({ recurrence: level })}
                        style={{
                          flex: "1 1 auto",
                          whiteSpace: "nowrap",
                          fontFamily: "var(--font-sans)",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "6px 10px",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          color: active ? "var(--accent-text)" : "var(--text-tertiary)",
                          background: active ? "var(--accent-muted)" : "var(--bg)",
                          border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        }}
                      >
                        {RECURRENCE_LABEL[level]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}

          <div>
            <Label icon={<MapPin size={11} />}>Lokalizacja</Label>
            <input
              value={d.location}
              onChange={(e) => set({ location: e.target.value })}
              placeholder="Opcjonalnie"
              style={fieldStyle}
            />
          </div>

          <div>
            <Label icon={<AlignLeft size={11} />}>Opis</Label>
            <textarea
              value={d.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Opcjonalnie"
              rows={3}
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </div>

          {sourceEvent?.attendees && sourceEvent.attendees.length > 0 && (
            <div>
              <Label icon={<Calendar size={11} />}>
                Uczestnicy ({sourceEvent.attendees.length})
              </Label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {sourceEvent.attendees.map((a) => (
                  <div
                    key={a.email}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {a.displayName ?? a.email}
                  </div>
                ))}
              </div>
            </div>
          )}

          {sourceEvent?.htmlLink && (
            <a
              href={sourceEvent.htmlLink}
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
              }}
            >
              <ExternalLink size={12} />
              Otwórz w Google Calendar
            </a>
          )}

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--error-text)",
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
                color: "var(--error-text)",
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
