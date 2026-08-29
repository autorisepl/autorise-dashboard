"use client";

// Wydzielone 2026-08-29 z app/(dashboard)/kwalifikacja/page.tsx, gdzie ten sam design
// systemu (plakietka etapu, rozwijane wiersze obiekcji, dymki wypowiedzi) żył jako lokalne
// funkcje niedostępne dla /sprzedaz. Cel tej ekstrakcji: /sprzedaz ma wyglądać DOSŁOWNIE
// tak samo jak /kwalifikacja (Michał, 2026-08-29 — "totalnie inaczej wygląda design treści
// skryptu"), więc obie strony renderują teraz z jednego źródła zamiast dwóch ręcznie
// synchronizowanych kopii JSX. Kwalifikacja zachowuje swoje lokalne kopie na razie
// nietknięte (działający kod, zero ryzyka regresji) — to /sprzedaz migruje na wspólny plik.

import { AlertTriangle, Check, ChevronDown, MessageSquare, Users } from "lucide-react";
import { useState } from "react";
import type { ScriptLine } from "@/lib/scripts/types";

// ── Line colors ───────────────────────────────────────────────────────

export const LINE_COLOR: Record<ScriptLine["t"], string> = {
  say: "var(--text-primary)",
  client: "var(--text-secondary)",
  note: "var(--warning)",
  action: "var(--accent)",
  branch: "var(--success-text)",
  "branch-bad": "var(--error)",
};

export const LINE_BG: Record<ScriptLine["t"], string> = {
  say: "transparent",
  client: "transparent",
  note: "var(--warning-bg)",
  action: "var(--accent-muted)",
  branch: "var(--success-bg)",
  "branch-bad": "var(--error-bg)",
};

// Rozbija wypowiedź na osobne akapity, jeden na zdanie, żeby czytało się rytmem
// "zdanie, oddech, zdanie" podczas rozmowy na żywo. Dzieli tylko po realnym końcu zdania
// (kropka/znak zapytania + spacja + wielka litera), więc skróty typu "np." czy "z o.o."
// nie rwą tekstu w złym miejscu.
export function toSentences(text: string): string[] {
  const parts = text
    .replace(/([.?!])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text];
}

// Nagłówek sekcji wewnątrz karty kroku (biały, wersaliki), poprzedzony dividerem.
export function SectionCap({ children }: { children: React.ReactNode }) {
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

// Rozwijany wiersz (obiekcja albo reakcja klienta) — jeden mechanizm dla całego skryptu,
// wzór z kroku OPENING w /kwalifikacja. Etykieta + rozwijana odpowiedź w miejscu.
export function CollapsibleAnswer({
  id,
  label,
  sublabel,
  open,
  onToggle,
  children,
}: {
  id?: string;
  label: string;
  sublabel?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      style={{
        border: "1px solid rgba(255,255,255,0.42)",
        borderRadius: 9,
        overflow: "hidden",
        background: "var(--bg)",
        boxShadow: "var(--shadow-sm)",
        transition: "box-shadow 250ms, background-color 250ms",
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
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sublabel && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              {sublabel}
            </span>
          )}
          {label}
        </span>
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
export function answerParagraphs(text: string, keyPrefix: string) {
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

// Plakietka etapu w nagłówku kroku (kropka + wersaliki, kolor z alfą doklejaną sufiksem
// "26"/"70" — dlatego kolor musi być hex, nie token CSS).
export function StepHeaderPill({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 9px",
        borderRadius: "var(--radius-sm)",
        background: `${color}26`,
        border: `1px solid ${color}70`,
        flexShrink: 0,
      }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }}
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
        {label}
      </span>
    </span>
  );
}

// Jeden wiersz treści kroku (say/client/note/action/branch) — ikona w kółku, pionowa
// biała linia, akapity wypowiedzi + opcjonalny "Cel" dla settera. Wzór 1:1 z ScriptStep
// w /kwalifikacja.
export function ScriptLineRow({ line, fill }: { line: ScriptLine; fill: (t: string) => string }) {
  const isSpeaker = line.t === "say" || line.t === "client";
  return (
    <div
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
                <MessageSquare size={17} color="#ffffff" fill="currentColor" strokeWidth={2.5} />
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
          {line.t === "action" && <Check size={13} color="var(--accent)" strokeWidth={2.5} />}
          {(line.t === "branch" || line.t === "branch-bad") && (
            <Check size={13} color={LINE_COLOR[line.t]} strokeWidth={2.5} />
          )}
        </div>
      </div>
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
          const blocks = Array.isArray(line.text) ? line.text : [line.text];
          const paragraphs = line.t === "say" ? blocks.flatMap((b) => toSentences(b)) : blocks;
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
}

// Blok "Oczekiwana reakcja klienta" — zielona ramka z checkiem, wzór z /kwalifikacja.
export function ExpectedBlock({ text }: { text: string }) {
  return (
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
          {text}
        </span>
      </div>
    </>
  );
}

// Blok "Przejście" — ten sam dymek co wypowiedź "say", pod SectionCap. Wzór z /kwalifikacja.
export function TransitionBlock({ text, idPrefix }: { text: string; idPrefix: string }) {
  return (
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
        <div style={{ flex: 1, minWidth: 0 }}>{answerParagraphs(text, `${idPrefix}-tr`)}</div>
      </div>
    </>
  );
}

export function useOpenRow() {
  return useState<string | null>(null);
}
