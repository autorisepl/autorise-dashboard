"use client";

import { Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import type { KickoffModuleRow } from "@/components/wdrozenie/moduleTypes";
import { OBJECTIONS_AP, STEPS_AP } from "@/lib/scripts/analizaPrzedkontraktowa";
import {
  MODULE_CATALOG,
  MODULE_DEFAULT_UNIT,
  MODULE_DEFAULT_WLICZAJ_DO_CELU,
} from "@/lib/scripts/moduleCatalog";
import type { ScriptLine } from "@/lib/scripts/types";

// Panel skryptu Analiza przedkontraktowa — spotkanie PO Discovery Call, PRZED wysłaniem umowy
// (potwierdzone z prawniczką 2026-07-28). Świadomie w /sprzedaz, nie jako nowa zakładka: to jest
// naturalna kontynuacja tej samej strony (Discovery Call już tu żyje), a wzorzec liniowego
// akordeonu + tabela modułów jest już sprawdzony w KickoffScriptPanel dla identycznego kształtu
// problemu (krótki, nierozgałęziony skrypt + zbierana od razu liczba). Zapisuje do NOWEGO pola
// Notion "Tabela modułów Analiza przedkontraktowa" (Batch 10), nie do "Tabela modułów Kickoff" —
// to dwa różne momenty prawne: przed podpisem (wiążące dla treści umowy) i po podpisie
// (potwierdzenie tego co już podpisano, kickoff.ts krok 4).

const MODULE_LABELS: Record<string, string> = Object.fromEntries(
  MODULE_CATALOG.map((m) => [m.code, m.label]),
);

function buildDefaultRows(client: PipelineClientDetailed): KickoffModuleRow[] {
  return MODULE_CATALOG.filter((m) => client.moduleWdrazane.includes(m.code)).map((m) => ({
    moduleId: m.code,
    operacja: MODULE_DEFAULT_UNIT[m.code] ?? "",
    czasGodziny: 0,
    wliczajDoCelu: MODULE_DEFAULT_WLICZAJ_DO_CELU[m.code] ?? true,
  }));
}

function parseRows(raw: string): KickoffModuleRow[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as KickoffModuleRow[]) : null;
  } catch {
    return null;
  }
}

const LINE_COLOR: Record<ScriptLine["t"], string> = {
  say: "var(--text-primary)",
  client: "var(--text-secondary)",
  note: "var(--warning)",
  action: "var(--accent)",
  branch: "var(--success-text)",
  "branch-bad": "var(--error)",
};

const LINE_LABEL: Record<ScriptLine["t"], string> = {
  say: "MÓWISZ",
  client: "KLIENT",
  note: "UWAGA",
  action: "AKCJA",
  branch: "DALEJ",
  "branch-bad": "DALEJ",
};

