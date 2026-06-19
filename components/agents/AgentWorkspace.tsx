"use client";

import {
  ArrowLeft,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Database,
  Loader2,
  Play,
  Search,
  Sparkles,
  User,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HealthResponse } from "@/app/api/health/route";
import type { PipelineClient } from "@/lib/notion/client";
import type { Agent0Output } from "./Agent0Card";
import { Agent0Card } from "./Agent0Card";
import type { Agent1Output } from "./Agent1Card";
import { Agent1Card } from "./Agent1Card";
import type { Agent2Output } from "./Agent2Card";
import { Agent2Card } from "./Agent2Card";
import type { Agent3Output } from "./Agent3Card";
import { Agent3Card } from "./Agent3Card";
import type { Agent4Output } from "./Agent4Card";
import { Agent4Card } from "./Agent4Card";
import type { AgentId } from "./AgentsOverview";

// ── Types ──────────────────────────────────────────────────────────

export type AgentStatus = "idle" | "running" | "done" | "error";

export interface AgentState {
  transcript: string;
  agent1Json: string;
  agent2Json: string;
  status: AgentStatus;
  output: unknown;
  errorMsg: string | null;
  notionPageId: string | null;
  notionError: string | null;
  notionPushing: boolean;
  elapsed: number | null;
}

interface AgentWorkspaceProps {
  agentId: AgentId;
  state: AgentState;
  clients: PipelineClient[];
  health: HealthResponse | null;
  healthLoading: boolean;
  selectedClientId: string;
  onBack: () => void;
  onFieldChange: (field: keyof AgentState, value: string) => void;
  onClientSelect: (id: string) => void;
  onRun: () => void;
  onNotionPush: () => void;
  onCopy: () => void;
  copied: boolean;
}

// ── Agent configuration ────────────────────────────────────────────

interface AgentConfig {
  num: string;
  name: string;
  category: "sprzedaz" | "szkolenia" | "analiza";
  color: string;
  when: string;
  db: string | null;
  dbFields: string[];
  inputs: Array<{ field: "transcript" | "agent1Json" | "agent2Json"; label: string; rows: number }>;
  showClientSelector: boolean;
  writesNotion: boolean;
  hasThinking: boolean;
  clientFilter: string[];
  outputExpected: string;
  splitLayout?: boolean;
}

