"use client";

import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FinanceEntry, FinanceEntryInput, FinanceTyp } from "@/lib/notion/finance";

export interface FinanceDraft {
  id?: string;
  nazwa: string;
  typ: FinanceTyp;
  kwota: string; // string w formularzu, walidacja/konwersja przy submit
  kategoria: string[];
  data: string; // yyyy-mm-dd
  notatka: string;
  przypisaneDoPrzychoduId: string | null;
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
    notatka: "",
    przypisaneDoPrzychoduId: null,
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
    notatka: e.notatka,
    przypisaneDoPrzychoduId: e.przypisaneDoPrzychoduId,
  };
}

export function draftToInput(d: FinanceDraft): FinanceEntryInput {
  return {
    nazwa: d.nazwa.trim(),
    typ: d.typ,
    kwota: Number.parseFloat(d.kwota.replace(",", ".")) || 0,
    kategoria: d.kategoria,
    data: d.data,
    notatka: d.notatka.trim() || undefined,
    przypisaneDoPrzychoduId: d.typ === "Wydatek" ? d.przypisaneDoPrzychoduId : null,
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
  const remaining = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(draft.toLowerCase()),
  );

  function add(name: string) {
    const t = name.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
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
              fontSize: 11,
              fontWeight: 600,
              color: "var(--accent)",
              background: "var(--accent-muted)",
              border: "1px solid var(--accent-border)",
              borderRadius: "var(--radius-xs)",
              padding: "3px 6px 3px 9px",
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
                color: "var(--accent)",
              }}
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          }
        }}
        placeholder="Dodaj kategorię i Enter..."
        style={fieldStyle}
      />
      {draft && remaining.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
          {remaining.slice(0, 6).map((s) => (
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
        </div>
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
  const valid = d.nazwa.trim().length > 0 && !Number.isNaN(kwotaNum) && kwotaNum > 0 && d.data;
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
                value={d.data}
                onChange={(e) => set({ data: e.target.value })}
                style={fieldStyle}
              />
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
