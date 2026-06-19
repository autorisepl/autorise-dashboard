"use client";

import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  ChevronRight,
  Clock,
  Database,
  Loader2,
  Microscope,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type { HealthResponse } from "@/app/api/health/route";

// ── Types ──────────────────────────────────────────────────────────

export type AgentId = "agent0" | "agent1" | "agent2" | "agent3" | "agent4" | "agent5" | "agent6";

interface AgentsOverviewProps {
  health: HealthResponse | null;
  healthLoading: boolean;
  onSelect: (id: AgentId) => void;
}

// ── Agent metadata ─────────────────────────────────────────────────

export const AGENT_META: Record<
  AgentId,
  {
    num: string;
    name: string;
    pitch: string;
    when: string;
    writesNotion: boolean;
    hasThinking: boolean;
    savesToKB: boolean;
    category: "sprzedaz" | "szkolenia" | "analiza";
    color: string;
  }
> = {
  agent0: {
    num: "00",
    name: "Lead Intake",
    pitch: "Wiadomość ze Slacka → NIP w KRS/CEIDG → karta klienta zapisana w Notion Pipeline",
    when: "Nowy lead z formularza",
    writesNotion: true,
    hasThinking: false,
    savesToKB: false,
    category: "sprzedaz",
    color: "#1a56ff",
  },
  agent1: {
    num: "01",
    name: "Kwalifikacja",
    pitch:
      "Transkrypt rozmowy → ICP score 0–100, koszt problemu, decyzja kwalifikacyjna w Pipeline",
    when: "Po rozmowie kwalifikacyjnej (5–8 min)",
    writesNotion: true,
    hasThinking: false,
    savesToKB: false,
    category: "sprzedaz",
    color: "#5e5ce6",
  },
  agent2: {
    num: "02",
    name: "Pre-Discovery",
    pitch:
      "Pre-Discovery Brief z hipotezami bólu klienta + kompletny Live Script na Discovery Call",
    when: "Po kwalifikacji, przed Discovery Call",
    writesNotion: false,
    hasThinking: true,
    savesToKB: false,
    category: "sprzedaz",
    color: "#ff9f0a",
  },
  agent3: {
    num: "03",
    name: "Personalizacja",
    pitch:
      "Dane ROI i harmonogram wdrożenia spersonalizowane pod konkretnego klienta do prezentacji",
    when: "Przed Discovery Call",
    writesNotion: false,
    hasThinking: false,
    savesToKB: false,
    category: "sprzedaz",
    color: "#30d158",
  },
  agent4: {
    num: "04",
    name: "Discovery Call",
    pitch: "Analiza całego spotkania — decyzja, ocena jakości rozmowy i plan następnego kroku",
    when: "Po Discovery Call (45–60 min)",
    writesNotion: true,
    hasThinking: false,
    savesToKB: false,
    category: "sprzedaz",
    color: "#ff453a",
  },
  agent5: {
    num: "05",
    name: "Agency Leaders",
    pitch: "Actionable insights z cotygodniowej sesji szkoleniowej — raport trafia do Bazy Wiedzy",
    when: "Piątek 18:00 · Robert i Kacper",
    writesNotion: false,
    hasThinking: true,
    savesToKB: true,
    category: "szkolenia",
    color: "#0a84ff",
  },
  agent6: {
    num: "06",
    name: "Narzędzia",
    pitch: "Ocena narzędzia, biblioteki lub koncepcji AI — wnioski i rekomendacja do Bazy Wiedzy",
    when: "Przy analizie nowego narzędzia AI",
    writesNotion: false,
    hasThinking: false,
    savesToKB: true,
    category: "analiza",
    color: "#636366",
  },
};

const SPRZEDAZ_FLOW: AgentId[] = ["agent0", "agent1", "agent2", "agent3", "agent4"];

const f = { system: "var(--font-system)", mono: "var(--font-mono)" };

// ── Status dot (loading spinner / dot) ────────────────────────────

function StatusDot({ ok, loading = false }: { ok?: boolean | null; loading?: boolean }) {
  if (loading)
    return (
      <Loader2
        size={8}
        color="#8e8e93"
        style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
      />
    );
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        flexShrink: 0,
        display: "block",
        background: ok === null ? "#8e8e93" : ok ? "#1a56ff" : "#ff453a",
        boxShadow: ok ? "0 0 5px rgba(26,86,255,0.6)" : "none",
      }}
    />
  );
}

