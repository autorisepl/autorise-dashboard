"use client";

import type { CategoryTotal } from "@/lib/finance/summary";
import { formatPLN } from "@/lib/finance/summary";

export function FinanceIncomeSummary({ data }: { data: CategoryTotal[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: "16px 0",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--text-tertiary)",
        }}
      >
        Brak przychodów w tym okresie.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d) => (
        <div key={d.name}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
              fontFamily: "var(--font-sans)",
              fontSize: 12,
            }}
          >
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{d.name}</span>
            <span style={{ color: "var(--text-secondary)", fontWeight: 700 }}>
              {formatPLN(d.value)}
            </span>
          </div>
          <div
            style={{
              height: 7,
              borderRadius: 4,
              background: "var(--bg-hover)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(d.value / max) * 100}%`,
                background: d.color,
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
