"use client";

import { BookOpen, FileText, Mic, Monitor, Phone, Search } from "lucide-react";
import { type ReactNode, Suspense, useCallback, useEffect, useState } from "react";
import type { HealthResponse } from "@/app/api/health/route";
import type { AgentId, AgentState, CardStage } from "@/components/agents/AgentWorkspace";
import { AgentWorkspace, CARD_STAGE_BY_AGENT } from "@/components/agents/AgentWorkspace";
import type { CardState } from "@/lib/google/sheets-card";
import type { PipelineClient } from "@/lib/notion/client";

// ── Constants ──────────────────────────────────────────────────────

const AGENT_IDS: AgentId[] = ["agent1", "agent2", "agent3", "agent4", "agent5", "agent6"];

const INITIAL_STATE: AgentState = {
  transcript: "",
  agent1Json: "",
  agent2Json: "",
  status: "idle",
  output: null,
  errorMsg: null,
  notionPageId: null,
  notionError: null,
  notionPushing: false,
  elapsed: null,
  attachedTxtName: "",
  attachedMp3Link: "",
  attachedClientName: "",
  cardStatus: "idle",
  cardError: null,
};

// ── Build "Kontakty" card fields from an agent output ───────────────

function truncate(s: unknown, n: number): string {
  const str = typeof s === "string" ? s : s == null ? "" : String(s);
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
}

