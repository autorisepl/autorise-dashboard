"use client";

import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import type { Decision, DecisionOption } from "@/lib/scripts/types";

interface DecisionDiagramProps {
  decision: Decision;
  onSelect: (option: DecisionOption) => void;
  selectedTrigger?: string;
}

const TONE_ACCENT: Record<"neutral" | "positive" | "warning", string> = {
  neutral: "var(--text-secondary)",
  positive: "var(--success)",
  warning: "var(--warning)",
};

const OPTION_BASE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  width: "100%",
  padding: "16px 18px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--bg-card, #ffffff)",
  cursor: "pointer",
  textAlign: "left",
  transition:
    "transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 160ms ease, background 160ms ease",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const OPTION_HOVER: CSSProperties = {
  transform: "translateY(-1px) scale(1.008)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};

function selectedStyle(accent: string): CSSProperties {
  return {
    borderColor: accent,
    background: "linear-gradient(180deg, rgba(10,132,255,0.06), rgba(10,132,255,0.03))",
    boxShadow: `0 0 0 1px ${accent}, 0 4px 16px rgba(10,132,255,0.12)`,
  };
}

export function DecisionDiagram({ decision, onSelect, selectedTrigger }: DecisionDiagramProps) {
  return (
    <div
      style={{
        background: "rgba(245,245,247,0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 16,
        padding: 14,
        border: "1px solid rgba(0,0,0,0.06)",
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
          marginBottom: 10,
          paddingLeft: 2,
        }}
      >
        {decision.question}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {decision.options.map((opt, i) => {
          const accent = TONE_ACCENT[opt.tone ?? "neutral"];
          const isSelected = opt.trigger === selectedTrigger;
          const restingStyle = isSelected ? selectedStyle(accent) : OPTION_BASE;
          return (
            <button
              key={i}
              onClick={() => onSelect(opt)}
              style={{ ...OPTION_BASE, ...restingStyle }}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, OPTION_HOVER);
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, { ...OPTION_BASE, ...restingStyle });
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    fontWeight: 650,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.3,
                  }}
                >
                  {opt.trigger}
                </span>
                {isSelected && <Check size={16} color={accent} strokeWidth={3} />}
              </div>
              {opt.action && (
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "var(--text-secondary)",
                    fontWeight: 450,
                  }}
                >
                  {opt.action}
                </div>
              )}
              {opt.calculatorFlag && (
                <span
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--accent)",
                    background: "rgba(10,132,255,0.1)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Kalkulator
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