// ── Chip badge ─────────────────────────────────────────────────────

function Chip({
  icon,
  label,
  color,
  size = "sm",
}: {
  icon?: React.ReactNode;
  label: string;
  color: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "md" ? 6 : 4,
        padding: size === "md" ? "5px 11px" : "4px 9px",
        borderRadius: 20,
        background: `${color}12`,
        border: `1px solid ${color}28`,
        flexShrink: 0,
      }}
    >
      {icon}
      <span
        style={{
          fontFamily: f.system,
          fontSize: size === "md" ? 12 : 10.5,
          fontWeight: 600,
          color,
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Status badges ───────────────────────────────────────────────────

function StatusBadges({
  m,
  health,
  healthLoading,
}: {
  m: (typeof AGENT_META)[AgentId];
  health: HealthResponse | null;
  healthLoading: boolean;
}) {
  const apiLoading = healthLoading;
  const notionLoading = healthLoading;
  const apiOk = healthLoading ? null : (health?.anthropic?.ok ?? false);
  const notionOk = healthLoading ? null : (health?.notion?.ok ?? false);

  const apiColor = apiOk === null ? "#8e8e93" : apiOk ? "#1a56ff" : "#ff453a";
  const notionColor = notionOk === null ? "#8e8e93" : notionOk ? "#1a56ff" : "#ff453a";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 9px",
          borderRadius: 20,
          background: `${apiColor}12`,
          border: `1px solid ${apiColor}28`,
        }}
      >
        {apiLoading ? (
          <Loader2 size={8} color={apiColor} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <Activity size={8} color={apiColor} strokeWidth={2.5} />
        )}
        <span style={{ fontFamily: f.system, fontSize: 10.5, fontWeight: 600, color: apiColor }}>
          Anthropic
        </span>
      </div>

      {m.writesNotion && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 9px",
            borderRadius: 20,
            background: `${notionColor}12`,
            border: `1px solid ${notionColor}28`,
          }}
        >
          {notionLoading ? (
            <Loader2
              size={8}
              color={notionColor}
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : (
            <Database size={8} color={notionColor} strokeWidth={2.5} />
          )}
          <span
            style={{ fontFamily: f.system, fontSize: 10.5, fontWeight: 600, color: notionColor }}
          >
            Notion Pipeline
          </span>
        </div>
      )}

      {m.hasThinking && (
        <Chip
          icon={<Brain size={8} color={m.color} strokeWidth={2.5} />}
          label="Analiza Głęboka"
          color={m.color}
        />
      )}

      {m.savesToKB && (
        <Chip
          icon={<Database size={8} color={m.color} strokeWidth={2.5} />}
          label="Baza Wiedzy"
          color={m.color}
        />
      )}
    </div>
  );
}

// ── Flow card (pipeline, vertical) ────────────────────────────────

