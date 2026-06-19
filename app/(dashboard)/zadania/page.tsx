"use client";

import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CalendarRange,
  Check,
  CircleCheck,
  Flame,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GoogleTask, GoogleTaskList, GoogleTasksResponse } from "@/app/api/google/tasks/route";

// ── Types ──────────────────────────────────────────────────────────

type Priority = "high" | "medium" | "low";
type Bucket = "today" | "tomorrow" | "week" | "month";
type ListSel = { type: "google"; listId: string } | { type: "local"; bucket: Bucket };

interface Task {
  id: string;
  title: string;
  bucket: Bucket;
  priority: Priority;
  done: boolean;
  note?: string;
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────

const BUCKETS: { id: Bucket; label: string; Icon: React.ElementType; color: string }[] = [
  { id: "today", label: "Dziś", Icon: Flame, color: "#ff3b30" },
  { id: "tomorrow", label: "Jutro", Icon: Calendar, color: "#ff9500" },
  { id: "week", label: "Ten tydzień", Icon: CalendarDays, color: "#007aff" },
  { id: "month", label: "Ten miesiąc", Icon: CalendarRange, color: "#af52de" },
];

const PRIORITY: Record<Priority, { label: string; color: string; bg: string }> = {
  high: { label: "Wysoki", color: "#ff3b30", bg: "rgba(255,59,48,0.09)" },
  medium: { label: "Średni", color: "#ff9500", bg: "rgba(255,149,0,0.09)" },
  low: { label: "Niski", color: "#8e8e93", bg: "rgba(142,142,147,0.09)" },
};

const STORAGE_KEY = "autorise-zadania-v1";
const f = { system: "var(--font-system)", mono: "var(--font-mono)" };

// ── Local task helpers ─────────────────────────────────────────────

function uid() {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function loadLocal(): Task[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function saveLocal(t: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}
function cyclePri(p: Priority): Priority {
  const o: Priority[] = ["high", "medium", "low"];
  return o[(o.indexOf(p) + 1) % 3];
}

// ── Google logo svg ────────────────────────────────────────────────

function GIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ── Markdown renderer ──────────────────────────────────────────────

function applyInline(s: string): string {
  return s
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /`([^`]+)`/g,
      '<code style="font-family:var(--font-mono);font-size:0.85em;background:rgba(0,0,0,0.07);padding:1px 4px;border-radius:3px">$1</code>',
    );
}

function renderMarkdown(raw: string): string {
  const esc = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = esc.split("\n");
  const out: string[] = [];
  let inList = false;

  for (const line of lines) {
    const isList = line.startsWith("- ") || line.startsWith("* ");
    if (isList) {
      if (!inList) {
        out.push('<ul style="margin:4px 0;padding-left:16px">');
        inList = true;
      }
      out.push(`<li style="margin:2px 0">${applyInline(line.slice(2))}</li>`);
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      if (line.startsWith("### "))
        out.push(
          `<div style="font-size:12.5px;font-weight:700;margin:7px 0 3px;color:var(--text-primary)">${applyInline(line.slice(4))}</div>`,
        );
      else if (line.startsWith("## "))
        out.push(
          `<div style="font-size:14px;font-weight:800;margin:9px 0 4px;color:var(--text-primary)">${applyInline(line.slice(3))}</div>`,
        );
      else if (line.startsWith("# "))
        out.push(
          `<div style="font-size:15px;font-weight:900;margin:10px 0 5px;color:var(--text-primary)">${applyInline(line.slice(2))}</div>`,
        );
      else if (line === "---")
        out.push('<div style="height:1px;background:var(--border);margin:7px 0"></div>');
      else if (line.trim() === "") out.push('<div style="height:5px"></div>');
      else out.push(`<div style="line-height:1.55">${applyInline(line)}</div>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

// ── Markdown editor (edit / preview tabs) ─────────────────────────

function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeight = 72,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  return (
    <div>
      <div style={{ display: "flex", gap: 1, marginBottom: 5 }}>
        {(["edit", "preview"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "2px 9px",
              border: "none",
              borderRadius: 5,
              cursor: "pointer",
              background: mode === m ? "var(--accent-subtle)" : "transparent",
              fontFamily: f.system,
              fontSize: 11,
              color: mode === m ? "var(--accent)" : "var(--text-tertiary)",
              fontWeight: mode === m ? 600 : 400,
              transition: "background 0.1s",
            }}
          >
            {m === "edit" ? "Edytuj" : "Podgląd"}
          </button>
        ))}
      </div>
      {mode === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            minHeight,
            padding: "8px 10px",
            boxSizing: "border-box",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--bg)",
            color: "var(--text-primary)",
            fontFamily: f.mono,
            fontSize: 12,
            lineHeight: 1.55,
            resize: "vertical",
            outline: "none",
          }}
        />
      ) : (
        <div
          dangerouslySetInnerHTML={{
            __html: value
              ? renderMarkdown(value)
              : `<span style="color:var(--text-tertiary);font-style:italic">${placeholder ?? "Brak opisu"}</span>`,
          }}
          style={{
            minHeight,
            padding: "8px 10px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--bg)",
            color: "var(--text-secondary)",
            fontFamily: f.system,
            fontSize: 12.5,
            lineHeight: 1.6,
          }}
        />
      )}
    </div>
  );
}

