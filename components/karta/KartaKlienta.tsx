"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CardState } from "@/lib/google/sheets-card";

// ── Empty card (rendered before a row exists) ───────────────────────

function emptyCard(name: string): CardState {
  return {
    imieNazwisko: name,
    numer: "",
    email: "",
    data: "",
    rozmowaKwalifikacyjna: false,
    notatkiKwalifikacyjne: "",
    nagranieKwalifikacyjne: "",
    umowionaRozmowaSprzedazowa: false,
    telefonPrzypomnienie: false,
    odbytaRozmowaSprzedazowa: false,
    notatkiSprzedazowe: "",
    nagranieSprzedazowe: "",
    umowioneSpotkanieDecyzyjne: false,
    zaproszenieLinkedin: false,
    odbyteSpotkanieDecyzyjne: false,
    notatkiDecyzyjne: "",
    nagranieDecyzyjne: "",
    followUpDate: "",
    pozyskanyKlient: false,
    podpisanaUmowa: false,
    oplaconaFaktura: false,
    wartoscUmowy: "",
  };
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface KartaKlientaProps {
  clientName: string;
  phone?: string;
  email?: string;
  company?: string;
}

export function KartaKlienta({ clientName, phone, email, company }: KartaKlientaProps) {
  const [card, setCard] = useState<CardState | null>(null);
  const [found, setFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resetPending, setResetPending] = useState(false);

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (!clientName.trim()) return;
      if (showSpinner) setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/google/sheets/card?name=${encodeURIComponent(clientName)}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setFound(Boolean(data.found));
          const loaded = data.card ?? emptyCard(clientName);
          setCard({
            ...loaded,
            numer: loaded.numer || phone || "",
            email: loaded.email || email || "",
          });
        } else {
          setLoadError(
            data.error === "scope_required"
              ? "Brak uprawnień do arkusza — połącz Google ponownie."
              : data.error || "Nie udało się wczytać karty.",
          );
          setCard(emptyCard(clientName));
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Błąd połączenia z arkuszem.");
        setCard(emptyCard(clientName));
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [clientName],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  // Refresh on window focus, but never clobber an in-progress edit.
  useEffect(() => {
    function onFocus() {
      const active = document.activeElement;
      const editing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
      if (!editing) void load(false);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const flashSaved = useCallback(() => {
    setSaveStatus("saved");
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaveStatus("idle"), 1800);
  }, []);

  const save = useCallback(
    async (patch: Partial<CardState>): Promise<boolean> => {
      if (!card) return false;
      const snapshot = card;
      setCard({ ...card, ...patch }); // optimistic
      setSaveStatus("saving");
      setSaveError(null);
      try {
        const res = await fetch("/api/google/sheets/card", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: clientName,
            fields: patch,
            createIfMissing: true,
            phone,
            email,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setFound(true);
          if (data.card) setCard(data.card as CardState);
          flashSaved();
          return true;
        }
        setCard(snapshot); // rollback
        setSaveStatus("error");
        setSaveError(
          data.error === "scope_required"
            ? "Brak uprawnień do arkusza."
            : data.detail || data.error || "Nie udało się zapisać.",
        );
        return false;
      } catch (err) {
        setCard(snapshot); // rollback
        setSaveStatus("error");
        setSaveError(err instanceof Error ? err.message : "Błąd połączenia.");
        return false;
      }
    },
    [card, clientName, phone, email, flashSaved],
  );

  const resetCard = useCallback(async () => {
    if (
      !window.confirm(
        `Wyczyścić dane karty klienta "${clientName}" w arkuszu Kontakty ORAZ w karcie Notion Pipeline (analizy agentów, notatki, status wracają do "Nowy lead")? Tej operacji nie można cofnąć.`,
      )
    )
      return;
    setResetPending(true);

    let notionSummary = "Notion: pominięto (brak telefonu i nazwy do wyszukania)";
    if (phone || clientName.trim()) {
      try {
        const res = await fetch("/api/notion/reset-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telefon: phone,
            firma: company || clientName,
            kontakt: clientName,
          }),
        });
        const data = await res.json();
        if (data.blocked) {
          window.alert(
            `Nic nie wyczyszczono. Klient ma w Notion status "${data.status}" — to aktywny lub zakończony klient płacący, reset zablokowany. Nie ruszono też arkusza Google.`,
          );
          setResetPending(false);
          return;
        }
        if (data.found === false) {
          const s = data.searched ?? {};
          notionSummary = `Notion: nie znaleziono leada w Pipeline (szukano telefon: ${s.telefonKey ?? "brak"}, firma: "${s.firma ?? ""}", kontakt: "${s.kontakt ?? ""}", przeszukano ${data.pipelineCount ?? "?"} kart)`;
        } else if (data.cleared) {
          notionSummary = `Notion: karta wyczyszczona (dopasowano po: ${data.matchedBy}), status wrócił do "Nowy lead"`;
        } else {
          notionSummary = `Notion: nie udało się wyczyścić (${data.error || "nieznany błąd"})`;
        }
      } catch (err) {
        notionSummary = `Notion: błąd połączenia (${err instanceof Error ? err.message : "nieznany"})`;
      }
    }

    const sheetsOk = await save({
      rozmowaKwalifikacyjna: false,
      notatkiKwalifikacyjne: "",
      nagranieKwalifikacyjne: "",
      umowionaRozmowaSprzedazowa: false,
      telefonPrzypomnienie: false,
      odbytaRozmowaSprzedazowa: false,
      notatkiSprzedazowe: "",
      nagranieSprzedazowe: "",
      followUpDate: "",
      umowioneSpotkanieDecyzyjne: false,
      zaproszenieLinkedin: false,
      odbyteSpotkanieDecyzyjne: false,
      notatkiDecyzyjne: "",
      nagranieDecyzyjne: "",
      pozyskanyKlient: false,
      podpisanaUmowa: false,
      oplaconaFaktura: false,
    });
    setResetPending(false);

    window.alert(
      `${notionSummary}\nArkusz Google: ${sheetsOk ? "wyczyszczony" : "błąd zapisu, patrz komunikat na karcie"}`,
    );
  }, [clientName, phone, company, save]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: 20,
          color: "var(--text-tertiary)",
        }}
      >
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 13 }}>
          Ładowanie karty klienta…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const c = card ?? emptyCard(clientName);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "var(--font-sans)" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header / status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          Karta klienta
        </span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>· {clientName}</span>
        <div style={{ flex: 1 }} />
        {saveStatus === "saving" && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "var(--text-tertiary)",
            }}
          >
            <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Zapisuję…
          </span>
        )}
        {saveStatus === "saved" && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              color: "var(--success-text)",
            }}
          >
            <CheckCircle2 size={11} /> Zapisano
          </span>
        )}
        <button
          onClick={() => void resetCard()}
          title="Wyczyść kartę i Pipeline"
          disabled={resetPending}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--error)",
            display: "flex",
            padding: 3,
            opacity: resetPending ? 0.4 : 0.6,
          }}
        >
          <RotateCcw size={13} />
        </button>
        <button
          onClick={() => void load(true)}
          title="Odśwież z arkusza"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            display: "flex",
            padding: 3,
          }}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {loadError && <Banner kind="error" text={loadError} />}
      {saveStatus === "error" && saveError && (
        <Banner kind="error" text={`Błąd zapisu: ${saveError}`} />
      )}
      {!found && !loadError && (
        <Banner
          kind="info"
          text={
            "Klient nie ma jeszcze wiersza w arkuszu „Kontakty”. Pierwsza zmiana utworzy go automatycznie."
          }
        />
      )}

      {/* Etap: Kwalifikacja */}
      <Section title="Etap 1 · Rozmowa kwalifikacyjna">
        <CheckRow
          label="Rozmowa telefoniczna (kwalifikacyjna)"
          checked={c.rozmowaKwalifikacyjna}
          onToggle={(v) => save({ rozmowaKwalifikacyjna: v })}
        />
        <NoteField
          label="Notatki po rozmowie telefonicznej"
          value={c.notatkiKwalifikacyjne}
          onSave={(v) => save({ notatkiKwalifikacyjne: v })}
        />
        <LinkField
          label="Nagranie rozmowy telefonicznej"
          value={c.nagranieKwalifikacyjne}
          onSave={(v) => save({ nagranieKwalifikacyjne: v })}
        />
      </Section>

      {/* Etap: Sprzedażowa */}
      <Section title="Etap 2 · Rozmowa sprzedażowa (ofertowa)">
        <CheckRow
          label="Umówiona rozmowa sprzedażowa"
          checked={c.umowionaRozmowaSprzedazowa}
          onToggle={(v) => save({ umowionaRozmowaSprzedazowa: v })}
        />
        <CheckRow
          label="Telefon z przypomnieniem"
          checked={c.telefonPrzypomnienie}
          onToggle={(v) => save({ telefonPrzypomnienie: v })}
        />
        <CheckRow
          label="Odbyta rozmowa sprzedażowa"
          checked={c.odbytaRozmowaSprzedazowa}
          onToggle={(v) => save({ odbytaRozmowaSprzedazowa: v })}
        />
        <NoteField
          label="Notatki po rozmowie sprzedażowej"
          value={c.notatkiSprzedazowe}
          onSave={(v) => save({ notatkiSprzedazowe: v })}
        />
        <LinkField
          label="Nagranie rozmowy sprzedażowej"
          value={c.nagranieSprzedazowe}
          onSave={(v) => save({ nagranieSprzedazowe: v })}
        />
        <DateField
          label="Data follow-up (jeśli klient nie mógł)"
          value={c.followUpDate}
          onSave={(v) => save({ followUpDate: v })}
        />
      </Section>

      {/* Etap: Decyzyjna */}
      <Section title="Etap 3 · Spotkanie decyzyjne">
        <CheckRow
          label="Umówione spotkanie decyzyjne"
          checked={c.umowioneSpotkanieDecyzyjne}
          onToggle={(v) => save({ umowioneSpotkanieDecyzyjne: v })}
        />
        <CheckRow
          label="Zaproszenie na LinkedIn / YouTube"
          checked={c.zaproszenieLinkedin}
          onToggle={(v) => save({ zaproszenieLinkedin: v })}
        />
        <CheckRow
          label="Odbyte spotkanie decyzyjne"
          checked={c.odbyteSpotkanieDecyzyjne}
          onToggle={(v) => save({ odbyteSpotkanieDecyzyjne: v })}
        />
        <NoteField
          label="Notatki po rozmowie decyzyjnej"
          value={c.notatkiDecyzyjne}
          onSave={(v) => save({ notatkiDecyzyjne: v })}
        />
        <LinkField
          label="Nagranie rozmowy decyzyjnej (finalizacja)"
          value={c.nagranieDecyzyjne}
          onSave={(v) => save({ nagranieDecyzyjne: v })}
        />
        <DateField
          label="Data follow-up (jeśli odkładają decyzję)"
          value={c.followUpDate}
          onSave={(v) => save({ followUpDate: v })}
        />
      </Section>

      {/* Finalizacja */}
      <Section title="Finalizacja">
        <CheckRow
          label="Pozyskany klient"
          checked={c.pozyskanyKlient}
          onToggle={(v) => save({ pozyskanyKlient: v })}
        />
        <CheckRow
          label="Podpisana umowa"
          checked={c.podpisanaUmowa}
          onToggle={(v) => save({ podpisanaUmowa: v })}
        />
        <CheckRow
          label="Opłacona faktura"
          checked={c.oplaconaFaktura}
          onToggle={(v) => save({ oplaconaFaktura: v })}
        />
        <TextField
          label="Wartość umowy"
          value={c.wartoscUmowy}
          placeholder="np. 4 500 zł / mc"
          onSave={(v) => save({ wartoscUmowy: v })}
        />
      </Section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function Banner({ kind, text }: { kind: "error" | "info"; text: string }) {
  const isError = kind === "error";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: "var(--radius-sm)",
        fontSize: 12,
        background: isError ? "var(--error-bg)" : "var(--bg-elevated)",
        border: `1px solid ${isError ? "var(--error-border)" : "var(--border)"}`,
        color: isError ? "var(--error)" : "var(--text-secondary)",
      }}
    >
      <AlertTriangle size={12} />
      <span>{text}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-elevated)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid var(--border)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
        }}
      >
        {title}
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onToggle(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        textAlign: "left",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: checked ? "var(--accent)" : "transparent",
          border: `1.5px solid ${checked ? "var(--accent)" : "var(--border)"}`,
          transition: "all 0.12s",
        }}
      >
        {checked && <Check size={12} color="#fff" strokeWidth={3} />}
      </span>
      <span
        style={{
          fontSize: 12.5,
          color: checked ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight: checked ? 600 : 400,
        }}
      >
        {label}
      </span>
    </button>
  );
}

