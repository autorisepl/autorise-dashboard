"use client";

import type { ReactNode } from "react";

// Lekki, samodzielny renderer Markdown → React (bez zależności).
// Obsługuje: nagłówki, **bold**, *italic*, `code`, [link](url),
// listy numerowane i punktowane, cytaty, --- i akapity.

// ── Inline (bold / italic / code / links) ──────────────────────────────

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith("**") || tok.startsWith("__")) {
      out.push(
        <strong key={key} style={{ fontWeight: 700, color: "var(--text-primary)" }}>
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith("`")) {
      out.push(
        <code
          key={key}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.88em",
            background: "var(--bg-hover)",
            padding: "1px 5px",
            borderRadius: 4,
            color: "var(--accent)",
          }}
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("[")) {
      const mm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      if (mm) {
        out.push(
          <a
            key={key}
            href={mm[2]}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
          >
            {mm[1]}
          </a>,
        );
      } else out.push(tok);
    } else {
      out.push(
        <em key={key} style={{ fontStyle: "italic" }}>
          {tok.slice(1, -1)}
        </em>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// ── Block parser ───────────────────────────────────────────────────────

interface MarkdownProps {
  content: string;
  compact?: boolean;
}

export function Markdown({ content, compact = false }: MarkdownProps) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const gap = compact ? 6 : 8;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line
    if (trimmed === "") {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(
        <hr
          key={key++}
          style={{ border: "none", borderTop: "1px solid var(--border)", margin: `${gap + 6}px 0` }}
        />,
      );
      i++;
      continue;
    }

    // Headings
    const h = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (h) {
      const level = h[1].length;
      const sizes = [0, 20, 16.5, 14.5, 13];
      const mt = [0, 22, 18, 14, 12];
      blocks.push(
        <div
          key={key++}
          style={{
            fontWeight: 700,
            fontSize: sizes[level],
            color: "var(--text-primary)",
            marginTop: blocks.length ? mt[level] : 0,
            marginBottom: 6,
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
            ...(level <= 2 ? { borderBottom: "1px solid var(--border)", paddingBottom: 5 } : {}),
          }}
        >
          {renderInline(h[2], `h${key}`)}
        </div>,
      );
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(trimmed)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          style={{
            margin: `${gap}px 0`,
            padding: "6px 14px",
            borderLeft: "3px solid var(--accent-border)",
            background: "var(--bg-hover)",
            borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
            color: "var(--text-secondary)",
            fontStyle: "italic",
            lineHeight: 1.6,
          }}
        >
          {renderInline(quote.join(" "), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol
          key={key++}
          style={{
            margin: `${gap}px 0`,
            paddingLeft: 22,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {items.map((it, k) => (
            <li key={k} style={{ color: "var(--text-secondary)", lineHeight: 1.6, paddingLeft: 4 }}>
              {renderInline(it, `ol${key}-${k}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul
          key={key++}
          style={{
            margin: `${gap}px 0`,
            paddingLeft: 4,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            listStyle: "none",
          }}
        >
          {items.map((it, k) => (
            <li
              key={k}
              style={{ display: "flex", gap: 8, color: "var(--text-secondary)", lineHeight: 1.6 }}
            >
              <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}>•</span>
              <span>{renderInline(it, `ul${key}-${k}`)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraph (merge consecutive non-empty, non-special lines)
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,4})\s/.test(lines[i].trim()) &&
      !/^>\s?/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p
        key={key++}
        style={{
          margin: `${gap / 2}px 0`,
          color: "var(--text-secondary)",
          lineHeight: compact ? 1.6 : 1.7,
        }}
      >
        {renderInline(para.join(" "), `p${key}`)}
      </p>,
    );
  }

  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: compact ? 13 : 13.5,
        color: "var(--text-primary)",
      }}
    >
      {blocks}
    </div>
  );
}
