"use client";

import {
  AlertCircle,
  AlertTriangle,
  FileAudio,
  Loader2,
  MessageSquare,
  Phone,
  PhoneCall,
  PhoneOff,
  Target,
  ThumbsUp,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { StatsResponse } from "@/app/api/stats/route";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";

// A6 (2026-07-18) — pełny redesign: poprzednia wersja (płaska siatka KpiCard bez Panel,
// jedna kolumna niezależnych sekcji) była oceniona przez Michała jako "masakra,
// rozpierdolone". Nowy układ: każda grupa metryk to osobny Panel (ten sam token co reszta
// dashboardu — /kontrola, /wdrozenie, /utrzymanie), lejek sprzedażowy pokazany jako realny
// spadający lejek (szerokość paska), nie płaska lista liczb.

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

// ── KPI card (hero, w panelu "Wynik") ────────────────────────────────

type Tone = "neutral" | "accent" | "success" | "amber" | "purple" | "error";

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
  error: { bg: "var(--error-bg)", color: "var(--error)", border: "var(--error-border)" },
};

function HeroCard({
  label,
  value,
  tone,
  icon: Icon,
  tooltip,
}: {
  label: string;
  value: string;
  tone: Tone;
  icon: React.ElementType;
  tooltip?: string;
}) {
  const t = TONES[tone];
  return (
    <div
      title={tooltip}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 18px",
        background: "var(--bg-elevated)",
        border: `1px solid ${t.border}`,
        borderRadius: "var(--radius-md)",
        flex: 1,
        minWidth: 200,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          flexShrink: 0,
          background: t.bg,
          border: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={19} color={t.color} strokeWidth={1.9} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 26,
            fontWeight: 800,
            color: t.color,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {label}
          {tooltip && <AlertCircle size={10} color="var(--text-tertiary)" />}
        </div>
      </div>
    </div>
  );
}

// ── Mały metric-tile (dla paneli Aktywność telefoniczna / Jakość rozmów) ─

function MetricTile({
  label,
  value,
  tone,
  icon: Icon,
  tooltip,
}: {
  label: string;
  value: string;
  tone: Tone;
  icon: React.ElementType;
  tooltip?: string;
}) {
  const t = TONES[tone];
  return (
    <div
      title={tooltip}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          flexShrink: 0,
          background: t.bg,
          border: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={13} color={t.color} strokeWidth={1.9} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 17,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            color: "var(--text-tertiary)",
            marginTop: 3,
            display: "flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
          }}
        >
          {label}
          {tooltip && <AlertCircle size={9} color="var(--text-tertiary)" />}
        </div>
      </div>
    </div>
  );
}

// ── Lejek sprzedażowy — pasek szerokości proporcjonalny do bazy ─────────

function FunnelRow({
  label,
  value,
  baseline,
  tone,
  tooltip,
}: {
  label: string;
  value: number;
  baseline: number;
  tone: Tone;
  tooltip?: string;
}) {
  const t = TONES[tone];
  const pct = baseline > 0 ? Math.min(100, Math.round((value / baseline) * 100)) : 0;
  return (
    <div title={tooltip} style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {label}
          {tooltip && <AlertCircle size={10} color="var(--text-tertiary)" />}
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            fontWeight: 800,
            color: t.color,
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: "var(--bg-hover)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: t.color,
            borderRadius: 4,
            transition: "width 300ms ease",
          }}
        />
      </div>
    </div>
  );
}

// ── Panel z nagłówkiem (ikona + SectionLabel) ────────────────────────

