"use client";

import { ChevronRight, Monitor, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ClaudeAgent, ClaudeConfigResponse, ClaudeSkill } from "@/app/api/claude-config/route";
import type { EnvCheckResponse } from "@/app/api/env-check/route";
import type { HealthResponse } from "@/app/api/health/route";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";

// ── Detail panel ─────────────────────────────────────────────────────

function DetailPanel({
  item,
  type,
  onClose,
}: {
  item: ClaudeAgent | ClaudeSkill;
  type: "agent" | "skill";
  onClose: () => void;
}) {
  const isAgent = type === "agent";
  const agent = isAgent ? (item as ClaudeAgent) : null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 360,
        background: "var(--bg-sidebar)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderLeft: "1px solid var(--border)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            {item.name}
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: isAgent ? "var(--accent)" : "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            {isAgent ? "Agent" : "Skill"}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            padding: 4,
          }}
        >
          <X size={15} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {item.description && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                marginBottom: 6,
              }}
            >
              Opis
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-primary)",
                lineHeight: 1.6,
                fontFamily: "var(--font-sans)",
              }}
            >
              {item.description}
            </div>
          </div>
        )}

        {agent?.whenToUse && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                marginBottom: 6,
              }}
            >
              Kiedy używać
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                fontFamily: "var(--font-sans)",
              }}
            >
              {agent.whenToUse}
            </div>
          </div>
        )}

        {agent?.model && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                marginBottom: 6,
              }}
            >
              Model
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--accent)",
                background: "var(--accent-muted)",
                padding: "4px 10px",
                borderRadius: "var(--radius-xs)",
                display: "inline-block",
                fontFamily: "var(--font-sans)",
              }}
            >
              {agent.model}
            </div>
          </div>
        )}

        {item.body && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                marginBottom: 6,
              }}
            >
              Dokumentacja
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                fontFamily: "var(--font-sans)",
                whiteSpace: "pre-wrap",
                background: "var(--bg-elevated)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 12px",
                border: "1px solid var(--border)",
              }}
            >
              {item.body}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Status dot helper ────────────────────────────────────────────────

function StatusDot({ ok, idle }: { ok: boolean; idle?: boolean }) {
  const color = idle ? "var(--text-placeholder)" : ok ? "var(--success)" : "var(--error)";
  return (
    <div
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        flexShrink: 0,
        background: color,
        boxShadow: !idle && ok ? "0 0 5px rgba(48,209,88,0.5)" : "none",
      }}
    />
  );
}

// ── Page ─────────────────────────────────────────────────────────────

const SUBPROJECTS = [
  {
    name: "autorise-mcp",
    url: "mcp.autorise.pl",
    stack: "Node.js · PM2 · v2.0.0",
    note: "Cloudflare Tunnel → localhost:3010",
    desc: "MCP server dla Claude Projects. Narzędzia: read_file, list_dir, search_files.",
    healthKey: "mcp" as const,
  },
  {
    name: "autorise-dashboard",
    url: "app.autorise.pl",
    stack: "Next.js 16.2.7 · App Router",
    note: "D:\\autorise\\workspace\\autorise-dashboard",
    desc: "Dashboard AI dla Autorise. Integruje agentów, Notion, Google i transkrypcje.",
    healthKey: null,
  },
];

const API_ITEMS = [
  { key: "anthropic", label: "Anthropic API", sublabel: "claude-sonnet-4-6" },
  { key: "notion", label: "Notion", sublabel: "Pipeline · CRM" },
  { key: "google", label: "Google OAuth", sublabel: "Tasks · Calendar · Drive · Sheets" },
  { key: "groq", label: "Groq", sublabel: "Whisper large-v3" },
  { key: "mcp", label: "MCP Server", sublabel: "mcp.autorise.pl" },
] as const;

