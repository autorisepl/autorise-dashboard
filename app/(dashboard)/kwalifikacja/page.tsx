"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  MessageSquare,
  Minus,
  PhoneCall,
  Plus,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GoogleTaskList } from "@/app/api/google/tasks/route";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import type { TeamMember } from "@/app/api/team/route";
import { ClientSidebar } from "@/components/clients/ClientSidebar";
import { ProgressBar, SectionLabelSmall, StepCard } from "@/components/dalsze-kroki/DalszeKrokiUI";
import { useIdentity } from "@/lib/auth/RoleContext";
import { useFormaGrzecznosciowa } from "@/lib/scripts/formaGrzecznosciowa";
import {
  ACKNOWLEDGMENT_PHRASES,
  ICP_RULES,
  OBJECTIONS_K,
  STEPS_K,
} from "@/lib/scripts/kwalifikacyjna";
import { MESSAGES_DATA } from "@/lib/scripts/messages";
import { getRecommendedModules } from "@/lib/scripts/moduleRecommendation";
import type { CalculatorGroup, ScriptLine } from "@/lib/scripts/types";

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

// Minimalny, wyselekcjonowany zestaw obiekcji przypięty do KONKRETNEGO kroku —
// dokładnie te, które realnie padają na tym etapie rozmowy, nic więcej. Reszta
// obiekcji z OBJECTIONS_K celowo nie jest nigdzie pokazywana, żeby setter nie
// szukał podczas rozmowy na żywo. Każdy krok renderuje je tak samo jak krok
// OPENING: rozwijane wiersze z gotową odpowiedzią w miejscu.
const STEP_OBJECTIONS: Record<string, string[]> = {
  opener: ["ok_nie_kojarzy", "ok_nie_czasu", "ok3", "ok_em", "ok_ms"],
  diagnoza_otwarcie: ["brak_konkretu", "brak_bolu", "ok_nie_kojarzy", "po_co_to_pytanie"],
  diagnoza_icp_flota: ["icp_ponizej_progu", "spedytorzy_dorazni"],
  diagnoza_icp_decydent: ["icp_nie_decydent"],
  diagnoza_tms: ["konkurencja_m365", "tms_panel_zewnetrzny"],
  diagnoza_dokumenty_faktura: ["zewnetrzne_biuro_ksiegowe"],
  diagnoza_stawka: ["stawka_niechec"],
  diagnoza_czas: ["czas_milczy", "czas_obronny", "czas_przeskakuje"],
  spotkanie: ["ok4", "ok5", "spotkanie_link_zapasowy"],
  spotkanie_rezerwacja: ["spotkanie_link_zapasowy"],
};

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

  // Pusty tytuł bez zwijania = brak nagłówka karty w ogóle (skrypt kwalifikacyjny
  // nie potrzebuje etykiety "SKRYPT KWALIFIKACYJNY", jest jedyną treścią kolumny).
  const showHeader = collapsible || title.length > 0;

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
      {showHeader && (
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
      )}
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
              fontWeight: 800,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: "var(--text-on-accent)",
              padding: "3px 9px",
              borderRadius: "var(--radius-xs)",
              background: "var(--accent)",
              border: "1px solid rgba(255,255,255,0.42)",
            }}
          >
            {src?.label ?? k}
            {src ? ` ${src.nr}` : ""}
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

// Presety ról jednym kliknięciem. Godziny startują od 0 — pytanie o godziny
// dziennie na powtarzalną robotę jest osobnym krokiem (2i) i bez niego wynik
// jest zerowy, celowo, żeby setter nie pominął tej liczby. Stawka to szacunek
// kosztu pracy z narzutami, korygowany tym co poda klient.
const ROLE_PRESETS: {
  id: string;
  label: string;
  osoby: number;
  godziny: number;
  stawka: number;
}[] = [
  { id: "spedytor", label: "Spedytor", osoby: 1, godziny: 0, stawka: 50 },
  { id: "faktury", label: "Faktury i rozliczenia", osoby: 1, godziny: 0, stawka: 45 },
  { id: "dyspozytor", label: "Dyspozytor", osoby: 1, godziny: 0, stawka: 50 },
  { id: "wlasciciel", label: "Właściciel", osoby: 1, godziny: 0, stawka: 80 },
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

// count = krok 2a (nazwa + liczba osób, presety, dodawanie/usuwanie).
// rate  = krok 2h (tylko stawka per rola, bez dodawania).
// hours = krok 2i (tylko godziny dziennie per rola, bez dodawania).
type RolesMode = "count" | "rate" | "hours";

const ROLE_FIELD_STYLE: React.CSSProperties = {
  height: 36,
  borderRadius: "var(--radius-xs)",
  border: "1px solid rgba(255,255,255,0.42)",
  padding: "0 10px",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-primary)",
  background: "var(--bg)",
  outline: "none",
  width: "100%",
};
const ROLE_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 10,
  fontWeight: 700,
  color: "var(--text-primary)",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
};

