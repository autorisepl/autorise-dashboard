"use client";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Mail,
  Phone,
  RefreshCw,
  Search,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SheetContact, SheetsResponse } from "@/app/api/google/sheets/route";
import type { SheetsSyncResult } from "@/app/api/notion/sheets-sync/route";
import { KartaKlienta } from "@/components/karta/KartaKlienta";
import { Panel } from "@/components/ui/Panel";
import { formatPhone } from "@/lib/format/phone";

// ── Helpers ───────────────────────────────────────────────────────────

const PRIORITY_COLS = ["Nazwa", "Firma", "Email", "Telefon", "Status", "Notatki"];

function getDisplayHeaders(headers: string[]): string[] {
  const priority = PRIORITY_COLS.filter((h) => headers.includes(h));
  const rest = headers.filter((h) => !PRIORITY_COLS.includes(h));
  return [...priority, ...rest];
}

// ── Stage derivation (z kolumn boolean arkusza Kontakty) ───────────────

type StageTone = "success" | "purple" | "amber" | "accent" | "neutral";

const STAGE_TONES: Record<StageTone, { bg: string; color: string; border: string }> = {
  success: {
    bg: "var(--success-bg)",
    color: "var(--success-text)",
    border: "var(--success-border)",
  },
  purple: { bg: "rgba(124,58,237,0.10)", color: "#7c3aed", border: "rgba(124,58,237,0.22)" },
  amber: { bg: "var(--warning-bg)", color: "var(--warning)", border: "var(--warning-border)" },
  accent: { bg: "var(--accent-muted)", color: "var(--accent)", border: "var(--accent-border)" },
  neutral: { bg: "var(--bg-hover)", color: "var(--text-secondary)", border: "var(--border)" },
};

function isTruthy(v: unknown): boolean {
  const t = String(v ?? "")
    .trim()
    .toLowerCase();
  return t === "true" || t === "tak" || t === "✓" || t === "x" || t === "1";
}

function deriveStage(row: SheetContact, headers: string[]): { label: string; tone: StageTone } {
  const get = (re: RegExp) => {
    const h = headers.find((x) => re.test(x));
    return h ? isTruthy(row[h]) : false;
  };
  if (get(/pozyskany\s+klient/i) || get(/podpisana\s+umowa/i) || get(/op[lł]acona\s+faktura/i))
    return { label: "Klient", tone: "success" };
  if (get(/odbyte\s+spotkanie\s+decyzyjne/i) || get(/um[oó]wione\s+spotkanie\s+decyzyjne/i))
    return { label: "Decyzyjny", tone: "purple" };
  if (get(/odbyta\s+rozmowa\s+sprzeda/i) || get(/um[oó]wiona\s+rozmowa\s+sprzeda/i))
    return { label: "Sprzedażowa", tone: "amber" };
  if (get(/rozmowa\s+telefoniczna.*kwalifik/i) || get(/^rozmowa.*kwalifik/i))
    return { label: "Kwalifikacja", tone: "accent" };
  return { label: "Nowy", tone: "neutral" };
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function statusColor(value: string): { bg: string; color: string } {
  const v = value.toLowerCase();
  if (v.includes("aktyw") || v.includes("klient"))
    return { bg: "var(--success-bg)", color: "var(--success-text)" };
  if (v.includes("lead") || v.includes("prospect"))
    return { bg: "var(--accent-muted)", color: "var(--accent)" };
  if (v.includes("zamk") || v.includes("utrac") || v.includes("lost"))
    return { bg: "var(--error-bg)", color: "var(--error)" };
  if (v.includes("kwal") || v.includes("disco"))
    return { bg: "var(--warning-bg)", color: "var(--warning)" };
  return { bg: "var(--bg-hover)", color: "var(--text-secondary)" };
}

function isStatusCol(h: string) {
  return ["Status", "Etap", "Stage", "Faza"].includes(h);
}

function CellValue({ header, value }: { header: string; value: string }) {
  const v = String(value ?? "");
  if (!v || v === "—") return <span style={{ color: "var(--text-tertiary)" }}>—</span>;

  if (isStatusCol(header)) {
    const { bg, color } = statusColor(v);
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 20,
          background: bg,
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 500,
          color,
        }}
      >
        {v}
      </span>
    );
  }

  if (v.includes("@") && v.includes(".")) {
    return (
      <a
        href={`mailto:${v}`}
        style={{
          color: "var(--accent)",
          textDecoration: "none",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
        }}
      >
        {v}
      </a>
    );
  }

  if (/^\+?[\d\s\-().]{7,}$/.test(v)) {
    return (
      <a
        href={`tel:${v.replace(/\s/g, "")}`}
        style={{
          color: "var(--text-primary)",
          textDecoration: "none",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
        }}
      >
        {v}
      </a>
    );
  }

  return (
    <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-primary)" }}>
      {v}
    </span>
  );
}

