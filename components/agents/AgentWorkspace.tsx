"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Database,
  ExternalLink,
  FileAudio,
  FileText,
  HardDrive,
  Loader2,
  Play,
  Search,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DriveFile } from "@/app/api/google/drive/transcripts/route";
import type { HealthResponse } from "@/app/api/health/route";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { PromptViewer } from "@/components/ui/PromptViewer";
import type { RoadmapStep } from "@/components/ui/StatusRoadmap";
import {
  AGENT1_SYSTEM_PROMPT,
  AGENT2_SYSTEM_PROMPT,
  AGENT3_SYSTEM_PROMPT,
  AGENT4_SYSTEM_PROMPT,
  AGENT5_SYSTEM_PROMPT,
  AGENT6_SYSTEM_PROMPT,
  KWALIFIKACJA_MERGED_SYSTEM_PROMPT,
} from "@/lib/agents/prompts";
import type { PipelineClient } from "@/lib/notion/client";
import { parseClientFileName } from "@/lib/transcripts/parse";
import type { Agent1Output } from "./Agent1Card";
import { Agent1Card } from "./Agent1Card";
import type { Agent2Output } from "./Agent2Card";
import { Agent2Card } from "./Agent2Card";
import type { Agent3Output } from "./Agent3Card";
import { Agent3Card } from "./Agent3Card";
import type { Agent4Output } from "./Agent4Card";
import { Agent4Card } from "./Agent4Card";
import type { KwalifikacjaMergedOutput } from "./AgentKwalifikacjaCard";
import { AgentKwalifikacjaCard } from "./AgentKwalifikacjaCard";

// ── Types ───────────────────────────────────────────────────────────

// "agentKwalifikacja" to scalony Agent 1+2+3 (Etap 1-4 patcha z 2026-07-13) — wywołuje
// app/api/agents/kwalifikacja/route.ts. "agent1"/"agent2"/"agent3" zostają w unii typu i w
// CONFIGS jako nieużywany fallback (brak zakładki w page.tsx), nie kasować przed
// potwierdzeniem przez Michała kilku kolejnych realnych rozmów na nowym agencie.
export type AgentId =
  | "agent1"
  | "agent2"
  | "agent3"
  | "agent4"
  | "agent5"
  | "agent6"
  | "agentKwalifikacja";
export type AgentStatus = "idle" | "running" | "done" | "error";

export type CardWriteStatus = "idle" | "saving" | "saved" | "error";

export interface AgentState {
  transcript: string;
  agent1Json: string;
  agent2Json: string;
  status: AgentStatus;
  output: unknown;
  errorMsg: string | null;
  notionPageId: string | null;
  notionError: string | null;
  notionPushing: boolean;
  elapsed: number | null;
  // Drive attachments (for card-stage agents 01/04)
  attachedTxtName: string;
  attachedMp3Link: string;
  attachedClientName: string;
  // Google Sheets "Kontakty" card write result
  cardStatus: CardWriteStatus;
  cardError: string | null;
  /** True when `output` came from a previously saved Notion history entry, not a fresh run. */
  loadedFromHistory?: boolean;
}

interface AgentWorkspaceProps {
  agentId: AgentId;
  state: AgentState;
  clients: PipelineClient[];
  health: HealthResponse | null;
  healthLoading: boolean;
  selectedClientId: string;
  onBack: () => void;
  onFieldChange: (field: keyof AgentState, value: string) => void;
  onClientSelect: (id: string) => void;
  onRun: () => void;
  onNotionPush: () => void;
  onCopy: () => void;
  copied: boolean;
  /** agent1-only: bypasses the TXT+MP3 attachment requirement (uzupełnienie mode uses a free-text fragment instead). */
  bypassDriveRequirement?: boolean;
  /** agent1-only: overrides the transcript textarea label/placeholder in uzupełnienie mode. */
  transcriptFieldOverride?: { label: string; placeholder: string };
}

// ── Agent configuration ─────────────────────────────────────────────

export type CardStage = "kwalifikacja" | "sprzedazowa";

interface AgentConfig {
  num: string;
  name: string;
  when: string;
  db: string | null;
  dbFields: string[];
  inputs: Array<{
    field: "transcript" | "agent1Json" | "agent2Json";
    label: string;
    placeholder: string;
  }>;
  showClientSelector: boolean;
  writesNotion: boolean;
  hasThinking: boolean;
  clientFilter: string[];
  roadmapSteps: RoadmapStep[];
  systemPrompt: string;
  /** Require TXT + MP3 attachment from Drive (no manual paste). */
  requiresDriveFiles?: boolean;
  /** Which "Kontakty" stage this agent auto-fills after a successful run. */
  cardStage?: CardStage;
}

