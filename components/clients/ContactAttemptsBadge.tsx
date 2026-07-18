"use client";

import { Phone } from "lucide-react";

// Wydzielone z app/(dashboard)/pipeline/page.tsx (Blok "Arek" pkt 9, 2026-07-15) na
// zakładkę /utrzymanie (drabinka eskalacji przy braku kontaktu, KARTA_PRODUKTU pkt 14) —
// ten sam wizualny licznik prób, żeby nie było dwóch konkurencyjnych stylów tego samego
// pojęcia w dashboardzie. `onIncrement` opcjonalny — /utrzymanie może pokazywać badge tylko
// do odczytu bez przycisku "+", jeśli licznik jest tam wyliczany inaczej niż w Pipeline.
export function ContactAttemptsBadge({
  proby,
  onIncrement,
}: {
  proby: number;
  onIncrement?: (e: React.MouseEvent) => void;
}) {
  if (proby <= 0) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 6px",
        borderRadius: "var(--radius-xs)",
        background: proby >= 3 ? "var(--error-bg)" : "var(--bg)",
        border: `1px solid ${proby >= 3 ? "var(--error-border)" : "var(--border)"}`,
        flexShrink: 0,
      }}
    >
      <Phone
        size={11}
        color={proby >= 3 ? "var(--error)" : "var(--text-tertiary)"}
        strokeWidth={2}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: n <= proby ? "var(--warning)" : "var(--border)",
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 600,
          color: proby >= 3 ? "var(--error)" : "var(--text-tertiary)",
        }}
      >
        {proby >= 3 ? "Wyślij SMS" : `Próba ${proby}`}
      </span>
      {onIncrement && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIncrement(e);
          }}
          title="Zarejestruj kolejną próbę kontaktu"
          style={{
            marginLeft: 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text-secondary)",
            fontSize: 11,
            lineHeight: 1,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          +
        </button>
      )}
    </div>
  );
}
