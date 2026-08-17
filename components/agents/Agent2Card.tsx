"use client";

import { AlertTriangle, Bell, CheckCircle2, FileText, HelpCircle, Target, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LiveScript } from "@/components/LiveScript";
import { MODULE_CATALOG } from "@/lib/scripts/moduleCatalog";

const MODULE_ICONS: Record<string, LucideIcon> = {
  "email-parser": Workflow,
  "document-ocr": FileText,
  "whatsapp-alerts": Bell,
};

// Agent 02 czasem zwraca surowy kod modułu ("document-ocr") zamiast nazwy z prezentacji, a
// czasem wciąż generuje "payment-monitor" mimo że moduł usunięto z katalogu 2026-08-08 (patrz
// moduleCatalog.ts) — obie sytuacje trzeba pokazać setterowi wprost, nie ciche pominięcie.
function resolveModule(raw: string): { label: string; icon: LucideIcon; removed: boolean } {
  const trimmed = raw.trim();
  const byCode = MODULE_CATALOG.find((m) => m.code === trimmed);
  if (byCode) return { label: byCode.label, icon: MODULE_ICONS[byCode.code] ?? Target, removed: false };
  const byLabel = MODULE_CATALOG.find((m) => m.label.toLowerCase() === trimmed.toLowerCase());
  if (byLabel)
    return { label: byLabel.label, icon: MODULE_ICONS[byLabel.code] ?? Target, removed: false };
  if (/payment-monitor|pilnowanie.*p(ł|l)atno|\bksef\b/i.test(trimmed)) {
    return { label: trimmed, icon: AlertTriangle, removed: true };
  }
  return { label: trimmed, icon: Target, removed: false };
}

export interface Agent2Output {
  pre_discovery_brief?: {
    profil_klienta?: string;
    hipoteza_bol_glowny?: string;
    hipotezy_bole_dodatkowe?: string[];
    pytania_priorytetowe?: Array<{ pytanie: string; uzasadnienie: string }>;
    priorytetyzacja_modulow_hipoteza?: Array<{ modul: string; uzasadnienie_cytat: string }>;
    tms_potwierdzenie?: string;
    przewidywane_obiekcje?: Array<{
      objekcja?: string;
      obiekcja_wariant?: string;
      odpowiedz: string;
    }>;
    ryzyka_rozmowy?: string;
    uwagi_agenta?: string;
  };
  plan_discovery?: string;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase" as const,
        color: "#1a56ff",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{ width: 18, height: 2, background: "#1a56ff", borderRadius: 1, flexShrink: 0 }}
      />
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--separator)", margin: "20px 0" }} />;
}