const CONFIGS: Record<AgentId, AgentConfig> = {
  agent1: {
    num: "01",
    name: "Kwalifikacja Rozmowy",
    when: "Po rozmowie kwalifikacyjnej",
    db: "Notion Pipeline",
    dbFields: ["Flota", "Spedytorzy", "TMS", "Ból główny", "Koszt problemu", "Ocena ICP", "Status"],
    inputs: [
      {
        field: "transcript",
        label: "Transkrypt rozmowy kwalifikacyjnej",
        placeholder: "Wklej transkrypt rozmowy kwalifikacyjnej.",
      },
    ],
    showClientSelector: true,
    writesNotion: true,
    hasThinking: false,
    requiresDriveFiles: true,
    cardStage: "kwalifikacja",
    clientFilter: ["Nowy lead", "Kwalifikacja"],
    roadmapSteps: [
      { label: "Oczekiwanie na transkrypt" },
      { label: "Analiza mowy i intencji" },
      { label: "Weryfikacja kryteriów ICP" },
      { label: "Ekstrakcja danych systemowych" },
      { label: "Obliczenie kosztu problemu" },
      { label: "Zapis do Notion Pipeline" },
    ],
    systemPrompt: AGENT1_SYSTEM_PROMPT,
  },
  agent2: {
    num: "02",
    name: "Pre-Discovery Brief",
    when: "Przed rozmową Discovery",
    db: "Notion Pipeline",
    dbFields: ["Hipoteza", "Obiekcje", "Pre-Discovery Brief", "Plan discovery"],
    inputs: [
      {
        field: "transcript",
        label: "Transkrypt rozmowy kwalifikacyjnej",
        placeholder: "Wklej transkrypt rozmowy kwalifikacyjnej.",
      },
      {
        field: "agent1Json",
        label: "Wynik Agenta 01 (JSON) — opcjonalnie",
        placeholder: "Wklej JSON z Agenta 01.",
      },
    ],
    showClientSelector: true,
    writesNotion: true,
    hasThinking: true,
    clientFilter: ["Kwalifikacja", "Discovery umówione"],
    roadmapSteps: [
      { label: "Oczekiwanie na dane wejściowe" },
      { label: "Synteza danych z kwalifikacji" },
      { label: "Budowanie hipotezy" },
      { label: "Generowanie Live Script" },
      { label: "Finalizacja Briefu" },
      { label: "Zapis do Notion Pipeline" },
    ],
    systemPrompt: AGENT2_SYSTEM_PROMPT,
  },
  agent3: {
    num: "03",
    name: "Personalizacja Prezentacji",
    when: "Przed rozmową Discovery",
    db: null,
    dbFields: [],
    inputs: [
      {
        field: "transcript",
        label: "Wynik Agenta 01 (JSON)",
        placeholder: "Wklej JSON z Agenta 01.",
      },
      {
        field: "agent2Json",
        label: "Brief z Agenta 02 (JSON) — opcjonalnie",
        placeholder: "Wklej JSON z Agenta 02.",
      },
    ],
    showClientSelector: false,
    writesNotion: false,
    hasThinking: false,
    clientFilter: [],
    roadmapSteps: [
      { label: "Oczekiwanie na dane klienta" },
      { label: "Identyfikacja sekcji do personalizacji" },
      { label: "Dostosowanie przykładów i liczb" },
      { label: "Generowanie parametrów URL" },
      { label: "Przygotowanie prezentacji" },
    ],
    systemPrompt: AGENT3_SYSTEM_PROMPT,
  },
  agent4: {
    num: "04",
    name: "Analiza Discovery",
    when: "Po rozmowie Discovery",
    db: "Notion Pipeline",
    dbFields: ["Wynik Discovery", "Kluczowe ustalenia", "Re-engagement", "Następny krok"],
    inputs: [
      {
        field: "transcript",
        label: "Transkrypt Discovery Call",
        placeholder: "Wklej transkrypt pełnej rozmowy Discovery Call.",
      },
    ],
    showClientSelector: true,
    writesNotion: true,
    hasThinking: false,
    requiresDriveFiles: true,
    cardStage: "sprzedazowa",
    clientFilter: ["Discovery umówione"],
    roadmapSteps: [
      { label: "Oczekiwanie na transkrypt" },
      { label: "Analiza jakości rozmowy" },
      { label: "Ocena potwierdzenia kryteriów" },
      { label: "Ekstrakcja kluczowych ustaleń" },
      { label: "Generowanie rekomendacji" },
      { label: "Zapis do Notion Pipeline" },
    ],
    systemPrompt: AGENT4_SYSTEM_PROMPT,
  },
  agent5: {
    num: "05",
    name: "Sesje szkoleniowe",
    when: "Po sesji Agency Leaders",
    db: null,
    dbFields: [],
    inputs: [
      {
        field: "transcript",
        label: "Transkrypt sesji Agency Leaders",
        placeholder: "Wklej transkrypt sesji z Fathom.",
      },
    ],
    showClientSelector: false,
    writesNotion: false,
    hasThinking: true,
    clientFilter: [],
    roadmapSteps: [
      { label: "Oczekiwanie na transkrypt sesji" },
      { label: "Analiza treści szkoleniowych" },
      { label: "Ekstrakcja kluczowych wniosków" },
      { label: "Generowanie raportu" },
    ],
    systemPrompt: AGENT5_SYSTEM_PROMPT,
  },
  agent6: {
    num: "06",
    name: "Analiza Narzędzia",
    when: "Ocena nowego narzędzia AI",
    db: null,
    dbFields: [],
    inputs: [
      {
        field: "transcript",
        label: "Opis narzędzia do oceny",
        placeholder: "Wklej opis narzędzia, biblioteki lub koncepcji do oceny.",
      },
    ],
    showClientSelector: false,
    writesNotion: false,
    hasThinking: false,
    clientFilter: [],
    roadmapSteps: [
      { label: "Oczekiwanie na opis narzędzia" },
      { label: "Analiza funkcjonalności" },
      { label: "Ocena przydatności dla Autorise" },
      { label: "Generowanie raportu" },
    ],
    systemPrompt: AGENT6_SYSTEM_PROMPT,
  },
  agentKwalifikacja: {
    num: "01",
    name: "Agent Kwalifikacja",
    when: "Po rozmowie kwalifikacyjnej",
    db: "Notion Pipeline",
    dbFields: [
      "Flota",
      "Spedytorzy",
      "TMS",
      "Ból główny",
      "Koszt problemu",
      "Ocena ICP",
      "Status",
      "Hipoteza ból główny",
      "Przewidywane obiekcje",
      "Pitch Recipe",
      "Cytaty klienta",
      "Personalizacja prezentacji",
    ],
    inputs: [
      {
        field: "transcript",
        label: "Transkrypt rozmowy kwalifikacyjnej",
        placeholder: "Wklej transkrypt rozmowy kwalifikacyjnej.",
      },
    ],
    showClientSelector: true,
    writesNotion: true,
    hasThinking: true,
    requiresDriveFiles: true,
    cardStage: "kwalifikacja",
    clientFilter: ["Nowy lead", "Kwalifikacja"],
    roadmapSteps: [
      { label: "Oczekiwanie na transkrypt" },
      { label: "Część A: kwalifikacja i ocena ICP" },
      { label: "Część B: brief do Discovery Call" },
      { label: "Część C: dane do personalizacji prezentacji" },
      { label: "Zapis do Notion Pipeline" },
    ],
    systemPrompt: KWALIFIKACJA_MERGED_SYSTEM_PROMPT,
  },
};

