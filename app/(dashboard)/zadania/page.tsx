"use client";

import {
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface TaskPatch {
  title?: string;
  notes?: string;
  due?: string;
}

import type { GoogleTask, GoogleTaskList, GoogleTasksResponse } from "@/app/api/google/tasks/route";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";

// ── Helpers ───────────────────────────────────────────────────────────

type DueStatus = "overdue" | "today" | "week" | "future";

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

const PL_DAYS_FULL = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
];

function formatDue(iso: string | undefined): { label: string; status: DueStatus } | null {
  if (!iso) return null;
  const due = new Date(iso);
  const now = new Date();
  const dueLocal = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueLocal.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "po terminie", status: "overdue" };
  if (diffDays === 0) return { label: "dziś", status: "today" };
  if (diffDays === 1) return { label: "jutro", status: "week" };

  const dayName = PL_DAYS_FULL[due.getDay()];
  const dd = String(due.getDate()).padStart(2, "0");
  const mm = String(due.getMonth() + 1).padStart(2, "0");
  const yyyy = due.getFullYear();
  const dateStr = `${dd}.${mm}.${yyyy}`;

  if (diffDays <= 7) return { label: `${dayName} ${dateStr}`, status: "week" };
  return { label: `${dayName} ${dateStr}`, status: "future" };
}

// ── Task row ──────────────────────────────────────────────────────────

