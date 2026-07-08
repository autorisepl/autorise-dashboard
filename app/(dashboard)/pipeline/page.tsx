"use client";

import { ArrowRight, Loader2, Mail, Phone, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { Button } from "@/components/ui/Button";

// ── Constants ────────────────────────────────────────────────────────

const ROW1 = ["Nowy lead", "Kwalifikacja", "Discovery umówione", "Finalizacja"];
const ROW2 = ["Kickoff", "Wdrożenie", "Retainer", "Niekwalifikowany"];
const PIPELINE_STATUSES = [...ROW1, ...ROW2];

const STATUS_COLORS: Record<string, string> = {
  "Nowy lead": "var(--accent)",
  Kwalifikacja: "#7c3aed",
  "Discovery umówione": "#0d9488",
  Finalizacja: "#d97706",
  Kickoff: "#16a34a",
  Wdrożenie: "#15803d",
  Retainer: "#166534",
  Niekwalifikowany: "var(--text-tertiary)",
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

function ClientCard({ client, onClick }: { client: PipelineClientDetailed; onClick: () => void }) {
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
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 2,
          letterSpacing: "-0.01em",
        }}
      >
        {client.kontakt || client.firma}
      </div>
      {client.firma && client.kontakt && client.firma !== client.kontakt && (
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>
          {client.firma}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
        {client.telefon && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Phone size={10} color="var(--text-tertiary)" />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              {client.telefon}
            </span>
          </div>
        )}
        {client.email && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Mail size={10} color="var(--text-tertiary)" />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              {client.email}
            </span>
          </div>
        )}
      </div>
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
}: {
  status: string;
  clients: PipelineClientDetailed[];
  onClientClick: (c: PipelineClientDetailed) => void;
}) {
  const color = STATUS_COLORS[status] ?? "var(--text-tertiary)";
  return (
    <div
      style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, height: "100%" }}
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
          clients.map((c) => <ClientCard key={c.id} client={c} onClick={() => onClientClick(c)} />)
        )}
      </div>
    </div>
  );
}

// ── Side panel ───────────────────────────────────────────────────────

function ClientPanel({ client, onClose }: { client: PipelineClientDetailed; onClose: () => void }) {
  const color = STATUS_COLORS[client.status] ?? "var(--text-tertiary)";
  const rows = [
    { label: "Firma", value: client.firma },
    { label: "Kontakt", value: client.kontakt },
    { label: "Telefon", value: client.telefon },
    { label: "E-mail", value: client.email },
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
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: "var(--radius-xs)",
            background: `${color}18`,
            border: `1px solid ${color}40`,
            marginBottom: 16,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
          <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: "var(--font-sans)" }}>
            {client.status}
          </span>
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

        <div style={{ marginTop: 20 }}>
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
}: {
  statuses: string[];
  grouped: Record<string, PipelineClientDetailed[]>;
  onClientClick: (c: PipelineClientDetailed) => void;
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

  const grouped = PIPELINE_STATUSES.reduce<Record<string, PipelineClientDetailed[]>>((acc, s) => {
    acc[s] = clients.filter((c) => c.status === s);
    return acc;
  }, {});

  const totalActive = clients.filter((c) => c.status !== "Niekwalifikowany").length;

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
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Pipeline
          </span>
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
        </div>
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
              <KanbanRow statuses={ROW1} grouped={grouped} onClientClick={(c) => setSelected(c)} />
              <div style={{ height: 1, background: "var(--border)", flexShrink: 0 }} />
              <KanbanRow statuses={ROW2} grouped={grouped} onClientClick={(c) => setSelected(c)} />
            </>
          )}
        </div>

        {/* Side panel */}
        {selected && <ClientPanel client={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}