function buildCardFields(stage: CardStage, output: unknown, mp3Link: string): Partial<CardState> {
  const o = (output ?? {}) as Record<string, unknown>;

  if (stage === "kwalifikacja") {
    const icp = (o.icp ?? {}) as Record<string, unknown>;
    const summary = [
      icp.kwalifikacja ? `ICP: ${String(icp.kwalifikacja)}` : null,
      o.bol_glowny_cytat ? `Ból: ${truncate(o.bol_glowny_cytat, 160)}` : null,
      o.nastepny_krok ? `Następny krok: ${truncate(o.nastepny_krok, 120)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      rozmowaKwalifikacyjna: true,
      ...(summary ? { notatkiKwalifikacyjne: summary } : {}),
      ...(mp3Link ? { nagranieKwalifikacyjne: mp3Link } : {}),
    };
  }

  // sprzedazowa (Discovery / rozmowa ofertowa)
  const summary = [
    o.wynik_discovery
      ? `Wynik: ${truncate(o.wynik_discovery, 160)}`
      : o.wynik
        ? `Wynik: ${truncate(o.wynik, 160)}`
        : null,
    o.nastepny_krok ? `Następny krok: ${truncate(o.nastepny_krok, 120)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    odbytaRozmowaSprzedazowa: true,
    ...(summary ? { notatkiSprzedazowe: summary } : {}),
    ...(mp3Link ? { nagranieSprzedazowe: mp3Link } : {}),
  };
}

function makeInitialStates(): Record<AgentId, AgentState> {
  return Object.fromEntries(AGENT_IDS.map((id) => [id, { ...INITIAL_STATE }])) as Record<
    AgentId,
    AgentState
  >;
}

// ── Tab configuration ──────────────────────────────────────────────

type TabConfig = { id: AgentId; label: string; icon: ReactNode };

const TABS: TabConfig[] = [
  { id: "agent1", label: "01 Kwalifikacja", icon: <Phone size={13} /> },
  { id: "agent2", label: "02 Brief", icon: <FileText size={13} /> },
  { id: "agent3", label: "03 Personalizacja", icon: <Monitor size={13} /> },
  { id: "agent4", label: "04 Analiza Discovery", icon: <Mic size={13} /> },
  { id: "agent5", label: "05 Training", icon: <BookOpen size={13} /> },
  { id: "agent6", label: "06 Ewaluacja", icon: <Search size={13} /> },
];

function TabBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 14px",
        height: 36,
        border: "none",
        borderRadius: "var(--radius-sm)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#fff" : "var(--text-secondary)",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        letterSpacing: "0.03em",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background 150ms, color 150ms",
        flexShrink: 0,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Page inner ─────────────────────────────────────────────────────

function AgenciPageInner() {
  const [activeAgent, setActiveAgent] = useState<AgentId>(() => {
    if (typeof window === "undefined") return "agent1";
    return (localStorage.getItem("agenci_active_tab") as AgentId) ?? "agent1";
  });

  const changeAgent = (id: AgentId) => {
    localStorage.setItem("agenci_active_tab", id);
    setActiveAgent(id);
  };

  const [agentStates, setAgentStates] = useState<Record<AgentId, AgentState>>(makeInitialStates);
  const [clients, setClients] = useState<PipelineClient[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [selectedClientIds, setSelectedClientIds] = useState<Record<AgentId, string>>(
    () => Object.fromEntries(AGENT_IDS.map((id) => [id, ""])) as Record<AgentId, string>,
  );
  const [copied, setCopied] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch("/api/notion/clients");
        const data = await res.json();
        if (data.success) setClients(data.clients ?? []);
      } catch {
        /* silent */
      }
    }
    fetchClients();
  }, []);

  useEffect(() => {
    async function fetchHealth() {
      setHealthLoading(true);
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setHealth(data);
      } catch {
        /* silent */
      } finally {
        setHealthLoading(false);
      }
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ── State helpers ──────────────────────────────────────────────

  const updateAgentState = useCallback((agentId: AgentId, patch: Partial<AgentState>) => {
    setAgentStates((prev) => ({
      ...prev,
      [agentId]: { ...prev[agentId], ...patch },
    }));
  }, []);

  const handleFieldChange = useCallback(
    (field: keyof AgentState, value: string) => {
      updateAgentState(activeAgent, { [field]: value });
    },
    [activeAgent, updateAgentState],
  );

  const handleClientSelect = useCallback(
    (id: string) => {
      setSelectedClientIds((prev) => ({ ...prev, [activeAgent]: id }));
    },
    [activeAgent],
  );

  // ── Write "Kontakty" card after a stage agent run ──────────────

  const writeCard = useCallback(
    async (
      agentId: AgentId,
      stage: CardStage,
      clientName: string,
      mp3Link: string,
      output: unknown,
    ) => {
      updateAgentState(agentId, { cardStatus: "saving", cardError: null });
      try {
        const fields = buildCardFields(stage, output, mp3Link);
        const res = await fetch("/api/google/sheets/card", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: clientName, fields, createIfMissing: true }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          updateAgentState(agentId, { cardStatus: "saved", cardError: null });
        } else {
          updateAgentState(agentId, {
            cardStatus: "error",
            cardError:
              data.error === "scope_required"
                ? "Brak uprawnień do arkusza — połącz Google ponownie."
                : data.detail || data.error || "Nie udało się zapisać karty.",
          });
        }
      } catch (err) {
        updateAgentState(agentId, {
          cardStatus: "error",
          cardError: err instanceof Error ? err.message : "Błąd połączenia z arkuszem.",
        });
      }
    },
    [updateAgentState],
  );

  // ── Run agent ──────────────────────────────────────────────────

  const handleRun = useCallback(async () => {
    const state = agentStates[activeAgent];
    const primaryInput = state.transcript.trim();
    if (!primaryInput) return;

    const startTime = Date.now();
    updateAgentState(activeAgent, {
      status: "running",
      output: null,
      errorMsg: null,
      notionPageId: null,
      notionError: null,
      notionPushing: false,
      elapsed: null,
      cardStatus: "idle",
      cardError: null,
    });

    try {
      const selectedClientId = selectedClientIds[activeAgent];
      const payload: Record<string, string | undefined> = {
        notion_page_id: selectedClientId || undefined,
      };

      if (activeAgent === "agent1" && verificationMode) {
        payload.mode = "weryfikacja";
      }

      if (activeAgent === "agent2") {
        payload.transcript = state.transcript;
        if (state.agent1Json.trim()) payload.agent1_json = state.agent1Json;
      } else if (activeAgent === "agent3") {
        payload.agent1_json = state.transcript;
        if (state.agent2Json.trim()) payload.agent2_json = state.agent2Json;
      } else {
        payload.transcript = state.transcript;
      }

      const res = await fetch(`/api/agents/${activeAgent}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      if (data.success) {
        updateAgentState(activeAgent, {
          status: "done",
          output: data.output,
          notionPageId: data.notion_page_id ?? null,
          notionError: data.notion_error ?? null,
          elapsed,
        });
        if (activeAgent === "agent1" && data.notion_page_id && !selectedClientId) {
          const newClient: PipelineClient = {
            id: data.notion_page_id,
            name: data.notion_client_name ?? "Nowy klient",
            status: data.notion_client_status ?? "Nowy lead",
          };
          setClients((prev) => [newClient, ...prev.filter((c) => c.id !== newClient.id)]);
          setSelectedClientIds((prev) => ({ ...prev, [activeAgent]: data.notion_page_id }));
        }

        const outputStr = JSON.stringify(data.output, null, 2);
        const downstreamClientId = selectedClientId || data.notion_page_id;
        if (activeAgent === "agent1") {
          updateAgentState("agent2", { agent1Json: outputStr });
          updateAgentState("agent3", { transcript: outputStr });
          if (downstreamClientId) {
            setSelectedClientIds((prev) => ({ ...prev, agent2: downstreamClientId }));
          }
        }
        if (activeAgent === "agent2") {
          updateAgentState("agent3", { agent2Json: outputStr });
        }

        const stage = CARD_STAGE_BY_AGENT[activeAgent];
        if (stage) {
          const clientName = (state.attachedClientName || data.notion_client_name || "").trim();
          if (clientName) {
            void writeCard(activeAgent, stage, clientName, state.attachedMp3Link, data.output);
          }
        }
      } else {
        updateAgentState(activeAgent, {
          status: "error",
          errorMsg: data.error || "Nieznany błąd",
          elapsed,
        });
      }
    } catch (err) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      updateAgentState(activeAgent, {
        status: "error",
        errorMsg: err instanceof Error ? err.message : "Błąd połączenia",
        elapsed,
      });
    }
  }, [activeAgent, agentStates, selectedClientIds, updateAgentState, verificationMode, writeCard]);

  // ── Notion push ────────────────────────────────────────────────

  const handleNotionPush = useCallback(async () => {
    const state = agentStates[activeAgent];
    if (!state.output) return;

    updateAgentState(activeAgent, { notionPushing: true });
    try {
      const selectedClientId = selectedClientIds[activeAgent];
      const res = await fetch("/api/notion/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: activeAgent,
          output: state.output,
          notion_page_id: selectedClientId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        updateAgentState(activeAgent, {
          notionPageId: data.notion_page_id ?? selectedClientId ?? null,
          notionError: null,
          notionPushing: false,
        });
      } else {
        updateAgentState(activeAgent, {
          notionError: data.error ?? "Błąd Notion",
          notionPushing: false,
        });
      }
    } catch (err) {
      updateAgentState(activeAgent, {
        notionError: err instanceof Error ? err.message : "Błąd połączenia",
        notionPushing: false,
      });
    }
  }, [activeAgent, agentStates, selectedClientIds, updateAgentState]);

  // ── Copy ───────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    const output = agentStates[activeAgent].output;
    if (!output) return;
    const text = typeof output === "string" ? output : JSON.stringify(output, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [activeAgent, agentStates]);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Tab bar */}
      <div
        style={{
          height: 52,
          minHeight: 52,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "0 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {TABS.map((tab) => (
          <TabBtn
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            active={activeAgent === tab.id}
            onClick={() => changeAgent(tab.id)}
          />
        ))}
        {activeAgent === "agent1" && (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginLeft: "auto",
              cursor: "pointer",
              userSelect: "none",
              paddingRight: 4,
            }}
          >
            <div
              onClick={() => setVerificationMode((v) => !v)}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: verificationMode ? "var(--accent)" : "var(--border)",
                position: "relative",
                transition: "background 150ms",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  left: verificationMode ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                  transition: "left 150ms",
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: verificationMode ? "var(--accent)" : "var(--text-tertiary)",
                fontWeight: verificationMode ? 600 : 400,
                whiteSpace: "nowrap",
              }}
            >
              Tryb weryfikacji
            </span>
          </label>
        )}
      </div>

      {/* Workspace */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <AgentWorkspace
          agentId={activeAgent}
          state={agentStates[activeAgent]}
          clients={clients}
          health={health}
          healthLoading={healthLoading}
          selectedClientId={selectedClientIds[activeAgent]}
          onBack={() => {}}
          onFieldChange={handleFieldChange}
          onClientSelect={handleClientSelect}
          onRun={handleRun}
          onNotionPush={handleNotionPush}
          onCopy={handleCopy}
          copied={copied}
        />
      </div>
    </div>
  );
}

// ── Page export ────────────────────────────────────────────────────

export default function AgenciPage() {
  return (
    <Suspense fallback={null}>
      <AgenciPageInner />
    </Suspense>
  );
}