// ── List sidebar ───────────────────────────────────────────────────

function ListSidebar({
  selected,
  onSelect,
  googleLists,
  googleLoading,
  googleError,
  onRefresh,
}: {
  selected: ListSel;
  onSelect: (s: ListSel) => void;
  googleLists: GoogleTaskList[];
  googleLoading: boolean;
  googleError: "not_connected" | "failed" | null;
  onRefresh: () => void;
}) {
  const isSel = (s: ListSel) => {
    if (s.type === "google" && selected.type === "google") return s.listId === selected.listId;
    if (s.type === "local" && selected.type === "local") return s.bucket === selected.bucket;
    return false;
  };

  function ListBtn({
    children,
    active,
    onClick,
    color = "var(--text-secondary)",
  }: {
    children: React.ReactNode;
    active: boolean;
    onClick: () => void;
    color?: string;
  }) {
    const [hov, setHov] = useState(false);
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "7px 10px",
          borderRadius: 8,
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          background: active
            ? "var(--bg-item-active)"
            : hov
              ? "var(--bg-item-hover)"
              : "transparent",
          transition: "background 100ms ease",
          fontFamily: f.system,
          fontSize: 12.5,
          fontWeight: active ? 600 : 400,
          color: active ? "var(--text-on-active)" : color,
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <div
      style={{
        width: 200,
        flexShrink: 0,
        background: "var(--glass)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        border: "1px solid var(--glass-border)",
        borderRadius: 14,
        boxShadow: "var(--glass-shadow)",
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        alignSelf: "flex-start",
        position: "sticky",
        top: 24,
      }}
    >
      <div style={{ padding: "2px 10px 6px", display: "flex", alignItems: "center", gap: 6 }}>
        <GIcon size={12} />
        <span
          style={{
            fontFamily: f.system,
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            flex: 1,
          }}
        >
          Google Tasks
        </span>
        {!googleLoading && !googleError && (
          <button
            onClick={onRefresh}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              display: "flex",
              padding: 2,
            }}
          >
            <RefreshCw size={10} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {googleLoading && (
        <div
          style={{
            padding: "6px 10px",
            fontFamily: f.system,
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          Ładowanie...
        </div>
      )}
      {googleError === "not_connected" && (
        <a href="/profil" style={{ textDecoration: "none", display: "block", padding: "6px 10px" }}>
          <div style={{ fontFamily: f.system, fontSize: 11, color: "#1a56ff" }}>Połącz Google</div>
        </a>
      )}
      {!googleLoading &&
        !googleError &&
        googleLists.map((list) => (
          <ListBtn
            key={list.id}
            active={isSel({ type: "google", listId: list.id })}
            onClick={() => onSelect({ type: "google", listId: list.id })}
          >
            <GIcon size={12} />
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {list.title}
            </span>
          </ListBtn>
        ))}

      <div style={{ height: 1, background: "var(--border)", margin: "6px 2px" }} />

      <div style={{ padding: "2px 10px 6px" }}>
        <span
          style={{
            fontFamily: f.system,
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Lokalne
        </span>
      </div>
      {BUCKETS.map((b) => {
        const BIcon = b.Icon;
        return (
          <ListBtn
            key={b.id}
            active={isSel({ type: "local", bucket: b.id })}
            onClick={() => onSelect({ type: "local", bucket: b.id })}
            color={b.color}
          >
            <BIcon
              size={13}
              color={isSel({ type: "local", bucket: b.id }) ? "var(--text-on-active)" : b.color}
              strokeWidth={1.7}
            />
            {b.label}
          </ListBtn>
        );
      })}
    </div>
  );
}

// ── Google Task card ───────────────────────────────────────────────

function GTaskCard({
  task,
  listId,
  onToggle,
  onDelete,
  onEdit,
}: {
  task: GoogleTask;
  listId: string;
  onToggle: (listId: string, taskId: string, status: "needsAction" | "completed") => Promise<void>;
  onDelete: (listId: string, taskId: string) => Promise<void>;
  onEdit: (
    listId: string,
    taskId: string,
    updates: { title?: string; notes?: string; due?: string },
  ) => Promise<void>;
}) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editNotes, setEditNotes] = useState(task.notes ?? "");
  const [editDue, setEditDue] = useState(task.due ? task.due.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const done = task.status === "completed";

  async function toggle() {
    setToggling(true);
    await onToggle(listId, task.id, done ? "needsAction" : "completed");
    setToggling(false);
  }

  async function del() {
    setDeleting(true);
    await onDelete(listId, task.id);
    setDeleting(false);
  }

  async function save() {
    if (!editTitle.trim()) return;
    setSaving(true);
    await onEdit(listId, task.id, {
      title: editTitle.trim(),
      notes: editNotes.trim() || undefined,
      due: editDue || undefined,
    });
    setSaving(false);
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
    setEditTitle(task.title);
    setEditNotes(task.notes ?? "");
    setEditDue(task.due ? task.due.slice(0, 10) : "");
  }

  // Edit mode
  if (editing) {
    return (
      <div
        style={{
          padding: "14px 16px",
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: "1px solid #1a56ff",
          borderLeft: "3px solid #1a56ff",
          borderRadius: 11,
          boxShadow: "0 0 0 3px rgba(26,86,255,0.07)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancelEdit();
          }}
          style={{
            border: "none",
            background: "transparent",
            fontFamily: f.system,
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--text-primary)",
            outline: "none",
            width: "100%",
          }}
        />
        <MarkdownEditor
          value={editNotes}
          onChange={setEditNotes}
          placeholder="Opis (markdown obsługiwany)..."
          minHeight={80}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: f.system, fontSize: 11, color: "var(--text-tertiary)" }}>
            Termin:
          </span>
          <input
            type="date"
            value={editDue}
            onChange={(e) => setEditDue(e.target.value)}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "3px 8px",
              fontFamily: f.system,
              fontSize: 11,
              color: "var(--text-primary)",
              background: "var(--bg)",
              outline: "none",
            }}
          />
          {editDue && (
            <button
              onClick={() => setEditDue("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                padding: 2,
                display: "flex",
              }}
            >
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <button
            onClick={cancelEdit}
            style={{
              padding: "5px 12px",
              borderRadius: 7,
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              fontFamily: f.system,
              fontSize: 11.5,
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Anuluj
          </button>
          <button
            onClick={save}
            disabled={!editTitle.trim() || saving}
            style={{
              padding: "5px 16px",
              borderRadius: 7,
              border: "none",
              background: editTitle.trim() ? "#1a56ff" : "var(--bg-item-hover)",
              fontFamily: f.system,
              fontSize: 11.5,
              fontWeight: 600,
              color: editTitle.trim() ? "#fff" : "var(--text-tertiary)",
              cursor: editTitle.trim() && !saving ? "pointer" : "default",
              transition: "background 0.12s",
            }}
          >
            {saving ? "..." : "Zapisz"}
          </button>
        </div>
      </div>
    );
  }

  // Display mode
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 13px",
        background: "var(--glass)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        border: "1px solid var(--glass-border)",
        borderLeft: `3px solid ${done ? "var(--border)" : "#4285F4"}`,
        borderRadius: 11,
        boxShadow: "var(--glass-shadow)",
        opacity: done || deleting ? 0.55 : 1,
        transition: "opacity 0.15s",
      }}
    >
      <button
        onClick={toggle}
        disabled={toggling}
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          flexShrink: 0,
          marginTop: 1,
          border: done ? "none" : "1.5px solid #4285F4",
          background: done ? "#4285F4" : "transparent",
          cursor: toggling ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.12s",
        }}
      >
        {done && <Check size={10} color="#fff" strokeWidth={2.5} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: f.system,
            fontSize: 13,
            color: done ? "var(--text-tertiary)" : "var(--text-primary)",
            textDecoration: done ? "line-through" : "none",
            lineHeight: 1.45,
            wordBreak: "break-word",
          }}
        >
          {task.title}
        </div>
        {task.notes && (
          <div
            dangerouslySetInnerHTML={{ __html: renderMarkdown(task.notes) }}
            style={{
              marginTop: 5,
              color: "var(--text-tertiary)",
              fontFamily: f.system,
              fontSize: 11.5,
              lineHeight: 1.45,
            }}
          />
        )}
        {task.due && (
          <div
            style={{
              fontFamily: f.mono,
              fontSize: 10,
              color: "var(--text-tertiary)",
              marginTop: 4,
            }}
          >
            {new Date(task.due).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
        <button
          onClick={() => setEditing(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            opacity: 0.6,
            padding: 3,
            borderRadius: 5,
            display: "flex",
            transition: "opacity 0.12s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.6";
          }}
        >
          <Pencil size={12} strokeWidth={1.6} />
        </button>
        <button
          onClick={del}
          disabled={deleting}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            opacity: 0.6,
            padding: 3,
            borderRadius: 5,
            display: "flex",
          }}
        >
          <Trash2 size={12} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}

