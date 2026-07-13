"use client";

import type { Agent1Output } from "./Agent1Card";
import { Agent1Card } from "./Agent1Card";
import type { Agent2Output } from "./Agent2Card";
import { Agent2Card } from "./Agent2Card";
import type { Agent3Output } from "./Agent3Card";
import { Agent3Card } from "./Agent3Card";

export interface KwalifikacjaMergedOutput {
  kwalifikacja?: Agent1Output;
  brief_discovery?: Agent2Output;
  prezentacja?: Agent3Output;
}

// Scalony Agent Kwalifikacja (Etap 4 patcha) — jeden wynik złożony z trzech sekcji o
// dokładnie tych samych kształtach co dawne Agent1Output/Agent2Output/Agent3Output.
// Renderuje istniejące, sprawdzone karty zamiast pisać nową wizualizację od zera —
// niższe ryzyko regresji wizualnej i identyczne zachowanie linków/przycisków
// (np. "Otwórz prezentację" w Agent3Card) co w starych, osobnych agentach.
function PartHeader({ letter, title }: { letter: string; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "28px 0 18px",
        paddingBottom: 10,
        borderBottom: "1px solid var(--separator)",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#1a56ff",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {letter}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
        }}
      >
        {title}
      </span>
    </div>
  );
}

export function AgentKwalifikacjaCard({ output }: { output: KwalifikacjaMergedOutput }) {
  return (
    <div>
      <PartHeader letter="A" title="Kwalifikacja i ICP" />
      <Agent1Card output={output.kwalifikacja ?? {}} />

      <PartHeader letter="B" title="Brief do Discovery" />
      <Agent2Card output={output.brief_discovery ?? {}} />

      <PartHeader letter="C" title="Dane do prezentacji" />
      <Agent3Card output={output.prezentacja ?? {}} />
    </div>
  );
}
