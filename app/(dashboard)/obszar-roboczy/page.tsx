"use client";

import {
  BookOpen,
  Brain,
  CheckCircle2,
  Database,
  Globe,
  Loader2,
  Microscope,
  RefreshCw,
  Server,
  Terminal,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { HealthResponse } from "@/app/api/health/route";

const f = { system: "var(--font-system)", mono: "var(--font-mono)" };

// Agent definitions (mirrors AgentsOverview configs)
const AGENTS = [
  {
    num: "00",
    name: "Lead Intake",
    model: "claude-sonnet-4-6",
    thinking: false,
    notion: true,
    color: "#1a56ff",
  },
  {
    num: "01",
    name: "Kwalifikacja",
    model: "claude-sonnet-4-6",
    thinking: false,
    notion: true,
    color: "#af52de",
  },
  {
    num: "02",
    name: "Pre-Discovery",
    model: "claude-opus-4-8",
    thinking: true,
    notion: false,
    color: "#ff9500",
  },
  {
    num: "03",
    name: "Personalizacja",
    model: "claude-opus-4-8",
    thinking: false,
    notion: false,
    color: "#34c759",
  },
  {
    num: "04",
    name: "Discovery Call",
    model: "claude-sonnet-4-6",
    thinking: false,
    notion: true,
    color: "#ff3b30",
  },
  {
    num: "05",
    name: "Agency Leaders",
    model: "claude-opus-4-8",
    thinking: true,
    notion: false,
    color: "#1a56ff",
  },
  {
    num: "06",
    name: "Narzędzia",
    model: "claude-opus-4-8",
    thinking: false,
    notion: false,
    color: "#636366",
  },
] as const;

const SKILLS = [
  { name: "graphify", desc: "Konwertuje wiedzę na knowledge graph" },
  { name: "blueprint", desc: "Planowanie przed kodowaniem" },
  { name: "autonomous-loops", desc: "Build >30 min z checkpointami" },
  { name: "agentic-engineering", desc: "Projektowanie agentów AI" },
  { name: "cost-aware-llm", desc: "Optymalizacja kosztów API" },
];

// ── Status dot ─────────────────────────────────────────────────────

function Dot({ ok, loading = false }: { ok?: boolean | null; loading?: boolean }) {
  if (loading)
    return (
      <Loader2
        size={13}
        color="#8e8e93"
        style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
      />
    );
  if (ok)
    return <CheckCircle2 size={13} color="#34c759" strokeWidth={2} style={{ flexShrink: 0 }} />;
  return <XCircle size={13} color="#ff3b30" strokeWidth={2} style={{ flexShrink: 0 }} />;
}

// ── Section card ───────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: "22px 24px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div>
        <div
          style={{
            fontFamily: f.system,
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontFamily: f.system,
              fontSize: 11.5,
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────

export default function ObszarRoboczyPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [mcpStatus, setMcpStatus] = useState<{
    ok: boolean;
    port: number;
    data?: Record<string, unknown>;
  } | null>(null);
  const [mcpLoading, setMcpLoading] = useState(true);
  const [googleOk, setGoogleOk] = useState<boolean | null>(null);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/health");
      setHealth(await res.json());
    } catch {
      /* silent */
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadMcp = useCallback(async () => {
    setMcpLoading(true);
    try {
      const res = await fetch("/api/mcp/status");
      setMcpStatus(await res.json());
    } catch {
      setMcpStatus({ ok: false, port: 3010 });
    } finally {
      setMcpLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    loadMcp();
    // Check Google connection
    fetch("/api/auth/google/status")
      .then((r) => setGoogleOk(r.ok))
      .catch(() => setGoogleOk(false));
  }, [loadHealth, loadMcp]);

  const anthropicOk = healthLoading ? null : (health?.anthropic?.ok ?? false);
  const notionOk = healthLoading ? null : (health?.notion?.ok ?? false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "36px 36px 64px",
        fontFamily: f.system,
      }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            flexShrink: 0,
            background: "linear-gradient(135deg, #141416 0%, #1c1c1e 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Terminal size={22} color="#f5f5f7" strokeWidth={1.8} />
        </div>
        <div>
          <h1
            style={{
              fontFamily: f.system,
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              margin: 0,
              lineHeight: 1,
              color: "var(--text-primary)",
            }}
          >
            Obszar Roboczy
          </h1>
          <div
            style={{
              fontFamily: f.system,
              fontSize: 14,
              color: "var(--text-tertiary)",
              marginTop: 5,
            }}
          >
            Status systemu, agentów i połączeń
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            loadHealth();
            loadMcp();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            fontFamily: f.system,
            fontSize: 12,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={13} strokeWidth={1.8} /> Odśwież
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* API Connections */}
        <Card>
          <CardHeader
            icon={
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: "rgba(26,86,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Globe size={16} color="#1a56ff" />
              </div>
            }
            label="Połączenia API"
            sub="Stan serwisów zewnętrznych"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                label: "Anthropic API",
                sub: "claude-opus-4-8, claude-sonnet-4-6",
                ok: anthropicOk,
                loading: healthLoading,
              },
              {
                label: "Notion",
                sub: "Pipeline + baza wiedzy",
                ok: notionOk,
                loading: healthLoading,
              },
              { label: "Google", sub: "Tasks, Sheets", ok: googleOk, loading: googleOk === null },
            ].map(({ label, sub, ok, loading }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 10,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <Dot ok={ok} loading={loading} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: f.system,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontFamily: f.system,
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      marginTop: 1,
                    }}
                  >
                    {sub}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: f.mono,
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 5,
                    background: loading
                      ? "rgba(0,0,0,0.05)"
                      : ok
                        ? "rgba(52,199,89,0.1)"
                        : "rgba(255,59,48,0.1)",
                    color: loading ? "var(--text-tertiary)" : ok ? "#34c759" : "#ff3b30",
                  }}
                >
                  {loading ? "..." : ok ? "OK" : "ERR"}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* MCP Server */}
        <Card>
          <CardHeader
            icon={
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: mcpStatus?.ok ? "rgba(52,199,89,0.1)" : "rgba(255,59,48,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Server size={16} color={mcpStatus?.ok ? "#34c759" : "#ff3b30"} />
              </div>
            }
            label="MCP Server"
            sub="autorise-mcp-server @ localhost"
          />
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              background: "var(--bg)",
              border: "1px solid var(--border)",
            }}
          >
            {mcpLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Loader2
                  size={14}
                  color="var(--text-tertiary)"
                  style={{ animation: "spin 1s linear infinite" }}
                />
                <span style={{ fontFamily: f.system, fontSize: 13, color: "var(--text-tertiary)" }}>
                  Sprawdzanie...
                </span>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Dot ok={mcpStatus?.ok} />
                  <span
                    style={{
                      fontFamily: f.system,
                      fontSize: 14,
                      fontWeight: 700,
                      color: mcpStatus?.ok ? "#34c759" : "#ff3b30",
                    }}
                  >
                    {mcpStatus?.ok ? "Działa" : "Niedostępny"}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: f.mono,
                    fontSize: 11.5,
                    color: "var(--text-tertiary)",
                    lineHeight: 1.6,
                  }}
                >
                  localhost:{mcpStatus?.port ?? 3010}
                  <br />
                  mcp.autorise.pl (Cloudflare Tunnel)
                </div>
                {!mcpStatus?.ok && (
                  <div
                    style={{
                      marginTop: 10,
                      fontFamily: f.system,
                      fontSize: 11.5,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Uruchom:{" "}
                    <code
                      style={{
                        fontFamily: f.mono,
                        fontSize: 11,
                        background: "rgba(0,0,0,0.06)",
                        padding: "1px 5px",
                        borderRadius: 4,
                      }}
                    >
                      npm run start
                    </code>{" "}
                    w katalogu autorise-mcp-server
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Agents grid */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader
          icon={
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(26,86,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={16} color="#1a56ff" />
            </div>
          }
          label="Agenci AI — Konfiguracja"
          sub="7 agentów w systemie"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 10,
          }}
        >
          {AGENTS.map((ag) => (
            <div
              key={ag.num}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderLeft: `3px solid ${ag.color}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <span
                  style={{
                    fontFamily: f.mono,
                    fontSize: 20,
                    fontWeight: 900,
                    color: ag.color,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {ag.num}
                </span>
                <span
                  style={{
                    fontFamily: f.system,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {ag.name}
                </span>
              </div>
              <div
                style={{
                  fontFamily: f.mono,
                  fontSize: 10.5,
                  color: "var(--text-tertiary)",
                  marginBottom: 7,
                }}
              >
                {ag.model}
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {ag.thinking && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      padding: "2px 6px",
                      borderRadius: 5,
                      background: `${ag.color}12`,
                      border: `1px solid ${ag.color}22`,
                      fontFamily: f.system,
                      fontSize: 9.5,
                      color: ag.color,
                      fontWeight: 600,
                    }}
                  >
                    <Brain size={8} /> thinking
                  </span>
                )}
                {ag.notion && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      padding: "2px 6px",
                      borderRadius: 5,
                      background: "rgba(0,0,0,0.05)",
                      fontFamily: f.system,
                      fontSize: 9.5,
                      color: "var(--text-secondary)",
                      fontWeight: 500,
                    }}
                  >
                    <Database size={8} /> Notion
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Skills + Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Skills */}
        <Card>
          <CardHeader
            icon={
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: "rgba(52,199,89,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BookOpen size={16} color="#34c759" />
              </div>
            }
            label="Zainstalowane Skille"
            sub="~/.claude/skills/"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {SKILLS.map((s) => (
              <div
                key={s.name}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 9,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#34c759",
                    marginTop: 4,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: f.mono,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {s.name}
                  </div>
                  <div
                    style={{
                      fontFamily: f.system,
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      marginTop: 2,
                    }}
                  >
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Środowisko */}
        <Card>
          <CardHeader
            icon={
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: "rgba(175,82,222,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Microscope size={16} color="#af52de" />
              </div>
            }
            label="Środowisko"
            sub="Konfiguracja techniczna"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              { key: "Stack", val: "Next.js 14, TypeScript strict, Tailwind" },
              { key: "Deploy", val: "Cloudflare Pages (GitHub CI)" },
              { key: "Timeout", val: "CF Pages free = 30s (agent2/5 ryzyko)" },
              { key: "Workspace", val: "D:\\autorise\\workspace" },
              { key: "Dashboard", val: "localhost:3000 / app.autorise.pl" },
              { key: "MCP", val: `localhost:3010 / mcp.autorise.pl` },
            ].map(({ key, val }) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "7px 12px",
                  borderRadius: 9,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontFamily: f.system,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    width: 80,
                    flexShrink: 0,
                  }}
                >
                  {key}
                </span>
                <span
                  style={{
                    fontFamily: f.mono,
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {val}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