/** Card stage each agent auto-fills after a successful run (for the page orchestrator). */
export const CARD_STAGE_BY_AGENT: Partial<Record<AgentId, CardStage>> = Object.fromEntries(
  (Object.keys(CONFIGS) as AgentId[])
    .filter((id) => CONFIGS[id].cardStage)
    .map((id) => [id, CONFIGS[id].cardStage]),
) as Partial<Record<AgentId, CardStage>>;

// ── Client dropdown ─────────────────────────────────────────────────

function ClientDropdown({
  clients,
  selectedId,
  filter,
  onSelect,
}: {
  clients: PipelineClient[];
  selectedId: string;
  filter: string[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = clients.filter((c) => {
    const statusOk = filter.length === 0 || filter.includes(c.status);
    const searchOk = !q || c.name?.toLowerCase().includes(q.toLowerCase());
    return statusOk && searchOk;
  });

  const selected = clients.find((c) => c.id === selectedId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const STATUS_COLORS: Record<string, string> = {
    "Nowy lead": "var(--accent)",
    Kwalifikacja: "#af52de",
    "Discovery umówione": "var(--warning)",
    Finalizacja: "var(--success)",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "var(--bg-elevated)",
          border: `1px solid ${open ? "var(--accent)" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 8,
          transition: "border-color 0.15s",
        }}
      >
        <span
          style={{
            flex: 1,
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: selected ? "var(--text-primary)" : "var(--text-tertiary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selected ? selected.name : "Wybierz klienta..."}
        </span>
        <ChevronDown
          size={12}
          color="var(--text-tertiary)"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 200,
            background: "var(--glass)",
            backdropFilter: "var(--glass-blur)",
            WebkitBackdropFilter: "var(--glass-blur)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-menu)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "6px 6px 3px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                background: "var(--bg-hover)",
                borderRadius: "var(--radius-xs)",
              }}
            >
              <Search size={11} color="var(--text-tertiary)" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Szukaj klienta..."
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-primary)",
                }}
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <X size={10} color="var(--text-tertiary)" />
                </button>
              )}
            </div>
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto", padding: "3px 6px 6px" }}>
            {selectedId && (
              <button
                onClick={() => {
                  onSelect("");
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: "var(--radius-xs)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                Wyczyść wybór
              </button>
            )}
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "10px 8px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  textAlign: "center",
                }}
              >
                Brak klientów w tym etapie
              </div>
            ) : (
              filtered.map((c) => {
                const dot = STATUS_COLORS[c.status] ?? "var(--text-tertiary)";
                const isSelected = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelect(c.id);
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "var(--radius-xs)",
                      border: "none",
                      cursor: "pointer",
                      background: isSelected ? "var(--bg-active)" : "transparent",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "background 0.1s",
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: dot,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          fontWeight: isSelected ? 600 : 400,
                          color: "var(--text-primary)",
                        }}
                      >
                        {c.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                          marginTop: 1,
                        }}
                      >
                        {c.status}
                      </div>
                    </div>
                    {isSelected && <Check size={10} color="var(--accent)" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styled textarea ─────────────────────────────────────────────────

// ── Transcript Picker ───────────────────────────────────────────────

function TranscriptPicker({ onSelect }: { onSelect: (content: string) => void }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/google/drive/transcripts")
      .then((r) => r.json())
      .then((d: { success?: boolean; txt?: DriveFile[] }) => {
        if (d.success) setFiles(d.txt ?? []);
      })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  async function pick(file: DriveFile) {
    setLoadingId(file.id);
    try {
      const res = await fetch(`/api/google/drive/file/${file.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      onSelect(text);
      setOpen(false);
    } catch {
      /* silent */
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          borderRadius: "var(--radius-xs)",
          border: "1px solid var(--border)",
          background: "transparent",
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          color: "var(--text-secondary)",
          cursor: "pointer",
        }}
      >
        <HardDrive size={10} />
        Wczytaj z Drive
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 100,
            minWidth: 280,
            maxWidth: 360,
            maxHeight: 240,
            overflowY: "auto",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {loading ? (
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 6 }}>
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                }}
              >
                Ładowanie...
              </span>
            </div>
          ) : files.length === 0 ? (
            <div
              style={{
                padding: "12px 14px",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-tertiary)",
              }}
            >
              Brak plików TXT w Drive
            </div>
          ) : (
            files.map((f) => (
              <button
                key={f.id}
                onClick={() => void pick(f)}
                disabled={loadingId === f.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 14px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  opacity: loadingId === f.id ? 0.6 : 1,
                }}
              >
                {loadingId === f.id ? (
                  <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <HardDrive size={12} color="var(--text-tertiary)" />
                )}
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-primary)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.name}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Drive Attachments (TXT + MP3) for card-stage agents ─────────────

