"use client";

import { Check } from "lucide-react";

export function ProgressBar({
  doneCount,
  totalCount,
}: {
  doneCount: number;
  totalCount: number;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary)",
          }}
        >
          Dalsze kroki
        </span>
        <span
          style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-tertiary)" }}
        >
          {doneCount} z {totalCount}
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%`,
            background: "var(--success)",
            transition: "width 200ms",
          }}
        />
      </div>
    </div>
  );
}

export function StepCard({
  done,
  label,
  detail,
  actionLabel,
  onAction,
  onToggle,
}: {
  done: boolean;
  label: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${done ? "var(--success)" : "var(--border)"}`,
        background: done ? "rgba(52,199,89,0.06)" : "var(--bg-card)",
        marginBottom: 8,
        transition: "all 150ms",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: `2px solid ${done ? "var(--success)" : "var(--border)"}`,
          background: done ? "var(--success)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          cursor: "pointer",
        }}
      >
        {done && <Check size={13} color="#fff" strokeWidth={2.5} />}
      </button>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: done ? "var(--text-tertiary)" : "var(--text-primary)",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {label}
        </div>
        {detail && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-secondary)",
              marginTop: 2,
            }}
          >
            {detail}
          </div>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            flexShrink: 0,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid var(--accent-border)",
            background: "var(--accent-muted)",
            color: "var(--accent)",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function SectionLabelSmall({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "var(--text-tertiary)",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}
