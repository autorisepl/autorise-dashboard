"use client";

import {
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Save,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PipelineClient } from "@/lib/notion/client";

// ── Token shortcuts ────────────────────────────────────────────────
const f = { system: "var(--font-system)", mono: "var(--font-mono)" };
const ACCENT = "var(--accent)";

// ── Field ──────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  type = "number",
  placeholder,
  suffix,
  min,
  max,
  readOnly,
}: {
  label: string;
  value: string | number;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  suffix?: string;
  min?: number;
  max?: number;
  readOnly?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label
        style={{
          fontFamily: f.system,
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center" }}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          readOnly={readOnly}
          style={{
            flex: 1,
            background: readOnly ? "var(--bg)" : "var(--bg-elevated)",
            borderTop: `1px solid ${focused && !readOnly ? ACCENT : "var(--border)"}`,
            borderLeft: `1px solid ${focused && !readOnly ? ACCENT : "var(--border)"}`,
            borderBottom: `1px solid ${focused && !readOnly ? ACCENT : "var(--border)"}`,
            borderRight: suffix
              ? "none"
              : `1px solid ${focused && !readOnly ? ACCENT : "var(--border)"}`,
            borderRadius: suffix ? "9px 0 0 9px" : 9,
            color: readOnly ? "var(--text-tertiary)" : "var(--text-primary)",
            fontFamily: f.mono,
            fontSize: 14,
            fontWeight: 600,
            padding: "10px 13px",
            outline: "none",
            minHeight: 42,
            boxSizing: "border-box",
            boxShadow: focused && !readOnly ? `0 0 0 3px var(--accent-muted)` : "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {suffix && (
          <span
            style={{
              padding: "10px 13px",
              background: "var(--bg)",
              border: `1px solid var(--border)`,
              borderLeft: "none",
              borderRadius: "0 9px 9px 0",
              fontFamily: f.system,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              whiteSpace: "nowrap",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Big result number ─────────────────────────────────────────────

function BigNumber({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
        background: accent
          ? "linear-gradient(135deg, rgba(10,132,255,0.09) 0%, rgba(10,132,255,0.04) 100%)"
          : "var(--bg-elevated)",
        border: `1px solid ${accent ? "var(--accent-border)" : "var(--border)"}`,
        borderRadius: 14,
        boxShadow: accent ? "0 4px 20px rgba(10,132,255,0.08)" : "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {accent && (
        <div
          style={{
            position: "absolute",
            top: -24,
            right: -16,
            width: 90,
            height: 90,
            background: "radial-gradient(circle, rgba(10,132,255,0.10) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          fontFamily: f.system,
          fontSize: 11,
          fontWeight: 600,
          marginBottom: 10,
          letterSpacing: "0.02em",
          color: accent ? "var(--accent)" : "var(--text-tertiary)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: f.mono,
          fontSize: accent ? 40 : 34,
          fontWeight: 800,
          color: accent ? ACCENT : "var(--text-primary)",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: f.system,
            fontSize: 12,
            color: "var(--text-tertiary)",
            marginTop: 6,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Small result row ─────────────────────────────────────────────

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        padding: "9px 0",
        borderBottom: "1px solid var(--separator)",
      }}
    >
      <span style={{ fontFamily: f.system, fontSize: 13, color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: f.mono,
          fontSize: 14,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Save modal ────────────────────────────────────────────────────

function SaveModal({
  clients,
  saving,
  error,
  onSave,
  onClose,
}: {
  clients: PipelineClient[];
  saving: boolean;
  error: string | null;
  onSave: (id: string) => void;
  onClose: () => void;
}) {
  const eligible = clients.filter(
    (c) =>
      c.status === "Nowy lead" || c.status === "Kwalifikacja" || c.status === "Discovery umówione",
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: 28,
          width: "100%",
          maxWidth: 460,
          boxShadow: "var(--shadow-menu)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: f.system,
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Zapisz do Pipeline
            </div>
            <div
              style={{
                fontFamily: f.system,
                fontSize: 12,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              Wybierz klienta, do którego przypisać wyniki
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              borderRadius: 7,
              cursor: "pointer",
              color: "var(--text-tertiary)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {eligible.length === 0 ? (
          <div
            style={{
              padding: "18px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontFamily: f.system,
              fontSize: 13,
              color: "var(--text-secondary)",
              textAlign: "center",
            }}
          >
            Brak klientów na aktywnych etapach pipeline.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {eligible.map((c) => (
              <ClientRow key={c.id} client={c} saving={saving} onSave={onSave} />
            ))}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              background: "var(--error-bg)",
              border: "1px solid var(--error-border)",
              borderRadius: 9,
              fontFamily: f.system,
              fontSize: 12,
              color: "var(--error)",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientRow({
  client: c,
  saving,
  onSave,
}: {
  client: PipelineClient;
  saving: boolean;
  onSave: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const statusDot: Record<string, string> = {
    Kwalifikacja: "#af52de",
    "Discovery umówione": "#ff9500",
  };
  const dot = statusDot[c.status] ?? ACCENT;

  return (
    <button
      onClick={() => onSave(c.id)}
      disabled={saving}
      style={{
        padding: "12px 16px",
        background: hovered ? "var(--bg-hover)" : "var(--bg)",
        border: `1px solid ${hovered ? ACCENT : "var(--border)"}`,
        borderRadius: 10,
        cursor: saving ? "wait" : "pointer",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: hovered ? `0 0 0 3px var(--accent-muted)` : "none",
        transition: "border-color 0.15s, box-shadow 0.12s, background 0.12s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {saving ? (
        <Loader2
          size={13}
          style={{ animation: "spin 1s linear infinite", color: ACCENT, flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: f.system,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {c.name || c.id}
        </div>
        <div
          style={{
            fontFamily: f.system,
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 1,
          }}
        >
          {c.status}
        </div>
      </div>
    </button>
  );
}

// ── Główny komponent (reużywalny: strona + zakładka w Sprzedaży) ──────

interface KalkulatorRoiProps {
  /** Gdy renderowany jako zakładka — przewija się wewnątrz kontenera zamiast 100vh. */
  embedded?: boolean;
  /** Wstępna nazwa klienta (np. z wybranego klienta w Sprzedaży). */
  initialClientName?: string;
}

export function KalkulatorRoi({ embedded = false, initialClientName }: KalkulatorRoiProps) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [nazwaKlienta, setNazwaKlienta] = useState(initialClientName ?? "");

  // ── Universal field (zawsze aktywny) ──
  const [godzinyTygodniowo, setGodzinyTygodniowo] = useState("10");
  const [liczbaOsob, setLiczbaOsob] = useState("3");
  const [stawkaH, setStawkaH] = useState("50");

  // ── Optional sections ──
  const [showMaile, setShowMaile] = useState(false);
  const [maile, setMaile] = useState("40");
  const [godzinyWpisywania, setGodzinyWpisywania] = useState("2");

  const [showFaktury, setShowFaktury] = useState(false);
  const [fakturyPo, setFakturyPo] = useState("5");
  const [sredniaCena, setSredniaCena] = useState("15000");

  const [showIntegracja, setShowIntegracja] = useState(false);
  const [integracjaOpis, setIntegracjaOpis] = useState("");

  const [showInne, setShowInne] = useState(false);
  const [inneOpis, setInneOpis] = useState("");
  const [inneGodziny, setInneGodziny] = useState("");

  const [copied, setCopied] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [clients, setClients] = useState<PipelineClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedClient, setSavedClient] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (initialClientName) setNazwaKlienta(initialClientName);
  }, [initialClientName]);

  const n = (v: string) => parseFloat(v) || 0;

  const calc = useMemo(() => {
    // Universal: godziny/tydzień × 4.33 tygodnie × liczba osób × stawka PLN/h
    const universalMc = Math.round(n(godzinyTygodniowo) * 4.33 * n(liczbaOsob) * n(stawkaH));

    // Optional: czas wpisywania zleceń z maili
    const maileMc = showMaile
      ? Math.round(n(godzinyWpisywania) * n(liczbaOsob) * 22 * n(stawkaH))
      : 0;

    // Optional: ryzyko faktur po terminie (15% wartości = domyślny wskaźnik windykacji)
    const fakturyMc = showFaktury ? Math.round(n(fakturyPo) * n(sredniaCena) * 0.15) : 0;

    // Optional: inne (custom godziny/tydzień)
    const inneMc =
      showInne && n(inneGodziny) > 0
        ? Math.round(n(inneGodziny) * 4.33 * n(liczbaOsob) * n(stawkaH))
        : 0;

    const kosztMc = universalMc + maileMc + fakturyMc + inneMc;
    const kosztRok = kosztMc * 12;
    const roi = kosztRok > 0 ? (kosztRok / 15000).toFixed(1) : "—";
    const pctKosztu = kosztRok > 0 ? ((15000 / kosztRok) * 100).toFixed(1) : "—";

    return {
      kosztMc,
      kosztRok,
      roi,
      pctKosztu,
      universalMc,
      maileMc,
      fakturyMc,
      inneMc,
    };
  }, [
    godzinyTygodniowo,
    liczbaOsob,
    stawkaH,
    showMaile,
    maile,
    godzinyWpisywania,
    showFaktury,
    fakturyPo,
    sredniaCena,
    showInne,
    inneGodziny,
  ]);

  const copyText = useCallback(() => {
    const lines = [
      `KOSZT BÓLU${nazwaKlienta ? ` — ${nazwaKlienta}` : ""}`,
      `Godziny manualne: ${godzinyTygodniowo}h/tydzień × ${liczbaOsob} os. × ${stawkaH} PLN/h`,
      `Miesięcznie: ${calc.kosztMc.toLocaleString("pl")} PLN | Rocznie: ${calc.kosztRok.toLocaleString("pl")} PLN`,
      `ROI: ${calc.roi}× | 15 000 PLN = ${calc.pctKosztu}% kosztu rocznego`,
    ];
    if (showMaile) lines.push(`Analiza maili: ${calc.maileMc.toLocaleString("pl")} PLN/mc`);
    if (showFaktury)
      lines.push(`Faktury po terminie: ${calc.fakturyMc.toLocaleString("pl")} PLN/mc`);
    if (showIntegracja && integracjaOpis) lines.push(`Integracja: ${integracjaOpis}`);
    if (showInne && inneOpis) lines.push(`Inne: ${inneOpis}`);
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [
    nazwaKlienta,
    godzinyTygodniowo,
    liczbaOsob,
    stawkaH,
    calc,
    showMaile,
    showFaktury,
    showIntegracja,
    integracjaOpis,
    showInne,
    inneOpis,
  ]);

  const loadClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const res = await fetch("/api/notion/clients");
      const data = await res.json();
      if (data.success)
        setClients(
          (data.clients ?? []).filter((c: PipelineClient) => c.status !== "Niekwalifikowany"),
        );
    } catch {
      /* silent */
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleClientSelect = (id: string) => {
    setSelectedClientId(id);
    const client = clients.find((c) => c.id === id);
    if (client?.name) setNazwaKlienta(client.name);
    setClientDropdownOpen(false);
  };

  const handleOpenSave = useCallback(() => {
    setSaveError(null);
    setShowSaveModal(true);
  }, []);

  const handleSave = useCallback(
    async (pageId: string) => {
      setSaving(true);
      setSaveError(null);
      try {
        const res = await fetch("/api/notion/pipeline-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId,
            fields: { koszt_problemu: calc.kosztMc, koszt_roczny: calc.kosztRok },
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Błąd zapisu");
        setSavedClient(data.firmaNazwa || pageId);
        setShowSaveModal(false);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Błąd zapisu do Notion");
      } finally {
        setSaving(false);
      }
    },
    [calc],
  );

  const prezentacjaUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (n(godzinyTygodniowo) && n(liczbaOsob)) {
      const dzis = Math.round(n(godzinyTygodniowo) * 4.33 * n(liczbaOsob));
      p.set("roi", Math.min(dzis, 70).toString());
      p.set("po", "10");
      p.set("gwar", Math.round(dzis * 0.8).toString());
    }
    if (calc.kosztRok > 0) p.set("bol", calc.kosztRok.toString());
    p.set("start", calc.kosztRok > 0 ? "2" : "1");
    return `/prezentacja.html?${p.toString()}`;
  }, [godzinyTygodniowo, liczbaOsob, calc.kosztRok]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div
      style={{
        ...(embedded
          ? { height: "100%", overflowY: "auto", padding: "24px 28px 40px" }
          : { minHeight: "100vh", padding: "28px 28px 48px" }),
        background: "var(--bg)",
        fontFamily: f.system,
        color: "var(--text-primary)",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ maxWidth: 900, marginBottom: 28 }}>
        <div
          style={{
            fontFamily: f.mono,
            fontSize: 10,
            color: "var(--text-tertiary)",
            letterSpacing: "0.08em",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>Praca z klientami</span>
          <span style={{ opacity: 0.35 }}>/</span>
          <span>Kalkulator ROI</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, var(--accent) 0%, #4b7bff 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 22px rgba(10,132,255,0.28)",
                  flexShrink: 0,
                }}
              >
                <Calculator size={20} color="#fff" strokeWidth={1.8} />
              </div>
              <div>
                <h1
                  style={{
                    fontFamily: f.system,
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    margin: 0,
                    lineHeight: 1,
                    color: "var(--text-primary)",
                  }}
                >
                  Kalkulator kosztu bólu
                </h1>
                <div
                  style={{
                    fontFamily: f.system,
                    fontSize: 13,
                    color: "var(--text-tertiary)",
                    marginTop: 5,
                    fontWeight: 400,
                  }}
                >
                  Kwantyfikacja problemu przed Discovery Call
                </div>
              </div>
            </div>
            {savedClient && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  padding: "4px 12px",
                  background: "var(--success-bg)",
                  border: "1px solid var(--success-border)",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--success-text)",
                }}
              >
                <Check size={11} /> Zapisano do Pipeline: {savedClient}
              </div>
            )}
          </div>

          {/* Client selector — custom dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label
              style={{
                fontFamily: f.system,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Firma (opcjonalnie)
            </label>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setClientDropdownOpen((v) => !v)}
                disabled={clientsLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  width: "100%",
                  background: "var(--bg-elevated)",
                  border: `1px solid ${clientDropdownOpen ? ACCENT : "var(--border)"}`,
                  borderRadius: 9,
                  cursor: clientsLoading ? "wait" : "pointer",
                  boxShadow: clientDropdownOpen ? `0 0 0 3px var(--accent-muted)` : "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              >
                {clientsLoading ? (
                  <Loader2
                    size={12}
                    color="var(--text-tertiary)"
                    style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
                  />
                ) : (
                  <User
                    size={12}
                    color={selectedClient ? ACCENT : "var(--text-tertiary)"}
                    strokeWidth={1.7}
                    style={{ flexShrink: 0 }}
                  />
                )}
                <span
                  style={{
                    fontFamily: f.system,
                    fontSize: 12,
                    flex: 1,
                    color: selectedClient ? "var(--text-primary)" : "var(--text-tertiary)",
                    textAlign: "left",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {clientsLoading
                    ? "Ładowanie..."
                    : selectedClient
                      ? selectedClient.name
                      : "— Wybierz firmę —"}
                </span>
                <ChevronDown
                  size={12}
                  color="var(--text-tertiary)"
                  style={{
                    flexShrink: 0,
                    transform: clientDropdownOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
              </button>

              {clientDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 5px)",
                    right: 0,
                    minWidth: 240,
                    zIndex: 100,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-menu)",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "4px 4px", maxHeight: 240, overflowY: "auto" }}>
                    {selectedClientId && (
                      <button
                        onClick={() => {
                          setSelectedClientId("");
                          setClientDropdownOpen(false);
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 7,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: f.system,
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        Wyczyść wybór
                      </button>
                    )}
                    {clients.length === 0 ? (
                      <div
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          fontFamily: f.system,
                          fontSize: 12,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        Brak klientów
                      </div>
                    ) : (
                      clients.map((c) => {
                        const isSelected = c.id === selectedClientId;
                        return (
                          <button
                            key={c.id}
                            onClick={() => handleClientSelect(c.id)}
                            style={{
                              width: "100%",
                              padding: "9px 10px",
                              borderRadius: 7,
                              border: "none",
                              background: isSelected ? `var(--accent-muted)` : "transparent",
                              cursor: "pointer",
                              textAlign: "left",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: isSelected ? ACCENT : "var(--text-tertiary)",
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontFamily: f.system,
                                  fontSize: 12,
                                  fontWeight: isSelected ? 600 : 400,
                                  color: "var(--text-primary)",
                                }}
                              >
                                {c.name}
                              </div>
                              <div
                                style={{
                                  fontFamily: f.mono,
                                  fontSize: 10,
                                  color: "var(--text-tertiary)",
                                  marginTop: 1,
                                }}
                              >
                                {c.status}
                              </div>
                            </div>
                            {isSelected && <Check size={12} color={ACCENT} />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: windowWidth < 680 ? "1fr" : "1fr 1fr",
          gap: 24,
          maxWidth: 900,
        }}
      >
        {/* LEFT — Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* ── Universal section (zawsze aktywny) ── */}
          <div
            style={{
              padding: "22px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: ACCENT,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: f.system,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                }}
              >
                Czas manualny — podstawa
              </span>
            </div>
            <Field
              label="Nazwa firmy"
              value={nazwaKlienta}
              onChange={setNazwaKlienta}
              type="text"
              placeholder="np. Trans-Pol Sp. z o.o."
            />
            <Field
              label="Godziny manualne / tydzień"
              value={godzinyTygodniowo}
              onChange={setGodzinyTygodniowo}
              suffix="h/tydz."
              min={0}
            />
            <Field
              label="Liczba osób dotkniętych problemem"
              value={liczbaOsob}
              onChange={setLiczbaOsob}
              suffix="os."
              min={1}
            />
            <Field
              label="Stawka roboczogodziny"
              value={stawkaH}
              onChange={setStawkaH}
              suffix="PLN/h"
              min={0}
            />
          </div>

          {/* ── Optional sections ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontFamily: f.system,
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text-tertiary)",
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                paddingLeft: 4,
              }}
            >
              Dodatkowe koszty (opcjonalnie)
            </div>

            {/* Sekcja: Maile ze zleceniami */}
            <div
              style={{
                background: "var(--bg-elevated)",
                border: `1px solid ${showMaile ? "var(--accent-border)" : "var(--border)"}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setShowMaile((v) => !v)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "left" as const,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `1.5px solid ${showMaile ? ACCENT : "var(--border)"}`,
                    background: showMaile ? ACCENT : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                >
                  {showMaile && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>
                <span
                  style={{
                    fontFamily: f.system,
                    fontSize: 13,
                    fontWeight: 600,
                    color: showMaile ? ACCENT : "var(--text-secondary)",
                  }}
                >
                  Analiza maili ze zleceniami
                </span>
                {showMaile ? (
                  <ChevronUp
                    size={13}
                    color="var(--text-tertiary)"
                    style={{ marginLeft: "auto" }}
                  />
                ) : (
                  <ChevronDown
                    size={13}
                    color="var(--text-tertiary)"
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </button>
              {showMaile && (
                <div
                  style={{
                    padding: "0 16px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <Field
                    label="Maile ze zleceniami / dzień"
                    value={maile}
                    onChange={setMaile}
                    suffix="szt."
                    min={0}
                  />
                  <Field
                    label="Godz. wpisywania / os. / dzień"
                    value={godzinyWpisywania}
                    onChange={setGodzinyWpisywania}
                    suffix="h"
                    min={0}
                    max={8}
                  />
                  {Number(godzinyWpisywania) > 8 && (
                    <div style={{ color: "var(--error)", fontSize: 11, marginTop: 2 }}>
                      Maksymalnie 8 godzin dziennie na osobę. Wpisałeś {godzinyWpisywania}h — czy
                      chodziło o h/mc?
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sekcja: Faktury po terminie */}
            <div
              style={{
                background: "var(--bg-elevated)",
                border: `1px solid ${showFaktury ? "var(--accent-border)" : "var(--border)"}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setShowFaktury((v) => !v)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "left" as const,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `1.5px solid ${showFaktury ? ACCENT : "var(--border)"}`,
                    background: showFaktury ? ACCENT : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                >
                  {showFaktury && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>
                <span
                  style={{
                    fontFamily: f.system,
                    fontSize: 13,
                    fontWeight: 600,
                    color: showFaktury ? ACCENT : "var(--text-secondary)",
                  }}
                >
                  Faktury po terminie
                </span>
                {showFaktury ? (
                  <ChevronUp
                    size={13}
                    color="var(--text-tertiary)"
                    style={{ marginLeft: "auto" }}
                  />
                ) : (
                  <ChevronDown
                    size={13}
                    color="var(--text-tertiary)"
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </button>
              {showFaktury && (
                <div
                  style={{
                    padding: "0 16px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <Field
                    label="Faktury po terminie / miesiąc"
                    value={fakturyPo}
                    onChange={setFakturyPo}
                    suffix="szt."
                    min={0}
                  />
                  <Field
                    label="Średnia wartość faktury"
                    value={sredniaCena}
                    onChange={setSredniaCena}
                    suffix="PLN"
                    min={0}
                  />
                </div>
              )}
            </div>

            {/* Sekcja: Integracja systemów */}
            <div
              style={{
                background: "var(--bg-elevated)",
                border: `1px solid ${showIntegracja ? "var(--accent-border)" : "var(--border)"}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setShowIntegracja((v) => !v)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "left" as const,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `1.5px solid ${showIntegracja ? ACCENT : "var(--border)"}`,
                    background: showIntegracja ? ACCENT : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                >
                  {showIntegracja && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>
                <span
                  style={{
                    fontFamily: f.system,
                    fontSize: 13,
                    fontWeight: 600,
                    color: showIntegracja ? ACCENT : "var(--text-secondary)",
                  }}
                >
                  Integracja systemów
                </span>
                {showIntegracja ? (
                  <ChevronUp
                    size={13}
                    color="var(--text-tertiary)"
                    style={{ marginLeft: "auto" }}
                  />
                ) : (
                  <ChevronDown
                    size={13}
                    color="var(--text-tertiary)"
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </button>
              {showIntegracja && (
                <div style={{ padding: "0 16px 16px" }}>
                  <Field
                    label="Opis sytuacji / systemów"
                    value={integracjaOpis}
                    onChange={setIntegracjaOpis}
                    type="text"
                    placeholder="np. brak połączenia między TMS a fakturami..."
                  />
                </div>
              )}
            </div>

            {/* Sekcja: Inne */}
            <div
              style={{
                background: "var(--bg-elevated)",
                border: `1px solid ${showInne ? "var(--accent-border)" : "var(--border)"}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setShowInne((v) => !v)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "left" as const,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `1.5px solid ${showInne ? ACCENT : "var(--border)"}`,
                    background: showInne ? ACCENT : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                >
                  {showInne && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>
                <span
                  style={{
                    fontFamily: f.system,
                    fontSize: 13,
                    fontWeight: 600,
                    color: showInne ? ACCENT : "var(--text-secondary)",
                  }}
                >
                  Inne koszty
                </span>
                {showInne ? (
                  <ChevronUp
                    size={13}
                    color="var(--text-tertiary)"
                    style={{ marginLeft: "auto" }}
                  />
                ) : (
                  <ChevronDown
                    size={13}
                    color="var(--text-tertiary)"
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </button>
              {showInne && (
                <div
                  style={{
                    padding: "0 16px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <Field
                    label="Opis problemu"
                    value={inneOpis}
                    onChange={setInneOpis}
                    type="text"
                    placeholder="np. ręczne raportowanie..."
                  />
                  <Field
                    label="Godziny manualne / tydzień (opcjonalnie)"
                    value={inneGodziny}
                    onChange={setInneGodziny}
                    suffix="h/tydz."
                    min={0}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Hero numbers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <BigNumber
              label="Koszt miesięcznie"
              value={`${calc.kosztMc.toLocaleString("pl")} PLN`}
            />
            <BigNumber
              label="Koszt rocznie"
              value={`${calc.kosztRok.toLocaleString("pl")} PLN`}
              accent
            />
          </div>

          {/* Detail rows */}
          <div
            style={{
              padding: "18px 22px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <ResultRow label="ROI (koszt roczny / 15 000 PLN)" value={`${calc.roi}×`} />
            <div style={{ borderBottom: "none" }}>
              <ResultRow label="15 000 PLN to" value={`${calc.pctKosztu}% kosztu rocznego`} />
            </div>
          </div>

          {/* Breakdown sekcji opcjonalnych */}
          {(showMaile || showFaktury || showInne) && (
            <div
              style={{
                padding: "18px 22px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--accent-border)",
                borderRadius: 14,
                boxShadow: "0 1px 4px rgba(10,132,255,0.07)",
              }}
            >
              <div
                style={{
                  fontFamily: f.system,
                  fontSize: 10,
                  fontWeight: 700,
                  color: ACCENT,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  marginBottom: 12,
                }}
              >
                Rozkład kosztów
              </div>
              <ResultRow
                label="Czas manualny (podstawa)"
                value={`${calc.universalMc.toLocaleString("pl")} PLN/mc`}
              />
              {showMaile && (
                <ResultRow
                  label="Analiza maili ze zleceniami"
                  value={`${calc.maileMc.toLocaleString("pl")} PLN/mc`}
                />
              )}
              {showFaktury && (
                <ResultRow
                  label="Faktury po terminie"
                  value={`${calc.fakturyMc.toLocaleString("pl")} PLN/mc`}
                />
              )}
              {showInne && calc.inneMc > 0 && (
                <ResultRow
                  label="Inne koszty"
                  value={`${calc.inneMc.toLocaleString("pl")} PLN/mc`}
                />
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <button
              onClick={handleOpenSave}
              style={{
                padding: "14px 18px",
                background: ACCENT,
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                color: "#fff",
                fontFamily: f.system,
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 18px rgba(10,132,255,0.32)",
                transition: "opacity 0.12s",
              }}
            >
              <Save size={13} />
              Zapisz do Pipeline Notion
            </button>

            <button
              onClick={copyText}
              style={{
                padding: "13px 18px",
                background: copied ? "var(--success-bg)" : "var(--bg-elevated)",
                border: `1px solid ${copied ? "var(--success-border)" : "var(--border)"}`,
                borderRadius: 12,
                cursor: "pointer",
                color: copied ? "var(--success-text)" : "var(--text-secondary)",
                fontFamily: f.system,
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.15s",
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Skopiowano!" : "Kopiuj wyniki"}
            </button>

            <a
              href={prezentacjaUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "13px 18px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontFamily: f.system,
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                textDecoration: "none",
                transition: "border-color 0.15s",
              }}
            >
              Otwórz prezentację z tymi liczbami
            </a>
          </div>
        </div>
      </div>

      {showSaveModal && (
        <SaveModal
          clients={clients}
          saving={saving}
          error={saveError}
          onSave={handleSave}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {/* Close dropdown on click outside */}
      {clientDropdownOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => setClientDropdownOpen(false)}
        />
      )}
    </div>
  );
}
