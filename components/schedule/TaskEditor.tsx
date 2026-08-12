"use client";

import { AlignLeft, Calendar, Clock, Flag, Repeat, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { TimeInput } from "@/components/schedule/TimeInput";
import {
  addMinutesWrapped,
  composeTaskNotes,
  DURATION_PRESETS_MIN,
  formatDurationLabel,
  localDateKey,
  PRIORITY_LABEL,
  PRIORITY_LEVELS,
  PRIORITY_STYLE,
  type Priority,
  parseRecurrenceFromNotes,
  parseTimeRangeFromNotes,
  RECURRENCE_LABEL,
  RECURRENCE_LEVELS,
  type RecurrenceInterval,
  stripMetaTags,
  type TaskPatch,
  type TaskWithList,
} from "@/lib/schedule/dateHelpers";

// Popover edycji zadania — JEDYNY sposób zmiany nazwy/terminu/godzin/priorytetu/notatki i
// usuwania zadania, używany identycznie niezależnie od tego, gdzie karta zadania jest
// wyrenderowana (Nieprzypisane, strefa bez godziny, blok na osi). To jest wdrożenie
// "jednolitego kontraktu interakcji" — brak osobnych mikro-edycji inline per widok.

interface TaskDraft {
  title: string;
  date: string; // "yyyy-mm-dd", "" = brak terminu (Nieprzypisane)
  hasTime: boolean;
  startTime: string;
  endTime: string;
  priority: Priority | null;
  recurrence: RecurrenceInterval | null;
  notes: string;
}

function draftFromItem(item: TaskWithList, priority: Priority | null): TaskDraft {
  const range = parseTimeRangeFromNotes(item.task.notes);
  return {
    title: item.task.title,
    date: item.task.due ? localDateKey(new Date(item.task.due)) : "",
    hasTime: Boolean(range),
    startTime: range?.start ?? "09:00",
    endTime: range?.end ?? "10:00",
    priority,
    recurrence: parseRecurrenceFromNotes(item.task.notes),
    notes: stripMetaTags(item.task.notes),
  };
}

function emptyDraft(initialDate: string): TaskDraft {
  return {
    title: "",
    date: initialDate,
    hasTime: false,
    startTime: "09:00",
    endTime: "10:00",
    priority: null,
    recurrence: null,
    notes: "",
  };
}

// Kształt tworzonego zadania — celowo osobny od TaskPatch (który operuje na istniejącym
// id/listId), tworzenie idzie przez POST /api/google/tasks (patrz createTaskInList w page.tsx).
export interface NewTaskInput {
  title: string;
  due: string | null;
  notes?: string;
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

interface TaskEditorProps {
  // null = tworzenie nowego zadania (jedyny, wspólny formularz dla wszystkich przycisków
  // "Dodaj zadanie" w /planowanie — nagłówek, panel dnia, Nieprzypisane — zamiast dawnych
  // trzech niespójnych wariantów inline-input z samym tytułem).
  item: TaskWithList | null;
  initialDate?: string; // yyyy-mm-dd, użyte wyłącznie gdy item === null
  priority: Priority | null;
  onSave: (patch: TaskPatch) => void;
  onCreate: (input: NewTaskInput) => void;
  onDelete: (() => void) | null;
  onClose: () => void;
}

export function TaskEditor({
  item,
  initialDate,
  priority,
  onSave,
  onCreate,
  onDelete,
  onClose,
}: TaskEditorProps) {
  const [d, setD] = useState<TaskDraft>(() =>
    item ? draftFromItem(item, priority) : emptyDraft(initialDate ?? ""),
  );
  const set = (patch: Partial<TaskDraft>) => setD((p) => ({ ...p, ...patch }));
  // Zakres godzin, który "kończy się przed startem" jest legalny — oznacza że blok przechodzi
  // przez północ (np. 22:00-01:00). Nie blokujemy zapisu, tylko informujemy (patrz banner niżej).
  const valid = d.title.trim().length > 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSave() {
    if (!valid) return;
    const notes =
      composeTaskNotes(
        d.priority,
        d.hasTime ? { start: d.startTime, end: d.endTime } : null,
        d.date ? d.recurrence : null,
        d.notes,
      ) || undefined;
    if (item) {
      onSave({ title: d.title.trim(), due: d.date || null, notes });
    } else {
      onCreate({ title: d.title.trim(), due: d.date || null, notes });
    }
  }

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
          width: 420,
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
          <Flag size={15} color="var(--accent)" />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              flex: 1,
            }}
          >
            {item ? "Edytuj zadanie" : "Nowe zadanie"}
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
            value={d.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Nazwa zadania"
            style={{ ...fieldStyle, fontSize: 14, fontWeight: 600 }}
          />

          <div>
            <Label icon={<Calendar size={11} />}>Termin</Label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="date"
                lang="pl-PL"
                value={d.date}
                onChange={(e) => set({ date: e.target.value })}
                style={{ ...fieldStyle, flex: 1 }}
              />
              {d.date && (
                <button
                  onClick={() => set({ date: "", hasTime: false })}
                  title="Wyczyść termin — zadanie wróci do Nieprzypisanych"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0 10px",
                    cursor: "pointer",
                  }}
                >
                  <X size={12} /> Bez terminu
                </button>
              )}
            </div>
          </div>

          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-secondary)",
                cursor: d.date ? "pointer" : "default",
                opacity: d.date ? 1 : 0.5,
              }}
            >
              <input
                type="checkbox"
                checked={d.hasTime}
                disabled={!d.date}
                onChange={(e) => set({ hasTime: e.target.checked })}
              />
              Konkretna godzina (bez tego zadanie trafia do strefy "Bez godziny")
            </label>
            {d.hasTime && (
              <>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Label icon={<Clock size={11} />}>Od</Label>
                    <TimeInput value={d.startTime} onChange={(startTime) => set({ startTime })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Label icon={<Clock size={11} />}>Do</Label>
                    <TimeInput value={d.endTime} onChange={(endTime) => set({ endTime })} />
                  </div>
                </div>

                {/* Szybki wybór czasu trwania — ustawia "Do" wprost od "Od", z zawinięciem
                    przez północ (addMinutesWrapped). */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                  {DURATION_PRESETS_MIN.map((min) => (
                    <button
                      key={min}
                      onClick={() => set({ endTime: addMinutesWrapped(d.startTime, min) })}
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        background: "var(--bg-hover)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-xs)",
                        padding: "3px 8px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDurationLabel(min)}
                    </button>
                  ))}
                </div>

                {/* Zadanie przez północ — legalne, nie blokowane; tylko jawna informacja co się
                    zapisze (godzina końca sama w sobie nie niesie informacji o dniu, bo Google
                    Tasks ma jeden termin bez osobnej daty końca). */}
                {d.endTime <= d.startTime && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 6,
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
                    Blok przechodzi przez północ — na osi dnia zostanie przycięty do 23:59.
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <Label icon={<Flag size={11} />}>Priorytet</Label>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => set({ priority: null })}
                style={{
                  flex: 1,
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "6px 0",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  color: d.priority === null ? "var(--text-primary)" : "var(--text-tertiary)",
                  background: d.priority === null ? "var(--bg-hover)" : "var(--bg)",
                  border: `1px solid ${d.priority === null ? "var(--border)" : "var(--border)"}`,
                }}
              >
                Brak
              </button>
              {PRIORITY_LEVELS.map((level) => {
                const s = PRIORITY_STYLE[level];
                const active = d.priority === level;
                return (
                  <button
                    key={level}
                    onClick={() => set({ priority: level })}
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "6px 0",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      color: active ? s.color : "var(--text-tertiary)",
                      background: active ? s.bg : "var(--bg)",
                      border: `1px solid ${active ? s.border : "var(--border)"}`,
                    }}
                  >
                    {PRIORITY_LABEL[level]}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ opacity: d.date ? 1 : 0.5 }}>
            <Label icon={<Repeat size={11} />}>Powtarzalność</Label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                disabled={!d.date}
                onClick={() => set({ recurrence: null })}
                style={{
                  flex: "1 1 auto",
                  whiteSpace: "nowrap",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  cursor: d.date ? "pointer" : "default",
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
                    disabled={!d.date}
                    onClick={() => set({ recurrence: level })}
                    style={{
                      flex: "1 1 auto",
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                      cursor: d.date ? "pointer" : "default",
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
            {d.recurrence && (
              <div
                style={{
                  marginTop: 6,
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                Po zaznaczeniu jako wykonane, automatycznie utworzymy kolejne zadanie na następny
                termin w Google Tasks.
              </div>
            )}
          </div>

          <div>
            <Label icon={<AlignLeft size={11} />}>Notatka</Label>
            <textarea
              value={d.notes}
              onChange={(e) => set({ notes: e.target.value })}
              placeholder="Opcjonalnie"
              rows={3}
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </div>

          {d.hasTime && d.startTime >= d.endTime && (
            <div
              style={{
                fontSize: 12,
                color: "var(--error-text)",
                background: "var(--error-bg)",
                border: "1px solid var(--error-border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
              }}
            >
              Godzina zakończenia musi być po godzinie rozpoczęcia.
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
            onClick={handleSave}
            disabled={!valid}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              background: valid ? "var(--accent)" : "var(--border)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "8px 16px",
              cursor: valid ? "pointer" : "default",
            }}
          >
            {item ? "Zapisz zmiany" : "Dodaj zadanie"}
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
              title="Usuń zadanie"
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
