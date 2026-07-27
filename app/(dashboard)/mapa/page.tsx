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
  Map as MapIcon,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Split,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { OBJECTIONS_K, STEPS_K } from "@/lib/scripts/kwalifikacyjna";
import { OBJECTIONS_D, STEPS_D } from "@/lib/scripts/sprzedaz";
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
      "Weryfikacja: min. 70% czasu bazowego zaoszczędzonego",
      "Przejście na Retainer — opieka stała",
      "Upsell — kolejne moduły i referrals",
    ],
    exits: [{ label: "Pause", reason: "Renegocjacja zakresu lub budżetu — działaj proaktywnie" }],
    next: "Klient aktywny",
  },
];

// ── Cykl życia klienta (dawniej "Pełny lejek") — paleta dokumentowa (spójna z public/prezentacja.html) ──

const LJ_ASPHALT = "#1B1D22";
const LJ_ACCENT = "#F5A623";
const LJ_RED = "#C1443A";
const LJ_SUCCESS = "#2F7D5C";
const LJ_BORDER = "rgba(27,29,34,0.14)";
const LJ_BORDER_STRONG = "rgba(27,29,34,0.24)";

const SOURCE_OPTIONS = ["META Ads", "Polecenie", "LinkedIn", "Cold outreach", "Inne"];

type FunnelTone = "neutral" | "accent" | "success" | "negative" | "source";

// Status odniesienia prawnego (2026-07-27, przebudowa cyklu życia klienta):
// - "confirmed": dosłownie zgodne z UMOWA_AUTORISE_FINAL.md albo aktualnym mechanizmem produktu
// - "stale": umowa/dawny SZKIC mówi coś innego (liczby albo brak aktualizacji) — produkt już
//   działa inaczej, tekst umowy nie został jeszcze dogoniony
// - "missing": mechanizm nie istnieje w ŻADNYM dokumencie Autorise (umowa, Karta Produktu,
//   prompty) — albo tylko w kodzie/komentarzu bez realnej podstawy, albo wyłącznie w treści tego
//   zlecenia. Wymaga potwierdzenia z Michałem/prawnikiem zanim będzie traktowane jako wiążące.
type RefStatus = "confirmed" | "stale" | "missing";

interface FunnelBranch {
  label: string;
  targetId: string;
  tone: FunnelTone;
  note: string;
  ref?: string;
  refNote?: string;
  refStatus?: RefStatus;
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
  ref?: string;
  refNote?: string;
  refStatus?: RefStatus;
}

