"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { HealthResponse } from "@/app/api/health/route";
import { StatusDiode } from "@/components/ui/StatusDiode";

// ── Agent definitions ───────────────────────────────────────────────

type ApiKey = "anthropic" | "notion";

interface AgentDef {
  id: string;
  number: string;
  name: string;
  description: string;
  steps: string[];
  apis: { key: ApiKey; label: string }[];
  model: string;
  trigger: string;
  hasThinking?: boolean;
}

function formatModelId(id: string): string {
  const parts = id.split("-");
  const output: string[] = [];
  let i = 0;
  while (i < parts.length) {
    const p = parts[i];
    if (p === "claude") {
      output.push("Claude");
      i++;
    } else if (/^\d+$/.test(p) && i + 1 < parts.length && /^\d+$/.test(parts[i + 1])) {
      output.push(`${p}.${parts[i + 1]}`);
      i += 2;
    } else {
      output.push(p.charAt(0).toUpperCase() + p.slice(1));
      i++;
    }
  }
  return output.join(" ");
}

const AGENTS: AgentDef[] = [
  {
    id: "agent1",
    number: "01",
    name: "Kwalifikacja Rozmowy",
    description: "Analizuje rozmowę telefoniczną i ocenia dopasowanie do ICP",
    steps: [
      "Analizuje transkrypt rozmowy kwalifikacyjnej.",
      "Weryfikuje kryteria ICP: flota, biuro, decyzyjność.",
      "Wyciąga ból, systemy i historię prób.",
      "Oblicza koszt problemu i zapisuje do Notion.",
    ],
    apis: [
      { key: "anthropic", label: "Anthropic" },
      { key: "notion", label: "Notion" },
    ],
    model: formatModelId("claude-sonnet-4-6"),
    trigger: "Po rozmowie kwalifikacyjnej",
  },
  {
    id: "agent2",
    number: "02",
    name: "Brief przed Discovery",
    description: "Buduje strategię i Live Script przed rozmową Discovery",
    steps: [
      "Syntetyzuje dane z kwalifikacji i notatki wstępnej.",
      "Tworzy hipotezę problemu i plan strategiczny.",
      "Generuje Live Script do prowadzenia rozmowy.",
      "Zapisuje Brief i skrypt do Notion Pipeline.",
    ],
    apis: [
      { key: "anthropic", label: "Anthropic" },
      { key: "notion", label: "Notion" },
    ],
    model: formatModelId("claude-opus-4-8"),
    trigger: "Przed rozmową Discovery",
    hasThinking: true,
  },
  {
    id: "agent3",
    number: "03",
    name: "Personalizacja Prezentacji",
    description: "Dostosowuje prezentację do profilu i branży klienta",
    steps: [
      "Pobiera dane klienta z wyników kwalifikacji.",
      "Identyfikuje sekcje prezentacji do personalizacji.",
      "Dostosowuje przykłady i liczby do branży klienta.",
      "Generuje wersję prezentacji gotową do Discovery.",
    ],
    apis: [
      { key: "anthropic", label: "Anthropic" },
      { key: "notion", label: "Notion" },
    ],
    model: formatModelId("claude-opus-4-8"),
    trigger: "Przed rozmową Discovery",
  },
  {
    id: "agent4",
    number: "04",
    name: "Analiza Discovery",
    description: "Ocenia wynik Discovery Call i rekomenduje dalsze kroki",
    steps: [
      "Analizuje transkrypt rozmowy Discovery Call.",
      "Ocenia wynik rozmowy i potwierdzenie kryteriów.",
      "Ekstrahuje nowe ustalenia i otwarte pytania.",
      "Generuje rekomendację dalszego działania.",
    ],
    apis: [
      { key: "anthropic", label: "Anthropic" },
      { key: "notion", label: "Notion" },
    ],
    model: formatModelId("claude-sonnet-4-6"),
    trigger: "Po rozmowie Discovery",
  },
];

// ── Health fetch ────────────────────────────────────────────────────

function useHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => null);
  }, []);
  return health;
}

// ── Agent card ──────────────────────────────────────────────────────

