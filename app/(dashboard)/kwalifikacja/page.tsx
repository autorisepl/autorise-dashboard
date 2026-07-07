"use client";

import {
  AlertTriangle,
  ArrowDown,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  Lock,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GoogleTaskList } from "@/app/api/google/tasks/route";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { ProgressBar, SectionLabelSmall, StepCard } from "@/components/dalsze-kroki/DalszeKrokiUI";
import { DecisionDiagram } from "@/components/scripts/DecisionDiagram";
import { NextStepArrow } from "@/components/scripts/NextStepArrow";
import { formatPhone } from "@/lib/format/phone";
import {
  ACKNOWLEDGMENT_PHRASES,
  ICP_RULES,
  OBJECTIONS_K,
  STEPS_K,
} from "@/lib/scripts/kwalifikacyjna";
import { GROUP_COLORS, MESSAGES_DATA } from "@/lib/scripts/messages";
import type { DecisionOption, Objection, ScriptLine } from "@/lib/scripts/types";
import { objectionColor } from "@/lib/scripts/types";

// ── Helpers ──────────────────────────────────────────────────────────

function toVocative(name: string): string {
  const first = name.trim().split(" ")[0];
  if (!first) return name;
  if (first.endsWith("ał")) return first.slice(0, -2) + "ale";
  if (first.endsWith("eł")) return first.slice(0, -2) + "le";
  if (first.endsWith("ek") && first.length > 3) return first.slice(0, -2) + "ku";
  if (first.endsWith("a") && first.length > 2) return first.slice(0, -1) + "o";
  return first;
}

function findStepLabel(stepId: string): string {
  const step = STEPS_K.find((s) => s.id === stepId);
  return step ? `${step.nr} ${step.label}` : stepId;
}

// ── Line colors ───────────────────────────────────────────────────────

const LINE_COLOR: Record<ScriptLine["t"], string> = {
  say: "var(--text-primary)",
  client: "var(--text-secondary)",
  note: "var(--warning)",
  action: "var(--accent)",
  branch: "var(--success-text)",
  "branch-bad": "var(--error)",
};

const LINE_BG: Record<ScriptLine["t"], string> = {
  say: "transparent",
  client: "transparent",
  note: "var(--warning-bg)",
  action: "var(--accent-muted)",
  branch: "var(--success-bg)",
  "branch-bad": "var(--error-bg)",
};

// ── Card wrapper ──────────────────────────────────────────────────────

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
        background: "#ffffff",
        border: "1px solid #E5E5EA",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      <div
        onClick={collapsible ? () => setOpen((p) => !p) : undefined}
        style={{
          padding: "12px 16px",
          borderBottom: open ? "1px solid #E5E5EA" : "none",
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

// ── Kalkulator (na żywo) — pasek narastających flag z decyzji 2f ─────────

const FLAG_SOURCE: Record<string, { label: string; nr: string }> = {
  zlecenia: { label: "Zlecenia", nr: "2d" },
  cmr: { label: "CMR/POD", nr: "2e" },
  faktury_recznie: { label: "Faktury", nr: "2f" },
  komunikacja: { label: "Komunikacja", nr: "2g" },
};

function CalculatorFlagsBar({ flags }: { flags: Record<string, boolean> }) {
  const active = Object.keys(flags).filter((k) => flags[k]);
  if (active.length === 0) return null;
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        padding: "8px 12px",
        marginBottom: 8,
        borderRadius: 8,
        border: "1px solid rgba(10,132,255,0.18)",
        background: "rgba(10,132,255,0.05)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 700,
          color: "var(--accent)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Kalkulator (na żywo):
      </span>
      {active.map((k) => {
        const src = FLAG_SOURCE[k];
        return (
          <span
            key={k}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-primary)",
              padding: "3px 8px",
              borderRadius: 20,
              background: "#fff",
              border: "1px solid #E5E5EA",
            }}
          >
            {src?.label ?? k}
            {src ? ` (${src.nr})` : ""}
          </span>
        );
      })}
    </div>
  );
}

// ── Inline kalkulator wbudowany w skrypt ─────────────────────────────

const PRACA_TYPES = [
  { id: "zlecenia", label: "Zlecenia — automatyczne wczytywanie z maila" },
  { id: "cmr", label: "Dokumenty transportowe — skan i odczyt" },
  { id: "faktury_recznie", label: "Faktury i płatności — pilnowanie terminów" },
  { id: "komunikacja", label: "Status zleceń — bez dzwonienia do spedytora" },
  { id: "inne", label: "Inne — do doprecyzowania ręcznie" },
] as const;