export function Agent2Card({ output }: { output: Agent2Output }) {
  const brief = output.pre_discovery_brief ?? {};

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        height: "100%",
        overflow: "auto",
        fontFamily: "var(--font-system)",
        color: "var(--text-primary)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 18px",
          background: "linear-gradient(135deg, rgba(26,86,255,0.06) 0%, transparent 60%)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#1a56ff",
              marginBottom: 5,
            }}
          >
            Pre-Discovery Brief
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.025em",
            }}
          >
            Gotowy do spotkania
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 12px",
            background: "rgba(52,199,89,0.07)",
            border: "1px solid rgba(52,199,89,0.2)",
            borderRadius: 99,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            color: "#34c759",
          }}
        >
          <CheckCircle2 size={11} />
          Analiza gotowa
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Profil klienta */}
        {brief.profil_klienta && (
          <>
            <SectionLabel>Profil klienta</SectionLabel>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--text-secondary)",
                margin: "0 0 0 24px",
              }}
            >
              {brief.profil_klienta}
            </p>
            <Divider />
          </>
        )}

        {/* Hipoteza bólu */}
        {brief.hipoteza_bol_glowny && (
          <>
            <SectionLabel>Hipoteza bólu głównego</SectionLabel>
            <div
              style={{
                margin: "0 0 0 24px",
                padding: "16px 20px",
                background: "rgba(26,86,255,0.10)",
                border: "1px solid rgba(26,86,255,0.2)",
                borderLeft: "3px solid #1a56ff",
                borderRadius: "0 10px 10px 0",
                fontSize: 15,
                fontWeight: 500,
                color: "var(--text-primary)",
                lineHeight: 1.65,
              }}
            >
              {brief.hipoteza_bol_glowny}
            </div>

            {brief.hipotezy_bole_dodatkowe && brief.hipotezy_bole_dodatkowe.length > 0 && (
              <div style={{ margin: "10px 0 0 24px", display: "flex", flexWrap: "wrap", gap: 7 }}>
                {brief.hipotezy_bole_dodatkowe.filter(Boolean).map((h, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "4px 12px",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 99,
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}
            <Divider />
          </>
        )}

        {/* TMS */}
        {brief.tms_potwierdzenie && (
          <>
            <SectionLabel>TMS i integracja</SectionLabel>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: "var(--text-secondary)",
                margin: "0 0 0 24px",
              }}
            >
              {brief.tms_potwierdzenie}
            </p>
            <Divider />
          </>
        )}

        {/* Pytania priorytetowe */}
        {brief.pytania_priorytetowe && brief.pytania_priorytetowe.length > 0 && (
          <>
            <SectionLabel>Pytania kluczowe do zadania</SectionLabel>
            <div
              style={{ margin: "0 0 0 24px", display: "flex", flexDirection: "column", gap: 12 }}
            >
              {brief.pytania_priorytetowe.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#1a56ff",
                      flexShrink: 0,
                      width: 22,
                      marginTop: 1,
                    }}
                  >
                    {i + 1}.
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        lineHeight: 1.5,
                        marginBottom: 3,
                      }}
                    >
                      {item.pytanie}
                    </div>
                    {item.uzasadnienie && (
                      <div
                        style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.55 }}
                      >
                        {item.uzasadnienie}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Divider />
          </>
        )}

        {/* Moduły */}
        {brief.priorytetyzacja_modulow_hipoteza &&
          brief.priorytetyzacja_modulow_hipoteza.length > 0 && (
            <>
              <SectionLabel>Rekomendowane moduły</SectionLabel>
              <div
                style={{ margin: "0 0 0 24px", display: "flex", flexDirection: "column", gap: 10 }}
              >
                {brief.priorytetyzacja_modulow_hipoteza.map((item, i) => {
                  const mod = resolveModule(item.modul);
                  const Icon = mod.icon;
                  return (
                    <div
                      key={i}
                      style={{
                        padding: "14px 16px",
                        background: mod.removed ? "rgba(255,149,0,0.06)" : "var(--bg-card)",
                        border: mod.removed
                          ? "1px solid rgba(255,149,0,0.3)"
                          : "1px solid var(--border)",
                        borderRadius: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: item.uzasadnienie_cytat || mod.removed ? 8 : 0,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: mod.removed ? "rgba(255,149,0,0.12)" : "rgba(26,86,255,0.10)",
                          }}
                        >
                          <Icon size={16} color={mod.removed ? "#ff9500" : "#1a56ff"} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                          {mod.label}
                        </span>
                        {i === 0 && !mod.removed && (
                          <span
                            style={{
                              padding: "1px 8px",
                              background: "rgba(26,86,255,0.10)",
                              border: "1px solid rgba(26,86,255,0.2)",
                              borderRadius: 99,
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#1a56ff",
                            }}
                          >
                            główny
                          </span>
                        )}
                      </div>
                      {mod.removed && (
                        <p
                          style={{
                            fontSize: 12,
                            color: "#ff9500",
                            margin: "0 0 8px 40px",
                            lineHeight: 1.55,
                          }}
                        >
                          Ten moduł nie istnieje w obecnym katalogu produktu — zgłoś to jako błąd
                          Agenta 02, nie pokazuj klientowi.
                        </p>
                      )}
                      {item.uzasadnienie_cytat && (
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            margin: "0 0 0 40px",
                            lineHeight: 1.55,
                            fontStyle: "italic",
                          }}
                        >
                          &ldquo;{item.uzasadnienie_cytat}&rdquo;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <Divider />
            </>
          )}

        {/* Przewidywane objekcje */}
        {brief.przewidywane_obiekcje && brief.przewidywane_obiekcje.length > 0 && (
          <>
            <SectionLabel>Przewidywane objekcje i odpowiedzi</SectionLabel>
            <div
              style={{ margin: "0 0 0 24px", display: "flex", flexDirection: "column", gap: 10 }}
            >
              {brief.przewidywane_obiekcje.map((item, i) => {
                const objekcja = item.objekcja ?? item.obiekcja_wariant ?? "";
                return (
                  <div
                    key={i}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        borderBottom: "1px solid var(--border)",
                        background: "var(--bg-elevated)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <HelpCircle
                          size={12}
                          color="var(--text-tertiary)"
                          style={{ marginTop: 2, flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--text-secondary)",
                            fontStyle: "italic",
                          }}
                        >
                          &ldquo;{objekcja}&rdquo;
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "10px 14px 10px 34px",
                        fontSize: 13,
                        color: "var(--text-primary)",
                        lineHeight: 1.6,
                      }}
                    >
                      {item.odpowiedz}
                    </div>
                  </div>
                );
              })}
            </div>
            <Divider />
          </>
        )}

        {/* Ryzyka */}
        {brief.ryzyka_rozmowy && (
          <>
            <div
              style={{
                margin: "0 0 0 0",
                padding: "14px 18px",
                background: "rgba(255,149,0,0.06)",
                border: "1px solid rgba(255,149,0,0.18)",
                borderRadius: 10,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <AlertTriangle size={14} color="#ff9500" style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#ff9500",
                    marginBottom: 5,
                  }}
                >
                  Ryzyka rozmowy
                </div>
                <p style={{ fontSize: 13, color: "#ff9500", margin: 0, lineHeight: 1.65 }}>
                  {brief.ryzyka_rozmowy}
                </p>
              </div>
            </div>
            <Divider />
          </>
        )}

        {/* Uwagi agenta */}
        {brief.uwagi_agenta && (
          <>
            <SectionLabel>Obserwacje agenta</SectionLabel>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.7,
                color: "var(--text-secondary)",
                margin: "0 0 0 24px",
              }}
            >
              {brief.uwagi_agenta}
            </p>
            <Divider />
          </>
        )}

        {/* Plan Analizy diagnostycznej — Live Script */}
        {output.plan_discovery && (
          <>
            <div style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 18, height: 2, background: "#1a56ff", borderRadius: 1 }} />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#1a56ff",
                }}
              >
                Analiza diagnostyczna z ofertowaniem — Plan
              </span>
            </div>
            <LiveScript plan={output.plan_discovery} />
          </>
        )}
      </div>
    </div>
  );
}
