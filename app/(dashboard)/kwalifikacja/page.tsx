"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  Lock,
  MessageSquare,
  PhoneCall,
  PhoneMissed,
  Plus,
  Trash2,
  Undo2,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GoogleTaskList } from "@/app/api/google/tasks/route";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { ClientSidebar } from "@/components/clients/ClientSidebar";
import { ProgressBar, SectionLabelSmall, StepCard } from "@/components/dalsze-kroki/DalszeKrokiUI";
import { DecisionDiagram } from "@/components/scripts/DecisionDiagram";
import { NextStepArrow } from "@/components/scripts/NextStepArrow";
import { useRole } from "@/lib/auth/RoleContext";
import { useFormaGrzecznosciowa } from "@/lib/scripts/formaGrzecznosciowa";
import {
  ACKNOWLEDGMENT_PHRASES,
  ICP_RULES,
  OBJECTIONS_K,
  STEPS_K,
} from "@/lib/scripts/kwalifikacyjna";
import { GROUP_COLORS, MESSAGES_DATA } from "@/lib/scripts/messages";
import { getRecommendedModules } from "@/lib/scripts/moduleRecommendation";
import type { CalculatorGroup, DecisionOption, Objection, ScriptLine } from "@/lib/scripts/types";

// ── Helpers ──────────────────────────────────────────────────────────

function toVocative(name: string): string {
  const first = name.trim().split(" ")[0];
  if (!first) return name;
  if (first.endsWith("ał")) return `${first.slice(0, -2)}ale`;
  if (first.endsWith("eł")) return `${first.slice(0, -2)}le`;
  if (first.endsWith("ek") && first.length > 3) return `${first.slice(0, -2)}ku`;
  if (first.endsWith("a") && first.length > 2) return `${first.slice(0, -1)}o`;
  return first;
}

// Rozbija wypowiedź settera na osobne akapity, jeden na zdanie, żeby czytało
// się rytmem "zdanie, oddech, zdanie" podczas rozmowy na żywo. Dzieli tylko po
// realnym końcu zdania (kropka/znak zapytania + spacja + wielka litera), więc
// skróty typu "np." czy "z o.o." nie rwą tekstu w złym miejscu.
function toSentences(text: string): string[] {
  const parts = text
    .replace(/([.?!])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text];
}

// Najczęstsze reakcje klienta na starcie rozmowy — jeden przycisk na sytuację,
// prowadzi wprost do gotowej, konkretnej odpowiedzi w panelu obiekcji (bez
// przewijania strony). Zamiast długiej listy wariantów mówiących to samo.
const OPENER_REACTIONS: { label: string; objId: string }[] = [
  { label: "Nie pamięta reklamy", objId: "ok_nb" },
  { label: "To nie ja / żona / przemyślę", objId: "ok_nie_ja" },
  { label: "O co chodzi / cena", objId: "ok_cc" },
  { label: "Nie mam czasu", objId: "ok1" },
  { label: "Wyślij na maila", objId: "ok_em" },
];

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
  forceOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 12,
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
        border: "1px solid rgba(67, 121, 177,0.18)",
        background: "rgba(67, 121, 177,0.05)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 700,
          color: "var(--accent-text)",
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
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
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

function RecommendedModulesPanel({
  calculatorFlags,
  selectedOptions,
}: {
  calculatorFlags: Record<string, boolean>;
  selectedOptions: Record<string, string>;
}) {
  const modules = getRecommendedModules(calculatorFlags, selectedOptions);
  if (modules.length === 0) return null;
  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 700,
          color: "var(--success-text)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}
      >
        Co możemy mu zaoferować, na podstawie tej rozmowy
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {modules.map((m) => (
          <div
            key={m.module}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(47, 162, 98,0.05)",
              border: "1px solid rgba(47, 162, 98,0.18)",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {m.module}
            </span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                fontStyle: "italic",
              }}
            >
              {m.reason}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Inline kalkulator wbudowany w skrypt ─────────────────────────────

const PRACA_TYPES = [
  { id: "zlecenia", label: "Automatyzacja TMS: wczytywanie zleceń z maila" },
  { id: "cmr", label: "Dokumenty i pliki: CMR i potwierdzenia dostawy" },
  { id: "faktury_recznie", label: "Dokumenty i pliki: faktury" },
  { id: "komunikacja", label: "Powiadomienia automatyczne: status bez dzwonienia" },
  { id: "inne", label: "Inne: do doprecyzowania ręcznie" },
] as const;

// Presety ról jednym kliknięciem (punkt "KALKULATOR ROI" przebudowy 2026-08-08) —
// zero wpisywania nazw ręcznie w trakcie rozmowy, wartości domyślne to orientacyjny
// punkt startowy do skorygowania na podstawie tego co powie klient.
const ROLE_PRESETS: {
  id: string;
  label: string;
  osoby: number;
  godziny: number;
  stawka: number;
}[] = [
  { id: "spedytor", label: "Spedytor", osoby: 1, godziny: 2, stawka: 50 },
  { id: "faktury", label: "Fakturzystka / księgowość", osoby: 1, godziny: 1.5, stawka: 45 },
  { id: "dyspozytor", label: "Dyspozytor", osoby: 1, godziny: 1.5, stawka: 50 },
  { id: "wlasciciel", label: "Właściciel", osoby: 1, godziny: 1, stawka: 80 },
  { id: "inne", label: "Inne", osoby: 1, godziny: 1, stawka: 50 },
];

let groupIdCounter = 0;
function newGroupId(): string {
  groupIdCounter += 1;
  return `grp_${Date.now()}_${groupIdCounter}`;
}

// Zwykły <input type="number"> kontrolowany liczbą wymusza natychmiastowy
// powrót do `min` przy każdym skasowaniu pola (Number("") || min), co psuje
// ręczne wpisywanie z klawiatury: pole wraca do min w trakcie kasowania,
// zanim zdążysz wpisać nową cyfrę, więc realnie działa tylko przez strzałki.
// Lokalny bufor tekstowy pozwala pisać swobodnie, walidacja/clamp dopiero
// przy onBlur.
function NumberField({
  value,
  min,
  max,
  step,
  onCommit,
  style,
}: {
  value: number;
  min: number;
  max?: number;
  step?: number;
  onCommit: (n: number) => void;
  style?: React.CSSProperties;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const n = Number(raw);
        if (raw.trim() !== "" && !Number.isNaN(n)) {
          onCommit(n);
        }
      }}
      onBlur={() => {
        const n = Number(text);
        const safe = Number.isNaN(n) ? min : n;
        const clamped = Math.max(min, max !== undefined ? Math.min(safe, max) : safe);
        setText(String(clamped));
        onCommit(clamped);
      }}
      style={style}
    />
  );
}

