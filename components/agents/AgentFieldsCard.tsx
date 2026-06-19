"use client";

import { Brain, Cpu, Database, Layers, Wifi, WifiOff } from "lucide-react";
import type { HealthResponse } from "@/app/api/health/route";
import { AGENT_FIELD_MAP } from "@/lib/agents/field-map";
import { agentTokens as at } from "@/lib/tokens";

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
        background: at.bg.terminal,
        border: `1px solid ${at.bg.terminalBorder}`,
        borderRadius: at.radius.lg,
        padding: "14px 16px",
        flexShrink: 0,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#30363d";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = at.bg.terminalBorder;
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <Layers size={12} color={at.text.terminalAccent} />
        <span
          style={{
            fontFamily: at.font.mono,
            fontSize: "11px",
            fontWeight: 600,
            color: at.text.terminalAccent,
            letterSpacing: "0.03em",
          }}
        >
          Agent {agentNumber} — {info.name}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: at.bg.terminalBorder, marginBottom: 10 }} />

      {/* Model row */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
        <Cpu size={10} color={at.text.terminalMuted} />
        <span style={{ fontFamily: at.font.mono, fontSize: "10px", color: at.text.terminalMuted }}>
          {info.model}
        </span>
        {info.extendedThinking && (
          <>
            <span style={{ color: at.text.terminalMuted, fontSize: "10px" }}>·</span>
            <Brain size={10} color={at.status.info} />
            <span style={{ fontFamily: at.font.mono, fontSize: "10px", color: at.status.info }}>
              extended thinking
            </span>
          </>
        )}
      </div>

      {/* Connection status */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <StatusDot label="Anthropic" ok={anthropicOk} />
        <StatusDot label="Notion" ok={noNotionWrite ? true : notionOk} dimmed={noNotionWrite} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: at.bg.terminalBorder, marginBottom: 10 }} />

      {/* Fields written */}
      <div style={{ marginBottom: info.requires ? 10 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
          <Database size={10} color={at.text.terminalMuted} />
          <span
            style={{
              fontFamily: at.font.mono,
              fontSize: "10px",
              color: at.text.terminalMuted,
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
                fontFamily: at.font.mono,
                fontSize: "11px",
                color: at.text.terminal,
                lineHeight: 1.6,
                display: "flex",
                alignItems: "flex-start",
                gap: 5,
              }}
            >
              <span style={{ color: at.text.terminalMuted, flexShrink: 0 }}>•</span>
              {field}
            </li>
          ))}
        </ul>
      </div>

      {/* Requires */}
      {info.requires && (
        <>
          <div style={{ height: 1, background: at.bg.terminalBorder, marginBottom: 10 }} />
          <div>
            <span
              style={{
                fontFamily: at.font.mono,
                fontSize: "10px",
                color: at.text.terminalMuted,
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              Wymaga uprzednio:
            </span>
            <p
              style={{
                fontFamily: at.font.mono,
                fontSize: "11px",
                color: at.status.warning,
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
    ? at.text.terminalMuted
    : ok === null
      ? at.text.terminalMuted
      : ok
        ? at.status.success
        : at.status.error;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {ok === null ? (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: at.text.terminalMuted,
            opacity: 0.5,
          }}
        />
      ) : ok ? (
        <Wifi size={9} color={color} />
      ) : (
        <WifiOff size={9} color={color} />
      )}
      <span style={{ fontFamily: at.font.mono, fontSize: "10px", color }}>{label}</span>
    </span>
  );
}
