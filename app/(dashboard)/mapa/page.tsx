"use client";

import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Flag,
  GitBranch,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Split,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { OBJECTIONS_D, STEPS_D } from "@/lib/scripts/discovery";
import { OBJECTIONS_K, STEPS_K } from "@/lib/scripts/kwalifikacyjna";
import type { Objection, Step } from "@/lib/scripts/types";

// ── Blueprint danych — DATA_FLOW ──────────────────────────────────────

type NodeKind = "input" | "process" | "storage";

interface DataNode {
  id: string;
  label: string;
  sublabel: string;
  kind: NodeKind;
  connections: string[];
  usedBy: string[];
}

const NODE_COLOR: Record<NodeKind, string> = {
  input: "#0a84ff",
  process: "#7c3aed",
  storage: "#16a34a",
};

const NODE_BG: Record<NodeKind, string> = {
  input: "rgba(10,132,255,0.06)",
  process: "rgba(124,58,237,0.06)",
  storage: "rgba(22,163,74,0.06)",
};

const NODE_LABEL: Record<NodeKind, string> = {
  input: "Wejście",
  process: "Agent / Proces",
  storage: "Dane",
};

const NODE_ICON = {
  input: <GitBranch size={14} />,
  process: <Zap size={14} />,
  storage: <Database size={14} />,
};

const DATA_FLOW: DataNode[] = [
  {
    id: "formularz",
    label: "Formularz META / Strona",
    sublabel: "Lead z reklamy Facebook lub strony landing",
    kind: "input",
    connections: ["agent0", "pipeline"],
    usedBy: [],
  },
  {
    id: "agent0",
    label: "Agent 0 — Enrichment",
    sublabel: "KRS / MF API — weryfikacja firmy i VAT",
    kind: "process",
    connections: ["pipeline"],
    usedBy: ["agent1"],
  },
  {
    id: "transkrypt_k",
    label: "Transkrypt kwalifikacji",
    sublabel: "Nagranie z AudioRecorder → Groq Whisper",
    kind: "input",
    connections: ["agent1"],
    usedBy: [],
  },
  {
    id: "agent1",
    label: "Agent 1 — Kwalifikacja",
    sublabel: "Analiza transkryptu → karta klienta + status ICP",
    kind: "process",
    connections: ["pipeline"],
    usedBy: ["/kwalifikacja", "/pipeline"],
  },
  {
    id: "pipeline",
    label: "Notion Pipeline",
    sublabel: "Centralna baza klientów — 15+ pól, 8 statusów",
    kind: "storage",
    connections: [],
    usedBy: ["agent1", "agent2", "agent3", "agent4", "/mapa", "/pipeline"],
  },
  {
    id: "agent2",
    label: "Agent 2 — Pre-Discovery Brief",
    sublabel: "Opus 4.8 + thinking — brief + pitch_recipe",
    kind: "process",
    connections: ["pipeline"],
    usedBy: ["/sprzedaz"],
  },
  {
    id: "agent3",
    label: "Agent 3 — Personalizacja prezentacji",
    sublabel: "Opus 4.8 — dane do Autorise_Prezentacja.html",
    kind: "process",
    connections: ["prezentacja"],
    usedBy: ["/sprzedaz"],
  },
  {
    id: "transkrypt_d",
    label: "Transkrypt Discovery Call",
    sublabel: "Nagranie z Fathom → pełny transkrypt spotkania",
    kind: "input",
    connections: ["agent4"],
    usedBy: [],
  },
  {
    id: "agent4",
    label: "Agent 4 — Analiza Discovery",
    sublabel: "Sonnet 4.6 — analiza rozmowy + wynik + re-engagement",
    kind: "process",
    connections: ["pipeline"],
    usedBy: ["/agenci"],
  },
  {
    id: "prezentacja",
    label: "Prezentacja HTML",
    sublabel: "autorise.pl/prezentacja — spersonalizowana dla klienta",
    kind: "storage",
    connections: [],
    usedBy: ["agent3", "/sprzedaz"],
  },
  {
    id: "agent5",
    label: "Agent 5 — Agency Leaders",
    sublabel: "Opus 4.8 + thinking — Knowledge Report ze spotkania",
    kind: "process",
    connections: ["raport"],
    usedBy: ["/sesje"],
  },
];

