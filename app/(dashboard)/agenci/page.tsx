"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import type { HealthResponse } from "@/app/api/health/route";
import { AgentsOverview } from "@/components/agents/AgentsOverview";
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
      cardStatus: "idle",
      cardError: null,
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
        if (activeAgent === "agent1" && data.notion_page_id && !selectedClientId) {
          const newClient: PipelineClient = {
            id: data.notion_page_id,
            name: data.notion_client_name ?? "Nowy klient",
            status: data.notion_client_status ?? "Nowy lead",
          };
          setClients((prev) => [newClient, ...prev.filter((c) => c.id !== newClient.id)]);
          setSelectedClientIds((prev) => ({ ...prev, [activeAgent]: data.notion_page_id }));
        }

        // Auto-update the "Kontakty" client card for stage agents (01/04).
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
  }, [activeAgent, agentStates, selectedClientIds, updateAgentState, writeCard]);

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
    return <AgentsOverview />;
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
