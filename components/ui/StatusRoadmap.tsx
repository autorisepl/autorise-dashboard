"use client";

import type { CSSProperties } from "react";

export type RoadmapStep = {
  label: string;
  sublabel?: string;
};

type StepStatus = "pending" | "active" | "done";

interface StatusRoadmapProps {
  steps: RoadmapStep[];
  currentStep: number;
  style?: CSSProperties;
}

function stepStatus(index: number, currentStep: number): StepStatus {
  if (index < currentStep) return "done";
  if (index === currentStep) return "active";
  return "pending";
}

const DOT_COLORS: Record<StepStatus, string> = {
  pending: "var(--border)",
  active: "var(--accent)",
  done: "var(--success)",
};

const TEXT_COLORS: Record<StepStatus, string> = {
  pending: "var(--text-tertiary)",
  active: "var(--text-primary)",
  done: "var(--text-secondary)",
};

export function StatusRoadmap({ steps, currentStep, style }: StatusRoadmapProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, ...style }}>
      {steps.map((step, i) => {
        const status = stepStatus(i, currentStep);
        const isLast = i === steps.length - 1;

        return (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            {/* Left: dot + line */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 16,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: DOT_COLORS[status],
                  flexShrink: 0,
                  marginTop: 3,
                  transition: "background 300ms",
                  boxShadow: status === "active" ? `0 0 0 3px var(--accent-muted)` : undefined,
                  animation: status === "active" ? "diodePulse 2s ease-in-out infinite" : undefined,
                }}
              />
              {!isLast && (
                <div
                  style={{
                    width: 1,
                    flex: 1,
                    minHeight: 16,
                    background: status === "done" ? "var(--success)" : "var(--border)",
                    opacity: status === "done" ? 0.4 : 0.3,
                    marginTop: 3,
                    transition: "background 300ms",
                  }}
                />
              )}
            </div>

            {/* Right: labels */}
            <div style={{ paddingBottom: isLast ? 0 : 12, paddingTop: 1 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: status === "active" ? 500 : 400,
                  color: TEXT_COLORS[status],
                  transition: "color 300ms",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {step.label}
              </div>
              {step.sublabel && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 1,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {step.sublabel}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
