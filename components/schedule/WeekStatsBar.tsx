"use client";

import { Repeat, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import type { RecurringTaskStat, WeekCompletionStats } from "@/lib/schedule/dateHelpers";

interface WeekStatsBarProps {
  stats: WeekCompletionStats;
  recurring: RecurringTaskStat[];
}

// Pasek statystyk nad siatką tygodnia: wyłącznie dwie metryki (wykonane/zaplanowane +
// regularność zadań powtarzalnych), świadomie nierozbudowywane bez potwierdzenia — patrz
// komentarz w treści zadania "nie wymyślaj statystyk bez sensu".
export function WeekStatsBar({ stats, recurring }: WeekStatsBarProps) {
  return (
    <Panel
      solid
      style={{
        padding: "10px 14px",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 18,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 220 }}>
        <TrendingUp size={13} color="var(--text-secondary)" />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
          }}
        >
          Wykonane w tym tygodniu: {stats.done}/{stats.total}
        </span>
        <div
          style={{
            width: 60,
            height: 6,
            borderRadius: 4,
            background: "var(--bg-hover)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${stats.percent}%`,
              background: "var(--success)",
              borderRadius: 4,
              transition: "width 300ms ease",
            }}
          />
        </div>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-secondary)",
          }}
        >
          {stats.percent}%
        </span>
      </div>

      {recurring.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Repeat size={12} color="var(--text-tertiary)" />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-tertiary)",
              }}
            >
              Regularność:
            </span>
          </div>
          {recurring.map((r) => (
            <span
              key={r.title}
              title={`${r.title}: zaplanowane w ${r.daysCount} z 7 dni tego tygodnia`}
            >
              <Badge>
                {r.title}: {r.daysCount}/7 dni
              </Badge>
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}