function GroupRow({
  group,
  mode,
  onChange,
  onRemove,
}: {
  group: CalculatorGroup;
  mode: RolesMode;
  onChange: (patch: Partial<CalculatorGroup>) => void;
  onRemove: () => void;
}) {
  const showOsoby = mode === "count";
  const showGodziny = mode === "hours";
  const showStawka = mode === "rate";
  const canRemove = mode === "count";
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
        <span style={ROLE_LABEL_STYLE}>Rola</span>
        <input
          value={group.label}
          onChange={(e) => onChange({ label: e.target.value })}
          style={ROLE_FIELD_STYLE}
        />
      </label>
      {showOsoby && (
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={ROLE_LABEL_STYLE}>Osoby</span>
          <NumberField
            min={1}
            max={50}
            value={group.osoby}
            onCommit={(n) => onChange({ osoby: n })}
            style={ROLE_FIELD_STYLE}
          />
        </label>
      )}
      {!showOsoby && (
        <div style={{ flex: 1, ...ROLE_LABEL_STYLE, paddingBottom: 10, alignSelf: "flex-end" }}>
          {group.osoby} {group.osoby === 1 ? "osoba" : "os."}
        </div>
      )}
      {showGodziny && (
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={ROLE_LABEL_STYLE}>Godz/dzień</span>
          <NumberField
            min={0}
            max={12}
            step={0.5}
            value={group.godziny}
            onCommit={(n) => onChange({ godziny: n })}
            style={{
              ...ROLE_FIELD_STYLE,
              border: group.godziny ? ROLE_FIELD_STYLE.border : "1px solid var(--warning)",
            }}
          />
        </label>
      )}
      {showStawka && (
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={ROLE_LABEL_STYLE}>Stawka zł/h</span>
          <NumberField
            min={20}
            max={200}
            value={group.stawka}
            onCommit={(n) => onChange({ stawka: n })}
            style={ROLE_FIELD_STYLE}
          />
        </label>
      )}
      {canRemove && (
        <button
          onClick={onRemove}
          title="Usuń rolę"
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

// Wspólny edytor ról — krok 2a buduje listę (nazwa + osoby), 2h dokłada stawki,
// 2i dokłada godziny dziennie. Jedno źródło stanu (calcGroups).
function RolesEditor({
  groups,
  onChange,
  mode,
}: {
  groups: CalculatorGroup[];
  onChange: (groups: CalculatorGroup[]) => void;
  mode: RolesMode;
}) {
  const addPreset = (p: (typeof ROLE_PRESETS)[number]) =>
    onChange([
      ...groups,
      { id: newGroupId(), label: p.label, osoby: p.osoby, godziny: p.godziny, stawka: p.stawka },
    ]);
  const addCustom = () =>
    onChange([
      ...groups,
      { id: newGroupId(), label: "Nowa rola", osoby: 1, godziny: 0, stawka: 50 },
    ]);
  const patch = (id: string, p: Partial<CalculatorGroup>) =>
    onChange(groups.map((g) => (g.id === id ? { ...g, ...p } : g)));
  const remove = (id: string) => onChange(groups.filter((g) => g.id !== id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {mode === "count" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ROLE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => addPreset(p)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "5px 10px",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.42)",
                background: "var(--bg)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Plus size={11} />
              {p.label}
            </button>
          ))}
        </div>
      )}
      {groups.map((g) => (
        <GroupRow
          key={g.id}
          group={g}
          mode={mode}
          onChange={(p) => patch(g.id, p)}
          onRemove={() => remove(g.id)}
        />
      ))}
      {mode === "count" && (
        <button
          onClick={addCustom}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "7px 10px",
            borderRadius: 8,
            border: "1px dashed var(--text-tertiary)",
            background: "transparent",
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={13} />
          Dodaj rolę niestandardową
        </button>
      )}
    </div>
  );
}

