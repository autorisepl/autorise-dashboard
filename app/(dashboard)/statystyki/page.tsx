"use client";

import {
  AlertCircle,
  Ban,
  Loader2,
  MessageSquare,
  Phone,
  PhoneCall,
  PhoneOff,
  Target,
  ThumbsUp,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { StatsResponse } from "@/app/api/stats/route";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";

// ── Date range presets ──────────────────────────────────────────────

type RangePreset = 7 | 30 | 90 | "custom";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── KPI card ─────────────────────────────────────────────────────────

type Tone = "neutral" | "accent" | "success" | "amber" | "purple";

const TONES: Record<Tone, { bg: string; color: string; border: string }> = {
  neutral: { bg: "var(--bg-hover)", color: "var(--text-secondary)", border: "var(--border)" },
  accent: { bg: "var(--accent-muted)", color: "var(--accent)", border: "var(--accent-border)" },
  success: {
    bg: "var(--success-bg)",
    color: "var(--success-text)",
    border: "var(--success-border)",
  },
  amber: { bg: "var(--warning-bg)", color: "var(--warning)", border: "var(--warning-border)" },
  purple: { bg: "rgba(124,58,237,0.10)", color: "#7c3aed", border: "rgba(124,58,237,0.22)" },
};

function KpiCard({
  label,
  value,
  tone,
  icon: Icon,
  emphasize,
  tooltip,
}: {
  label: string;
  value: string;
  tone: Tone;
  icon: React.ElementType;
  emphasize?: boolean;
  tooltip?: string;
}) {
  const t = TONES[tone];
  return (
    <div
      title={tooltip}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: emphasize ? "16px 16px" : "12px 14px",
        background: "var(--bg-elevated)",
        border: `1px solid ${emphasize ? t.border : "var(--border)"}`,
        borderRadius: "var(--radius-sm)",
        boxShadow: emphasize ? "var(--glass-shadow)" : "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          width: emphasize ? 38 : 30,
          height: emphasize ? 38 : 30,
          borderRadius: 9,
          flexShrink: 0,
          background: t.bg,
          border: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={emphasize ? 18 : 14} color={t.color} strokeWidth={1.9} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: emphasize ? 28 : 18,
            fontWeight: 800,
            color: emphasize ? t.color : "var(--text-primary)",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: emphasize ? 11 : 10,
            color: "var(--text-tertiary)",
            marginTop: 3,
            display: "flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
          }}
        >
          {label}
          {tooltip && (
            <AlertCircle size={10} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── KPI section (grupa z nagłówkiem) ─────────────────────────────────

function KpiSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel paddingX={0}>{label}</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          marginTop: 4,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function StatystykiPage() {
  const [preset, setPreset] = useState<RangePreset>(30);
  const [customFrom, setCustomFrom] = useState(isoDaysAgo(30));
  const [customTo, setCustomTo] = useState(todayISO());
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return { from: isoDaysAgo(preset), to: todayISO() };
  }, [preset, customFrom, customTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stats?from=${range.from}&to=${range.to}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error ?? "Błąd pobierania statystyk");
      }
    } catch {
      setError("Błąd połączenia");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasAnyData =
    stats != null &&
    (stats.dials > 0 ||
      stats.rozmowy_kwalifikacja > 0 ||
      stats.rozmowy_sprzedaz > 0 ||
      stats.sms > 0 ||
      stats.nowe_leady > 0 ||
      stats.discovery_umowione > 0 ||
      stats.sprzedaze > 0 ||
      stats.niekwalifikowani > 0);

  const fmtPln = (n: number) =>
    n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div
      style={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <PageHeader icon={<TrendingUp size={15} color="var(--accent)" />} title="Statystyki">
        <div style={{ height: 20, width: 1, background: "var(--border)", marginLeft: 4 }} />

        {/* Range selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {([7, 30, 90] as const).map((days) => (
            <button
              key={days}
              onClick={() => setPreset(days)}
              style={{
                height: 28,
                padding: "0 12px",
                borderRadius: 7,
                border: `1px solid ${preset === days ? "var(--accent)" : "var(--border)"}`,
                background: preset === days ? "var(--accent-muted)" : "var(--bg-hover)",
                color: preset === days ? "var(--accent)" : "var(--text-secondary)",
                fontSize: 12,
                fontWeight: preset === days ? 600 : 400,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              {days} dni
            </button>
          ))}
          <button
            onClick={() => setPreset("custom")}
            style={{
              height: 28,
              padding: "0 12px",
              borderRadius: 7,
              border: `1px solid ${preset === "custom" ? "var(--accent)" : "var(--border)"}`,
              background: preset === "custom" ? "var(--accent-muted)" : "var(--bg-hover)",
              color: preset === "custom" ? "var(--accent)" : "var(--text-secondary)",
              fontSize: 12,
              fontWeight: preset === "custom" ? 600 : 400,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            Własny zakres
          </button>
          {preset === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  height: 28,
                  padding: "0 8px",
                  borderRadius: 7,
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-primary)",
                  background: "var(--bg-hover)",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>-</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={todayISO()}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  height: 28,
                  padding: "0 8px",
                  borderRadius: 7,
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-primary)",
                  background: "var(--bg-hover)",
                  outline: "none",
                }}
              />
            </div>
          )}
        </div>

        {loading && (
          <Loader2
            size={14}
            color="var(--text-tertiary)"
            style={{ animation: "spin 1s linear infinite", marginLeft: "auto" }}
          />
        )}
      </PageHeader>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {error && (
          <Panel style={{ padding: 16, marginBottom: 16, background: "var(--error-bg)" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--error)" }}>
              {error}
            </div>
          </Panel>
        )}

        {!loading && !error && !hasAnyData && (
          <Panel
            style={{
              padding: 40,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <TrendingUp size={28} color="var(--text-tertiary)" strokeWidth={1.5} />
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Brak danych w wybranym zakresie
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-tertiary)",
                maxWidth: 360,
              }}
            >
              Nie zarejestrowano jeszcze żadnej aktywności (dials, rozmowy, leady) dla tych dat.
              Spróbuj wybrać szerszy zakres.
            </div>
          </Panel>
        )}

        {stats && hasAnyData && (
          <>
            <KpiSection label="Wynik">
              <KpiCard
                label="Show Rate"
                value={`${stats.show_rate.toFixed(0)}%`}
                tone="accent"
                icon={ThumbsUp}
                emphasize
              />
              <KpiCard
                label="Wartość sprzedaży PLN"
                value={`${fmtPln(stats.wartosc_sprzedazy_pln)} zł`}
                tone="success"
                icon={Wallet}
                emphasize
              />
              <KpiCard
                label="Sprzedaże"
                value={String(stats.sprzedaze)}
                tone="success"
                icon={TrendingUp}
                emphasize
              />
            </KpiSection>

            {/* A6 (2026-07-16): "Rozmowy" rozbite na kwalifikacyjne i sprzedażowe zamiast
                jednej zbiorczej liczby — poprzednio pole nazywało się ogólnie "Rozmowy",
                ale w praktyce liczyło wyłącznie rozmowy kwalifikacyjne (jedyny przycisk
                tally żył w /kwalifikacja); /sprzedaz dostało teraz własny licznik. */}
            <KpiSection label="Aktywność dzienna">
              <KpiCard label="Dials" value={String(stats.dials)} tone="neutral" icon={Phone} />
              <KpiCard
                label="Rozmowy kwalifikacyjne"
                value={String(stats.rozmowy_kwalifikacja)}
                tone="neutral"
                icon={PhoneCall}
              />
              <KpiCard
                label="Rozmowy sprzedażowe"
                value={String(stats.rozmowy_sprzedaz)}
                tone="neutral"
                icon={Target}
              />
              <KpiCard
                label="SMS Wysłane"
                value={String(stats.sms)}
                tone="neutral"
                icon={MessageSquare}
              />
            </KpiSection>

            <KpiSection label="Lejek sprzedażowy">
              <KpiCard
                label="Nowe leady"
                value={String(stats.nowe_leady)}
                tone="accent"
                icon={UserPlus}
              />
              <KpiCard
                label="Discovery umówione"
                value={String(stats.discovery_umowione)}
                tone="purple"
                icon={Users}
              />
              <KpiCard
                label="Discovery odbyte"
                value={String(stats.discovery_odbyte)}
                tone="purple"
                icon={Users}
              />
              <KpiCard
                label="No-Show"
                value={String(stats.no_show)}
                tone="amber"
                icon={PhoneOff}
                tooltip="Szacunek: brak dedykowanego pola no-show w Notion. Liczone jako 'Data discovery' w przeszłości bez wypełnionego 'Wynik Discovery'."
              />
              <KpiCard
                label="Niekwalifikowani"
                value={String(stats.niekwalifikowani)}
                tone="neutral"
                icon={Ban}
              />
            </KpiSection>
          </>
        )}
      </div>
    </div>
  );
}
