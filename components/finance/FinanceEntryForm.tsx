"use client";

import { Loader2, Plus, Repeat, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  FinanceEntry,
  FinanceEntryInput,
  FinanceTyp,
  RenewalInterval,
  RenewalKind,
} from "@/lib/notion/finance";
import { RENEWAL_INTERVALS, RENEWAL_KINDS } from "@/lib/notion/finance";

export interface FinanceDraft {
  id?: string;
  nazwa: string;
  typ: FinanceTyp;
  kwota: string; // string w formularzu, walidacja/konwersja przy submit
  kategoria: string[];
  data: string; // yyyy-mm-dd, ignorowane gdy dataNieznana
  dataNieznana: boolean;
  notatka: string;
  przypisaneDoPrzychoduId: string | null;
  subskrypcja: boolean;
  cyklOdnawiania: RenewalInterval | null;
  rodzajCyklu: RenewalKind | null;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function emptyDraft(): FinanceDraft {
  return {
    nazwa: "",
    typ: "Wydatek",
    kwota: "",
    kategoria: [],
    data: today(),
    dataNieznana: false,
    notatka: "",
    przypisaneDoPrzychoduId: null,
    subskrypcja: false,
    cyklOdnawiania: null,
    rodzajCyklu: null,
  };
}

export function entryToDraft(e: FinanceEntry): FinanceDraft {
  return {
    id: e.id,
    nazwa: e.nazwa,
    typ: e.typ || "Wydatek",
    kwota: String(e.kwota),
    kategoria: e.kategoria,
    data: e.data || today(),
    dataNieznana: !e.data,
    notatka: e.notatka,
    przypisaneDoPrzychoduId: e.przypisaneDoPrzychoduId,
    subskrypcja: e.subskrypcja,
    cyklOdnawiania: e.cyklOdnawiania,
    rodzajCyklu: e.rodzajCyklu,
  };
}

export function draftToInput(d: FinanceDraft): FinanceEntryInput {
  return {
    nazwa: d.nazwa.trim(),
    typ: d.typ,
    kwota: Number.parseFloat(d.kwota.replace(",", ".")) || 0,
    kategoria: d.kategoria,
    data: d.dataNieznana ? "" : d.data,
    notatka: d.notatka.trim() || undefined,
    przypisaneDoPrzychoduId: d.typ === "Wydatek" ? d.przypisaneDoPrzychoduId : null,
    subskrypcja: d.subskrypcja,
    cyklOdnawiania: d.subskrypcja ? d.cyklOdnawiania : null,
    rodzajCyklu: d.subskrypcja ? (d.rodzajCyklu ?? "Subskrypcja") : null,
  };
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--text-primary)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 11px",
  outline: "none",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 4,
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--text-tertiary)",
      }}
    >
      {children}
    </div>
  );
}

// ── Tag input kategorii — dowolne nowe wartości, nie sztywna lista ─────

function CategoryTagInput({
  value,
  onChange,
  suggestions,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
}) {
  const [draft, setDraft] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  // Wszystkie jeszcze niewybrane istniejące kategorie, widoczne od razu jako chipy do
  // klikania — filtrowane dodatkowo przez draft tylko gdy użytkownik zacznie pisać
  // (żeby zawęzić długą listę), nie jako warunek pokazania.
  const available = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(draft.toLowerCase()),
  );

  function add(name: string) {
    const t = name.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
    setAddingNew(false);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: value.length > 0 ? 6 : 0,
        }}
      >
        {value.map((cat) => (
          <span
            key={cat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#fff",
              background: "var(--bg-hover)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "var(--radius-xs)",
              padding: "3px 5px 3px 9px",
            }}
          >
            {cat}
            <button
              onClick={() => onChange(value.filter((c) => c !== cat))}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                padding: 0,
                color: "#fff",
              }}
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>

      {/* Istniejące kategorie od razu klikalne — dodanie nowej to osobna, świadoma opcja obok */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
        {available.map((s) => (
          <button
            key={s}
            onClick={() => add(s)}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-secondary)",
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
        {!addingNew && (
          <button
            onClick={() => setAddingNew(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              background: "none",
              border: "1px dashed var(--border-hover)",
              borderRadius: "var(--radius-xs)",
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            <Plus size={10} /> Nowa kategoria
          </button>
        )}
      </div>

      {addingNew && (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            }
            if (e.key === "Escape") {
              setDraft("");
              setAddingNew(false);
            }
          }}
          onBlur={() => {
            if (draft.trim()) add(draft);
            else setAddingNew(false);
          }}
          placeholder="Nazwa nowej kategorii i Enter..."
          style={fieldStyle}
        />
      )}
    </div>
  );
}

