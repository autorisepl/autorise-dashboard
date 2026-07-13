"use client";

import { BookOpen, Mic, Phone, Search } from "lucide-react";
import { type ReactNode, Suspense, useCallback, useEffect, useState } from "react";
import type { HealthResponse } from "@/app/api/health/route";
import type { AgentId, AgentState, CardStage } from "@/components/agents/AgentWorkspace";
import { AgentWorkspace, CARD_STAGE_BY_AGENT } from "@/components/agents/AgentWorkspace";
import { useRole } from "@/lib/auth/RoleContext";
import type { CardState } from "@/lib/google/sheets-card";
import type { PipelineClient } from "@/lib/notion/client";

// ── Constants ──────────────────────────────────────────────────────

// agent1/agent2/agent3 zostają w AGENT_IDS (stan/typy nadal istnieją) ale bez zakładki w
// TABS poniżej — scalony agentKwalifikacja zastąpił je w UI (Etap 4 patcha z 2026-07-13).
// Kod starych agentów nie jest kasowany, to świadomy fallback.
const AGENT_IDS: AgentId[] = [
  "agent1",
  "agent2",
  "agent3",
  "agent4",
  "agent5",
  "agent6",
  "agentKwalifikacja",
];
const SETTER_VISIBLE_AGENT_TABS: AgentId[] = ["agentKwalifikacja", "agent4"];

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
  { id: "agentKwalifikacja", label: "01 Kwalifikacja", icon: <Phone size={13} /> },
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
  const role = useRole();
  const visibleTabs =
    role === "setter" ? TABS.filter((t) => SETTER_VISIBLE_AGENT_TABS.includes(t.id)) : TABS;

  const [activeAgent, setActiveAgent] = useState<AgentId>(() => {
    if (typeof window === "undefined") return "agentKwalifikacja";
    return (localStorage.getItem("agenci_active_tab") as AgentId) ?? "agentKwalifikacja";
  });

  useEffect(() => {
    if (role === "setter" && !SETTER_VISIBLE_AGENT_TABS.includes(activeAgent)) {
      setActiveAgent("agentKwalifikacja");
    }
  }, [role, activeAgent]);

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
  const [analysisMode, setAnalysisMode] = useState<"nowa" | "uzupelnienie">("nowa");

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

      // Część 7: jeśli dla tego klienta istnieje już zapisana analiza Agenta 01, wczytaj ją
      // od razu zamiast wymuszać ponowne uruchomienie.
      if (activeAgent === "agent1" && id && analysisMode === "nowa") {
        void (async () => {
          try {
            const histRes = await fetch(`/api/notion/client-history?pageId=${id}`);
            const histData = await histRes.json();
            if (!histData.success) return;
            const entry = (histData.history as Array<{ id: string; type: string }>).find(
              (h) => h.type === "Agent 01 — Analiza kwalifikacyjna",
            );
            if (!entry) return;
            const detailRes = await fetch(`/api/notion/client-history?entryId=${entry.id}`);
            const detailData = await detailRes.json();
            if (!detailData.success || !detailData.details) return;
            const output = JSON.parse(detailData.details);
            updateAgentState("agent1", {
              status: "done",
              output,
              loadedFromHistory: true,
              notionPageId: id,
              notionError: null,
              elapsed: null,
            });
          } catch {
            /* silent — user can still run fresh */
          }
        })();
      }
    },
    [activeAgent, analysisMode, updateAgentState],
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
    if (
      activeAgent === "agent1" &&
      analysisMode === "uzupelnienie" &&
      !selectedClientIds[activeAgent]
    ) {
      updateAgentState(activeAgent, {
        status: "error",
        errorMsg: "Wybierz klienta do którego chcesz dodać uzupełnienie.",
      });
      return;
    }

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
      loadedFromHistory: false,
    });

    try {
      const selectedClientId = selectedClientIds[activeAgent];
      const payload: Record<string, string | boolean | undefined> = {
        notion_page_id: selectedClientId || undefined,
      };

      if (activeAgent === "agent1" && analysisMode === "uzupelnienie") {
        payload.mode = "uzupelnienie";
        payload.existing_client_id = selectedClientId || undefined;
      } else if (activeAgent === "agent1" && verificationMode) {
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

      // Agent Kwalifikacja (scalony Agent 1+2+3) zapisuje do Notion automatycznie,
      // tak jak stary Agent 1 — save_to_notion domyślnie false w route.ts służyło
      // wyłącznie do bezpiecznych testów porównawczych z Etapu 3, nie do UI.
      if (activeAgent === "agentKwalifikacja") {
        payload.save_to_notion = true;
      }

      const endpointPath = activeAgent === "agentKwalifikacja" ? "kwalifikacja" : activeAgent;
      const res = await fetch(`/api/agents/${endpointPath}`, {
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
          (activeAgent === "agent1" || activeAgent === "agentKwalifikacja") &&
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
            // Karta "Kontakty" (Sheets) czyta pola płaskie (icp/bol_glowny_cytat/nastepny_krok)
            // — dla scalonego agenta to sekcja "kwalifikacja" wyniku, nie cały nested obiekt.
            const cardOutput =
              activeAgent === "agentKwalifikacja"
                ? ((data.output as { kwalifikacja?: unknown })?.kwalifikacja ?? {})
                : data.output;
            void writeCard(activeAgent, stage, clientName, state.attachedMp3Link, cardOutput);
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
  }, [
    activeAgent,
    agentStates,
    selectedClientIds,
    updateAgentState,
    verificationMode,
    analysisMode,
    writeCard,
  ]);

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
        {visibleTabs.map((tab) => (
          <TabBtn
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            active={activeAgent === tab.id}
            onClick={() => changeAgent(tab.id)}
          />
        ))}
        {activeAgent === "agent1" && (
          <div style={{ display: "flex", gap: 6, marginLeft: "auto", paddingRight: 4 }}>
            <button
              onClick={() => setAnalysisMode("nowa")}
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                border: `1px solid ${analysisMode === "nowa" ? "var(--accent)" : "var(--border)"}`,
                background: analysisMode === "nowa" ? "var(--accent-muted)" : "transparent",
                color: analysisMode === "nowa" ? "var(--accent)" : "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Nowa analiza
            </button>
            <button
              onClick={() => setAnalysisMode("uzupelnienie")}
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                border: `1px solid ${analysisMode === "uzupelnienie" ? "var(--accent)" : "var(--border)"}`,
                background: analysisMode === "uzupelnienie" ? "var(--accent-muted)" : "transparent",
                color: analysisMode === "uzupelnienie" ? "var(--accent)" : "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Uzupełnienie do istniejącego klienta
            </button>
          </div>
        )}
        {activeAgent === "agent1" && analysisMode === "nowa" && (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
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
          bypassDriveRequirement={activeAgent === "agent1" && analysisMode === "uzupelnienie"}
          transcriptFieldOverride={
            activeAgent === "agent1" && analysisMode === "uzupelnienie"
              ? {
                  label: "Uzupełnienie do istniejącego klienta",
                  placeholder:
                    "Wklej dodatkową notatkę, transkrypt krótkiej rozmowy, albo cokolwiek co klient dodatkowo powiedział...",
                }
              : undefined
          }
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