function renderText(text: string | string[]): string {
  return Array.isArray(text) ? text.join(" ") : text;
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

interface AnalizaPrzedkontraktowaPanelProps {
  client: PipelineClientDetailed | null;
  onSaved: (patch: Partial<PipelineClientDetailed>) => void;
}

export function AnalizaPrzedkontraktowaPanel({
  client,
  onSaved,
}: AnalizaPrzedkontraktowaPanelProps) {
  const [openStepId, setOpenStepId] = useState<string | null>(STEPS_AP[0].id);
  const [showObjections, setShowObjections] = useState(false);
  const [rows, setRows] = useState<KickoffModuleRow[]>([]);
  const [minutyBuffer, setMinutyBuffer] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!client) {
      setRows([]);
      return;
    }
    setRows(parseRows(client.tabelaModulowPrzedkontraktowa) ?? buildDefaultRows(client));
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  function updateRow(moduleId: string, patch: Partial<KickoffModuleRow>) {
    setRows((prev) => prev.map((r) => (r.moduleId === moduleId ? { ...r, ...patch } : r)));
  }

  function applyMinuty(moduleId: string, value: string) {
    setMinutyBuffer((prev) => ({ ...prev, [moduleId]: value }));
    const minuty = Number(value);
    if (value !== "" && Number.isFinite(minuty) && minuty >= 0) {
      updateRow(moduleId, { czasGodziny: Math.round((minuty / 60) * 100) / 100 });
    }
  }

  async function save() {
    if (!client) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: client.id,
          tabelaModulowPrzedkontraktowa: JSON.stringify(rows),
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Błąd zapisu");
      setStatus("saved");
      onSaved({ tabelaModulowPrzedkontraktowa: JSON.stringify(rows) });
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setStatus("error");
    }
  }

  if (!client) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "4px 2px" }}>
        Wybierz klienta, żeby uzupełnić Analizę przedkontraktową.
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 14, fontFamily: "var(--font-sans)" }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Spotkanie po Discovery, przed wysłaniem umowy (20-30 min). Krok 3 zbiera dane wprost do
          tabeli poniżej — bez niej Załącznik 1 nie jest kompletny.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {STEPS_AP.map((step) => {
          const isOpen = openStepId === step.id;
          return (
            <div
              key={step.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => setOpenStepId(isOpen ? null : step.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 10px",
                  border: "none",
                  background: isOpen ? "var(--bg-active)" : "var(--bg)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {isOpen ? (
                  <ChevronDown size={13} color="var(--text-tertiary)" />
                ) : (
                  <ChevronRight size={13} color="var(--text-tertiary)" />
                )}
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {step.nr}. {step.label}
                </span>
                {step.duration && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {step.duration}
                  </span>
                )}
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  {step.lines.map((line, i) => (
                    <div
                      key={`${step.id}-${i}`}
                      style={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          color: LINE_COLOR[line.t],
                        }}
                      >
                        {LINE_LABEL[line.t]}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          color: LINE_COLOR[line.t],
                          lineHeight: 1.5,
                        }}
                      >
                        {renderText(line.text)}
                      </span>
                      {line.cel && (
                        <span
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                            fontStyle: "italic",
                          }}
                        >
                          Cel: {line.cel}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setShowObjections(!showObjections)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {showObjections ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Obiekcje ({OBJECTIONS_AP.length})
        </button>

        {showObjections && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {OBJECTIONS_AP.map((obj) => (
              <div
                key={obj.id}
                style={{
                  padding: "9px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {obj.label}
                </div>
                {obj.script && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                    }}
                  >
                    {obj.script}
                  </div>
                )}
                {obj.note && (
                  <div
                    style={{
                      marginTop: 4,
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      fontStyle: "italic",
                    }}
                  >
                    {obj.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 8,
        }}
      >
        Załącznik 1 — czas manualny per moduł
      </div>

      {rows.length === 0 ? (
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
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
            <thead>
              <tr>
                <th
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    textAlign: "left",
                    padding: "0 8px 8px",
                  }}
                >
                  Moduł
                </th>
                <th
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    textAlign: "left",
                    padding: "0 8px 8px",
                  }}
                >
                  Operacja
                </th>
                <th
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    textAlign: "left",
                    padding: "0 8px 8px",
                  }}
                >
                  Czas manualny / operację (h)
                </th>
                <th
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    textAlign: "left",
                    padding: "0 8px 8px",
                  }}
                >
                  lub w minutach
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.moduleId} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ fontFamily: "var(--font-sans)", fontSize: 13, padding: "6px 8px" }}>
                    {MODULE_LABELS[row.moduleId] ?? row.moduleId}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="text"
                      value={row.operacja}
                      onChange={(e) => updateRow(row.moduleId, { operacja: e.target.value })}
                      style={{ ...inputBase, width: 200 }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
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
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="number"
                      min={0}
                      placeholder="min"
                      value={minutyBuffer[row.moduleId] ?? ""}
                      onChange={(e) => applyMinuty(row.moduleId, e.target.value)}
                      style={{ ...inputBase, width: 70 }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
        <button
          type="button"
          onClick={() => void save()}
          disabled={status === "saving" || rows.length === 0}
          style={{
            height: 36,
            padding: "0 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--accent)",
            color: "#fff",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            cursor: status === "saving" || rows.length === 0 ? "default" : "pointer",
            opacity: status === "saving" || rows.length === 0 ? 0.6 : 1,
          }}
        >
          Zapisz tabelę
        </button>
        {status === "saving" && (
          <>
            <Loader2
              size={13}
              color="var(--text-tertiary)"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Zapisuję...</span>
          </>
        )}
        {status === "saved" && (
          <>
            <Check size={13} color="var(--success-text)" />
            <span style={{ fontSize: 11, color: "var(--success-text)", fontWeight: 600 }}>
              Zapisano do Notion
            </span>
          </>
        )}
        {status === "error" && (
          <span style={{ fontSize: 11, color: "var(--error-text)" }}>
            Błąd zapisu, spróbuj ponownie.
          </span>
        )}
      </div>
    </div>
  );
}
