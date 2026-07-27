"use client";

import { type CSSProperties, useState } from "react";
import type { KickoffModuleRow } from "./moduleTypes";

// Załącznik 1 umowy — tabela Kickoff. Zbiera WYŁĄCZNIE czas manualny na jedną operację (C) per
// moduł, zero wolumenu (to się przenosi do Weryfikacji Dnia 30, patrz WeryfikacjaModuleTable).
// Pomocniczy input "lub w minutach" istnieje tylko po to, żeby nie zmuszać do ręcznego dzielenia
// przez 60 — po wpisaniu przelicza się w tle na godziny i czyści się, sam nie jest źródłem prawdy.

interface KickoffModuleTableProps {
  rows: KickoffModuleRow[];
  moduleLabels: Record<string, string>;
  onChange: (rows: KickoffModuleRow[]) => void;
}

const inputBase: CSSProperties = {
  height: 30,
  padding: "0 8px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--text-primary)",
  background: "var(--bg)",
};

const labelCellStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
  color: "var(--text-tertiary)",
  textAlign: "left",
  padding: "0 8px 8px",
};

const cellStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--text-primary)",
  padding: "6px 8px",
};

export function KickoffModuleTable({ rows, moduleLabels, onChange }: KickoffModuleTableProps) {
  const [minutyBuffer, setMinutyBuffer] = useState<Record<string, string>>({});

  function updateRow(moduleId: string, patch: Partial<KickoffModuleRow>) {
    onChange(rows.map((r) => (r.moduleId === moduleId ? { ...r, ...patch } : r)));
  }

  function applyMinuty(moduleId: string, value: string) {
    setMinutyBuffer((prev) => ({ ...prev, [moduleId]: value }));
    const minuty = Number(value);
    if (value !== "" && Number.isFinite(minuty) && minuty >= 0) {
      updateRow(moduleId, { czasGodziny: Math.round((minuty / 60) * 100) / 100 });
    }
  }

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: "10px 12px",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--text-tertiary)",
        }}
      >
        Klient nie ma jeszcze zaznaczonych żadnych modułów w polu "Moduły wdrażane" (karta klienta
        w /pipeline) — tabela pojawi się po ich wybraniu.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
        <thead>
          <tr>
            <th style={labelCellStyle}>Moduł</th>
            <th style={labelCellStyle}>Operacja</th>
            <th style={labelCellStyle}>Czas manualny / operację (h)</th>
            <th style={labelCellStyle}>lub w minutach</th>
            <th style={labelCellStyle}>Wliczaj do celu</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.moduleId} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={cellStyle}>{moduleLabels[row.moduleId] ?? row.moduleId}</td>
              <td style={cellStyle}>
                <input
                  type="text"
                  value={row.operacja}
                  onChange={(e) => updateRow(row.moduleId, { operacja: e.target.value })}
                  style={{ ...inputBase, width: 220 }}
                />
              </td>
              <td style={cellStyle}>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={row.czasGodziny || ""}
                  onChange={(e) =>
                    updateRow(row.moduleId, { czasGodziny: Number(e.target.value) || 0 })
                  }
                  style={{ ...inputBase, width: 90 }}
                />
              </td>
              <td style={cellStyle}>
                <input
                  type="number"
                  min={0}
                  placeholder="min"
                  value={minutyBuffer[row.moduleId] ?? ""}
                  onChange={(e) => applyMinuty(row.moduleId, e.target.value)}
                  style={{ ...inputBase, width: 70 }}
                />
              </td>
              <td style={cellStyle}>
                <input
                  type="checkbox"
                  checked={row.wliczajDoCelu}
                  onChange={(e) => updateRow(row.moduleId, { wliczajDoCelu: e.target.checked })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