function ScriptKalkulator({
  clientName,
  autoFlags,
  osoby,
  godziny,
  stawka,
  onOsobyChange,
  onGodzinyChange,
  onStawkaChange,
}: {
  clientName: string;
  autoFlags: Record<string, boolean>;
  osoby: number;
  godziny: number;
  stawka: number;
  onOsobyChange: (n: number) => void;
  onGodzinyChange: (n: number) => void;
  onStawkaChange: (n: number) => void;
}) {
  const [manualSelected, setManualSelected] = useState<Set<string>>(
    new Set(["zlecenia", "cmr", "faktury_recznie"]),
  );

  const isLocked = (id: string) => Boolean(autoFlags[id]);
  const isOn = (id: string) => isLocked(id) || manualSelected.has(id);
  const selected = new Set(PRACA_TYPES.map((pt) => pt.id).filter((id) => isOn(id)));

  const toggle = (id: string) => {
    if (isLocked(id)) return;
    setManualSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const miesiecznieH = osoby * godziny * 22;
  const miesieczniePLN = miesiecznieH * stawka;
  const rocznie = miesieczniePLN * 12;
  const gwarancjaH = Math.round(miesiecznieH * 0.8);

  const fmt = (n: number) =>
    n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const wynikZdanie = `Przy ${osoby} ${osoby === 1 ? "osobie" : "osobach"} i ${godziny} ${godziny === 1 ? "godzinie" : "godzinach"} dziennie — to ${fmt(miesiecznieH)} godzin miesięcznie, czyli ${fmt(miesieczniePLN)} zł kosztu pracy. Rocznie ${fmt(rocznie)} zł.`;

  return (
    <div
      style={{
        border: "1px solid #E5E5EA",
        borderRadius: 10,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          background: "rgba(10,132,255,0.04)",
          borderBottom: "1px solid #E5E5EA",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--accent)",
          }}
        >
          Kalkulator ROI
        </span>
        {clientName && (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-tertiary)",
            }}
          >
            — {clientName}
          </span>
        )}
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Inputs */}
        <div style={{ display: "flex", gap: 12 }}>
          <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              Osoby w biurze
            </span>
            <input
              type="number"
              min={1}
              max={50}
              value={osoby}
              onChange={(e) => onOsobyChange(Math.max(1, Number(e.target.value) || 1))}
              style={{
                height: 36,
                borderRadius: 8,
                border: "1px solid #E5E5EA",
                padding: "0 10px",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                background: "#F5F5F7",
                outline: "none",
                width: "100%",
              }}
            />
          </label>
          <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              Godziny dziennie
            </span>
            <input
              type="number"
              min={0.5}
              max={12}
              step={0.5}
              value={godziny}
              onChange={(e) => onGodzinyChange(Math.max(0.5, Number(e.target.value) || 0.5))}
              style={{
                height: 36,
                borderRadius: 8,
                border: "1px solid #E5E5EA",
                padding: "0 10px",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                background: "#F5F5F7",
                outline: "none",
                width: "100%",
              }}
            />
          </label>
          <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              Stawka godzinowa
            </span>
            <input
              type="number"
              min={20}
              max={200}
              value={stawka}
              onChange={(e) => onStawkaChange(Math.max(20, Number(e.target.value) || 55))}
              style={{
                height: 36,
                borderRadius: 8,
                border: "1px solid #E5E5EA",
                padding: "0 10px",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                background: "#F5F5F7",
                outline: "none",
                width: "100%",
              }}
            />
          </label>
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            color: "var(--text-tertiary)",
            fontStyle: "italic",
            marginTop: 4,
          }}
        >
          Stawka szacunkowa na podstawie typowego kosztu pracy spedytora w Polsce z narzutami.
          Dostosuj jeśli klient poda inną wartość.
        </div>

        {/* Typy pracy */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            Rodzaj pracy (zaznacz co dotyczy)
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PRACA_TYPES.map((pt) => {
              const on = selected.has(pt.id);
              const locked = isLocked(pt.id);
              return (
                <button
                  key={pt.id}
                  onClick={() => toggle(pt.id)}
                  disabled={locked}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "5px 10px",
                    borderRadius: 20,
                    border: on ? "1px solid var(--accent)" : "1px solid #E5E5EA",
                    background: on ? "rgba(10,132,255,0.08)" : "#F5F5F7",
                    color: on ? "var(--accent)" : "var(--text-secondary)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: on ? 600 : 400,
                    cursor: locked ? "default" : "pointer",
                    transition: "all 120ms",
                  }}
                >
                  {locked && <Lock size={9} />}
                  {pt.label}
                </button>
              );
            })}
          </div>
          {PRACA_TYPES.some((pt) => isLocked(pt.id)) && (
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontStyle: "italic",
              }}
            >
              Zaznaczone automatycznie:{" "}
              {PRACA_TYPES.filter((pt) => isLocked(pt.id))
                .map((pt) => `${pt.label} (${FLAG_SOURCE[pt.id]?.nr ?? pt.id})`)
                .join(", ")}
            </div>
          )}
        </div>

        {/* Wynik */}
        <div
          style={{
            background: "rgba(10,132,255,0.05)",
            border: "1px solid rgba(10,132,255,0.18)",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  fontWeight: 600,
                }}
              >
                Miesięcznie
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--accent)",
                  lineHeight: 1.2,
                }}
              >
                {fmt(miesieczniePLN)} zł
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                {fmt(miesiecznieH)} h × {stawka} zł/h
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  fontWeight: 600,
                }}
              >
                Rocznie
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                }}
              >
                {fmt(rocznie)} zł
              </div>
            </div>
          </div>

          {/* Gotowe zdanie do wypowiedzenia */}
          <div
            style={{
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 6,
              background: "#fff",
              border: "1px solid #E5E5EA",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              lineHeight: 1.55,
              color: "var(--text-primary)",
            }}
          >
            {wynikZdanie}
          </div>

          {/* Gwarancja na żywo */}
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              background: "rgba(52,199,89,0.08)",
              border: "1px solid rgba(52,199,89,0.25)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--success-text)",
            }}
          >
            Gwarancja dla tego klienta: minimum {fmt(gwarancjaH)} godzin miesięcznie
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Script step ───────────────────────────────────────────────────────