function ScriptKalkulator({
  autoFlags,
  groups,
  onGroupsChange,
}: {
  autoFlags: Record<string, boolean>;
  groups: CalculatorGroup[];
  onGroupsChange: (groups: CalculatorGroup[]) => void;
}) {
  const fmt = (n: number) =>
    n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const miesiecznieH = groups.reduce((sum, g) => sum + g.osoby * g.godziny * 22, 0);
  const miesieczniePLN = groups.reduce((sum, g) => sum + g.osoby * g.godziny * 22 * g.stawka, 0);
  const rocznie = miesieczniePLN * 12;
  const potencjalH = Math.round(miesiecznieH * 0.7);
  const gotowe = miesiecznieH > 0;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        background: "var(--bg-elevated)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Do uzupełnienia: tylko godziny dziennie per rola. Ról tu się nie dodaje. */}
      <RolesEditor groups={groups} onChange={onGroupsChange} mode="hours" />

      {/* Moduły do wdrożenia na podstawie rozmowy (potwierdzenia w 2d-2g). */}
      <RecommendedModulesPanel calculatorFlags={autoFlags} selectedOptions={{}} />

      {gotowe && (
        <div
          style={{
            background: "rgba(67, 121, 177,0.05)",
            border: "1px solid rgba(67, 121, 177,0.18)",
            borderRadius: 8,
            padding: "10px 14px",
            fontFamily: "var(--font-sans)",
            fontSize: 12.5,
            lineHeight: 1.55,
            color: "var(--text-primary)",
          }}
        >
          Około <strong>{fmt(miesiecznieH)} h</strong> miesięcznie, czyli{" "}
          <strong>{fmt(miesieczniePLN)} zł</strong> kosztu pracy, rocznie {fmt(rocznie)} zł. Wstępny
          potencjał odzysku około <strong>{fmt(potencjalH)} h</strong> miesięcznie.
        </div>
      )}
    </div>
  );
}

// ── Script step ───────────────────────────────────────────────────────

// Nagłówek sekcji wewnątrz karty kroku (biały, wersaliki), poprzedzony dividerem.
function SectionCap({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.42)", margin: "8px 0 10px" }} />
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        {children}
      </div>
    </>
  );
}

// Rozwijany wiersz (obiekcja albo reakcja klienta) — jeden mechanizm dla całego
// skryptu, wzór z kroku OPENING. Etykieta + rozwijana odpowiedź w miejscu.
function CollapsibleAnswer({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.42)",
        borderRadius: 9,
        overflow: "hidden",
        background: "var(--bg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 12px",
          border: "none",
          background: open ? "var(--bg-hover)" : "transparent",
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 600,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span>{label}</span>
        <ChevronDown
          size={15}
          color="var(--text-tertiary)"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 150ms",
          }}
        />
      </button>
      {open && (
        <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.42)" }}>{children}</div>
      )}
    </div>
  );
}

// Akapit odpowiedzi w rozwiniętym wierszu — 15.5px, biały.
function answerParagraphs(text: string, keyPrefix: string) {
  return toSentences(text).map((s, i) => (
    <p
      key={`${keyPrefix}-${i}`}
      style={{
        margin: i === 0 ? 0 : "8px 0 0",
        fontFamily: "var(--font-sans)",
        fontSize: 15.5,
        lineHeight: 1.6,
        color: "var(--text-primary)",
        textWrap: "pretty" as React.CSSProperties["textWrap"],
      }}
    >
      {s}
    </p>
  ));
}