function GroupRow({
  group,
  onChange,
  onRemove,
  removable,
}: {
  group: CalculatorGroup;
  onChange: (patch: Partial<CalculatorGroup>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const fieldStyle: React.CSSProperties = {
    height: 36,
    borderRadius: 8,
    border: "1px solid var(--border)",
    padding: "0 10px",
    fontFamily: "var(--font-sans)",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
    background: "var(--bg)",
    outline: "none",
    width: "100%",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: 10,
    fontWeight: 600,
    color: "var(--text-tertiary)",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        padding: "8px",
        borderRadius: 8,
        background: "var(--bg-hover)",
        border: "1px solid var(--border)",
      }}
    >
      <label style={{ flex: 1.4, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={labelStyle}>Rola</span>
        <input
          value={group.label}
          onChange={(e) => onChange({ label: e.target.value })}
          style={fieldStyle}
        />
      </label>
      <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={labelStyle}>Osoby</span>
        <NumberField
          min={1}
          max={50}
          value={group.osoby}
          onCommit={(n) => onChange({ osoby: n })}
          style={fieldStyle}
        />
      </label>
      <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={labelStyle}>Godz/dzień</span>
        <NumberField
          min={0.5}
          max={12}
          step={0.5}
          value={group.godziny}
          onCommit={(n) => onChange({ godziny: n })}
          style={fieldStyle}
        />
      </label>
      <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={labelStyle}>Stawka zł/h</span>
        <NumberField
          min={20}
          max={200}
          value={group.stawka}
          onCommit={(n) => onChange({ stawka: n })}
          style={fieldStyle}
        />
      </label>
      {removable && (
        <button
          onClick={onRemove}
          title="Usuń grupę"
          style={{
            height: 36,
            width: 34,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--error-text)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

function ScriptKalkulator({
  clientName,
  autoFlags,
  groups,
  onGroupsChange,
}: {
  clientName: string;
  autoFlags: Record<string, boolean>;
  groups: CalculatorGroup[];
  onGroupsChange: (groups: CalculatorGroup[]) => void;
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

  const updateGroup = (id: string, patch: Partial<CalculatorGroup>) => {
    onGroupsChange(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };
  const addGroup = (preset?: (typeof ROLE_PRESETS)[number]) => {
    onGroupsChange([
      ...groups,
      preset
        ? {
            id: newGroupId(),
            label: preset.label,
            osoby: preset.osoby,
            godziny: preset.godziny,
            stawka: preset.stawka,
          }
        : { id: newGroupId(), label: "Nowa rola", osoby: 1, godziny: 2, stawka: 50 },
    ]);
  };
  const removeGroup = (id: string) => {
    onGroupsChange(groups.filter((g) => g.id !== id));
  };

  const miesiecznieH = groups.reduce((sum, g) => sum + g.osoby * g.godziny * 22, 0);
  const miesieczniePLN = groups.reduce((sum, g) => sum + g.osoby * g.godziny * 22 * g.stawka, 0);
  const rocznie = miesieczniePLN * 12;
  // 70% czasu bazowego, punkt startowy zgodny z domyślnym celem efektywności z
  // context/PRODUKT_ZRODLO_PRAWDY.md (min. 70%) — to WSTĘPNY szacunek na etapie
  // kwalifikacji, nie wiążąca gwarancja. Wiążąca liczba jest mierzona dopiero na
  // spotkaniu wdrożeniowym (Załącznik 1 umowy), z realnie zmierzonych czasów, nie
  // z deklaracji klienta na telefonie — dlatego etykieta niżej mówi "wstępny
  // potencjał", nigdy "gwarancja", na tym etapie rozmowy.
  const potencjalH = Math.round(miesiecznieH * 0.7);

  const fmt = (n: number) =>
    n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const wynikZdanie =
    groups.length === 1
      ? `Przy ${groups[0].osoby} ${groups[0].osoby === 1 ? "osobie" : "osobach"} i ${groups[0].godziny} ${groups[0].godziny === 1 ? "godzinie" : "godzinach"} dziennie — to ${fmt(miesiecznieH)} godzin miesięcznie, czyli ${fmt(miesieczniePLN)} zł kosztu pracy. Rocznie ${fmt(rocznie)} zł.`
      : `Łącznie dla ${groups.length} ról w firmie — to ${fmt(miesiecznieH)} godzin miesięcznie, czyli ${fmt(miesieczniePLN)} zł kosztu pracy. Rocznie ${fmt(rocznie)} zł.`;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--bg-elevated)",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          background: "rgba(67, 121, 177,0.04)",
          borderBottom: "1px solid var(--border)",
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
            color: "var(--accent-text)",
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
        {/* Presety ról jednym kliknięciem — zero wpisywania nazw ręcznie w trakcie rozmowy */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
            Dodaj rolę
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ROLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => addGroup(preset)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 10px",
                  borderRadius: 20,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Plus size={11} />
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grupy ról — każda ma własną liczbę osób, godzin i stawkę */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {groups.map((g) => (
            <GroupRow
              key={g.id}
              group={g}
              onChange={(patch) => updateGroup(g.id, patch)}
              onRemove={() => removeGroup(g.id)}
              removable={groups.length > 1}
            />
          ))}
          <button
            onClick={() => addGroup()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px dashed var(--text-tertiary)",
              background: "transparent",
              color: "var(--accent-text)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={13} />
            Dodaj rolę niestandardową
          </button>
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            color: "var(--text-tertiary)",
            fontStyle: "italic",
          }}
        >
          Stawki w presetach to szacunek kosztu pracy z narzutami. Dostosuj godziny dziennie i
          stawkę dla każdej roli, jeśli klient poda inną wartość.
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
                    border: on ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: on ? "rgba(67, 121, 177, 0.08)" : "var(--bg)",
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

        {/* Wynik — jedna, jasna prezentacja, bez duplikowania tych samych liczb dwa razy */}
        <div
          style={{
            background: "rgba(67, 121, 177,0.05)",
            border: "1px solid rgba(67, 121, 177,0.18)",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Gotowe zdanie do wypowiedzenia — jedyne miejsce z liczbami miesięcznie/rocznie */}
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              lineHeight: 1.55,
              color: "var(--text-primary)",
            }}
          >
            {wynikZdanie}
          </div>

          {/* Wstępny potencjał, nie wiążąca gwarancja na tym etapie */}
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              background: "rgba(47, 162, 98,0.08)",
              border: "1px solid rgba(47, 162, 98,0.25)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--success-text)",
            }}
          >
            Wstępny potencjał oszczędności: około {fmt(potencjalH)} h miesięcznie
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              color: "var(--text-tertiary)",
              fontStyle: "italic",
            }}
          >
            To szacunek na etapie kwalifikacji, nie gwarancja. Wiążąca liczba jest mierzona ze
            zmierzonych czasów przed podpisaniem umowy, na spotkaniu wdrożeniowym (Załącznik 1).
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Banner: brak odbioru — widoczny zanim setter zacznie opener ───────

function BrakOdbioruBanner({ onOpenSms }: { onOpenSms: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        marginBottom: 12,
        borderRadius: 10,
        background: "var(--warning-bg)",
        border: "1px solid var(--warning)",
      }}
    >
      <PhoneMissed size={16} color="var(--warning)" strokeWidth={2} />
      <div style={{ flex: 1 }}>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Brak odbioru?
        </span>{" "}
        <span
          style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)" }}
        >
          Po 3 próbach wyślij SMS z gotowego szablonu.
        </span>
      </div>
      <button
        onClick={onOpenSms}
        style={{
          height: 28,
          padding: "0 12px",
          borderRadius: 7,
          border: "1px solid var(--warning)",
          background: "var(--bg-elevated)",
          color: "var(--warning-text)",
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Otwórz SMS
      </button>
    </div>
  );
}

// ── Pole wpisywane na bieżąco podczas zbierania konkretnej informacji ──

function InlineCaptureInput({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (n: number) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 8,
        background: "rgba(67, 121, 177,0.05)",
        border: "1px solid rgba(67, 121, 177,0.18)",
        width: "fit-content",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--accent-text)",
        }}
      >
        {label}
      </span>
      <NumberField
        min={min}
        value={value}
        onCommit={onChange}
        style={{
          height: 36,
          width: 70,
          borderRadius: 8,
          border: "1px solid var(--border)",
          padding: "0 8px",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 700,
          color: "var(--text-primary)",
          background: "var(--bg-elevated)",
          outline: "none",
        }}
      />
    </label>
  );
}