function ScriptStep({
  step,
  index,
  fill,
  onCopy,
  copiedId,
  onJump,
  onDecisionSelect,
  selectedTrigger,
  children,
}: {
  step: (typeof STEPS_K)[0];
  index: number;
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  onJump: (stepId: string) => void;
  onDecisionSelect: (stepId: string, option: DecisionOption) => void;
  selectedTrigger?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  const tagColors: Record<string, string> = {
    AKCJA: "var(--accent)",
    MÓWISZ: "var(--text-primary)",
    PYTASZ: "#7c3aed",
    UWAGA: "var(--warning)",
    GAŁĘZIE: "var(--success-text)",
    ZAMKNIĘCIE: "#16a34a",
    KALKULATOR: "#0d9488",
  };

  return (
    <div
      id={`step-${step.id}`}
      style={{
        marginBottom: 8,
        border: "1px solid #E5E5EA",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {!step.decision && step.nextStepId && (
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            color: "var(--text-tertiary)",
            padding: "5px 14px",
            background: "#FAFAFA",
            borderBottom: "1px solid #E5E5EA",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ArrowDown size={10} />
          {`Dalej: ${findStepLabel(step.nextStepId)}`}
        </div>
      )}
      <div
        onClick={() => setOpen((p) => !p)}
        style={{
          padding: "10px 14px",
          background: open ? "rgba(10,132,255,0.03)" : "#fff",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "var(--accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            flex: 1,
          }}
        >
          {step.label}
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: tagColors[step.tag] ?? "var(--text-tertiary)",
            padding: "2px 7px",
            borderRadius: 4,
            background: `${tagColors[step.tag] ?? "var(--text-tertiary)"}15`,
          }}
        >
          {step.tag}
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 9,
            color: "var(--text-tertiary)",
            flexShrink: 0,
          }}
        >
          ({step.nr})
        </span>
        <ChevronDown
          size={13}
          color="var(--text-tertiary)"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
        />
      </div>
      {open && (
        <div style={{ padding: "8px 14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {step.lines.map((line, li) => (
            <div
              key={li}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 8,
                background: LINE_BG[line.t],
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                {line.t === "say" && (
                  <MessageSquare size={13} color="var(--accent)" strokeWidth={1.6} />
                )}
                {line.t === "client" && (
                  <Users size={13} color="var(--text-secondary)" strokeWidth={1.8} />
                )}
                {line.t === "note" && (
                  <AlertTriangle size={12} color="var(--warning)" strokeWidth={1.6} />
                )}
                {line.t === "action" && <Check size={12} color="var(--accent)" strokeWidth={2} />}
                {(line.t === "branch" || line.t === "branch-bad") && (
                  <Check size={12} color={LINE_COLOR[line.t]} strokeWidth={2} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                {(Array.isArray(line.text) ? line.text : [line.text]).map((paragraph, pi) => (
                  <p
                    key={pi}
                    style={{
                      margin: pi === 0 ? 0 : "6px 0 0 0",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: LINE_COLOR[line.t],
                      textWrap: "pretty" as React.CSSProperties["textWrap"],
                    }}
                  >
                    {fill(paragraph)}
                  </p>
                ))}
                {line.t === "say" && line.cel && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      fontStyle: "italic",
                      marginTop: 2,
                      paddingLeft: 8,
                      borderLeft: "2px solid var(--border)",
                    }}
                  >
                    Cel: {line.cel}
                  </div>
                )}
              </div>
              {line.t === "say" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(
                      `${step.id}-${li}`,
                      Array.isArray(line.text) ? line.text.join(" ") : line.text,
                    );
                  }}
                  style={{
                    flexShrink: 0,
                    padding: "3px 7px",
                    borderRadius: 5,
                    border: "1px solid #E5E5EA",
                    background: "transparent",
                    cursor: "pointer",
                    color:
                      copiedId === `${step.id}-${li}`
                        ? "var(--success-text)"
                        : "var(--text-tertiary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 10,
                  }}
                >
                  {copiedId === `${step.id}-${li}` ? (
                    <CheckCircle2 size={10} />
                  ) : (
                    <Copy size={10} />
                  )}
                </button>
              )}
            </div>
          ))}
          {step.decision && (
            <DecisionDiagram
              decision={step.decision}
              onSelect={(option) => onDecisionSelect(step.id, option)}
              selectedTrigger={selectedTrigger}
            />
          )}
          {!step.decision && step.nextStepId && (
            <NextStepArrow label="Dalej" onJump={() => onJump(step.nextStepId!)} />
          )}
          {children && (
            <div style={{ borderTop: "1px solid #E5E5EA", marginTop: 4, paddingTop: 10 }}>
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Objections accordion ──────────────────────────────────────────────

const STAGE_LABELS: Record<Objection["stage"], string> = {
  opening: "Otwarcie rozmowy",
  icp: "Weryfikacja ICP",
  diagnoza: "Diagnoza dokumentów",
  kalkulator: "Kalkulator ROI",
  wszedzie: "Obiekcje ogólne (mogą wystąpić wszędzie)",
};

const STAGE_ORDER: Objection["stage"][] = ["opening", "icp", "diagnoza", "kalkulator", "wszedzie"];

function renderObjection(
  obj: Objection,
  openId: string | null,
  setOpenId: (id: string | null) => void,
  fill: (t: string) => string,
  onCopy: (id: string, text: string) => void,
  copiedId: string | null,
) {
  const oc = objectionColor(obj.label);
  const isOpen = openId === obj.id;
  return (
    <div
      key={obj.id}
      id={`objection-${obj.id}`}
      style={{
        border: "1px solid #E5E5EA",
        borderLeft: `3px solid ${oc.accent}`,
        borderRadius: 8,
        overflow: "hidden",
        background: isOpen ? oc.bg : "#fff",
        transition: "background-color 200ms, box-shadow 250ms",
      }}
    >
      <div
        onClick={() => setOpenId(isOpen ? null : obj.id)}
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: oc.accent,
              marginBottom: 1,
            }}
          >
            {oc.category}
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            {obj.label}
          </div>
        </div>
        <ChevronDown
          size={12}
          color="var(--text-tertiary)"
          style={{
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 150ms",
            flexShrink: 0,
          }}
        />
      </div>
      {isOpen && (
        <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {obj.script && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  flex: 1,
                }}
              >
                {fill(obj.script)}
              </p>
              <button
                onClick={() => onCopy(`obj-${obj.id}-script`, obj.script!)}
                style={{
                  flexShrink: 0,
                  padding: "3px 7px",
                  borderRadius: 5,
                  border: "1px solid #E5E5EA",
                  background: "transparent",
                  cursor: "pointer",
                  color:
                    copiedId === `obj-${obj.id}-script`
                      ? "var(--success-text)"
                      : "var(--text-tertiary)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {copiedId === `obj-${obj.id}-script` ? (
                  <CheckCircle2 size={10} />
                ) : (
                  <Copy size={10} />
                )}
              </button>
            </div>
          )}
          {obj.followup && (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                lineHeight: 1.55,
                color: "var(--accent)",
                fontFamily: "var(--font-sans)",
                fontStyle: "italic",
                borderTop: "1px solid #E5E5EA",
                paddingTop: 8,
              }}
            >
              {fill(obj.followup)}
            </p>
          )}
          {obj.note && (
            <p
              style={{
                margin: 0,
                fontSize: 11,
                lineHeight: 1.5,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
                background: "var(--warning-bg)",
                padding: "6px 8px",
                borderRadius: 6,
              }}
            >
              {obj.note}
            </p>
          )}
          {obj.sms && (
            <div
              style={{
                background: "var(--accent-muted)",
                padding: "8px 10px",
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--accent)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                SMS
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "var(--text-primary)",
                  lineHeight: 1.55,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {fill(obj.sms)}
              </p>
            </div>
          )}
          {obj.extra && (
            <div style={{ background: "var(--bg-hover)", padding: "8px 10px", borderRadius: 6 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Wiadomość prywatna
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "var(--text-primary)",
                  lineHeight: 1.55,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {fill(obj.extra)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ObjectionsPanel({
  fill,
  onCopy,
  copiedId,
  openId,
  setOpenId,
}: {
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Obiekcje w kwalifikacji
      </div>
      {STAGE_ORDER.map((stage) => {
        const items = OBJECTIONS_K.filter((o) => o.stage === stage);
        if (items.length === 0) return null;
        return (
          <div key={stage} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text-tertiary)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {STAGE_LABELS[stage]}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {items.map((obj) => renderObjection(obj, openId, setOpenId, fill, onCopy, copiedId))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── SMS templates ─────────────────────────────────────────────────────

function SmsPanel({
  fill,
  onCopy,
  copiedId,
}: {
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}) {
  const kwalItems = MESSAGES_DATA.sms.filter((m) => m.group === "Kwalifikacja");
  const fbItems = MESSAGES_DATA.fb;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 2,
        }}
      >
        SMS / WhatsApp
      </div>
      {kwalItems.map((item) => (
        <div key={item.id} style={{ background: "#F5F5F7", borderRadius: 8, padding: "10px 12px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: GROUP_COLORS[item.group] ?? "var(--accent)",
              marginBottom: 4,
            }}
          >
            {item.label}
          </div>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              lineHeight: 1.55,
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {fill(item.text)}
          </p>
          <button
            onClick={() => onCopy(`sms-${item.id}`, item.text)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #E5E5EA",
              background: "#fff",
              cursor: "pointer",
              fontSize: 11,
              color:
                copiedId === `sms-${item.id}` ? "var(--success-text)" : "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {copiedId === `sms-${item.id}` ? <CheckCircle2 size={11} /> : <Copy size={11} />}
            {copiedId === `sms-${item.id}` ? "Skopiowano" : "Kopiuj"}
          </button>
        </div>
      ))}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginTop: 8,
          marginBottom: 2,
        }}
      >
        Facebook
      </div>
      {fbItems.map((item) => (
        <div key={item.id} style={{ background: "#F5F5F7", borderRadius: 8, padding: "10px 12px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: GROUP_COLORS[item.group] ?? "var(--accent)",
              marginBottom: 4,
            }}
          >
            {item.label}
          </div>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              lineHeight: 1.55,
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {fill(item.text)}
          </p>
          <button
            onClick={() => onCopy(`fb-${item.id}`, item.text)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #E5E5EA",
              background: "#fff",
              cursor: "pointer",
              fontSize: 11,
              color: copiedId === `fb-${item.id}` ? "var(--success-text)" : "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {copiedId === `fb-${item.id}` ? <CheckCircle2 size={11} /> : <Copy size={11} />}
            {copiedId === `fb-${item.id}` ? "Skopiowano" : "Kopiuj"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── ICP Quick Reference ───────────────────────────────────────────────

function IcpPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ICP_RULES.map((rule, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 8,
            background: rule.ok ? "var(--success-bg)" : "var(--error-bg)",
            border: `1px solid ${rule.ok ? "var(--success-border)" : "var(--error-border)"}`,
          }}
        >
          <div style={{ flexShrink: 0, marginTop: 1 }}>
            {rule.ok ? (
              <Check size={12} color="var(--success-text)" strokeWidth={2.5} />
            ) : (
              <X size={12} color="var(--error)" strokeWidth={2.5} />
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: rule.ok ? "var(--success-text)" : "var(--error)",
                marginBottom: 1,
              }}
            >
              {rule.label}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                lineHeight: 1.45,
                fontFamily: "var(--font-sans)",
              }}
            >
              {rule.val}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dalsze kroki ──────────────────────────────────────────────────────

const CALENDLY_URL = "https://calendly.com/autorise";

const DALSZE_KROKI_LABELS: Record<"calendly" | "sms" | "pipeline", string> = {
  calendly: "Link Calendly wysłany",
  sms: "SMS potwierdzający wysłany",
  pipeline: "Uruchom Agenta 1 (ustawi status automatycznie)",
};

const smsPotwierdzajacyTekst = (clientName: string, dzien: string, godzina: string) =>
  `Dzień dobry Panie ${clientName || "[Imię]"}, potwierdzam nasze spotkanie na ${dzien || "[dzień]"} o ${godzina || "[godzina]"}. Link do spotkania wyśle Panu Calendly na maila. Do usłyszenia.`;

function DalszeKroki({ client }: { client: PipelineClientDetailed | null }) {
  const [checks, setChecks] = useState({ calendly: false, sms: false, pipeline: false });
  const toggle = (k: keyof typeof checks) => setChecks((p) => ({ ...p, [k]: !p[k] }));
  const [smsExpanded, setSmsExpanded] = useState(false);
  const [smsCopied, setSmsCopied] = useState(false);
  const [reminderOn, setReminderOn] = useState(false);
  const [extraContext, setExtraContext] = useState("");
  const [taskLists, setTaskLists] = useState<GoogleTaskList[] | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [taskSaved, setTaskSaved] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const doneCount = Object.values(checks).filter(Boolean).length;
  const totalCount = Object.keys(checks).length;

  const saveDalszeKroki = async () => {
    setSavingTask(true);
    setTaskError(null);
    try {
      let lists = taskLists;
      if (!lists) {
        const res = await fetch("/api/google/tasks");
        const data = (await res.json()) as { lists?: GoogleTaskList[]; error?: string };
        if (data.error || !data.lists) throw new Error(data.error ?? "Brak list zadań Google");
        lists = data.lists;
        setTaskLists(lists);
      }
      const targetList = lists.find((l) => l.title.toLowerCase().includes("autorise")) ?? lists[0];
      if (!targetList) throw new Error("Brak dostępnej listy zadań");
      const checkedLabels = (["calendly", "sms", "pipeline"] as const)
        .filter((k) => checks[k])
        .map((k) => DALSZE_KROKI_LABELS[k]);
      const title = `Kwalifikacja ${client?.kontakt || client?.firma || "klient"} — ${
        checkedLabels.length ? checkedLabels.join(", ") : "follow-up"
      }`;
      const res = await fetch("/api/google/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: targetList.id,
          title,
          notes: extraContext.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Nie udało się zapisać zadania");
      setTaskSaved(true);
      setTimeout(() => setTaskSaved(false), 2500);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : "Błąd zapisu zadania");
    } finally {
      setSavingTask(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <ProgressBar doneCount={doneCount} totalCount={totalCount} />

      <SectionLabelSmall>Teraz</SectionLabelSmall>
      <StepCard
        done={checks.calendly}
        label={DALSZE_KROKI_LABELS.calendly}
        onToggle={() => toggle("calendly")}
        actionLabel="Otwórz"
        onAction={() => window.open(CALENDLY_URL, "_blank", "noopener noreferrer")}
      />
      <StepCard
        done={checks.sms}
        label={DALSZE_KROKI_LABELS.sms}
        onToggle={() => toggle("sms")}
        actionLabel={smsExpanded ? "Ukryj" : "Pokaż SMS"}
        onAction={() => setSmsExpanded((p) => !p)}
      />
      {smsExpanded && (
        <div
          style={{
            marginTop: -2,
            marginBottom: 8,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#F5F5F7",
            border: "1px solid #E5E5EA",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              lineHeight: 1.55,
              color: "var(--text-primary)",
            }}
          >
            {smsPotwierdzajacyTekst(client?.kontakt?.split(" ")[0] ?? "", "", "")}
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                smsPotwierdzajacyTekst(client?.kontakt?.split(" ")[0] ?? "", "", ""),
              );
              setSmsCopied(true);
              setTimeout(() => setSmsCopied(false), 1500);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #E5E5EA",
              background: "#fff",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: smsCopied ? "var(--success-text)" : "var(--text-secondary)",
            }}
          >
            {smsCopied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
            Kopiuj
          </button>
        </div>
      )}
      <StepCard
        done={checks.pipeline}
        label={DALSZE_KROKI_LABELS.pipeline}
        detail={client ? client.kontakt || client.firma : "wybierz klienta"}
        onToggle={() => toggle("pipeline")}
        actionLabel="Uruchom Agenta 1"
        onAction={() => window.open("/agenci", "_blank")}
      />

      <div style={{ height: 1, background: "var(--border)", margin: "8px 0 12px" }} />

      <SectionLabelSmall>Przypomnienie</SectionLabelSmall>
      <StepCard
        done={reminderOn}
        label="Dodaj do Zadań"
        onToggle={() => setReminderOn((p) => !p)}
      />
      {reminderOn && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: -2 }}>
          <textarea
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder="Dodatkowy kontekst do zadania (opcjonalnie)..."
            style={{
              minHeight: 60,
              resize: "vertical",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 10px",
              outline: "none",
              background: "var(--bg-card)",
            }}
          />
          <button
            onClick={saveDalszeKroki}
            disabled={savingTask}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              cursor: savingTask ? "not-allowed" : "pointer",
              fontSize: 13,
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
            }}
          >
            {savingTask ? "Zapisywanie..." : "Zapisz przypomnienie"}
          </button>
          {taskSaved && (
            <div
              style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--success-text)" }}
            >
              Dodano do Zadań (Autorise)
            </div>
          )}
          {taskError && (
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--error)" }}>
              {taskError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Przypadki specjalne ───────────────────────────────────────────────

const SPECIAL_CASES = [
  {
    id: "prev",
    label: "Klient był wcześniej na starym skrypcie",
    content: [
      "Sprawdź w Pipeline notatkę z poprzedniej rozmowy — jakiej wersji skryptu wtedy używaliśmy, jaki był ból, czy była mowa o ICP.",
      "Powiedz: 'Rozmawialiśmy już jakiś czas temu — chciałbym się upewnić że dobrze rozumiem obecną sytuację. Czy coś się zmieniło od naszej ostatniej rozmowy, czy temat wygląda podobnie?'",
      "Jeśli sytuacja bez zmian i ból był już potwierdzony: nie powtarzaj pełnej diagnozy dokumentowej (2c-2g). Przejdź od razu do ICP (2a-2b) jeśli nie było wcześniej sprawdzone, potem prosto do kalkulatora (2i) używając starych informacji jako punktu wyjścia, z prośbą o potwierdzenie liczb.",
      "Jeśli coś się zmieniło (np. przybyła flota, zmienił się TMS): przeprowadź diagnozę od nowa w tych konkretnych obszarach które się zmieniły, pomiń resztę.",
      "Uruchom Agenta 1 w trybie weryfikacyjnym po rozmowie, żeby porównał starą kartę Pipeline z nową i wskazał rozbieżności w danych lub obliczeniach.",
    ],
  },
  {
    id: "nobrak",
    label: "Klient nie odbiera (3 próby)",
    content: [
      "Próba 1 i 2: zadzwoń o różnych porach dnia, rano i po południu. Nie zostawiaj wiadomości głosowej.",
      "Po trzeciej próbie: wyślij SMS z gotowym tekstem z panelu SMS / Wiadomości w prawej kolumnie, szablon 'Brak odbioru — po 3 próbach'.",
      "Zmień status klienta w Pipeline na 'Nieaktywny (follow up)'.",
      "Ustaw datę re-engagement na 14 dni od ostatniej próby, nie później — leady z reklamy tracą temperaturę szybko, dłuższe odkładanie zwykle kończy się brakiem odpowiedzi w ogóle.",
      "Jeśli klient odpisze na SMS w dowolnym momencie: zadzwoń w ciągu godziny, nie czekaj do zaplanowanej daty re-engagement.",
    ],
  },
  {
    id: "reeng",
    label: "Klient wraca po re-engagement (90 dni)",
    content: [
      "Sprawdź w Pipeline pełną notatkę z poprzedniej rozmowy — ból, ICP, powód dla którego był wtedy 'Nieaktywny (follow up)' albo 'Niekwalifikowany'.",
      "Otwórz rozmowę inaczej niż standardowy opener: 'Dzień dobry, rozmawialiśmy [orientacyjnie kiedy] o [konkretny ból z notatki]. Dzwonię sprawdzić czy temat jest nadal aktualny, czy coś się u Pana zmieniło.'",
      "Jeśli klient był wcześniej poniżej progu ICP (np. 1 osoba w biurze): zapytaj wprost czy to się zmieniło, zanim przejdziesz do reszty. Jeśli nadal nie ma drugiej osoby, zakończ rozmowę tak jak w kroku 2a, nie inwestuj czasu w pełną diagnozę ponownie.",
      "Jeśli klient był wcześniej 'Nieaktywny (follow up)' z konkretnym powodem (np. wdrażał inny system, miał zmianę biznesową w toku): zapytaj czy ten proces się zakończył, to naturalny punkt wejścia do rozmowy.",
      "Jeśli ból jest wciąż aktualny i ICP spełnione: skróć diagnozę do potwierdzenia starych danych plus jednego pytania pogłębiającego, przejdź prosto do kalkulatora i zaproszenia na Discovery.",
    ],
  },
];

function PrzypadkiSpecjalne() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {SPECIAL_CASES.map((c) => (
        <div
          key={c.id}
          style={{ border: "1px solid #E5E5EA", borderRadius: 8, overflow: "hidden" }}
        >
          <div
            onClick={() => setOpenId(openId === c.id ? null : c.id)}
            style={{
              padding: "9px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              userSelect: "none",
              background: openId === c.id ? "#F5F5F7" : "#fff",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              {c.label}
            </span>
            <ChevronDown
              size={12}
              color="var(--text-tertiary)"
              style={{
                transform: openId === c.id ? "rotate(180deg)" : "none",
                transition: "transform 150ms",
              }}
            />
          </div>
          {openId === c.id && (
            <div style={{ padding: "8px 12px 12px" }}>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {c.content.map((line, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      marginBottom: 4,
                    }}
                  >
                    {line}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Left client sidebar ───────────────────────────────────────────────

function ClientSidebar({
  clients,
  loading,
  selected,
  onSelect,
  onRefresh,
}: {
  clients: PipelineClientDetailed[];
  loading: boolean;
  selected: PipelineClientDetailed | null;
  onSelect: (c: PipelineClientDetailed | null) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = clients
    .filter((c) => c.status === "Nowy lead")
    .filter((c) =>
      search.trim() ? `${c.kontakt} ${c.firma}`.toLowerCase().includes(search.toLowerCase()) : true,
    );

  return (
    <div
      style={{
        width: 240,
        minWidth: 240,
        height: "100%",
        borderRight: "1px solid #E5E5EA",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
      }}
    >
      <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #E5E5EA", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
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
            Nowy lead ({filtered.length})
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              background: "transparent",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              color: "var(--text-tertiary)",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <RefreshCw
              size={12}
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
            />
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: 32,
            background: "#F5F5F7",
            borderRadius: 8,
            padding: "0 10px",
          }}
        >
          <Search size={12} color="var(--text-tertiary)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj klienta..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
        {filtered.length === 0 && (
          <div
            style={{
              padding: "20px 8px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
            }}
          >
            Brak klientów "Nowy lead"
          </div>
        )}
        {filtered.map((c) => {
          const isSelected = selected?.id === c.id;
          return (
            <div
              key={c.id}
              onClick={() => onSelect(isSelected ? null : c)}
              style={{
                padding: "9px 10px",
                borderRadius: 8,
                marginBottom: 2,
                cursor: "pointer",
                background: isSelected ? "var(--accent-muted)" : "transparent",
                border: isSelected ? "1px solid var(--accent-border)" : "1px solid transparent",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: isSelected ? "var(--accent)" : "var(--text-primary)",
                  marginBottom: 2,
                }}
              >
                {c.kontakt || c.firma || "—"}
              </div>
              {c.firma && c.kontakt && c.firma !== c.kontakt && (
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{c.firma}</div>
              )}
              {c.telefon && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {formatPhone(c.telefon)}
                </div>
              )}
              {c.email && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 1,
                    fontFamily: "var(--font-sans)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 200,
                  }}
                >
                  {c.email}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <div
          style={{
            padding: "10px 12px",
            borderTop: "1px solid #E5E5EA",
            flexShrink: 0,
            background: "#F5F5F7",
          }}
        >
          <button
            onClick={() => onSelect(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              fontSize: 11,
              fontFamily: "var(--font-sans)",
            }}
          >
            <X size={11} />
            Odznacz klienta
          </button>
        </div>
      )}
    </div>
  );
}

// ── Frazy potwierdzające ─────────────────────────────────────────────

function PhrasesPanel({
  onCopy,
  copiedId,
}: {
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ACKNOWLEDGMENT_PHRASES.map((phrase, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            borderRadius: 8,
            border: "1px solid #E5E5EA",
            background: "#F5F5F7",
          }}
        >
          <span
            style={{
              flex: 1,
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-primary)",
            }}
          >
            {phrase}
          </span>
          <button
            onClick={() => onCopy(`phrase-${i}`, phrase)}
            style={{
              flexShrink: 0,
              padding: "3px 7px",
              borderRadius: 5,
              border: "1px solid #E5E5EA",
              background: "transparent",
              cursor: "pointer",
              color: copiedId === `phrase-${i}` ? "var(--success-text)" : "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {copiedId === `phrase-${i}` ? <CheckCircle2 size={10} /> : <Copy size={10} />}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Right panel ───────────────────────────────────────────────────────

function RightPanel({
  fill,
  onCopy,
  copiedId,
  openObjectionId,
  setOpenObjectionId,
}: {
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  openObjectionId: string | null;
  setOpenObjectionId: (id: string | null) => void;
}) {
  return (
    <div
      style={{
        width: 320,
        minWidth: 320,
        height: "100%",
        borderLeft: "1px solid #E5E5EA",
        overflowY: "auto",
        padding: "12px 12px",
        background: "#fff",
      }}
    >
      <Card title="Obiekcje kwalifikacja">
        <ObjectionsPanel
          fill={fill}
          onCopy={onCopy}
          copiedId={copiedId}
          openId={openObjectionId}
          setOpenId={setOpenObjectionId}
        />
      </Card>
      <Card title="Frazy potwierdzające" collapsible defaultOpen={false}>
        <PhrasesPanel onCopy={onCopy} copiedId={copiedId} />
      </Card>
      <Card title="SMS / Wiadomości" collapsible defaultOpen={false}>
        <SmsPanel fill={fill} onCopy={onCopy} copiedId={copiedId} />
      </Card>
      <Card title="ICP Quick Reference" collapsible defaultOpen={false}>
        <IcpPanel />
      </Card>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function KwalifikacjaPage() {
  const [clients, setClients] = useState<PipelineClientDetailed[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PipelineClientDetailed | null>(null);
  const [vocative, setVocative] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [calculatorFlags, setCalculatorFlags] = useState<Record<string, boolean>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [openObjectionId, setOpenObjectionId] = useState<string | null>(null);
  const [calcOsoby, setCalcOsoby] = useState(2);
  const [calcGodziny, setCalcGodziny] = useState(3);
  const [calcStawka, setCalcStawka] = useState(55); // NOWE
  const [sprzedawcaImie, setSprzedawcaImie] = useState("Michał");

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
    if (selected) setVocative(toVocative(selected.kontakt || selected.firma || ""));
    else setVocative("");
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const saved = localStorage.getItem(`kwal_note_${selected?.id ?? "global"}`);
    setNote(saved ?? "");
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const saved = localStorage.getItem("kwal_sprzedawca_imie");
    if (saved) setSprzedawcaImie(saved);
  }, []);

  useEffect(() => {
    setCalculatorFlags({});
    setSelectedOptions({});
    setCalcOsoby(2);
    setCalcGodziny(3);
    setOpenObjectionId(null);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSprzedawcaImie = (value: string) => {
    setSprzedawcaImie(value);
    localStorage.setItem("kwal_sprzedawca_imie", value);
  };

  const fmtPln = (n: number) =>
    n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const fill = (text: string): string => {
    let out = text;
    const nominative = (selected?.kontakt ?? "").trim().split(/\s+/)[0];
    if (nominative) {
      out = out.replace(/Pan \{IMIĘ\}/g, `Pan ${nominative}`);
      out = out.replace(/Pani \{IMIĘ\}/g, `Pani ${nominative}`);
    }
    if (vocative.trim()) out = out.replace(/\{IMIĘ\}/g, vocative.trim());
    if (sprzedawcaImie.trim()) out = out.replace(/\{IMIĘ_SPRZEDAWCY\}/g, sprzedawcaImie.trim());

    const wynikGodziny = calcOsoby * calcGodziny * 22;
    const wynikPln = wynikGodziny * calcStawka; // Zmienione z 50
    out = out.replace(/\[WYNIK Z KALKULATORA\]/g, String(wynikGodziny));
    out = out.replace(/\[WARTOŚĆ PLN\]/g, `${fmtPln(wynikPln)} zł`);
    out = out.replace(/\[WYNIK × 0\.8\]/g, String(Math.round(wynikGodziny * 0.8)));
    out = out.replace(/\[LICZBA Z KALKULATORA\]/g, String(Math.round(wynikGodziny * 0.8)));
    return out;
  };

  const onCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(fill(text)).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const jumpToStep = useCallback((stepId: string) => {
    const el = document.getElementById(`step-${stepId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.style.transition = "box-shadow 250ms, background-color 250ms";
    el.style.boxShadow = "0 0 0 2px var(--accent)";
    el.style.backgroundColor = "rgba(10,132,255,0.08)";
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
    (stepId: string, option: DecisionOption) => {
      setSelectedOptions((prev) => ({ ...prev, [stepId]: option.trigger }));
      if (option.calculatorFlag) {
        setCalculatorFlags((prev) => ({ ...prev, [option.calculatorFlag!]: true }));
      }
      if (option.openObjectionId) {
        jumpToObjection(option.openObjectionId);
        return;
      }
      if (option.goToStepId) {
        jumpToStep(option.goToStepId);
      }
    },
    [jumpToStep, jumpToObjection],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          borderBottom: "1px solid #E5E5EA",
          background: "#fff",
          flexShrink: 0,
          gap: 16,
        }}
      >
        <Phone size={16} color="var(--accent)" strokeWidth={1.8} />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          Kwalifikacja
        </span>
        <div style={{ height: 20, width: 1, background: "#E5E5EA", marginLeft: 4 }} />
        <span
          style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-tertiary)" }}
        >
          {selected ? selected.kontakt || selected.firma : "Wybierz klienta z listy"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Imię sprzedawcy:
          </span>
          <input
            value={sprzedawcaImie}
            onChange={(e) => updateSprzedawcaImie(e.target.value)}
            placeholder="np. Michał"
            style={{
              height: 32,
              padding: "0 10px",
              borderRadius: 8,
              border: "1px solid #E5E5EA",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-primary)",
              background: "#F5F5F7",
              outline: "none",
              width: 110,
            }}
          />
        </div>
        {selected && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Forma grzecznościowa:
            </span>
            <input
              value={vocative}
              onChange={(e) => setVocative(e.target.value)}
              placeholder="wołacz imienia"
              style={{
                height: 32,
                padding: "0 10px",
                borderRadius: 8,
                border: "1px solid #E5E5EA",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-primary)",
                background: "#F5F5F7",
                outline: "none",
                width: 140,
              }}
            />
          </div>
        )}
      </div>

      {/* 3-column layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: client list */}
        <ClientSidebar
          clients={clients}
          loading={loading}
          selected={selected}
          onSelect={setSelected}
          onRefresh={fetchClients}
        />

        {/* Main: script + roi + dalsze kroki */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: "#F5F5F7" }}>
          <Card title="Skrypt kwalifikacyjny">
            <CalculatorFlagsBar flags={calculatorFlags} />
            {STEPS_K.map((step, index) => (
              <ScriptStep
                key={step.id}
                step={step}
                index={index}
                fill={fill}
                onCopy={onCopy}
                copiedId={copiedId}
                onJump={jumpToStep}
                onDecisionSelect={handleDecisionSelect}
                selectedTrigger={selectedOptions[step.id]}
              >
                {step.hasCalculator && (
                  <ScriptKalkulator
                    clientName={selected?.kontakt || selected?.firma || ""}
                    autoFlags={calculatorFlags}
                    osoby={calcOsoby}
                    godziny={calcGodziny}
                    stawka={calcStawka}
                    onOsobyChange={setCalcOsoby}
                    onGodzinyChange={setCalcGodziny}
                    onStawkaChange={setCalcStawka}
                  />
                )}
              </ScriptStep>
            ))}
          </Card>

          <Card title="Dalsze kroki">
            <DalszeKroki client={selected} />
          </Card>

          <Card title="Przypadki specjalne" collapsible defaultOpen={false}>
            <PrzypadkiSpecjalne />
          </Card>

          <Card title="Notatki z rozmowy" collapsible defaultOpen={false}>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                localStorage.setItem(`kwal_note_${selected?.id ?? "global"}`, e.target.value);
              }}
              placeholder="Notatki z rozmowy kwalifikacyjnej..."
              style={{
                width: "100%",
                minHeight: 120,
                resize: "vertical",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-primary)",
                border: "1px solid #E5E5EA",
                borderRadius: 8,
                padding: "10px 12px",
                background: "#fff",
                outline: "none",
                lineHeight: 1.55,
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <FileText size={11} color="var(--text-tertiary)" />
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Zapis automatyczny per klient
              </span>
            </div>
          </Card>
        </div>

        {/* Right: objections + SMS + ICP */}
        <RightPanel
          fill={fill}
          onCopy={onCopy}
          copiedId={copiedId}
          openObjectionId={openObjectionId}
          setOpenObjectionId={setOpenObjectionId}
        />
      </div>
    </div>
  );
}
