"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { OBJECTIONS_KO, STEPS_KO } from "@/lib/scripts/kickoff";
import type { ScriptLine } from "@/lib/scripts/types";

// Panel skryptu Kickoff — przewodnik krok po kroku po warsztacie (30-45 minut), żeby setter
// nie musiał trzymać struktury w głowie. Świadomie prostszy niż DecisionDiagram używany w
// /kwalifikacja i /sprzedaz: Kickoff jest w praktyce liniowy (brak rozgałęzień decyzyjnych na
// skalę skryptów sprzedażowych), więc akordeon kroków + lista obiekcji wystarcza. Dane liczbowe
// zebrane w Kroku 4 zapisują się do już istniejącego Panelu 0 (KickoffModuleTable) poniżej —
// ten panel jest wyłącznie przewodnikiem rozmowy, nie osobnym miejscem zapisu.

// "note" jest celowo cichy (text-tertiary) — dyskretna adnotacja dla settera, nie ostrzeżenie.
const LINE_COLOR: Record<ScriptLine["t"], string> = {
  say: "var(--text-primary)",
  client: "var(--text-secondary)",
  note: "var(--text-tertiary)",
  action: "var(--accent)",
  branch: "var(--success-text)",
  "branch-bad": "var(--error)",
};

const LINE_LABEL: Record<ScriptLine["t"], string> = {
  say: "MÓWISZ",
  client: "KLIENT",
  note: "NOTATKA",
  action: "AKCJA",
  branch: "DALEJ",
  "branch-bad": "DALEJ",
};

function renderText(text: string | string[]): string {
  return Array.isArray(text) ? text.join(" ") : text;
}

interface KickoffScriptPanelProps {
  autoExpandStepId?: string;
}

export function KickoffScriptPanel({ autoExpandStepId }: KickoffScriptPanelProps) {
  const [openStepId, setOpenStepId] = useState<string | null>(autoExpandStepId ?? STEPS_KO[0].id);
  const [showObjections, setShowObjections] = useState(false);

  return (
    <Panel>
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 3,
          }}
        >
          Skrypt Kickoff
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          Przewodnik po warsztacie (30-45 minut). Krok 4 zbiera dane wprost do tabeli w Panelu 0
          poniżej.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {STEPS_KO.map((step) => {
          const isOpen = openStepId === step.id;
          return (
            <div
              key={step.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => setOpenStepId(isOpen ? null : step.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 10px",
                  border: "none",
                  background: isOpen ? "var(--bg-active)" : "var(--bg)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {isOpen ? (
                  <ChevronDown size={13} color="var(--text-tertiary)" />
                ) : (
                  <ChevronRight size={13} color="var(--text-tertiary)" />
                )}
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {step.nr}. {step.label}
                </span>
                {step.duration && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {step.duration}
                  </span>
                )}
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  {step.lines.map((line, i) => (
                    <div
                      key={`${step.id}-${i}`}
                      style={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          color: LINE_COLOR[line.t],
                        }}
                      >
                        {LINE_LABEL[line.t]}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          color: LINE_COLOR[line.t],
                          lineHeight: 1.5,
                          fontStyle: line.t === "note" ? "italic" : "normal",
                        }}
                      >
                        {line.t === "note" ? line.setterNote : renderText(line.text)}
                      </span>
                      {line.t !== "note" && line.cel && (
                        <span
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                            fontStyle: "italic",
                          }}
                        >
                          Cel: {line.cel}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          onClick={() => setShowObjections(!showObjections)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {showObjections ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Obiekcje Kickoffu ({OBJECTIONS_KO.length})
        </button>

        {showObjections && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {OBJECTIONS_KO.map((obj) => (
              <div
                key={obj.id}
                style={{
                  padding: "9px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {obj.label}
                </div>
                {obj.script && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                    }}
                  >
                    {obj.script}
                  </div>
                )}
                {obj.setterNote && (
                  <div
                    style={{
                      marginTop: 4,
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      fontStyle: "italic",
                    }}
                  >
                    {obj.setterNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
