"use client";

import {
  ArrowDownAZ,
  ArrowRight,
  ArrowUpAZ,
  CheckCircle2,
  Copy,
  ExternalLink,
  LayoutGrid,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type PipelineClientDetailed, SKRYPT_V4_DATA } from "@/app/api/notion/pipeline/route";
import { ClientCompanyLine, ClientContactDetails } from "@/components/clients/ClientContactDetails";
import { ContactAttemptsBadge } from "@/components/clients/ContactAttemptsBadge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

// ── Constants ────────────────────────────────────────────────────────

// Blok 1, punkt 1.4 — klucz localStorage dla kierunku sortowania kart w kolumnach Kanbanu.
const PIPELINE_SORT_KEY = "autorise_pipeline_sort_direction";

const ROW1 = ["Nowy lead", "Kwalifikacja", "Discovery umówione", "Finalizacja"];
const ROW2 = ["Kickoff", "Wdrożenie", "Retainer", "Niekwalifikowany"];
// Blok 1, punkt 1.2 (2026-07-14) — brakujący ROW3, znaleziony przy audycie statusów: te trzy
// wartości enuma Status istniały w schemacie Notion i w /mapa, ale nie miały żadnej kolumny w
// tym Kanbanie — karta z takim statusem była tu całkowicie niewidoczna (grouped/reduce niżej
// buduje kubełki WYŁĄCZNIE z PIPELINE_STATUSES). CLAUDE.md błędnie dokumentował istnienie
// "3 rzędów" mimo że w kodzie były tylko dwa — poprawione razem z dodaniem tego wiersza.
const ROW3 = ["Nieaktywny (follow up)", "Upsell", "Zakończona współpraca"];
const PIPELINE_STATUSES = [...ROW1, ...ROW2, ...ROW3];

const STATUS_COLORS: Record<string, string> = {
  "Nowy lead": "var(--accent)",
  Kwalifikacja: "#7c3aed",
  "Discovery umówione": "#0d9488",
  Finalizacja: "#d97706",
  Kickoff: "#16a34a",
  Wdrożenie: "#15803d",
  Retainer: "#166534",
  Niekwalifikowany: "var(--text-tertiary)",
  "Nieaktywny (follow up)": "var(--warning)",
  Upsell: "#0ea5e9",
  "Zakończona współpraca": "#64748b",
};

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

// ── Client card ──────────────────────────────────────────────────────

function ClientCard({
  client,
  onClick,
  onIncrement,
}: {
  client: PipelineClientDetailed;
  onClick: () => void;
  onIncrement: (client: PipelineClientDetailed) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "10px 12px",
        background: hovered ? "var(--bg-elevated)" : "var(--glass)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        transition: "background 120ms, box-shadow 120ms",
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.08)" : "var(--shadow-sm)",
        flexShrink: 0,
      }}
    >
      <div style={{ marginBottom: 5 }}>
        <ContactAttemptsBadge
          proby={client.liczbaProb ?? 0}
          onIncrement={() => onIncrement(client)}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {client.kontakt || client.firma}
        </div>
        {client.utracony && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--error)",
              background: "var(--error-bg)",
              border: "1px solid var(--error-border)",
              borderRadius: "var(--radius-xs)",
              padding: "1px 5px",
              flexShrink: 0,
            }}
          >
            Utracony
          </span>
        )}
      </div>
      <ClientCompanyLine client={client} style={{ marginBottom: 4 }} />
      <ClientContactDetails client={client} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
          paddingTop: 6,
          borderTop: "1px solid var(--border)",
        }}
      >
        {client.ocenaICP ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--accent)",
              background: "var(--accent-muted)",
              padding: "2px 6px",
              borderRadius: "var(--radius-xs)",
              fontFamily: "var(--font-sans)",
            }}
          >
            ICP {client.ocenaICP.split(" ")[0]}
          </span>
        ) : (
          <span />
        )}
        <span
          style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-tertiary)" }}
        >
          {fmtDate(client.lastModified)}
        </span>
      </div>
    </div>
  );
}

// ── Kanban column ────────────────────────────────────────────────────

