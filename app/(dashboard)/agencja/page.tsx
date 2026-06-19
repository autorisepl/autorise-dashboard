"use client";

import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { SheetContact, SheetsResponse } from "@/app/api/google/sheets/route";

const f = { system: "var(--font-system)", mono: "var(--font-mono)" };

const SHEET_ID = "18BjXDFAWDVQnQkrE_1Kmvj0-ZJIGXQejLY6IJOOXnH0";

// Columns to always show first (if they exist in the sheet)
const PRIORITY_COLS = ["Nazwa", "Firma", "Email", "Telefon", "Status", "Notatki"];

function getDisplayHeaders(headers: string[]): string[] {
  const priority = PRIORITY_COLS.filter((h) => headers.includes(h));
  const rest = headers.filter((h) => !PRIORITY_COLS.includes(h));
  return [...priority, ...rest];
}

function StatusChip({ value }: { value: string }) {
  const lower = value.toLowerCase();
  let color = "var(--text-tertiary)";
  let bg = "rgba(0,0,0,0.05)";
  if (lower.includes("aktyw") || lower.includes("active") || lower.includes("klient")) {
    color = "#34c759";
    bg = "rgba(52,199,89,0.1)";
  } else if (lower.includes("lead") || lower.includes("prospect")) {
    color = "#1a56ff";
    bg = "rgba(26,86,255,0.1)";
  } else if (lower.includes("zamk") || lower.includes("utrac") || lower.includes("lost")) {
    color = "#ff3b30";
    bg = "rgba(255,59,48,0.1)";
  } else if (lower.includes("kwal") || lower.includes("disco")) {
    color = "#ff9500";
    bg = "rgba(255,149,0,0.1)";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 20,
        background: bg,
        fontFamily: f.system,
        fontSize: 11,
        fontWeight: 500,
        color,
      }}
    >
      {value}
    </span>
  );
}

function isStatusColumn(h: string): boolean {
  return ["Status", "Etap", "Stage", "Faza"].includes(h);
}

function Cell({ header, value }: { header: string; value: string | number }) {
  const v = String(value);
  if (!v || v === "—") return <span style={{ color: "var(--text-tertiary)" }}>—</span>;

  if (isStatusColumn(header) && v) return <StatusChip value={v} />;

  // Email — make clickable
  if (v.includes("@") && v.includes(".")) {
    return (
      <a
        href={`mailto:${v}`}
        style={{
          color: "var(--accent)",
          textDecoration: "none",
          fontFamily: f.system,
          fontSize: 12.5,
        }}
      >
        {v}
      </a>
    );
  }

  // Phone
  if (/^\+?[\d\s\-().]{7,}$/.test(v)) {
    return (
      <a
        href={`tel:${v.replace(/\s/g, "")}`}
        style={{
          color: "var(--text-primary)",
          textDecoration: "none",
          fontFamily: f.mono,
          fontSize: 12,
        }}
      >
        {v}
      </a>
    );
  }

  return (
    <span style={{ fontFamily: f.system, fontSize: 12.5, color: "var(--text-primary)" }}>{v}</span>
  );
}

