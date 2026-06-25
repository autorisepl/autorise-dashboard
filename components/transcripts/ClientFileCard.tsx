"use client";

import { AlertCircle, CheckCircle2, FileText, Loader2, Music2 } from "lucide-react";
import { useState } from "react";
import { parseClientFileName } from "@/lib/transcripts/parse";

// Profesjonalny badge typu pliku (zamiast inicjałów).
const FILE_KINDS = {
  txt: {
    Icon: FileText,
    color: "var(--accent)",
    bg: "var(--accent-muted)",
    border: "var(--accent-border)",
  },
  mp3: {
    Icon: Music2,
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.10)",
    border: "rgba(124,58,237,0.22)",
  },
} as const;

export type FileKind = keyof typeof FILE_KINDS;

// ── Local format helpers (self-contained) ──────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0)
    return `dziś ${d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`;
  if (diff === 1) return "wczoraj";
  if (diff < 7) return `${diff} dni temu`;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

function fmtSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type TranscriptStatus = "done" | "todo";

interface StatusPillProps {
  status: TranscriptStatus;
  labelOverride?: string;
}

function StatusPill({ status, labelOverride }: StatusPillProps) {
  const done = status === "done";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        flexShrink: 0,
        padding: "3px 8px",
        borderRadius: 99,
        background: done ? "var(--success-bg)" : "var(--warning-bg)",
        border: `1px solid ${done ? "var(--success-border)" : "var(--warning-border)"}`,
        color: done ? "var(--success-text)" : "var(--warning)",
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {done ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
      {labelOverride ?? (done ? "Transkrypt ✓" : "Do transkrypcji")}
    </span>
  );
}

// ── Card ───────────────────────────────────────────────────────────────

interface ClientFileCardProps {
  fileName: string;
  modifiedTime?: string;
  size?: number;
  selected?: boolean;
  /** Transcript availability badge. Omit to hide. */
  status?: TranscriptStatus;
  statusLabelOverride?: string;
  /** Pokaż profesjonalny badge typu pliku (TXT/MP3) zamiast inicjałów klienta. */
  kind?: FileKind;
  /** Right-aligned node (e.g. external link icon). Ignored when status is set. */
  trailing?: React.ReactNode;
  /** Show a spinner in the avatar (e.g. while downloading). */
  busy?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function ClientFileCard({
  fileName,
  modifiedTime,
  size,
  selected = false,
  status,
  statusLabelOverride,
  kind,
  trailing,
  busy = false,
  disabled = false,
  onClick,
}: ClientFileCardProps) {
  const [hovered, setHovered] = useState(false);
  const { displayName, tag } = parseClientFileName(fileName);
  const initials = displayName
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeLabel = fmtSize(size);
  const dateLabel = fmtDate(modifiedTime);
  const kindStyle = kind ? FILE_KINDS[kind] : null;

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled && !busy ? 0.55 : 1,
        background: selected
          ? "var(--accent-muted)"
          : hovered && !disabled
            ? "var(--bg-hover)"
            : "transparent",
        borderLeft: `2px solid ${selected ? "var(--accent)" : "transparent"}`,
        transition: "background 100ms",
      }}
    >
      {kindStyle ? (
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            flexShrink: 0,
            background: selected ? kindStyle.color : kindStyle.bg,
            border: `1px solid ${selected ? kindStyle.color : kindStyle.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {busy ? (
            <Loader2
              size={15}
              color={selected ? "#fff" : kindStyle.color}
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : (
            <kindStyle.Icon
              size={16}
              color={selected ? "#fff" : kindStyle.color}
              strokeWidth={1.9}
            />
          )}
        </div>
      ) : (
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            flexShrink: 0,
            background: selected ? "var(--accent)" : "var(--bg-elevated)",
            border: `1.5px solid ${selected ? "var(--accent)" : "var(--border)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            color: selected ? "#fff" : "var(--text-secondary)",
          }}
        >
          {busy ? (
            <Loader2
              size={14}
              color="var(--accent)"
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : (
            initials
          )}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: selected ? "var(--accent)" : "var(--text-primary)",
            marginBottom: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayName}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {tag && (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--accent)",
                padding: "1px 5px",
                background: "var(--accent-muted)",
                borderRadius: 3,
              }}
            >
              {tag}
            </span>
          )}
          {dateLabel && (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                color: "var(--text-tertiary)",
              }}
            >
              {dateLabel}
            </span>
          )}
          {sizeLabel && (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                color: "var(--text-tertiary)",
              }}
            >
              · {sizeLabel}
            </span>
          )}
        </div>
      </div>

      {status ? (
        <StatusPill status={status} labelOverride={statusLabelOverride} />
      ) : (
        trailing && <div style={{ flexShrink: 0 }}>{trailing}</div>
      )}
    </div>
  );
}
