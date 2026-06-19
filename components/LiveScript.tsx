"use client";

import { Check, ChevronDown, ChevronRight, Copy, Monitor } from "lucide-react";
import { useState } from "react";

type LineType =
  | "speech"
  | "presentation_marker"
  | "variant"
  | "next_step"
  | "instruction"
  | "plain";

interface ParsedLine {
  type: LineType;
  content: string;
}

interface ParsedSection {
  krok: number;
  title: string;
  lines: ParsedLine[];
}

const ls = {
  bg: "#0f1117",
  surface: "#161b22",
  border: "#21262d",
  borderStrong: "#30363d",
  radius: "12px",
  radiusSm: "8px",
  speech: { bg: "#141c2f", borderLeft: "#2563eb", text: "#93c5fd" },
  marker: { bg: "#0d1f37", text: "#f97316", border: "rgba(249,115,22,0.2)" },
  variant: { bg: "#1a1500", borderLeft: "#d97706", text: "#fbbf24" },
  next: { color: "#4ade80" },
  instruction: { color: "#6b7280" },
  plain: { color: "#c9d1d9" },
  krokColor: (k: number): string => {
    if (k <= 2) return "#3b82f6";
    if (k <= 4) return "#22c55e";
    if (k === 5) return "#f59e0b";
    return "#a855f7";
  },
  font: '"Geist Mono", "Fira Code", ui-monospace, monospace',
  sans: '"Geist", "Sora", -apple-system, sans-serif',
};

function classifyLine(raw: string): ParsedLine {
  const trimmed = raw.trim();
  if (!trimmed) return { type: "plain", content: "" };
  if (trimmed.startsWith("🖥️")) return { type: "presentation_marker", content: trimmed };
  if (trimmed.startsWith("> ")) return { type: "speech", content: trimmed.slice(2) };
  if (trimmed.startsWith("[WARIANT") || trimmed.startsWith("⚠️") || trimmed.startsWith("WARIANT ")) {
    return { type: "variant", content: trimmed };
  }
  if (trimmed.startsWith("→ ") || trimmed === "→") {
    return { type: "next_step", content: trimmed.startsWith("→ ") ? trimmed.slice(2) : trimmed };
  }
  if (trimmed.startsWith("[") || trimmed.startsWith("(") || trimmed.startsWith("📌")) {
    return { type: "instruction", content: trimmed };
  }
  return { type: "plain", content: trimmed };
}