export default function AgencjaPage() {
  const [data, setData] = useState<SheetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/google/sheets");
      if (res.status === 401) {
        setError("not_connected");
        return;
      }
      if (res.status === 403) {
        setError("scope_required");
        return;
      }
      if (!res.ok) {
        setError("failed");
        return;
      }
      setData(await res.json());
    } catch {
      setError("failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const displayHeaders = data ? getDisplayHeaders(data.headers) : [];

  const filtered = (data?.rows ?? []).filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return displayHeaders.some((h) =>
      String(row[h] ?? "")
        .toLowerCase()
        .includes(q),
    );
  });

  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const av = String(a[sortCol] ?? "");
        const bv = String(b[sortCol] ?? "");
        return sortDir === "asc" ? av.localeCompare(bv, "pl") : bv.localeCompare(av, "pl");
      })
    : filtered;

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  // Show first 6 columns in table, rest in expanded row
  const tableHeaders = displayHeaders.slice(0, 6);
  const extraHeaders = displayHeaders.slice(6);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "36px 36px 64px",
        fontFamily: f.system,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            flexShrink: 0,
            background: "linear-gradient(135deg, #1a56ff 0%, #af52de 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(26,86,255,0.28)",
          }}
        >
          <Users size={22} color="#fff" strokeWidth={1.8} />
        </div>
        <div>
          <h1
            style={{
              fontFamily: f.system,
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              margin: 0,
              lineHeight: 1,
              color: "var(--text-primary)",
            }}
          >
            Agencja
          </h1>
          <div
            style={{
              fontFamily: f.system,
              fontSize: 14,
              color: "var(--text-tertiary)",
              marginTop: 5,
            }}
          >
            Kontakty z Google Sheets — sync co odświeżenie
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {data && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: f.mono, fontSize: 11, color: "var(--text-tertiary)" }}>
              {sorted.length} rekordów
            </span>
            <a
              href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 14px",
                borderRadius: 9,
                textDecoration: "none",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                fontFamily: f.system,
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              <ExternalLink size={13} strokeWidth={1.6} /> Otwórz arkusz
            </a>
            <button
              onClick={load}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 14px",
                borderRadius: 9,
                border: "none",
                background: "#1a56ff",
                fontFamily: f.system,
                fontSize: 12,
                fontWeight: 600,
                color: "#fff",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              <RefreshCw
                size={13}
                strokeWidth={2}
                style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}
              />
              Odśwież
            </button>
          </div>
        )}
      </div>

      {/* Error states */}
      {error === "not_connected" && (
        <div
          style={{
            padding: 24,
            background: "var(--bg-elevated)",
            borderRadius: 16,
            border: "1px solid var(--border)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: f.system,
              fontSize: 14,
              color: "var(--text-secondary)",
              marginBottom: 16,
            }}
          >
            Połącz konto Google aby zobaczyć kontakty z arkusza
          </p>
          <a
            href="/profil"
            style={{
              padding: "8px 20px",
              borderRadius: 9,
              background: "#1a56ff",
              color: "#fff",
              fontFamily: f.system,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Połącz Google
          </a>
        </div>
      )}
      {error === "scope_required" && (
        <div
          style={{
            padding: 24,
            background: "var(--bg-elevated)",
            borderRadius: 16,
            border: "1px solid rgba(255,149,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <AlertCircle size={20} color="#ff9500" />
            <div>
              <p
                style={{
                  fontFamily: f.system,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 6px",
                }}
              >
                Wymagane uprawnienia do arkuszy
              </p>
              <p
                style={{
                  fontFamily: f.system,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  margin: "0 0 14px",
                }}
              >
                Twoje połączenie Google nie ma dostępu do Arkuszy. Rozłącz i połącz ponownie na
                stronie Profil, aby przyznać dostęp.
              </p>
              <a
                href="/profil"
                style={{
                  padding: "7px 16px",
                  borderRadius: 9,
                  background: "#ff9500",
                  color: "#fff",
                  fontFamily: f.system,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Idź do Profilu
              </a>
            </div>
          </div>
        </div>
      )}
      {error === "failed" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 16,
            color: "#ff3b30",
            fontFamily: f.system,
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} />
          Błąd ładowania arkusza.
          <button
            onClick={load}
            style={{
              background: "none",
              border: "none",
              color: "#1a56ff",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: f.system,
              padding: 0,
            }}
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div
          style={{
            padding: "64px 0",
            textAlign: "center",
            fontFamily: f.system,
            fontSize: 13,
            color: "var(--text-tertiary)",
          }}
        >
          <RefreshCw
            size={24}
            color="var(--border)"
            style={{
              margin: "0 auto 12px",
              display: "block",
              animation: "spin 0.8s linear infinite",
            }}
          />
          Wczytywanie arkusza...
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Data */}
      {!loading && data && data.rows.length > 0 && (
        <>
          {/* Search */}
          <div style={{ position: "relative", marginBottom: 16, maxWidth: 380 }}>
            <Search
              size={14}
              color="var(--text-tertiary)"
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj kontaktów..."
              style={{
                width: "100%",
                padding: "9px 12px 9px 34px",
                border: "1px solid var(--border)",
                borderRadius: 10,
                boxSizing: "border-box",
                background: "var(--bg-elevated)",
                fontFamily: f.system,
                fontSize: 13,
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>

          {/* Table */}
          <div
            style={{
              background: "var(--bg-elevated)",
              borderRadius: 16,
              border: "1px solid var(--border)",
              overflow: "hidden",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {tableHeaders.map((h) => (
                      <th
                        key={h}
                        onClick={() => toggleSort(h)}
                        style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: f.system,
                          fontSize: 11,
                          fontWeight: 600,
                          color: sortCol === h ? "var(--accent)" : "var(--text-tertiary)",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          background: sortCol === h ? "rgba(26,86,255,0.04)" : "transparent",
                          userSelect: "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          {h}
                          {sortCol === h &&
                            (sortDir === "asc" ? (
                              <ChevronUp size={11} />
                            ) : (
                              <ChevronDown size={11} />
                            ))}
                        </div>
                      </th>
                    ))}
                    {extraHeaders.length > 0 && <th style={{ padding: "12px 16px", width: 36 }} />}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    const isExpanded = expandedRow === row._row;
                    return [
                      <tr
                        key={row._row}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: isExpanded ? "var(--accent-subtle)" : "transparent",
                          transition: "background 0.1s",
                          cursor: extraHeaders.length > 0 ? "pointer" : "default",
                        }}
                        onClick={() =>
                          extraHeaders.length > 0 && setExpandedRow(isExpanded ? null : row._row)
                        }
                      >
                        {tableHeaders.map((h) => (
                          <td
                            key={h}
                            style={{ padding: "11px 16px", verticalAlign: "top", maxWidth: 240 }}
                          >
                            <Cell header={h} value={row[h] ?? ""} />
                          </td>
                        ))}
                        {extraHeaders.length > 0 && (
                          <td style={{ padding: "11px 12px", textAlign: "center" }}>
                            {isExpanded ? (
                              <ChevronUp size={14} color="var(--accent)" />
                            ) : (
                              <ChevronDown size={14} color="var(--text-tertiary)" />
                            )}
                          </td>
                        )}
                      </tr>,
                      isExpanded && extraHeaders.length > 0 && (
                        <tr
                          key={`${row._row}-extra`}
                          style={{ background: "rgba(26,86,255,0.02)" }}
                        >
                          <td
                            colSpan={tableHeaders.length + 1}
                            style={{ padding: "12px 24px 16px" }}
                          >
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 32px" }}>
                              {extraHeaders.map((h) => (
                                <div key={h} style={{ minWidth: 160 }}>
                                  <div
                                    style={{
                                      fontFamily: f.system,
                                      fontSize: 10,
                                      fontWeight: 600,
                                      color: "var(--text-tertiary)",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                      marginBottom: 3,
                                    }}
                                  >
                                    {h}
                                  </div>
                                  <Cell header={h} value={row[h] ?? ""} />
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>

            {sorted.length === 0 && search && (
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  fontFamily: f.system,
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                }}
              >
                Brak wyników dla &ldquo;{search}&rdquo;
              </div>
            )}
          </div>

          {data.lastSync && (
            <div
              style={{
                marginTop: 12,
                fontFamily: f.mono,
                fontSize: 11,
                color: "var(--text-tertiary)",
                textAlign: "right",
              }}
            >
              Ostatni sync: {new Date(data.lastSync).toLocaleString("pl-PL")}
            </div>
          )}
        </>
      )}

      {!loading && data && data.rows.length === 0 && (
        <div
          style={{
            padding: "64px 0",
            textAlign: "center",
            fontFamily: f.system,
            fontSize: 13,
            color: "var(--text-tertiary)",
          }}
        >
          Arkusz jest pusty lub nie ma danych
        </div>
      )}
    </div>
  );
}