// Przebudowa 2026-07-27 — cykl życia klienta od leada do retainera, zgodny ze WSZYSTKIMI
// mechanizmami z aktualnej umowy (UMOWA_AUTORISE_FINAL.md). Podczas researchu znaleziono realny
// rozjazd: sam tekst umowy (§3, §5, §6) wciąż opisuje płaską gwarancję 80h/mc + rabat
// 18000/15000 + jedną weryfikację, podczas gdy CAŁY produkt (prompty agentów, prezentacja,
// kalkulatory, tabela Kickoff w /wdrozenie) od commitu 98d95cf liczy 70% czasu bazowego, bez
// rabatu, w dwóch rundach — zdecydowano (Michał, 2026-07-27) trzymać się aktualnych liczb
// produktowych, oznaczając literalny tekst umowy jako nieaktualny tam gdzie się rozjeżdża
// (pole `ref`/`refStatus` niżej), zamiast fabrykować cytaty które nie odpowiadają żadnemu
// realnemu dokumentowi. Węzeł "Odbiór systemu" (usterka krytyczna/niekrytyczna/milczący odbiór)
// istniał już w kodzie /wdrozenie z komentarzem błędnie cytującym "umowa §3" — w rzeczywistości
// ten mechanizm nie występuje w ŻADNYM dokumencie Autorise (ani w umowie, ani w Karcie Produktu),
// oznaczony tu jako refStatus "missing".
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
    agent:
      "Agent 0: rejestracja i wzbogacenie danych (KRS, MF), zanim setter wykona pierwszy telefon.",
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
    entry:
      "Setter przeprowadził rozmowę według skryptu kwalifikacyjnego (Opening, Diagnoza, Spotkanie).",
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
    title: "Discovery Call",
    subtitle: "45-60 min, jedno spotkanie",
    tone: "neutral",
    agent:
      "Agent 2, pre-discovery brief (Opus 4.8, extended thinking): hipoteza bólu, przewidywane obiekcje, pitch recipe. Agent 3 personalizuje prezentację pod ten brief. Fathom nagrywa rozmowę.",
    entry: "Agent 1 zakwalifikował leada, a termin Discovery Call jest potwierdzony w Calendly.",
    exit: "Jedno spotkanie, 6 kroków frameworku Kimura: diagnoza → pitch dopasowany do modułów → cena → warunki umowy → closing. Po spotkaniu Agent 4 analizuje transkrypt.",
    statusKey: "Discovery umówione",
    ref: "AGENT4_SYSTEM_PROMPT",
    refStatus: "confirmed",
    refNote:
      '"Discovery Call (45-60 minut, jedno spotkanie obejmujące diagnozę, pitch, cenę i closing)" — dosłowny cytat z lib/agents/prompts.ts, AGENT4_SYSTEM_PROMPT.',
  },
  {
    id: "discovery-analiza",
    nr: "04",
    title: "Zamknięcie rozmowy",
    subtitle: "Closing + analiza",
    tone: "accent",
    isBranch: true,
    agent:
      "Na żywo: setter domyka rozmowę wg skryptu (obiekcje closing, sprzedaz.ts). Po fakcie: Agent 4 (Sonnet 4.6) czyta transkrypt i klasyfikuje wynik w polu Wynik Discovery (TAK / NIE / W TRAKCIE).",
    entry: "Spotkanie Discovery Call dotarło do fazy closing.",
    exit: 'Podpisano: Finalizacja. Odmowa/brak ICP: Niekwalifikowany. Obiekcja odraczająca ("muszę przemyśleć" / "prawnik musi przejrzeć"): W trakcie, wraca do closing po follow-upie.',
    branches: [
      {
        label: "Podpisano",
        targetId: "finalizacja",
        tone: "neutral",
        note: "Wynik Discovery: TAK. Klient zaakceptował cenę i warunki na miejscu albo tuż po.",
      },
      {
        label: "Muszę przemyśleć",
        targetId: "discovery-umowione",
        tone: "accent",
        note: 'Obiekcja closing (sprzedaz.ts, rodzina od1/od20/od21) — setter wyciąga konkretny termin follow-up, nie zostawia otwartego "jakoś się odezwę". Agent 4 oznacza W TRAKCIE do czasu decyzji.',
        ref: "sprzedaz.ts, od1/od20/od21",
        refStatus: "confirmed",
      },
      {
        label: "Prawnik musi przejrzeć",
        targetId: "discovery-umowione",
        tone: "accent",
        note: "Obiekcja od19 — standardowa procedura w większych firmach, nie wymówka. Setter wysyła umowę tego samego/następnego dnia i wyciąga konkretny termin odpowiedzi prawnika, zamiast naciskać na podpis od razu.",
        ref: "sprzedaz.ts, od19",
        refStatus: "confirmed",
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
    title: "Podpisanie umowy",
    tone: "neutral",
    agent: "Ręcznie: przygotowanie i podpisanie umowy (elektronicznie albo papierowo).",
    entry: "Closing zakończony wynikiem Podpisano.",
    exit: "Umowa podpisana: Wykonawca wystawia fakturę w ciągu 2 dni roboczych.",
    statusKey: "Finalizacja",
    ref: "§14 ust. 3",
    refStatus: "confirmed",
    refNote:
      '"Umowa może zostać zawarta w formie elektronicznej (podpis elektroniczny), co Strony uznają za równoważne z formą pisemną."',
  },
  {
    id: "platnosc",
    nr: "05b",
    title: "Faktura i płatność",
    tone: "accent",
    isBranch: true,
    agent:
      "Ręcznie: wystawienie faktury za wdrożenie (18 000 PLN, bez rabatu — mechanizm rabatu za terminowość 18000/15000 z §5 ust. 1 usunięty z produktu 2026-07-25, dokument umowy jeszcze tego nie odzwierciedla).",
    entry: "Umowa podpisana.",
    exit: 'Faktura wystawiona w 2 dni robocze. Zgodnie z §5 ust. 3 prace wdrożeniowe (Kickoff, zbieranie dostępów) ruszają od dostarczenia dostępów NIEZALEŻNIE od statusu płatności — umowa nie przewiduje mechanizmu "umowa niezawarta" przy braku wpłaty.',
    ref: "§5 ust. 3",
    refStatus: "stale",
    refNote:
      '§5 ust. 3: "Faktura za wdrożenie wystawiana w terminie 2 dni roboczych po podpisaniu umowy. Prace wdrożeniowe rozpoczynają się od dnia dostarczenia kompletu dostępów, niezależnie od statusu płatności." Zlecenie tej przebudowy zakładało "warunek rozwiązujący: brak pełnej wpłaty w 7 dni = umowa uważana za niezawartą" — TAKI ZAPIS NIE ISTNIEJE w UMOWA_AUTORISE_FINAL.md, umowa mówi dosłownie coś przeciwnego (start prac niezależny od płatności). Gałąź "Brak wpłaty" poniżej pokazuje to jako niepotwierdzony mechanizm, nie fakt.',
    branches: [
      {
        label: "Wpłata zaksięgowana",
        targetId: "kickoff",
        tone: "neutral",
        note: "Bieg dalszy: Kick-off w ciągu 7 dni roboczych od podpisania umowy (§2 ust. 1) — niezależnie od tego, czy płatność już wpłynęła.",
      },
      {
        label: "Brak wpłaty (niepotwierdzone)",
        targetId: "zakonczona",
        tone: "negative",
        note: 'Mechanizm z briefu tej mapy ("7 dni, umowa niezawarta") nie ma pokrycia w §5 ust. 3 ani nigdzie indziej w dokumentach Autorise. Jeśli ma obowiązywać, wymaga dopisania do umowy — dziś brak wpłaty NIE zatrzymuje prac wdrożeniowych.',
        ref: "Brak w umowie",
        refStatus: "missing",
      },
    ],
  },
  {
    id: "kickoff",
    nr: "06",
    title: "Kick-off",
    subtitle: "30-45 min, w 7 dni roboczych",
    tone: "neutral",
    agent:
      "Ręcznie: warsztat Kick-off — ustalenie harmonogramu wdrożenia i zebranie tabeli czasu bazowego per moduł (Załącznik nr 1: Moduł/Jednostka/Czas na jednostkę/Wolumen na miesiąc), teraz budowanej w Panelu 0 zakładki /wdrozenie zamiast jednego ręcznie wpisywanego pola.",
    entry: "Umowa podpisana.",
    exit: "Harmonogram i tabela czasu bazowego ustalone: start zbierania dostępów (Załącznik nr 1).",
    statusKey: "Kickoff",
    ref: "§2 ust. 1",
    refStatus: "confirmed",
    refNote:
      '"Wykonawca zobowiązuje się do przeprowadzenia warsztatu Kick-off (30-45 minut) w ciągu 7 dni roboczych od podpisania umowy, którego celem jest ustalenie harmonogramu wdrożenia i zebranie niezbędnych dostępów."',
  },
  {
    id: "zebranie-dostepow",
    nr: "06b",
    title: "Zebranie dostępów",
    tone: "accent",
    isBranch: true,
    agent:
      "Ręcznie: Wykonawca potwierdza pisemnie (e-mail/uzgodniony kanał) otrzymanie kompletu dostępów ustalonych w Załączniku nr 1 (TMS, poczta, system księgowy/KSeF, kontakty operacyjne).",
    entry:
      "Kickoff zakończony, harmonogram i termin dostarczenia dostępów ustalone indywidualnie w Załączniku nr 1.",
    exit: "Komplet dostępów potwierdzony pisemnie: start 4-tygodniowego wdrożenia i 30-dniowego okna weryfikacji NARAZ, tego samego dnia.",
    ref: "§2 ust. 2-3",
    refStatus: "confirmed",
    refNote:
      '§2 ust. 2: "Okres weryfikacji rozpoczyna bieg od dnia, w którym Wykonawca pisemnie potwierdzi Zamawiającemu otrzymanie kompletu dostępów." §2 ust. 3: termin dostarczenia dostępów jest ustalany INDYWIDUALNIE per klient w Załączniku nr 1 — nie ma jednego sztywnego "5 dni roboczych, max 19 dni łącznie" dla wszystkich umów; to musi być konkretna liczba z Załącznika 1 danego klienta.',
    branches: [
      {
        label: "Dostarczone w terminie",
        targetId: "wdrozenie",
        tone: "neutral",
        note: "Komplet dostępów potwierdzony pisemnie w terminie ustalonym w Załączniku nr 1.",
      },
      {
        label: "Opóźnienie — wina klienta",
        targetId: "zakonczona",
        tone: "negative",
        note: "Zegar weryfikacji przesuwa się proporcjonalnie o czas opóźnienia. Dopiero opóźnienie przekraczające 30 DNI KALENDARZOWYCH od ustalonego terminu (nie 19 dni) uprawnia Wykonawcę do odstąpienia bez zwrotu wynagrodzenia za wdrożenie.",
        ref: "§2 ust. 4",
        refStatus: "stale",
        refNote:
          'Brief tej przebudowy podawał próg 19 dni — umowa mówi dosłownie "30 dni kalendarzowych od ustalonego terminu". Poprawiono na mapie do liczby z §2 ust. 4.',
      },
      {
        label: "Opóźnienie — strona trzecia (dostawca TMS)",
        targetId: "wdrozenie",
        tone: "accent",
        note: "To nie osobny mechanizm terminu dostępów, tylko przedłużenie 4-tygodniowego WDROŻENIA o max 2 tygodnie, gdy potrzebny jest dostęp do API strony trzeciej (np. HMSoft u Arka Burkowskiego) na co Wykonawca nie ma wpływu. Wykonawca informuje klienta niezwłocznie z przyczyną i nowym terminem.",
        ref: "§2 ust. 6(b)",
        refStatus: "confirmed",
      },
    ],
  },
  {
    id: "wdrozenie",
    nr: "07",
    title: "Wdrożenie",
    subtitle: "4 tygodnie",
    tone: "neutral",
    agent:
      "Zespół wdrożeniowy: Discovery techniczne, integracja z TMS, testy na realnych danych, uruchomienie live.",
    entry: "Komplet dostępów potwierdzony pisemnie (Zebranie dostępów).",
    exit: "System działa na produkcji: zaczyna się liczenie 30-dniowego okna weryfikacji gwarancji (już wystartowało razem z wdrożeniem, nie od Live).",
    statusKey: "Wdrożenie",
    ref: "§2 ust. 6 / Karta Produktu pkt 8, 11",
    refStatus: "confirmed",
    subSteps: [
      { week: "Tydzień 1", label: "Discovery techniczne: test API TMS" },
      { week: "Tydzień 2-3", label: "Integracja z TMS" },
      { week: "Tydzień 3", label: "Testy na danych" },
      { week: "Tydzień 4", label: "Live" },
    ],
    endNote:
      "Tydzień 1: test dostępu do API głównego TMS — działa / nie działa. Jeśli nie działa (np. HMSoft, właściciel odmawia dostępu): cztery metody w kolejności próby — (1) bezpośredni kontakt z dostawcą systemu o dostęp, (2) automatyzacja RPA klikająca interfejs jak człowiek, (3) rozpoznawanie elementów wizualnie na ekranie, (4) dostęp przez panel w przeglądarce jeśli istnieje. Decyzja którą metodę wybrać zapada dopiero na Tygodniu 1, po realnym teście, nie wcześniej (Karta Produktu, pkt 8).",
  },
  {
    id: "odbior",
    nr: "07b",
    title: "Odbiór systemu",
    subtitle: "Protokół, 3 dni robocze od Live",
    tone: "accent",
    isBranch: true,
    agent:
      'Ręcznie w /wdrozenie: checkbox "Protokół odbioru podpisany" + data. Mechanizm już żywy w kodzie i używany z realnymi klientami.',
    entry: "System działa na produkcji (Live, koniec Tygodnia 4).",
    exit: "Brak usterek: odbiór podpisany od razu. Usterka niekrytyczna: odbiór mimo to, usterka notowana do naprawy. Usterka krytyczna: odmowa odbioru, naprawa, ponowny odbiór. Milczenie klienta: uznany za odebrany.",
    ref: "Brak w umowie i Karcie Produktu",
    refStatus: "missing",
    refNote:
      'Kod /wdrozenie (komentarz przy polu "Protokół odbioru podpisany") cytuje "umowa §3" — to POMYŁKA: §3 UMOWA_AUTORISE_FINAL.md to "Zobowiązanie zwrotu", nie protokół odbioru. Cały mechanizm usterka krytyczna/niekrytyczna/milczący odbiór/3 dni robocze/10 dni naprawy nie występuje w żadnym dokumencie Autorise (ani w umowie, ani w Karcie Produktu) — istnieje wyłącznie jako pole Notion i UI zbudowane w code session 2026-07-25 bez podstawy prawnej. Kryterium odbioru najbliższe realnemu dokumentowi to Karta Produktu pkt 12 ("wszystkie moduły działają na realnych zleceniach, zespół przeszkolony, zero krytycznych błędów w logach z ostatniego tygodnia") — ale bez formalnego protokołu/terminów. Wymaga potwierdzenia z Michałem/prawnikiem zanim to trafi do umowy albo zanim ta mapa będzie cytowana jako wiążąca w tym punkcie.',
    branches: [
      {
        label: "Brak usterek",
        targetId: "retainer",
        tone: "neutral",
        note: "Protokół odbioru podpisany bez zastrzeżeń.",
      },
      {
        label: "Usterka niekrytyczna",
        targetId: "retainer",
        tone: "accent",
        note: "Nie wstrzymuje odbioru — notowana do naprawy w ramach retainera (§5 ust. 2b: naprawa usterek do 48h roboczych od zgłoszenia).",
      },
      {
        label: "Usterka krytyczna",
        targetId: "odbior",
        tone: "negative",
        note: "Odmowa odbioru. Naprawa min. 10 dni roboczych, potem ponowny odbiór (pętla do tego samego węzła).",
      },
      {
        label: "Milczący odbiór",
        targetId: "retainer",
        tone: "accent",
        note: "Klient nie reaguje na zgłoszenie odbioru w wyznaczonym terminie: system uznaje odbiór za dokonany.",
      },
    ],
  },
  {
    id: "weryfikacja",
    nr: "08",
    title: "Weryfikacja gwarancji",
    subtitle: "30 dni od zebrania dostępów",
    tone: "neutral",
    isBranch: true,
    agent:
      "Porównanie godzin zaoszczędzonych miesięcznie (logi systemu) z progiem gwarancji: minimum 70% czasu bazowego potwierdzonego na Kickoffie. Może się częściowo pokrywać z Odbiorem — oba liczone od innych punktów startu (Odbiór od Live, Weryfikacja od zebrania dostępów).",
    entry: "30 dni minęło od potwierdzenia kompletu dostępów, na realnych zleceniach klienta.",
    exit: "Pozytywny (próg 70% osiągnięty, LUB niespełnienie wynika z winy klienta — np. brak dostarczenia danych, ingerencja w konfigurację — liczone automatycznie jako pozytywny): Retainer. Negatywny (przyczyna po stronie systemu): 2 tygodnie naprawcze.",
    ref: "§3 ust. 1-6",
    refStatus: "stale",
    refNote:
      'UMOWA_AUTORISE_FINAL.md §3 ust. 1 mówi dosłownie "minimum 80 godzin miesięcznie" (liczba bezwzględna), nie 70% czasu bazowego. Produkt (prompty agentów, prezentacja, kalkulatory, tabela Kickoff) przeszedł na próg procentowy 2026-07-25 (commit 98d95cf, "usunięcie rozjazdu ceny/gwarancji między systemami") — decyzja Michała z tej sesji: mapa pokazuje AKTUALNE 70%, tekst umowy wymaga osobnej aktualizacji prawnej żeby dogonić produkt. §3 ust. 5: niespełnienie warunków klienta (§3 ust. 4 a-e: dostępy w terminie, kontakt 48h, udział w Kickoff, brak ingerencji w konfigurację, ciągłość systemów zewnętrznych) zwalnia Wykonawcę ze zobowiązania zwrotu — stąd "wina klienta = automatycznie pozytywny".',
    branches: [
      {
        label: "Pozytywny",
        targetId: "retainer",
        tone: "neutral",
        note: "Próg 70% osiągnięty, albo niespełnienie z winy klienta (§3 ust. 4-5).",
      },
      {
        label: "Negatywny",
        targetId: "naprawa",
        tone: "accent",
        note: "Przyczyna niespełnienia progu leży po stronie systemu, nie klienta.",
      },
    ],
  },
  {
    id: "naprawa",
    nr: "08b",
    title: "Działania naprawcze",
    subtitle: "2 tygodnie",
    tone: "accent",
    agent:
      "Zespół wdrożeniowy: poprawki w konfiguracji/automatyzacjach zidentyfikowane jako przyczyna niespełnienia progu.",
    entry: "Pierwsza weryfikacja: wynik negatywny z winy systemu.",
    exit: "Po 2 tygodniach: druga, niezależna 30-dniowa runda weryfikacji.",
    ref: "Dawny SZKIC_UMOWA §4 ust. 7 (plik usunięty)",
    refStatus: "stale",
    refNote:
      'Istniejąca wcześniej wersja tej mapy cytowała "SZKIC_UMOWA_AUTORISE.md §4 ust. 7" dla mechanizmu "2 tygodnie + druga weryfikacja" — ten plik już nie istnieje (zastąpiony przez UMOWA_AUTORISE_FINAL.md, commit cbc7287), a §4 w finalnej umowie to "Obowiązki Wykonawcy", nie ma tam nic o drugiej rundzie. Mechanizm dwurundowy jest realną praktyką produktu (patrz węzeł Weryfikacja gwarancji), ale wymaga przeniesienia do aktualnego tekstu umowy — dziś to martwe odwołanie do usuniętego dokumentu.',
  },
  {
    id: "weryfikacja-druga",
    nr: "08c",
    title: "Druga weryfikacja",
    subtitle: "30 dni",
    tone: "accent",
    isBranch: true,
    agent: "Ta sama metodologia co pierwsza weryfikacja, na danych z okresu po naprawie.",
    entry: "2 tygodnie działań naprawczych zakończone.",
    exit: "Pozytywny: Retainer. Negatywny (drugi raz z rzędu): klientowi przysługuje prawo odstąpienia.",
    branches: [
      {
        label: "Pozytywny",
        targetId: "retainer",
        tone: "neutral",
        note: "Próg 70% osiągnięty po poprawkach.",
      },
      {
        label: "Negatywny (drugi raz)",
        targetId: "prawo-odstapienia",
        tone: "negative",
        note: "Dopiero DRUGI negatywny wynik z rzędu uprawnia klienta do odstąpienia — pierwszy negatywny sam w sobie nie daje tego prawa.",
      },
    ],
  },
  {
    id: "prawo-odstapienia",
    nr: "08d",
    title: "Prawo odstąpienia",
    subtitle: "Miesiąc na skorzystanie",
    tone: "negative",
    isBranch: true,
    agent:
      "Klient decyduje, czy skorzystać z prawa odstąpienia w ciągu miesiąca od drugiego negatywnego wyniku.",
    entry: "Druga weryfikacja: wynik negatywny.",
    exit: "Skorzystał w terminie: zwrot całości wpłaconej kwoty w 14 dni. Nie skorzystał: uznaje się że cel osiągnięty, umowa trwa dalej na Retainer.",
    ref: "Brak w umowie/Karcie Produktu",
    refStatus: "missing",
    refNote:
      'Nie znaleziono tego mechanizmu (miesięczny termin na odstąpienie, 14 dni na zwrot, domniemanie "cel osiągnięty" przy braku skorzystania w terminie) w UMOWA_AUTORISE_FINAL.md ani w Karcie Produktu — umowa dziś opisuje wyłącznie prosty zwrot w 14 dni po JEDNEJ 30-dniowej weryfikacji (§3 ust. 6), bez drugiej rundy i bez terminu na skorzystanie z prawa. Ten węzeł odzwierciedla wyłącznie brief tej przebudowy mapy — potwierdź z Michałem/prawnikiem przed traktowaniem jako wiążące.',
    branches: [
      {
        label: "Skorzystał z prawa",
        targetId: "zakonczona",
        tone: "negative",
        note: "Zwrot całości wpłaconej kwoty w terminie 14 dni.",
      },
      {
        label: "Nie skorzystał w terminie",
        targetId: "retainer",
        tone: "neutral",
        note: "Domniemanie: cel uznany za osiągnięty, umowa trwa dalej normalnym trybem.",
      },
    ],
  },
  {
    id: "retainer",
    nr: "09",
    title: "Retainer",
    subtitle: "Min. 12 miesięcy",
    tone: "success",
    isBranch: true,
    agent:
      "Opieka stała: monitoring wykorzystania, naprawa usterek do 48h roboczych, drabinka eskalacji przy braku kontaktu klienta (0 / 3-4 / 7 / 14 / 30 dni — /utrzymanie, ta sama metodologia progów co przy ciszy w trakcie wdrożenia, Karta Produktu pkt 14).",
    entry:
      "Odbiór systemu podpisany (albo uznany za odebrany) I gwarancja potwierdzona (weryfikacja pierwsza, druga, albo nieskorzystanie z prawa odstąpienia) — start retainera liczy się od dnia Odbioru, weryfikacja może się z nim częściowo pokrywać w czasie.",
    exit: 'Trwa min. 12 miesięcy, potem automatyczne przedłużenie na czas nieokreślony (30-dniowy okres wypowiedzenia, nie "3 miesiące wcześniej"). Wyzwalacz rozszerzenia zakresu przenosi klienta do Upsell. Trzy ścieżki wyjścia w trakcie trwania: patrz gałęzie.',
    statusKey: "Retainer",
    ref: "§6 ust. 2-3, §5 ust. 2",
    refStatus: "stale",
    refNote:
      '§6 ust. 3: "Po upływie 12-miesięcznego okresu retainera, umowa przedłuża się automatycznie na czas nieokreślony, z okresem wypowiedzenia 30 dni." Brief tej mapy podawał "chyba że któraś Strona zgłosi brak woli przedłużenia 3 miesiące wcześniej" — to NIE jest to co mówi umowa: nie ma wymogu zgłoszenia PRZED upływem 12 miesięcy, jest 30-dniowy okres wypowiedzenia w dowolnym momencie PO automatycznym przedłużeniu. Poprawiono na mapie do dosłownego brzmienia §6 ust. 3.',
    branches: [
      {
        label: "Rażące naruszenie przez Wykonawcę",
        targetId: "zakonczona",
        tone: "negative",
        note: "Klient wychodzi bez kary finansowej.",
        ref: "Wywnioskowane pośrednio",
        refStatus: "missing",
        refNote:
          'Umowa nie używa dosłownie zwrotu "rażące naruszenie przez Wykonawcę" z takim skutkiem — §4 ust. 7 mówi tylko, że obowiązek zapłaty pozostałych miesięcy przy wcześniejszym zakończeniu NIE dotyczy sytuacji, gdy przyczyną jest rażące naruszenie umowy przez Wykonawcę (czyli brak kary jest wnioskiem przez wykluczenie, nie osobnym, wprost zapisanym prawem). Potwierdź z prawnikiem przed cytowaniem klientowi.',
      },
      {
        label: "Rażące naruszenie przez Zamawiającego",
        targetId: "zakonczona",
        tone: "negative",
        note: "Wykonawca wychodzi, klient płaci pozostałe miesiące.",
        ref: "Brak dosłownego zapisu",
        refStatus: "missing",
        refNote:
          'Nie znaleziono w umowie symetrycznego, wprost nazwanego prawa Wykonawcy do wyjścia z tytułu "rażącego naruszenia przez Zamawiającego" z obowiązkiem zapłaty reszty miesięcy. Najbliższe rzeczywiste mechanizmy: §5 ust. 6 (brak płatności retainera → zawieszenie Systemu, bez zwolnienia z zapłaty) i §2 ust. 4-5 (opóźnienie dostępów/30 dni ciszy → prawo odstąpienia bez zwrotu, w fazie wdrożenia). Potwierdź z prawnikiem przed cytowaniem klientowi.',
      },
      {
        label: "Dobrowolne wcześniejsze zakończenie przez klienta",
        targetId: "zakonczona",
        tone: "accent",
        note: "Klient płaci jednorazowo za pozostałe, niewykorzystane miesiące minimalnego okresu.",
        ref: "§4 ust. 7",
        refStatus: "confirmed",
        refNote:
          '"Jeśli Zamawiający chce zakończyć współpracę przed upływem minimalnego 12-miesięcznego okresu retainera z przyczyn innych niż rażące naruszenie umowy przez Wykonawcę, zobowiązany jest do zapłaty pozostałych, niewykorzystanych miesięcy tego okresu jednorazowo."',
      },
    ],
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
    endNote:
      "Jeśli klient wraca po jakimś czasie: proces startuje ponownie od Kwalifikacja, jako re-engagement.",
  },
  {
    id: "niekwalifikowany",
    nr: "N1",
    title: "Niekwalifikowany",
    tone: "negative",
    agent:
      "Wynik decyzji Agenta 1 (kwalifikacja telefoniczna) albo Agenta 4 (analiza Discovery Call).",
    entry:
      "ICP nie pasuje, brak decydenta, brak bólu albo jawna odmowa w dowolnym momencie procesu.",
    exit: "Karta zostaje w Pipeline. Uczciwy wynik, nie porażka: może wrócić przez re-engagement, jeśli sytuacja klienta się zmieni.",
    statusKey: "Niekwalifikowany",
    returnItems: [{ label: "Poza ICP: re-engagement" }],
  },
  {
    id: "nieaktywny",
    nr: "N2",
    title: "Nieaktywny (follow up)",
    tone: "accent",
    agent:
      "Agent 1: wyraźne 'nie teraz' z konkretnym, udokumentowanym powodem, nigdy ogólnikowe odłożenie.",
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

// Kolor/etykieta statusu odniesienia prawnego — zielony potwierdzony dosłownie w umowie/produkcie,
// żółty zgodny z produktem ale nieaktualny w tekście umowy, czerwony brak w jakimkolwiek
// dokumencie Autorise (wymaga potwierdzenia z Michałem/prawnikiem przed użyciem jako wiążące).
function refStatusColor(status?: RefStatus): string {
  switch (status) {
    case "confirmed":
      return LJ_SUCCESS;
    case "stale":
      return LJ_ACCENT;
    case "missing":
      return LJ_RED;
    default:
      return LJ_BORDER_STRONG;
  }
}

function refStatusLabel(status?: RefStatus): string {
  switch (status) {
    case "confirmed":
      return "Potwierdzone";
    case "stale":
      return "Umowa nieaktualna";
    case "missing":
      return "Brak w dokumentach";
    default:
      return "";
  }
}

function RefBadge({
  refText,
  status,
  compact,
}: {
  refText: string;
  status?: RefStatus;
  compact?: boolean;
}) {
  const color = refStatusColor(status);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: compact ? "1px 6px" : "2px 7px",
        borderRadius: 4,
        border: `1px solid ${color}`,
        background: "#fff",
        marginTop: compact ? 3 : 6,
      }}
      title={refStatusLabel(status)}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }}
      />
      <span
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: compact ? 9.5 : 10.5,
          fontWeight: 700,
          color: "var(--text-secondary)",
          whiteSpace: "nowrap",
        }}
      >
        {refText}
      </span>
    </div>
  );
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
        {node.ref && <RefBadge refText={node.ref} status={node.refStatus} compact={compact} />}
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
        const tooltip = b.ref
          ? `${b.note}\n\n${b.ref}${b.refNote ? ` — ${b.refNote}` : ""}`
          : b.note;
        return (
          <button
            key={b.label}
            onClick={() => onSelect(b.targetId)}
            title={tooltip}
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
            {b.ref && (
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: refStatusColor(b.refStatus),
                  flexShrink: 0,
                }}
              />
            )}
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
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-tertiary)",
              }}
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

      {node.ref && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            border: `1px solid ${refStatusColor(node.refStatus)}`,
            borderRadius: 6,
            background: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: node.refNote ? 6 : 0,
            }}
          >
            <RefBadge refText={node.ref} status={node.refStatus} />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10.5,
                fontWeight: 700,
                color: refStatusColor(node.refStatus),
              }}
            >
              {refStatusLabel(node.refStatus)}
            </span>
          </div>
          {node.refNote && (
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11.5,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              {node.refNote}
            </div>
          )}
        </div>
      )}

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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: funnelToneColor(b.tone),
                  }}
                >
                  {b.label}
                </span>
                {b.ref && <RefBadge refText={b.ref} status={b.refStatus} compact />}
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
              {b.refNote && (
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 10.5,
                    color: refStatusColor(b.refStatus),
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}
                >
                  {b.refNote}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {node.returnItems && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            border: `1px dashed ${color}`,
            borderRadius: 6,
          }}
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
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11.5,
              color: "var(--text-secondary)",
            }}
          >
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
          <RotateCcw
            size={14}
            color="var(--text-tertiary)"
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11.5,
              color: "var(--text-secondary)",
            }}
          >
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
    <div
      style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}
      className="lejek-root"
    >
      <style>{`
        @media (max-width: 900px) {
          .lejek-root { flex-direction: column !important; overflow-y: auto !important; }
          .lejek-spine { flex: none !important; overflow-y: visible !important; }
          .lejek-panel { width: 100% !important; flex-shrink: 0 !important; border-left: none !important; border-top: 1px solid ${LJ_BORDER}; max-height: none !important; overflow-y: visible !important; }
        }
      `}</style>

      <div
        className="lejek-spine"
        style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 24px 56px" }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: 620,
            margin: "0 auto",
          }}
        >
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
            Kliknij dowolny węzeł, żeby zobaczyć mechanizm, warunki przejścia i liczbę kart Pipeline
            dziś w tym statusie.
          </p>

          {renderCard("source")}
          <Connector />
          {renderCard("nowy-lead")}
          <Connector />
          {renderCard("kwalifikacja")}
          <BranchPillRow
            branches={nodeById("kwalifikacja").branches ?? []}
            onSelect={setSelectedNodeId}
          />
          <div
            style={{ display: "flex", gap: 10, marginTop: 10, marginLeft: 44, flexWrap: "wrap" }}
          >
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
          {renderCard("platnosc")}
          <BranchPillRow
            branches={nodeById("platnosc").branches ?? []}
            onSelect={setSelectedNodeId}
          />
          <Connector />
          {renderCard("kickoff")}
          <Connector />
          {renderCard("zebranie-dostepow")}
          <BranchPillRow
            branches={nodeById("zebranie-dostepow").branches ?? []}
            onSelect={setSelectedNodeId}
          />
          <Connector />
          {renderCard("wdrozenie")}
          <Connector />
          {renderCard("odbior")}
          <BranchPillRow
            branches={nodeById("odbior").branches ?? []}
            onSelect={setSelectedNodeId}
          />
          <Connector />
          {renderCard("weryfikacja")}
          <BranchPillRow
            branches={nodeById("weryfikacja").branches ?? []}
            onSelect={setSelectedNodeId}
          />
          <Connector />
          {renderCard("naprawa")}
          <Connector />
          {renderCard("weryfikacja-druga")}
          <BranchPillRow
            branches={nodeById("weryfikacja-druga").branches ?? []}
            onSelect={setSelectedNodeId}
          />
          <Connector />
          {renderCard("prawo-odstapienia")}
          <BranchPillRow
            branches={nodeById("prawo-odstapienia").branches ?? []}
            onSelect={setSelectedNodeId}
          />
          <Connector />
          {renderCard("retainer")}
          <BranchPillRow
            branches={nodeById("retainer").branches ?? []}
            onSelect={setSelectedNodeId}
          />
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
  const [view, setView] = useState<"etapy" | "drzewo" | "blueprint" | "lejek">("lejek");

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
      <PageHeader
        icon={<MapIcon size={15} color="var(--accent)" />}
        title="Mapa procesu sprzedażowego"
      >
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
          {(["lejek", "etapy", "drzewo", "blueprint"] as const).map((v) => (
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
                    : "Cykl życia klienta"}
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
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
      </PageHeader>

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

      {/* Cykl życia klienta */}
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
