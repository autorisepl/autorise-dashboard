"use client";

import type { CSSProperties } from "react";
import { obliczE, obliczEfektywnosc, type WeryfikacjaModuleRow } from "./moduleTypes";

// Załącznik 1 umowy — tabela Weryfikacji Dnia 30. Operacja/czas na operację/wliczaj-do-celu
// przychodzą z Kickoffu jako tylko-do-odczytu. Edytowalne są wyłącznie D (liczba operacji
// wykonanych przez System w okresie) i F (rzeczywisty czas jaki zajęła obsługa tych operacji
// człowiekowi przy systemie — WPISYWANE RĘCZNIE na podstawie obserwacji/logów, nie zakładane
// jako zero, bo dziś nie istnieje żaden automatyczny mechanizm śledzenia tego czasu).

interface WeryfikacjaModuleTableProps {
  rows: WeryfikacjaModuleRow[];
  moduleLabels: Record<string, string>;
  onChange: (rows: WeryfikacjaModuleRow[]) => void;
  celProcent: number;
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

export function WeryfikacjaModuleTable({
  rows,
  moduleLabels,
  onChange,
  celProcent,
}: WeryfikacjaModuleTableProps) {
  const wynik = obliczEfektywnosc(rows);
  const spelniony = wynik.procentOsiagniety >= celProcent;

  function updateRow(moduleId: string, patch: Partial<WeryfikacjaModuleRow>) {
    onChange(rows.map((r) => (r.moduleId === moduleId ? { ...r, ...patch } : r)));
  }

  if (rows.length === 0) return null;

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
          <thead>
            <tr>
              <th style={labelCellStyle}>Moduł</th>
              <th style={labelCellStyle}>Operacja</th>
              <th style={labelCellStyle}>Czas/operację (h)</th>
              <th style={labelCellStyle}>Liczba operacji w okresie (D)</th>
              <th style={labelCellStyle}>Czas rzeczywisty Systemu (h, F)</th>
              <th style={labelCellStyle}>E = czas × D</th>
              <th style={labelCellStyle}>Objęty celem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.moduleId} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={cellStyle}>{moduleLabels[row.moduleId] ?? row.moduleId}</td>
                <td style={cellStyle}>{row.operacja}</td>
                <td style={cellStyle}>{row.czasGodziny}</td>
                <td style={cellStyle}>
                  <input
                    type="number"
                    min={0}
                    value={row.liczbaOperacji || ""}
                    onChange={(e) =>
                      updateRow(row.moduleId, { liczbaOperacji: Number(e.target.value) || 0 })
                    }
                    style={{ ...inputBase, width: 90 }}
                  />
                </td>
                <td style={cellStyle}>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={row.czasSystemGodziny || ""}
                    onChange={(e) =>
                      updateRow(row.moduleId, { czasSystemGodziny: Number(e.target.value) || 0 })
                    }
                    style={{ ...inputBase, width: 90 }}
                  />
                </td>
                <td style={cellStyle}>{obliczE(row).toFixed(1)}</td>
                <td style={cellStyle}>{row.wliczajDoCelu ? "Tak" : "Nie"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          alignItems: "center",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
        }}
      >
        <div>
          <span style={{ color: "var(--text-secondary)" }}>ΣE (teoretyczny czas manualny): </span>
          <strong>{wynik.sumaE.toFixed(1)} h</strong>
        </div>
        <div>
          <span style={{ color: "var(--text-secondary)" }}>ΣF (rzeczywisty czas Systemu): </span>
          <strong>{wynik.sumaF.toFixed(1)} h</strong>
        </div>
        <div>
          <span style={{ color: "var(--text-secondary)" }}>Osiągnięty procent efektywności: </span>
          <strong>{wynik.procentOsiagniety.toFixed(1)}%</strong>
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 12,
            background: spelniony ? "rgba(52,199,89,0.15)" : "rgba(255,59,48,0.12)",
            color: spelniony ? "#1a7a3d" : "#ff3b30",
          }}
        >
          {spelniony ? "Cel spełniony" : "Cel niespełniony"} ({wynik.procentOsiagniety.toFixed(1)}%
          / {celProcent}%)
        </div>
      </div>
    </div>
  );
}
