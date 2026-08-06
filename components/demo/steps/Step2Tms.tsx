"use client";

import { AlertTriangle, CheckCircle2, ListChecks, MonitorSmartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { demoColors, demoFont } from "@/components/demo/demoTheme";
import { KLIENT, ZLECENIE } from "@/lib/demo/arekDemoData";

interface Step2TmsProps {
  active: boolean;
}

const FIELDS = [
  { label: "Zleceniodawca", value: ZLECENIE.zleceniodawca },
  { label: "Załadunek", value: `${ZLECENIE.zaladunek.miejsce}, ${ZLECENIE.zaladunek.data}` },
  { label: "Rozładunek", value: `${ZLECENIE.rozladunek.miejsce}, ${ZLECENIE.rozladunek.data}` },
  { label: "Ładunek", value: ZLECENIE.ladunek },
  { label: "Stawka", value: ZLECENIE.stawka },
  { label: "Kierowca", value: ZLECENIE.kierowca },
  { label: "Pojazd", value: ZLECENIE.pojazd },
] as const;

const FIELD_STEP_MS = 420;

type Tab = "auto" | "fallback";

function tabButtonStyle(active: boolean) {
  return {
    fontFamily: demoFont.sans,
    fontSize: 12,
    fontWeight: 600,
    height: 30,
    padding: "0 12px",
    borderRadius: 7,
    cursor: "pointer",
    background: active ? demoColors.accentSoft : "transparent",
    border: active ? `1px solid ${demoColors.accentBorder}` : `1px solid ${demoColors.border}`,
    color: active ? demoColors.accent : demoColors.textSecondary,
  } as const;
}

function PanelWindow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#1b1e23",
        border: `1px solid ${demoColors.border}`,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: demoColors.cardShadow,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderBottom: `1px solid ${demoColors.border}`,
          background: "#202329",
        }}
      >
        <div style={{ display: "flex", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5f6169" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5f6169" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5f6169" }} />
        </div>
        <span style={{ fontFamily: demoFont.mono, fontSize: 11, color: demoColors.textTertiary }}>
          {KLIENT.tms} — Nowe zlecenie
        </span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: "empty" | "filling" | "done";
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: demoFont.sans, fontSize: 10, color: demoColors.textTertiary }}>
        {label}
      </span>
      <div
        style={{
          height: 30,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          background: state === "empty" ? "rgba(255,255,255,0.03)" : demoColors.surfaceRaised,
          border:
            state === "filling"
              ? `1px solid ${demoColors.accent}`
              : `1px solid ${state === "done" ? demoColors.border : "rgba(255,255,255,0.06)"}`,
          boxShadow: state === "filling" ? `0 0 0 3px ${demoColors.accentSoft}` : "none",
          transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        }}
      >
        <span
          style={{
            fontFamily: demoFont.sans,
            fontSize: 12,
            color: state === "empty" ? demoColors.textTertiary : demoColors.textPrimary,
            fontWeight: state === "done" ? 500 : 400,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {state === "empty" ? "..." : value}
        </span>
      </div>
    </div>
  );
}

function AutomatedFill({ active }: { active: boolean }) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!active) {
      setVisibleCount(0);
      return;
    }
    setVisibleCount(0);
    const timers = FIELDS.map((_, i) =>
      setTimeout(() => setVisibleCount(i + 1), 300 + i * FIELD_STEP_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  const done = visibleCount >= FIELDS.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PanelWindow>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <MonitorSmartphone size={14} color={demoColors.terminalGreen} />
          <span
            style={{ fontFamily: demoFont.mono, fontSize: 11, color: demoColors.terminalGreen }}
          >
            Automatyzacja panelu w toku
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {FIELDS.map((field, i) => {
            const state = i < visibleCount ? "done" : i === visibleCount ? "filling" : "empty";
            return (
              <FieldRow key={field.label} label={field.label} value={field.value} state={state} />
            );
          })}
        </div>
      </PanelWindow>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <CheckCircle2
          size={13}
          color={done ? demoColors.terminalGreen : demoColors.terminalDim}
          style={{ flexShrink: 0 }}
        />
        <span style={{ fontFamily: demoFont.mono, fontSize: 12, color: demoColors.textTertiary }}>
          {done
            ? `Zlecenie ${ZLECENIE.numerZleceniaTms} zapisane.`
            : `Wypełnianie formularza w ${KLIENT.tms}...`}
        </span>
      </div>
    </div>
  );
}

function FallbackScenario() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          background: demoColors.warningBg,
          border: `1px solid ${demoColors.warningBorder}`,
          borderRadius: 10,
          padding: "10px 12px",
        }}
      >
        <AlertTriangle
          size={14}
          color={demoColors.warning}
          style={{ flexShrink: 0, marginTop: 1 }}
        />
        <span style={{ fontFamily: demoFont.sans, fontSize: 12, color: demoColors.textSecondary }}>
          Wykryto nieoczekiwaną zmianę układu panelu {KLIENT.tms}. Automatyzacja wstrzymana.
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ListChecks size={14} color={demoColors.accent} style={{ flexShrink: 0 }} />
        <span style={{ fontFamily: demoFont.sans, fontSize: 12, color: demoColors.textSecondary }}>
          Zlecenie przekazane do kolejki ręcznej weryfikacji, z gotowym, wstępnie wypełnionym
          formularzem.
        </span>
      </div>

      <PanelWindow>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span
            style={{
              fontFamily: demoFont.sans,
              fontSize: 11,
              fontWeight: 600,
              color: demoColors.warning,
              background: demoColors.warningBg,
              border: `1px solid ${demoColors.warningBorder}`,
              borderRadius: 6,
              padding: "2px 8px",
            }}
          >
            Do weryfikacji przez spedytora
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {FIELDS.map((field) => (
            <FieldRow key={field.label} label={field.label} value={field.value} state="done" />
          ))}
        </div>
      </PanelWindow>
    </div>
  );
}

export function Step2Tms({ active }: Step2TmsProps) {
  const [tab, setTab] = useState<Tab>("auto");

  useEffect(() => {
    if (!active) setTab("auto");
  }, [active]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => setTab("auto")} style={tabButtonStyle(tab === "auto")}>
          Automatyzacja
        </button>
        <button
          type="button"
          onClick={() => setTab("fallback")}
          style={tabButtonStyle(tab === "fallback")}
        >
          Co jeśli panel się zmieni
        </button>
      </div>

      {tab === "auto" ? <AutomatedFill active={active} /> : <FallbackScenario />}
    </div>
  );
}
