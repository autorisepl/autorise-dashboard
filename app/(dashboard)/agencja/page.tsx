"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Mail,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
        gap: 10,
        padding: "10px 12px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          flexShrink: 0,
          background: t.bg,
          border: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={14} color={t.color} strokeWidth={1.9} />
      </div>
      <div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 18,
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
            fontSize: 10,
            color: "var(--text-tertiary)",
            marginTop: 2,
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
        gap: 11,
        padding: "10px 14px",
        cursor: "pointer",
        borderBottom: "1px solid var(--border)",
        background: selected ? "var(--bg-active)" : hov ? "var(--bg-hover)" : "transparent",
        borderLeft: `2px solid ${selected ? "var(--accent)" : tone.border}`,
        transition: "background 100ms",
      }}
    >
      {/* Initials circle */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          flexShrink: 0,
          background: selected ? "var(--accent)" : tone.bg,
          border: `1px solid ${selected ? "var(--accent)" : tone.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 700,
          color: selected ? "#fff" : tone.color,
        }}
      >
        {initialsOf(name)}
      </div>

      {/* Name + company + contact info */}
      <div style={{ flex: "1 1 0", minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
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
        <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
          {phone && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-tertiary)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Phone size={10} /> {formatPhone(phone)}
            </span>
          )}
          {email && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-tertiary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <Mail size={10} /> {email}
            </span>
          )}
        </div>
      </div>

      {/* Stage badge */}
      <span
        style={{
          flexShrink: 0,
          padding: "3px 9px",
          borderRadius: 99,
          background: tone.bg,
          border: `1px solid ${tone.border}`,
          color: tone.color,
          fontFamily: "var(--font-sans)",
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.01em",
        }}
      >
        {stage.label}
      </span>
    </div>
  );
}

// ── Right-panel header (when contact is selected) ─────────────────────

function DetailHeader({
  row,
  headers,
  sheetId,
}: {
  row: SheetContact;
  headers: string[];
  sheetId: string;
}) {
  const { name, firma, phone, email } = contactFields(row, headers);
  const stage = deriveStage(row, headers);
  const tone = STAGE_TONES[stage.tone];

  return (
    <div
      style={{
        padding: "16px 20px 14px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        background: "var(--glass)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Large initials */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            flexShrink: 0,
            background: tone.bg,
            border: `1px solid ${tone.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            fontWeight: 700,
            color: tone.color,
          }}
        >
          {initialsOf(name)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              {name}
            </span>
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 99,
                background: tone.bg,
                border: `1px solid ${tone.border}`,
                color: tone.color,
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {stage.label}
            </span>
          </div>

          {firma && firma !== name && (
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              {firma}
            </div>
          )}

          <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                <Phone size={12} color="var(--text-tertiary)" />
                {formatPhone(phone)}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                <Mail size={12} color="var(--text-tertiary)" />
                {email}
              </a>
            )}
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--accent)",
                textDecoration: "none",
              }}
            >
              <ExternalLink size={12} />
              Arkusz
            </a>
          </div>
        </div>
      </div>
    </div>
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
  const [resettingStages, setResettingStages] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resettingAll, setResettingAll] = useState(false);
  const [windowWidth, setWindowWidth] = useState(1200);

  const SHEET_ID = "18BjXDFAWDVQnQkrE_1Kmvj0-ZJIGXQejLY6IJOOXnH0";

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile = windowWidth < 640;

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
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "failed");
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

  const resetAllStages = useCallback(async () => {
    if (
      !window.confirm(
        "Wyczyścić kartę wszystkich kontaktów w arkuszu?\nNagrania pozostaną. Checkboxy etapów i notatki tekstowe zostaną zresetowane do stanu czysto ze Slacka.",
      )
    )
      return;
    setResettingStages(true);
    setResetError(null);
    try {
      const res = await fetch("/api/google/sheets/reset-stages", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setResetError(body.error ?? `Błąd resetowania (${res.status})`);
        return;
      }
      await load();
    } catch {
      setResetError("Błąd połączenia podczas resetowania");
    } finally {
      setResettingStages(false);
    }
  }, [load]);

  const resetAllEverything = useCallback(async () => {
    if (
      !window.confirm(
        'Wyczyścić WSZYSTKICH kontaktów naraz w arkuszu Kontakty ORAZ w całym Notion Pipeline (analizy agentów, notatki, status wraca do "Nowy lead")? Klienci ze statusem Kickoff/Wdrożenie/Retainer/Upsell/Zakończona współpraca zostaną pominięci. Tej operacji nie można cofnąć.',
      )
    )
      return;
    setResettingAll(true);
    setResetError(null);

    let notionSummary = "Notion: błąd";
    try {
      const res = await fetch("/api/notion/reset-all-leads", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        notionSummary = `Notion: wyczyszczono ${data.resetCount}/${data.total}, pominięto ${data.blockedCount} aktywnych/zakończonych klientów`;
        if (data.errors?.length > 0) {
          notionSummary += `, ${data.errors.length} błędów`;
        }
      } else {
        notionSummary = `Notion: ${data.error || `błąd (${res.status})`}`;
      }
    } catch (err) {
      notionSummary = `Notion: błąd połączenia (${err instanceof Error ? err.message : "nieznany"})`;
    }

    let sheetsSummary = "Arkusz: pominięty z powodu błędu Notion";
    try {
      const res = await fetch("/api/google/sheets/reset-stages", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      sheetsSummary =
        res.ok && body.success
          ? `Arkusz: wyczyszczono ${body.resetRows ?? 0} kontaktów`
          : `Arkusz: ${body.error ?? `błąd (${res.status})`}`;
    } catch {
      sheetsSummary = "Arkusz: błąd połączenia";
    }

    await load();
    setResettingAll(false);
    window.alert(`${notionSummary}\n${sheetsSummary}`);
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

  const stageTones = filtered.map((r) => deriveStage(r, displayHeaders).tone);
  const kpiClients = stageTones.filter((t) => t === "success").length;
  const kpiInProcess = stageTones.filter((t) => t === "amber" || t === "purple").length;
  const kpiFresh = stageTones.filter((t) => t === "accent" || t === "neutral").length;

  const selectedName = selected ? contactFields(selected, displayHeaders).name : null;

  return (
    <div
      style={{
        height: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 18px",
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Users size={14} color="var(--accent)" />
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
            style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-tertiary)" }}
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
              ? `${syncResult.created} dodano, ${syncResult.errors.length} błędów`
              : `Dodano ${syncResult.created} leadów`}
          </span>
        )}

        <button
          onClick={syncLeads}
          disabled={syncing || loading}
          title="Dodaj kontakty z arkusza do Notion Pipeline"
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

        <button
          onClick={() => void resetAllStages()}
          disabled={resettingStages || loading}
          title="Wyczyść checkboxy etapów i notatki tekstowe wszystkich kontaktów. Nagrania pozostaną."
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            cursor: resettingStages || loading ? "default" : "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--error)",
            opacity: resettingStages || loading ? 0.5 : 0.75,
          }}
        >
          <RotateCcw
            size={11}
            style={{ animation: resettingStages ? "spin 0.8s linear infinite" : "none" }}
          />
          {resettingStages ? "Resetuję..." : "Wyczyść kartę"}
        </button>

        <button
          onClick={() => void resetAllEverything()}
          disabled={resettingAll || loading}
          title="Wyczyść WSZYSTKICH kontaktów naraz w arkuszu Kontakty ORAZ w Notion Pipeline. Klienci Kickoff/Wdrożenie/Retainer/Upsell/Zakończona współpraca są pomijani."
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            background: "transparent",
            border: "1px solid var(--error-border)",
            borderRadius: "var(--radius-xs)",
            cursor: resettingAll || loading ? "default" : "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--error)",
            opacity: resettingAll || loading ? 0.5 : 0.85,
          }}
        >
          <RotateCcw
            size={11}
            style={{ animation: resettingAll ? "spin 0.8s linear infinite" : "none" }}
          />
          {resettingAll ? "Resetuję wszystko..." : "Wyczyść kartę i Pipeline (wszyscy)"}
        </button>

        {resetError && (
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--error)" }}>
            {resetError}
          </span>
        )}

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

      {/* ── Body ── */}
      {error || (loading && !error) ? (
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
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
                    Połączenie Google nie ma dostępu do Arkuszy. Rozłącz i połącz ponownie na
                    stronie Profil.
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

          {error && error !== "not_connected" && error !== "scope_required" && (
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
                  {error === "failed" ? "Błąd ładowania arkusza." : error}
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
        </div>
      ) : (
        /* ── Split-view layout ── */
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "row",
          }}
          className="responsive-split"
        >
          {/* ── LEFT: contact list ── */}
          <div
            style={{
              width: isMobile ? (selected ? "0" : "100%") : "clamp(240px, 28vw, 320px)",
              flexShrink: 0,
              display: isMobile && selected ? "none" : "flex",
              flexDirection: "column",
              borderRight: isMobile ? "none" : "1px solid var(--border)",
              height: "100%",
              overflow: "hidden",
            }}
          >
            {/* KPI 2×2 grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                padding: "12px 12px 8px",
                flexShrink: 0,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <Kpi label="Łącznie" value={filtered.length} tone="neutral" icon={Users} />
              <Kpi label="Klienci" value={kpiClients} tone="success" icon={CheckCircle2} />
              <Kpi label="W procesie" value={kpiInProcess} tone="amber" icon={TrendingUp} />
              <Kpi label="Nowi" value={kpiFresh} tone="accent" icon={UserPlus} />
            </div>

            {/* Search */}
            <div
              style={{
                padding: "8px 12px",
                flexShrink: 0,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ position: "relative" }}>
                <Search
                  size={12}
                  color="var(--text-tertiary)"
                  style={{
                    position: "absolute",
                    left: 9,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Szukaj kontaktu..."
                  style={{
                    width: "100%",
                    padding: "7px 9px 7px 28px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-elevated)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-primary)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Contact list — scrollable */}
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {filtered.length === 0 ? (
                <div
                  style={{
                    padding: "32px 16px",
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

            {/* Sync timestamp */}
            {data?.lastSync && (
              <div
                style={{
                  padding: "6px 12px",
                  flexShrink: 0,
                  borderTop: "1px solid var(--border)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                }}
              >
                Sync: {new Date(data.lastSync).toLocaleString("pl-PL")}
              </div>
            )}
          </div>

          {/* ── RIGHT: detail / karta klienta ── */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: isMobile && !selected ? "none" : "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "hidden",
              background: "var(--bg)",
            }}
          >
            {selected ? (
              <>
                {isMobile && (
                  <button
                    onClick={() => setSelected(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 14px",
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--accent)",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    <ChevronLeft size={16} strokeWidth={2} />
                    Wróć do listy
                  </button>
                )}
                <DetailHeader row={selected} headers={displayHeaders} sheetId={SHEET_ID} />
                <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "16px 20px" }}>
                  {(() => {
                    const { phone, email, firma } = contactFields(selected, displayHeaders);
                    return (
                      <KartaKlienta
                        clientName={selectedName ?? ""}
                        phone={phone}
                        email={email}
                        company={firma}
                      />
                    );
                  })()}
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: 32,
                }}
              >
                <Users size={36} color="var(--border)" strokeWidth={1.2} />
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                  }}
                >
                  Wybierz kontakt z listy
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    textAlign: "center",
                    maxWidth: 260,
                    lineHeight: 1.6,
                  }}
                >
                  Kliknij na kontakt po lewej, aby zobaczyć kartę klienta i historię rozmów.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
