"use client";

import { Flag, Inbox, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  DRAG_TYPE_PRIORITIZED,
  DRAG_TYPE_UNASSIGNED,
  type DragPayload,
  PRIORITY_LABEL,
  PRIORITY_LEVELS,
  PRIORITY_STYLE,
  type Priority,
  type TaskWithList,
} from "@/lib/schedule/dateHelpers";

function UnassignedChip({ item }: { item: TaskWithList }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        const payload: DragPayload = { taskId: item.task.id };
        e.dataTransfer.setData(DRAG_TYPE_UNASSIGNED, JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "move";
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 10px",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-primary)" }}>
        {item.task.title}
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 9,
          fontWeight: 700,
          color: "var(--text-tertiary)",
          background: "var(--bg-hover)",
          borderRadius: "var(--radius-xs)",
          padding: "1px 6px",
        }}
      >
        {item.listTitle}
      </span>
    </div>
  );
}

function PrioritizedChip({ item }: { item: TaskWithList }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        const payload: DragPayload = { taskId: item.task.id };
        e.dataTransfer.setData(DRAG_TYPE_PRIORITIZED, JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "move";
      }}
      style={{
        padding: "6px 9px",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        cursor: "grab",
        userSelect: "none",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        color: "var(--text-primary)",
      }}
    >
      {item.task.title}
      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-tertiary)", marginTop: 2 }}>
        {item.listTitle}
      </div>
    </div>
  );
}

interface PlanningSidebarProps {
  unassigned: TaskWithList[];
  prioritizedByLevel: Record<Priority, TaskWithList[]>;
  loading: boolean;
  dragOverZone: string | null;
  setDragOverZone: (v: string | null) => void;
  onPriorityDrop: (e: React.DragEvent, level: Priority) => void;
  onAddTask: (title: string) => void;
}

export function PlanningSidebar({
  unassigned,
  prioritizedByLevel,
  loading,
  dragOverZone,
  setDragOverZone,
  onPriorityDrop,
  onAddTask,
}: PlanningSidebarProps) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function submit() {
    const t = title.trim();
    if (t) onAddTask(t);
    setTitle("");
    setAdding(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 300, flexShrink: 0 }}>
      {/* Nieprzypisane */}
      <Panel style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Inbox size={14} color="var(--text-tertiary)" />
          <SectionLabel paddingX={0} style={{ padding: 0, fontSize: 11, fontWeight: 700 }}>
            Nieprzypisane ({unassigned.length})
          </SectionLabel>
        </div>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 220, overflowY: "auto" }}
        >
          {loading ? (
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Ładowanie...</span>
          ) : unassigned.length === 0 ? (
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              Brak zadań bez terminu.
            </span>
          ) : (
            unassigned.map((item) => <UnassignedChip key={item.task.id} item={item} />)
          )}
        </div>

        {adding ? (
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") {
                setAdding(false);
                setTitle("");
              }
            }}
            onBlur={submit}
            placeholder="Nazwa zadania..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: 10,
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-primary)",
              background: "var(--bg)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--radius-xs)",
              padding: "6px 9px",
              outline: "none",
            }}
          />
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
              padding: "8px 0 0",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-tertiary)",
            }}
          >
            <Plus size={13} /> Dodaj zadanie
          </button>
        )}
      </Panel>

      {/* Strefa priorytetyzacji */}
      <Panel style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Flag size={14} color="var(--text-tertiary)" />
          <SectionLabel paddingX={0} style={{ padding: 0, fontSize: 11, fontWeight: 700 }}>
            Strefa priorytetyzacji
          </SectionLabel>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PRIORITY_LEVELS.map((level) => {
            const zoneKey = `priority-${level}`;
            const isOver = dragOverZone === zoneKey;
            const s = PRIORITY_STYLE[level];
            return (
              <div
                key={level}
                onDragOver={(e) => {
                  if (
                    e.dataTransfer.types.includes(DRAG_TYPE_UNASSIGNED) ||
                    e.dataTransfer.types.includes(DRAG_TYPE_PRIORITIZED)
                  ) {
                    e.preventDefault();
                    setDragOverZone(zoneKey);
                  }
                }}
                onDragLeave={() => setDragOverZone(dragOverZone === zoneKey ? null : dragOverZone)}
                onDrop={(e) => onPriorityDrop(e, level)}
                style={{
                  minHeight: 60,
                  padding: 9,
                  borderRadius: "var(--radius-sm)",
                  background: isOver ? s.bg : "var(--bg)",
                  border: `1px dashed ${isOver ? s.color : "var(--border)"}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  transition: "background 100ms, border-color 100ms",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: s.color,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {PRIORITY_LABEL[level]} ({prioritizedByLevel[level].length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {prioritizedByLevel[level].map((item) => (
                    <PrioritizedChip key={item.task.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
