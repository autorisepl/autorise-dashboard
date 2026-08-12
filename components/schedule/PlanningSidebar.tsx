"use client";

import { Check, Inbox, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  DRAG_TYPE_TASK,
  type DragPayload,
  PRIORITY_STYLE,
  type Priority,
  type TaskWithList,
} from "@/lib/schedule/dateHelpers";

// Ten sam kontrakt interakcji co karty w kolumnach dnia: klik otwiera wspólny popover
// edycji (TaskEditor), karta jest przeciągalna, priorytet to statyczny znacznik (edycja
// priorytetu żyje wyłącznie w popoverze, nie w osobnym cyklowaniu na chipie).

function UnassignedChip({
  item,
  priority,
  toggleDone,
  onOpen,
}: {
  item: TaskWithList;
  priority: Priority | null;
  toggleDone: (item: TaskWithList) => void;
  onOpen: (item: TaskWithList) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const s = priority ? PRIORITY_STYLE[priority] : null;
  const done = item.task.status === "completed";
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
        gap: 8,
        padding: "7px 10px",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        cursor: "pointer",
        userSelect: "none",
        opacity: dragging ? 0.4 : 1,
        transform: dragging ? "scale(0.97)" : "scale(1)",
        transition: "opacity 120ms, transform 120ms",
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
      <div style={{ minWidth: 0 }}>
        {/* Etykieta listy NAD tytułem, wyraźnie odróżniona — dawniej obok tekstu na końcu wiersza,
            zbyt łatwo tracona wizualnie. */}
        <div style={{ marginBottom: 3 }}>
          <Badge size="xs">{item.listTitle}</Badge>
        </div>
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
              fontSize: 12,
              color: "var(--text-primary)",
              textDecoration: done ? "line-through" : "none",
              opacity: done ? 0.6 : 1,
              overflowWrap: "break-word",
            }}
          >
            {item.task.title}
          </span>
        </div>
      </div>
    </div>
  );
}

interface PlanningSidebarProps {
  unassigned: TaskWithList[];
  priorityMap: Record<string, Priority>;
  loading: boolean;
  toggleDone: (item: TaskWithList) => void;
  onOpenNewTask: () => void;
  onOpenTask: (item: TaskWithList) => void;
  dragOverZone: string | null;
  setDragOverZone: (v: string | null) => void;
  onDropUnassign: (taskId: string) => void;
}

const ZONE_KEY = "unassigned";

export function PlanningSidebar({
  unassigned,
  priorityMap,
  loading,
  toggleDone,
  onOpenNewTask,
  onOpenTask,
  dragOverZone,
  setDragOverZone,
  onDropUnassign,
}: PlanningSidebarProps) {
  const isOver = dragOverZone === ZONE_KEY;

  return (
    <Panel
      solid
      style={{
        padding: 16,
        background: isOver ? "var(--accent-muted)" : undefined,
        border: isOver ? "1.5px dashed var(--accent)" : undefined,
        transition: "background 150ms ease, border-color 150ms ease",
      }}
    >
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_TYPE_TASK)) {
            e.preventDefault();
            setDragOverZone(ZONE_KEY);
          }
        }}
        onDragLeave={() => setDragOverZone(dragOverZone === ZONE_KEY ? null : dragOverZone)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverZone(null);
          const raw = e.dataTransfer.getData(DRAG_TYPE_TASK);
          if (!raw) return;
          const payload = JSON.parse(raw) as DragPayload;
          onDropUnassign(payload.taskId);
        }}
      >
        {/* Ikona w kwadratowym "module badge", ten sam wzorzec co Finanse osobiste — celowo
            inny język wizualny niż nagłówek kolumny dnia, żeby to nie czytało się jak "8. dzień
            tygodnia" tylko jako osobny panel/moduł. */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-hover)",
              flexShrink: 0,
            }}
          >
            <Inbox size={14} color="var(--text-secondary)" />
          </div>
          <SectionLabel paddingX={0} style={{ padding: 0, fontSize: 11, fontWeight: 700 }}>
            Nieprzypisane ({unassigned.length})
          </SectionLabel>
        </div>
        {/* Stała wysokość + wewnętrzny scroll (ten sam wzorzec co panel dnia) — lista pokazuje
            ~5 zadań naraz zamiast rozciągać całą stronę w dół przy dużej liczbie wpisów. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minHeight: 40,
            maxHeight: 320,
            overflowY: "auto",
            paddingRight: unassigned.length > 0 ? 2 : 0,
          }}
        >
          {loading ? (
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Ładowanie...</span>
          ) : unassigned.length === 0 ? (
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              Brak zadań bez terminu. Przeciągnij tu, żeby zdjąć termin.
            </span>
          ) : (
            unassigned.map((item) => (
              <UnassignedChip
                key={item.task.id}
                item={item}
                priority={priorityMap[item.task.id] ?? null}
                toggleDone={toggleDone}
                onOpen={onOpenTask}
              />
            ))
          )}
        </div>

        <button
          onClick={onOpenNewTask}
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
      </div>
    </Panel>
  );
}
