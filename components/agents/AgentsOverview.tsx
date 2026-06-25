"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { HealthResponse } from "@/app/api/health/route";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusDiode } from "@/components/ui/StatusDiode";

// ── Agent definitions ───────────────────────────────────────────────

type ApiKey = "anthropic" | "notion";

interface AgentDef {
  id: string;
  number: string;
  name: string;
  steps: string[];
  apis: { key: ApiKey; label: string }[];
  model: string;
  trigger: string;
  time: string;
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
    time: "ok. 60–90 sekund",
  },
  {
    id: "agent2",
    number: "02",
    name: "Pre-Discovery Brief",
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
    time: "ok. 2–4 minuty",
    hasThinking: true,
  },
  {
    id: "agent3",
    number: "03",
    name: "Personalizacja Prezentacji",
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
    time: "ok. 45–60 sekund",
  },
  {
    id: "agent4",
    number: "04",
    name: "Analiza Discovery",
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
    time: "ok. 30–45 sekund",
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
    <Panel
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
        transition: "box-shadow 150ms, transform 150ms",
        boxShadow: hovered
          ? "0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)"
          : "var(--glass-shadow)",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      <div
        style={{ padding: "14px 16px 0", cursor: "pointer", flex: 1 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onOpen}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              letterSpacing: "0.04em",
              background: "rgba(0,0,0,0.04)",
              padding: "2px 7px",
              borderRadius: "var(--radius-xs)",
              border: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            {agent.number}
          </span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
              flex: 1,
            }}
          >
            {agent.name}
          </span>
          {agent.hasThinking && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--accent)",
                background: "var(--accent-muted)",
                padding: "2px 6px",
                borderRadius: "var(--radius-xs)",
                flexShrink: 0,
              }}
            >
              Thinking
            </span>
          )}
        </div>

        {/* Steps */}
        <ol
          style={{
            margin: "0 0 10px 0",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {agent.steps.map((step, i) => (
            <li key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  flexShrink: 0,
                  marginTop: 1,
                  width: 14,
                }}
              >
                {i + 1}.
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.4,
                }}
              >
                {step}
              </span>
            </li>
          ))}
        </ol>

        {/* Separator */}
        <div style={{ height: 1, background: "var(--border)", margin: "0 -16px 10px" }} />

        {/* APIs */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: 5,
            }}
          >
            Integracje
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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

        {/* Meta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 12 }}>
          {[
            { label: "Model", value: agent.model },
            { label: "Uruchomienie", value: agent.trigger },
            { label: "Czas pracy", value: agent.time },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-sans)",
                  width: 86,
                  flexShrink: 0,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      <div style={{ padding: "0 16px 14px" }}>
        <Button variant="primary" fullWidth size="sm" onClick={onOpen}>
          Otwórz narzędzie
        </Button>
      </div>
    </Panel>
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
        padding: "20px 24px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 18,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Agenci wspomagania sprzedaży
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-secondary)",
            margin: "4px 0 0",
          }}
        >
          Zestaw narzędzi do kwalifikacji, analizy i przygotowania leadów transportowych.
        </p>
      </div>

      {/* Grid 3+2 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          flex: 1,
          overflow: "hidden",
          alignContent: "start",
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