export function parsePlanDiscovery(plan: string): ParsedSection[] {
  const lines = plan.split("\n");
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    // Match: "KROK 1 — ..." or "### KROK 1 — ..." or "KROK 1:" etc.
    const krokMatch = trimmed.match(/^(?:#{1,3}\s*)?KROK\s+(\d+)\s*(?:[—–—\-:]\s*(.*))?$/);
    if (krokMatch) {
      if (current) sections.push(current);
      const krok = parseInt(krokMatch[1], 10);
      const subtitle = krokMatch[2]?.trim() ?? "";
      const title = subtitle ? `KROK ${krok} — ${subtitle}` : `KROK ${krok}`;
      current = { krok, title, lines: [] };
    } else if (current) {
      current.lines.push(classifyLine(trimmed));
    }
  }
  if (current) sections.push(current);

  if (sections.length === 0 && plan.trim()) {
    return [
      {
        krok: 0,
        title: "Plan Discovery Call",
        lines: plan.split("\n").map((l) => classifyLine(l.trim())),
      },
    ];
  }

  return sections;
}

function sectionToPlainText(section: ParsedSection): string {
  return [
    section.title,
    "",
    ...section.lines
      .filter((l) => l.content)
      .map((l) => {
        if (l.type === "speech") return `> "${l.content}"`;
        return l.content;
      }),
  ].join("\n");
}

function renderLine(line: ParsedLine, idx: number) {
  if (!line.content) {
    return <div key={idx} style={{ height: 6 }} />;
  }

  switch (line.type) {
    case "speech":
      return (
        <div
          key={idx}
          style={{
            margin: "4px 0",
            padding: "10px 14px",
            background: ls.speech.bg,
            borderLeft: `3px solid ${ls.speech.borderLeft}`,
            borderRadius: `0 ${ls.radiusSm} ${ls.radiusSm} 0`,
            fontFamily: ls.font,
            fontSize: 13,
            color: ls.speech.text,
            lineHeight: 1.65,
            letterSpacing: "0.01em",
          }}
        >
          &ldquo;{line.content}&rdquo;
        </div>
      );

    case "presentation_marker":
      return (
        <div
          key={idx}
          style={{
            margin: "8px 0",
            padding: "7px 12px",
            background: ls.marker.bg,
            border: `1px solid ${ls.marker.border}`,
            borderRadius: ls.radiusSm,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: ls.sans,
            fontSize: 11,
            fontWeight: 700,
            color: ls.marker.text,
            letterSpacing: "0.04em",
          }}
        >
          <Monitor size={11} color={ls.marker.text} />
          {line.content.replace(/^🖥️\s*/, "")}
        </div>
      );

    case "variant":
      return (
        <div
          key={idx}
          style={{
            margin: "4px 0",
            padding: "8px 12px",
            background: ls.variant.bg,
            borderLeft: `3px solid ${ls.variant.borderLeft}`,
            borderRadius: `0 ${ls.radiusSm} ${ls.radiusSm} 0`,
            fontFamily: ls.font,
            fontSize: 12,
            color: ls.variant.text,
            lineHeight: 1.6,
          }}
        >
          {line.content}
        </div>
      );

    case "next_step":
      return (
        <div
          key={idx}
          style={{
            margin: "3px 0",
            display: "flex",
            alignItems: "flex-start",
            gap: 7,
            fontFamily: ls.font,
            fontSize: 12,
            color: ls.next.color,
            lineHeight: 1.6,
          }}
        >
          <span style={{ flexShrink: 0, marginTop: 1 }}>→</span>
          <span>{line.content}</span>
        </div>
      );

    case "instruction":
      return (
        <div
          key={idx}
          style={{
            margin: "2px 0",
            fontFamily: ls.font,
            fontSize: 11.5,
            color: ls.instruction.color,
            lineHeight: 1.6,
            fontStyle: "italic",
          }}
        >
          {line.content}
        </div>
      );

    default:
      return (
        <div
          key={idx}
          style={{
            margin: "2px 0",
            fontFamily: ls.font,
            fontSize: 13,
            color: ls.plain.color,
            lineHeight: 1.65,
          }}
        >
          {line.content}
        </div>
      );
  }
}

function LiveScriptSection({
  section,
  defaultOpen,
}: {
  section: ParsedSection;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const color = ls.krokColor(section.krok);
  const nonEmptyLines = section.lines.filter((l) => l.content).length;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(sectionToPlainText(section));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      style={{
        border: `1px solid ${open ? ls.borderStrong : ls.border}`,
        borderRadius: ls.radiusSm,
        overflow: "hidden",
        transition: "border-color 0.15s",
      }}
    >
      {/* Section header — toggle + copy as siblings to avoid nested <button> */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: open ? ls.surface : "transparent",
          borderBottom: open ? `1px solid ${ls.border}` : "none",
          transition: "background 0.15s",
        }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            flex: 1,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {/* Krok number pill */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: `${color}20`,
              border: `1px solid ${color}40`,
              fontFamily: ls.font,
              fontSize: 9,
              fontWeight: 700,
              color,
              flexShrink: 0,
            }}
          >
            {section.krok}
          </span>

          {/* Title */}
          <span
            style={{
              flex: 1,
              fontFamily: ls.sans,
              fontSize: 12,
              fontWeight: 600,
              color: open ? "#e6edf3" : "#8b949e",
              letterSpacing: "0.01em",
              transition: "color 0.15s",
            }}
          >
            {section.title}
          </span>

          {/* Line count */}
          {!open && nonEmptyLines > 0 && (
            <span
              style={{
                fontFamily: ls.font,
                fontSize: 10,
                color: "#484f58",
              }}
            >
              {nonEmptyLines} linii
            </span>
          )}

          {/* Chevron */}
          {open ? (
            <ChevronDown size={13} color="#484f58" />
          ) : (
            <ChevronRight size={13} color="#484f58" />
          )}
        </button>

        {/* Copy button — sibling of toggle button, not nested inside it */}
        {open && (
          <button
            onClick={handleCopy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              marginRight: 10,
              background: "transparent",
              border: `1px solid ${ls.border}`,
              borderRadius: "6px",
              fontFamily: ls.sans,
              fontSize: 10,
              color: copied ? "#4ade80" : "#6e7681",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
              flexShrink: 0,
            }}
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? "OK" : "Kopiuj"}
          </button>
        )}
      </div>

      {/* Section body */}
      {open && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 0 }}>
          {section.lines.map((line, i) => renderLine(line, i))}
        </div>
      )}
    </div>
  );
}