export default function KontrolaPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [envVars, setEnvVars] = useState<EnvCheckResponse["vars"]>([]);
  const [claudeConfig, setClaudeConfig] = useState<ClaudeConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<{
    item: ClaudeAgent | ClaudeSkill;
    type: "agent" | "skill";
  } | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, envRes, claudeRes] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/env-check"),
        fetch("/api/claude-config"),
      ]);
      const [healthData, envData, claudeData] = await Promise.all([
        healthRes.json() as Promise<HealthResponse>,
        envRes.json() as Promise<EnvCheckResponse>,
        claudeRes.json() as Promise<ClaudeConfigResponse>,
      ]);
      setHealth(healthData);
      setEnvVars(envData.vars ?? []);
      setClaudeConfig(claudeData);
      setLastUpdated(
        new Date().toLocaleTimeString("pl-PL", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    const id = setInterval(() => void fetchAll(), 20_000);
    const onFocus = () => void fetchAll();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchAll]);

  return (
    <div
      style={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Top bar */}
      <PageHeader
        icon={<Monitor size={15} color="var(--accent)" />}
        title="Kontrola obszaru roboczego"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
          {lastUpdated && (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-tertiary)",
              }}
            >
              {lastUpdated}
            </span>
          )}
          <button
            onClick={() => void fetchAll()}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              cursor: loading ? "default" : "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-secondary)",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw
              size={11}
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
            />
            Odśwież
          </button>
        </div>
      </PageHeader>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Row 1 — 3 equal columns: MCP | Dashboard | Integracje */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {/* Project cards */}
          {SUBPROJECTS.map((p) => {
            const statusFromHealth = p.healthKey ? health?.[p.healthKey] : null;
            const isOnline = p.healthKey ? (statusFromHealth?.ok ?? false) : true;
            const idle = p.healthKey ? !health : false;
            const statusLabel = p.healthKey
              ? !health
                ? "Sprawdzam..."
                : isOnline
                  ? (statusFromHealth?.label ?? "Online")
                  : (statusFromHealth?.label ?? "Offline")
              : "Running";
            return (
              <Panel key={p.name} style={{ padding: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-xs)",
                      background: idle
                        ? "rgba(0,0,0,0.04)"
                        : isOnline
                          ? "rgba(48,209,88,0.1)"
                          : "rgba(255,69,58,0.1)",
                      border: `1px solid ${idle ? "var(--border)" : isOnline ? "rgba(48,209,88,0.3)" : "rgba(255,69,58,0.3)"}`,
                      flexShrink: 0,
                    }}
                  >
                    <StatusDot ok={isOnline} idle={idle} />
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 10,
                        fontWeight: 600,
                        color: idle
                          ? "var(--text-tertiary)"
                          : isOnline
                            ? "var(--success)"
                            : "var(--error)",
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    color: "var(--accent)",
                    marginTop: 3,
                  }}
                >
                  {p.url}
                </div>

                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    marginTop: 8,
                  }}
                >
                  {p.desc}
                </div>

                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  {p.stack}
                </div>
              </Panel>
            );
          })}

          {/* Integracje card — API status compact */}
          <Panel style={{ padding: 14 }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
                marginBottom: 10,
              }}
            >
              Integracje
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {API_ITEMS.map(({ key, label, sublabel }) => {
                const status = health?.[key];
                const ok = status?.ok ?? false;
                const idle = !health;
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 8px",
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--radius-xs)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <StatusDot ok={ok} idle={idle} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          lineHeight: 1,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {idle ? "Sprawdzam..." : (status?.label ?? sublabel)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Row 2 — Env vars (40%) | Claude Code (60%) */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 12 }}>
          {/* Env vars */}
          <Panel style={{ padding: 14 }}>
            <SectionLabel>Zmienne środowiskowe</SectionLabel>
            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px 8px",
              }}
            >
              {envVars.length === 0 ? (
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    gridColumn: "1 / -1",
                  }}
                >
                  {loading ? "Ładowanie..." : "Brak danych"}
                </div>
              ) : (
                envVars.map(({ name, present }) => (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "3px 6px",
                      background: present ? "rgba(48,209,88,0.05)" : "rgba(255,69,58,0.05)",
                      borderRadius: "var(--radius-xs)",
                      border: `1px solid ${present ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)"}`,
                    }}
                  >
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: present ? "var(--success)" : "var(--error)",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 9,
                        fontWeight: 600,
                        color: present ? "var(--text-secondary)" : "var(--text-tertiary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {name.replace(
                        /^(GOOGLE_|NOTION_|ANTHROPIC_|GROQ_|DASHBOARD_|WORKSPACE_)/,
                        (m) => {
                          const map: Record<string, string> = {
                            GOOGLE_: "G_",
                            NOTION_: "N_",
                            ANTHROPIC_: "A_",
                            GROQ_: "GQ_",
                            DASHBOARD_: "D_",
                            WORKSPACE_: "WS_",
                          };
                          return map[m] ?? m;
                        },
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>

          {/* Claude Code config */}
          <Panel style={{ padding: 14 }}>
            <SectionLabel>Claude Code — konfiguracja</SectionLabel>
            <div
              style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
            >
              {/* Agents */}
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--text-tertiary)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Agenci ({claudeConfig?.agents?.length ?? "…"})
                </div>
                {!claudeConfig?.agents?.length ? (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {loading ? "Ładowanie..." : "Brak agentów"}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {claudeConfig.agents.map((agent) => (
                      <button
                        key={agent.name}
                        onClick={() => setSelectedItem({ item: agent, type: "agent" })}
                        style={
                          {
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 6,
                            width: "100%",
                            padding: "4px 0",
                            background: "none",
                            border: "none",
                            borderBottom: "1px solid var(--border)",
                            cursor: "pointer",
                            textAlign: "left",
                          } as React.CSSProperties
                        }
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              background: "var(--accent)",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 11,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {agent.name}
                          </span>
                        </div>
                        <ChevronRight size={10} color="var(--text-tertiary)" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Skills + Model */}
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--text-tertiary)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Skills ({claudeConfig?.skills?.length ?? "…"})
                </div>
                {!claudeConfig?.skills?.length ? (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {loading ? "Ładowanie..." : "Brak skills"}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {claudeConfig.skills.map((skill) => (
                      <button
                        key={skill.name}
                        onClick={() => setSelectedItem({ item: skill, type: "skill" })}
                        style={
                          {
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 6,
                            width: "100%",
                            padding: "4px 0",
                            background: "none",
                            border: "none",
                            borderBottom: "1px solid var(--border)",
                            cursor: "pointer",
                            textAlign: "left",
                          } as React.CSSProperties
                        }
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              background: "var(--text-tertiary)",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 11,
                              color: "var(--text-tertiary)",
                            }}
                          >
                            {skill.name}
                          </span>
                        </div>
                        <ChevronRight size={10} color="var(--text-tertiary)" />
                      </button>
                    ))}
                  </div>
                )}

                <div
                  style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--border)" }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--text-tertiary)",
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Modele
                  </div>
                  {[
                    ["Główny", "Claude Sonnet 4.6"],
                    ["Reasoning", "Claude Opus 4.8"],
                    ["Worker", "Claude Haiku 4.5"],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "3px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {k}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 10,
                          color: "var(--text-secondary)",
                          fontWeight: 500,
                        }}
                      >
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Detail panel */}
      {selectedItem && (
        <DetailPanel
          item={selectedItem.item}
          type={selectedItem.type}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
