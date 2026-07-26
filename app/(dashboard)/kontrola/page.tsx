"use client";

import { AlertTriangle, CheckCircle2, Database, Loader2, Monitor, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { EnvCheckResponse } from "@/app/api/env-check/route";
import type { HealthResponse } from "@/app/api/health/route";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";

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
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<{
    success: boolean;
    message: string;
    added?: string[];
    errors?: string[];
  } | null>(null);

  // Znaleziony 2026-07-18: przycisk migracji schematu Notion był od kilku sesji
  // opisywany w SESSION_LOG jako istniejący w /kontrola ("kliknij Migruj schemat"),
  // ale nigdy faktycznie nie trafił do kodu UI — backend (/api/tools/migrate-schema,
  // migrateNotionSchema + migrateDailyStatsSchema, wszystkie 4 batche Pipeline plus
  // Statystyki Dzienne) był gotowy, po prostu nic go nie wywoływało.
  const runMigration = useCallback(async () => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await fetch("/api/tools/migrate-schema", { method: "POST" });
      const data = await res.json();
      setMigrateResult({
        success: Boolean(data.success),
        message: data.message ?? data.error ?? "Nieznany wynik",
        added: data.added,
        errors: data.errors,
      });
    } catch {
      setMigrateResult({ success: false, message: "Błąd połączenia z serwerem" });
    } finally {
      setMigrating(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, envRes] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/env-check"),
      ]);
      const [healthData, envData] = await Promise.all([
        healthRes.json() as Promise<HealthResponse>,
        envRes.json() as Promise<EnvCheckResponse>,
      ]);
      setHealth(healthData);
      setEnvVars(envData.vars ?? []);
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

        {/* Row 2 — Env vars */}
        <div>
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
        </div>

        {/* USUNIĘTE (2026-07-26): karta "Claude Code — konfiguracja" pokazywała statyczne
            "Modele: Główny/Reasoning/Worker" które nigdy nie odpowiadało realnej architekturze
            (agenci mają modele konfigurowane indywidualnie w prompts.ts, nie trzy stałe warstwy),
            a listy Agenci/Skills czytały lokalny filesystem (~/.claude/agents, ~/.claude/skills)
            który na Vercelu po prostu nie istnieje — stąd zawsze "Agenci (0)"/"Skills (0)" na
            produkcji, mimo że lokalnie działały poprawnie. Karta z wczesnego makietowania,
            nigdy realnie użyteczna w środowisku gdzie faktycznie działa dashboard. */}

        {/* Row 3 — Baza danych Notion: migracja schematu (wszystkie zaległe batche naraz) */}
        <Panel style={{ padding: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Database size={13} color="var(--text-tertiary)" />
                <SectionLabel>Baza danych Notion</SectionLabel>
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  maxWidth: 480,
                }}
              >
                Migracja schematu Pipeline (wszystkie batche naraz: kontakt/pain/Cytaty klienta,
                daty/select/ceny, System transformacji, Data potwierdzenia dostępów/Historia
                zgłoszeń) plus Statystyki Dzienne (Rozmowy sprzedażowe). Bezpieczna do wielokrotnego
                uruchomienia — dodaje wyłącznie brakujące pola, nic nie kasuje.
              </div>
            </div>
            <button
              onClick={() => void runMigration()}
              disabled={migrating}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xs)",
                cursor: migrating ? "default" : "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                opacity: migrating ? 0.6 : 1,
                flexShrink: 0,
              }}
            >
              {migrating ? (
                <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Database size={12} />
              )}
              Migruj schemat
            </button>
          </div>

          {migrateResult && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 10px",
                borderRadius: "var(--radius-xs)",
                background: migrateResult.success ? "rgba(48,209,88,0.06)" : "rgba(255,69,58,0.06)",
                border: `1px solid ${migrateResult.success ? "rgba(48,209,88,0.2)" : "rgba(255,69,58,0.2)"}`,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              {migrateResult.success ? (
                <CheckCircle2
                  size={13}
                  color="var(--success)"
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
              ) : (
                <AlertTriangle
                  size={13}
                  color="var(--error)"
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
              )}
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                {migrateResult.message}
                {migrateResult.errors && migrateResult.errors.length > 0 && (
                  <div style={{ marginTop: 4, color: "var(--error)" }}>
                    {migrateResult.errors.join(" · ")}
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