function KanbanColumn({
  status,
  clients,
  onClientClick,
  onIncrement,
}: {
  status: string;
  clients: PipelineClientDetailed[];
  onClientClick: (c: PipelineClientDetailed) => void;
  onIncrement: (client: PipelineClientDetailed) => void;
}) {
  const color = STATUS_COLORS[status] ?? "var(--text-tertiary)";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: "6px 10px 8px",
          display: "flex",
          alignItems: "center",
          gap: 7,
          flexShrink: 0,
        }}
      >
        <div
          style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }}
        />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary)",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {status}
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            background: "rgba(0,0,0,0.04)",
            padding: "1px 6px",
            borderRadius: "var(--radius-xs)",
            border: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {clients.length}
        </span>
      </div>

      {/* Cards — internal scroll */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          overflowY: "auto",
          flex: 1,
          paddingRight: 2,
        }}
      >
        {clients.length === 0 ? (
          <div
            style={{
              padding: "18px 10px",
              textAlign: "center",
              fontSize: 11,
              color: "var(--text-placeholder)",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            —
          </div>
        ) : (
          clients.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              onClick={() => onClientClick(c)}
              onIncrement={onIncrement}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Side panel ───────────────────────────────────────────────────────

function ClientPanel({
  client,
  onClose,
  onUpdated,
}: {
  client: PipelineClientDetailed;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const color = STATUS_COLORS[client.status] ?? "var(--text-tertiary)";
  const [powodDraft, setPowodDraft] = useState(client.powodUtraty);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const isOldScript = Boolean(
    client.dataPierwszegoKontaktu && client.dataPierwszegoKontaktu < SKRYPT_V4_DATA,
  );

  const toggleUtracony = async (next: boolean) => {
    setSaving(true);
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: client.id,
          utracony: next,
          ...(next ? {} : { powodUtraty: null }),
        }),
      });
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const savePowod = async () => {
    if (powodDraft === client.powodUtraty) return;
    setSaving(true);
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: client.id, powodUtraty: powodDraft }),
      });
      onUpdated();
    } finally {
      setSaving(false);
    }
  };
  const rows = [
    { label: "Firma", value: client.firma },
    { label: "Kontakt", value: client.kontakt },
    { label: "Telefon", value: client.telefon },
    { label: "E-mail", value: client.email },
    { label: "NIP", value: client.nip },
    { label: "Status", value: client.status },
    { label: "Ocena ICP", value: client.ocenaICP },
    { label: "Data discovery", value: client.dataDiscovery ? fmtDate(client.dataDiscovery) : "" },
    { label: "Następny krok", value: client.nastepnyKrok },
    { label: "Ostatnia zmiana", value: client.lastModified ? fmtDate(client.lastModified) : "" },
  ].filter((r) => r.value);

  return (
    <div
      style={{
        width: 340,
        minWidth: 340,
        height: "100%",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-sidebar)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            {client.kontakt || client.firma}
          </div>
          {client.firma && client.kontakt && client.firma !== client.kontakt && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              {client.firma}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: "14px 16px", flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: "var(--radius-xs)",
              background: `${color}18`,
              border: `1px solid ${color}40`,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: "var(--font-sans)" }}>
              {client.status}
            </span>
          </div>
          {isOldScript && (
            <div
              title="Karta założona przed wdrożeniem skryptu V4 — dane mogą być niepełne wg dzisiejszych standardów"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: "var(--radius-xs)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Stary skrypt
              </span>
            </div>
          )}
          {client.utracony && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: "var(--radius-xs)",
                background: "var(--error-bg)",
                border: "1px solid var(--error-border)",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--error)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Utracony
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map(({ label, value }) => (
            <div key={label}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  marginBottom: 3,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Blok 1, punkt 1.5 — leady które wypadły z uwagi mają być jawnie oznaczone i
            filtrowalne, nie ginąć cicho. Wypełniane wyłącznie ręcznie tutaj. */}
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--border)",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: saving ? "default" : "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={client.utracony}
              disabled={saving}
              onChange={(e) => void toggleUtracony(e.target.checked)}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Utracony lead
            </span>
          </label>
          {client.utracony && (
            <textarea
              value={powodDraft}
              onChange={(e) => setPowodDraft(e.target.value)}
              onBlur={() => void savePowod()}
              placeholder="Powód (np. umówiona rozmowa nigdy niedopilnowana)..."
              disabled={saving}
              style={{
                width: "100%",
                marginTop: 8,
                minHeight: 60,
                padding: "8px 10px",
                borderRadius: "var(--radius-xs)",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-primary)",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          )}
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            href={`https://notion.so/${client.id.replace(/-/g, "")}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "6px 10px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <ArrowRight size={12} />
            Otwórz w Notion
          </a>
          <a
            href={`/prezentacja.html?id=${encodeURIComponent(client.id)}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: "var(--accent)",
              textDecoration: "none",
              padding: "6px 10px",
              border: "1px solid var(--accent-border)",
              background: "var(--accent-muted)",
              borderRadius: "var(--radius-xs)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <ExternalLink size={12} />
            Otwórz prezentację
          </a>
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/prezentacja.html?id=${encodeURIComponent(client.id)}`;
              void navigator.clipboard.writeText(url);
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 2000);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: linkCopied ? "var(--success-text)" : "var(--text-secondary)",
              background: "transparent",
              padding: "6px 10px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
          >
            {linkCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
            {linkCopied ? "Skopiowano" : "Kopiuj link do prezentacji"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Grid row ─────────────────────────────────────────────────────────

function KanbanRow({
  statuses,
  grouped,
  onClientClick,
  onIncrement,
}: {
  statuses: string[];
  grouped: Record<string, PipelineClientDetailed[]>;
  onClientClick: (c: PipelineClientDetailed) => void;
  onIncrement: (client: PipelineClientDetailed) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        flex: 1,
        minHeight: 0,
        height: "100%",
      }}
    >
      {statuses.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          clients={grouped[status] ?? []}
          onClientClick={onClientClick}
          onIncrement={onIncrement}
        />
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [clients, setClients] = useState<PipelineClientDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PipelineClientDetailed | null>(null);
  // Blok 1, punkt 1.4 (2026-07-14) — domyślnie A-Z po nazwie firmy, z opcją odwrócenia
  // kierunku. Zapamiętane w localStorage, żeby wybór przetrwał odświeżenie strony.
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(() => {
    if (typeof window === "undefined") return "asc";
    return (localStorage.getItem(PIPELINE_SORT_KEY) as "asc" | "desc") ?? "asc";
  });
  const toggleSortDirection = () => {
    setSortDirection((prev) => {
      const next = prev === "asc" ? "desc" : "asc";
      localStorage.setItem(PIPELINE_SORT_KEY, next);
      return next;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notion/pipeline");
      const data = (await res.json()) as {
        success: boolean;
        clients?: PipelineClientDetailed[];
        error?: string;
      };
      if (data.success && data.clients) {
        setClients(data.clients);
      } else {
        setError(data.error ?? "Błąd pobierania danych");
      }
    } catch {
      setError("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Blok 1, punkt 1.5 — po odświeżeniu z onUpdated (edycja Utracony/Powód w panelu) trzeba
  // podmienić referencję na świeżą wersję, inaczej panel dalej pokazuje stan sprzed zapisu.
  useEffect(() => {
    setSelected((prev) => (prev ? (clients.find((c) => c.id === prev.id) ?? prev) : prev));
  }, [clients]);

  // Blok "Arek" pkt 13 (2026-07-15) — inkrementacja licznika prób kontaktu wprost z karty
  // Kanbanu (bez otwierania panelu bocznego), optymistyczny update lokalnego stanu + zapis
  // do Notion tym samym PATCH co /kwalifikacja używa od dawna.
  const handleIncrementProby = useCallback((client: PipelineClientDetailed) => {
    const newCount = (client.liczbaProb ?? 0) + 1;
    setClients((prev) =>
      prev.map((c) => (c.id === client.id ? { ...c, liczbaProb: newCount } : c)),
    );
    fetch("/api/notion/pipeline-update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: client.id, liczbaProb: newCount }),
    }).catch(() => {
      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? { ...c, liczbaProb: client.liczbaProb } : c)),
      );
    });
  }, []);

  // Blok 1, punkt 1.5 — utracone leady domyślnie ukryte z Kanbanu (żeby nie zaśmiecały
  // aktywnego pipeline'u), ale zawsze możliwe do przywrócenia jednym przełącznikiem —
  // "filtrowalne, nie znikające cicho", zgodnie z założeniem.
  const [showUtracone, setShowUtracone] = useState(false);
  const visibleClients = showUtracone ? clients : clients.filter((c) => !c.utracony);
  const utraconeCount = clients.filter((c) => c.utracony).length;

  const grouped = PIPELINE_STATUSES.reduce<Record<string, PipelineClientDetailed[]>>((acc, s) => {
    const bucket = visibleClients.filter((c) => c.status === s);
    bucket.sort((a, b) => {
      const cmp = a.firma.localeCompare(b.firma, "pl", { sensitivity: "base" });
      return sortDirection === "asc" ? cmp : -cmp;
    });
    acc[s] = bucket;
    return acc;
  }, {});

  // Licz z visibleClients (respektuje filtr utraconych), nie z pełnej clients — inaczej
  // liczba w nagłówku przestrzeliwała sumę kart faktycznie widocznych w kolumnach Kanbanu.
  const totalActive = visibleClients.filter((c) => c.status !== "Niekwalifikowany").length;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      {/* Header */}
      <PageHeader icon={<LayoutGrid size={15} color="var(--accent)" />} title="Pipeline">
        {!loading && (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-tertiary)",
            }}
          >
            {totalActive} aktywnych
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          {utraconeCount > 0 && (
            <button
              onClick={() => setShowUtracone((v) => !v)}
              title={
                showUtracone
                  ? "Ukryj utracone leady"
                  : `Pokaż ${utraconeCount} utraconych leadów (dziś ukryte)`
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                background: showUtracone ? "var(--error-bg)" : "transparent",
                border: `1px solid ${showUtracone ? "var(--error-border)" : "var(--border)"}`,
                borderRadius: "var(--radius-xs)",
                cursor: "pointer",
                color: showUtracone ? "var(--error)" : "var(--text-secondary)",
                fontSize: 12,
                fontFamily: "var(--font-sans)",
              }}
            >
              {showUtracone ? "Ukryj utracone" : `Utracone (${utraconeCount})`}
            </button>
          )}
          <button
            onClick={toggleSortDirection}
            title={
              sortDirection === "asc"
                ? "Sortowanie A-Z po nazwie firmy — kliknij dla Z-A"
                : "Sortowanie Z-A po nazwie firmy — kliknij dla A-Z"
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
            }}
          >
            {sortDirection === "asc" ? <ArrowDownAZ size={12} /> : <ArrowUpAZ size={12} />}
            {sortDirection === "asc" ? "A-Z" : "Z-A"}
          </button>
          <button
            onClick={() => void load()}
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
              color: "var(--text-secondary)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
            }}
          >
            <RefreshCw
              size={12}
              style={loading ? { animation: "spin 1s linear infinite" } : undefined}
            />
            Odśwież
          </button>
        </div>
      </PageHeader>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {/* Kanban */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 10,
              }}
            >
              <Loader2
                size={20}
                color="var(--text-tertiary)"
                style={{ animation: "spin 1s linear infinite" }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Pobieranie pipeline...
              </span>
            </div>
          ) : error ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 13, color: "var(--error)", fontFamily: "var(--font-sans)" }}>
                {error}
              </span>
              <Button variant="secondary" size="sm" onClick={() => void load()}>
                Spróbuj ponownie
              </Button>
            </div>
          ) : (
            <>
              <KanbanRow
                statuses={ROW1}
                grouped={grouped}
                onClientClick={(c) => setSelected(c)}
                onIncrement={handleIncrementProby}
              />
              <div style={{ height: 1, background: "var(--border)", flexShrink: 0 }} />
              <KanbanRow
                statuses={ROW2}
                grouped={grouped}
                onClientClick={(c) => setSelected(c)}
                onIncrement={handleIncrementProby}
              />
              <div style={{ height: 1, background: "var(--border)", flexShrink: 0 }} />
              <KanbanRow
                statuses={ROW3}
                grouped={grouped}
                onClientClick={(c) => setSelected(c)}
                onIncrement={handleIncrementProby}
              />
            </>
          )}
        </div>

        {/* Side panel */}
        {selected && (
          <ClientPanel
            key={selected.id}
            client={selected}
            onClose={() => setSelected(null)}
            onUpdated={() => void load()}
          />
        )}
      </div>
    </div>
  );
}
