"use client";

import { Link2, Pencil, Repeat, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { daysUntil, formatPLN, nextRenewalDate } from "@/lib/finance/summary";
import type { FinanceEntry } from "@/lib/notion/finance";

function renewalLabel(e: FinanceEntry): string | null {
  if (!e.subskrypcja || !e.cyklOdnawiania) return null;
  const kind = e.rodzajCyklu === "Retainer klienta" ? "Retainer" : e.cyklOdnawiania;
  if (!e.data) return `${kind} · data nieznana`;
  const renewal = nextRenewalDate(e.data, e.cyklOdnawiania);
  if (!renewal) return kind;
  const days = daysUntil(renewal);
  const dniLabel = days <= 0 ? "dziś" : days === 1 ? "za 1 dzień" : `za ${days} dni`;
  return `${kind} · odnowienie ${dniLabel}`;
}

function formatDate(iso: string): string {
  if (!iso) return "Data nieznana";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Data nieznana";
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface FinanceListProps {
  entries: FinanceEntry[];
  categoryOptions: string[];
  onEdit: (entry: FinanceEntry) => void;
  onDelete: (entry: FinanceEntry) => void;
}

const selectStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--text-secondary)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-xs)",
  padding: "6px 9px",
  outline: "none",
};

export function FinanceList({ entries, categoryOptions, onEdit, onDelete }: FinanceListProps) {
  const [typFilter, setTypFilter] = useState<"" | "Przychód" | "Wydatek">("");
  const [kategoriaFilter, setKategoriaFilter] = useState("");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (typFilter && e.typ !== typFilter) return false;
      if (kategoriaFilter && !e.kategoria.includes(kategoriaFilter)) return false;
      return true;
    });
  }, [entries, typFilter, kategoriaFilter]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <select
          value={typFilter}
          onChange={(e) => setTypFilter(e.target.value as "" | "Przychód" | "Wydatek")}
          style={selectStyle}
        >
          <option value="">Wszystkie typy</option>
          <option value="Przychód">Przychód</option>
          <option value="Wydatek">Wydatek</option>
        </select>
        <select
          value={kategoriaFilter}
          onChange={(e) => setKategoriaFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">Wszystkie kategorie</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--text-tertiary)",
            alignSelf: "center",
          }}
        >
          {filtered.length} {filtered.length === 1 ? "wpis" : "wpisów"}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: "24px 0",
            textAlign: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          Brak wpisów.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {filtered.map((e) => (
            <div
              key={e.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 4px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: e.typ === "Przychód" ? "var(--success)" : "var(--error)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.nazwa}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 3,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {formatDate(e.data)}
                  </span>
                  {e.kategoria.map((cat) => (
                    <Badge key={cat} size="xs">
                      {cat}
                    </Badge>
                  ))}
                  {e.przypisaneDoPrzychoduNazwa && (
                    <span
                      title={`Przypisane do przychodu: ${e.przypisaneDoPrzychoduNazwa}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        fontFamily: "var(--font-sans)",
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      <Link2 size={10} /> {e.przypisaneDoPrzychoduNazwa}
                    </span>
                  )}
                  {renewalLabel(e) && (
                    <Badge size="xs" icon={<Repeat size={9} />}>
                      {renewalLabel(e)}
                    </Badge>
                  )}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: e.typ === "Przychód" ? "var(--success-text)" : "var(--text-primary)",
                  flexShrink: 0,
                }}
              >
                {e.typ === "Przychód" ? "+" : "−"}
                {formatPLN(e.kwota)}
              </div>
              <button
                onClick={() => onEdit(e)}
                title="Edytuj"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  padding: 3,
                  display: "flex",
                }}
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDelete(e)}
                title="Usuń"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  padding: 3,
                  display: "flex",
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