function ScriptStep({
  step,
  fill,
  role,
  calcFlagActive,
  onToggleCalcFlag,
  children,
}: {
  step: (typeof STEPS_K)[0];
  fill: (t: string) => string;
  role: "admin" | "setter" | "closer" | null;
  calcFlagActive: boolean;
  onToggleCalcFlag: (flag: string) => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  // Który rozwijany wiersz (reakcja klienta albo obiekcja) jest otwarty.
  const [openRow, setOpenRow] = useState<string | null>(null);
  const stepObjections = STEP_OBJECTIONS[step.id] ?? [];

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
          {step.lines.map((line, li) => {
            const isSpeaker = line.t === "say" || line.t === "client";
            return (
              <div
                key={li}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: 0,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: LINE_BG[line.t],
                }}
              >
                <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", minHeight: 26 }}>
                    {isSpeaker && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 30,
                          height: 30,
                          borderRadius: 9,
                          border: "1px solid rgba(255,255,255,0.42)",
                          background: line.t === "say" ? "var(--accent)" : "var(--bg-hover)",
                        }}
                      >
                        {line.t === "say" ? (
                          <MessageSquare
                            size={17}
                            color="#ffffff"
                            fill="currentColor"
                            strokeWidth={2.5}
                          />
                        ) : (
                          <Users size={17} color="#ffffff" fill="currentColor" strokeWidth={2.5} />
                        )}
                      </span>
                    )}
                    {line.t === "note" && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 30,
                          height: 30,
                          borderRadius: 9,
                          border: "1px solid rgba(255,255,255,0.42)",
                          background: "var(--warning)",
                        }}
                      >
                        <AlertTriangle size={17} color="#ffffff" strokeWidth={2.75} />
                      </span>
                    )}
                    {line.t === "action" && (
                      <Check size={13} color="var(--accent)" strokeWidth={2.5} />
                    )}
                    {(line.t === "branch" || line.t === "branch-bad") && (
                      <Check size={13} color={LINE_COLOR[line.t]} strokeWidth={2.5} />
                    )}
                  </div>
                </div>
                {/* Pionowa biała linia między ikoną a treścią, od góry ikony do końca treści. */}
                <div
                  style={{
                    width: 2,
                    alignSelf: "stretch",
                    background: "rgba(255,255,255,0.42)",
                    borderRadius: 1,
                    margin: "0 11px",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {(() => {
                    const displayText =
                      role === "setter" && line.textSetter ? line.textSetter : line.text;
                    const blocks = Array.isArray(displayText) ? displayText : [displayText];
                    // Wypowiedzi settera ("say") łamiemy na zdania — jeden akapit na zdanie.
                    const paragraphs =
                      line.t === "say" ? blocks.flatMap((b) => toSentences(b)) : blocks;
                    return paragraphs.map((paragraph, pi) => (
                      <p
                        key={pi}
                        style={{
                          margin: pi === 0 ? 0 : "8px 0 0 0",
                          fontFamily: "var(--font-sans)",
                          fontSize: 15.5,
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
                        fontSize: 13.5,
                        lineHeight: 1.5,
                        color: "var(--text-primary)",
                        marginTop: 8,
                        paddingLeft: 10,
                        borderLeft: "2px solid rgba(255,255,255,0.5)",
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>Cel: </span>
                      {line.cel}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {step.expected && (
            <>
              <SectionCap>Oczekiwana reakcja klienta</SectionCap>
              <div
                style={{
                  border: "1px solid var(--success-border)",
                  borderRadius: 9,
                  background: "var(--success-bg)",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                }}
              >
                <Check
                  size={16}
                  strokeWidth={2.75}
                  color="var(--success-text)"
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14.5,
                    lineHeight: 1.55,
                    color: "var(--success-text)",
                    fontWeight: 600,
                  }}
                >
                  {fill(step.expected)}
                </span>
              </div>
            </>
          )}

          {step.transition && (
            <>
              <SectionCap>Przejście</SectionCap>
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: 0,
                  padding: "8px 10px",
                  borderRadius: 8,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    border: "1px solid rgba(255,255,255,0.42)",
                    background: "var(--accent)",
                  }}
                >
                  <MessageSquare size={17} color="#ffffff" fill="currentColor" strokeWidth={2.5} />
                </span>
                <div
                  style={{
                    width: 2,
                    alignSelf: "stretch",
                    background: "rgba(255,255,255,0.42)",
                    borderRadius: 1,
                    margin: "0 11px",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {answerParagraphs(fill(step.transition), `${step.id}-tr`)}
                </div>
              </div>
            </>
          )}

          {step.calculatorFlag && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCalcFlag(step.calculatorFlag as string);
              }}
              style={{
                marginTop: 4,
                alignSelf: "flex-start",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 32,
                padding: "0 12px",
                borderRadius: "var(--radius-xs)",
                border: "1px solid rgba(255,255,255,0.42)",
                background: calcFlagActive ? "var(--accent)" : "var(--bg-elevated)",
                color: calcFlagActive ? "var(--text-on-accent)" : "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {calcFlagActive ? (
                <CheckCircle2 size={15} strokeWidth={2.5} />
              ) : (
                <Plus size={15} strokeWidth={2.5} />
              )}
              {calcFlagActive
                ? "Ręczna robota potwierdzona, moduł w kalkulatorze"
                : "Klient potwierdził ręczną robotę, dodaj moduł"}
            </button>
          )}

          {stepObjections.length > 0 && (
            <>
              <SectionCap>Możliwe obiekcje</SectionCap>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {stepObjections.map((objId) => {
                  const obj = OBJECTIONS_K.find((o) => o.id === objId);
                  if (!obj) return null;
                  const rowKey = `obj-${objId}`;
                  return (
                    <CollapsibleAnswer
                      key={rowKey}
                      label={obj.label}
                      open={openRow === rowKey}
                      onToggle={() => setOpenRow(openRow === rowKey ? null : rowKey)}
                    >
                      {answerParagraphs(fill(obj.script ?? ""), `${rowKey}-s`)}
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
                          {answerParagraphs(fill(obj.followup), `${rowKey}-f`)}
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
                })}
              </div>
            </>
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

  const cap: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-primary)",
    marginBottom: 2,
  };

  const card = (
    idPrefix: "sms" | "fb",
    item: { id: string; label: string; text: string; group: string },
    withSmsCopy: boolean,
  ) => {
    const key = `${idPrefix}-${item.id}`;
    const done = copiedId === key;
    return (
      <div
        key={item.id}
        id={idPrefix === "sms" ? `sms-${item.id}` : undefined}
        style={{
          background: "var(--bg)",
          border: "1px solid rgba(255,255,255,0.42)",
          borderRadius: "var(--radius-sm)",
          boxShadow: "var(--shadow-sm)",
          padding: "12px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          {item.label}
        </div>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {fill(item.text)}
        </p>
        <button
          onClick={() => {
            onCopy(key, item.text);
            if (withSmsCopy) onSmsCopy();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            height: 30,
            padding: "0 12px",
            borderRadius: "var(--radius-xs)",
            border: "1px solid rgba(255,255,255,0.42)",
            background: done ? "var(--success-bg)" : "var(--bg-elevated)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            color: done ? "var(--success-text)" : "var(--text-primary)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {done ? <CheckCircle2 size={13} /> : <Copy size={13} />}
          {done ? "Skopiowano" : "Kopiuj"}
        </button>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={cap}>SMS / WhatsApp</div>
      {kwalItems.map((item) => card("sms", item, true))}
      <div style={{ ...cap, marginTop: 8 }}>Facebook</div>
      {fbItems.map((item) => card("fb", item, false))}
    </div>
  );
}

// ── ICP Quick Reference ───────────────────────────────────────────────

function IcpPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {ICP_RULES.map((rule, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "12px",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg)",
            border: "1px solid rgba(255,255,255,0.42)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: rule.ok ? "var(--success-bg)" : "var(--error-bg)",
              border: `1px solid ${rule.ok ? "var(--success-border)" : "var(--error-border)"}`,
            }}
          >
            {rule.ok ? (
              <Check size={13} color="var(--success-text)" strokeWidth={2.75} />
            ) : (
              <X size={13} color="var(--error-text)" strokeWidth={2.75} />
            )}
          </span>
          <div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: 2,
              }}
            >
              {rule.label}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
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
  fill,
  onCopy,
  copiedId,
}: {
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {ACKNOWLEDGMENT_PHRASES.map((phrase, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(255,255,255,0.42)",
            background: "var(--bg)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#ffffff",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--text-primary)",
                }}
              >
                {phrase.stage}
              </span>
            </div>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                lineHeight: 1.5,
                color: "var(--text-primary)",
              }}
            >
              {fill(phrase.text)}
            </span>
          </div>
          <button
            onClick={() => onCopy(`phrase-${i}`, phrase.text)}
            title="Kopiuj"
            style={{
              flexShrink: 0,
              width: 26,
              height: 26,
              borderRadius: "var(--radius-xs)",
              border: "1px solid rgba(255,255,255,0.42)",
              background: "transparent",
              cursor: "pointer",
              color: copiedId === `phrase-${i}` ? "var(--success-text)" : "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {copiedId === `phrase-${i}` ? <CheckCircle2 size={12} /> : <Copy size={12} />}
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
  smsForceOpen,
  onSmsCopy,
}: {
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  smsForceOpen: boolean;
  onSmsCopy: () => void;
}) {
  return (
    <div
      style={{
        width: 300,
        minWidth: 300,
        height: "100%",
        borderLeft: "1px solid var(--border)",
        overflowY: "auto",
        padding: "12px 12px",
        background: "var(--bg-elevated)",
      }}
    >
      <Card title="Frazy potwierdzające" collapsible defaultOpen={false}>
        <PhrasesPanel fill={fill} onCopy={onCopy} copiedId={copiedId} />
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
  // Moduły kalkulatora zaznaczane ręcznie przyciskiem w bloku "oczekiwana reakcja"
  // (kroki 2d-2g). Rekomendacja modułów opiera się na samych calculatorFlags.
  const toggleCalcFlag = useCallback((flag: string) => {
    setCalculatorFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  }, []);
  // Role kalkulatora budowane od zera w kroku 2a (nazwa + liczba osób), stawki w
  // 2h, godziny dziennie w 2i. Nic nie jest wstępnie wypełnione, żeby wynik nie
  // był zgadywany.
  const [calcGroups, setCalcGroups] = useState<CalculatorGroup[]>([]);
  const [sprzedawcaImie, setSprzedawcaImie] = useState("Michał");
  const [smsForceOpen, setSmsForceOpen] = useState(false);
  const identity = useIdentity();
  const role = identity?.role ?? null;

  // Przypisany sprzedawca (team_members.id) i znacznik odbytej rozmowy kwalifikacyjnej
  // są trzymane w Supabase (pipeline.assigned_seller_id / pipeline.qualification_call_done)
  // i wracają jako pola PipelineClientDetailed. Picker bierze realne profile z team_members.
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTeamMembers(d.members as TeamMember[]);
      })
      .catch(() => {
        /* brak listy zespołu nie blokuje pracy ze skryptem */
      });
  }, []);

  const selectedSellerId = selected?.assignedSellerId || null;
  const selectedSellerName =
    teamMembers.find((m) => m.id === selectedSellerId)?.displayName ?? null;
  const selectedCallDone = Boolean(selected?.qualificationCallDone);
  const callDoneIds = clients.filter((c) => c.qualificationCallDone).map((c) => c.id);
  const sellerNameById: Record<string, string> = {};
  for (const c of clients) {
    const nm = c.assignedSellerId
      ? teamMembers.find((m) => m.id === c.assignedSellerId)?.displayName
      : null;
    if (nm) sellerNameById[c.id] = nm;
  }

  // Wspólny styl etykiety w pasku narzędzi headera — biała czcionka, ta sama
  // wielkość co tekst na przycisku "Zarejestruj rozmowę" (12.5 / 800 / wersaliki).
  const TOOLBAR_LABEL: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: 12.5,
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "var(--text-primary)",
  };

  const totalGodzinyH = calcGroups.reduce((sum, g) => sum + g.osoby * g.godziny * 22, 0);
  const totalPln = calcGroups.reduce((sum, g) => sum + g.osoby * g.godziny * 22 * g.stawka, 0);

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

  // Jedno miejsce zapisu do Pipeline: optymistyczna aktualizacja + PATCH + refetch.
  const patchSelected = useCallback(
    async (patch: Partial<PipelineClientDetailed>) => {
      if (!selected) return;
      const id = selected.id;
      setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
      setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: id, ...patch }),
      }).catch(() => {
        /* przy błędzie i tak zrobimy refetch — stan wróci do prawdy z serwera */
      });
      void fetchClients();
    },
    [selected, fetchClients],
  );

  const assignSeller = useCallback(
    (memberId: string) => void patchSelected({ assignedSellerId: memberId }),
    [patchSelected],
  );

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
    setCalcGroups([]);
    setSmsForceOpen(false);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSprzedawcaImie = (value: string) => {
    setSprzedawcaImie(value);
    localStorage.setItem("kwal_sprzedawca_imie", value);
  };

  const fmtPln = (n: number) =>
    n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const firstName = (selected?.kontakt || selected?.firma || "").trim().split(/\s+/)[0] ?? "";
  const { forma, setFormaOverride } = useFormaGrzecznosciowa(firstName, selected?.id);

  const fill = (text: string): string => {
    let out = text;
    const nominative = (selected?.kontakt || selected?.firma || "").trim().split(/\s+/)[0];
    const isPani = forma === "Pani";

    // Forma adresatywna w zdaniu otwierającym: "Pan {IMIĘ}" / "Pani {IMIĘ}" w treści
    // skryptu → "Panie <wołacz>" / "Pani <wołacz>" (naturalny zwrot na głos).
    const addr = `${isPani ? "Pani" : "Panie"} ${vocative.trim() || nominative || ""}`.trim();
    out = out.replace(/\bP(?:an|ani) \{IMIĘ\}/g, addr || "Pan/Pani");

    if (vocative.trim()) out = out.replace(/\{IMIĘ\}/g, vocative.trim());
    else if (nominative) out = out.replace(/\{IMIĘ\}/g, nominative);

    // Forma mianownikowa, celowo NIE wołacz — do pytań weryfikujących tożsamość
    // ("Dzień dobry, Pan {IMIĘ_NOM}?"), gdzie "Panie Jacku?" brzmi jak zawołanie,
    // a nie potwierdzenie kto odbiera telefon.
    if (nominative) out = out.replace(/\{IMIĘ_NOM\}/g, nominative);

    // Cały skrypt reaguje na przełącznik Pan/Pani: samodzielne formy grzecznościowe
    // w treści zamieniane na żeńskie, gdy wybrano "Pani". Kolejność od najdłuższych
    // przypadków, żeby "Panem" nie złapało się wcześniej jako "Pan"+"em".
    if (isPani) {
      out = out
        .replace(/\bPanem\b/g, "Panią")
        .replace(/\bPanie\b/g, "Pani")
        .replace(/\bPanu\b/g, "Pani")
        .replace(/\bPana\b/g, "Pani")
        .replace(/\bPan\b/g, "Pani");

      // Odmiana czasownika w 3. os. przy zwrocie grzecznościowym: "zdecydował się
      // Pani" → "zdecydowała się Pani", "poczułby Pani" → "poczułaby Pani",
      // "Pani z nimi zrobił" → "Pani z nimi zrobiła". Ograniczone do czasownika
      // stykającego się ze zwrotem "Pani" (z krótką wstawką bez interpunkcji),
      // żeby nie ruszać rzeczowników zakończonych na "ł".
      const fem = (stem: string) => `${stem}a`;
      // "Pani sam" / "sam Pani" → "Pani sama" / "sama Pani" (niezależnie od czasownika)
      out = out.replace(/\bPani sam\b/g, "Pani sama").replace(/\bsam Pani\b/g, "sama Pani");
      // czasownik + [by] + [się/sobie] + Pani
      out = out.replace(
        /\b([a-ząćęłńóśźż]+ł)(by)?((?:\s+(?:się|sobie))?)\s+Pani\b/gi,
        (_m, stem: string, by = "", refl = "") => `${fem(stem)}${by || ""}${refl} Pani`,
      );
      // Pani + [sama] + krótka wstawka + czasownik + [by]
      out = out.replace(
        /\bPani(\s+sama)?([^.,;:?!]{0,32}?\s)([a-ząćęłńóśźż]+ł)(by)?\b/gi,
        (_m, sama = "", mid: string, stem: string, by = "") =>
          `Pani${sama || ""}${mid}${fem(stem)}${by || ""}`,
      );
    }
    // Imię do zdania otwierającego: pierwsze imię przypisanego sprzedawcy
    // (z profilu Supabase), a jeśli brak przypisania — wartość z pola "Imię w skrypcie".
    const sellerFirst = selectedSellerName
      ? selectedSellerName.trim().split(/\s+/)[0]
      : sprzedawcaImie.trim();
    if (sellerFirst) out = out.replace(/\{IMIĘ_SPRZEDAWCY\}/g, sellerFirst);

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

  // Stan "odbyto/nie odbyto" i liczba prób są teraz trwale widoczne (zielona
  // plakietka, licznik +/-), więc `tally` tylko dogrywa statystykę dzienną.
  const tally = useCallback((type: "dial" | "rozmowa_kwalifikacja" | "sms") => {
    void postTally(type, 1);
  }, []);

  const undoTally = useCallback((type: "dial" | "rozmowa_kwalifikacja" | "sms") => {
    void postTally(type, -1);
  }, []);

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
    if (newCount >= 3) {
      jumpToSmsTemplate("m1");
    }
  }, [selected, fetchClients, jumpToSmsTemplate]);

  const decrementCallAttempt = useCallback(async () => {
    if (!selected || (selected.liczbaProb ?? 0) <= 0) return;
    const newCount = (selected.liczbaProb ?? 0) - 1;
    await fetch("/api/notion/pipeline-update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: selected.id, liczbaProb: newCount }),
    });
    setSelected((prev) => (prev ? { ...prev, liczbaProb: newCount } : prev));
    void fetchClients();
    void postTally("dial", -1);
  }, [selected, fetchClients]);

  const markCallDone = useCallback(() => {
    if (!selected) return;
    // Setter/closer: odbyta rozmowa przypina klienta do jego profilu (team_members.id
    // z sesji), jeśli klient nie ma jeszcze przypisanego sprzedawcy. Founder przypisuje
    // ręcznie z pickera.
    const alsoAssign =
      (role === "setter" || role === "closer") &&
      identity?.teamMemberId &&
      !selected.assignedSellerId
        ? { assignedSellerId: identity.teamMemberId }
        : {};
    void patchSelected({ qualificationCallDone: true, ...alsoAssign });
    tally("rozmowa_kwalifikacja");
  }, [selected, role, identity, patchSelected, tally]);

  const undoCallDone = useCallback(() => {
    if (!selected) return;
    void patchSelected({ qualificationCallDone: false });
    undoTally("rozmowa_kwalifikacja");
  }, [selected, patchSelected, undoTally]);

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
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 14,
            flexWrap: "wrap",
          }}
        >
          {/* ── Rejestracja odbytej rozmowy kwalifikacyjnej (toggle) ── */}
          <button
            onClick={selected ? (selectedCallDone ? undoCallDone : markCallDone) : undefined}
            disabled={!selected}
            title={
              selected
                ? selectedCallDone
                  ? "Cofnij rejestrację odbytej rozmowy"
                  : "Zarejestruj odbytą rozmowę kwalifikacyjną z tym klientem"
                : "Wybierz klienta z listy"
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 34,
              padding: "0 14px",
              borderRadius: "var(--radius-xs)",
              border: "1px solid rgba(255,255,255,0.42)",
              background: selectedCallDone ? "var(--success-bg)" : "var(--bg)",
              color: selectedCallDone ? "var(--success-text)" : "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: 12.5,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: selected ? "pointer" : "not-allowed",
              opacity: selected ? 1 : 0.45,
              transition: "background 150ms, color 150ms",
            }}
          >
            {selectedCallDone ? <Check size={15} /> : <PhoneCall size={15} />}
            {selectedCallDone ? "Rozmowa odbyta" : "Zarejestruj rozmowę"}
          </button>

          <div style={{ height: 24, width: 1, background: "rgba(255,255,255,0.42)" }} />

          {/* ── Przypisany sprzedawca (profile z Supabase / team_members) ── */}
          <span style={TOOLBAR_LABEL}>Sprzedawca</span>
          {role === "admin" ? (
            teamMembers.length === 0 ? (
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                }}
              >
                Brak profili
              </span>
            ) : (
              teamMembers.map((m) => {
                const active = selectedSellerId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => selected && assignSeller(m.id)}
                    disabled={!selected}
                    title={`Przypisz ${m.displayName} (${m.role})`}
                    style={{
                      height: 30,
                      padding: "0 12px",
                      borderRadius: "var(--radius-xs)",
                      border: `1px solid ${active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.42)"}`,
                      background: active ? "var(--accent)" : "var(--bg-elevated)",
                      color: active ? "var(--text-on-accent)" : "var(--text-primary)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      fontWeight: active ? 800 : 600,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                      cursor: selected ? "pointer" : "not-allowed",
                      opacity: selected ? 1 : 0.45,
                    }}
                  >
                    {m.displayName}
                  </button>
                );
              })
            )
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 30,
                padding: "0 12px",
                borderRadius: "var(--radius-xs)",
                background: "var(--accent)",
                border: "1px solid rgba(255,255,255,0.42)",
                color: "var(--text-on-accent)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              <User size={13} strokeWidth={2.5} />
              {selectedSellerName ?? identity?.displayName ?? "—"}
            </span>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={TOOLBAR_LABEL}>Imię w skrypcie</span>
            <input
              value={sprzedawcaImie}
              onChange={(e) => updateSprzedawcaImie(e.target.value)}
              placeholder="np. Michał"
              style={{
                height: 30,
                padding: "0 10px",
                borderRadius: "var(--radius-xs)",
                border: "1px solid rgba(255,255,255,0.42)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-primary)",
                background: "var(--bg)",
                outline: "none",
                width: 96,
              }}
            />
          </div>

          {selected && (
            <>
              <div style={{ height: 24, width: 1, background: "rgba(255,255,255,0.42)" }} />

              {/* ── Próby kontaktu +/- ── */}
              <span style={TOOLBAR_LABEL}>Próby kontaktu</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid rgba(255,255,255,0.42)",
                  borderRadius: "var(--radius-xs)",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={decrementCallAttempt}
                  disabled={(selected.liczbaProb ?? 0) <= 0}
                  title="Cofnij próbę kontaktu"
                  style={{
                    width: 32,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    borderRight: "1px solid rgba(255,255,255,0.42)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    cursor: (selected.liczbaProb ?? 0) <= 0 ? "not-allowed" : "pointer",
                    opacity: (selected.liczbaProb ?? 0) <= 0 ? 0.4 : 1,
                  }}
                >
                  <Minus size={15} strokeWidth={2.5} />
                </button>
                <span
                  style={{
                    minWidth: 40,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 10px",
                    background: (selected.liczbaProb ?? 0) >= 3 ? "var(--error-bg)" : "var(--bg)",
                    color:
                      (selected.liczbaProb ?? 0) >= 3 ? "var(--error-text)" : "var(--text-primary)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {selected.liczbaProb ?? 0}
                </span>
                <button
                  onClick={incrementCallAttempt}
                  title="Zarejestruj brak odbioru (kolejna próba kontaktu)"
                  style={{
                    width: 32,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    borderLeft: "1px solid rgba(255,255,255,0.42)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={15} strokeWidth={2.5} />
                </button>
              </div>

              <div style={{ height: 24, width: 1, background: "rgba(255,255,255,0.42)" }} />

              {/* ── Forma grzecznościowa ── */}
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

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={TOOLBAR_LABEL}>Jak się zwracać</span>
                <input
                  value={vocative}
                  onChange={(e) => setVocative(e.target.value)}
                  placeholder="wołacz imienia, np. Marku"
                  style={{
                    height: 30,
                    padding: "0 10px",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid rgba(255,255,255,0.42)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    background: "var(--bg-elevated)",
                    outline: "none",
                    width: 140,
                  }}
                />
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
          callDoneClientIds={callDoneIds}
          sellerNameById={sellerNameById}
          showPresentation={false}
        />

        {/* Main: script + roi + dalsze kroki */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: "var(--bg)" }}>
          <Card title="">
            <CalculatorFlagsBar flags={calculatorFlags} />
            {STEPS_K.map((step) => (
              <ScriptStep
                key={step.id}
                step={step}
                fill={fill}
                role={role}
                calcFlagActive={
                  step.calculatorFlag ? Boolean(calculatorFlags[step.calculatorFlag]) : false
                }
                onToggleCalcFlag={toggleCalcFlag}
              >
                {step.captureField === "role" && (
                  <RolesEditor mode="count" groups={calcGroups} onChange={setCalcGroups} />
                )}
                {step.captureField === "stawka" && (
                  <RolesEditor mode="rate" groups={calcGroups} onChange={setCalcGroups} />
                )}
                {step.hasCalculator && (
                  <ScriptKalkulator
                    autoFlags={calculatorFlags}
                    groups={calcGroups}
                    onGroupsChange={setCalcGroups}
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

        {/* Right: frazy + SMS + ICP (obiekcje przeniesione do kroków skryptu) */}
        <RightPanel
          fill={fill}
          onCopy={onCopy}
          copiedId={copiedId}
          smsForceOpen={smsForceOpen}
          onSmsCopy={() => tally("sms")}
        />
      </div>
    </div>
  );
}
