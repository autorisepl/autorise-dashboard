"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import type { HealthResponse } from "@/app/api/health/route";
import type { AgentId } from "@/components/agents/AgentsOverview";
import { AgentsOverview } from "@/components/agents/AgentsOverview";
import type { AgentState } from "@/components/agents/AgentWorkspace";
import { AgentWorkspace } from "@/components/agents/AgentWorkspace";
import type { PipelineClient } from "@/lib/notion/client";

// ── Constants ──────────────────────────────────────────────────────

const AGENT_IDS: AgentId[] = ["agent0", "agent1", "agent2", "agent3", "agent4", "agent5", "agent6"];

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
};

function makeInitialStates(): Record<AgentId, AgentState> {
  return Object.fromEntries(AGENT_IDS.map((id) => [id, { ...INITIAL_STATE }])) as Record<
    AgentId,
    AgentState
  >;
}

// ── Page inner (uses useSearchParams) ─────────────────────────────

function AgenciPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paramAgent = searchParams.get("agent") as AgentId | null;
  const activeAgent: AgentId | null = AGENT_IDS.includes(paramAgent as AgentId) ? paramAgent : null;

  const [agentStates, setAgentStates] = useState<Record<AgentId, AgentState>>(makeInitialStates);
  const [clients, setClients] = useState<PipelineClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [selectedClientIds, setSelectedClientIds] = useState<Record<AgentId, string>>(
    () => Object.fromEntries(AGENT_IDS.map((id) => [id, ""])) as Record<AgentId, string>,
  );
  const [copied, setCopied] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────

  useEffect(() => {
    async function fetchClients() {
      setClientsLoading(true);
      try {
        const res = await fetch("/api/notion/clients");
        const data = await res.json();
        if (data.success) setClients(data.clients ?? []);
      } catch {
        /* silent */
      } finally {
        setClientsLoading(false);
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

  // ── Navigation ─────────────────────────────────────────────────

  const selectAgent = useCallback(
    (id: AgentId) => {
      router.push(`/agenci?agent=${id}`);
    },
    [router],
  );

  const goBack = useCallback(() => {
    router.push("/agenci");
  }, [router]);

  // ── State helpers ──────────────────────────────────────────────

  const updateAgentState = useCallback((agentId: AgentId, patch: Partial<AgentState>) => {
    setAgentStates((prev) => ({
      ...prev,
      [agentId]: { ...prev[agentId], ...patch },
    }));
  }, []);

  const handleFieldChange = useCallback(
    (field: keyof AgentState, value: string) => {
      if (!activeAgent) return;
      updateAgentState(activeAgent, { [field]: value });
    },
    [activeAgent, updateAgentState],
  );

  const handleClientSelect = useCallback(
    (id: string) => {
      if (!activeAgent) return;
      setSelectedClientIds((prev) => ({ ...prev, [activeAgent]: id }));
    },
    [activeAgent],
  );

  // ── Run agent ──────────────────────────────────────────────────

  const handleRun = useCallback(async () => {
    if (!activeAgent) return;
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
    });

    try {
      const selectedClientId = selectedClientIds[activeAgent];
      const payload: Record<string, string | undefined> = {
        notion_page_id: selectedClientId || undefined,
      };

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
        if (
          (activeAgent === "agent0" || activeAgent === "agent1") &&
          data.notion_page_id &&
          !selectedClientId
        ) {
          const newClient: PipelineClient = {
            id: data.notion_page_id,
            name: data.notion_client_name ?? "Nowy klient",
            status: data.notion_client_status ?? "Nowy lead",
          };
          setClients((prev) => [newClient, ...prev.filter((c) => c.id !== newClient.id)]);
          setSelectedClientIds((prev) => ({ ...prev, [activeAgent]: data.notion_page_id }));
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
  }, [activeAgent, agentStates, selectedClientIds, updateAgentState]);

  // ── Notion push ────────────────────────────────────────────────

  const handleNotionPush = useCallback(async () => {
    if (!activeAgent) return;
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
    if (!activeAgent) return;
    const output = agentStates[activeAgent].output;
    if (!output) return;
    const text = typeof output === "string" ? output : JSON.stringify(output, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [activeAgent, agentStates]);

  // ── Render ─────────────────────────────────────────────────────

  if (!activeAgent) {
    return <AgentsOverview health={health} healthLoading={healthLoading} onSelect={selectAgent} />;
  }

  return (
    <AgentWorkspace
      agentId={activeAgent}
      state={agentStates[activeAgent]}
      clients={clients}
      health={health}
      healthLoading={healthLoading}
      selectedClientId={selectedClientIds[activeAgent]}
      onBack={goBack}
      onFieldChange={handleFieldChange}
      onClientSelect={handleClientSelect}
      onRun={handleRun}
      onNotionPush={handleNotionPush}
      onCopy={handleCopy}
      copied={copied}
    />
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