function FlowCard({
  id,
  health,
  healthLoading,
  onSelect,
}: {
  id: AgentId;
  health: HealthResponse | null;
  healthLoading: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const m = AGENT_META[id];
  const bColor = hovered ? `${m.color}38` : "var(--border)";

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: 268,
        flexShrink: 0,
        padding: "22px 20px 20px",
        background: "var(--bg-elevated)",
        backdropFilter: "blur(24px) saturate(1.8)",
        WebkitBackdropFilter: "blur(24px) saturate(1.8)",
        borderTop: `1px solid ${bColor}`,
        borderRight: `1px solid ${bColor}`,
        borderBottom: `1px solid ${bColor}`,
        borderLeft: `4px solid ${m.color}`,
        borderRadius: 20,
        boxShadow: hovered
          ? `0 20px 56px rgba(0,0,0,0.10), 0 8px 20px rgba(0,0,0,0.07), 0 0 0 1px ${m.color}14, inset 0 1px 0 rgba(255,255,255,0.9)`
          : "0 2px 10px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
        cursor: "pointer",
        textAlign: "left",
        transition: "box-shadow 0.26s ease, transform 0.2s ease, border-color 0.2s ease",
        transform: hovered ? "translateY(-7px)" : "translateY(0)",
        display: "flex",
        flexDirection: "column",
        outline: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Number + status */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontFamily: f.mono,
            fontSize: 70,
            fontWeight: 900,
            color: m.color,
            letterSpacing: "-0.05em",
            lineHeight: 0.86,
            opacity: hovered ? 1 : 0.82,
            transition: "opacity 0.2s ease, text-shadow 0.26s ease",
            textShadow: hovered ? `0 6px 30px ${m.color}50` : `0 2px 10px ${m.color}22`,
            userSelect: "none",
          }}
        >
          {m.num}
        </div>
        <StatusBadges m={m} health={health} healthLoading={healthLoading} />
      </div>

      {/* Accent divider */}
      <div
        style={{
          height: 1.5,
          marginBottom: 14,
          background: `linear-gradient(90deg, ${m.color}45, ${m.color}10, transparent)`,
          borderRadius: 1,
        }}
      />

      {/* Name */}
      <div
        style={{
          fontFamily: f.system,
          fontSize: 17,
          fontWeight: 800,
          color: "var(--text-primary)",
          letterSpacing: "-0.03em",
          lineHeight: 1.2,
          marginBottom: 9,
        }}
      >
        {m.name}
      </div>

      {/* Pitch */}
      <div
        style={{
          fontFamily: f.system,
          fontSize: 12.5,
          fontWeight: 400,
          color: "var(--text-primary)",
          lineHeight: 1.7,
          flex: 1,
          marginBottom: 18,
          opacity: 0.6,
        }}
      >
        {m.pitch}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Clock size={10} color={m.color} strokeWidth={2} style={{ opacity: 0.8 }} />
          <span
            style={{
              fontFamily: f.system,
              fontSize: 11,
              color: m.color,
              fontWeight: 500,
              opacity: 0.85,
            }}
          >
            {m.when}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateX(0)" : "translateX(-8px)",
            transition: "opacity 0.18s ease, transform 0.18s ease",
          }}
        >
          <span style={{ fontFamily: f.system, fontSize: 10.5, color: m.color, fontWeight: 700 }}>
            Otwórz
          </span>
          <ChevronRight size={13} color={m.color} strokeWidth={2.5} />
        </div>
      </div>
    </button>
  );
}

// ── Wide card (Szkolenia / Analiza) ───────────────────────────────

function WideCard({
  id,
  health,
  healthLoading,
  onSelect,
}: {
  id: AgentId;
  health: HealthResponse | null;
  healthLoading: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const m = AGENT_META[id];
  const bColor = hovered ? `${m.color}38` : "var(--border)";

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "24px 28px",
        background: "var(--bg-elevated)",
        backdropFilter: "blur(24px) saturate(1.8)",
        WebkitBackdropFilter: "blur(24px) saturate(1.8)",
        borderTop: `1px solid ${bColor}`,
        borderRight: `1px solid ${bColor}`,
        borderBottom: `1px solid ${bColor}`,
        borderLeft: `4px solid ${m.color}`,
        borderRadius: 20,
        boxShadow: hovered
          ? `0 16px 48px rgba(0,0,0,0.09), 0 6px 16px rgba(0,0,0,0.06), 0 0 0 1px ${m.color}12`
          : "0 2px 10px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)",
        cursor: "pointer",
        transition: "box-shadow 0.26s ease, transform 0.2s ease, border-color 0.2s ease",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        display: "flex",
        alignItems: "center",
        gap: 24,
        outline: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Number */}
      <div
        style={{
          fontFamily: f.mono,
          fontSize: 62,
          fontWeight: 900,
          color: m.color,
          letterSpacing: "-0.05em",
          lineHeight: 1,
          flexShrink: 0,
          width: 80,
          opacity: hovered ? 1 : 0.82,
          transition: "opacity 0.2s ease, text-shadow 0.26s ease",
          textShadow: hovered ? `0 4px 22px ${m.color}50` : `0 2px 10px ${m.color}22`,
          userSelect: "none",
        }}
      >
        {m.num}
      </div>

      {/* Gradient divider */}
      <div
        style={{
          width: 1,
          height: 56,
          flexShrink: 0,
          background: `linear-gradient(180deg, transparent, ${m.color}45, transparent)`,
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: f.system,
            fontSize: 18,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
            marginBottom: 6,
          }}
        >
          {m.name}
        </div>
        <div
          style={{
            fontFamily: f.system,
            fontSize: 13,
            color: "var(--text-primary)",
            lineHeight: 1.65,
            marginBottom: 10,
            opacity: 0.6,
          }}
        >
          {m.pitch}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Clock size={10} color={m.color} strokeWidth={2} style={{ opacity: 0.8 }} />
          <span style={{ fontFamily: f.system, fontSize: 11.5, color: m.color, fontWeight: 500 }}>
            {m.when}
          </span>
        </div>
      </div>

      {/* Status + arrow */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 7,
          flexShrink: 0,
        }}
      >
        <StatusBadges m={m} health={health} healthLoading={healthLoading} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            marginTop: 4,
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateX(0)" : "translateX(-8px)",
            transition: "opacity 0.18s ease, transform 0.18s ease",
          }}
        >
          <span style={{ fontFamily: f.system, fontSize: 11, color: m.color, fontWeight: 700 }}>
            Otwórz
          </span>
          <ChevronRight size={15} color={m.color} strokeWidth={2.5} />
        </div>
      </div>
    </button>
  );
}