function dueToInput(due?: string): string {
  if (!due) return "";
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  onUpdate,
  done = false,
}: {
  task: GoogleTask;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (patch: TaskPatch) => void;
  done?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [due, setDue] = useState(dueToInput(task.due));
  const inputRef = useRef<HTMLInputElement>(null);
  const dueInfo = formatDue(task.due);

  // Re-sync drafts when task changes externally (only while closed).
  useEffect(() => {
    if (!open) {
      setTitle(task.title);
      setNotes(task.notes ?? "");
      setDue(dueToInput(task.due));
    }
  }, [task.title, task.notes, task.due, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function save() {
    const patch: TaskPatch = {};
    const t = title.trim();
    if (t && t !== task.title) patch.title = t;
    if ((notes ?? "") !== (task.notes ?? "")) patch.notes = notes;
    if (due !== dueToInput(task.due)) patch.due = due;
    if (Object.keys(patch).length > 0) onUpdate(patch);
    setOpen(false);
  }

  function cancel() {
    setTitle(task.title);
    setNotes(task.notes ?? "");
    setDue(dueToInput(task.due));
    setOpen(false);
  }

  // ── Expanded editor ──
  if (open) {
    return (
      <div
        style={{
          padding: "10px 14px",
          background: "var(--bg-elevated)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          placeholder="Nazwa zadania"
          style={{
            width: "100%",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            background: "var(--bg)",
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius-xs)",
            padding: "6px 10px",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 8,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flex: 1,
              padding: "5px 9px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              background: "var(--bg)",
            }}
          >
            <Calendar size={12} color="var(--text-tertiary)" />
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              style={{
                flex: 1,
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-secondary)",
                background: "transparent",
                border: "none",
                outline: "none",
              }}
            />
            {due && (
              <button
                onClick={() => setDue("")}
                title="Wyczyść datę"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  padding: 0,
                  color: "var(--text-tertiary)",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notatka (opcjonalnie)…"
          rows={2}
          style={{
            width: "100%",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-secondary)",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            padding: "6px 10px",
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
            marginBottom: 8,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={save}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              background: "var(--accent)",
              border: "none",
              borderRadius: "var(--radius-xs)",
              padding: "5px 14px",
              cursor: "pointer",
            }}
          >
            Zapisz
          </button>
          <button
            onClick={cancel}
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              padding: "5px 12px",
              cursor: "pointer",
            }}
          >
            Anuluj
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onDelete}
            title="Usuń zadanie"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--error)",
              background: "var(--error-bg)",
              border: "1px solid var(--error-border)",
              borderRadius: "var(--radius-xs)",
              padding: "5px 10px",
              cursor: "pointer",
            }}
          >
            <Trash2 size={12} /> Usuń
          </button>
        </div>
      </div>
    );
  }

  // ── Collapsed row ──
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "7px 16px",
        background: hovered && !done ? "var(--bg-hover)" : "transparent",
        transition: "background 100ms",
        opacity: done ? 0.5 : 1,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: 17,
          height: 17,
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
          transition: "all 0.15s",
        }}
      >
        {done && <Check size={9} color="#fff" />}
      </button>

      <div
        style={{ flex: 1, minWidth: 0, cursor: done ? "default" : "pointer" }}
        onClick={() => !done && setOpen(true)}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: done ? "var(--text-tertiary)" : "var(--text-primary)",
            textDecoration: done ? "line-through" : "none",
            lineHeight: 1.4,
          }}
        >
          {task.title}
        </div>
        {task.notes && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {task.notes}
          </div>
        )}
        {dueInfo && !done && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 4,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              color: DUE_STYLES[dueInfo.status].color,
              background: DUE_STYLES[dueInfo.status].bg,
              padding: "3px 10px",
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${DUE_STYLES[dueInfo.status].border}`,
              letterSpacing: "-0.01em",
            }}
          >
            <Calendar size={10} /> {dueInfo.label}
          </div>
        )}
      </div>

      {hovered && !done && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          title="Edytuj"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            padding: 2,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
          }}
        >
          <Pencil size={12} />
        </button>
      )}
    </div>
  );
}

// ── Task list panel ───────────────────────────────────────────────────

function TaskListPanel({
  list,
  tasks,
  onToggle,
  onAdd,
  onDelete,
  onUpdate,
}: {
  list: GoogleTaskList;
  tasks: GoogleTask[];
  onToggle: (taskId: string, done: boolean) => void;
  onAdd: (title: string, notes?: string, due?: string) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, patch: TaskPatch) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newDue, setNewDue] = useState("");
  const [adding, setAdding] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pending = tasks.filter((t) => t.status === "needsAction");
  const done = tasks.filter((t) => t.status === "completed");

  function submitAdd() {
    if (!newTitle.trim()) return;
    onAdd(newTitle.trim(), newNotes.trim() || undefined, newDue || undefined);
    setNewTitle("");
    setNewNotes("");
    setNewDue("");
    setAdding(false);
    setShowNotes(false);
  }

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  return (
    <Panel
      style={{
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {list.title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 2,
          }}
        >
          {pending.length}{" "}
          {pending.length === 1 ? "zadanie" : pending.length < 5 ? "zadania" : "zadań"} ·{" "}
          {done.length} ukończone
        </div>
      </div>

      {/* Task list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {pending.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={() => onToggle(task.id, false)}
            onDelete={() => onDelete(task.id)}
            onUpdate={(patch) => onUpdate(task.id, patch)}
          />
        ))}

        {done.length > 0 && (
          <>
            <button
              onClick={() => setDoneExpanded(!doneExpanded)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                width: "100%",
                borderTop: pending.length > 0 ? "1px solid var(--border)" : "none",
                marginTop: pending.length > 0 ? 4 : 0,
              }}
            >
              {doneExpanded ? (
                <ChevronDown size={11} color="var(--text-tertiary)" />
              ) : (
                <ChevronRight size={11} color="var(--text-tertiary)" />
              )}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                }}
              >
                Ukończone ({done.length})
              </span>
            </button>
            {doneExpanded &&
              done.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => onToggle(task.id, true)}
                  onDelete={() => onDelete(task.id)}
                  onUpdate={(patch) => onUpdate(task.id, patch)}
                  done
                />
              ))}
          </>
        )}

        {pending.length === 0 && done.length === 0 && !adding && (
          <div
            style={{
              padding: "20px 16px",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-tertiary)",
              textAlign: "center",
            }}
          >
            Brak zadań
          </div>
        )}
      </div>

      {/* Add task */}
      <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        {adding ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitAdd();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewTitle("");
                  setNewNotes("");
                  setNewDue("");
                  setShowNotes(false);
                }
              }}
              placeholder="Nazwa zadania..."
              style={{
                width: "100%",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-primary)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--accent)",
                borderRadius: "var(--radius-xs)",
                padding: "6px 10px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                style={{
                  flex: 1,
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xs)",
                  padding: "4px 8px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={() => setShowNotes(!showNotes)}
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xs)",
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                + notatka
              </button>
              <button
                onClick={submitAdd}
                disabled={!newTitle.trim()}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: newTitle.trim() ? "#fff" : "var(--text-tertiary)",
                  background: newTitle.trim() ? "var(--accent)" : "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xs)",
                  padding: "4px 10px",
                  cursor: newTitle.trim() ? "pointer" : "default",
                }}
              >
                Dodaj
              </button>
            </div>
            {showNotes && (
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notatka (opcjonalnie)..."
                rows={2}
                style={{
                  width: "100%",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xs)",
                  padding: "6px 10px",
                  outline: "none",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
            )}
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-tertiary)",
              width: "100%",
              textAlign: "left",
            }}
          >
            <Plus size={13} />
            Dodaj zadanie
          </button>
        )}
      </div>
    </Panel>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function ZadaniaPage() {
  const [data, setData] = useState<GoogleTasksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    if (!background) setError(null);
    try {
      const res = await fetch("/api/google/tasks");
      if (!res.ok) {
        if (!background) setError("Brak połączenia z Google. Połącz konto na stronie profilu.");
        return;
      }
      const d = (await res.json()) as GoogleTasksResponse & { error?: string };
      if (d.error) {
        if (!background) setError(d.error);
        return;
      }
      setData(d);
    } catch {
      if (!background) setError("Błąd połączenia z serwerem");
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
    const id = setInterval(() => {
      const active = document.activeElement;
      const isEditing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
      if (!isEditing) void fetchTasks(true);
    }, 30_000);
    const onFocus = () => void fetchTasks(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchTasks]);

  const handleToggle = useCallback(
    async (listId: string, taskId: string, currentlyDone: boolean) => {
      const newStatus = currentlyDone ? "needsAction" : "completed";
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasksByList: {
            ...prev.tasksByList,
            [listId]: prev.tasksByList[listId].map((t) =>
              t.id === taskId ? { ...t, status: newStatus } : t,
            ),
          },
        };
      });
      try {
        await fetch("/api/google/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listId, taskId, status: newStatus }),
        });
      } catch {
        void fetchTasks();
      }
    },
    [fetchTasks],
  );

  const handleAdd = useCallback(
    async (listId: string, title: string, notes?: string, due?: string) => {
      const tempId = `temp-${Date.now()}`;
      const tempTask: GoogleTask = {
        id: tempId,
        title,
        status: "needsAction",
        notes,
        due,
        updated: new Date().toISOString(),
      };
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasksByList: {
            ...prev.tasksByList,
            [listId]: [tempTask, ...(prev.tasksByList[listId] ?? [])],
          },
        };
      });
      try {
        const res = await fetch("/api/google/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listId, title, notes, due }),
        });
        const json = (await res.json()) as { task?: GoogleTask };
        if (json.task) {
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              tasksByList: {
                ...prev.tasksByList,
                [listId]: prev.tasksByList[listId].map((t) => (t.id === tempId ? json.task! : t)),
              },
            };
          });
        }
      } catch {
        void fetchTasks();
      }
    },
    [fetchTasks],
  );

  const handleDelete = useCallback(
    async (listId: string, taskId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasksByList: {
            ...prev.tasksByList,
            [listId]: prev.tasksByList[listId].filter((t) => t.id !== taskId),
          },
        };
      });
      try {
        await fetch("/api/google/tasks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listId, taskId }),
        });
      } catch {
        void fetchTasks();
      }
    },
    [fetchTasks],
  );

  const handleUpdate = useCallback(
    async (listId: string, taskId: string, patch: TaskPatch) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasksByList: {
            ...prev.tasksByList,
            [listId]: prev.tasksByList[listId].map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    ...(patch.title !== undefined ? { title: patch.title } : {}),
                    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
                    ...(patch.due !== undefined ? { due: patch.due || undefined } : {}),
                  }
                : t,
            ),
          },
        };
      });
      try {
        await fetch("/api/google/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listId, taskId, ...patch }),
        });
      } catch {
        void fetchTasks();
      }
    },
    [fetchTasks],
  );

  const rawLists = (data?.lists ?? []).filter((l) => {
    const t = l.title.toLowerCase();
    return !t.includes("pomysły") && !t.includes("inspiracje") && !t.includes("pomysly");
  });
  // Swap positions: list at index 0 (top-left) ↔ list at index 2 (bottom-left)
  const lists =
    rawLists.length >= 3 ? [rawLists[2], rawLists[1], rawLists[0], ...rawLists.slice(3)] : rawLists;

  return (
    <div
      style={{
        height: "100%",
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
          padding: "0 20px",
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <CheckSquare size={15} color="var(--accent)" />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            flex: 1,
          }}
        >
          Zadania
        </span>
        <button
          onClick={() => void fetchTasks()}
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
          <RefreshCw size={11} />
          Odśwież
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", padding: 16 }}>
        {loading && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-tertiary)",
              textAlign: "center",
              paddingTop: 40,
            }}
          >
            Pobieranie zadań...
          </div>
        )}

        {!loading && error && (
          <Panel style={{ padding: 20, textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          </Panel>
        )}

        {!loading && !error && lists.length === 0 && (
          <Panel style={{ padding: 20, textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-tertiary)",
              }}
            >
              Brak list zadań w Google Tasks.
            </div>
          </Panel>
        )}

        {!loading && !error && lists.length > 0 && (
          <div
            className="responsive-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: lists.length > 2 ? "1fr 1fr" : "1fr",
              gap: 14,
              height: "100%",
            }}
          >
            {lists.map((list) => (
              <TaskListPanel
                key={list.id}
                list={list}
                tasks={data?.tasksByList[list.id] ?? []}
                onToggle={(taskId, done) => void handleToggle(list.id, taskId, done)}
                onAdd={(title, notes, due) => void handleAdd(list.id, title, notes, due)}
                onDelete={(taskId) => void handleDelete(list.id, taskId)}
                onUpdate={(taskId, patch) => void handleUpdate(list.id, taskId, patch)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
