"use client";

import { Briefcase, CalendarClock, Repeat, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { SubscriptionGroupStats, SubscriptionsStats } from "@/lib/finance/summary";
import { formatPLN } from "@/lib/finance/summary";

interface SubscriptionsSummaryProps {
  stats: SubscriptionsStats;
}

// Jeden spójny kolor/rozmiar dla wszystkich ikon w tym panelu — dawniej różne (accent na
// jednej grupie, success na drugiej), niespójne z resztą /planowanie.
const ICON_COLOR = "var(--text-secondary)";
const ICON_SIZE = 13;

function Stat({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-hover)",
          color: ICON_COLOR,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-tertiary)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 17,
            fontWeight: 800,
            color: valueColor ?? "var(--text-primary)",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function renewalValue(group: SubscriptionGroupStats): string {
  if (!group.nextRenewal) return "—";
  const { nazwa, daysUntil } = group.nextRenewal;
  const dniLabel = daysUntil <= 0 ? "dziś" : daysUntil === 1 ? "za 1 dzień" : `za ${daysUntil} dni`;
  return `${nazwa} · ${dniLabel}`;
}

function Group({
  title,
  icon,
  group,
}: {
  title: string;
  icon: React.ReactNode;
  group: SubscriptionGroupStats;
}) {
  const totalCount = group.countExpense + group.countIncome;
  if (totalCount === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <Badge>{title}</Badge>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-secondary)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            padding: "1px 7px",
          }}
        >
          {totalCount} aktywnych
        </span>
      </div>
      <Stat
        icon={<TrendingDown size={ICON_SIZE} />}
        label="Miesięcznie wydatki"
        value={formatPLN(group.monthlyExpenseTotal)}
      />
      {group.monthlyIncomeTotal > 0 && (
        <Stat
          icon={<TrendingUp size={ICON_SIZE} />}
          label="Miesięcznie przychody"
          value={formatPLN(group.monthlyIncomeTotal)}
        />
      )}
      {group.nextRenewal && (
        <Stat
          icon={<CalendarClock size={ICON_SIZE} />}
          label="Najbliższe odnowienie"
          value={renewalValue(group)}
        />
      )}
    </div>
  );
}

// Pasek "na wysokim poziomie": subskrypcje osobiste i retainery klientów jako osobny,
// natychmiast widoczny stan — nie trzeba przeglądać listy, żeby wiedzieć ile miesięcznie
// kosztują/przynoszą cykliczne zobowiązania, jakie jest saldo netto i co odnawia się
// najbliżej. Mono tło (bez niebieskiego gradientu) — spójne z resztą /planowanie.
export function SubscriptionsSummary({ stats }: SubscriptionsSummaryProps) {
  const totalCount =
    stats.personal.countExpense +
    stats.personal.countIncome +
    stats.retainer.countExpense +
    stats.retainer.countIncome;
  if (totalCount === 0) return null;

  const totalIncome = stats.personal.monthlyIncomeTotal + stats.retainer.monthlyIncomeTotal;
  const totalExpense = stats.personal.monthlyExpenseTotal + stats.retainer.monthlyExpenseTotal;
  const net = totalIncome - totalExpense;
  const netLabel = `${net >= 0 ? "+" : "−"}${formatPLN(Math.abs(net))}`;

  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        padding: "14px 16px",
        marginBottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingBottom: 10,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Stat
          icon={<Scale size={ICON_SIZE} />}
          label="Saldo miesięczne (subskrypcje + retainery)"
          value={netLabel}
          valueColor={net >= 0 ? "var(--success-text)" : "var(--error-text)"}
        />
      </div>
      <Group
        title="Subskrypcje"
        icon={<Repeat size={ICON_SIZE} color={ICON_COLOR} />}
        group={stats.personal}
      />
      <Group
        title="Retainery klientów"
        icon={<Briefcase size={ICON_SIZE} color={ICON_COLOR} />}
        group={stats.retainer}
      />
    </div>
  );
}
