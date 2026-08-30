"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { ClientSidebar } from "@/components/clients/ClientSidebar";
import { DecisionDiagram } from "@/components/scripts/DecisionDiagram";
import {
  answerParagraphs,
  CollapsibleAnswer,
  ExpectedBlock,
  ScriptLineRow,
  SectionCap,
  StepHeaderPill,
  TransitionBlock,
} from "@/components/scripts/ScriptStepShared";
import { AnalizaPrzedkontraktowaPanel } from "@/components/sprzedaz/AnalizaPrzedkontraktowaPanel";
import { WarunkiUmowyForm } from "@/components/sprzedaz/WarunkiUmowyForm";
import { OBJECTIONS_F, STEPS_F } from "@/lib/scripts/finalizacja";
import { useFormaGrzecznosciowa } from "@/lib/scripts/formaGrzecznosciowa";
import type { DecisionOption, Objection } from "@/lib/scripts/types";
import { objectionColor } from "@/lib/scripts/types";

// Drugie z dwóch spotkań sprzedażowych (2026-08-30, Michał) — sprzedaz.ts (Discovery) kończy
// się słowną zgodą na cenę i umówieniem tego spotkania; tutaj mierzymy realny czas, uzupełniamy
// Załącznik nr 1 i podpisujemy. Strona łączy nowy skrypt Finalizacji (STEPS_F/OBJECTIONS_F) z
// istniejącym skryptem Analiza przedkontraktowa (AnalizaPrzedkontraktowaPanel) — to dwa różne,
// współistniejące narzędzia na tym samym spotkaniu/statusie Pipeline "Finalizacja": jedno
// prowadzi rozmowę krok po kroku, drugie liczy moduły do Załącznika nr 1.

// Ten sam wzór co STEP_OBJECTIONS_D w /sprzedaz — minimalny, wyselekcjonowany zestaw obiekcji
// przypięty do konkretnego kroku, nie osobny zawsze-widoczny panel.
const STEP_OBJECTIONS_F: Record<string, string[]> = {
  podpis: ["od12_f", "od13_f", "od18_f", "od19_f"],
};

const STEP_PILL_COLOR = "#4379b1";

function Card({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid rgba(255,255,255,0.42)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      <div
        onClick={collapsible ? () => setOpen((p) => !p) : undefined}
        style={{
          padding: "12px 16px",
          borderBottom: open ? "1px solid var(--border)" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: collapsible ? "pointer" : "default",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {title}
        </span>
        {collapsible && (
          <ChevronDown
            size={14}
            color="var(--text-tertiary)"
            style={{
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 150ms",
            }}
          />
        )}
      </div>
      {open && <div style={{ padding: 16 }}>{children}</div>}
    </div>
  );
}

function ObjectionRow({
  obj,
  openId,
  setOpenId,
  fill,
  onDecisionSelect,
  selectedOptions,
  onJump,
}: {
  obj: Objection;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  fill: (t: string) => string;
  onDecisionSelect: (objectionId: string, option: DecisionOption) => void;
  selectedOptions: Record<string, string>;
  onJump: (stepId: string) => void;
}) {
  const oc = objectionColor(obj.label);
  const isOpen = openId === obj.id;
  return (
    <CollapsibleAnswer
      id={`objection-${obj.id}`}
      label={obj.label}
      sublabel={oc.category}
      open={isOpen}
      onToggle={() => setOpenId(isOpen ? null : obj.id)}
    >
      {obj.script && answerParagraphs(fill(obj.script), `obj-${obj.id}-s`)}
      {obj.followup && (
        <div style={{ marginTop: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--accent)",
            }}
          >
            Jeśli nadal naciska:
          </span>
          {answerParagraphs(fill(obj.followup), `obj-${obj.id}-f`)}
        </div>
      )}
      {obj.decision && (
        <div style={{ marginTop: 10 }}>
          <DecisionDiagram
            decision={obj.decision}
            onSelect={(option) => onDecisionSelect(obj.id, option)}
            onJump={onJump}
            selectedTrigger={selectedOptions[obj.id]}
          />
        </div>
      )}
      {obj.note && (
        <p
          style={{
            margin: "10px 0 0",
            fontFamily: "var(--font-sans)",
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--text-tertiary)",
          }}
        >
          {obj.note}
        </p>
      )}
    </CollapsibleAnswer>
  );
}