// ── Script step ───────────────────────────────────────────────────────

function ScriptStep({
  step,
  fill,
  onCopy,
  copiedId,
  onJump,
  onDecisionSelect,
  onJumpToObjection,
  selectedTrigger,
  role,
  children,
}: {
  step: (typeof STEPS_K)[0];
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  onJump: (stepId: string) => void;
  onDecisionSelect: (stepId: string, option: DecisionOption) => void;
  onJumpToObjection: (objectionId: string) => void;
  selectedTrigger?: string;
  role: "admin" | "setter" | "closer" | null;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  // Etap "opener" dostaje plakietkę statusu w języku Pipeline ("NOWY LEAD"),
  // reszta kroków neutralną plakietkę akcentową z własną nazwą etapu. Bez
  // numeracji i bez ciasnego mikro-tagu — jedna czytelna plakietka na kartę.
  const isOpener = step.id === "opener";
  // Styl plakietki wzięty z etykiet statusu w /pipeline (kropka + wersaliki +
  // tło/obwódka z alfą). Kolor w hex, nie token, bo plakietka dokleja alfę
  // sufiksem "26"/"70" — "var(--accent)26" nie jest poprawnym kolorem CSS.
  // Tekst zostaje nazwą etapu ("OPENING" itd.), plakietka to tylko forma wizualna.
  const pillColor = isOpener ? "#3b82f6" : "#4379b1";
  const pillLabel = step.label;

  return (
    <div
      id={`step-${step.id}`}
      style={{
        marginBottom: 10,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-elevated)",
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
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 9px",
            borderRadius: "var(--radius-sm)",
            background: `${pillColor}26`,
            border: `1px solid ${pillColor}70`,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: pillColor,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {pillLabel}
          </span>
        </span>
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
                {(() => {
                  const displayText =
                    role === "setter" && line.textSetter ? line.textSetter : line.text;
                  const blocks = Array.isArray(displayText) ? displayText : [displayText];
                  // Wypowiedzi settera ("say") łamiemy dodatkowo na zdania —
                  // jeden akapit na zdanie. Reszta linii zostaje jak w danych.
                  const paragraphs =
                    line.t === "say" ? blocks.flatMap((b) => toSentences(b)) : blocks;
                  return paragraphs.map((paragraph, pi) => (
                    <p
                      key={pi}
                      style={{
                        margin: pi === 0 ? 0 : "7px 0 0 0",
                        fontFamily: "var(--font-sans)",
                        fontSize: 14.5,
                        lineHeight: 1.6,
                        color: LINE_COLOR[line.t],
                        textWrap: "pretty" as React.CSSProperties["textWrap"],
                      }}
                    >
                      {fill(paragraph)}
                    </p>
                  ));
                })()}
                {line.t === "say" && line.cel && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "var(--text-secondary)",
                      marginTop: 7,
                      paddingLeft: 9,
                      borderLeft: "2px solid var(--accent)",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "var(--accent)" }}>Cel: </span>
                    {line.cel}
                  </div>
                )}
                {line.t === "note" && line.linkObjectionId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToObjection(line.linkObjectionId!);
                    }}
                    style={{
                      marginTop: 6,
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--warning)",
                      background: "var(--bg-elevated)",
                      color: "var(--warning-text)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Otwórz obiekcję
                  </button>
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
                    border: "1px solid var(--border)",
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
          {step.id === "opener" && (
            <div style={{ marginTop: 2 }}>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  marginBottom: 6,
                }}
              >
                Jeśli klient odbija na starcie
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {OPENER_REACTIONS.map((r) => (
                  <button
                    key={r.objId}
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToObjection(r.objId);
                    }}
                    style={{
                      height: 28,
                      padding: "0 10px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step.decision && (
            <DecisionDiagram
              decision={step.decision}
              onSelect={(option) => onDecisionSelect(step.id, option)}
              onJump={onJump}
              selectedTrigger={selectedTrigger}
            />
          )}
          {!step.decision && step.nextStepId && (
            <NextStepArrow label="Dalej" onJump={() => onJump(step.nextStepId!)} />
          )}
          {children && (
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 10 }}>
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Objections accordion ──────────────────────────────────────────────

const STAGE_LABELS: Partial<Record<Objection["stage"], string>> = {
  opening: "Otwarcie rozmowy",
  icp: "Weryfikacja ICP",
  diagnoza: "Diagnoza dokumentów",
  kalkulator: "Kalkulator ROI",
  closing: "Umówienie spotkania",
  wszedzie: "Obiekcje ogólne (mogą wystąpić wszędzie)",
};

const STAGE_ORDER: Objection["stage"][] = [
  "opening",
  "icp",
  "diagnoza",
  "kalkulator",
  "closing",
  "wszedzie",
];

// Kategoria obiekcji = etap rozmowy w której pada (zamiast zgadywania kategorii
// z treści etykiety) — pole `stage` jest obowiązkowe i ma pełne pokrycie dla
// każdej obiekcji, w przeciwieństwie do dopasowania po słowach kluczowych w
// `objectionColor()` (lib/scripts/types.ts), które dla tego skryptu zostawiało
// większość obiekcji w nieopisującym niczego kolorze "Inne". Sześć odrębnych,
// nasyconych barw, żadna nie powtarza odcienia używanego gdzie indziej w UI
// (np. --text-tertiary) — kategoria ma się wizualnie wyróżniać, nie zlewać.
const STAGE_BADGE: Record<Objection["stage"], { accent: string; short: string }> = {
  opening: { accent: "#3b82f6", short: "Otwarcie" },
  icp: { accent: "#8b5cf6", short: "ICP" },
  diagnoza: { accent: "#14b8a6", short: "Diagnoza" },
  kalkulator: { accent: "#f59e0b", short: "Kalkulator" },
  pitch: { accent: "#f59e0b", short: "Kalkulator" },
  cena: { accent: "#ef4444", short: "Cena" },
  closing: { accent: "#34d399", short: "Umówienie" },
  wszedzie: { accent: "#f43f5e", short: "Ogólne" },
  kickoff: { accent: "#34d399", short: "Kickoff" },
  przedkontraktowa: { accent: "#f59e0b", short: "Przedkontraktowa" },
};

function renderObjection(
  obj: Objection,
  openId: string | null,
  setOpenId: (id: string | null) => void,
  fill: (t: string) => string,
  onCopy: (id: string, text: string) => void,
  copiedId: string | null,
  onJumpStep: (stepId: string) => void,
) {
  const badge = STAGE_BADGE[obj.stage];
  const isOpen = openId === obj.id;
  return (
    <div
      key={obj.id}
      id={`objection-${obj.id}`}
      style={{
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${badge.accent}`,
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--bg-elevated)",
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
              fontSize: 8,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: 1,
            }}
          >
            {badge.short}
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
                  lineHeight: 1.55,
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
                  border: "1px solid var(--border)",
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
                fontSize: 13,
                lineHeight: 1.55,
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
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
              }}
            >
              {obj.note}
            </p>
          )}
          {obj.nextStepId && (
            <NextStepArrow
              label={`Dalej: ${findStepLabel(obj.nextStepId)}`}
              onJump={() => onJumpStep(obj.nextStepId!)}
            />
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
                  color: "var(--accent-text)",
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
  onJumpStep,
}: {
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onJumpStep: (stepId: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              {items.map((obj) =>
                renderObjection(obj, openId, setOpenId, fill, onCopy, copiedId, onJumpStep),
              )}
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
  onSmsCopy,
}: {
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  onSmsCopy: () => void;
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
        <div
          key={item.id}
          id={`sms-${item.id}`}
          style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 12px" }}
        >
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
            onClick={() => {
              onCopy(`sms-${item.id}`, item.text);
              onSmsCopy();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
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
        <div
          key={item.id}
          style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 12px" }}
        >
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
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
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
                color: rule.ok ? "var(--success-text)" : "var(--error-text)",
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

const DALSZE_KROKI_LABELS: Record<"calendly" | "sms" | "reminderSms" | "pipeline", string> = {
  calendly: "Link Calendly wysłany",
  sms: "SMS potwierdzający wysłany",
  reminderSms: "Wyślij przypomnienie dzień przed",
  pipeline: "Uruchom Agenta 1 (ustawi status automatycznie)",
};

const smsPotwierdzajacyTekst = (clientName: string, dzien: string, godzina: string) =>
  `Dzień dobry Panie ${clientName || "[Imię]"}, potwierdzam nasze spotkanie na ${dzien || "[dzień]"} o ${godzina || "[godzina]"}. Link do spotkania wyśle Panu Calendly na maila. Do usłyszenia.`;

const smsPrzypomnienieTekst = (clientName: string) =>
  (MESSAGES_DATA.sms.find((m) => m.id === "m3")?.text ?? "").replace(
    /\{IMIĘ\}/g,
    clientName || "[Imię]",
  );

function DalszeKroki({ client }: { client: PipelineClientDetailed | null }) {
  const [checks, setChecks] = useState({
    calendly: false,
    sms: false,
    reminderSms: false,
    pipeline: false,
  });
  const toggle = (k: keyof typeof checks) => setChecks((p) => ({ ...p, [k]: !p[k] }));
  const [smsExpanded, setSmsExpanded] = useState(false);
  const [smsCopied, setSmsCopied] = useState(false);
  const [reminderSmsExpanded, setReminderSmsExpanded] = useState(false);
  const [reminderSmsCopied, setReminderSmsCopied] = useState(false);
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
      const checkedLabels = (["calendly", "sms", "reminderSms", "pipeline"] as const)
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
            background: "var(--bg)",
            border: "1px solid var(--border)",
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
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
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
        done={checks.reminderSms}
        label={DALSZE_KROKI_LABELS.reminderSms}
        onToggle={() => toggle("reminderSms")}
        actionLabel={reminderSmsExpanded ? "Ukryj" : "Pokaż SMS"}
        onAction={() => setReminderSmsExpanded((p) => !p)}
      />
      {reminderSmsExpanded && (
        <div
          style={{
            marginTop: -2,
            marginBottom: 8,
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--bg)",
            border: "1px solid var(--border)",
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
            {smsPrzypomnienieTekst(client?.kontakt?.split(" ")[0] ?? "")}
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                smsPrzypomnienieTekst(client?.kontakt?.split(" ")[0] ?? ""),
              );
              setReminderSmsCopied(true);
              setTimeout(() => setReminderSmsCopied(false), 1500);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: reminderSmsCopied ? "var(--success-text)" : "var(--text-secondary)",
            }}
          >
            {reminderSmsCopied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
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
              color: "var(--text-on-accent)",
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
            <div
              style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--error-text)" }}
            >
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
          style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}
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
              background: openId === c.id ? "var(--bg)" : "var(--bg-elevated)",
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
            <div style={{ padding: "10px 12px 14px", display: "flex", flexDirection: "column" }}>
              {c.content.map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "stretch", gap: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        color: "var(--text-on-accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-sans)",
                        fontSize: 10,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    {i < c.content.length - 1 && (
                      <div
                        style={{ width: 1, flex: 1, background: "var(--border)", minHeight: 10 }}
                      />
                    )}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      paddingBottom: 12,
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    {line}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
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
            border: "1px solid var(--border)",
            background: "var(--bg)",
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
              border: "1px solid var(--border)",
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
  smsForceOpen,
  onSmsCopy,
  onJumpStep,
}: {
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  openObjectionId: string | null;
  setOpenObjectionId: (id: string | null) => void;
  smsForceOpen: boolean;
  onSmsCopy: () => void;
  onJumpStep: (stepId: string) => void;
}) {
  return (
    <div
      style={{
        width: 320,
        minWidth: 320,
        height: "100%",
        borderLeft: "1px solid var(--border)",
        overflowY: "auto",
        padding: "12px 12px",
        background: "var(--bg-elevated)",
      }}
    >
      <Card title="Obiekcje w kwalifikacji">
        <ObjectionsPanel
          fill={fill}
          onCopy={onCopy}
          copiedId={copiedId}
          openId={openObjectionId}
          setOpenId={setOpenObjectionId}
          onJumpStep={onJumpStep}
        />
      </Card>
      <Card title="Frazy potwierdzające" collapsible defaultOpen={false}>
        <PhrasesPanel onCopy={onCopy} copiedId={copiedId} />
      </Card>
      <Card title="SMS / Wiadomości" collapsible defaultOpen={false} forceOpen={smsForceOpen}>
        <SmsPanel fill={fill} onCopy={onCopy} copiedId={copiedId} onSmsCopy={onSmsCopy} />
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
  const [calcGroups, setCalcGroups] = useState<CalculatorGroup[]>([
    { id: "grp_default", label: "Biuro / spedycja", osoby: 2, godziny: 3, stawka: 50 },
  ]);
  const [sprzedawcaImie, setSprzedawcaImie] = useState("Michał");
  const [smsForceOpen, setSmsForceOpen] = useState(false);
  const [tallyFlash, setTallyFlash] = useState<"dial" | "rozmowa_kwalifikacja" | "sms" | null>(
    null,
  );
  const [tallyUndo, setTallyUndo] = useState<"dial" | "rozmowa_kwalifikacja" | "sms" | null>(null);
  const role = useRole();

  const totalGodzinyH = calcGroups.reduce((sum, g) => sum + g.osoby * g.godziny * 22, 0);
  const totalPln = calcGroups.reduce((sum, g) => sum + g.osoby * g.godziny * 22 * g.stawka, 0);

  const updateFirstGroup = (patch: Partial<CalculatorGroup>) => {
    setCalcGroups((prev) => prev.map((g, i) => (i === 0 ? { ...g, ...patch } : g)));
  };

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
    setCalcGroups([
      { id: "grp_default", label: "Biuro / spedycja", osoby: 2, godziny: 3, stawka: 50 },
    ]);
    setOpenObjectionId(null);
    setSmsForceOpen(false);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSprzedawcaImie = (value: string) => {
    setSprzedawcaImie(value);
    localStorage.setItem("kwal_sprzedawca_imie", value);
  };

  const fmtPln = (n: number) =>
    n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const firstName = (selected?.kontakt || selected?.firma || "").trim().split(/\s+/)[0] ?? "";
  const { forma, formaOverride, setFormaOverride } = useFormaGrzecznosciowa(
    firstName,
    selected?.id,
  );

  const fill = (text: string): string => {
    let out = text;
    const nominative = (selected?.kontakt || selected?.firma || "").trim().split(/\s+/)[0];
    if (nominative) {
      out = out.replace(/Pan \{IMIĘ\}/g, `${forma} ${nominative}`);
      out = out.replace(/Pani \{IMIĘ\}/g, `${forma} ${nominative}`);
    }
    if (vocative.trim()) out = out.replace(/\{IMIĘ\}/g, vocative.trim());
    if (sprzedawcaImie.trim()) out = out.replace(/\{IMIĘ_SPRZEDAWCY\}/g, sprzedawcaImie.trim());

    // Liczby w ustach settera zaokrąglone (zasada języka mówionego 2026-08-08) —
    // dokładne wartości zostają wyłącznie w kalkulatorze, klient słyszy "około X".
    const roundTo = (n: number, step: number) => Math.round(n / step) * step;
    const roundedGodziny = roundTo(totalGodzinyH, 5);
    const roundedPln = roundTo(totalPln, 100);
    const potencjalH = roundTo(totalGodzinyH * 0.7, 5);
    out = out.replace(/\[WYNIK Z KALKULATORA\]/g, String(roundedGodziny));
    out = out.replace(/\[WARTOŚĆ PLN\]/g, `${fmtPln(roundedPln)} zł`);
    out = out.replace(/\[POTENCJAL_H\]/g, String(potencjalH));
    return out;
  };

  const onCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(fill(text)).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const postTally = (type: "dial" | "rozmowa_kwalifikacja" | "sms", delta: 1 | -1) =>
    fetch("/api/stats/tally", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, delta }),
    }).catch(() => {
      /* licznik jest pomocniczy — brak sieci nie blokuje pracy */
    });

  const tally = useCallback((type: "dial" | "rozmowa_kwalifikacja" | "sms") => {
    setTallyFlash(type);
    setTallyUndo(type);
    setTimeout(() => setTallyFlash((prev) => (prev === type ? null : prev)), 1800);
    setTimeout(() => setTallyUndo((prev) => (prev === type ? null : prev)), 5000);
    void postTally(type, 1);
  }, []);

  const undoTally = useCallback((type: "dial" | "rozmowa_kwalifikacja" | "sms") => {
    setTallyUndo(null);
    setTallyFlash(null);
    void postTally(type, -1);
  }, []);

  // Bez auto-scrolla: podczas rozmowy na żywo przewinięcie strony spod settera
  // gubi go w skrypcie. Po kliknięciu tylko podświetlamy docelowy element w
  // miejscu, setter sam decyduje kiedy tam spojrzeć.
  const jumpToStep = useCallback((stepId: string) => {
    const el = document.getElementById(`step-${stepId}`);
    if (!el) return;
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
      }
      // Przejście po `goToStepId` NIE jest automatyczne — setter klika osobny
      // przycisk "Dalej" wewnątrz DecisionDiagram (onJump), dopiero gdy przeczytał
      // klientowi `sayAfter`. Automatyczny skok tutaj wyrywał stronę spod setterowi
      // zanim zdążył odczytać tekst na głos.
    },
    [jumpToObjection],
  );

  const jumpToSmsTemplate = useCallback((smsId: string) => {
    setSmsForceOpen(true);
    setTimeout(() => {
      const el = document.getElementById(`sms-${smsId}`);
      if (!el) return;
      el.style.transition = "box-shadow 250ms, background-color 250ms";
      el.style.boxShadow = "0 0 0 2px var(--warning)";
      setTimeout(() => {
        el.style.boxShadow = "";
      }, 2000);
    }, 100);
  }, []);

  // Scalenie dawnych osobnych przycisków "Wykręcono" (dzienna statystyka wykręceń,
  // sesyjna) i "Próba N" (licznik prób kontaktu per klient w Notion) w jedno
  // działanie "Nie odebrał" — to fizycznie ten sam moment (wykręcasz numer, nikt
  // nie odbiera), nie dwa osobne kliknięcia. Przebudowa 2026-08-08, patrz raport
  // sesji: przed zmianą "Wykręcono" i "Próba" trzeba było klikać osobno mimo że
  // opisywały to samo zdarzenie dla wybranego klienta.
  const incrementCallAttempt = useCallback(async () => {
    if (!selected) return;
    const newCount = (selected.liczbaProb ?? 0) + 1;
    await fetch("/api/notion/pipeline-update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: selected.id, liczbaProb: newCount }),
    });
    setSelected((prev) => (prev ? { ...prev, liczbaProb: newCount } : prev));
    void fetchClients();
    void postTally("dial", 1);
    setTallyFlash("dial");
    setTallyUndo("dial");
    setTimeout(() => setTallyFlash((prev) => (prev === "dial" ? null : prev)), 1800);
    setTimeout(() => setTallyUndo((prev) => (prev === "dial" ? null : prev)), 5000);
    if (newCount >= 3) {
      jumpToSmsTemplate("m1");
    }
  }, [selected, fetchClients, jumpToSmsTemplate]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header — dwuwierszowy, wzór 1:1 z /pipeline: duży tytuł + podtytuł w
          pierwszym rzędzie, cały pasek narzędzi (liczniki rozmów, dane settera,
          forma grzecznościowa) osobnym, spójnym rzędem pod spodem. Mechanika i
          przyciski bez zmian, zmieniony tylko układ i skala. */}
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
            Kwalifikacja
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

        <div
          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}
        >
          {/* Dawne osobne "Wykręcono" scalone w przycisk "Nie odebrał" niżej, przy
              wybranym kliencie — to ten sam moment (wykręcasz numer, brak odbioru),
              nie dwa osobne kliknięcia. Ten przycisk zostaje wyłącznie dla realnie
              nawiązanej rozmowy. */}
          <button
            onClick={() => selected && tally("rozmowa_kwalifikacja")}
            disabled={!selected}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 10px",
              borderRadius: "var(--radius-xs)",
              border: "1px solid var(--border)",
              background: tallyFlash === "rozmowa_kwalifikacja" ? "var(--success-bg)" : "var(--bg)",
              color:
                tallyFlash === "rozmowa_kwalifikacja"
                  ? "var(--success-text)"
                  : "var(--text-primary)",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              cursor: selected ? "pointer" : "not-allowed",
              opacity: selected ? 1 : 0.5,
              transition: "background 150ms, color 150ms",
            }}
            title={
              selected
                ? "Zlicz nawiązaną rozmowę z wybranym klientem"
                : "Wybierz klienta z listy, żeby zarejestrować rozmowę"
            }
          >
            {tallyFlash === "rozmowa_kwalifikacja" ? <Check size={14} /> : <PhoneCall size={14} />}
            Rejestruj odbycie rozmowy
          </button>
          {tallyUndo && (
            <button
              onClick={() => undoTally(tallyUndo)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 10px",
                borderRadius: "var(--radius-xs)",
                border: "1px solid var(--warning)",
                background: "var(--warning-bg)",
                color: "var(--warning-text)",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
              }}
              title="Cofnij ostatnie zliczenie (5 sekund)"
            >
              <Undo2 size={14} />
              Cofnij
            </button>
          )}

          <div style={{ height: 22, width: 1, background: "var(--border)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                height: 30,
                padding: "0 10px",
                borderRadius: "var(--radius-xs)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-primary)",
                background: "var(--bg)",
                outline: "none",
                width: 110,
              }}
            />
          </div>

          {selected && (
            <>
              <button
                onClick={incrementCallAttempt}
                title="Wykręciłeś numer i nikt nie odebrał — liczy się do statystyk dziennych i do licznika prób kontaktu tego klienta"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: "var(--radius-xs)",
                  border: "1px solid var(--border)",
                  background: tallyFlash === "dial" ? "var(--success-bg)" : "var(--bg)",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  color: tallyFlash === "dial" ? "var(--success-text)" : "var(--text-primary)",
                  cursor: "pointer",
                  transition: "background 150ms, color 150ms",
                }}
              >
                {tallyFlash === "dial" ? <Check size={14} /> : <PhoneMissed size={14} />}
                Brak odbioru ({(selected.liczbaProb ?? 0) + 1})
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "3px 10px 3px 4px",
                  borderRadius: "var(--radius-xs)",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
                title="Jak setter ma zwracać się do klienta w tej rozmowie"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    Zwrot do klienta:
                  </span>
                  {(["Pan", "Pani"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormaOverride(f)}
                      style={{
                        height: 26,
                        padding: "0 10px",
                        borderRadius: "var(--radius-xs)",
                        border: `1px solid ${forma === f ? "var(--accent)" : "var(--border)"}`,
                        background: forma === f ? "rgba(67, 121, 177, 0.08)" : "var(--bg-elevated)",
                        color: forma === f ? "var(--accent)" : "var(--text-secondary)",
                        fontSize: 12,
                        fontWeight: forma === f ? 600 : 400,
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                  {formaOverride !== "auto" && (
                    <button
                      onClick={() => setFormaOverride("auto")}
                      title="Wróć do automatycznego wykrywania"
                      style={{
                        height: 26,
                        padding: "0 8px",
                        borderRadius: "var(--radius-xs)",
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text-tertiary)",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      auto
                    </button>
                  )}
                </div>
                <div style={{ height: 20, width: 1, background: "var(--border)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    Jak się zwracać:
                  </span>
                  <input
                    value={vocative}
                    onChange={(e) => setVocative(e.target.value)}
                    placeholder="wołacz imienia"
                    style={{
                      height: 26,
                      padding: "0 10px",
                      borderRadius: "var(--radius-xs)",
                      border: "1px solid var(--border)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--text-primary)",
                      background: "var(--bg-elevated)",
                      outline: "none",
                      width: 140,
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
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
          filterStatuses={["Nowy lead"]}
          headerLabel="Nowy lead"
          emptyLabel='Brak klientów "Nowy lead"'
        />

        {/* Main: script + roi + dalsze kroki */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: "var(--bg)" }}>
          <Card title="Skrypt kwalifikacyjny">
            <BrakOdbioruBanner onOpenSms={() => jumpToSmsTemplate("m1")} />
            <CalculatorFlagsBar flags={calculatorFlags} />
            {STEPS_K.map((step) => (
              <ScriptStep
                key={step.id}
                step={step}
                fill={fill}
                onCopy={onCopy}
                copiedId={copiedId}
                onJump={jumpToStep}
                onDecisionSelect={handleDecisionSelect}
                onJumpToObjection={jumpToObjection}
                selectedTrigger={selectedOptions[step.id]}
                role={role}
              >
                {step.captureField === "osoby" && (
                  <InlineCaptureInput
                    label="Osoby w biurze (zasila kalkulator)"
                    value={calcGroups[0].osoby}
                    min={1}
                    onChange={(n) => updateFirstGroup({ osoby: n })}
                  />
                )}
                {step.captureField === "stawka" && (
                  <InlineCaptureInput
                    label="Stawka godzinowa zł/h (zasila kalkulator)"
                    value={calcGroups[0].stawka}
                    min={20}
                    onChange={(n) => updateFirstGroup({ stawka: n })}
                  />
                )}
                {step.hasCalculator && (
                  <ScriptKalkulator
                    clientName={selected?.kontakt || selected?.firma || ""}
                    autoFlags={calculatorFlags}
                    groups={calcGroups}
                    onGroupsChange={setCalcGroups}
                  />
                )}
                {step.hasModuleRecommendation && (
                  <RecommendedModulesPanel
                    calculatorFlags={calculatorFlags}
                    selectedOptions={selectedOptions}
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
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px",
                background: "var(--bg-elevated)",
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
          smsForceOpen={smsForceOpen}
          onSmsCopy={() => tally("sms")}
          onJumpStep={jumpToStep}
        />
      </div>
    </div>
  );
}