interface FinanceEntryFormProps {
  initial: FinanceDraft;
  incomeOptions: FinanceEntry[];
  categoryOptions: string[];
  saving: boolean;
  error: string | null;
  onSave: (d: FinanceDraft) => void;
  onDelete: (() => void) | null;
  onClose: () => void;
}

export function FinanceEntryForm({
  initial,
  incomeOptions,
  categoryOptions,
  saving,
  error,
  onSave,
  onDelete,
  onClose,
}: FinanceEntryFormProps) {
  const [d, setD] = useState<FinanceDraft>(initial);
  const isEdit = Boolean(initial.id);
  const set = (patch: Partial<FinanceDraft>) => setD((p) => ({ ...p, ...patch }));
  const kwotaNum = Number.parseFloat(d.kwota.replace(",", "."));
  const valid =
    d.nazwa.trim().length > 0 &&
    !Number.isNaN(kwotaNum) &&
    kwotaNum > 0 &&
    (d.dataNieznana || d.data);
  const nazwaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nazwaRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Portal do document.body: renderowany bezpośrednio wewnątrz <Panel> (backdropFilter), a
  // filter/backdrop-filter na przodku tworzy nowy containing block dla position:fixed —
  // bez portalu modal pozycjonowałby się względem małego bocznego panelu zamiast viewportu.
  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "rgba(0,0,0,0.28)",
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          zIndex: 51,
          width: 440,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 48px)",
          overflowY: "auto",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-menu)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              flex: 1,
            }}
          >
            {isEdit ? "Edytuj wpis" : "Nowy wpis"}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              display: "flex",
              padding: 3,
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {(["Wydatek", "Przychód"] as FinanceTyp[]).map((t) => (
              <button
                key={t}
                onClick={() => set({ typ: t })}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "var(--radius-sm)",
                  border: d.typ === t ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: d.typ === t ? "var(--accent-muted)" : "var(--bg)",
                  color: d.typ === t ? "var(--accent)" : "var(--text-secondary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <input
            ref={nazwaRef}
            value={d.nazwa}
            onChange={(e) => set({ nazwa: e.target.value })}
            placeholder="Nazwa"
            style={{ ...fieldStyle, fontSize: 14, fontWeight: 600 }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Label>Kwota (PLN)</Label>
              <input
                value={d.kwota}
                onChange={(e) => set({ kwota: e.target.value })}
                placeholder="0"
                inputMode="decimal"
                style={fieldStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Label>Data</Label>
              <input
                type="date"
                lang="pl-PL"
                disabled={d.dataNieznana}
                value={d.data}
                onChange={(e) => set({ data: e.target.value })}
                style={{ ...fieldStyle, opacity: d.dataNieznana ? 0.5 : 1 }}
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 5,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                <input
                  type="checkbox"
                  checked={d.dataNieznana}
                  onChange={(e) => set({ dataNieznana: e.target.checked })}
                />
                Data jeszcze nieznana
              </label>
            </div>
          </div>

          <div>
            <Label>Kategoria</Label>
            <CategoryTagInput
              value={d.kategoria}
              onChange={(kategoria) => set({ kategoria })}
              suggestions={categoryOptions}
            />
          </div>

          {/* Subskrypcja: wspólne dla Wydatku i Przychodu (np. abonament klienta) — cykl
              wybierany tylko gdy zaznaczone, żeby nie sugerować cyklu tam gdzie go nie ma. */}
          <div
            style={{
              borderRadius: "var(--radius-sm)",
              border: d.subskrypcja ? "1px solid var(--accent-border)" : "1px solid var(--border)",
              background: d.subskrypcja ? "var(--accent-muted)" : "var(--bg)",
              padding: "10px 12px",
              transition: "background 150ms ease, border-color 150ms ease",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              <input
                type="checkbox"
                checked={d.subskrypcja}
                onChange={(e) =>
                  set({
                    subskrypcja: e.target.checked,
                    cyklOdnawiania: e.target.checked ? (d.cyklOdnawiania ?? "Miesiąc") : null,
                  })
                }
              />
              <Repeat size={13} color={d.subskrypcja ? "var(--accent)" : "var(--text-tertiary)"} />
              To jest cykliczne (subskrypcja lub retainer klienta)
            </label>
            {d.subskrypcja && (
              <div style={{ marginTop: 10 }}>
                <Label>Rodzaj</Label>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {RENEWAL_KINDS.map((kind) => {
                    const active = (d.rodzajCyklu ?? "Subskrypcja") === kind;
                    return (
                      <button
                        key={kind}
                        onClick={() => set({ rodzajCyklu: kind })}
                        style={{
                          flex: 1,
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "6px 4px",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          color: active ? "var(--accent)" : "var(--text-secondary)",
                          background: active ? "var(--bg-elevated)" : "var(--bg)",
                          border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        }}
                      >
                        {kind}
                      </button>
                    );
                  })}
                </div>
                <Label>Odnawia się co</Label>
                <div style={{ display: "flex", gap: 6 }}>
                  {RENEWAL_INTERVALS.map((interval) => {
                    const active = d.cyklOdnawiania === interval;
                    return (
                      <button
                        key={interval}
                        onClick={() => set({ cyklOdnawiania: interval })}
                        style={{
                          flex: 1,
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "6px 0",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          color: active ? "var(--accent)" : "var(--text-secondary)",
                          background: active ? "var(--bg-elevated)" : "var(--bg)",
                          border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        }}
                      >
                        {interval}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {d.typ === "Wydatek" && (
            <div>
              <Label>Przypisane do przychodu (opcjonalnie)</Label>
              <select
                value={d.przypisaneDoPrzychoduId ?? ""}
                onChange={(e) => set({ przypisaneDoPrzychoduId: e.target.value || null })}
                style={fieldStyle}
              >
                <option value="">Brak</option>
                {incomeOptions.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.nazwa} ({inc.kwota.toLocaleString("pl-PL")} zł)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label>Notatka</Label>
            <textarea
              value={d.notatka}
              onChange={(e) => set({ notatka: e.target.value })}
              placeholder="Opcjonalnie"
              rows={2}
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </div>

          {error && (
            <div
              style={{
                fontSize: 12,
                color: "var(--error-text)",
                background: "var(--error-bg)",
                border: "1px solid var(--error-border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
                fontFamily: "var(--font-sans)",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 18px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => valid && onSave(d)}
            disabled={!valid || saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              background: valid ? "var(--accent)" : "var(--border)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "8px 16px",
              cursor: valid && !saving ? "pointer" : "default",
            }}
          >
            {saving ? (
              <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} />
            ) : (
              <Plus size={13} />
            )}
            {isEdit ? "Zapisz zmiany" : "Dodaj wpis"}
          </button>
          <button
            onClick={onClose}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-secondary)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            Anuluj
          </button>
          <div style={{ flex: 1 }} />
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={saving}
              title="Usuń wpis"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--error-text)",
                background: "var(--error-bg)",
                border: "1px solid var(--error-border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} /> Usuń
            </button>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
