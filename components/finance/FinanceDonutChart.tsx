"use client";

import type { CategoryTotal } from "@/lib/finance/summary";
import { formatPLN } from "@/lib/finance/summary";

interface FinanceDonutChartProps {
  data: CategoryTotal[];
  centerLabel: string;
  centerValue: string;
}

export function FinanceDonutChart({ data, centerLabel, centerValue }: FinanceDonutChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  if (total === 0 || data.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 180,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--text-tertiary)",
        }}
      >
        Brak danych w tym okresie.
      </div>
    );
  }

  let cursor = 0;
  const stops = data.map((d) => {
    const from = (cursor / total) * 360;
    cursor += d.value;
    const to = (cursor / total) * 360;
    return `${d.color} ${from}deg ${to}deg`;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <div
        style={{
          position: "relative",
          width: 150,
          height: 150,
          borderRadius: "50%",
          background: `conic-gradient(${stops.join(", ")})`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 22,
            borderRadius: "50%",
            background: "var(--bg-elevated)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {centerLabel}
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginTop: 2,
            }}
          >
            {centerValue}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 160 }}>
        {data.map((d) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: d.color,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-primary)",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {d.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-secondary)",
                flexShrink: 0,
              }}
            >
              {formatPLN(d.value)}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-tertiary)",
                flexShrink: 0,
                width: 36,
                textAlign: "right",
              }}
            >
              {Math.round((d.value / total) * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