function NoteField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setDraft(value), [value]);
  // Auto-resize: textarea rośnie pod treść (cała notatka widoczna bez scrolla).
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [draft]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-tertiary)" }}>
        {label}
      </label>
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onSave(draft);
        }}
        rows={4}
        placeholder="—"
        style={{
          width: "100%",
          boxSizing: "border-box",
          resize: "none",
          overflow: "hidden",
          padding: "7px 9px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--bg)",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--text-primary)",
          lineHeight: 1.5,
          outline: "none",
        }}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-tertiary)" }}>
        {label}
      </label>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onSave(draft);
        }}
        placeholder={placeholder ?? "—"}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "7px 9px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--bg)",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
    </div>
  );
}

function LinkField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-tertiary)" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== value) onSave(draft);
          }}
          placeholder="Wklej link do nagrania…"
          style={{
            flex: 1,
            boxSizing: "border-box",
            padding: "7px 9px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
              padding: "6px 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--success-border)",
              background: "var(--success-bg)",
              color: "var(--success-text)",
              textDecoration: "none",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <ExternalLink size={11} /> Otwórz
          </a>
        )}
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 10.5, fontWeight: 600, color: "var(--accent)" }}>{label}</label>
      <input
        type="date"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          onSave(e.target.value);
        }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "7px 9px",
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${draft ? "var(--accent-border)" : "var(--border)"}`,
          background: draft ? "var(--accent-muted)" : "var(--bg)",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: draft ? "var(--accent)" : "var(--text-secondary)",
          outline: "none",
          cursor: "pointer",
        }}
      />
      {draft && (
        <button
          onClick={() => {
            setDraft("");
            onSave("");
          }}
          style={{
            alignSelf: "flex-start",
            fontSize: 10.5,
            color: "var(--text-tertiary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Wyczyść datę
        </button>
      )}
    </div>
  );
}
