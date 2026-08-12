"use client";

import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import type { Decision, DecisionOption } from "@/lib/scripts/types";

interface DecisionDiagramProps {
  decision: Decision;
  onSelect: (option: DecisionOption) => void;
  selectedTrigger?: string;
}

type Tone = "neutral" | "positive" | "warning";

// Para tekst/obramowanie/tło per ton, zweryfikowane programowo WCAG AA (>=4.5:1) na
// --bg-card — ten sam wzorzec bg/text co --success-text/--warning-text w globals.css.
// Neutral używa akcentu aplikacji (nie szarości), żeby zaznaczona opcja realnie się wyróżniała.
const TONE: Record<Tone, { text: string; border: string; bg: string }> = {
  neutral: { text: "var(--accent-text)", border: "var(--accent)", bg: "var(--accent-muted)" },
  positive: { text: "var(--success-text)", border: "var(--success)", bg: "var(--success-bg)" },
  warning: { text: "var(--warning-text)", border: "var(--warning)", bg: "var(--warning-bg)" },
};

function buildOptionStyle(isSelected: boolean, isHovered: boolean, tone: Tone): CSSProperties {
  const t = TONE[tone];
  return {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    width: "100%",
    padding: "16px 18px",
    borderRadius: 14,
    border: `1px solid ${isSelected ? t.border : isHovered ? "var(--border-hover)" : "var(--border)"}`,
    background: isSelected ? t.bg : isHovered ? "var(--bg-hover)" : "var(--bg-card)",
    cursor: "pointer",
    textAlign: "left",
    transition:
      "transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 160ms ease, background 160ms ease, border-color 160ms ease",
    boxShadow: isSelected
      ? `0 0 0 1px ${t.border}, var(--shadow-card)`
      : isHovered
        ? "var(--shadow-card)"
        : "var(--shadow-sm)",
    transform: isHovered && !isSelected ? "translateY(-1px) scale(1.008)" : "none",
  };
}

export function DecisionDiagram({ decision, onSelect, selectedTrigger }: DecisionDiagramProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Po wyborze opcji z tekstem do powiedzenia (`sayAfter`), tekst ma być od razu
  // widoczny na samej górze widocznego obszaru, nie wymagać przewijania w trakcie
  // żywej rozmowy — realny problem operacyjny zgłoszony przez Michała, nie kosmetyczny.
  useEffect(() => {
    if (!selectedTrigger) return;
    const el = document.getElementById(`sayafter-${selectedTrigger}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedTrigger]);

  return (
    <div
      style={{
        background: "var(--glass)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        borderRadius: 16,
        padding: 14,
        border: "1px solid var(--glass-border)",
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
          const tone: Tone = opt.tone ?? "neutral";
          const accent = TONE[tone].text;
          const isSelected = opt.trigger === selectedTrigger;
          const isHovered = hoveredIndex === i;
          return (
            <button
              key={opt.trigger}
              type="button"
              onClick={() => onSelect(opt)}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={buildOptionStyle(isSelected, isHovered, tone)}
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
                    color: "var(--accent-text)",
                    background: "var(--accent-muted)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Kalkulator
                </span>
              )}
              {isSelected && opt.sayAfter && (
                <div
                  id={`sayafter-${opt.trigger}`}
                  style={{
                    marginTop: 4,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--bg)",
                    border: `1px solid ${TONE[tone].border}`,
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: "var(--text-primary)",
                  }}
                >
                  <span style={{ fontWeight: 700, color: accent }}>Powiedz: </span>
                  {opt.sayAfter}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