function BlueprintView() {
  const rows: NodeKind[] = ["input", "process", "storage"];

  return (
    <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
      {rows.map((kind) => {
        const nodes = DATA_FLOW.filter((n) => n.kind === kind);
        const color = NODE_COLOR[kind];
        return (
          <div key={kind} style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                color,
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {NODE_ICON[kind]}
              {NODE_LABEL[kind]}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 12,
              }}
            >
              {nodes.map((node) => (
                <div
                  key={node.id}
                  style={{
                    background: NODE_BG[kind],
                    border: `1px solid ${color}30`,
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      lineHeight: 1.3,
                    }}
                  >
                    {node.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      lineHeight: 1.45,
                    }}
                  >
                    {node.sublabel}
                  </div>

                  {node.connections.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--text-tertiary)",
                          marginBottom: 4,
                        }}
                      >
                        Przekazuje do
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {node.connections.map((cid) => {
                          const target = DATA_FLOW.find((n) => n.id === cid);
                          const tcolor = target ? NODE_COLOR[target.kind] : "var(--text-tertiary)";
                          return (
                            <span
                              key={cid}
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: 10,
                                fontWeight: 600,
                                color: tcolor,
                                background: `${tcolor}12`,
                                border: `1px solid ${tcolor}30`,
                                borderRadius: 5,
                                padding: "2px 7px",
                              }}
                            >
                              {target?.label ?? cid}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {node.usedBy.length > 0 && (
                    <div style={{ marginTop: node.connections.length > 0 ? 2 : 4 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--text-tertiary)",
                          marginBottom: 4,
                        }}
                      >
                        Używany przez
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {node.usedBy.map((u) => (
                          <span
                            key={u}
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 10,
                              color: "var(--text-secondary)",
                              background: "var(--bg-hover)",
                              border: "1px solid var(--border)",
                              borderRadius: 5,
                              padding: "2px 7px",
                            }}
                          >
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Drzewo kroków — pochodzi bezpośrednio z STEPS_K/STEPS_D/OBJECTIONS_K/OBJECTIONS_D ──
// Celowo NIE jest to osobna, ręcznie pisana struktura — czyta te same dane co realny
// skrypt w /kwalifikacja i /sprzedaz, więc nie może się z czasem rozjechać z żywą treścią.

function firstLineText(step: Step): string {
  const line = step.lines[0];
  if (!line) return "";
  return Array.isArray(line.text) ? line.text[0] : line.text;
}

function isTerminalStep(step: Step, allSteps: Step[]): boolean {
  if (step.decision || step.nextStepId) return false;
  const isLast = allSteps[allSteps.length - 1]?.id === step.id;
  return isLast || /koniec|closing|zaproszenie|spotkanie/i.test(step.id);
}

function StepRow({
  step,
  allSteps,
  objections,
  color,
}: {
  step: Step;
  allSteps: Step[];
  objections: Objection[];
  color: string;
}) {
  const [open, setOpen] = useState(false);
  const terminal = isTerminalStep(step, allSteps);
  const opis = firstLineText(step);

  const findLabel = (id: string) =>
    allSteps.find((s) => s.id === id)?.label ?? objections.find((o) => o.id === id)?.label ?? id;

  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderRadius: 8,
          border: `1px solid ${terminal ? "var(--border)" : `${color}30`}`,
          background: terminal
            ? "rgba(22,163,74,0.05)"
            : step.decision
              ? "rgba(217,119,6,0.05)"
              : `${color}06`,
          borderLeft: `3px solid ${terminal ? "#16a34a" : step.decision ? "#d97706" : color}`,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {open ? (
          <ChevronDown size={12} color="var(--text-tertiary)" />
        ) : (
          <ChevronRight size={12} color="var(--text-tertiary)" />
        )}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            minWidth: 24,
          }}
        >
          {step.nr}
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--text-primary)",
            flex: 1,
          }}
        >
          {step.label}
        </span>
        {step.decision && <Split size={12} color="#d97706" />}
        {terminal && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#16a34a",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Koniec
          </span>
        )}
      </button>
      {open && (
        <div
          style={{ padding: "8px 10px 8px 34px", display: "flex", flexDirection: "column", gap: 6 }}
        >
          {opis && (
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                fontStyle: "italic",
              }}
            >
              „{opis}"
            </p>
          )}
          {step.decision?.options.map((opt, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Split size={10} color="#d97706" style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#d97706" }}>
                {opt.trigger}
              </span>
              {(opt.goToStepId || opt.openObjectionId) && (
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  : {findLabel(opt.goToStepId ?? opt.openObjectionId ?? "")}
                </span>
              )}
            </div>
          ))}
          {!step.decision && step.nextStepId && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ArrowRight size={10} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                {findLabel(step.nextStepId)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScriptTreeView() {
  const [openPhase, setOpenPhase] = useState<"k" | "d" | null>("k");

  const phases: {
    id: "k" | "d";
    label: string;
    sublabel: string;
    color: string;
    steps: Step[];
    objections: Objection[];
  }[] = [
    {
      id: "k",
      label: "Kwalifikacja",
      sublabel: `${STEPS_K.length} kroków`,
      color: "#0a84ff",
      steps: STEPS_K,
      objections: OBJECTIONS_K,
    },
    {
      id: "d",
      label: "Discovery Call (Kimura Framework)",
      sublabel: `${STEPS_D.length} kroków`,
      color: "#7c3aed",
      steps: STEPS_D,
      objections: OBJECTIONS_D,
    },
  ];

  return (
    <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
      {phases.map((phase) => {
        const isOpen = openPhase === phase.id;
        return (
          <div key={phase.id} style={{ marginBottom: 16 }}>
            <button
              onClick={() => setOpenPhase(isOpen ? null : phase.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                borderRadius: 10,
                border: `1px solid ${phase.color}30`,
                borderLeft: `3px solid ${phase.color}`,
                background: `${phase.color}08`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {isOpen ? (
                <ChevronDown size={14} color={phase.color} />
              ) : (
                <ChevronRight size={14} color={phase.color} />
              )}
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  flex: 1,
                }}
              >
                {phase.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                {phase.sublabel}
              </span>
            </button>
            {isOpen && (
              <div style={{ marginTop: 8, paddingLeft: 4 }}>
                {phase.steps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    allSteps={phase.steps}
                    objections={phase.objections}
                    color={phase.color}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Mapowanie statusu → indeks etapu (0-3)
function statusToStageIdx(status: string): number {
  const s = (status ?? "").toLowerCase();
  if (s.includes("nowy") || s.includes("kwalifik")) return 0;
  if (s.includes("discovery") || s.includes("analiz") || s.includes("ofert")) return 1;
  if (s.includes("finaliz") || s.includes("negocj")) return 2;
  if (
    s.includes("aktyw") ||
    s.includes("pozysk") ||
    s.includes("wdroż") ||
    s.includes("wdroz") ||
    s.includes("retainer") ||
    s.includes("klient")
  )
    return 3;
  return -1;
}

const STAGES = [
  {
    etap: "ETAP 1",
    label: "Zimny kontakt",
    sublabel: "Kwalifikacja telefoniczna",
    color: "#0a84ff",
    steps: [
      "Prospecting — META Ads / baza własna",
      "Pierwszy telefon (skrypt kwalifikacyjny)",
      "Weryfikacja ICP — flota, TMS, decydent",
      "Kalkulator ROI — min. 80h/mc potencjału",
      "Umówienie Analizy diagnostycznej",
    ],
    exits: [
      { label: "Niekwalifikowany", reason: "Za mały, inny rynek, brak decydenta, potencjał < 80h" },
      { label: "Brak odbioru", reason: "Kolejka: ponów D+1, D+3, D+7, SMS po 3 próbach" },
    ],
    next: "Kwalifikacja: Discovery umówione",
  },
  {
    etap: "ETAP 2",
    label: "Analiza diagnostyczna",
    sublabel: "Discovery Call — diagnoza + ofertowanie",
    color: "#7c3aed",
    steps: [
      "Pre-Discovery Brief — Agent 2 (przeczytaj w całości)",
      "Personalizacja prezentacji — Agent 3",
      "Zbieranie informacji — ból, poprzednie próby, decydent",
      "Prezentacja Autorise + demo modułów",
      "Kalkulator ROI na żywo + gwarancja",
    ],
    exits: [
      { label: "Niekwalifikowany", reason: "ICP nie pasuje, brak bólu, brak budżetu" },
      { label: "Follow-up", reason: "Drugi decydent, budżet za X dni — ustal konkretną datę" },
    ],
    next: "Oferta złożona — Finalizacja",
  },
  {
    etap: "ETAP 3",
    label: "Finalizacja",
    sublabel: "Negocjacje i zamknięcie",
    color: "#d97706",
    steps: [
      "Odpowiedź na obiekcje cenowe i wątpliwości",
      "Oferta spersonalizowana — warianty jeśli potrzeba",
      "Rozmowa finalizacyjna — closing",
      "Umowa podpisana / przedpłata",
    ],
    exits: [
      { label: "Odrzucenie", reason: "Re-engagement po 90 dniach — nie trać kontaktu" },
      { label: "Negocjacje", reason: "Wariant cenowy / etapowanie płatności" },
    ],
    next: "Kickoff umówiony",
  },
  {
    etap: "ETAP 4",
    label: "Wdrożenie i Retainer",
    sublabel: "Klient aktywny — opieka stała",
    color: "#16a34a",
    steps: [
      "Kickoff — onboarding, dostępy, harmonogram",
      "Wdrożenie modułów — 4–8 tygodni",
      "Weryfikacja: min. 80h/mc zaoszczędzonych",
      "Przejście na Retainer — opieka stała",
      "Upsell — kolejne moduły i referrals",
    ],
    exits: [{ label: "Pause", reason: "Renegocjacja zakresu lub budżetu — działaj proaktywnie" }],
    next: "Klient aktywny",
  },
];

// ── Pełny lejek — paleta dokumentowa (spójna z public/prezentacja.html) ──

const LJ_ASPHALT = "#1B1D22";
const LJ_ACCENT = "#F5A623";
const LJ_RED = "#C1443A";
const LJ_SUCCESS = "#2F7D5C";
const LJ_BORDER = "rgba(27,29,34,0.14)";
const LJ_BORDER_STRONG = "rgba(27,29,34,0.24)";

const SOURCE_OPTIONS = ["META Ads", "Polecenie", "LinkedIn", "Cold outreach", "Inne"];

type FunnelTone = "neutral" | "accent" | "success" | "negative" | "source";

interface FunnelBranch {
  label: string;
  targetId: string;
  tone: FunnelTone;
  note: string;
}

interface FunnelSubStep {
  week: string;
  label: string;
}

interface FunnelReturnItem {
  label: string;
}

interface FunnelNode {
  id: string;
  nr: string;
  title: string;
  subtitle?: string;
  tone: FunnelTone;
  isBranch?: boolean;
  agent: string;
  entry: string;
  exit: string;
  statusKey?: string;
  branches?: FunnelBranch[];
  subSteps?: FunnelSubStep[];
  returnItems?: FunnelReturnItem[];
  loopNote?: string;
  endNote?: string;
}

const FUNNEL_NODES: FunnelNode[] = [
  {
    id: "source",
    nr: "00",
    title: "Źródło leada",
    subtitle: "Pole Źródło",
    tone: "source",
    agent: "Pole Źródło w Notion Pipeline: META Ads, Polecenie, LinkedIn, Cold outreach, Inne.",
    entry: "Formularz wypełniony albo pierwszy kontakt nawiązany jednym z kanałów.",
    exit: "Agent 0 rejestruje lead w Pipeline i wzbogaca dane firmowe (KRS, MF), zanim trafi do setterów.",
  },
  {
    id: "nowy-lead",
    nr: "01",
    title: "Nowy lead",
    tone: "neutral",
    agent: "Agent 0: rejestracja i wzbogacenie danych (KRS, MF), zanim setter wykona pierwszy telefon.",
    entry: "Lead pojawił się z jednego ze źródeł i został zapisany w Pipeline.",
    exit: "Setter dzwoni pierwszy raz według skryptu kwalifikacyjnego: status zmienia się na Kwalifikacja.",
    statusKey: "Nowy lead",
  },
  {
    id: "kwalifikacja",
    nr: "02",
    title: "Kwalifikacja",
    tone: "accent",
    isBranch: true,
    agent:
      "Agent 1, kwalifikacja telefoniczna (Sonnet 4.6): ocenia ICP na żywo podczas rozmowy i zapisuje wynik wprost do Pipeline.",
    entry: "Setter przeprowadził rozmowę według skryptu kwalifikacyjnego (Opening, Diagnoza, Spotkanie).",
    exit: "Agent 1 klasyfikuje rozmowę na jedną z trzech gałęzi.",
    statusKey: "Kwalifikacja",
    branches: [
      {
        label: "Discovery umówione",
        targetId: "discovery-umowione",
        tone: "neutral",
        note: "ICP spełnione i termin Discovery Call potwierdzony w Calendly.",
      },
      {
        label: "Nieaktywny (follow up)",
        targetId: "nieaktywny",
        tone: "accent",
        note: "ICP spełnione, ale konkretny, udokumentowany powód odroczenia.",
      },
      {
        label: "Niekwalifikowany",
        targetId: "niekwalifikowany",
        tone: "negative",
        note: "ICP nie pasuje albo brak decydenta po stronie klienta.",
      },
    ],
  },
  {
    id: "discovery-umowione",
    nr: "03",
    title: "Discovery umówione",
    tone: "neutral",
    agent:
      "Agent 2, pre-discovery brief (Opus 4.8, extended thinking): hipoteza bólu, przewidywane obiekcje, pitch recipe. Agent 3 personalizuje prezentację pod ten brief.",
    entry: "Agent 1 zakwalifikował leada, a termin Discovery Call jest potwierdzony.",
    exit: "Discovery Call się odbywa (Fathom nagrywa rozmowę), po czym Agent 4 analizuje wynik.",
    statusKey: "Discovery umówione",
  },
  {
    id: "discovery-analiza",
    nr: "04",
    title: "Discovery Call",
    subtitle: "Analiza rozmowy",
    tone: "accent",
    isBranch: true,
    agent:
      "Agent 4, analiza Discovery Call (Sonnet 4.6): czyta transkrypt i klasyfikuje wynik w polu Wynik Discovery (TAK / NIE / W TRAKCIE).",
    entry: "Spotkanie Discovery Call się odbyło i transkrypt jest dostępny do analizy.",
    exit:
      "TAK: Finalizacja. NIE: Niekwalifikowany. W TRAKCIE: klient zostaje w Discovery umówione do czasu decyzji.",
    branches: [
      {
        label: "Finalizacja",
        targetId: "finalizacja",
        tone: "neutral",
        note: "Wynik Discovery: TAK.",
      },
      {
        label: "Niekwalifikowany",
        targetId: "niekwalifikowany",
        tone: "negative",
        note: "Wynik Discovery: NIE.",
      },
    ],
  },
  {
    id: "finalizacja",
    nr: "05",
    title: "Finalizacja",
    tone: "neutral",
    agent: "Ręcznie: rozmowa finalizacyjna, obsługa obiekcji cenowych, przygotowanie i podpisanie umowy.",
    entry: "Agent 4 ocenił wynik Discovery Call jako TAK.",
    exit: "Umowa podpisana albo przedpłata potwierdzona: status zmienia się na Kickoff.",
    statusKey: "Finalizacja",
  },
  {
    id: "kickoff",
    nr: "06",
    title: "Kickoff",
    tone: "neutral",
    agent: "Ręcznie: onboarding, konfiguracja dostępów, ustalenie harmonogramu wdrożenia z klientem.",
    entry: "Umowa podpisana albo przedpłata potwierdzona.",
    exit: "Start czterotygodniowego procesu wdrożenia.",
    statusKey: "Kickoff",
  },
  {
    id: "wdrozenie",
    nr: "07",
    title: "Wdrożenie",
    subtitle: "4 tygodnie",
    tone: "neutral",
    agent:
      "Zespół wdrożeniowy: Discovery procesów, integracja z TMS, testy na realnych danych, uruchomienie live.",
    entry: "Kickoff zakończony, dostępy skonfigurowane.",
    exit: "System działa na produkcji: zaczyna się 30-dniowe okno weryfikacji gwarancji.",
    statusKey: "Wdrożenie",
    subSteps: [
      { week: "Tydzień 1", label: "Discovery procesów" },
      { week: "Tydzień 2-3", label: "Integracja z TMS" },
      { week: "Tydzień 3", label: "Testy na danych" },
      { week: "Tydzień 4", label: "Live" },
    ],
  },
  {
    id: "weryfikacja",
    nr: "08",
    title: "Weryfikacja gwarancji",
    subtitle: "30 dni",
    tone: "neutral",
    agent: "Porównanie godzin zaoszczędzonych miesięcznie z progiem gwarancji (minimum 80h/mc).",
    entry: "System działa na produkcji od co najmniej 30 dni na realnych zleceniach.",
    exit:
      "Próg spełniony: Retainer. Próg niespełniony: renegocjacja zakresu albo przedłużenie wdrożenia, obsługiwane ręcznie.",
  },
  {
    id: "retainer",
    nr: "09",
    title: "Retainer",
    tone: "success",
    agent: "Opieka stała: monitoring wykorzystania, kontakt cykliczny, wsparcie bieżące.",
    entry: "Gwarancja potwierdzona: minimum 80h/mc zaoszczędzone po 30 dniach.",
    exit: "Ciągła współpraca. Wyzwalacz rozszerzenia zakresu przenosi klienta do Upsell.",
    statusKey: "Retainer",
  },
  {
    id: "upsell",
    nr: "10",
    title: "Upsell",
    tone: "accent",
    isBranch: true,
    agent:
      "Inicjowane ręcznie przez opiekuna klienta, gdy pojawi się wyzwalacz: nowy oddział, rozszerzenie floty o kolejne pojazdy, albo dodatkowy moduł nie wdrożony przy pierwszym zakresie (np. Payment Monitor, WhatsApp Alerts).",
    entry: "Klient jest aktywny na Retainer i pojawia się konkretny wyzwalacz rozszerzenia.",
    exit: "Nowy zakres wdrożony: klient wraca na Retainer. Pętla może się powtórzyć przy kolejnym wyzwalaczu.",
    statusKey: "Upsell",
    loopNote:
      "Węzeł zawija się do samego siebie: ten sam klient może przechodzić przez Upsell wielokrotnie w trakcie współpracy.",
  },
  {
    id: "zakonczona",
    nr: "11",
    title: "Zakończona współpraca",
    tone: "success",
    agent:
      "Kontrakt wygasa albo zostaje zakończony z dowolnego powodu: koniec umowy, redukcja floty, zmiana strategii klienta.",
    entry: "Retainer albo Upsell kończy się z dowolnego powodu.",
    exit: "Węzeł końcowy dla aktywnej współpracy, ale nie ślepy koniec dla relacji.",
    statusKey: "Zakończona współpraca",
    endNote: "Jeśli klient wraca po jakimś czasie: proces startuje ponownie od Kwalifikacja, jako re-engagement.",
  },
  {
    id: "niekwalifikowany",
    nr: "N1",
    title: "Niekwalifikowany",
    tone: "negative",
    agent: "Wynik decyzji Agenta 1 (kwalifikacja telefoniczna) albo Agenta 4 (analiza Discovery Call).",
    entry: "ICP nie pasuje, brak decydenta, brak bólu albo jawna odmowa w dowolnym momencie procesu.",
    exit: "Karta zostaje w Pipeline. Uczciwy wynik, nie porażka: może wrócić przez re-engagement, jeśli sytuacja klienta się zmieni.",
    statusKey: "Niekwalifikowany",
    returnItems: [{ label: "Poza ICP: re-engagement" }],
  },
  {
    id: "nieaktywny",
    nr: "N2",
    title: "Nieaktywny (follow up)",
    tone: "accent",
    agent: "Agent 1: wyraźne 'nie teraz' z konkretnym, udokumentowanym powodem, nigdy ogólnikowe odłożenie.",
    entry:
      "Klient spełnia ICP, ale ma udokumentowany powód: urlop dłuższy niż dwa tygodnie, aktualnie wdraża inny TMS, budżet dostępny dopiero za X miesięcy, brak bólu po dwóch próbach kontaktu.",
    exit: "Agent ustala datę re-engagement (plus 30 dni, jeśli klient jej nie podał) i wraca do Kwalifikacja z jednym z pięciu typów follow-up.",
    statusKey: "Nieaktywny (follow up)",
    returnItems: [
      { label: "Dograne wspólnika/decydenta" },
      { label: "Brak 2 minut" },
      { label: "Re-engagement" },
      { label: "Po Discovery: niezdecydowany" },
      { label: "Poza ICP: re-engagement" },
    ],
  },
];

function funnelToneColor(tone: FunnelTone): string {
  switch (tone) {
    case "accent":
      return LJ_ACCENT;
    case "success":
      return LJ_SUCCESS;
    case "negative":
      return LJ_RED;
    case "source":
      return LJ_BORDER_STRONG;
    default:
      return LJ_ASPHALT;
  }
}

function FunnelStamp({ nr, tone }: { nr: string; tone: FunnelTone }) {
  const color = funnelToneColor(tone);
  return (
    <div
      style={{
        width: 32,
        height: 32,
        flexShrink: 0,
        transform: "rotate(-4deg)",
        border: `1.5px solid ${color}`,
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: 11,
          fontWeight: 800,
          color,
        }}
      >
        {nr}
      </span>
    </div>
  );
}

interface FunnelCardProps {
  node: FunnelNode;
  count: number | null;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}

function FunnelCard({ node, count, active, onClick, compact }: FunnelCardProps) {
  const [hover, setHover] = useState(false);
  const color = funnelToneColor(node.tone);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        width: compact ? 260 : "100%",
        maxWidth: compact ? 260 : 560,
        textAlign: "left",
        cursor: "pointer",
        padding: compact ? "9px 11px" : "13px 16px",
        background: active ? "rgba(0,0,0,0.03)" : hover ? "rgba(0,0,0,0.015)" : "#fff",
        border: `1px solid ${active ? color : LJ_BORDER}`,
        borderBottom: `2px solid ${active ? color : LJ_BORDER_STRONG}`,
        borderRadius: 6,
        transition: "background 120ms, border-color 120ms",
      }}
    >
      <FunnelStamp nr={node.nr} tone={node.tone} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: compact ? 12.5 : 14,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {node.title}
          </span>
          {node.isBranch && <Split size={12} color={LJ_ACCENT} />}
        </div>
        {node.subtitle && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 1,
            }}
          >
            {node.subtitle}
          </div>
        )}
        {count !== null && (
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: 11,
              fontWeight: 700,
              color,
              marginTop: 4,
            }}
          >
            {count} {count === 1 ? "karta dziś" : "kart dziś"}
          </div>
        )}
        {node.subSteps && (
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {node.subSteps.map((s) => (
              <div
                key={s.week}
                style={{
                  padding: "3px 7px",
                  border: `1px solid ${LJ_BORDER}`,
                  borderRadius: 4,
                  background: "var(--bg)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: 8.5,
                    fontWeight: 700,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {s.week}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    color: "var(--text-primary)",
                    marginLeft: 4,
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function BranchPillRow({
  branches,
  onSelect,
}: {
  branches: FunnelBranch[];
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, marginLeft: 44 }}>
      {branches.map((b) => {
        const color = funnelToneColor(b.tone);
        return (
          <button
            key={b.label}
            onClick={() => onSelect(b.targetId)}
            title={b.note}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 4,
              border: `1px solid ${color}`,
              background: "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: 10.5,
              fontWeight: 600,
              color,
              cursor: "pointer",
            }}
          >
            <Split size={9} />
            {b.label}
          </button>
        );
      })}
    </div>
  );
}

function Connector() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "3px 0" }}>
      <ArrowDown size={16} color="var(--text-tertiary)" strokeWidth={1.5} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12.5,
          color: "var(--text-primary)",
          lineHeight: 1.5,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function NodeDetail({ node, count }: { node: FunnelNode; count: number | null }) {
  const color = funnelToneColor(node.tone);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <FunnelStamp nr={node.nr} tone={node.tone} />
        <div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {node.title}
          </div>
          {node.subtitle && (
            <div
              style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-tertiary)" }}
            >
              {node.subtitle}
            </div>
          )}
        </div>
      </div>

      {count !== null && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            border: `1px solid ${color}`,
            borderRadius: 6,
            background: "#fff",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}
          >
            Dziś w Pipeline
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: 26,
              fontWeight: 800,
              color,
              marginTop: 2,
            }}
          >
            {count}
          </div>
        </div>
      )}

      <DetailRow label="Agent / mechanizm" value={node.agent} />
      <DetailRow label="Warunek wejścia" value={node.entry} />
      <DetailRow label="Warunek wyjścia" value={node.exit} />

      {node.branches && (
        <div style={{ marginTop: 14 }}>
          <SectionLabel>Rozgałęzienie</SectionLabel>
          {node.branches.map((b) => (
            <div
              key={b.label}
              style={{
                padding: "8px 10px",
                border: `1px solid ${LJ_BORDER}`,
                borderRadius: 6,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: funnelToneColor(b.tone),
                }}
              >
                {b.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  marginTop: 2,
                }}
              >
                {b.note}
              </div>
            </div>
          ))}
        </div>
      )}

      {node.returnItems && (
        <div
          style={{ marginTop: 14, padding: "10px 12px", border: `1px dashed ${color}`, borderRadius: 6 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <RotateCcw size={12} color={color} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, color }}>
              Powrót do Kwalifikacja
            </span>
          </div>
          {node.returnItems.map((r) => (
            <div
              key={r.label}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11.5,
                color: "var(--text-secondary)",
                padding: "2px 0",
              }}
            >
              {r.label}
            </div>
          ))}
        </div>
      )}

      {node.loopNote && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            border: `1px dashed ${color}`,
            borderRadius: 6,
            display: "flex",
            gap: 8,
          }}
        >
          <RotateCcw size={14} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--text-secondary)" }}>
            {node.loopNote}
          </span>
        </div>
      )}

      {node.endNote && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            border: `1px dashed ${LJ_BORDER_STRONG}`,
            borderRadius: 6,
            display: "flex",
            gap: 8,
          }}
        >
          <RotateCcw size={14} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--text-secondary)" }}>
            {node.endNote}
          </span>
        </div>
      )}

      {node.id === "source" && (
        <div style={{ marginTop: 14 }}>
          <SectionLabel>Kanały</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SOURCE_OPTIONS.map((s) => (
              <span
                key={s}
                style={{
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: `1px solid ${LJ_BORDER}`,
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LejekView({ clients }: { clients: PipelineClientDetailed[] }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("kwalifikacja");

  const statusCounts: Record<string, number> = {};
  for (const c of clients) statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;

  const nodeById = (id: string): FunnelNode => {
    const node = FUNNEL_NODES.find((n) => n.id === id);
    if (!node) throw new Error(`Nieznany węzeł lejka: ${id}`);
    return node;
  };

  const renderCard = (id: string, compact = false) => {
    const node = nodeById(id);
    const count = node.statusKey ? (statusCounts[node.statusKey] ?? 0) : null;
    return (
      <FunnelCard
        node={node}
        count={count}
        active={selectedNodeId === id}
        onClick={() => setSelectedNodeId(id)}
        compact={compact}
      />
    );
  };

  const selectedNode = nodeById(selectedNodeId);
  const selectedCount = selectedNode.statusKey ? (statusCounts[selectedNode.statusKey] ?? 0) : null;

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }} className="lejek-root">
      <style>{`
        @media (max-width: 900px) {
          .lejek-root { flex-direction: column !important; overflow-y: auto !important; }
          .lejek-spine { flex: none !important; overflow-y: visible !important; }
          .lejek-panel { width: 100% !important; flex-shrink: 0 !important; border-left: none !important; border-top: 1px solid ${LJ_BORDER}; max-height: none !important; overflow-y: visible !important; }
        }
      `}</style>

      <div className="lejek-spine" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 24px 56px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 620, margin: "0 auto" }}>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-tertiary)",
              textAlign: "center",
              marginBottom: 20,
              maxWidth: 480,
              lineHeight: 1.5,
            }}
          >
            Kliknij dowolny węzeł, żeby zobaczyć mechanizm, warunki przejścia i liczbę kart Pipeline dziś w tym
            statusie.
          </p>

          {renderCard("source")}
          <Connector />
          {renderCard("nowy-lead")}
          <Connector />
          {renderCard("kwalifikacja")}
          <BranchPillRow branches={nodeById("kwalifikacja").branches ?? []} onSelect={setSelectedNodeId} />
          <div style={{ display: "flex", gap: 10, marginTop: 10, marginLeft: 44, flexWrap: "wrap" }}>
            {renderCard("nieaktywny", true)}
            {renderCard("niekwalifikowany", true)}
          </div>
          <Connector />
          {renderCard("discovery-umowione")}
          <Connector />
          {renderCard("discovery-analiza")}
          <BranchPillRow
            branches={nodeById("discovery-analiza").branches ?? []}
            onSelect={setSelectedNodeId}
          />
          <Connector />
          {renderCard("finalizacja")}
          <Connector />
          {renderCard("kickoff")}
          <Connector />
          {renderCard("wdrozenie")}
          <Connector />
          {renderCard("weryfikacja")}
          <Connector />
          {renderCard("retainer")}
          <Connector />
          {renderCard("upsell")}
          <Connector />
          {renderCard("zakonczona")}
        </div>
      </div>

      <div
        className="lejek-panel"
        style={{
          width: 340,
          flexShrink: 0,
          minHeight: 0,
          borderLeft: `1px solid ${LJ_BORDER}`,
          overflowY: "auto",
          background: "var(--bg)",
          padding: 20,
        }}
      >
        <NodeDetail node={selectedNode} count={selectedCount} />
      </div>
    </div>
  );
}

