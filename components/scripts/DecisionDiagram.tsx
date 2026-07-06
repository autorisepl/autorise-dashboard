"use client";

import { Check, ChevronRight } from "lucide-react";
import type { Decision, DecisionOption } from "@/lib/scripts/types";

interface DecisionDiagramProps {
  decision: Decision;
  onSelect: (option: DecisionOption) => void;
  selectedTrigger?: string;
}

const TONE_STYLES: Record<
  "neutral" | "positive" | "warning",
  { border: string; bg: string; accent: string }
> = {
  neutral: { border: "var(--border)", bg: "var(--bg-card)", accent: "var(--text-secondary)" },
  positive: { border: "var(--success)", bg: "rgba(52,199,89,0.06)", accent: "var(--success)" },
  warning: { border: "var(--warning)", bg: "rgba(255,149,0,0.06)", accent: "var(--warning)" },
};

export function DecisionDiagram({ decision, onSelect, selectedTrigger }: DecisionDiagramProps) {
  return (
    <div
      style={{
        border: "1px dashed var(--border)",
        borderRadius: 10,
        padding: 12,
        background: "var(--bg)",
        marginTop: 8,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: 8,
        }}
      >
        {decision.question}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {decision.options.map((opt, i) => {
          const tone = TONE_STYLES[opt.tone ?? "neutral"];
          const isSelected = opt.trigger === selectedTrigger;
          return (
            <button
              key={i}
              onClick={() => onSelect(opt)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 8,
                border: isSelected ? `2px solid ${tone.accent}` : `1px solid ${tone.border}`,
                background: tone.bg,
                textAlign: "left",
                cursor: "pointer",
                transition: "transform 120ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateX(2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {opt.trigger}
                  {opt.calculatorFlag && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "var(--accent)",
                        background: "rgba(10,132,255,0.08)",
                        padding: "1px 6px",
                        borderRadius: 4,
                        marginLeft: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Kalkulator
                    </span>
                  )}
                </div>
                {opt.action && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: tone.accent,
                      marginTop: 2,
                    }}
                  >
                    {opt.action}
                  </div>
                )}
              </div>
              {isSelected ? (
                <Check size={16} color={tone.accent} style={{ flexShrink: 0 }} strokeWidth={2.5} />
              ) : (
                <ChevronRight size={16} color={tone.accent} style={{ flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
