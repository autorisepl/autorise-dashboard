"use client";

import { ChevronLeft, ChevronRight, PiggyBank, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FinanceDonutChart } from "@/components/finance/FinanceDonutChart";
import {
  draftToInput,
  emptyDraft,
  entryToDraft,
  type FinanceDraft,
  FinanceEntryForm,
} from "@/components/finance/FinanceEntryForm";
import { FinanceList } from "@/components/finance/FinanceList";
import { SubscriptionsSummary } from "@/components/finance/SubscriptionsSummary";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  categoryTotals,
  formatPLN,
  isWithinRange,
  monthRange,
  subscriptionsStats,
  sumKwota,
} from "@/lib/finance/summary";
import type { FinanceEntry, FinanceEntryInput } from "@/lib/notion/finance";

interface FinanceApiResponse {
  success: boolean;
  entries?: FinanceEntry[];
  categoryOptions?: string[];
  error?: string;
}

interface FinancePanelProps {
  // Wąski, boczny wariant (styl Strefy priorytetyzacji) zamiast pełnowymiarowej sekcji:
  // węższy padding, statystyki w jednej kolumnie zamiast dwóch obok siebie.
  compact?: boolean;
}

export function FinancePanel({ compact = false }: FinancePanelProps) {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const [draft, setDraft] = useState<FinanceDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notion/finanse");
      const json = (await res.json()) as FinanceApiResponse;
      if (!json.success) {
        setError(json.error ?? "Błąd połączenia z Notion");
        return;
      }
      setEntries(json.entries ?? []);
      setCategoryOptions(json.categoryOptions ?? []);
    } catch {
      setError("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const range = monthRange(monthOffset);
  const inRange = entries.filter((e) => isWithinRange(e.data, range));
  const expensesInRange = inRange.filter((e) => e.typ === "Wydatek");
  const incomeInRange = inRange.filter((e) => e.typ === "Przychód");
  const incomeOptions = entries.filter((e) => e.typ === "Przychód");

  function openCreate() {
    setFormError(null);
    setEditingId(null);
    setDraft(emptyDraft());
  }

  function openEdit(entry: FinanceEntry) {
    setFormError(null);
    setEditingId(entry.id);
    setDraft(entryToDraft(entry));
  }

  async function saveDraft(d: FinanceDraft) {
    setSaving(true);
    setFormError(null);
    const input: FinanceEntryInput = draftToInput(d);
    try {
      const res = d.id
        ? await fetch(`/api/notion/finanse/${d.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          })
        : await fetch("/api/notion/finanse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) {
        setFormError(json.error ?? "Nie udało się zapisać wpisu.");
        return;
      }
      setDraft(null);
      setEditingId(null);
      void load();
    } catch {
      setFormError("Błąd połączenia z serwerem.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(entry: FinanceEntry) {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    try {
      await fetch(`/api/notion/finanse/${entry.id}`, { method: "DELETE" });
    } catch {
      void load();
      return;
    }
    void load();
  }

  const expenseTotals = categoryTotals(expensesInRange);
  const incomeTotals = categoryTotals(incomeInRange);
  // Subskrypcje liczone ze WSZYSTKICH wpisów, nie tylko `inRange` — to stan trwały, nie
  // zdarzenie ograniczone do wybranego miesiąca (patrz komentarz w subscriptionsStats).
  const subStats = subscriptionsStats(entries);

  return (
    <Panel solid style={{ padding: compact ? 16 : 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
          flexWrap: compact ? "wrap" : "nowrap",
        }}
      >
        {/* Ikona w kwadratowym "module badge" — celowo inny język wizualny niż nagłówek kolumny
            dnia (sama nazwa dnia, bez ikony), żeby ten panel czytał się jednoznacznie jako
            osobny moduł/widget, nie "ósmy dzień tygodnia". */}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "var(--radius-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-hover)",
            flexShrink: 0,
          }}
        >
          <PiggyBank size={14} color="var(--text-secondary)" />
        </div>
        <SectionLabel paddingX={0} style={{ padding: 0, fontSize: 11, fontWeight: 700 }}>
          Finanse osobiste
        </SectionLabel>
        <div style={{ flex: 1 }} />
        <button
          onClick={openCreate}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: compact ? "4px 9px" : "5px 12px",
            background: "var(--accent)",
            border: "none",
            borderRadius: "var(--radius-xs)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: compact ? 11 : 12,
            fontWeight: 600,
            color: "#fff",
          }}
        >
          <Plus size={12} /> Nowy wpis
        </button>
        <button
          onClick={() => void load()}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: compact ? "4px 8px" : "5px 10px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            cursor: loading ? "default" : "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: compact ? 11 : 12,
            color: "var(--text-secondary)",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw
            size={11}
            style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
          />
          {!compact && "Odśwież"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            background: "var(--error-bg)",
            border: "1px solid var(--error-border)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--error-text)",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            padding: "30px 0",
            textAlign: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-tertiary)",
          }}
        >
          Ładowanie...
        </div>
      ) : (
        <>
          <SubscriptionsSummary stats={subStats} />

          <FinanceList
            entries={entries}
            categoryOptions={categoryOptions}
            onEdit={openEdit}
            onDelete={(e) => void deleteEntry(e)}
          />

          {/* Statystyki — pod listą, osobny okres (domyślnie bieżący miesiąc) */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <button
                onClick={() => setMonthOffset((m) => m - 1)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "5px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xs)",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
              >
                <ChevronLeft size={13} />
              </button>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  minWidth: 130,
                  textAlign: "center",
                }}
              >
                {range.label}
              </span>
              <button
                onClick={() => setMonthOffset((m) => m + 1)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "5px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xs)",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
              >
                <ChevronRight size={13} />
              </button>
              {monthOffset !== 0 && (
                <button
                  onClick={() => setMonthOffset(0)}
                  style={{
                    padding: "5px 10px",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-xs)",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--accent-text)",
                  }}
                >
                  Ten miesiąc
                </button>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
                gap: compact ? 18 : 20,
              }}
            >
              <div>
                <SectionLabel paddingX={0} style={{ fontSize: 10, fontWeight: 700 }}>
                  Wydatki wg kategorii
                </SectionLabel>
                <FinanceDonutChart
                  data={expenseTotals}
                  centerLabel="Wydatki"
                  centerValue={formatPLN(sumKwota(expensesInRange))}
                />
              </div>
              <div>
                <SectionLabel paddingX={0} style={{ fontSize: 10, fontWeight: 700 }}>
                  Przychody wg kategorii
                </SectionLabel>
                <FinanceDonutChart
                  data={incomeTotals}
                  centerLabel="Przychody"
                  centerValue={formatPLN(sumKwota(incomeInRange))}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {draft && (
        <FinanceEntryForm
          initial={draft}
          incomeOptions={incomeOptions}
          categoryOptions={categoryOptions}
          saving={saving}
          error={formError}
          onSave={saveDraft}
          onDelete={
            editingId
              ? () => {
                  const entry = entries.find((e) => e.id === editingId);
                  setDraft(null);
                  setEditingId(null);
                  if (entry) void deleteEntry(entry);
                }
              : null
          }
          onClose={() => {
            setDraft(null);
            setEditingId(null);
            setFormError(null);
          }}
        />
      )}
    </Panel>
  );
}