// ── Local Task card ────────────────────────────────────────────────

function LTaskCard({
  task,
  onToggle,
  onDelete,
  onPriority,
  onMoveTo,
  onSave,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onPriority: () => void;
  onMoveTo: (b: Bucket) => void;
  onSave: (updates: { title?: string; note?: string }) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task.title);
  const [noteVal, setNoteVal] = useState(task.note ?? "");
  const [showNote, setShowNote] = useState(!!task.note);
  const p = PRIORITY[task.priority];
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  function commitTitle() {
    setEditTitle(false);
    const t = titleVal.trim();
    if (t && t !== task.title) onSave({ title: t });
    else setTitleVal(task.title);
  }

  function commitNote() {
    onSave({ note: noteVal.trim() || undefined });
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 13px",
        background: "var(--glass)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        border: "1px solid var(--glass-border)",
        borderLeft: `3px solid ${task.done ? "var(--border)" : p.color}`,
        borderRadius: 11,
        boxShadow: "var(--glass-shadow)",
        opacity: task.done ? 0.5 : 1,
        transition: "opacity 0.15s",
        position: "relative",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          flexShrink: 0,
          marginTop: 1,
          border: task.done ? "none" : `1.5px solid ${p.color}`,
          background: task.done ? p.color : "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.12s",
        }}
      >
        {task.done && <Check size={10} color="#fff" strokeWidth={2.5} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {editTitle ? (
          <input
            autoFocus
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setEditTitle(false);
                setTitleVal(task.title);
              }
            }}
            style={{
              border: "none",
              borderBottom: "1px solid var(--accent)",
              background: "transparent",
              fontFamily: f.system,
              fontSize: 13,
              color: "var(--text-primary)",
              outline: "none",
              width: "100%",
              paddingBottom: 2,
            }}
          />
        ) : (
          <div
            onClick={() => !task.done && setEditTitle(true)}
            style={{
              fontFamily: f.system,
              fontSize: 13,
              color: task.done ? "var(--text-tertiary)" : "var(--text-primary)",
              textDecoration: task.done ? "line-through" : "none",
              lineHeight: 1.45,
              wordBreak: "break-word",
              cursor: task.done ? "default" : "text",
            }}
          >
            {task.title}
          </div>
        )}

        {(showNote || task.note) && (
          <div style={{ marginTop: 7 }}>
            <MarkdownEditor
              value={noteVal}
              onChange={setNoteVal}
              placeholder="Notatka (markdown obsługiwany)..."
              minHeight={60}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button
                onClick={commitNote}
                style={{
                  padding: "3px 10px",
                  borderRadius: 5,
                  border: "none",
                  background: "#1a56ff",
                  fontFamily: f.system,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Zapisz
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: showNote || task.note ? 6 : 5,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={onPriority}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 7px",
              borderRadius: 20,
              background: p.bg,
              border: "none",
              cursor: "pointer",
              fontFamily: f.system,
              fontSize: 10,
              fontWeight: 500,
              color: p.color,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: p.color,
                display: "inline-block",
              }}
            />
            {p.label}
          </button>
          {!showNote && !task.note && (
            <button
              onClick={() => setShowNote(true)}
              style={{
                fontFamily: f.system,
                fontSize: 10,
                color: "var(--text-tertiary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 0",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <StickyNote size={9} /> notatka
            </button>
          )}
        </div>
      </div>

      <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "none",
            background: menuOpen ? "var(--bg-item-hover)" : "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-tertiary)",
          }}
        >
          <MoreHorizontal size={14} strokeWidth={1.6} />
        </button>

        {menuOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "100%",
              marginTop: 4,
              background: "var(--glass)",
              backdropFilter: "var(--glass-blur)",
              WebkitBackdropFilter: "var(--glass-blur)",
              border: "1px solid var(--glass-border)",
              borderRadius: 10,
              padding: "4px 0",
              minWidth: 145,
              boxShadow: "var(--glass-shadow)",
              zIndex: 100,
            }}
          >
            <div
              style={{
                padding: "3px 12px 5px",
                fontFamily: f.system,
                fontSize: 10,
                color: "var(--text-tertiary)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Przenieś do
            </div>
            {BUCKETS.filter((b) => b.id !== task.bucket).map((b) => {
              const BIcon = b.Icon;
              return (
                <MenuBtn
                  key={b.id}
                  onClick={() => {
                    onMoveTo(b.id);
                    setMenuOpen(false);
                  }}
                >
                  <BIcon size={12} color={b.color} strokeWidth={1.6} />
                  {b.label}
                </MenuBtn>
              );
            })}
            <div style={{ height: 1, background: "var(--separator)", margin: "4px 0" }} />
            <MenuBtn
              onClick={() => {
                onDelete();
                setMenuOpen(false);
              }}
              danger
            >
              <Trash2 size={12} strokeWidth={1.6} />
              Usuń
            </MenuBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "7px 12px",
        textAlign: "left",
        background: hov ? "var(--bg-item-hover)" : "none",
        border: "none",
        cursor: "pointer",
        fontFamily: f.system,
        fontSize: 12,
        color: danger ? "#ff3b30" : "var(--text-primary)",
        transition: "background 80ms ease",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  );
}

// ── Add task input ─────────────────────────────────────────────────

function AddTaskRow({
  onAdd,
  isGoogle,
}: {
  onAdd: (title: string, notes?: string, priority?: Priority) => Promise<void> | void;
  isGoogle: boolean;
}) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const t = title.trim();
    if (!t) {
      setActive(false);
      return;
    }
    setAdding(true);
    await onAdd(t, notes.trim() || undefined, priority);
    setTitle("");
    setNotes("");
    setPriority("medium");
    setAdding(false);
    inputRef.current?.focus();
  }

  if (!active) {
    return (
      <button
        onClick={() => {
          setActive(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        style={{
          width: "100%",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 7,
          background: "transparent",
          border: "1px dashed var(--border)",
          borderRadius: 10,
          cursor: "pointer",
          fontFamily: f.system,
          fontSize: 12.5,
          color: "var(--text-tertiary)",
          transition: "border-color 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#1a56ff";
          e.currentTarget.style.color = "#1a56ff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--text-tertiary)";
        }}
      >
        <Plus size={14} strokeWidth={2} /> Dodaj zadanie
      </button>
    );
  }

  return (
    <div
      style={{
        padding: "11px 13px",
        background: "var(--glass)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        border: "1px solid #1a56ff",
        borderRadius: 11,
        boxShadow: "0 0 0 3px rgba(26,86,255,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 7,
      }}
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setActive(false);
            setTitle("");
          }
        }}
        placeholder="Tytuł zadania..."
        style={{
          border: "none",
          background: "transparent",
          fontFamily: f.system,
          fontSize: 13,
          color: "var(--text-primary)",
          outline: "none",
          width: "100%",
        }}
      />
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={isGoogle ? "Notatka (opcjonalnie)..." : "Notatka..."}
        style={{
          border: "none",
          background: "transparent",
          fontFamily: f.system,
          fontSize: 12,
          color: "var(--text-secondary)",
          outline: "none",
          width: "100%",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {!isGoogle && (
          <button
            onClick={() => setPriority(cyclePri(priority))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 20,
              background: PRIORITY[priority].bg,
              border: "none",
              cursor: "pointer",
              fontFamily: f.system,
              fontSize: 11,
              fontWeight: 500,
              color: PRIORITY[priority].color,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: PRIORITY[priority].color,
                display: "inline-block",
              }}
            />
            {PRIORITY[priority].label}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            setActive(false);
            setTitle("");
          }}
          style={{
            padding: "4px 10px",
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "var(--bg-elevated)",
            fontFamily: f.system,
            fontSize: 11,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          Anuluj
        </button>
        <button
          onClick={submit}
          disabled={!title.trim() || adding}
          style={{
            padding: "4px 14px",
            border: "none",
            borderRadius: 6,
            background: title.trim() ? "#1a56ff" : "var(--bg-item-hover)",
            fontFamily: f.system,
            fontSize: 11,
            fontWeight: 600,
            color: title.trim() ? "#fff" : "var(--text-tertiary)",
            cursor: title.trim() && !adding ? "pointer" : "default",
            transition: "background 0.12s",
          }}
        >
          {adding ? "..." : "Dodaj"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────

export default function ZadaniaPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [gData, setGData] = useState<GoogleTasksResponse | null>(null);
  const [gLoading, setGLoading] = useState(true);
  const [gError, setGError] = useState<"not_connected" | "failed" | null>(null);
  const [selected, setSelected] = useState<ListSel>({ type: "local", bucket: "today" });
  const [autoSwitched, setAutoSwitched] = useState(false);

  useEffect(() => {
    setTasks(loadLocal());
    setLoaded(true);
  }, []);

  const fetchGoogle = useCallback(async () => {
    setGLoading(true);
    setGError(null);
    try {
      const res = await fetch("/api/google/tasks");
      if (res.status === 401) {
        setGError("not_connected");
        return;
      }
      if (!res.ok) {
        setGError("failed");
        return;
      }
      setGData((await res.json()) as GoogleTasksResponse);
    } catch {
      setGError("failed");
    } finally {
      setGLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogle();
  }, [fetchGoogle]);

  useEffect(() => {
    if (gData?.lists.length && !autoSwitched) {
      const naDs = gData.lists.find((l) =>
        ["Na dziś", "@Na dziś", "Today", "Moje zadania"].includes(l.title),
      );
      setSelected({ type: "google", listId: (naDs ?? gData.lists[0]).id });
      setAutoSwitched(true);
    }
  }, [gData, autoSwitched]);

  function persist(updated: Task[]) {
    setTasks(updated);
    saveLocal(updated);
  }

  function addLocal(bucket: Bucket, title: string, priority: Priority) {
    persist([
      { id: uid(), title, bucket, priority, done: false, createdAt: new Date().toISOString() },
      ...tasks,
    ]);
  }

  async function gToggle(listId: string, taskId: string, status: "needsAction" | "completed") {
    await fetch("/api/google/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, taskId, status }),
    });
    setGData((prev) =>
      prev
        ? {
            ...prev,
            tasksByList: {
              ...prev.tasksByList,
              [listId]: prev.tasksByList[listId].map((t) =>
                t.id === taskId ? { ...t, status } : t,
              ),
            },
          }
        : prev,
    );
  }

  async function gDelete(listId: string, taskId: string) {
    await fetch("/api/google/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, taskId }),
    });
    setGData((prev) =>
      prev
        ? {
            ...prev,
            tasksByList: {
              ...prev.tasksByList,
              [listId]: prev.tasksByList[listId].filter((t) => t.id !== taskId),
            },
          }
        : prev,
    );
  }

  async function gAdd(listId: string, title: string, notes?: string) {
    const res = await fetch("/api/google/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, title, notes }),
    });
    if (!res.ok) return;
    const { task } = (await res.json()) as { task: GoogleTask };
    setGData((prev) =>
      prev
        ? {
            ...prev,
            tasksByList: {
              ...prev.tasksByList,
              [listId]: [task, ...(prev.tasksByList[listId] ?? [])],
            },
          }
        : prev,
    );
  }

  async function gEdit(
    listId: string,
    taskId: string,
    updates: { title?: string; notes?: string; due?: string },
  ) {
    await fetch("/api/google/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, taskId, ...updates }),
    });
    setGData((prev) =>
      prev
        ? {
            ...prev,
            tasksByList: {
              ...prev.tasksByList,
              [listId]: prev.tasksByList[listId].map((t) =>
                t.id === taskId ? { ...t, ...updates } : t,
              ),
            },
          }
        : prev,
    );
  }

  function lEdit(taskId: string, updates: Partial<Pick<Task, "title" | "note" | "priority">>) {
    persist(tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
  }

  // Header info
  let headerLabel = "";
  let headerColor = "#1a56ff";
  let taskCount = 0;

  if (selected.type === "google") {
    const list = gData?.lists.find((l) => l.id === selected.listId);
    headerLabel = list?.title ?? "Google Tasks";
    taskCount = (gData?.tasksByList[selected.listId] ?? []).filter(
      (t) => t.status !== "completed",
    ).length;
  } else {
    const b = BUCKETS.find((b) => b.id === selected.bucket)!;
    headerLabel = b.label;
    headerColor = b.color;
    taskCount = tasks.filter((t) => t.bucket === selected.bucket && !t.done).length;
  }

  const todayStats = tasks.filter((t) => t.bucket === "today" && !t.done).length;

  if (!loaded) return null;

  return (
    <div
      style={{
        minHeight: "100%",
        background: "var(--bg)",
        backgroundImage: "var(--page-gradient)",
        padding: "24px 24px 40px",
      }}
    >
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
        <h1
          style={{
            fontFamily: f.system,
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
            letterSpacing: "-0.03em",
          }}
        >
          Zadania
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 6 }}>
          {todayStats > 0 && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: f.system,
                fontSize: 12,
                color: "#ff3b30",
              }}
            >
              <Flame size={11} strokeWidth={1.8} />
              <strong>{todayStats}</strong> dziś
            </span>
          )}
          <span style={{ fontFamily: f.system, fontSize: 12, color: "var(--text-tertiary)" }}>
            {new Date().toLocaleDateString("pl-PL", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <ListSidebar
          selected={selected}
          onSelect={setSelected}
          googleLists={gData?.lists ?? []}
          googleLoading={gLoading}
          googleError={gError}
          onRefresh={fetchGoogle}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
              paddingBottom: 14,
              borderBottom: `2px solid ${headerColor}20`,
            }}
          >
            {selected.type === "google" ? (
              <GIcon size={16} />
            ) : (
              (() => {
                const b = BUCKETS.find(
                  (b) => b.id === (selected as { type: "local"; bucket: Bucket }).bucket,
                )!;
                const BIcon = b.Icon;
                return <BIcon size={16} color={headerColor} strokeWidth={1.8} />;
              })()
            )}
            <span
              style={{
                fontFamily: f.system,
                fontSize: 17,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              {headerLabel}
            </span>
            {taskCount > 0 && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: `${headerColor}15`,
                  fontFamily: f.system,
                  fontSize: 11,
                  fontWeight: 600,
                  color: headerColor,
                }}
              >
                {taskCount}
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {selected.type === "google" ? (
              <>
                {gError === "not_connected" && (
                  <div
                    style={{
                      padding: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "var(--glass)",
                      backdropFilter: "var(--glass-blur)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: 12,
                    }}
                  >
                    <span
                      style={{ fontFamily: f.system, fontSize: 12, color: "var(--text-secondary)" }}
                    >
                      Połącz konto Google aby zobaczyć zadania
                    </span>
                    <a
                      href="/profil"
                      style={{
                        padding: "6px 14px",
                        borderRadius: 7,
                        textDecoration: "none",
                        background: "#1a56ff",
                        fontFamily: f.system,
                        fontSize: 12,
                        color: "#fff",
                        fontWeight: 500,
                      }}
                    >
                      Połącz Google
                    </a>
                  </div>
                )}
                {gError === "failed" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px",
                      fontFamily: f.system,
                      fontSize: 12,
                      color: "#ff3b30",
                    }}
                  >
                    <AlertCircle size={14} />
                    Błąd ładowania.{" "}
                    <button
                      onClick={fetchGoogle}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#1a56ff",
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: f.system,
                      }}
                    >
                      Spróbuj ponownie
                    </button>
                  </div>
                )}
                {!gError && !gLoading && (
                  <>
                    <AddTaskRow
                      isGoogle
                      onAdd={(title, notes) =>
                        gAdd((selected as { type: "google"; listId: string }).listId, title, notes)
                      }
                    />
                    {(
                      gData?.tasksByList[(selected as { type: "google"; listId: string }).listId] ??
                      []
                    )
                      .sort((a, b) =>
                        a.status !== b.status ? (a.status === "completed" ? 1 : -1) : 0,
                      )
                      .map((task) => (
                        <GTaskCard
                          key={task.id}
                          task={task}
                          listId={(selected as { type: "google"; listId: string }).listId}
                          onToggle={gToggle}
                          onDelete={gDelete}
                          onEdit={gEdit}
                        />
                      ))}
                    {(
                      gData?.tasksByList[(selected as { type: "google"; listId: string }).listId] ??
                      []
                    ).length === 0 && (
                      <div
                        style={{
                          padding: "32px 0",
                          textAlign: "center",
                          fontFamily: f.system,
                          fontSize: 12,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        <CircleCheck
                          size={28}
                          color="var(--border)"
                          style={{ margin: "0 auto 8px", display: "block" }}
                        />
                        Lista jest pusta
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <AddTaskRow
                  isGoogle={false}
                  onAdd={(title, _notes, priority = "medium") =>
                    addLocal(
                      (selected as { type: "local"; bucket: Bucket }).bucket,
                      title,
                      priority,
                    )
                  }
                />
                {tasks
                  .filter(
                    (t) => t.bucket === (selected as { type: "local"; bucket: Bucket }).bucket,
                  )
                  .sort((a, b) => {
                    if (a.done !== b.done) return a.done ? 1 : -1;
                    const o: Priority[] = ["high", "medium", "low"];
                    return o.indexOf(a.priority) - o.indexOf(b.priority);
                  })
                  .map((task) => (
                    <LTaskCard
                      key={task.id}
                      task={task}
                      onToggle={() =>
                        persist(tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))
                      }
                      onDelete={() => persist(tasks.filter((t) => t.id !== task.id))}
                      onPriority={() =>
                        persist(
                          tasks.map((t) =>
                            t.id === task.id ? { ...t, priority: cyclePri(t.priority) } : t,
                          ),
                        )
                      }
                      onMoveTo={(b) =>
                        persist(tasks.map((t) => (t.id === task.id ? { ...t, bucket: b } : t)))
                      }
                      onSave={(updates) => lEdit(task.id, updates)}
                    />
                  ))}
                {tasks.filter(
                  (t) => t.bucket === (selected as { type: "local"; bucket: Bucket }).bucket,
                ).length === 0 && (
                  <div
                    style={{
                      padding: "32px 0",
                      textAlign: "center",
                      fontFamily: f.system,
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <CircleCheck
                      size={28}
                      color="var(--border)"
                      style={{ margin: "0 auto 8px", display: "block" }}
                    />
                    Brak zadań
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
