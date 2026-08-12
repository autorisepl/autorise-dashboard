"use client";

import { pad2 } from "@/lib/schedule/dateHelpers";

// Zamiennik natywnego <input type="time"> — ten renderuje godzinę w formacie zależnym od
// locale SYSTEMU (nie strony), więc mimo lang="pl-PL" niektóre przeglądarki/systemy nadal
// pokazywały AM/PM albo źle interpretowały wpisywane cyfry ("invalid start time"). Dwa selecty
// gwarantują format 24h zawsze, niezależnie od ustawień systemowych użytkownika.
const HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad2(i));

interface TimeInputProps {
  value: string; // HH:MM
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}

const selectStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  textAlign: "center",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-primary)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 4px",
  outline: "none",
  cursor: "pointer",
};

export function TimeInput({ value, onChange, style }: TimeInputProps) {
  const [h, m] = value.split(":");
  const hour = HOURS.includes(h) ? h : "00";
  const minute = MINUTES.includes(m) ? m : "00";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, ...style }}>
      <select
        value={hour}
        onChange={(e) => onChange(`${e.target.value}:${minute}`)}
        style={selectStyle}
      >
        {HOURS.map((hh) => (
          <option key={hh} value={hh}>
            {hh}
          </option>
        ))}
      </select>
      <span style={{ color: "var(--text-tertiary)", fontWeight: 700, flexShrink: 0 }}>:</span>
      <select
        value={minute}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
        style={selectStyle}
      >
        {MINUTES.map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
    </div>
  );
}
