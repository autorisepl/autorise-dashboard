"use client";

import { Check, Repeat, StickyNote } from "lucide-react";
import { useState } from "react";
import {
  DRAG_TYPE_TASK,
  type DragPayload,
  DUE_STYLES,
  formatDue,
  PRIORITY_STYLE,
  type Priority,
  parseRecurrenceFromNotes,
  RECURRENCE_LABEL,
  stripMetaTags,
  type TaskWithList,
} from "@/lib/schedule/dateHelpers";

// Karta zadania bez godziny — zwarta (1-2 linie), zgodna z jednolitym kontraktem interakcji:
// klik gdziekolwiek poza checkboxem otwiera TaskEditor (edycja + usuwanie), cała karta jest
// przeciągalna. Brak osobnych mikro-edycji inline (dawne EditableText/TaskNotes/PriorityBadge
// zniknęły razem z tym plikiem — wszystko idzie teraz przez jeden popover).

interface NoTimeTaskCardProps {
  item: TaskWithList;
  priority: Priority | null;
  toggleDone: (item: TaskWithList) => void;
  onOpen: (item: TaskWithList) => void;
}

export function NoTimeTaskCard({ item, priority, toggleDone, onOpen }: NoTimeTaskCardProps) {
  const [dragging, setDragging] = useState(false);
  const dueInfo = formatDue(item.task.due);
  const done = item.task.status === "completed";
  const hasNotes = stripMetaTags(item.task.notes).length > 0;
  const recurrence = parseRecurrenceFromNotes(item.task.notes);
  const s = priority ? PRIORITY_STYLE[priority] : null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        const payload: DragPayload = { taskId: item.task.id };
        e.dataTransfer.setData(DRAG_TYPE_TASK, JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onClick={() => onOpen(item)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
        padding: "5px 6px",
        marginBottom: 2,
        borderRadius: "var(--radius-xs)",
        border: "1px solid var(--border)",
        cursor: "pointer",
        opacity: dragging ? 0.4 : 1,
        transform: dragging ? "scale(0.98)" : "scale(1)",
        transition: "opacity 120ms, transform 120ms, background 100ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleDone(item);
        }}
        style={{
          width: 15,
          height: 15,
          borderRadius: "50%",
          border: done ? "2px solid var(--success)" : "2px solid #fff",
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
        {done && <Check size={9} color="#fff" strokeWidth={3} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {s && (
            <span
              title="Priorytet"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: s.color,
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-primary)",
              textDecoration: done ? "line-through" : "none",
              opacity: done ? 0.6 : 1,
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {item.task.title}
          </span>
          {recurrence && (
            <span title={RECURRENCE_LABEL[recurrence]} style={{ display: "flex", flexShrink: 0 }}>
              <Repeat size={9} color="var(--accent)" />
            </span>
          )}
          {hasNotes && (
            <StickyNote size={9} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
          )}
        </div>
        {dueInfo && dueInfo.status === "overdue" && (
          <span
            style={{
              display: "inline-block",
              marginTop: 2,
              fontFamily: "var(--font-sans)",
              fontSize: 9,
              fontWeight: 700,
              color: DUE_STYLES.overdue.color,
              background: DUE_STYLES.overdue.bg,
              border: `1px solid ${DUE_STYLES.overdue.border}`,
              borderRadius: "var(--radius-xs)",
              padding: "1px 5px",
            }}
          >
            {dueInfo.label}
          </span>
        )}
      </div>
    </div>
  );
}