function StatPanel({
  icon: Icon,
  title,
  subtitle,
  children,
  style,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Panel style={{ padding: 16, display: "flex", flexDirection: "column", ...style }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: subtitle ? 2 : 8 }}
      >
        <Icon size={13} color="var(--text-tertiary)" />
        <SectionLabel paddingX={0} style={{ padding: 0 }}>
          {title}
        </SectionLabel>
      </div>
      {subtitle && (
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginBottom: 10,
          }}
        >
          {subtitle}
        </div>
      )}
      <div style={{ flex: 1 }}>{children}</div>
    </Panel>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Panel: Wynik — hero */}
            <StatPanel icon={ThumbsUp} title="Wynik">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <HeroCard
                  label="Show Rate"
                  value={`${stats.show_rate.toFixed(0)}%`}
                  tone="accent"
                  icon={ThumbsUp}
                />
                <HeroCard
                  label="Wartość sprzedaży PLN"
                  value={`${fmtPln(stats.wartosc_sprzedazy_pln)} zł`}
                  tone="success"
                  icon={Wallet}
                />
                <HeroCard
                  label="Sprzedaże"
                  value={String(stats.sprzedaze)}
                  tone="success"
                  icon={TrendingUp}
                />
              </div>
            </StatPanel>

            {/* Rząd: Lejek sprzedażowy | Aktywność telefoniczna */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: 14,
                alignItems: "stretch",
              }}
            >
              <StatPanel icon={Target} title="Lejek sprzedażowy">
                <FunnelRow
                  label="Nowe leady"
                  value={stats.nowe_leady}
                  baseline={stats.nowe_leady}
                  tone="accent"
                />
                <FunnelRow
                  label="Discovery umówione"
                  value={stats.discovery_umowione}
                  baseline={stats.nowe_leady}
                  tone="purple"
                />
                <FunnelRow
                  label="Discovery odbyte"
                  value={stats.discovery_odbyte}
                  baseline={stats.nowe_leady}
                  tone="purple"
                />
                <FunnelRow
                  label="No-Show"
                  value={stats.no_show}
                  baseline={stats.nowe_leady}
                  tone="amber"
                  tooltip="Realne od 2026-07-18 (przycisk w /sprzedaz, pole Wynik Discovery = NO-SHOW). Starsze karty bez ustawionego pola liczone szacunkiem: data w przeszłości bez wypełnionego wyniku."
                />
                <FunnelRow
                  label="Niekwalifikowani"
                  value={stats.niekwalifikowani}
                  baseline={stats.nowe_leady}
                  tone="neutral"
                />
              </StatPanel>

              <StatPanel icon={Phone} title="Aktywność telefoniczna">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <MetricTile
                    label="Dials"
                    value={String(stats.dials)}
                    tone="neutral"
                    icon={Phone}
                  />
                  <MetricTile
                    label="SMS wysłane"
                    value={String(stats.sms)}
                    tone="neutral"
                    icon={MessageSquare}
                  />
                  <MetricTile
                    label="Rozmowy kwalifikacyjne"
                    value={String(stats.rozmowy_kwalifikacja)}
                    tone="neutral"
                    icon={PhoneCall}
                  />
                  <MetricTile
                    label="Rozmowy sprzedażowe"
                    value={String(stats.rozmowy_sprzedaz)}
                    tone="neutral"
                    icon={Target}
                  />
                </div>
              </StatPanel>
            </div>

            {/* Panel: Jakość rozmów — nie zależy od zakresu dat (stan bieżący nagrań) */}
            <StatPanel
              icon={FileAudio}
              title="Jakość rozmów"
              subtitle="Aktualny stan nagrań na Drive, niezależny od wybranego zakresu dat powyżej."
            >
              {!stats.nagrania_dostepne ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--warning-bg)",
                    border: "1px solid var(--warning)",
                  }}
                >
                  <AlertTriangle
                    size={13}
                    color="var(--warning)"
                    style={{ flexShrink: 0, marginTop: 1 }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Brak połączenia z Google Drive. Połącz konto na stronie profilu, żeby zobaczyć
                    ile nagrań czeka na transkrypcję.
                  </span>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <MetricTile
                    label="Kwalifikacja: odbyte, nieprzetworzone"
                    value={String(stats.odbyte_nieprzetworzone_kwalifikacja)}
                    tone={stats.odbyte_nieprzetworzone_kwalifikacja > 0 ? "amber" : "success"}
                    icon={PhoneOff}
                    tooltip="Nagrania mp3 na Drive bez odpowiadającego transkryptu."
                  />
                  <MetricTile
                    label="Sprzedaż: odbyte, nieprzetworzone"
                    value={String(stats.odbyte_nieprzetworzone_sprzedaz)}
                    tone={stats.odbyte_nieprzetworzone_sprzedaz > 0 ? "amber" : "success"}
                    icon={Target}
                    tooltip="Nagrania mp3 na Drive bez odpowiadającego transkryptu."
                  />
                </div>
              )}
            </StatPanel>
          </div>
        )}
      </div>
    </div>
  );
}