const CONFIGS: Record<AgentId, AgentConfig> = {
  agent0: {
    num: "00",
    name: "Lead Intake",
    category: "sprzedaz",
    color: "#1a56ff",
    when: "Nowy lead ze Slacka",
    db: "Notion Pipeline",
    dbFields: ["Firma + NIP", "Dane z KRS", "Flota (pojazdy)", "Status: Nowy lead"],
    inputs: [
      { field: "transcript", label: "Wiadomość ze Slacka — treść z pozyskanym leadem", rows: 14 },
    ],
    showClientSelector: false,
    writesNotion: true,
    hasThinking: false,
    clientFilter: [],
    outputExpected: "Karta leada z danymi KRS i Pipeline w Notion",
    splitLayout: true,
  },
  agent1: {
    num: "01",
    name: "Kwalifikacja",
    category: "sprzedaz",
    color: "#5e5ce6",
    when: "Po rozmowie kwalifikacyjnej (5-8 min)",
    db: "Notion Pipeline",
    dbFields: [
      "ICP score (0-100)",
      "Koszt problemu PLN",
      "TMS + dane firmy",
      "Data i godzina Discovery",
    ],
    inputs: [{ field: "transcript", label: "Transkrypt rozmowy kwalifikacyjnej", rows: 12 }],
    showClientSelector: true,
    writesNotion: true,
    hasThinking: false,
    clientFilter: ["Nowy lead", "Kwalifikacja"],
    outputExpected: "Karta klienta z ICP score i kwalifikacją",
  },
  agent2: {
    num: "02",
    name: "Pre-Discovery",
    category: "sprzedaz",
    color: "#ff9f0a",
    when: "Po kwalifikacji, dzień przed Discovery Call",
    db: null,
    dbFields: [],
    inputs: [
      { field: "transcript", label: "Transkrypt rozmowy kwalifikacyjnej", rows: 10 },
      { field: "agent1Json", label: "JSON z Agenta 1 — opcjonalnie", rows: 5 },
    ],
    showClientSelector: true,
    writesNotion: false,
    hasThinking: true,
    clientFilter: ["Kwalifikacja", "Discovery umówione"],
    outputExpected: "Pre-Discovery Brief + Live Script na Discovery Call",
  },
  agent3: {
    num: "03",
    name: "Personalizacja",
    category: "sprzedaz",
    color: "#30d158",
    when: "Tuż przed Discovery Call — personalizuje prezentację",
    db: null,
    dbFields: [],
    inputs: [
      { field: "transcript", label: "JSON z Agenta 1 — wynik kwalifikacji", rows: 8 },
      { field: "agent2Json", label: "JSON lub Brief z Agenta 2 — opcjonalnie", rows: 5 },
    ],
    showClientSelector: false,
    writesNotion: false,
    hasThinking: false,
    clientFilter: [],
    outputExpected: "Dane pod prezentację + link z URL params",
  },
  agent4: {
    num: "04",
    name: "Discovery Call",
    category: "sprzedaz",
    color: "#ff453a",
    when: "Po Discovery Call — analiza całego spotkania (45-60 min)",
    db: "Notion Pipeline",
    dbFields: ["Wynik Discovery", "Analiza kroków 1-5", "Re-engagement plan"],
    inputs: [
      {
        field: "transcript",
        label: "Transkrypt Discovery Call — całe spotkanie (45-60 min)",
        rows: 14,
      },
    ],
    showClientSelector: true,
    writesNotion: true,
    hasThinking: false,
    clientFilter: ["Discovery umówione"],
    outputExpected: "Analiza jakości spotkania z następnymi krokami",
  },
  agent5: {
    num: "05",
    name: "Agency Leaders",
    category: "szkolenia",
    color: "#0a84ff",
    when: "Po sesji Agency Leaders (Robert Kimura / Kacper Wierszewski)",
    db: null,
    dbFields: [],
    inputs: [{ field: "transcript", label: "Transkrypt sesji Agency Leaders z Fathom", rows: 12 }],
    showClientSelector: false,
    writesNotion: false,
    hasThinking: true,
    clientFilter: [],
    outputExpected: "Raport z actionable learningami i kluczowymi frameworkami",
  },
  agent6: {
    num: "06",
    name: "Analiza Narzędzia",
    category: "analiza",
    color: "#636366",
    when: "Ocena nowego narzędzia, biblioteki lub koncepcji AI",
    db: null,
    dbFields: [],
    inputs: [
      { field: "transcript", label: "Opis narzędzia, biblioteki lub koncepcji do oceny", rows: 10 },
    ],
    showClientSelector: false,
    writesNotion: false,
    hasThinking: false,
    clientFilter: [],
    outputExpected: "Raport z oceną przydatności dla workspace Autorise",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  sprzedaz: "Proces Sprzedażowy",
  szkolenia: "Szkolenia",
  analiza: "Analiza",
};

const f = { system: "var(--font-system)", mono: "var(--font-mono)" };

// ── Glass panel ────────────────────────────────────────────────────

function GlassPanel({
  children,
  color = "var(--text-tertiary)",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "var(--glass)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        border: "1px solid var(--glass-border)",
        borderRadius: 16,
        padding: "18px 20px",
        boxShadow: "var(--glass-shadow)",
      }}
    >
      {children}
    </div>
  );
}

function PanelLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      style={{
        fontFamily: f.system,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: color ?? "var(--text-tertiary)",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

// ── Status chip ────────────────────────────────────────────────────

function StatusChip({ label, ok }: { label: string; ok: boolean | null }) {
  const color = ok === null ? "#636366" : ok ? "#34c759" : "#ff3b30";
  const bg =
    ok === null ? "var(--bg-item-hover)" : ok ? "rgba(52,199,89,0.10)" : "rgba(255,59,48,0.10)";
  const border =
    ok === null ? "var(--border)" : ok ? "rgba(52,199,89,0.25)" : "rgba(255,59,48,0.25)";
  const Icon = ok === null ? Loader2 : ok ? Wifi : WifiOff;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 10,
        background: bg,
        border: `1px solid ${border}`,
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
      }}
    >
      <Icon
        size={12}
        color={color}
        style={ok === null ? { animation: "spin 1s linear infinite" } : undefined}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: f.system,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {label}
        </div>
      </div>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
    </div>
  );
}

