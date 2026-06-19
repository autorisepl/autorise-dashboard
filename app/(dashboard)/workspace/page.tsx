"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  Cpu,
  Database,
  Eye,
  File,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  Globe,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Terminal,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FileNode } from "@/app/api/workspace/tree/route";
import { tokens } from "@/lib/tokens";

// ── Pinned CEO documents ──────────────────────────────────────────

const PINNED_DOCS = [
  {
    id: "truth",
    label: "Business Truth",
    sublabel: "Produkt · ICP · Model cenowy",
    path: "autorise-dashboard/context/AUTORISE_TRUTH_v3.md",
    icon: TrendingUp,
    color: "#2563eb",
  },
  {
    id: "agenci",
    label: "Agenci AI",
    sublabel: "Definicje · Modele · Flow",
    path: "autorise-dashboard/context/AUTORISE_AGENCI_v4.md",
    icon: Cpu,
    color: "#7c3aed",
  },
  {
    id: "claude",
    label: "CLAUDE.md",
    sublabel: "Workspace · Stack · Instrukcje",
    path: "autorise-dashboard/.claude/CLAUDE.md",
    icon: BookOpen,
    color: "#0891b2",
  },
  {
    id: "session",
    label: "Session Log",
    sublabel: "Historia sesji · Błędy · Decyzje",
    path: "autorise-dashboard/.claude/memory/session-log.txt",
    icon: Users,
    color: "#059669",
  },
];

// ── File icon ─────────────────────────────────────────────────────