// ── Flow arrow ─────────────────────────────────────────────────────

function FlowArrow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        alignSelf: "center",
        padding: "0 4px",
      }}
    >
      <div style={{ width: 14, height: 1.5, background: "var(--border)" }} />
      <ArrowRight
        size={11}
        color="var(--text-tertiary)"
        strokeWidth={1.8}
        style={{ marginLeft: -3 }}
      />
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  sub,
  color = "#1a56ff",
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          flexShrink: 0,
          background: `${color}0e`,
          border: `1px solid ${color}1e`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontFamily: f.system,
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.025em",
            lineHeight: 1,
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontFamily: f.system,
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginTop: 3,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main overview ──────────────────────────────────────────────────

export function AgentsOverview({ health, healthLoading, onSelect }: AgentsOverviewProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "40px 40px 72px",
        fontFamily: f.system,
      }}
    >
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 46 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              flexShrink: 0,
              background: "linear-gradient(145deg, #1d3bff 0%, #1a56ff 55%, #0a84ff 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 28px rgba(26,86,255,0.38), inset 0 1px 0 rgba(255,255,255,0.28)",
            }}
          >
            <Zap size={22} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: f.system,
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: "-0.05em",
                margin: 0,
                lineHeight: 1,
                color: "var(--text-primary)",
              }}
            >
              Agenci AI
            </h1>
            <div
              style={{
                fontFamily: f.system,
                fontSize: 14,
                color: "var(--text-tertiary)",
                marginTop: 5,
                fontWeight: 400,
                letterSpacing: "-0.01em",
              }}
            >
              Pipeline sprzedażowy · szkolenia · analiza narzędzi
            </div>
          </div>
        </div>
      </div>

      {/* ── PIPELINE SPRZEDAŻOWY ── */}
      <div style={{ marginBottom: 52 }}>
        <SectionHeader
          icon={<Zap size={16} color="#1a56ff" strokeWidth={2} />}
          label="Pipeline Sprzedażowy"
          sub="Uruchamiaj po kolei — wynik każdego agenta wzbogaca następny"
          color="#1a56ff"
        />

        <div style={{ overflowX: "auto", paddingBottom: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "max-content",
              paddingBottom: 4,
            }}
          >
            {SPRZEDAZ_FLOW.map((id, i) => (
              <div key={id} style={{ display: "flex", alignItems: "center" }}>
                <FlowCard
                  id={id}
                  health={health}
                  healthLoading={healthLoading}
                  onSelect={() => onSelect(id)}
                />
                {i < SPRZEDAZ_FLOW.length - 1 && <FlowArrow />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SZKOLENIA + ANALIZA ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>
        <div>
          <SectionHeader
            icon={<BookOpen size={16} color="#0a84ff" strokeWidth={2} />}
            label="Szkolenia"
            sub="Agency Leaders — cotygodniowa sesja z Robertem i Kacprem"
            color="#0a84ff"
          />
          <WideCard
            id="agent5"
            health={health}
            healthLoading={healthLoading}
            onSelect={() => onSelect("agent5")}
          />
        </div>

        <div>
          <SectionHeader
            icon={<Microscope size={16} color="#636366" strokeWidth={2} />}
            label="Analiza Narzędzi"
            sub="Ocena narzędzi AI, bibliotek i koncepcji do workspace'u Autorise"
            color="#636366"
          />
          <WideCard
            id="agent6"
            health={health}
            healthLoading={healthLoading}
            onSelect={() => onSelect("agent6")}
          />
        </div>
      </div>
    </div>
  );
}