// ── Client selector ────────────────────────────────────────────────

function ClientDropdown({
  clients,
  selectedId,
  filter,
  onSelect,
}: {
  clients: PipelineClient[];
  selectedId: string;
  filter: string[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = clients.filter((c) => {
    const statusOk = filter.length === 0 || filter.includes(c.status);
    const searchOk = !q || c.name?.toLowerCase().includes(q.toLowerCase());
    return statusOk && searchOk;
  });

  const selected = clients.find((c) => c.id === selectedId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const STATUS_COLORS: Record<string, string> = {
    "Nowy lead": "#1a56ff",
    Kwalifikacja: "#af52de",
    "Discovery umówione": "#ff9500",
    Finalizacja: "#34c759",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: "var(--bg-elevated)",
          border: `1px solid ${open ? "#1a56ff" : "var(--border)"}`,
          borderRadius: 11,
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: open ? "0 0 0 3px rgba(26,86,255,0.12)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        <User size={13} color={selected ? "#1a56ff" : "var(--text-tertiary)"} strokeWidth={1.7} />
        <span
          style={{
            flex: 1,
            fontFamily: f.system,
            fontSize: 13,
            color: selected ? "var(--text-primary)" : "var(--text-tertiary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selected ? selected.name : "Wybierz klienta..."}
        </span>
        <ChevronDown
          size={13}
          color="var(--text-tertiary)"
          style={{
            transition: "transform 0.15s",
            transform: open ? "rotate(180deg)" : "none",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 200,
            background: "var(--glass)",
            backdropFilter: "var(--glass-blur)",
            WebkitBackdropFilter: "var(--glass-blur)",
            border: "1px solid var(--glass-border)",
            borderRadius: 13,
            boxShadow: "var(--shadow-menu)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "8px 8px 4px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 10px",
                background: "var(--bg-item-hover)",
                borderRadius: 8,
              }}
            >
              <Search size={12} color="var(--text-tertiary)" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Szukaj klienta..."
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontFamily: f.system,
                  fontSize: 12,
                  color: "var(--text-primary)",
                }}
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <X size={11} color="var(--text-tertiary)" />
                </button>
              )}
            </div>
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", padding: "4px 8px 8px" }}>
            {selectedId && (
              <button
                onClick={() => {
                  onSelect("");
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: f.system,
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                Wyczyść wybór
              </button>
            )}
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "12px 10px",
                  fontFamily: f.system,
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  textAlign: "center",
                }}
              >
                Brak klientów w tym etapie
              </div>
            ) : (
              filtered.map((c) => {
                const dot = STATUS_COLORS[c.status] ?? "#636366";
                const isSelected = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelect(c.id);
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 10px",
                      borderRadius: 9,
                      border: "none",
                      cursor: "pointer",
                      background: isSelected ? "rgba(26,86,255,0.10)" : "transparent",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      transition: "background 0.1s",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: dot,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: f.system,
                          fontSize: 12,
                          fontWeight: isSelected ? 600 : 400,
                          color: "var(--text-primary)",
                        }}
                      >
                        {c.name}
                      </div>
                      <div
                        style={{
                          fontFamily: f.system,
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                          marginTop: 1,
                        }}
                      >
                        {c.status}
                      </div>
                    </div>
                    {isSelected && <Check size={11} color="#1a56ff" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styled textarea ────────────────────────────────────────────────

function StyledTextarea({
  value,
  onChange,
  label,
  rows = 10,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  rows?: number;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontFamily: f.system,
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder ?? "Wklej treść..."}
        style={{
          width: "100%",
          resize: "vertical",
          boxSizing: "border-box",
          padding: "12px 14px",
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: `1px solid ${focused ? "#1a56ff" : "var(--glass-border)"}`,
          borderRadius: 12,
          color: "var(--text-primary)",
          fontFamily: f.mono,
          fontSize: 12.5,
          lineHeight: 1.6,
          outline: "none",
          boxShadow: focused
            ? "0 0 0 3px rgba(26,86,255,0.12), var(--glass-shadow)"
            : "var(--glass-shadow)",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

// ── Run button ─────────────────────────────────────────────────────

function RunButton({
  agentId,
  status,
  hasThinking,
  color,
  onClick,
}: {
  agentId: AgentId;
  status: AgentStatus;
  hasThinking: boolean;
  color: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const running = status === "running";
  const done = status === "done";
  const cfg = CONFIGS[agentId];

  return (
    <button
      onClick={onClick}
      disabled={running}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        width: "100%",
        padding: "15px 24px",
        background: running
          ? "var(--bg-item-hover)"
          : `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
        border: "none",
        borderRadius: 14,
        cursor: running ? "wait" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        boxShadow: running
          ? "none"
          : hovered
            ? `0 6px 24px ${color}55, 0 2px 8px ${color}33`
            : `0 4px 16px ${color}40`,
        transform: pressed ? "scale(0.98)" : hovered ? "scale(1.01)" : "scale(1)",
        transition: "transform 0.12s, box-shadow 0.15s, background 0.2s",
      }}
    >
      {running ? (
        <Loader2
          size={16}
          color="var(--text-tertiary)"
          style={{ animation: "spin 1s linear infinite" }}
        />
      ) : (
        <Play size={16} color="#fff" fill="#fff" />
      )}
      <span
        style={{
          fontFamily: f.system,
          fontSize: 14,
          fontWeight: 700,
          color: running ? "var(--text-tertiary)" : "#fff",
          letterSpacing: "-0.01em",
        }}
      >
        {running ? "Trwa analiza..." : `Uruchom Agenta ${cfg.num}`}
      </span>
      {!running && hasThinking && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 20,
            padding: "2px 8px",
          }}
        >
          <Brain size={10} color="#fff" />
          <span style={{ fontFamily: f.system, fontSize: 10, color: "#fff", fontWeight: 600 }}>
            Analiza Głęboka
          </span>
        </div>
      )}
    </button>
  );
}

// ── Output section ─────────────────────────────────────────────────

function OutputSection({
  agentId,
  state,
  onCopy,
  copied,
  onNotionPush,
}: {
  agentId: AgentId;
  state: AgentState;
  onCopy: () => void;
  copied: boolean;
  onNotionPush: () => void;
}) {
  const cfg = CONFIGS[agentId];

  if (state.status === "idle") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          gap: 12,
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: "1px solid var(--glass-border)",
          borderRadius: 16,
          boxShadow: "var(--glass-shadow)",
          padding: 32,
        }}
      >
        <Sparkles size={28} color="var(--text-tertiary)" strokeWidth={1} />
        <div
          style={{
            fontFamily: f.system,
            fontSize: 13,
            color: "var(--text-tertiary)",
            textAlign: "center",
            maxWidth: 220,
            lineHeight: 1.5,
          }}
        >
          {cfg.outputExpected}
        </div>
      </div>
    );
  }

  if (state.status === "running") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          gap: 16,
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: `1px solid ${cfg.color}30`,
          borderRadius: 16,
          boxShadow: "var(--glass-shadow)",
          padding: 32,
        }}
      >
        <Loader2 size={28} color={cfg.color} style={{ animation: "spin 1s linear infinite" }} />
        <div
          style={{
            fontFamily: f.system,
            fontSize: 13,
            color: "var(--text-secondary)",
            textAlign: "center",
          }}
        >
          {cfg.hasThinking ? "Extended thinking aktywne..." : "Analiza w toku..."}
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        style={{
          padding: "20px",
          background: "rgba(255,59,48,0.06)",
          border: "1px solid rgba(255,59,48,0.2)",
          borderRadius: 16,
        }}
      >
        <div
          style={{
            fontFamily: f.system,
            fontSize: 13,
            color: "#ff3b30",
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Wystąpił błąd
        </div>
        <div style={{ fontFamily: f.mono, fontSize: 11.5, color: "#ff3b30", lineHeight: 1.5 }}>
          {state.errorMsg}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Actions bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={onCopy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            background: copied ? "rgba(52,199,89,0.08)" : "var(--glass)",
            backdropFilter: "var(--glass-blur)",
            WebkitBackdropFilter: "var(--glass-blur)",
            border: `1px solid ${copied ? "rgba(52,199,89,0.25)" : "var(--glass-border)"}`,
            borderRadius: 9,
            cursor: "pointer",
            boxShadow: "var(--glass-shadow)",
            fontFamily: f.system,
            fontSize: 12,
            fontWeight: 600,
            color: copied ? "#34c759" : "var(--text-secondary)",
            transition: "all 0.15s",
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Skopiowano" : "Kopiuj"}
        </button>

        {state.notionPageId && cfg.writesNotion && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              background: "rgba(52,199,89,0.08)",
              border: "1px solid rgba(52,199,89,0.20)",
              borderRadius: 9,
              backdropFilter: "var(--glass-blur)",
            }}
          >
            <CheckCircle2 size={11} color="#34c759" />
            <span style={{ fontFamily: f.system, fontSize: 11, fontWeight: 600, color: "#34c759" }}>
              Zapisano w Notion
            </span>
          </div>
        )}

        {state.elapsed != null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 12px",
              marginLeft: "auto",
            }}
          >
            <Clock size={11} color="var(--text-tertiary)" />
            <span style={{ fontFamily: f.mono, fontSize: 11, color: "var(--text-tertiary)" }}>
              {state.elapsed < 60
                ? `${state.elapsed}s`
                : `${Math.floor(state.elapsed / 60)}m ${state.elapsed % 60}s`}
            </span>
          </div>
        )}
      </div>

      {state.notionError && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(255,59,48,0.07)",
            border: "1px solid rgba(255,59,48,0.2)",
            borderRadius: 9,
            fontFamily: f.system,
            fontSize: 12,
            color: "#ff3b30",
          }}
        >
          {state.notionError}
        </div>
      )}

      {/* Rendered output */}
      <div>
        {agentId === "agent0" && <Agent0Card output={state.output as Agent0Output} />}
        {agentId === "agent1" && <Agent1Card output={state.output as Agent1Output} />}
        {agentId === "agent2" && <Agent2Card output={state.output as Agent2Output} />}
        {agentId === "agent3" && <Agent3Card output={state.output as Agent3Output} />}
        {agentId === "agent4" && <Agent4Card output={state.output as Agent4Output} />}
        {(agentId === "agent5" || agentId === "agent6") && (
          <div
            style={{
              background: "var(--glass)",
              backdropFilter: "var(--glass-blur)",
              WebkitBackdropFilter: "var(--glass-blur)",
              border: "1px solid var(--glass-border)",
              borderRadius: 16,
              boxShadow: "var(--glass-shadow)",
              padding: "20px 22px",
            }}
          >
            <pre
              style={{
                margin: 0,
                fontFamily: f.mono,
                fontSize: 12.5,
                lineHeight: 1.65,
                color: "var(--text-primary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {typeof state.output === "string"
                ? state.output
                : JSON.stringify(state.output, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main workspace ─────────────────────────────────────────────────

export function AgentWorkspace({
  agentId,
  state,
  clients,
  health,
  healthLoading,
  selectedClientId,
  onBack,
  onFieldChange,
  onClientSelect,
  onRun,
  onNotionPush,
  onCopy,
  copied,
}: AgentWorkspaceProps) {
  const cfg = CONFIGS[agentId];
  const anthropicOk = healthLoading ? null : (health?.anthropic?.ok ?? false);
  const notionOk = healthLoading ? null : (health?.notion?.ok ?? false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        backgroundImage: "var(--page-gradient)",
        fontFamily: f.system,
      }}
    >
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Top bar ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderBottom: "1px solid var(--glass-border)",
          padding: "12px 28px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "var(--bg-item-hover)",
            border: "1px solid var(--border)",
            borderRadius: 9,
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontFamily: f.system,
            fontSize: 12,
            fontWeight: 500,
            transition: "background 0.12s",
          }}
        >
          <ArrowLeft size={13} />
          Agenci
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div
            style={{
              fontFamily: f.mono,
              fontSize: 20,
              fontWeight: 800,
              color: cfg.color,
              letterSpacing: "-0.03em",
              textShadow: `0 0 20px ${cfg.color}50`,
            }}
          >
            {cfg.num}
          </div>
          <div>
            <div
              style={{
                fontFamily: f.system,
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              {cfg.name}
            </div>
            <div style={{ fontFamily: f.system, fontSize: 11, color: "var(--text-tertiary)" }}>
              {CATEGORY_LABELS[cfg.category]}
            </div>
          </div>
        </div>

        {/* Status chips */}
        <div style={{ display: "flex", gap: 8 }}>
          <StatusChip label="Anthropic API" ok={anthropicOk} />
          {cfg.writesNotion && <StatusChip label="Notion Pipeline" ok={notionOk} />}
        </div>
      </div>

      {/* ── Content ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cfg.splitLayout ? "260px 360px 1fr" : "300px 1fr",
          gap: 0,
          minHeight: "calc(100vh - 57px)",
        }}
      >
        {/* ── Left sidebar panels ── */}
        <div
          style={{
            borderRight: "1px solid var(--glass-border)",
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            background: "var(--glass)",
            backdropFilter: "var(--glass-blur)",
            WebkitBackdropFilter: "var(--glass-blur)",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* When to use */}
          <GlassPanel>
            <PanelLabel color={cfg.color}>Kiedy używasz</PanelLabel>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Clock size={13} color={cfg.color} style={{ flexShrink: 0, marginTop: 2 }} />
              <div
                style={{
                  fontFamily: f.system,
                  fontSize: 13,
                  color: "var(--text-primary)",
                  lineHeight: 1.5,
                }}
              >
                {cfg.when}
              </div>
            </div>
          </GlassPanel>

          {/* Database */}
          {cfg.db ? (
            <GlassPanel>
              <PanelLabel>Baza danych</PanelLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <Database size={13} color="#1a56ff" />
                <span
                  style={{
                    fontFamily: f.system,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {cfg.db}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {cfg.dbFields.map((field) => (
                  <div key={field} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 size={11} color="#34c759" />
                    <span
                      style={{ fontFamily: f.system, fontSize: 12, color: "var(--text-secondary)" }}
                    >
                      {field}
                    </span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          ) : (
            <GlassPanel>
              <PanelLabel>Baza danych</PanelLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Database size={13} color="var(--text-tertiary)" />
                <span style={{ fontFamily: f.system, fontSize: 12, color: "var(--text-tertiary)" }}>
                  Tylko wynik — nie zapisuje do bazy
                </span>
              </div>
            </GlassPanel>
          )}

          {/* Client selector */}
          {cfg.showClientSelector && (
            <GlassPanel>
              <PanelLabel>Klient</PanelLabel>
              <ClientDropdown
                clients={clients}
                selectedId={selectedClientId}
                filter={cfg.clientFilter}
                onSelect={onClientSelect}
              />
            </GlassPanel>
          )}

          {/* Expected output */}
          <GlassPanel>
            <PanelLabel>Wynik agenta</PanelLabel>
            <div
              style={{
                fontFamily: f.system,
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              {cfg.outputExpected}
            </div>
          </GlassPanel>
        </div>

        {/* ── Right: input + output ── */}
        <div
          style={{
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            overflowY: "auto",
          }}
        >
          {/* Inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {cfg.inputs.map((inp) => (
              <StyledTextarea
                key={inp.field}
                label={inp.label}
                rows={inp.rows}
                value={state[inp.field] as string}
                onChange={(v) => onFieldChange(inp.field, v)}
              />
            ))}
          </div>

          {/* Run button */}
          <RunButton
            agentId={agentId}
            status={state.status}
            hasThinking={cfg.hasThinking}
            color={cfg.color}
            onClick={onRun}
          />

          {/* Output */}
          {state.status !== "idle" && (
            <div>
              <div
                style={{
                  fontFamily: f.system,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  marginBottom: 14,
                }}
              >
                Wynik
              </div>
              <OutputSection
                agentId={agentId}
                state={state}
                onCopy={onCopy}
                copied={copied}
                onNotionPush={onNotionPush}
              />
            </div>
          )}

          {state.status === "idle" && (
            <OutputSection
              agentId={agentId}
              state={state}
              onCopy={onCopy}
              copied={copied}
              onNotionPush={onNotionPush}
            />
          )}
        </div>
      </div>
    </div>
  );
}