function FileIcon({ ext, size = 13 }: { ext?: string; size?: number }) {
  const e = ext?.toLowerCase() ?? "";
  if (["ts", "tsx"].includes(e)) return <FileCode size={size} color="#2563eb" />;
  if (["js", "jsx"].includes(e)) return <FileCode size={size} color="#ca8a04" />;
  if (["json", "yaml", "yml"].includes(e)) return <FileText size={size} color="#d97706" />;
  if (["sql", "prisma"].includes(e)) return <Database size={size} color="#0891b2" />;
  if (["md", "mdx", "txt"].includes(e)) return <FileText size={size} color="#7c3aed" />;
  if (["html", "css", "scss"].includes(e)) return <Globe size={size} color="#db2777" />;
  if (e === "py") return <FileCode size={size} color="#16a34a" />;
  return <File size={size} color="#94a3b8" />;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ── Tree node ─────────────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  search,
  onSelect,
  selected,
}: {
  node: FileNode;
  depth: number;
  search: string;
  onSelect: (n: FileNode) => void;
  selected: FileNode | null;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.type === "dir" && (node.children?.length ?? 0) > 0;
  const isSelected = selected?.path === node.path;

  const matchesSearch = !search || node.name.toLowerCase().includes(search.toLowerCase());
  const childrenMatchSearch =
    !search ||
    (node.children ?? []).some(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.children ?? []).some((cc) => cc.name.toLowerCase().includes(search.toLowerCase())),
    );

  if (search && !matchesSearch && !childrenMatchSearch) return null;
  if (search && !open && childrenMatchSearch) setOpen(true);

  const indent = depth * 14;

  return (
    <div>
      <div
        onClick={() => {
          if (node.type === "dir") setOpen((o) => !o);
          onSelect(node);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: `4px 8px 4px ${8 + indent}px`,
          borderRadius: tokens.radius.sm,
          cursor: "pointer",
          background: isSelected ? tokens.accent.muted : "transparent",
          transition: "background 0.1s",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          if (!isSelected)
            (e.currentTarget as HTMLDivElement).style.background = tokens.bg.elevated;
        }}
        onMouseLeave={(e) => {
          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent";
        }}
      >
        <span style={{ width: 12, display: "flex", alignItems: "center", flexShrink: 0 }}>
          {hasChildren && (
            <ChevronRight
              size={10}
              color={tokens.text.muted}
              style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
            />
          )}
        </span>
        {node.type === "dir" ? (
          open ? (
            <FolderOpen size={13} color={tokens.accent.primary} />
          ) : (
            <Folder size={13} color={tokens.text.muted} />
          )
        ) : (
          <FileIcon ext={node.ext} size={13} />
        )}
        <span
          style={{
            fontFamily: tokens.font.mono,
            fontSize: "12px",
            color: isSelected ? tokens.accent.primary : tokens.text.primary,
            fontWeight: node.type === "dir" ? 600 : 400,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.name}
          {node.type === "dir" && (
            <span style={{ color: tokens.text.muted, fontWeight: 400 }}>/</span>
          )}
        </span>
        {node.type === "dir" && node.fileCount ? (
          <span style={{ fontFamily: tokens.font.mono, fontSize: "9px", color: tokens.text.muted }}>
            {node.fileCount}
          </span>
        ) : node.size ? (
          <span style={{ fontFamily: tokens.font.mono, fontSize: "9px", color: tokens.text.muted }}>
            {formatBytes(node.size)}
          </span>
        ) : null}
      </div>
      <AnimatePresence>
        {open && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{ overflow: "hidden" }}
          >
            {(node.children ?? []).map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                search={search}
                onSelect={onSelect}
                selected={selected}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        background: tokens.bg.primary,
        border: `1px solid ${tokens.border.default}`,
        borderRadius: tokens.radius.lg,
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: tokens.shadow.card,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: tokens.radius.md,
          background: `${color}10`,
          border: `1px solid ${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={15} color={color} />
      </div>
      <div>
        <div
          style={{
            fontFamily: tokens.font.mono,
            fontSize: "17px",
            fontWeight: 700,
            color: tokens.text.primary,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: tokens.font.sans,
            fontSize: "11px",
            color: tokens.text.muted,
            marginTop: 3,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

// ── Pinned doc card ───────────────────────────────────────────────

function PinnedDocCard({
  doc,
  onOpen,
  loading,
}: {
  doc: (typeof PINNED_DOCS)[number];
  onOpen: (doc: (typeof PINNED_DOCS)[number]) => void;
  loading: boolean;
}) {
  const Icon = doc.icon;
  return (
    <button
      onClick={() => onOpen(doc)}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: tokens.bg.primary,
        border: `1px solid ${tokens.border.default}`,
        borderRadius: tokens.radius.lg,
        cursor: loading ? "wait" : "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.1s",
        textAlign: "left",
        width: "100%",
        boxShadow: tokens.shadow.card,
      }}
      onMouseEnter={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.borderColor = `${doc.color}40`;
        b.style.boxShadow = `0 2px 8px ${doc.color}12`;
        b.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.borderColor = tokens.border.default;
        b.style.boxShadow = tokens.shadow.card;
        b.style.transform = "translateY(0)";
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: tokens.radius.md,
          background: `${doc.color}10`,
          border: `1px solid ${doc.color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={14} color={doc.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: tokens.font.sans,
            fontSize: "13px",
            fontWeight: 600,
            color: tokens.text.primary,
            lineHeight: 1,
          }}
        >
          {doc.label}
        </div>
        <div
          style={{
            fontFamily: tokens.font.sans,
            fontSize: "11px",
            color: tokens.text.muted,
            marginTop: 3,
          }}
        >
          {doc.sublabel}
        </div>
      </div>
      {loading ? (
        <Loader2
          size={13}
          color={tokens.text.muted}
          style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
        />
      ) : (
        <Eye size={13} color={tokens.text.muted} style={{ flexShrink: 0, opacity: 0.5 }} />
      )}
    </button>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────

function inlineRender(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re =
    /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|~~[^~]+~~|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    const tok = m[0];
    if (tok.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: "0.88em",
            background: "rgba(26,86,255,0.09)",
            color: "#1a56ff",
            padding: "1px 5px",
            borderRadius: 4,
          }}
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("**") || tok.startsWith("__")) {
      parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("*") || tok.startsWith("_")) {
      parts.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith("~~")) {
      parts.push(<s key={key++}>{tok.slice(2, -2)}</s>);
    } else if (m[2]) {
      parts.push(
        <span key={key++} style={{ color: "#2563eb", textDecoration: "underline" }}>
          {m[2]}
        </span>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return parts;
}

function MarkdownViewer({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <div
          key={key++}
          style={{
            margin: "12px 0",
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid rgba(26,86,255,0.15)",
          }}
        >
          {lang && (
            <div
              style={{
                padding: "4px 12px",
                background: "rgba(26,86,255,0.07)",
                fontFamily: '"Geist Mono", monospace',
                fontSize: 10,
                color: "#6b7fa3",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {lang}
            </div>
          )}
          <pre
            style={{
              margin: 0,
              padding: "12px 14px",
              fontFamily: '"Geist Mono", monospace',
              fontSize: 11.5,
              color: "#e2e8f0",
              background: "#0f172a",
              whiteSpace: "pre",
              overflowX: "auto",
              lineHeight: 1.65,
            }}
          >
            {codeLines.join("\n")}
          </pre>
        </div>,
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$|^\*\*\*+$/.test(line.trim())) {
      nodes.push(
        <hr
          key={key++}
          style={{ border: "none", borderTop: "1px solid rgba(0,0,0,0.1)", margin: "16px 0" }}
        />,
      );
      i++;
      continue;
    }

    // H1
    if (line.startsWith("# ")) {
      nodes.push(
        <h1
          key={key++}
          style={{
            fontFamily: tokens.font.sans,
            fontSize: 22,
            fontWeight: 800,
            color: "#0f172a",
            margin: "20px 0 8px",
            letterSpacing: "-0.02em",
            lineHeight: 1.25,
          }}
        >
          {inlineRender(line.slice(2))}
        </h1>,
      );
      i++;
      continue;
    }

    // H2
    if (line.startsWith("## ")) {
      nodes.push(
        <h2
          key={key++}
          style={{
            fontFamily: tokens.font.sans,
            fontSize: 16,
            fontWeight: 700,
            color: "#0f172a",
            margin: "18px 0 6px",
            letterSpacing: "-0.01em",
            borderBottom: "1px solid #f1f5f9",
            paddingBottom: 6,
          }}
        >
          {inlineRender(line.slice(3))}
        </h2>,
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      nodes.push(
        <h3
          key={key++}
          style={{
            fontFamily: tokens.font.sans,
            fontSize: 14,
            fontWeight: 700,
            color: "#334155",
            margin: "14px 0 4px",
          }}
        >
          {inlineRender(line.slice(4))}
        </h3>,
      );
      i++;
      continue;
    }

    // H4+
    if (line.startsWith("#### ")) {
      nodes.push(
        <h4
          key={key++}
          style={{
            fontFamily: tokens.font.sans,
            fontSize: 13,
            fontWeight: 600,
            color: "#475569",
            margin: "12px 0 3px",
          }}
        >
          {inlineRender(line.slice(5))}
        </h4>,
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      nodes.push(
        <blockquote
          key={key++}
          style={{
            borderLeft: "3px solid #1a56ff",
            paddingLeft: 14,
            margin: "10px 0",
            color: "#475569",
            fontStyle: "italic",
            fontFamily: tokens.font.sans,
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          {inlineRender(line.slice(2))}
        </blockquote>,
      );
      i++;
      continue;
    }

    // Unordered list
    if (/^(\s*)([-*+])\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^(\s*)([-*+])\s/.test(lines[i])) {
        const indent = lines[i].match(/^(\s*)/)?.[1].length ?? 0;
        listItems.push(
          <li
            key={i}
            style={{
              margin: "3px 0",
              paddingLeft: indent * 8,
              fontFamily: tokens.font.sans,
              fontSize: 13,
              color: "#1e293b",
              lineHeight: 1.6,
            }}
          >
            {inlineRender(lines[i].replace(/^\s*[-*+]\s/, ""))}
          </li>,
        );
        i++;
      }
      nodes.push(
        <ul key={key++} style={{ listStyle: "disc", paddingLeft: 20, margin: "6px 0" }}>
          {listItems}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(
          <li
            key={i}
            style={{
              margin: "3px 0",
              fontFamily: tokens.font.sans,
              fontSize: 13,
              color: "#1e293b",
              lineHeight: 1.6,
            }}
          >
            {inlineRender(lines[i].replace(/^\d+\.\s/, ""))}
          </li>,
        );
        i++;
      }
      nodes.push(
        <ol key={key++} style={{ paddingLeft: 20, margin: "6px 0" }}>
          {listItems}
        </ol>,
      );
      continue;
    }

    // Table
    if (line.includes("|") && lines[i + 1]?.match(/^\s*\|?[\s\-:|]+\|/)) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const [header, , ...rows] = tableLines;
      const parseRow = (r: string) =>
        r
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
      nodes.push(
        <div key={key++} style={{ overflowX: "auto", margin: "10px 0" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontFamily: tokens.font.sans,
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                {parseRow(header).map((h, ci) => (
                  <th
                    key={ci}
                    style={{
                      padding: "6px 12px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      fontWeight: 700,
                      color: "#0f172a",
                      textAlign: "left",
                    }}
                  >
                    {inlineRender(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {parseRow(row).map((cell, ci) => (
                    <td
                      key={ci}
                      style={{ padding: "5px 12px", border: "1px solid #e2e8f0", color: "#334155" }}
                    >
                      {inlineRender(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      nodes.push(<div key={key++} style={{ height: 6 }} />);
      i++;
      continue;
    }

    // Paragraph
    nodes.push(
      <p
        key={key++}
        style={{
          fontFamily: tokens.font.sans,
          fontSize: 13,
          color: "#1e293b",
          lineHeight: 1.72,
          margin: "4px 0",
        }}
      >
        {inlineRender(line)}
      </p>,
    );
    i++;
  }

  return <div style={{ padding: "20px 22px" }}>{nodes}</div>;
}

// ── JSON viewer ───────────────────────────────────────────────────

function JsonViewer({ content }: { content: string }) {
  let formatted = content;
  let parseErr = false;
  try {
    formatted = JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    parseErr = true;
  }

  // Basic JSON syntax coloring via regex on the string
  const colorize = (s: string) => {
    return s
      .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span style="color:#7c3aed">$1</span>$2')
      .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span style="color:#16a34a">$1</span>')
      .replace(/:\s*(true|false)/g, ': <span style="color:#d97706">$1</span>')
      .replace(/:\s*(null)/g, ': <span style="color:#6b7280">$1</span>')
      .replace(/:\s*(-?\d+\.?\d*)/g, ': <span style="color:#2563eb">$1</span>');
  };

  if (parseErr) {
    return (
      <pre
        style={{
          margin: 0,
          padding: "16px 18px",
          fontFamily: '"Geist Mono", monospace',
          fontSize: 11.5,
          color: "#ef4444",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          lineHeight: 1.65,
        }}
      >
        {content}
      </pre>
    );
  }

  return (
    <pre
      style={{
        margin: 0,
        padding: "16px 18px",
        fontFamily: '"Geist Mono", monospace',
        fontSize: 11.5,
        color: "#e2e8f0",
        background: "#0f172a",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        lineHeight: 1.65,
        minHeight: "100%",
      }}
      dangerouslySetInnerHTML={{ __html: colorize(formatted) }}
    />
  );
}

// ── Code viewer ───────────────────────────────────────────────────

function CodeViewer({ content, ext }: { content: string; ext?: string }) {
  const lines = content.split("\n");
  return (
    <div style={{ display: "flex", minHeight: "100%", background: "#0f172a" }}>
      {/* Line numbers */}
      <div
        style={{
          padding: "16px 8px 16px 14px",
          background: "#0a1122",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          fontFamily: '"Geist Mono", monospace',
          fontSize: 11,
          color: "#3d5070",
          lineHeight: 1.65,
          userSelect: "none",
          flexShrink: 0,
          textAlign: "right",
          minWidth: 36,
        }}
      >
        {lines.map((_, idx) => (
          <div key={idx}>{idx + 1}</div>
        ))}
      </div>
      {/* Code */}
      <pre
        style={{
          margin: 0,
          padding: "16px 18px",
          fontFamily: '"Geist Mono", monospace',
          fontSize: 11.5,
          color: "#e2e8f0",
          whiteSpace: "pre",
          overflowX: "auto",
          lineHeight: 1.65,
          flex: 1,
        }}
      >
        {content}
      </pre>
    </div>
  );
}

// ── File preview panel ────────────────────────────────────────────

const CODE_EXTS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "cs",
  "cpp",
  "c",
  "sh",
  "bash",
  "yaml",
  "yml",
  "toml",
  "css",
  "scss",
  "html",
  "sql",
  "prisma",
]);

function FilePreview({
  title,
  subtitle,
  content,
  ext,
  truncated,
  onClose,
}: {
  title: string;
  subtitle?: string;
  content: string;
  ext?: string;
  truncated?: boolean;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isMarkdown = ext === "md" || ext === "mdx";
  const isJson = ext === "json";
  const isCode = !isMarkdown && !isJson && !!ext && CODE_EXTS.has(ext);
  const lines = content.split("\n");
  const preview = !expanded && lines.length > 100 ? lines.slice(0, 100).join("\n") : content;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.16 }}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: tokens.bg.primary,
        border: `1px solid ${tokens.border.default}`,
        borderRadius: tokens.radius.xl,
        overflow: "hidden",
        boxShadow: tokens.shadow.elevated,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderBottom: `1px solid ${tokens.border.default}`,
          flexShrink: 0,
          background: tokens.bg.surface,
        }}
      >
        <FileIcon ext={ext} size={15} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: tokens.font.mono,
              fontSize: "13px",
              fontWeight: 700,
              color: tokens.text.primary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontFamily: tokens.font.mono,
                fontSize: "10px",
                color: tokens.text.muted,
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {/* Format badge */}
        {ext && (
          <span
            style={{
              padding: "2px 7px",
              background: isMarkdown
                ? "rgba(37,99,235,0.1)"
                : isJson
                  ? "rgba(22,163,74,0.1)"
                  : "rgba(0,0,0,0.07)",
              borderRadius: 999,
              fontFamily: tokens.font.mono,
              fontSize: "9px",
              fontWeight: 700,
              color: isMarkdown ? "#2563eb" : isJson ? "#16a34a" : tokens.text.muted,
              letterSpacing: "0.05em",
              flexShrink: 0,
              textTransform: "uppercase",
            }}
          >
            {ext}
          </span>
        )}
        {truncated && (
          <span
            style={{
              padding: "2px 7px",
              background: tokens.status.warningMuted,
              border: `1px solid rgba(217,119,6,0.2)`,
              borderRadius: 999,
              fontFamily: tokens.font.mono,
              fontSize: "9px",
              fontWeight: 700,
              color: tokens.status.warning,
              letterSpacing: "0.05em",
              flexShrink: 0,
            }}
          >
            TRUNCATED
          </span>
        )}
        <button
          onClick={onClose}
          style={{
            width: 26,
            height: 26,
            borderRadius: tokens.radius.sm,
            background: tokens.bg.elevated,
            border: `1px solid ${tokens.border.default}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: tokens.text.muted,
            flexShrink: 0,
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        {isMarkdown ? (
          <MarkdownViewer content={preview} />
        ) : isJson ? (
          <JsonViewer content={preview} />
        ) : isCode ? (
          <CodeViewer content={preview} ext={ext} />
        ) : (
          <pre
            style={{
              margin: 0,
              padding: "16px 18px",
              fontFamily: tokens.font.sans,
              fontSize: "13px",
              color: tokens.text.primary,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.7,
            }}
          >
            {preview}
          </pre>
        )}

        {!expanded && lines.length > 100 && (
          <div
            style={{
              position: "sticky",
              bottom: 0,
              padding: "12px 18px",
              background: `linear-gradient(transparent, ${isJson || isCode ? "#0f172a" : tokens.bg.primary})`,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => setExpanded(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 14px",
                background: tokens.bg.elevated,
                border: `1px solid ${tokens.border.default}`,
                borderRadius: tokens.radius.md,
                fontFamily: tokens.font.sans,
                fontSize: "12px",
                fontWeight: 600,
                color: tokens.text.secondary,
                cursor: "pointer",
              }}
            >
              <ChevronDown size={12} />
              Pokaż więcej ({lines.length - 100} linii)
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main interface ────────────────────────────────────────────────

interface WorkspaceData {
  tree: FileNode;
  stats: { totalDirs: number; totalFiles: number; topProjects: string[]; techStack: string[] };
  root: string;
  generated: string;
}

interface FileContent {
  content: string;
  truncated: boolean;
  size: number;
  ext: string;
  name: string;
  path: string;
  subtitle?: string;
}

export default function WorkspacePage() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FileNode | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [question, setQuestion] = useState("");
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [fileLoading, setFileLoading] = useState<string | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/tree");
      const json = await res.json();
      if (json.success) {
        setData(json);
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError(json.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd połączenia");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
    const id = setInterval(fetchTree, 30_000);
    return () => clearInterval(id);
  }, [fetchTree]);

  const openFile = useCallback(async (filePath: string, subtitle?: string) => {
    setFileLoading(filePath);
    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(filePath)}`);
      const json = await res.json();
      if (json.success) {
        setFileContent({ ...json, path: filePath, subtitle });
      } else {
        setFileContent({
          content: `Błąd: ${json.error}`,
          truncated: false,
          size: 0,
          ext: "txt",
          name: filePath.split("/").pop() ?? filePath,
          path: filePath,
          subtitle,
        });
      }
    } catch (e) {
      setFileContent({
        content: `Błąd połączenia: ${e instanceof Error ? e.message : "unknown"}`,
        truncated: false,
        size: 0,
        ext: "txt",
        name: filePath.split("/").pop() ?? filePath,
        path: filePath,
        subtitle,
      });
    } finally {
      setFileLoading(null);
    }
  }, []);

  const handleTreeSelect = useCallback(
    (node: FileNode) => {
      setSelected(node);
      if (node.type === "file") {
        openFile(node.path.replace(/^\//, ""), node.path);
      }
    },
    [openFile],
  );

  const runAnalysis = async (focusQuestion?: string) => {
    if (analysing) return;
    setAnalysing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/workspace/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(focusQuestion ? { question: focusQuestion } : { focus: "general" }),
      });
      const json = await res.json();
      if (json.success) {
        setAnalysis(json.analysis);
        setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } else {
        setAnalysis(`Błąd: ${json.error}`);
      }
    } catch (e) {
      setAnalysis(`${e instanceof Error ? e.message : "Błąd"}`);
    } finally {
      setAnalysing(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setAskingQuestion(true);
    await runAnalysis(question);
    setQuestion("");
    setAskingQuestion(false);
  };

  const runMigration = async () => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await fetch("/api/tools/migrate-schema", { method: "POST" });
      const json = await res.json();
      setMigrateResult(
        json.success ? `✓ ${json.message}` : `Błąd: ${json.errors?.join(", ") ?? json.error}`,
      );
    } catch (e) {
      setMigrateResult(`Błąd: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setMigrating(false);
    }
  };

  const showPreview = fileContent !== null;
  const rightPanelCols = showPreview ? "1fr 1fr" : "1fr";

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "20px 24px",
        gap: 14,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: tokens.font.sans,
              fontSize: "22px",
              fontWeight: 800,
              color: tokens.text.primary,
              margin: "0 0 5px",
              letterSpacing: "-0.025em",
            }}
          >
            Workspace
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: tokens.font.mono,
                fontSize: "11px",
                color: tokens.text.muted,
              }}
            >
              <Terminal size={10} />
              D:/autorise/workspace
            </span>
            {lastUpdated && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: tokens.status.successMuted,
                  border: `1px solid rgba(22,163,74,0.2)`,
                  fontFamily: tokens.font.mono,
                  fontSize: "9px",
                  color: tokens.status.success,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                LIVE
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={fetchTree}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: tokens.bg.surface,
              border: `1px solid ${tokens.border.default}`,
              borderRadius: tokens.radius.md,
              fontFamily: tokens.font.sans,
              fontSize: "12px",
              color: tokens.text.secondary,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            <RefreshCw
              size={12}
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
            />
            Odśwież
          </button>
          <button
            onClick={() => runAnalysis()}
            disabled={analysing || loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: analysing || loading ? tokens.bg.elevated : tokens.accent.primary,
              color: analysing || loading ? tokens.text.muted : "#fff",
              border: "none",
              borderRadius: tokens.radius.md,
              fontFamily: tokens.font.sans,
              fontSize: "12px",
              fontWeight: 600,
              cursor: analysing || loading ? "not-allowed" : "pointer",
              boxShadow: analysing || loading ? "none" : "0 1px 4px rgba(37,99,235,0.25)",
              transition: "all 0.15s",
            }}
          >
            {analysing ? (
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Brain size={12} />
            )}
            {analysing ? "Analizuję..." : "Analiza AI"}
          </button>
          <button
            onClick={runMigration}
            disabled={migrating}
            title="Dodaje brakujące właściwości do bazy Notion (jednorazowe)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: migrateResult?.startsWith("✓")
                ? tokens.status.successMuted
                : tokens.bg.surface,
              border: `1px solid ${migrateResult?.startsWith("✓") ? "rgba(22,163,74,0.3)" : tokens.border.default}`,
              borderRadius: tokens.radius.md,
              fontFamily: tokens.font.sans,
              fontSize: "12px",
              color: migrateResult?.startsWith("✓") ? tokens.status.success : tokens.text.muted,
              cursor: migrating ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {migrating ? (
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Database size={12} />
            )}
            {migrating
              ? "Migruję..."
              : migrateResult?.startsWith("✓")
                ? "Notion ✓"
                : "Migruj Notion"}
          </button>
        </div>
      </div>
      {migrateResult && !migrateResult.startsWith("✓") && (
        <div
          style={{
            padding: "8px 14px",
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            fontFamily: tokens.font.mono,
            fontSize: "11px",
            color: "#ef4444",
            flexShrink: 0,
          }}
        >
          {migrateResult}
        </div>
      )}

      {/* ── Stats + Pinned ── */}
      <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
        {/* Stats */}
        {data && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              flex: "0 0 auto",
            }}
          >
            <StatCard
              icon={Layers}
              label="Projekty"
              value={data.stats.topProjects.length}
              color={tokens.accent.primary}
            />
            <StatCard
              icon={FolderOpen}
              label="Foldery"
              value={data.stats.totalDirs}
              color="#7c3aed"
            />
            <StatCard
              icon={BarChart3}
              label="Pliki"
              value={data.stats.totalFiles}
              color={tokens.status.success}
            />
          </div>
        )}

        {/* Pinned CEO docs */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {PINNED_DOCS.map((doc) => (
            <PinnedDocCard
              key={doc.id}
              doc={doc}
              onOpen={(d) => openFile(d.path, d.sublabel)}
              loading={fileLoading === doc.path}
            />
          ))}
        </div>
      </div>

      {/* ── Main area ── */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: `260px 1fr`,
          gap: 12,
          minHeight: 0,
        }}
      >
        {/* Tree panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: `1px solid ${tokens.border.default}`,
            borderRadius: tokens.radius.xl,
            background: tokens.bg.primary,
            overflow: "hidden",
            boxShadow: tokens.shadow.card,
          }}
        >
          <div
            style={{
              padding: "9px 9px 8px",
              borderBottom: `1px solid ${tokens.border.default}`,
              flexShrink: 0,
            }}
          >
            <div style={{ position: "relative" }}>
              <Search
                size={11}
                color={tokens.text.muted}
                style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj pliku..."
                style={{
                  width: "100%",
                  padding: "6px 28px",
                  boxSizing: "border-box",
                  background: tokens.bg.surface,
                  border: `1px solid ${tokens.border.default}`,
                  borderRadius: tokens.radius.md,
                  fontFamily: tokens.font.mono,
                  fontSize: "11px",
                  color: tokens.text.primary,
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = tokens.accent.primary;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = tokens.border.default;
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: tokens.text.muted,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "6px 4px" }}>
            {loading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 80,
                  gap: 8,
                  color: tokens.text.muted,
                }}
              >
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontFamily: tokens.font.sans, fontSize: "12px" }}>Ładowanie...</span>
              </div>
            ) : error ? (
              <div
                style={{
                  padding: 14,
                  fontFamily: tokens.font.sans,
                  fontSize: "12px",
                  color: tokens.status.error,
                }}
              >
                {error}
              </div>
            ) : data ? (
              <TreeNode
                node={data.tree}
                depth={0}
                search={search}
                onSelect={handleTreeSelect}
                selected={selected}
              />
            ) : null}
          </div>
        </div>

        {/* Right panel */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: showPreview ? "1fr 1fr" : "1fr",
            gap: 12,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Left right-panel column: AI + projects */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 0,
              overflow: "auto",
            }}
          >
            {/* Selected item */}
            {selected && !fileContent && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: "12px 16px",
                  background: tokens.bg.primary,
                  border: `1px solid ${tokens.border.default}`,
                  borderRadius: tokens.radius.xl,
                  boxShadow: tokens.shadow.card,
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {selected.type === "dir" ? (
                    <FolderOpen size={15} color={tokens.accent.primary} />
                  ) : (
                    <FileIcon ext={selected.ext} size={15} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: tokens.font.mono,
                        fontSize: "13px",
                        fontWeight: 700,
                        color: tokens.text.primary,
                      }}
                    >
                      {selected.name}
                    </div>
                    <div
                      style={{
                        fontFamily: tokens.font.mono,
                        fontSize: "10px",
                        color: tokens.text.muted,
                        marginTop: 1,
                      }}
                    >
                      {selected.path}
                      {selected.type === "file" && selected.size
                        ? ` · ${formatBytes(selected.size)}`
                        : ""}
                      {selected.type === "dir" && selected.fileCount
                        ? ` · ${selected.fileCount} plików`
                        : ""}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      runAnalysis(
                        `Przeanalizuj: ${selected.path} (${selected.type === "dir" ? "folder" : "plik"}). Opisz przeznaczenie i rolę w projekcie.`,
                      )
                    }
                    disabled={analysing}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 11px",
                      background: tokens.accent.muted,
                      border: `1px solid ${tokens.accent.mutedBorder}`,
                      borderRadius: tokens.radius.md,
                      fontFamily: tokens.font.sans,
                      fontSize: "11px",
                      fontWeight: 600,
                      color: tokens.accent.primary,
                      cursor: "pointer",
                    }}
                  >
                    <Brain size={11} />
                    Analizuj
                  </button>
                </div>
              </motion.div>
            )}

            {/* Projects */}
            {data && !selected && (
              <div
                style={{
                  padding: "14px 16px",
                  background: tokens.bg.primary,
                  border: `1px solid ${tokens.border.default}`,
                  borderRadius: tokens.radius.xl,
                  boxShadow: tokens.shadow.card,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontFamily: tokens.font.sans,
                    fontSize: "11px",
                    fontWeight: 700,
                    color: tokens.text.secondary,
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  <GitBranch size={11} />
                  Projekty
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {data.stats.topProjects.map((p) => (
                    <span
                      key={p}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 9px",
                        background: tokens.bg.surface,
                        border: `1px solid ${tokens.border.default}`,
                        borderRadius: tokens.radius.md,
                        fontFamily: tokens.font.mono,
                        fontSize: "11px",
                        color: tokens.text.primary,
                      }}
                    >
                      <Folder size={9} color={tokens.accent.primary} />
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ask AI */}
            <div
              style={{
                padding: "14px 16px",
                background: tokens.bg.primary,
                border: `1px solid ${tokens.border.default}`,
                borderRadius: tokens.radius.xl,
                boxShadow: tokens.shadow.card,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontFamily: tokens.font.sans,
                  fontSize: "11px",
                  fontWeight: 700,
                  color: tokens.text.secondary,
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                <Brain size={11} />
                Zapytaj o workspace
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                  placeholder="np. Co jest aktywnie rozwijane? Jaki stack używamy?"
                  style={{
                    flex: 1,
                    padding: "8px 11px",
                    background: tokens.bg.surface,
                    border: `1px solid ${tokens.border.default}`,
                    borderRadius: tokens.radius.md,
                    fontFamily: tokens.font.sans,
                    fontSize: "12px",
                    color: tokens.text.primary,
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = tokens.accent.primary;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = tokens.border.default;
                  }}
                />
                <button
                  onClick={handleAsk}
                  disabled={!question.trim() || askingQuestion || analysing}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "8px 14px",
                    background:
                      question.trim() && !askingQuestion && !analysing
                        ? tokens.accent.primary
                        : tokens.bg.elevated,
                    color:
                      question.trim() && !askingQuestion && !analysing ? "#fff" : tokens.text.muted,
                    border: "none",
                    borderRadius: tokens.radius.md,
                    fontFamily: tokens.font.sans,
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor:
                      question.trim() && !askingQuestion && !analysing ? "pointer" : "not-allowed",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                >
                  {askingQuestion || analysing ? (
                    <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Send size={12} />
                  )}
                  Wyślij
                </button>
              </div>
            </div>

            {/* Analysis output */}
            <AnimatePresence>
              {(analysis || analysing) && (
                <motion.div
                  ref={analysisRef}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    padding: "14px 16px",
                    background: "#0d1117",
                    border: `1px solid #21262d`,
                    borderRadius: tokens.radius.xl,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      fontFamily: tokens.font.mono,
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#4a6080",
                      marginBottom: 10,
                      letterSpacing: "0.1em",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Brain size={10} color="#4a6080" />
                    WORKSPACE INTELLIGENCE
                  </div>
                  {analysing ? (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8, color: "#79c0ff" }}
                    >
                      <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                      <span style={{ fontFamily: tokens.font.mono, fontSize: "12px" }}>
                        Analizuję...
                      </span>
                    </div>
                  ) : (
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: tokens.font.mono,
                        fontSize: "11.5px",
                        color: "#e2e8f0",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        lineHeight: 1.7,
                      }}
                    >
                      {analysis}
                    </pre>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* File preview panel */}
          <AnimatePresence>
            {fileContent && (
              <FilePreview
                key={fileContent.path}
                title={fileContent.name}
                subtitle={fileContent.subtitle ?? fileContent.path}
                content={fileContent.content}
                ext={fileContent.ext}
                truncated={fileContent.truncated}
                onClose={() => setFileContent(null)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