function ScriptStep({
  step,
  fill,
  onJump,
  onDecisionSelect,
  selectedTrigger,
  openObjectionId,
  setOpenObjectionId,
  selectedOptions,
}: {
  step: (typeof STEPS_F)[0];
  fill: (t: string) => string;
  onJump: (stepId: string) => void;
  onDecisionSelect: (stepId: string, option: DecisionOption) => void;
  selectedTrigger?: string;
  openObjectionId: string | null;
  setOpenObjectionId: (id: string | null) => void;
  selectedOptions: Record<string, string>;
}) {
  const [open, setOpen] = useState(true);
  const stepObjections = STEP_OBJECTIONS_F[step.id] ?? [];

  return (
    <div
      id={`step-${step.id}`}
      style={{
        marginBottom: 10,
        border: "1px solid rgba(255,255,255,0.42)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-elevated)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setOpen((p) => !p)}
        style={{
          padding: "12px 14px",
          background: open ? "rgba(67, 121, 177, 0.04)" : "transparent",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <StepHeaderPill color={STEP_PILL_COLOR} label={step.label} />
        <span style={{ flex: 1 }} />
        {step.tag && step.tag !== "MÓWISZ" && (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}
          >
            {step.tag}
          </span>
        )}
        <ChevronDown
          size={13}
          color="var(--text-tertiary)"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
        />
      </div>
      {open && (
        <div style={{ padding: "8px 14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {step.lines.map((line, li) => (
            <ScriptLineRow key={li} line={line} fill={fill} />
          ))}

          {step.expected && <ExpectedBlock text={fill(step.expected)} />}

          {step.transition && <TransitionBlock text={fill(step.transition)} idPrefix={step.id} />}

          {step.decision && (
            <DecisionDiagram
              decision={step.decision}
              onSelect={(option) => onDecisionSelect(step.id, option)}
              onJump={onJump}
              selectedTrigger={selectedTrigger}
            />
          )}

          {stepObjections.length > 0 && (
            <>
              <SectionCap>Możliwe obiekcje</SectionCap>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {stepObjections.map((objId) => {
                  const obj = OBJECTIONS_F.find((o) => o.id === objId);
                  if (!obj) return null;
                  return (
                    <ObjectionRow
                      key={obj.id}
                      obj={obj}
                      openId={openObjectionId}
                      setOpenId={setOpenObjectionId}
                      fill={fill}
                      onDecisionSelect={onDecisionSelect}
                      selectedOptions={selectedOptions}
                      onJump={onJump}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function FinalizacjaPage() {
  const [clients, setClients] = useState<PipelineClientDetailed[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PipelineClientDetailed | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [openObjectionId, setOpenObjectionId] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notion/pipeline");
      const data = await res.json();
      if (data.success) setClients(data.clients);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClients();
    const id = setInterval(() => void fetchClients(), 60_000);
    return () => clearInterval(id);
  }, [fetchClients]);

  useEffect(() => {
    setSelectedOptions({});
    setOpenObjectionId(null);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstName = (selected?.kontakt || selected?.firma || "").trim().split(/\s+/)[0] ?? "";
  const { forma, setFormaOverride } = useFormaGrzecznosciowa(firstName, selected?.id);

  // Skrypt Finalizacji mówi w formie literalnej "Pan"/"Pana"/"Panu" (dziedziczy to z dawnego
  // kroku "Warunki umowy" w sprzedaz.ts, patrz historia w finalizacja.ts) zamiast {FORMA} — ta
  // sama konwersja na Pani co w /sprzedaz i /kwalifikacja, żeby klientka nie usłyszała męskiej
  // formy tylko dlatego że treść skryptu jest napisana literalnie.
  const fill = (text: string): string => {
    let out = text;
    if (selected) {
      const pozaZakresem = selected.pozaZakresem?.trim() ?? "";
      out = out.replace(
        /\[poza zakresem\]/g,
        pozaZakresem
          ? `Poza zakresem tego wdrożenia zostaje: ${pozaZakresem}.`
          : "— brak ustaleń w Notion, dopytaj teraz i zapisz w formularzu 'Warunki umowy' niżej —",
      );
    }
    if (forma === "Pani") {
      out = out
        .replace(/\bPanem\b/g, "Panią")
        .replace(/\bPanie\b/g, "Pani")
        .replace(/\bPanu\b/g, "Pani")
        .replace(/\bPana\b/g, "Pani")
        .replace(/\bPan\b/g, "Pani");
    }
    return out;
  };

  const jumpToStep = useCallback((stepId: string) => {
    const el = document.getElementById(`step-${stepId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.style.transition = "box-shadow 250ms, background-color 250ms";
    el.style.boxShadow = "0 0 0 2px var(--accent)";
    el.style.backgroundColor = "rgba(67, 121, 177, 0.08)";
    setTimeout(() => {
      el.style.boxShadow = "";
      el.style.backgroundColor = "";
    }, 2000);
  }, []);

  const jumpToObjection = useCallback((objectionId: string) => {
    setOpenObjectionId(objectionId);
    requestAnimationFrame(() => {
      const el = document.getElementById(`objection-${objectionId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "box-shadow 250ms, background-color 250ms";
      el.style.boxShadow = "0 0 0 2px var(--warning)";
      setTimeout(() => {
        el.style.boxShadow = "";
      }, 2000);
    });
  }, []);

  const handleDecisionSelect = useCallback(
    (sourceId: string, option: DecisionOption) => {
      setSelectedOptions((prev) => ({ ...prev, [sourceId]: option.trigger }));
      if (option.openObjectionId) {
        jumpToObjection(option.openObjectionId);
      }
    },
    [jumpToObjection],
  );

  const TOOLBAR_LABEL: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: 12.5,
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "var(--text-primary)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div
        style={{
          flexShrink: 0,
          padding: "16px 20px 12px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-sans)",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Finalizacja i analiza
          </h1>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            {selected ? selected.kontakt || selected.firma : "Wybierz klienta z listy"}
          </span>
        </div>

        {selected && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <span style={TOOLBAR_LABEL}>Zwrot do klienta</span>
            {(["Pan", "Pani"] as const).map((f) => {
              const active = forma === f;
              return (
                <button
                  key={f}
                  onClick={() => setFormaOverride(f)}
                  style={{
                    height: 30,
                    padding: "0 14px",
                    borderRadius: "var(--radius-xs)",
                    border: `1px solid ${active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.42)"}`,
                    background: active ? "var(--accent)" : "var(--bg-elevated)",
                    color: active ? "var(--text-on-accent)" : "var(--text-primary)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: active ? 800 : 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <ClientSidebar
          clients={clients}
          loading={loading}
          selected={selected}
          onSelect={setSelected}
          onRefresh={fetchClients}
          filterStatuses={["Finalizacja"]}
          headerLabel="Finalizacja"
          emptyLabel='Brak klientów "Finalizacja"'
          showPresentation={false}
        />

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: "var(--bg)" }}>
          <Card title="Skrypt Finalizacji">
            {STEPS_F.map((step) => (
              <ScriptStep
                key={step.id}
                step={step}
                fill={fill}
                onJump={jumpToStep}
                onDecisionSelect={handleDecisionSelect}
                selectedTrigger={selectedOptions[step.id]}
                openObjectionId={openObjectionId}
                setOpenObjectionId={setOpenObjectionId}
                selectedOptions={selectedOptions}
              />
            ))}
          </Card>

          <Card title="Warunki umowy" collapsible defaultOpen={false}>
            <WarunkiUmowyForm
              client={selected}
              onSaved={(patch) => {
                setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
                setClients((prev) =>
                  prev.map((c) => (c.id === selected?.id ? { ...c, ...patch } : c)),
                );
              }}
            />
          </Card>

          <Card title="Skrypt: Analiza przedkontraktowa" collapsible defaultOpen={false}>
            <AnalizaPrzedkontraktowaPanel
              client={selected}
              onSaved={(patch) => {
                setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
                setClients((prev) =>
                  prev.map((c) => (c.id === selected?.id ? { ...c, ...patch } : c)),
                );
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
