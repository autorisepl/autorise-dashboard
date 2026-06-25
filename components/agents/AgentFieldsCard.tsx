"use client";

import { Brain, Cpu, Database, Layers, Wifi, WifiOff } from "lucide-react";
import type { HealthResponse } from "@/app/api/health/route";
import { AGENT_FIELD_MAP } from "@/lib/agents/field-map";

interface AgentFieldsCardProps {
  agentNumber: number;
  health: HealthResponse | null;
  healthLoading: boolean;
}

export function AgentFieldsCard({ agentNumber, health, healthLoading }: AgentFieldsCardProps) {
  const info = AGENT_FIELD_MAP[agentNumber];
  if (!info) return null;

  const anthropicOk = healthLoading ? null : (health?.anthropic.ok ?? false);
  const notionOk = healthLoading ? null : (health?.notion.ok ?? false);
  const noNotionWrite = agentNumber === 5 || agentNumber === 6;

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        flexShrink: 0,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <Layers size={12} color="var(--accent)" />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--accent)",
            letterSpacing: "0.03em",
          }}
        >
          Agent {agentNumber} — {info.name}
        </span>
      </div>

      <div style={{ height: 1, background: "var(--border)", marginBottom: 10 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
        <Cpu size={10} color="var(--text-tertiary)" />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--text-tertiary)",
          }}
        >
          {info.model}
        </span>
        {info.extendedThinking && (
          <>
            <span style={{ color: "var(--text-tertiary)", fontSize: "10px" }}>·</span>
            <Brain size={10} color="var(--accent)" />
            <span
              style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--accent)" }}
            >
              extended thinking
            </span>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <StatusDot label="Anthropic" ok={anthropicOk} />
        <StatusDot label="Notion" ok={noNotionWrite ? true : notionOk} dimmed={noNotionWrite} />
      </div>

      <div style={{ height: 1, background: "var(--border)", marginBottom: 10 }} />

      <div style={{ marginBottom: info.requires ? 10 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
          <Database size={10} color="var(--text-tertiary)" />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--text-tertiary)",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            Wypełnia w Pipeline:
          </span>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {info.fieldsWritten.map((field) => (
            <li
              key={field}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text-primary)",
                lineHeight: 1.6,
                display: "flex",
                alignItems: "flex-start",
                gap: 5,
              }}
            >
              <span style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>•</span>
              {field}
            </li>
          ))}
        </ul>
      </div>

      {info.requires && (
        <>
          <div style={{ height: 1, background: "var(--border)", marginBottom: 10 }} />
          <div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--text-tertiary)",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              Wymaga uprzednio:
            </span>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--warning)",
                margin: "4px 0 0",
                lineHeight: 1.5,
              }}
            >
              {info.requires}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function StatusDot({ label, ok, dimmed }: { label: string; ok: boolean | null; dimmed?: boolean }) {
  const color = dimmed
    ? "var(--text-tertiary)"
    : ok === null
      ? "var(--text-tertiary)"
      : ok
        ? "var(--success)"
        : "var(--error)";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {ok === null ? (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--text-tertiary)",
            opacity: 0.5,
          }}
        />
      ) : ok ? (
        <Wifi size={9} color={color} />
      ) : (
        <WifiOff size={9} color={color} />
      )}
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color }}>{label}</span>
    </span>
  );
}