interface DriveAttachmentsState {
  attachedTxtName: string;
  attachedMp3Link: string;
  attachedClientName: string;
}

function FilePickerDropdown({
  files,
  loading,
  emptyLabel,
  loadingId,
  onPick,
  icon,
}: {
  files: DriveFile[];
  loading: boolean;
  emptyLabel: string;
  loadingId: string | null;
  onPick: (f: DriveFile) => void;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        right: 0,
        zIndex: 120,
        maxHeight: 220,
        overflowY: "auto",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {loading ? (
        <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
          <span
            style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-tertiary)" }}
          >
            Ładowanie...
          </span>
        </div>
      ) : files.length === 0 ? (
        <div
          style={{
            padding: "12px 14px",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          {emptyLabel}
        </div>
      ) : (
        files.map((f) => (
          <button
            key={f.id}
            onClick={() => onPick(f)}
            disabled={loadingId === f.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "8px 14px",
              textAlign: "left",
              background: "none",
              border: "none",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
              opacity: loadingId === f.id ? 0.6 : 1,
            }}
          >
            {loadingId === f.id ? (
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              icon
            )}
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-primary)",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {f.name}
            </span>
          </button>
        ))
      )}
    </div>
  );
}

function DriveAttachments({
  label,
  hasTranscript,
  attached,
  onSet,
}: {
  label: string;
  hasTranscript: boolean;
  attached: DriveAttachmentsState;
  onSet: (patch: Partial<DriveAttachmentsState & { transcript: string }>) => void;
}) {
  const [txt, setTxt] = useState<DriveFile[]>([]);
  const [mp3, setMp3] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [openTxt, setOpenTxt] = useState(false);
  const [openMp3, setOpenMp3] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/google/drive/transcripts")
      .then((r) => r.json())
      .then((d: { success?: boolean; txt?: DriveFile[]; mp3?: DriveFile[]; error?: string }) => {
        if (!active) return;
        if (d.success) {
          setTxt(d.txt ?? []);
          setMp3(d.mp3 ?? []);
        } else {
          setLoadErr(d.error ?? "Błąd Dysku");
        }
      })
      .catch(() => active && setLoadErr("Błąd połączenia z Dyskiem"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenTxt(false);
        setOpenMp3(false);
      }
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  function autoPairMp3(txtFile: DriveFile): DriveFile | null {
    const tParsed = parseClientFileName(txtFile.name);
    // Exact base-key match (same person + stage).
    const exact = mp3.find((m) => parseClientFileName(m.name).baseKey === tParsed.baseKey);
    if (exact) return exact;
    // Fallback: same person (ignore stage), most recent first (list already sorted desc).
    const person = tParsed.displayName.toLowerCase();
    return (
      mp3.find((m) => parseClientFileName(m.name).displayName.toLowerCase() === person) ?? null
    );
  }

  async function pickTxt(file: DriveFile) {
    setLoadingId(file.id);
    try {
      const res = await fetch(`/api/google/drive/file/${file.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = parseClientFileName(file.name);
      const paired = autoPairMp3(file);
      onSet({
        transcript: text,
        attachedTxtName: file.name,
        attachedClientName: parsed.displayName,
        attachedMp3Link: paired?.webViewLink ?? "",
      });
      setOpenTxt(false);
    } catch {
      setLoadErr("Nie udało się wczytać pliku TXT");
    } finally {
      setLoadingId(null);
    }
  }

  function pickMp3(file: DriveFile) {
    onSet({ attachedMp3Link: file.webViewLink });
    setOpenMp3(false);
  }

  const chipStyle = (ok: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 10px",
    borderRadius: "var(--radius-sm)",
    border: `1px solid ${ok ? "var(--success-border)" : "var(--border)"}`,
    background: ok ? "var(--success-bg)" : "var(--glass)",
    fontFamily: "var(--font-sans)",
    fontSize: 12,
  });

  return (
    <div
      ref={ref}
      style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}
    >
      <label
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
          letterSpacing: "0.02em",
        }}
      >
        {label} — załącz z Dysku
      </label>

      {loadErr && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "var(--error)",
          }}
        >
          <AlertTriangle size={11} />
          {loadErr}
        </div>
      )}

      {/* TXT row */}
      <div style={{ position: "relative" }}>
        {hasTranscript && attached.attachedTxtName ? (
          <div style={chipStyle(true)}>
            <FileText size={13} color="var(--success-text)" />
            <span
              style={{
                flex: 1,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {attached.attachedTxtName}
            </span>
            {attached.attachedClientName && (
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                {attached.attachedClientName}
              </span>
            )}
            <button
              onClick={() =>
                onSet({
                  transcript: "",
                  attachedTxtName: "",
                  attachedClientName: "",
                  attachedMp3Link: "",
                })
              }
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                padding: 2,
              }}
            >
              <X size={12} color="var(--text-tertiary)" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setOpenTxt((v) => !v);
              setOpenMp3(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "9px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px dashed var(--border)",
              background: "var(--glass)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            <FileText size={13} color="var(--text-tertiary)" />
            <span style={{ flex: 1, textAlign: "left" }}>Wybierz transkrypt TXT</span>
            <ChevronDown
              size={12}
              color="var(--text-tertiary)"
              style={{
                transform: openTxt ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            />
          </button>
        )}
        {openTxt && (
          <FilePickerDropdown
            files={txt}
            loading={loading}
            emptyLabel="Brak plików TXT w Dysku"
            loadingId={loadingId}
            onPick={(f) => void pickTxt(f)}
            icon={<FileText size={12} color="var(--text-tertiary)" />}
          />
        )}
      </div>

      {/* MP3 row */}
      <div style={{ position: "relative" }}>
        {attached.attachedMp3Link ? (
          <div style={chipStyle(true)}>
            <FileAudio size={13} color="var(--success-text)" />
            <span style={{ flex: 1, color: "var(--text-primary)" }}>Nagranie MP3 załączone</span>
            <a
              href={attached.attachedMp3Link}
              target="_blank"
              rel="noreferrer"
              style={{ display: "flex", color: "var(--text-secondary)" }}
            >
              <ExternalLink size={12} />
            </a>
            <button
              onClick={() => onSet({ attachedMp3Link: "" })}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                padding: 2,
              }}
            >
              <X size={12} color="var(--text-tertiary)" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setOpenMp3((v) => !v);
              setOpenTxt(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "9px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px dashed var(--warning-border, var(--border))",
              background: "var(--glass)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--warning)",
            }}
          >
            <AlertTriangle size={13} />
            <span style={{ flex: 1, textAlign: "left" }}>
              {hasTranscript ? "Brak MP3 — wybierz nagranie" : "Wybierz nagranie MP3"}
            </span>
            <ChevronDown
              size={12}
              style={{
                transform: openMp3 ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            />
          </button>
        )}
        {openMp3 && (
          <FilePickerDropdown
            files={mp3}
            loading={loading}
            emptyLabel="Brak plików MP3 w Dysku"
            loadingId={null}
            onPick={pickMp3}
            icon={<FileAudio size={12} color="var(--text-tertiary)" />}
          />
        )}
      </div>

      <div style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
        Wymagane: transkrypt TXT (treść dla agenta) i nagranie MP3 (link trafia do karty klienta).
      </div>
    </div>
  );
}

// ── Styled textarea ─────────────────────────────────────────────────

function StyledTextarea({
  value,
  onChange,
  label,
  placeholder,
  showPicker = false,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  showPicker?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <label
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary)",
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </label>
        {showPicker && <TranscriptPicker onSelect={(text) => onChange(text)} />}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Wklej treść..."}
        style={{
          width: "100%",
          flex: 1,
          resize: "none",
          boxSizing: "border-box",
          padding: "10px 12px",
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          lineHeight: 1.55,
          outline: "none",
          transition: "border-color 0.15s",
          minHeight: 80,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

// ── Right panel output ──────────────────────────────────────────────

function OutputPanel({
  agentId,
  state,
  onCopy,
  copied,
  onNotionPush,
  writesNotion,
  onRun,
}: {
  agentId: AgentId;
  state: AgentState;
  onCopy: () => void;
  copied: boolean;
  onNotionPush: () => void;
  writesNotion: boolean;
  onRun: () => void;
}) {
  if (state.status === "idle") return null;

  if (state.status === "running") {
    return (
      <Panel
        style={{
          padding: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <Loader2 size={16} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        <span
          style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)" }}
        >
          Analizuję rozmowę...
        </span>
      </Panel>
    );
  }

  if (state.status === "error") {
    return (
      <Panel
        style={{ padding: 16, background: "var(--error-bg)", borderColor: "rgba(255,69,58,0.2)" }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--error)",
            marginBottom: 4,
          }}
        >
          Błąd agenta
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--error)",
            lineHeight: 1.5,
          }}
        >
          {state.errorMsg}
        </div>
      </Panel>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Action bar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={onCopy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 12px",
            background: copied ? "var(--success-bg)" : "var(--glass)",
            backdropFilter: "var(--glass-blur)",
            border: `1px solid ${copied ? "var(--success-border)" : "var(--border)"}`,
            borderRadius: "var(--radius-xs)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 500,
            color: copied ? "var(--success-text)" : "var(--text-secondary)",
            transition: "all 0.15s",
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Skopiowano" : "Kopiuj"}
        </button>

        {state.loadedFromHistory && (
          <button
            onClick={onRun}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 12px",
              background: "var(--glass)",
              backdropFilter: "var(--glass-blur)",
              border: "1px solid var(--accent-border)",
              borderRadius: "var(--radius-xs)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--accent)",
            }}
          >
            <Play size={11} fill="currentColor" />
            Uruchom ponownie
          </button>
        )}

        {state.notionPageId && writesNotion && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 10px",
              background: "var(--success-bg)",
              border: "1px solid var(--success-border)",
              borderRadius: "var(--radius-xs)",
            }}
          >
            <CheckCircle2 size={10} color="var(--success-text)" />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--success-text)",
              }}
            >
              Zapisano w Notion
            </span>
          </div>
        )}

        {state.cardStatus === "saving" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 10px",
              background: "var(--glass)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
            }}
          >
            <Loader2
              size={10}
              color="var(--text-tertiary)"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-tertiary)",
              }}
            >
              Zapisuję kartę…
            </span>
          </div>
        )}
        {state.cardStatus === "saved" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 10px",
              background: "var(--success-bg)",
              border: "1px solid var(--success-border)",
              borderRadius: "var(--radius-xs)",
            }}
          >
            <CheckCircle2 size={10} color="var(--success-text)" />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--success-text)",
              }}
            >
              Karta klienta zaktualizowana
            </span>
          </div>
        )}
        {state.cardStatus === "error" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 10px",
              background: "var(--error-bg)",
              border: "1px solid var(--error-border)",
              borderRadius: "var(--radius-xs)",
            }}
            title={state.cardError ?? undefined}
          >
            <AlertTriangle size={10} color="var(--error)" />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--error)",
              }}
            >
              Błąd zapisu karty
            </span>
          </div>
        )}

        {state.elapsed != null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginLeft: "auto",
              padding: "6px 0",
            }}
          >
            <Clock size={10} color="var(--text-tertiary)" />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-tertiary)",
              }}
            >
              {state.elapsed < 60
                ? `${state.elapsed}s`
                : `${Math.floor(state.elapsed / 60)}m ${state.elapsed % 60}s`}
            </span>
          </div>
        )}
      </div>

      {state.notionError && (
        <div
          style={{
            padding: "8px 12px",
            background: "var(--error-bg)",
            border: "1px solid var(--error-border)",
            borderRadius: "var(--radius-xs)",
          }}
        >
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--error)" }}>
            {state.notionError}
          </span>
        </div>
      )}

      {/* Output card */}
      <div>
        {agentId === "agent1" && <Agent1Card output={state.output as Agent1Output} />}
        {agentId === "agent2" && <Agent2Card output={state.output as Agent2Output} />}
        {agentId === "agent3" && <Agent3Card output={state.output as Agent3Output} />}
        {agentId === "agent4" && <Agent4Card output={state.output as Agent4Output} />}
        {agentId === "agentKwalifikacja" && (
          <AgentKwalifikacjaCard output={state.output as KwalifikacjaMergedOutput} />
        )}
        {(agentId === "agent5" || agentId === "agent6") && (
          <Panel style={{ padding: 16 }}>
            <pre
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--text-primary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {typeof state.output === "string"
                ? state.output
                : JSON.stringify(state.output, null, 2)}
            </pre>
          </Panel>
        )}
      </div>
    </div>
  );
}

// ── Notion fields list ──────────────────────────────────────────────

function NotionFields({ db, fields }: { db: string | null; fields: string[] }) {
  if (!db)
    return (
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}>
        Wynik nie jest zapisywany do bazy danych.
      </div>
    );
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Database size={12} color="var(--accent)" />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {db}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {fields.map((f) => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={10} color="var(--success-text)" />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              {f}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main workspace ──────────────────────────────────────────────────

export function AgentWorkspace({
  agentId,
  state,
  clients,
  health: _health,
  healthLoading: _healthLoading,
  selectedClientId,
  onBack,
  onFieldChange,
  onClientSelect,
  onRun,
  onNotionPush,
  onCopy,
  copied,
  bypassDriveRequirement,
  transcriptFieldOverride,
}: AgentWorkspaceProps) {
  const cfg = CONFIGS[agentId];

  const filesReady =
    !cfg.requiresDriveFiles ||
    bypassDriveRequirement ||
    (state.transcript.trim().length > 0 && state.attachedMp3Link.length > 0);
  const runDisabled = state.status === "running" || !filesReady;

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Top bar */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 20px",
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderBottom: "1px solid var(--border)",
          zIndex: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={12} />
          Agenci wspomagania sprzedaży
        </button>

        <div style={{ width: 1, height: 16, background: "var(--border)" }} />

        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            letterSpacing: "0.04em",
          }}
        >
          {cfg.num}
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {cfg.name}
        </span>
        {cfg.hasThinking && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--accent)",
              background: "var(--accent-muted)",
              padding: "2px 8px",
              borderRadius: "var(--radius-xs)",
            }}
          >
            <Brain size={10} />
            Thinking
          </span>
        )}
        {state.elapsed != null && (
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <Clock size={10} />
            {state.elapsed < 60
              ? `${state.elapsed}s`
              : `${Math.floor(state.elapsed / 60)}m ${state.elapsed % 60}s`}
          </span>
        )}
      </div>

      {/* Body: 2/5 + 3/5 */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT 2/5 */}
        <div
          style={{
            flex: 2,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "16px 14px 16px 20px",
            borderRight: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          {/* Info panel */}
          <Panel padding={14} style={{ flexShrink: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                marginBottom: 8,
              }}
            >
              O narzędziu
            </div>
            <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-sans)",
                  flexShrink: 0,
                  width: 68,
                }}
              >
                Uruchomienie
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {cfg.when}
              </div>
            </div>
            <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
            <NotionFields db={cfg.db} fields={cfg.dbFields} />
          </Panel>

          {/* Client selector */}
          {cfg.showClientSelector && (
            <div style={{ flexShrink: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  marginBottom: 5,
                  paddingLeft: 2,
                }}
              >
                Klient
              </div>
              <ClientDropdown
                clients={clients}
                selectedId={selectedClientId}
                filter={cfg.clientFilter}
                onSelect={onClientSelect}
              />
            </div>
          )}

          {/* Input fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
            {cfg.inputs.map((inp) => (
              <div
                key={inp.field}
                style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
              >
                {cfg.requiresDriveFiles && !bypassDriveRequirement && inp.field === "transcript" ? (
                  <DriveAttachments
                    label={inp.label}
                    hasTranscript={state.transcript.trim().length > 0}
                    attached={{
                      attachedTxtName: state.attachedTxtName,
                      attachedMp3Link: state.attachedMp3Link,
                      attachedClientName: state.attachedClientName,
                    }}
                    onSet={(patch) => {
                      (Object.keys(patch) as Array<keyof typeof patch>).forEach((k) => {
                        onFieldChange(k as keyof AgentState, patch[k] as string);
                      });
                    }}
                  />
                ) : (
                  <StyledTextarea
                    label={
                      inp.field === "transcript" && transcriptFieldOverride
                        ? transcriptFieldOverride.label
                        : inp.label
                    }
                    placeholder={
                      inp.field === "transcript" && transcriptFieldOverride
                        ? transcriptFieldOverride.placeholder
                        : inp.placeholder
                    }
                    value={state[inp.field] as string}
                    onChange={(v) => onFieldChange(inp.field, v)}
                    showPicker={inp.field === "transcript" && !bypassDriveRequirement}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Run button */}
          <div style={{ flexShrink: 0 }}>
            <Button
              variant="primary"
              fullWidth
              size="md"
              loading={state.status === "running"}
              disabled={runDisabled}
              onClick={onRun}
            >
              {state.status === "running" ? (
                "Trwa analiza..."
              ) : cfg.hasThinking ? (
                <>
                  <Brain size={13} />
                  Uruchom Agenta {cfg.num}
                </>
              ) : (
                <>
                  <Play size={12} fill="currentColor" />
                  Uruchom Agenta {cfg.num}
                </>
              )}
            </Button>
            {cfg.requiresDriveFiles &&
              !bypassDriveRequirement &&
              !filesReady &&
              state.status !== "running" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 6,
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  <AlertTriangle size={11} color="var(--warning)" />
                  Załącz transkrypt TXT i nagranie MP3 z Dysku, aby uruchomić.
                </div>
              )}
          </div>

          {/* Prompt viewer */}
          <div style={{ flexShrink: 0 }}>
            <PromptViewer prompt={cfg.systemPrompt} />
          </div>
        </div>

        {/* RIGHT 3/5 */}
        <div
          style={{
            flex: 3,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: "16px 20px 16px 14px",
            overflowY: "auto",
          }}
        >
          {/* Output */}
          <OutputPanel
            agentId={agentId}
            state={state}
            onCopy={onCopy}
            copied={copied}
            onNotionPush={onNotionPush}
            writesNotion={cfg.writesNotion}
            onRun={onRun}
          />

          {state.status === "idle" && (
            <Panel
              padding={24}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minHeight: 120,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                Wklej dane i uruchom narzędzie, aby zobaczyć wynik.
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