export default function MapaPage() {
  const [clients, setClients] = useState<PipelineClientDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [view, setView] = useState<"etapy" | "drzewo" | "blueprint" | "lejek">("etapy");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notion/pipeline");
      const data = await res.json();
      if (data.success && data.clients) setClients(data.clients);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedClient = clients.find((c) => c.id === selectedId) ?? null;

  const counts = [0, 0, 0, 0];
  for (const c of clients) {
    const idx = statusToStageIdx(c.status);
    if (idx >= 0) counts[idx] += 1;
  }
  const currentIdx = selectedClient ? statusToStageIdx(selectedClient.status) : -1;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 52,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Mapa procesu sprzedażowego
          </span>
          {/* Tab switcher */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-hover)",
              borderRadius: 8,
              padding: 2,
              gap: 2,
            }}
          >
            {(["etapy", "drzewo", "blueprint", "lejek"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: view === v ? "#fff" : "transparent",
                  boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                  color: view === v ? "var(--text-primary)" : "var(--text-tertiary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: view === v ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 120ms",
                }}
              >
                {v === "etapy"
                  ? "Widok etapów"
                  : v === "drzewo"
                    ? "Drzewo kroków"
                    : v === "blueprint"
                      ? "Blueprint danych"
                      : "Pełny lejek"}
              </button>
            ))}
          </div>
          {!loading && view === "etapy" && (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-tertiary)",
              }}
            >
              {clients.filter((c) => c.status !== "Niekwalifikowany").length} aktywnych klientów
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Client picker */}
          {!loading && clients.length > 0 && (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{
                height: 32,
                padding: "0 10px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg)",
                color: selectedId ? "var(--text-primary)" : "var(--text-tertiary)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                outline: "none",
                cursor: "pointer",
                minWidth: 200,
              }}
            >
              <option value="">Śledź klienta na mapie...</option>
              {clients
                .filter((c) => c.status !== "Niekwalifikowany")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.kontakt || c.firma} — {c.status}
                  </option>
                ))}
            </select>
          )}
          {selectedId && (
            <button
              onClick={() => setSelectedId("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                display: "flex",
                alignItems: "center",
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          )}
          <button
            onClick={() => void load()}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              cursor: loading ? "default" : "pointer",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
            }}
          >
            <RefreshCw
              size={12}
              style={loading ? { animation: "spin 1s linear infinite" } : undefined}
            />
            Odśwież
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Selected client banner */}
      {selectedClient && (
        <div
          style={{
            padding: "10px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--accent-muted)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--accent)",
            }}
          >
            {selectedClient.kontakt || selectedClient.firma}
          </span>
          <span
            style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)" }}
          >
            — aktualny etap: {currentIdx >= 0 ? STAGES[currentIdx].etap : "nieznany"}
          </span>
          {selectedClient.nastepnyKrok && (
            <>
              <div style={{ width: 1, height: 14, background: "var(--border)" }} />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                Następny krok: {selectedClient.nastepnyKrok}
              </span>
            </>
          )}
        </div>
      )}

      {/* Blueprint view */}
      {view === "blueprint" && <BlueprintView />}

      {/* Script tree view */}
      {view === "drzewo" && <ScriptTreeView />}

      {/* Pełny lejek */}
      {view === "lejek" && <LejekView clients={clients} />}

      {/* Stages */}
      {view === "etapy" &&
        (loading ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <Loader2
              size={20}
              color="var(--text-tertiary)"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-tertiary)",
              }}
            >
              Ładowanie...
            </span>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
            <div
              style={{
                display: "flex",
                gap: 0,
                alignItems: "stretch",
                minHeight: "100%",
                height: "calc(100vh - 180px)",
              }}
            >
              {STAGES.map((stage, idx) => {
                const isCurrent = idx === currentIdx;
                const isDone = currentIdx >= 0 && idx < currentIdx;
                const count = counts[idx];

                return (
                  <div
                    key={stage.etap}
                    style={{ display: "flex", alignItems: "stretch", flex: 1, minWidth: 0 }}
                  >
                    {/* Stage card */}
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        background: isCurrent
                          ? `linear-gradient(160deg, ${stage.color}08 0%, rgba(255,255,255,0.9) 60%)`
                          : "rgba(255,255,255,0.8)",
                        backdropFilter: "blur(20px) saturate(180%)",
                        WebkitBackdropFilter: "blur(20px) saturate(180%)",
                        border: `1.5px solid ${isCurrent ? stage.color : "var(--border)"}`,
                        boxShadow: isCurrent
                          ? `0 0 0 3px ${stage.color}20, 0 8px 32px rgba(0,0,0,0.10)`
                          : "0 2px 8px rgba(0,0,0,0.04)",
                        opacity: isDone ? 0.6 : 1,
                        borderRadius: "var(--radius-md)",
                        overflow: "hidden",
                        transition: "all 200ms",
                      }}
                    >
                      {/* Top accent bar */}
                      <div style={{ height: 5, background: stage.color, flexShrink: 0 }} />

                      <div
                        style={{
                          padding: "20px 20px 16px",
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        {/* Stage header */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            marginBottom: 16,
                          }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              flexShrink: 0,
                              border: `2.5px solid ${stage.color}`,
                              background: isDone || isCurrent ? stage.color : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {isDone ? (
                              <Check size={16} color="#fff" strokeWidth={3} />
                            ) : (
                              <span
                                style={{
                                  fontFamily: "var(--font-sans)",
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: isCurrent ? "#fff" : stage.color,
                                }}
                              >
                                {idx + 1}
                              </span>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 9,
                                fontWeight: 800,
                                letterSpacing: "0.14em",
                                textTransform: "uppercase",
                                color: stage.color,
                                marginBottom: 3,
                              }}
                            >
                              {stage.etap}
                            </div>
                            <div
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: 15,
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                lineHeight: 1.2,
                                letterSpacing: "-0.01em",
                              }}
                            >
                              {stage.label}
                            </div>
                            <div
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: 11,
                                color: "var(--text-secondary)",
                                marginTop: 2,
                                lineHeight: 1.3,
                              }}
                            >
                              {stage.sublabel}
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "3px 9px",
                              borderRadius: 99,
                              background: count > 0 ? `${stage.color}15` : "var(--bg-hover)",
                              border: `1px solid ${count > 0 ? `${stage.color}40` : "var(--border)"}`,
                              flexShrink: 0,
                            }}
                          >
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: count > 0 ? stage.color : "var(--text-placeholder)",
                              }}
                            />
                            <span
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: 12,
                                fontWeight: 700,
                                color: count > 0 ? stage.color : "var(--text-tertiary)",
                              }}
                            >
                              {count}
                            </span>
                          </div>
                        </div>

                        {/* "Tu jesteś" badge */}
                        {isCurrent && (
                          <div
                            style={{
                              padding: "5px 12px",
                              borderRadius: 8,
                              background: stage.color,
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 800,
                              textAlign: "center",
                              marginBottom: 14,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              fontFamily: "var(--font-sans)",
                            }}
                          >
                            {selectedClient
                              ? `${selectedClient.kontakt || selectedClient.firma} — tu jesteś`
                              : "Tu jesteś"}
                          </div>
                        )}

                        {/* Steps */}
                        <div style={{ flex: 1, marginBottom: 14 }}>
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "0.10em",
                              textTransform: "uppercase",
                              color: "var(--text-tertiary)",
                              marginBottom: 8,
                              fontFamily: "var(--font-sans)",
                            }}
                          >
                            Kroki
                          </div>
                          {stage.steps.map((step, si) => (
                            <div
                              key={si}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 8,
                                marginBottom: 7,
                              }}
                            >
                              <div
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: "50%",
                                  background: `${stage.color}18`,
                                  border: `1px solid ${stage.color}40`,
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: "var(--font-sans)",
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: stage.color,
                                  }}
                                >
                                  {si + 1}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontFamily: "var(--font-sans)",
                                  fontSize: 12.5,
                                  color: "var(--text-primary)",
                                  lineHeight: 1.5,
                                  paddingTop: 1,
                                }}
                              >
                                {step}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Exits */}
                        <div style={{ marginBottom: 14 }}>
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "0.10em",
                              textTransform: "uppercase",
                              color: "var(--text-tertiary)",
                              marginBottom: 8,
                              fontFamily: "var(--font-sans)",
                            }}
                          >
                            Możliwe wyjścia
                          </div>
                          {stage.exits.map((exit, ei) => (
                            <div
                              key={ei}
                              style={{
                                padding: "7px 10px",
                                marginBottom: 5,
                                background: "rgba(239,68,68,0.05)",
                                border: "1px solid rgba(239,68,68,0.18)",
                                borderRadius: "var(--radius-xs)",
                                borderLeft: "3px solid rgba(239,68,68,0.5)",
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "var(--font-sans)",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#ef4444",
                                  marginBottom: 2,
                                }}
                              >
                                {exit.label}
                              </div>
                              <div
                                style={{
                                  fontFamily: "var(--font-sans)",
                                  fontSize: 11,
                                  color: "var(--text-secondary)",
                                  lineHeight: 1.4,
                                }}
                              >
                                {exit.reason}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Next step */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            paddingTop: 12,
                            borderTop: "1px solid var(--border)",
                            marginTop: "auto",
                          }}
                        >
                          {idx === STAGES.length - 1 ? (
                            <CheckCircle2 size={13} color="#16a34a" />
                          ) : (
                            <ArrowRight size={13} color={stage.color} />
                          )}
                          <span
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: idx === STAGES.length - 1 ? "#16a34a" : stage.color,
                            }}
                          >
                            {stage.next}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Arrow between cards */}
                    {idx < STAGES.length - 1 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "0 10px",
                          flexShrink: 0,
                        }}
                      >
                        <ArrowRight size={20} color="var(--text-tertiary)" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