function AgentCard({
  agent,
  health,
  onOpen,
}: {
  agent: AgentDef;
  health: HealthResponse | null;
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  function apiStatus(key: ApiKey): "online" | "offline" | "idle" {
    if (!health) return "idle";
    if (key === "anthropic") return health.anthropic.ok ? "online" : "offline";
    return health.notion.ok ? "online" : "offline";
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "box-shadow 150ms, transform 150ms",
        background: "var(--glass)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: hovered
          ? "0 12px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(81,112,255,0.10)"
          : "var(--glass-shadow)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {/* ── Top accent bar ── */}
      <div
        style={{
          height: 3,
          background: hovered
            ? "linear-gradient(90deg, var(--accent), rgba(81,112,255,0.4))"
            : "var(--border)",
          transition: "background 200ms",
          flexShrink: 0,
        }}
      />

      {/* ── Main body (clickable) ── */}
      <div
        style={{ padding: "18px 20px 0", cursor: "pointer", flex: 1, display: "flex", flexDirection: "column" }}
        onClick={onOpen}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 700,
              color: hovered ? "var(--accent)" : "var(--text-tertiary)",
              letterSpacing: "0.05em",
              background: hovered ? "var(--accent-muted)" : "rgba(0,0,0,0.04)",
              padding: "3px 8px",
              borderRadius: "var(--radius-xs)",
              border: `1px solid ${hovered ? "var(--accent-border)" : "var(--border)"}`,
              flexShrink: 0,
              marginTop: 2,
              transition: "all 150ms",
            }}
          >
            {agent.number}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                {agent.name}
              </span>
              {agent.hasThinking && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                    background: "var(--accent-muted)",
                    padding: "2px 7px",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid var(--accent-border)",
                    flexShrink: 0,
                  }}
                >
                  Thinking
                </span>
              )}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-tertiary)",
                marginTop: 3,
                lineHeight: 1.4,
              }}
            >
              {agent.description}
            </div>
          </div>
        </div>

        {/* Steps */}
        <ol
          style={{
            margin: "0 0 16px 0",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {agent.steps.map((step, i) => (
            <li key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--accent)",
                  flexShrink: 0,
                  marginTop: 1,
                  width: 16,
                  opacity: 0.7,
                }}
              >
                {i + 1}.
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {step}
              </span>
            </li>
          ))}
        </ol>

        {/* Separator */}
        <div style={{ height: 1, background: "var(--border)", margin: "0 -20px 14px" }} />

        {/* Integrations — horizontal row */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: 7,
            }}
          >
            Integracje
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {agent.apis.map((api) => (
              <StatusDiode
                key={api.key}
                status={apiStatus(api.key)}
                label={api.label}
                pulse={apiStatus(api.key) === "online"}
              />
            ))}
          </div>
        </div>

        {/* Meta — 2 rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
          {[
            { label: "Model", value: agent.model },
            { label: "Kiedy", value: agent.trigger },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-sans)",
                  width: 52,
                  flexShrink: 0,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Action — left-aligned ── */}
      <div
        style={{
          padding: "0 20px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <button
          onClick={onOpen}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: hovered ? "var(--accent)" : "transparent",
            border: `1px solid ${hovered ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: hovered ? "#fff" : "var(--text-secondary)",
            transition: "all 150ms",
            letterSpacing: "-0.01em",
          }}
        >
          Otwórz narzędzie
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// ── Export ──────────────────────────────────────────────────────────

export function AgentsOverview() {
  const router = useRouter();
  const health = useHealth();

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "24px 28px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20, flexShrink: 0 }}>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Agenci wspomagania sprzedaży
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-secondary)",
            margin: "5px 0 0",
            lineHeight: 1.5,
          }}
        >
          Zestaw narzędzi AI do kwalifikacji, analizy i przygotowania leadów transportowych.
        </p>
      </div>

      {/* Grid — responsive: 1→2→4 columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          alignContent: "start",
          paddingBottom: 8,
        }}
      >
        {AGENTS.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            health={health}
            onOpen={() => router.push(`/agenci?agent=${agent.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