interface LiveScriptProps {
  plan: string;
  clientName?: string;
  firmaNazwa?: string;
}

export function LiveScript({ plan, clientName, firmaNazwa }: LiveScriptProps) {
  const [allCopied, setAllCopied] = useState(false);
  const sections = parsePlanDiscovery(plan);
  const label = firmaNazwa ?? clientName;

  const handleCopyAll = async () => {
    const text = sections.map(sectionToPlainText).join("\n\n---\n\n");
    await navigator.clipboard.writeText(text);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  if (sections.length === 0) return null;

  return (
    <div
      style={{
        background: ls.bg,
        border: `1px solid ${ls.border}`,
        borderRadius: ls.radius,
        overflow: "hidden",
        fontFamily: ls.sans,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${ls.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: ls.surface,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1 }}>
          {/* Terminal dots */}
          <div style={{ display: "flex", gap: 5 }}>
            {(["#ff5f57", "#febc2e", "#28c840"] as const).map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
            ))}
          </div>
          <span
            style={{
              fontFamily: ls.font,
              fontSize: 11,
              fontWeight: 700,
              color: "#6e7681",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            LIVE SCRIPT
          </span>
          {label && (
            <span
              style={{
                padding: "2px 8px",
                background: "rgba(56,139,253,0.1)",
                border: "1px solid rgba(56,139,253,0.2)",
                borderRadius: "6px",
                fontFamily: ls.font,
                fontSize: 10,
                color: "#58a6ff",
              }}
            >
              {label}
            </span>
          )}
        </div>
        <button
          onClick={handleCopyAll}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            background: "transparent",
            border: `1px solid ${ls.border}`,
            borderRadius: "6px",
            fontFamily: ls.sans,
            fontSize: 11,
            color: allCopied ? "#4ade80" : "#6e7681",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
        >
          {allCopied ? <Check size={11} /> : <Copy size={11} />}
          {allCopied ? "Skopiowano" : "Kopiuj wszystko"}
        </button>
      </div>

      {/* Legend */}
      <div
        style={{
          padding: "6px 16px",
          borderBottom: `1px solid ${ls.border}`,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {(
          [
            { color: ls.speech.text, label: "> mowa" },
            { color: ls.marker.text, label: "🖥️ slajd" },
            { color: ls.variant.text, label: "⚠️ wariant" },
            { color: ls.next.color, label: "→ krok" },
            { color: ls.instruction.color, label: "[ instrukacja" },
          ] as const
        ).map(({ color, label: l }) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div
              style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }}
            />
            <span
              style={{
                fontFamily: ls.font,
                fontSize: 9,
                color: "#484f58",
                letterSpacing: "0.06em",
              }}
            >
              {l}
            </span>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {sections.map((section) => (
          <LiveScriptSection
            key={section.krok}
            section={section}
            defaultOpen={section.krok === 3 || section.krok === 5}
          />
        ))}
      </div>
    </div>
  );
}