// ── Contact field extraction ──────────────────────────────────────────

function contactFields(row: SheetContact, headers: string[]) {
  const find = (re: RegExp) => headers.find((h) => re.test(h));
  const nameH = find(/imi[eę]\s*i\s*nazwisko/i) ?? find(/^nazwa$/i);
  const firmaH = find(/^firma$/i);
  const phoneH = find(/^numer$/i) ?? find(/telefon/i);
  const emailH = find(/e-?mail/i);
  const name = String(
    (nameH ? row[nameH] : "") || row["Nazwa"] || row["Firma"] || `Rekord #${row._row}`,
  ).trim();
  const firma = firmaH ? String(row[firmaH] ?? "").trim() : "";
  const phone = phoneH ? String(row[phoneH] ?? "").trim() : "";
  const email = emailH ? String(row[emailH] ?? "").trim() : "";
  return { name, firma, phone, email };
}

// ── KPI card ───────────────────────────────────────────────────────────

function Kpi({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: StageTone;
  icon: React.ElementType;
}) {
  const t = STAGE_TONES[tone];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 16px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          flexShrink: 0,
          background: t.bg,
          border: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={17} color={t.color} strokeWidth={1.9} />
      </div>
      <div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 22,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 3,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

// ── Contact row ────────────────────────────────────────────────────────

function ContactRow({
  row,
  headers,
  selected,
  onClick,
}: {
  row: SheetContact;
  headers: string[];
  selected: boolean;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const { name, firma, phone, email } = contactFields(row, headers);
  const stage = deriveStage(row, headers);
  const tone = STAGE_TONES[stage.tone];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "11px 16px",
        cursor: "pointer",
        borderBottom: "1px solid var(--border)",
        background: selected ? "var(--bg-active)" : hov ? "var(--bg-hover)" : "transparent",
        borderLeft: `2px solid ${selected ? "var(--accent)" : "transparent"}`,
        transition: "background 100ms",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          flexShrink: 0,
          background: selected ? "var(--accent)" : "var(--accent-muted)",
          border: `1px solid ${selected ? "var(--accent)" : "var(--accent-border)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 700,
          color: selected ? "#fff" : "var(--accent)",
        }}
      >
        {initialsOf(name)}
      </div>

      {/* Name + company */}
      <div style={{ flex: "1 1 0", minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
          }}
        >
          {name}
        </div>
        {firma && firma !== name && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-tertiary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginTop: 1,
            }}
          >
            {firma}
          </div>
        )}
      </div>

      {/* Contact info */}
      <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        {phone && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "var(--font-sans)",
              fontSize: 11.5,
              color: "var(--text-secondary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Phone size={11} color="var(--text-tertiary)" /> {formatPhone(phone)}
          </span>
        )}
        {email && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "var(--font-sans)",
              fontSize: 11.5,
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <Mail size={11} color="var(--text-tertiary)" /> {email}
          </span>
        )}
      </div>

      {/* Stage badge */}
      <span
        style={{
          flexShrink: 0,
          padding: "4px 11px",
          borderRadius: 99,
          background: tone.bg,
          border: `1px solid ${tone.border}`,
          color: tone.color,
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.01em",
        }}
      >
        {stage.label}
      </span>
    </div>
  );
}

// ── Slide-in panel ────────────────────────────────────────────────────

function DetailPanel({
  row,
  headers,
  onClose,
}: {
  row: SheetContact;
  headers: string[];
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const name = String(row["Nazwa"] ?? row["Firma"] ?? `Rekord #${row._row}`);

  // Person name + contact for the interactive client card (matched by name in "Kontakty").
  const personKey =
    headers.find((h) => /imi[eę]\s*i\s*nazwisko/i.test(h)) ??
    headers.find((h) => /^nazwa$/i.test(h));
  const personName = personKey ? String(row[personKey] ?? "").trim() : "";
  const phoneKey = headers.find((h) => /^numer$/i.test(h) || /telefon/i.test(h));
  const emailKey = headers.find((h) => /e-?mail/i.test(h));
  const phone = phoneKey ? String(row[phoneKey] ?? "") : undefined;
  const email = emailKey ? String(row[emailKey] ?? "") : undefined;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "rgba(0,0,0,0.12)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 360,
          zIndex: 41,
          background: "var(--glass)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderLeft: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-menu)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {name}
            </div>
            {row["Firma"] && row["Nazwa"] && row["Firma"] !== name && (
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  marginTop: 2,
                }}
              >
                {String(row["Firma"])}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Interactive client card (Kontakty) */}
        {personName ? (
          <div style={{ padding: 16 }}>
            <KartaKlienta clientName={personName} phone={phone} email={email} />
          </div>
        ) : (
          /* Fallback: raw fields when no person name detected */
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            {headers.map((h) => {
              const val = String(row[h] ?? "");
              if (!val || val === "—") return null;
              return (
                <div key={h}>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginBottom: 3,
                    }}
                  >
                    {h}
                  </div>
                  <CellValue header={h} value={val} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function AgencjaPage() {
  const [data, setData] = useState<SheetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SheetContact | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SheetsSyncResult | null>(null);

  const SHEET_ID = "18BjXDFAWDVQnQkrE_1Kmvj0-ZJIGXQejLY6IJOOXnH0";

  const syncLeads = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/notion/sheets-sync", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSyncResult({ created: 0, skipped: 0, errors: [body.error ?? "Błąd synchronizacji"] });
        return;
      }
      const result: SheetsSyncResult = await res.json();
      setSyncResult(result);
    } catch {
      setSyncResult({ created: 0, skipped: 0, errors: ["Błąd połączenia"] });
    } finally {
      setSyncing(false);
    }
  }, []);

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
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
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

  // KPI: rozkład etapów wśród widocznych rekordów.
  const stageTones = filtered.map((r) => deriveStage(r, displayHeaders).tone);
  const kpiClients = stageTones.filter((t) => t === "success").length;
  const kpiInProcess = stageTones.filter((t) => t === "amber" || t === "purple").length;
  const kpiFresh = stageTones.filter((t) => t === "accent" || t === "neutral").length;

  return (
    <div
      style={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 20px",
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Users size={15} color="var(--accent)" />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            flex: 1,
          }}
        >
          Nasza karta
        </span>

        {data && (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-tertiary)",
            }}
          >
            {filtered.length} rekordów
          </span>
        )}

        {syncResult && (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: syncResult.errors.length > 0 ? "var(--error)" : "var(--text-tertiary)",
              flexShrink: 0,
            }}
          >
            {syncResult.errors.length > 0
              ? `${syncResult.created} dodano · ${syncResult.errors.length} błędów`
              : `Dodano ${syncResult.created} leadów`}
          </span>
        )}

        <button
          onClick={syncLeads}
          disabled={syncing || loading}
          title="Dodaj wszystkich kontaktów z arkusza do Notion Pipeline jako Nowy lead"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            cursor: syncing || loading ? "default" : "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-secondary)",
            opacity: syncing || loading ? 0.6 : 1,
          }}
        >
          <Upload size={11} style={{ animation: syncing ? "spin 0.8s linear infinite" : "none" }} />
          {syncing ? "Synchronizuję..." : "Synchronizuj leadów"}
        </button>

        <a
          href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}`}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            borderRadius: "var(--radius-xs)",
            textDecoration: "none",
            border: "1px solid var(--border)",
            background: "transparent",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          <ExternalLink size={11} />
          Arkusz
        </a>

        <button
          onClick={load}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            cursor: loading ? "default" : "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-secondary)",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw
            size={11}
            style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}
          />
          Odśwież
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", padding: 16 }}>
        {/* Error states */}
        {error === "not_connected" && (
          <Panel style={{ padding: 20, textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-secondary)",
                marginBottom: 12,
                lineHeight: 1.6,
              }}
            >
              Połącz konto Google, aby zobaczyć kontakty z arkusza.
            </div>
            <a
              href="/profil"
              style={{
                display: "inline-block",
                padding: "7px 16px",
                borderRadius: "var(--radius-sm)",
                background: "var(--accent)",
                color: "#fff",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Połącz Google
            </a>
          </Panel>
        )}

        {error === "scope_required" && (
          <Panel style={{ padding: 16, borderLeft: "3px solid var(--warning)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <AlertCircle
                size={15}
                color="var(--warning)"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  Wymagane uprawnienia do arkuszy
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 10,
                    lineHeight: 1.5,
                  }}
                >
                  Połączenie Google nie ma dostępu do Arkuszy. Rozłącz i połącz ponownie na stronie
                  Profil.
                </div>
                <a
                  href="/profil"
                  style={{
                    display: "inline-block",
                    padding: "5px 12px",
                    borderRadius: "var(--radius-xs)",
                    background: "var(--warning)",
                    color: "#fff",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Idź do Profilu
                </a>
              </div>
            </div>
          </Panel>
        )}

        {error === "failed" && (
          <Panel style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} color="var(--error)" />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                Błąd ładowania arkusza.
              </span>
              <button
                onClick={load}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "var(--font-sans)",
                  padding: 0,
                }}
              >
                Spróbuj ponownie
              </button>
            </div>
          </Panel>
        )}

        {loading && !error && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-tertiary)",
              textAlign: "center",
              paddingTop: 40,
            }}
          >
            Wczytywanie arkusza...
          </div>
        )}

        {!loading && data && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* KPI strip */}
            <div
              className="responsive-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <Kpi label="Łącznie kontaktów" value={filtered.length} tone="neutral" icon={Users} />
              <Kpi
                label="Pozyskani klienci"
                value={kpiClients}
                tone="success"
                icon={CheckCircle2}
              />
              <Kpi
                label="W procesie sprzedaży"
                value={kpiInProcess}
                tone="amber"
                icon={TrendingUp}
              />
              <Kpi label="Nowi / kwalifikacja" value={kpiFresh} tone="accent" icon={UserPlus} />
            </div>

            {/* Search */}
            <div style={{ position: "relative", maxWidth: 340, flexShrink: 0 }}>
              <Search
                size={13}
                color="var(--text-tertiary)"
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj po nazwie, firmie, telefonie, e-mailu…"
                style={{
                  width: "100%",
                  padding: "8px 10px 8px 32px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--glass)",
                  backdropFilter: "var(--glass-blur)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-primary)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Contact list */}
            <Panel
              style={{
                padding: 0,
                overflow: "hidden",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <div style={{ overflowY: "auto", flex: 1 }}>
                {filtered.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 16px",
                      textAlign: "center",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {search ? `Brak wyników dla „${search}"` : "Brak danych"}
                  </div>
                ) : (
                  filtered.map((row) => (
                    <ContactRow
                      key={row._row}
                      row={row}
                      headers={displayHeaders}
                      selected={selected?._row === row._row}
                      onClick={() => setSelected(row)}
                    />
                  ))
                )}
              </div>
            </Panel>

            {data.lastSync && (
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                Sync: {new Date(data.lastSync).toLocaleString("pl-PL")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slide-in detail panel */}
      {selected && (
        <DetailPanel row={selected} headers={displayHeaders} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
