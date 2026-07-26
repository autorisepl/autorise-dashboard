"use client";

import type { CSSProperties } from "react";

// Załącznik 1 nowej umowy — tabela Moduł/Jednostka/Czas na jednostkę/Wolumen na miesiąc/
// Godziny, wypełniana na Kickoff (wszystkie pola edytowalne) i ponownie na Weryfikacji Dnia 30
// (jednostka/czas na jednostkę/wliczaj-do-progu przeniesione z Kickoffu jako tylko-do-odczytu,
// edytowalny jest wyłącznie rzeczywisty wolumen z minionych 30 dni). Jeden komponent obsługuje
// oba tryby przez `editableFields`, żeby logika sumowania i wygląd tabeli nie rozjeżdżały się
// między dwoma panelami w /wdrozenie.

export interface ModuleTimeRow {
  moduleId: string;
  jednostka: string;
  czasMinut: number;
  wolumenMiesieczny: number;
  wliczajDoProgu: boolean;
}

export function sumGodzinyMiesiecznie(rows: ModuleTimeRow[]): number {
  return rows
    .filter((r) => r.wliczajDoProgu)
    .reduce((sum, r) => sum + (r.czasMinut * r.wolumenMiesieczny) / 60, 0);
}

interface ModuleTimeTableProps {
  rows: ModuleTimeRow[];
  moduleLabels: Record<string, string>;
  editableFields: "all" | "wolumenOnly";
  onChange: (rows: ModuleTimeRow[]) => void;
  // Próg 70% zapisany na Kickoffie — jeśli podany, footer pokazuje porównanie
  // spełniony/niespełniony zamiast tylko lokalnie liczonego progu.
  progGwarancji?: number;
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

export function ModuleTimeTable({
  rows,
  moduleLabels,
  editableFields,
  onChange,
  progGwarancji,
}: ModuleTimeTableProps) {
  const totalGodziny = sumGodzinyMiesiecznie(rows);
  const localProg = totalGodziny * 0.7;

  function updateRow(moduleId: string, patch: Partial<ModuleTimeRow>) {
    onChange(rows.map((r) => (r.moduleId === moduleId ? { ...r, ...patch } : r)));
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
        Klient nie ma jeszcze zaznaczonych żadnych modułów w polu "Moduły wdrażane" (karta klienta w
        /pipeline) — tabela pojawi się po ich wybraniu.
      </div>
    );
  }

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
          <thead>
            <tr>
              <th style={labelCellStyle}>Moduł</th>
              <th style={labelCellStyle}>Jednostka</th>
              <th style={labelCellStyle}>Czas/jednostkę (min)</th>
              <th style={labelCellStyle}>Wolumen/mc</th>
              <th style={labelCellStyle}>Godziny/mc</th>
              <th style={labelCellStyle}>Wliczaj do progu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const godziny = (row.czasMinut * row.wolumenMiesieczny) / 60;
              return (
                <tr key={row.moduleId} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={cellStyle}>{moduleLabels[row.moduleId] ?? row.moduleId}</td>
                  <td style={cellStyle}>
                    {editableFields === "all" ? (
                      <input
                        type="text"
                        value={row.jednostka}
                        onChange={(e) => updateRow(row.moduleId, { jednostka: e.target.value })}
                        style={{ ...inputBase, width: 200 }}
                      />
                    ) : (
                      row.jednostka
                    )}
                  </td>
                  <td style={cellStyle}>
                    {editableFields === "all" ? (
                      <input
                        type="number"
                        min={0}
                        value={row.czasMinut || ""}
                        onChange={(e) =>
                          updateRow(row.moduleId, { czasMinut: Number(e.target.value) || 0 })
                        }
                        style={{ ...inputBase, width: 90 }}
                      />
                    ) : (
                      row.czasMinut
                    )}
                  </td>
                  <td style={cellStyle}>
                    <input
                      type="number"
                      min={0}
                      value={row.wolumenMiesieczny || ""}
                      onChange={(e) =>
                        updateRow(row.moduleId, {
                          wolumenMiesieczny: Number(e.target.value) || 0,
                        })
                      }
                      style={{ ...inputBase, width: 90 }}
                    />
                  </td>
                  <td style={cellStyle}>{godziny.toFixed(1)}</td>
                  <td style={cellStyle}>
                    <input
                      type="checkbox"
                      checked={row.wliczajDoProgu}
                      disabled={editableFields !== "all"}
                      onChange={(e) =>
                        updateRow(row.moduleId, { wliczajDoProgu: e.target.checked })
                      }
                    />
                  </td>
                </tr>
              );
            })}
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
          <span style={{ color: "var(--text-secondary)" }}>Łączny czas bazowy: </span>
          <strong>{totalGodziny.toFixed(1)} h/mc</strong>
        </div>
        {progGwarancji === undefined ? (
          <div>
            <span style={{ color: "var(--text-secondary)" }}>Próg gwarancji (70%): </span>
            <strong>{localProg.toFixed(1)} h/mc</strong>
          </div>
        ) : (
          <>
            <div>
              <span style={{ color: "var(--text-secondary)" }}>Próg gwarancji z Kickoffu: </span>
              <strong>{progGwarancji.toFixed(1)} h/mc</strong>
            </div>
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 12,
                background:
                  totalGodziny >= progGwarancji ? "rgba(52,199,89,0.15)" : "rgba(255,59,48,0.12)",
                color: totalGodziny >= progGwarancji ? "#1a7a3d" : "#ff3b30",
              }}
            >
              {totalGodziny >= progGwarancji ? "Próg spełniony" : "Próg niespełniony"} (
              {totalGodziny.toFixed(1)} / {progGwarancji.toFixed(1)} h/mc)
            </div>
          </>
        )}
      </div>
    </div>
  );
}
