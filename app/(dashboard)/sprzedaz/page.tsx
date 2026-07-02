"use client";

import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  GitBranch,
  Loader2,
  MessageSquare,
  Monitor,
  Phone,
  PhoneOff,
  RefreshCw,
  Target,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { KalkulatorRoi } from "@/components/kalkulator/KalkulatorRoi";
import { formatPhone } from "@/lib/format/phone";

// ── Types ─────────────────────────────────────────────────────────────

type Tab = "pipeline" | "roi" | "kwalifikacyjna" | "sprzedazowa" | "wiadomosci";
type QuickAction = "discovery" | "followup" | "niekwalifikowany" | "brak_odbioru" | null;

// ── Constants ─────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ["Nowy lead", "Kwalifikacja", "Discovery umówione", "Finalizacja"];
const ROW1 = ["Nowy lead", "Kwalifikacja", "Discovery umówione", "Finalizacja"];
const ROW2 = ["Kickoff", "Wdrożenie", "Retainer", "Niekwalifikowany"];
const ROW3 = ["Nieaktywny (follow up)", "Upsell"];
const ALL_STATUSES = [...ROW1, ...ROW2, ...ROW3];

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
  Upsell: "#8b5cf6",
};

// ── Helpers ───────────────────────────────────────────────────────────

function toVocative(name: string): string {
  const first = name.trim().split(" ")[0];
  if (!first) return name;
  if (first.endsWith("ał")) return first.slice(0, -2) + "ale";
  if (first.endsWith("eł")) return first.slice(0, -2) + "le";
  if (first.endsWith("ek") && first.length > 3) return first.slice(0, -2) + "ku";
  if (first.endsWith("a") && first.length > 2) return first.slice(0, -1) + "o";
  return first;
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function isOverdue(iso: string): boolean {
  if (!iso) return false;
  return iso < todayISO();
}

// ── Stats bar ─────────────────────────────────────────────────────────

function StatsBar({ clients }: { clients: PipelineClientDetailed[] }) {
  const active = clients.filter((c) => ACTIVE_STATUSES.includes(c.status)).length;
  const dzisDo = clients.filter((c) => {
    if (c.dataFollowup) return c.dataFollowup === todayISO();
    return c.status === "Nowy lead";
  }).length;
  const przeterminowane = clients.filter((c) => c.dataFollowup && isOverdue(c.dataFollowup)).length;

  const stat = (label: string, value: number, color: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 22,
          fontWeight: 700,
          color,
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)" }}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "10px 20px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        flexShrink: 0,
      }}
    >
      {stat("aktywnych", active, "var(--text-primary)")}
      <div style={{ width: 1, height: 20, background: "var(--border)" }} />
      {stat("dziś do zadzwonienia", dzisDo, "#0d9488")}
      <div style={{ width: 1, height: 20, background: "var(--border)" }} />
      {stat(
        "przeterminowanych",
        przeterminowane,
        przeterminowane > 0 ? "#ef4444" : "var(--text-tertiary)",
      )}
    </div>
  );
}

// ── Client card (pipeline) ────────────────────────────────────────────

function ClientCard({ client, onClick }: { client: PipelineClientDetailed; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const overdue = isOverdue(client.dataFollowup);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "10px 12px",
        background: hov ? "var(--bg-elevated)" : "var(--glass)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        border: `1px solid ${overdue ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        transition: "background 120ms",
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
      {client.telefon && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
          <Phone size={10} color="var(--text-tertiary)" />
          <span
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.01em",
            }}
          >
            {formatPhone(client.telefon)}
          </span>
        </div>
      )}
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
        {client.dataFollowup && (
          <span
            style={{
              fontSize: 10,
              color: overdue ? "#ef4444" : "var(--text-tertiary)",
              fontFamily: "var(--font-sans)",
              fontWeight: overdue ? 600 : 400,
            }}
          >
            {overdue ? "⚠ " : ""}
            {fmtDate(client.dataFollowup)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Kanban column ─────────────────────────────────────────────────────

function KanbanColumn({
  status,
  clients,
  onSelect,
}: {
  status: string;
  clients: PipelineClientDetailed[];
  onSelect: (c: PipelineClientDetailed) => void;
}) {
  const color = STATUS_COLORS[status] ?? "var(--text-tertiary)";
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
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
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
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
          }}
        >
          {clients.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", flex: 1 }}>
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
          clients.map((c) => <ClientCard key={c.id} client={c} onClick={() => onSelect(c)} />)
        )}
      </div>
    </div>
  );
}

// ── Quick Action modal ────────────────────────────────────────────────

function QuickActionModal({
  action,
  client,
  onClose,
  onDone,
}: {
  action: QuickAction;
  client: PipelineClientDetailed;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [followupDate, setFollowupDate] = useState(todayISO());
  const [followupTyp, setFollowupTyp] = useState("Ponowny kontakt");
  const [discoveryDate, setDiscoveryDate] = useState("");
  const [discoveryTime, setDiscoveryTime] = useState("10:00");
  const [powod, setPowod] = useState("");

  const submit = useCallback(async () => {
    setLoading(true);
    try {
      if (action === "discovery") {
        // Update status + create calendar event
        await fetch("/api/notion/pipeline-update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId: client.id,
            status: "Discovery umówione",
            nastepnyKrok: `Analiza diagnostyczna ${discoveryDate} ${discoveryTime}`,
            dataFollowup: discoveryDate || undefined,
          }),
        });
        if (discoveryDate && discoveryTime) {
          const dt = `${discoveryDate}T${discoveryTime}:00`;
          const dtEnd = `${discoveryDate}T${String(parseInt(discoveryTime.split(":")[0]) + 1).padStart(2, "0")}:00:00`;
          await fetch("/api/google/calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              summary: `Analiza diagnostyczna — ${client.kontakt || client.firma}`,
              startDateTime: dt,
              endDateTime: dtEnd,
              description: `Firma: ${client.firma}\nTelefon: ${client.telefon}`,
            }),
          });
        }
        onDone("Status: Analiza umówiona. Termin dodany do kalendarza.");
      } else if (action === "followup") {
        await fetch("/api/notion/pipeline-update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId: client.id,
            dataFollowup: followupDate,
            typFollowup: followupTyp,
          }),
        });
        onDone(`Follow-up zaplanowany na ${fmtDate(followupDate)}.`);
      } else if (action === "niekwalifikowany") {
        await fetch("/api/notion/pipeline-update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId: client.id,
            status: "Niekwalifikowany",
            powodNiekwalifikowania: powod || "Brak kwalifikacji",
          }),
        });
        onDone("Status: Niekwalifikowany.");
      } else if (action === "brak_odbioru") {
        await fetch("/api/notion/pipeline-update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId: client.id,
            liczbaProb: (client.liczbaProb || 0) + 1,
            nastepnyKrok: `Brak odbioru (próba ${(client.liczbaProb || 0) + 1}) — oddzwoń`,
          }),
        });
        onDone(`Próba ${(client.liczbaProb || 0) + 1} zalogowana.`);
      }
    } finally {
      setLoading(false);
    }
  }, [action, client, discoveryDate, discoveryTime, followupDate, followupTyp, powod]);

  const labels: Record<NonNullable<QuickAction>, string> = {
    discovery: "Umówiłem Analizę diagnostyczną",
    followup: "Zaplanuj Follow-up",
    niekwalifikowany: "Niekwalifikowany",
    brak_odbioru: "Brak odbioru",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 24,
          width: 380,
          maxWidth: "90vw",
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {action ? labels[action] : ""}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 16,
            fontFamily: "var(--font-sans)",
          }}
        >
          {client.kontakt || client.firma} · {client.firma}
        </div>

        {action === "discovery" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              Data Analizy diagnostycznej
              <input
                type="date"
                value={discoveryDate}
                onChange={(e) => setDiscoveryDate(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 4,
                  padding: "7px 10px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </label>
            <label
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              Godzina
              <input
                type="time"
                value={discoveryTime}
                onChange={(e) => setDiscoveryTime(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 4,
                  padding: "7px 10px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </label>
          </div>
        )}

        {action === "followup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              Data follow-up
              <input
                type="date"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 4,
                  padding: "7px 10px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </label>
            <label
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              Typ
              <select
                value={followupTyp}
                onChange={(e) => setFollowupTyp(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 4,
                  padding: "7px 10px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  outline: "none",
                }}
              >
                <option>Ponowny kontakt</option>
                <option>Drugi decydent</option>
                <option>Po przemyśleniu</option>
                <option>Po budżecie</option>
              </select>
            </label>
          </div>
        )}

        {action === "niekwalifikowany" && (
          <label
            style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)" }}
          >
            Powód rezygnacji
            <input
              type="text"
              value={powod}
              onChange={(e) => setPowod(e.target.value)}
              placeholder="np. Za mały, brak budżetu..."
              style={{
                display: "block",
                width: "100%",
                marginTop: 4,
                padding: "7px 10px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </label>
        )}

        {action === "brak_odbioru" && (
          <div
            style={{
              padding: "12px 14px",
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Zaloguje próbę #{(client.liczbaProb || 0) + 1} i ustawi "Oddzwoń" jako następny krok.
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            onClick={submit}
            disabled={loading}
            style={{
              flex: 1,
              padding: "9px 0",
              background: "var(--accent)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {loading ? (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Check size={14} />
            )}
            Zapisz
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "9px 16px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pipeline client panel ─────────────────────────────────────────────

function PipelineClientPanel({
  client,
  onClose,
  onOpenScript,
}: {
  client: PipelineClientDetailed;
  onClose: () => void;
  onOpenScript: () => void;
}) {
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
        width: 320,
        minWidth: 320,
        height: "100%",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-elevated)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
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
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            {client.kontakt || client.firma}
          </div>
          {client.firma && client.kontakt && client.firma !== client.kontakt && (
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>
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
          <X size={15} />
        </button>
      </div>

      <div style={{ padding: "12px 14px", flex: 1, overflowY: "auto" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 9px",
            borderRadius: "var(--radius-xs)",
            background: `${color}18`,
            border: `1px solid ${color}40`,
            marginBottom: 14,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
          <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: "var(--font-sans)" }}>
            {client.status}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map(({ label, value }) => (
            <div key={label}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  marginBottom: 2,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={onOpenScript}
            style={{
              width: "100%",
              padding: "8px 0",
              background: "var(--accent)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Phone size={12} />
            Otwórz skrypt rozmowy
          </button>
          <a
            href={`https://notion.so/${client.id.replace(/-/g, "")}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              fontSize: 11,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "6px 10px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Otwórz w Notion
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Kanban row (2×4 grid) ─────────────────────────────────────────────

function KanbanRow({
  statuses,
  grouped,
  onSelect,
}: {
  statuses: string[];
  grouped: Record<string, PipelineClientDetailed[]>;
  onSelect: (c: PipelineClientDetailed) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${statuses.length}, 1fr)`,
        flex: 1,
        minHeight: 0,
      }}
    >
      {statuses.map((status, idx) => (
        <div
          key={status}
          style={{
            borderRight: idx < statuses.length - 1 ? "1px solid var(--border)" : "none",
            padding: "8px 8px 12px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <KanbanColumn status={status} clients={grouped[status] ?? []} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}

// ── Tab 1: Pipeline ───────────────────────────────────────────────────

function PipelineTab({
  clients,
  loading,
  onRefresh,
  onSelectClient,
}: {
  clients: PipelineClientDetailed[];
  loading: boolean;
  onRefresh: () => void;
  onSelectClient: (c: PipelineClientDetailed, switchTab?: boolean) => void;
}) {
  const [panelClient, setPanelClient] = useState<PipelineClientDetailed | null>(null);

  const grouped = ALL_STATUSES.reduce<Record<string, PipelineClientDetailed[]>>((acc, s) => {
    acc[s] = clients.filter((c) => c.status === s);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Main kanban area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Stats + refresh */}
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <StatsBar clients={clients} />
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              padding: "0 16px",
              height: 44,
              background: "none",
              border: "none",
              borderLeft: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              cursor: loading ? "not-allowed" : "pointer",
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <RefreshCw
              size={13}
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
            />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              Odśwież
            </span>
          </button>
        </div>

        {/* Kanban 3 rows */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <KanbanRow statuses={ROW1} grouped={grouped} onSelect={setPanelClient} />
          <div style={{ height: 1, background: "var(--border)", flexShrink: 0 }} />
          <KanbanRow statuses={ROW2} grouped={grouped} onSelect={setPanelClient} />
          <div style={{ height: 1, background: "var(--border)", flexShrink: 0 }} />
          <KanbanRow statuses={ROW3} grouped={grouped} onSelect={setPanelClient} />
        </div>
      </div>

      {/* Side panel */}
      {panelClient && (
        <PipelineClientPanel
          client={panelClient}
          onClose={() => setPanelClient(null)}
          onOpenScript={() => {
            onSelectClient(panelClient, true);
            setPanelClient(null);
          }}
        />
      )}
    </div>
  );
}

// ── Tab 2: Live Script ────────────────────────────────────────────────

// ── Quick button ─────────────────────────────────────────────────────

function QuickBtn({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "6px 12px",
        borderRadius: "var(--radius-sm)",
        background: hov ? "var(--bg-card)" : "transparent",
        border: `1px solid ${hov ? color : "var(--border)"}`,
        cursor: "pointer",
        color: hov ? color : "var(--text-secondary)",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 500,
        transition: "all 120ms",
        flexShrink: 0,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Tab 3: Mapa Procesu ───────────────────────────────────────────────


function MapaProcesuTab({
  clients,
}: {
  clients: PipelineClientDetailed[];
  selectedClient: PipelineClientDetailed | null;
}) {
  const PROCESS_STEPS = [
    {
      id: "reklama",
      label: "Reklama",
      sub: "META Ads / formularz kontaktowy",
      color: "var(--accent)",
      agent: null,
      exits: [] as { label: string; color: string; reason: string }[],
    },
    {
      id: "kwalifikacja",
      label: "Kwalifikacja",
      sub: "Telefon + ICP + Agent 01",
      color: "#7c3aed",
      agent: "Agent 01",
      exits: [
        { label: "Brak odbioru", color: "#f59e0b", reason: "3 próby + SMS. Status: Nieaktywny (follow up)" },
        { label: "Niekwalifikowany", color: "var(--text-tertiary)", reason: "Za mały, inny rynek, brak decydenta, brak bólu" },
      ],
    },
    {
      id: "brief",
      label: "Brief",
      sub: "Pre-discovery brief",
      color: "#0d9488",
      agent: "Agent 02",
      exits: [] as { label: string; color: string; reason: string }[],
    },
    {
      id: "personalizacja",
      label: "Personalizacja",
      sub: "Deck + dane klienta",
      color: "#0d9488",
      agent: "Agent 03",
      exits: [] as { label: string; color: string; reason: string }[],
    },
    {
      id: "discovery",
      label: "Discovery",
      sub: "45-60 min: diagnoza + pitch + cena",
      color: "#d97706",
      agent: "Agent 04",
      exits: [
        { label: "Nieaktywny (follow up)", color: "var(--warning)", reason: "Urlop, budżet, wdraża TMS. Data re-engagement obowiązkowa." },
        { label: "Follow-up", color: "#f59e0b", reason: "Drugi decydent lub brak decyzji. Termin w pipeline." },
      ],
    },
    {
      id: "umowa",
      label: "Umowa",
      sub: "Podpisanie kontraktu",
      color: "#16a34a",
      agent: null,
      exits: [] as { label: string; color: string; reason: string }[],
    },
    {
      id: "wdrozenie",
      label: "Wdrożenie",
      sub: "Kickoff + onboarding (4-8 tygodni)",
      color: "#15803d",
      agent: null,
      exits: [] as { label: string; color: string; reason: string }[],
    },
    {
      id: "retainer",
      label: "Retainer",
      sub: "Miesięczna opieka stała",
      color: "#166534",
      agent: null,
      exits: [
        { label: "Reengagement", color: "#8b5cf6", reason: "Po zakończeniu projektu. Nowa kampania lub rozszerzenie." },
      ],
    },
    {
      id: "upsell",
      label: "Upsell",
      sub: "Rozszerzenie współpracy",
      color: "#8b5cf6",
      agent: null,
      exits: [] as { label: string; color: string; reason: string }[],
    },
  ];

  const statusCountMap: Record<string, number> = {};
  for (const c of clients) {
    statusCountMap[c.status] = (statusCountMap[c.status] ?? 0) + 1;
  }

  const stepStatusMap: Record<string, string[]> = {
    reklama: ["Nowy lead"],
    kwalifikacja: ["Kwalifikacja"],
    brief: ["Kwalifikacja"],
    personalizacja: ["Discovery umówione"],
    discovery: ["Discovery umówione", "Finalizacja"],
    umowa: ["Finalizacja"],
    wdrozenie: ["Kickoff", "Wdrożenie"],
    retainer: ["Retainer"],
    upsell: ["Upsell"],
  };

  function countForStep(id: string) {
    return (stepStatusMap[id] ?? []).reduce((acc, s) => acc + (statusCountMap[s] ?? 0), 0);
  }

  return (
    <div style={{ padding: "24px 28px", overflow: "auto", height: "100%" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 20,
          }}
        >
          Mapa procesu sprzedażowego
        </div>

        {/* Main pipeline row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", paddingBottom: 8 }}>
          {PROCESS_STEPS.map((step, idx) => {
            const count = countForStep(step.id);
            return (
              <div key={step.id} style={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }}>
                <div
                  style={{
                    width: 110,
                    background: "rgba(255,255,255,0.78)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ height: 3, background: step.color, flexShrink: 0 }} />
                  <div style={{ padding: "10px 10px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          lineHeight: 1.2,
                        }}
                      >
                        {step.label}
                      </div>
                      {count > 0 && (
                        <div
                          style={{
                            minWidth: 18,
                            height: 18,
                            borderRadius: 9,
                            background: step.color,
                            color: "#fff",
                            fontSize: 9,
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            paddingInline: 4,
                          }}
                        >
                          {count}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 9.5,
                        color: "var(--text-tertiary)",
                        lineHeight: 1.4,
                        marginBottom: step.agent ? 6 : 0,
                      }}
                    >
                      {step.sub}
                    </div>
                    {step.agent && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: `${step.color}18`,
                          border: `1px solid ${step.color}30`,
                          fontSize: 9,
                          fontWeight: 700,
                          color: step.color,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {step.agent}
                      </div>
                    )}
                  </div>

                  {/* Exit paths */}
                  {step.exits.length > 0 && (
                    <div style={{ padding: "0 6px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
                      {step.exits.map((exit, ei) => (
                        <div
                          key={ei}
                          style={{
                            padding: "4px 6px",
                            background: `rgba(0,0,0,0.03)`,
                            border: `1px solid ${exit.color}30`,
                            borderLeft: `2px solid ${exit.color}`,
                            borderRadius: "var(--radius-xs)",
                          }}
                        >
                          <div style={{ fontSize: 9, fontWeight: 700, color: exit.color, marginBottom: 1 }}>
                            {exit.label}
                          </div>
                          <div style={{ fontSize: 8.5, color: "var(--text-tertiary)", lineHeight: 1.4 }}>
                            {exit.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {idx < PROCESS_STEPS.length - 1 && (
                  <div style={{ display: "flex", alignItems: "center", padding: "0 4px", marginTop: 22, flexShrink: 0 }}>
                    <ArrowRight size={14} color="var(--text-tertiary)" strokeWidth={1.5} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
          {[
            { color: "var(--accent)", label: "Pozyskanie" },
            { color: "#7c3aed", label: "Kwalifikacja" },
            { color: "#0d9488", label: "Przygotowanie" },
            { color: "#d97706", label: "Discovery" },
            { color: "#16a34a", label: "Sprzedaż" },
            { color: "#166534", label: "Retainer" },
            { color: "#8b5cf6", label: "Upsell" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-tertiary)" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────

function TabBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 20px",
        height: "100%",
        background: "none",
        border: "none",
        cursor: "pointer",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        transition: "color 120ms, border-color 120ms",
        flexShrink: 0,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function SprzedazPage() {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "pipeline";
    return (localStorage.getItem("sprzedaz_active_tab") as Tab) ?? "pipeline";
  });
  const changeTab = (t: Tab) => {
    localStorage.setItem("sprzedaz_active_tab", t);
    setTab(t);
  };
  const [clients, setClients] = useState<PipelineClientDetailed[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedClient, setSelectedClient] = useState<PipelineClientDetailed | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notion/pipeline");
      const data = await res.json();
      if (data.success) {
        setClients(data.clients);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + 60s polling
  useEffect(() => {
    void fetchClients();
    const id = setInterval(() => void fetchClients(), 60_000);
    return () => clearInterval(id);
  }, [fetchClients]);

  const DISCOVERY_STATUSES = [
    "Discovery umówione",
    "Finalizacja",
    "Kickoff",
    "Wdrożenie",
    "Retainer",
    "Upsell",
  ];
  const handleSelectClient = useCallback((c: PipelineClientDetailed, switchTab?: boolean) => {
    setSelectedClient(c);
    if (switchTab) {
      changeTab(DISCOVERY_STATUSES.includes(c.status) ? "sprzedazowa" : "kwalifikacyjna");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          height: 52,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        {/* Page label */}
        <div
          style={{
            padding: "0 20px",
            height: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderRight: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <Target size={15} color="var(--accent)" />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Proces sprzedażowy
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", height: "100%", flex: 1 }}>
          <TabBtn
            icon={<GitBranch size={13} />}
            label="Pipeline"
            active={tab === "pipeline"}
            onClick={() => changeTab("pipeline")}
          />
          <TabBtn
            icon={<Phone size={13} />}
            label="Skrypt kwalifikacyjny"
            active={tab === "kwalifikacyjna"}
            onClick={() => changeTab("kwalifikacyjna")}
          />
          <TabBtn
            icon={<Monitor size={13} />}
            label="Skrypt sprzedażowy"
            active={tab === "sprzedazowa"}
            onClick={() => changeTab("sprzedazowa")}
          />
          <TabBtn
            icon={<Calculator size={13} />}
            label="Kalkulator ROI"
            active={tab === "roi"}
            onClick={() => changeTab("roi")}
          />
          <TabBtn
            icon={<MessageSquare size={13} />}
            label="Wiadomości"
            active={tab === "wiadomosci"}
            onClick={() => changeTab("wiadomosci")}
          />
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <div
            style={{
              padding: "0 16px",
              fontSize: 10,
              color: "var(--text-placeholder)",
              fontFamily: "var(--font-sans)",
              flexShrink: 0,
            }}
          >
            {lastUpdated.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab === "pipeline" && (
          <PipelineTab
            clients={clients}
            loading={loading}
            onRefresh={fetchClients}
            onSelectClient={handleSelectClient}
          />
        )}
        {tab === "roi" && (
          <KalkulatorRoi
            embedded
            initialClientName={selectedClient?.kontakt || selectedClient?.firma || ""}
          />
        )}
        {tab === "kwalifikacyjna" && (
          <ScriptTab
            type="kwalifikacyjna"
            selectedClient={selectedClient}
            clients={clients}
            onSelectClient={setSelectedClient}
          />
        )}
        {tab === "sprzedazowa" && (
          <ScriptTab
            type="sprzedazowa"
            selectedClient={selectedClient}
            clients={clients}
            onSelectClient={setSelectedClient}
          />
        )}
        {tab === "wiadomosci" && (
          <MessagesTab
            selectedClient={selectedClient}
            clients={clients}
            onSelectClient={setSelectedClient}
          />
        )}
      </div>
    </div>
  );
}

// ── Tab 2: Live Script wrapper ────────────────────────────────────────

function LiveScriptTabWrapper({
  clients,
  preSelected,
  onSelectClient,
}: {
  clients: PipelineClientDetailed[];
  preSelected: PipelineClientDetailed | null;
  onSelectClient: (c: PipelineClientDetailed | null) => void;
}) {
  const [manualType, setManualType] = useState<"kwalifikacyjna" | "sprzedazowa" | null>(null);
  const [activeAction, setActiveAction] = useState<QuickAction>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Reset manual type override when client changes.
  useEffect(() => {
    setManualType(null);
  }, [preSelected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const DISCOVERY_STATUSES = [
    "Discovery umówione",
    "Finalizacja",
    "Kickoff",
    "Wdrożenie",
    "Retainer",
    "Upsell",
  ];
  const autoType: "kwalifikacyjna" | "sprzedazowa" =
    preSelected && DISCOVERY_STATUSES.includes(preSelected.status)
      ? "sprzedazowa"
      : "kwalifikacyjna";
  const scriptType = manualType ?? autoType;

  const SCRIPT_LABELS: Record<"kwalifikacyjna" | "sprzedazowa", string> = {
    kwalifikacyjna: "Skrypt kwalifikacyjny",
    sprzedazowa: "Skrypt sprzedażowy",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Script type switcher */}
      {preSelected && (
        <div
          style={{
            padding: "7px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              marginRight: 4,
            }}
          >
            Tryb skryptu:
          </span>
          {(["kwalifikacyjna", "sprzedazowa"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setManualType(t === autoType && !manualType ? null : t)}
              style={{
                padding: "3px 10px",
                borderRadius: "var(--radius-xs)",
                border: `1px solid ${scriptType === t ? "var(--accent)" : "var(--border)"}`,
                background: scriptType === t ? "var(--accent-muted)" : "transparent",
                color: scriptType === t ? "var(--accent)" : "var(--text-tertiary)",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: scriptType === t ? 600 : 400,
                cursor: "pointer",
                transition: "all 120ms",
              }}
            >
              {SCRIPT_LABELS[t]}
            </button>
          ))}
          {manualType && (
            <button
              onClick={() => setManualType(null)}
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                textDecoration: "underline",
                marginLeft: 4,
              }}
            >
              Resetuj (auto)
            </button>
          )}
        </div>
      )}

      {/* Script content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {!preSelected ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 12,
              color: "var(--text-placeholder)",
            }}
          >
            <Target size={36} strokeWidth={1} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 14 }}>
              Wybierz klienta w Pipeline, żeby załadować skrypt
            </span>
          </div>
        ) : (
          <ScriptTab
            type={scriptType}
            selectedClient={preSelected}
            clients={clients}
            onSelectClient={onSelectClient}
          />
        )}
      </div>

      {/* Quick Actions */}
      {preSelected && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            padding: "10px 16px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginRight: 4,
              flexShrink: 0,
            }}
          >
            Akcje
          </span>
          <QuickBtn
            icon={<Calendar size={12} />}
            label="Umówiłem Analizę diagnostyczną"
            color="#0d9488"
            onClick={() => setActiveAction("discovery")}
          />
          <QuickBtn
            icon={<ArrowRight size={12} />}
            label="Follow-up"
            color="#7c3aed"
            onClick={() => setActiveAction("followup")}
          />
          <QuickBtn
            icon={<X size={12} />}
            label="Niekwalifikowany"
            color="#ef4444"
            onClick={() => setActiveAction("niekwalifikowany")}
          />
          <QuickBtn
            icon={<PhoneOff size={12} />}
            label="Brak odbioru"
            color="var(--text-secondary)"
            onClick={() => setActiveAction("brak_odbioru")}
          />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "absolute",
            bottom: preSelected ? 64 : 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a1a2e",
            border: "1px solid var(--border)",
            padding: "10px 18px",
            borderRadius: "var(--radius)",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          }}
        >
          <CheckCircle2 size={14} color="#34c759" />
          <span
            style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-primary)" }}
          >
            {toast}
          </span>
        </div>
      )}

      {activeAction && preSelected && (
        <QuickActionModal
          action={activeAction}
          client={preSelected}
          onClose={() => setActiveAction(null)}
          onDone={(msg) => {
            setActiveAction(null);
            showToast(msg);
          }}
        />
      )}
    </div>
  );
}

// ── ScriptTab ─────────────────────────────────────────────────────────

interface ScriptLine {
  t: "say" | "client" | "note" | "action" | "branch" | "branch-bad";
  text: string;
}
interface Step {
  id: string;
  nr: string;
  label: string;
  tag: string;
  duration?: string;
  lines: ScriptLine[];
}
interface Objection {
  id: string;
  label: string;
  script?: string;
  sms?: string;
  extra?: string;
  type?: "sms" | "fb";
  note?: string;
  followup?: string;
}
interface IcpRule {
  ok: boolean;
  label: string;
  val: string;
}

const STEPS_K: Step[] = [
  {
    id: "prep",
    nr: "0",
    label: "PRZYGOTOWANIE",
    tag: "AKCJA",
    lines: [
      { t: "action", text: "Włącz Fathom zanim zaczniesz dzwonić." },
      { t: "action", text: "Wejdź na stronę firmy — 30 sekund. Flota? TMS widoczny? Decydent?" },
      { t: "action", text: "Sprawdź formularz: co napisał, skąd pochodzi, jaką firmę prowadzi." },
      { t: "action", text: "Masz pod ręką: imię (nominatyw), nazwę firmy, numer telefonu." },
    ],
  },
  {
    id: "opener",
    nr: "1",
    label: "OTWARCIE",
    tag: "MÓWISZ",
    lines: [
      { t: "say", text: "Dzień dobry, Pan {IMIĘ}?" },
      { t: "client", text: "Tak, słucham." },
      { t: "say", text: "Dzień dobry, mówi [imię] z Autorise. Dzwonię bo przed chwilą wypełnił Pan formularz na naszej stronie dotyczący oszczędzania czasu w firmie transportowej. Mam dla Pana dosłownie 2 minuty — czy to dobry moment?" },
    ],
  },
  {
    id: "opener_branch",
    nr: "1b",
    label: "REAKCJA NA OTWARCIE",
    tag: "GAŁĘZIE",
    lines: [
      { t: "branch", text: "Nie pamiętam żadnego formularza" },
      { t: "say", text: "Rozumiem. Pewnie wypełnił Pan wiele rzeczy. Formularz pojawił się na Facebooku — dotyczył oszczędzania czasu w logistyce. To może 30 sekund?" },
      { t: "branch", text: "O co chodzi? Co Pan sprzedaje?" },
      { t: "say", text: "Automatyzujemy pracę biura spedycji — zlecenia, CMR, faktury. Jedna firma u nas odzyskała 80 godzin miesięcznie. Chciałem się dowiedzieć czy to temat dla Pana firmy." },
      { t: "branch", text: "Od razu chce spotkanie" },
      { t: "say", text: "Chętnie. Zanim zaproponuję termin — 2 pytania żeby spotkanie miało sens dla obu stron. Jak wygląda teraz zleceniowanie w Pana firmie?" },
      { t: "branch", text: "Od razu pyta o cenę" },
      { t: "say", text: "Zależy od skali i modułów. Powiem Panu wprost — najpierw chcę sprawdzić czy mamy rozwiązanie dla Pana firmy. Jeśli tak — cena jest na stronie i na spotkaniu. Ile pojazdów ma Pan teraz?" },
      { t: "branch", text: "Wyślij na maila" },
      { t: "say", text: "Oczywiście. Żeby wysłać coś trafnego, jedna kwestia: ile osób zajmuje się zleceniami w biurze?" },
      { t: "note", text: "Jeśli nadal blokuje: 'Rozumiem. Wyślę. Na jaki adres?' — zapisz mail i zaplanuj follow-up." },
    ],
  },
  {
    id: "diagnoza",
    nr: "2",
    label: "DIAGNOZA",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Co spowodowało że właśnie teraz wypełnił Pan ten formularz?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "say", text: "Jak wygląda teraz proces: od momentu gdy dostajecie zlecenie do wystawienia faktury — ile kroków, ile osób, ile czasu?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "say", text: "Ile godzin dziennie spędza biuro na ręcznym przepisywaniu?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "note", text: "Jeśli mówi 'nie wiem' — doprecyzuj: 'CMR, POD, faktury, wpisywanie do Excela — łącznie?'" },
      { t: "say", text: "Co byś zrobił z tymi godzinami gdybyś je odzyskał?" },
    ],
  },
  {
    id: "brak_bolu",
    nr: "2x",
    label: "BRAK BÓLU — wyjście",
    tag: "UWAGA",
    lines: [
      { t: "note", text: "Używaj po 2 nieudanych próbach ukazania bólu. Nie sprzedawaj na siłę." },
      { t: "say", text: "Słyszę że u Pana to działa sprawnie. Nie chcę zajmować Pana czasu. Czy jest jakiś aspekt logistyki gdzie czujecie że traci się czas lub robi się za dużo ręcznie?" },
      { t: "client", text: "Nie, wszystko gra." },
      { t: "say", text: "Rozumiem. W takim razie prawdopodobnie nie jesteśmy teraz dla siebie. Mogę zadzwonić za kilka miesięcy gdy się coś zmieni — czy to ma sens?" },
      { t: "note", text: "Jeśli zgadza się: status Nieaktywny (follow up), data re-engagement za 3 mc." },
    ],
  },
  {
    id: "icp",
    nr: "3",
    label: "WERYFIKACJA ICP",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Ile pojazdów ma teraz Pan flota?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "say", text: "Czy korzystacie z TMS — programu do zarządzania flotą?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "note", text: "TMS: nie wyklucza. Dopytaj jaki i co robi manualnie mimo TMS." },
      { t: "say", text: "Jest Pan właścicielem firmy czy decyduje Pan o zakupach oprogramowania?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "note", text: "Jeśli nie jest decydentem: 'Czy byłoby możliwe żebyśmy porozmawiali razem? Mam 45 minut spotkanie online — mogę dołączyć też właściciela.'" },
    ],
  },
  {
    id: "roi",
    nr: "4",
    label: "ROI — ZAPROSZENIE",
    tag: "MÓWISZ",
    lines: [
      { t: "say", text: "Firmy transportowe podobne do Pana odzyskują średnio 80 godzin miesięcznie. Przy 2 osobach w biurze to około 2 etatów w skali roku." },
      { t: "say", text: "Na 45-minutowym spotkaniu online pokażę Panu dokładnie jak to wygląda dla Pana firmy z prawdziwymi liczbami." },
    ],
  },
  {
    id: "precommit",
    nr: "5",
    label: "PRE-COMMITMENT",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Zanim umówimy termin — jedno pytanie. Jeśli to co Pan zobaczy na spotkaniu ma sens dla Pana firmy, czy jest Pan gotowy podjąć decyzję w ciągu tygodnia od spotkania?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "note", text: "Jeśli 'nie' lub 'muszę z kimś' — dowiedz się z kim i zaproś tę osobę. Nie umawiaj bez decydenta." },
    ],
  },
  {
    id: "spotkanie",
    nr: "6",
    label: "UMAWIANIE SPOTKANIA",
    tag: "ZAMKNIĘCIE",
    lines: [
      { t: "say", text: "Kiedy ma Pan wolne 45 minut w tym lub przyszłym tygodniu — rano czy po południu?" },
      { t: "client", text: "[proponuje termin]" },
      { t: "say", text: "Świetnie. Zarezerwuję [dzień] o [godzina]. Wyślę zaproszenie Google Meet na tego maila co podał Pan w formularzu — zgadza się?" },
      { t: "action", text: "Wyślij zaproszenie Google Meet natychmiast po rozmowie. Nie 'zaraz' — teraz." },
      { t: "say", text: "Dzień przed wyślę SMS z przypomnieniem." },
      { t: "action", text: "Zmień status w Pipeline na 'Discovery umówione'. Data Discovery: [data spotkania]." },
    ],
  },
];

const OBJECTIONS_K: Objection[] = [
  {
    id: "ok1",
    label: "Nie mam teraz czasu (pierwsze NIE)",
    script:
      "Rozumiem. Firmy transportowe z którymi pracuję odzyskują od 80 godzin miesięcznie na samym zleceniowaniu. Jeśli to brzmi jak coś dla Pana — 2 minuty teraz mogą zaoszczędzić Panu kilka tysięcy złotych miesięcznie. Ma Pan te 2 minuty?",
  },
  {
    id: "ok2",
    label: "Nadal nie mam czasu (drugie NIE)",
    script: "Jasne. Jutro rano czy po południu jest Pan bardziej dostępny?",
    note: "Zapisz dzień i godzinę. Follow-up w Pipeline.",
  },
  {
    id: "ok3",
    label: "Mam już program do zarządzania",
    script:
      "Większość firm z którymi pracuję ma program. My nie zastępujemy TMS — uzupełniamy go o automatyzację biurową: CMR, POD, faktury, komunikacja z klientem. Czy Pana TMS robi to automatycznie?",
    note: "Jeśli tak: wróć do diagnozy i pytaj co robi ręcznie mimo TMS. Jeśli nie: 'To dobrze, w takim razie może nie będę marnował Pana czasu' — i zakończ uprzejmie.",
  },
  {
    id: "ok4",
    label: "Jadę na urlop / wracam za X tygodni",
    script: "Rozumiem. Kiedy Pan wraca?",
    followup: "Zapisuję. Zadzwonię do Pana [data po powrocie]. Życzę udanego urlopu.",
    note: "Status: Nieaktywny (follow up). Data re-engagement: dzień po powrocie.",
  },
  {
    id: "ok5",
    label: "Muszę porozmawiać ze wspólnikiem / synem / żoną",
    script:
      "Czy mogliby Państwo dołączyć we dwoje na spotkanie przez internet? Trwa 45 minut i mam przygotowane liczby konkretnie dla Pana firmy. Wtedy oboje macie pełen obraz i możecie zdecydować razem.",
    note: "Jeśli nie może dołączyć: 'Rozumiem. Co musiałoby się wydarzyć na spotkaniu żeby [osoba] powiedziała tak?'",
  },
  {
    id: "ok6",
    label: "Brak odbioru po 3 próbach",
    type: "sms" as const,
    sms: "Dzień dobry Panie {IMIĘ}, dzwoniłem 3× bo wypełnił Pan formularz w sprawie oszczędności czasu w firmie transportowej. Jeśli temat jest aktualny — proszę o SMS lub oddzwonienie. Jeśli nie — nie będę przeszkadzał.",
  },
  {
    id: "ok7",
    label: "Komentarz pod reklamą FB",
    type: "fb" as const,
    script: "Pod komentarzem: 'Napisałem Panu wiadomość prywatną.'",
    extra:
      "Dzień dobry Panie {IMIĘ}, piszę ponieważ zostawił Pan komentarz pod naszą reklamą dotyczącą oszczędności czasu w firmie transportowej. Zanim opowiem więcej — mam 2 pytania. Ile pojazdów ma Pan teraz i ile osób w biurze zajmuje się zleceniami?",
  },
];

const STEPS_D: Step[] = [
  {
    id: "prep_d",
    nr: "0",
    label: "PRZYGOTOWANIE",
    tag: "AKCJA",
    lines: [
      { t: "action", text: "Przeczytaj Brief Agenta 02 (zakładka Brief)." },
      { t: "action", text: "Przeczytaj Pitch Recipe Agenta 02 — które moduły pokazać." },
      { t: "action", text: "Sprawdź czy Agent 03 zaktualizował prezentację liczbami klienta." },
      { t: "action", text: "Otwórz prezentację i kalkulator ROI. Fathom włączony." },
      { t: "action", text: "Cel: diagnoza + pitch + cena + closing w jednym spotkaniu." },
    ],
  },
  {
    id: "intro",
    nr: "1",
    label: "OTWARCIE I INTRO",
    tag: "MÓWISZ",
    lines: [
      { t: "say", text: "Dzień dobry, Pan {IMIĘ}. Cieszę się że możemy porozmawiać. Przed chwilą przejrzałem stronę firmy — widzę że prowadzi Pan firmę [nazwa] z flotą [X] pojazdów. Dobrze widzę?" },
      { t: "client", text: "[potwierdza lub koryguje]" },
      { t: "say", text: "Autorise to system automatyzacji dla biur spedycji. Pracujemy głównie z firmami 10-150 pojazdów i odzyskujemy dla nich czas biura — średnio 80 godzin miesięcznie." },
    ],
  },
  {
    id: "agenda",
    nr: "1b",
    label: "AGENDA SPOTKANIA",
    tag: "MÓWISZ",
    lines: [
      { t: "say", text: "Na to spotkanie mam dla nas 45 minut. Plan: pierwsze 20 minut pytam Pana o firmę i jak działa biuro. Drugie 20 minut pokazuję co robimy dla Pana firmy. Ostatnie 5 minut pytania i decyzja co dalej. Pasuje Panu?" },
      { t: "client", text: "Tak, jasne." },
    ],
  },
  {
    id: "podsumowanie_kwal",
    nr: "1c",
    label: "PODSUMOWANIE KWALIFIKACJI",
    tag: "MÓWISZ",
    lines: [
      { t: "say", text: "Na rozmowie telefonicznej powiedział Pan że [podsumowanie z kwalifikacji]. Czy to nadal aktualne?" },
      { t: "client", text: "[potwierdza lub aktualizuje]" },
      { t: "note", text: "Słuchaj uważnie — zmiany w sytuacji klienta od kwalifikacji to cenny sygnał." },
    ],
  },
  {
    id: "info",
    nr: "2",
    label: "DIAGNOZA — SYTUACJA DZIŚ",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Co spowodowało że właśnie teraz zdecydował się Pan na to spotkanie?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "say", text: "Proszę opowiedzieć jak wygląda dzień pracy w biurze — od momentu gdy wpada zlecenie do wystawienia faktury. Krok po kroku." },
      { t: "client", text: "[odpowiedź]" },
      { t: "say", text: "Ile osób jest zaangażowanych w ten proces i ile czasu to zajmuje łącznie?" },
    ],
  },
  {
    id: "proby",
    nr: "2b",
    label: "POPRZEDNIE PRÓBY ROZWIĄZANIA",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Co Pan do tej pory próbował żeby to usprawnić?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "say", text: "Dlaczego to nie zadziałało tak jak Pan chciał?" },
      { t: "client", text: "[odpowiedź]" },
    ],
  },
  {
    id: "samodzielnie",
    nr: "2c",
    label: "DLACZEGO NIE SAMODZIELNIE",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Dlaczego nie możecie tego rozwiązać samodzielnie — wewnętrznie?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "note", text: "To pytanie pokazuje głębię problemu i eliminuje 'zrobimy to sami' jako późniejszą obiekcję." },
    ],
  },
  {
    id: "koszt",
    nr: "2d",
    label: "KOSZT OBECNEJ SYTUACJI",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Ile szacuje Pan że kosztuje firma ta ręczna praca miesięcznie — w godzinach, błędach, stresie?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "note", text: "Pomóż klientowi policzyć: godziny × stawka + błędy + opóźnienia w fakturach." },
    ],
  },
  {
    id: "cel",
    nr: "2e",
    label: "CEL — WIZJA PRZYSZŁOŚCI",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Gdybyśmy to rozwiązali w ciągu 30 dni — jak wyglądałby dla Pana idealny wynik? Co by się zmieniło w firmie?" },
      { t: "client", text: "[odpowiedź]" },
    ],
  },
  {
    id: "pilnosc",
    nr: "2f",
    label: "PILNOŚĆ",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Na skali 1-10 jak pilne jest dla Pana rozwiązanie tego teraz?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "note", text: "Poniżej 7: 'Co musiałoby się wydarzyć żeby to było 9?' Poniżej 5: zastanów się czy warto kontynuować pitch dziś." },
    ],
  },
  {
    id: "parafraza",
    nr: "2g",
    label: "PARAFRAZA — PODSUMOWANIE DIAGNOZY",
    tag: "MÓWISZ",
    lines: [
      { t: "say", text: "Chcę się upewnić że dobrze rozumiem Pana sytuację. Proszę mnie poprawić jeśli coś pomylę." },
      {
        t: "say",
        text: "Prowadzi Pan [nazwa firmy] z flotą [X] pojazdów. Biuro zajmuje się [opis pracy]. Problem to [ból główny]. Próbował Pan [poprzednie próby] ale to nie zadziałało bo [powód]. Samodzielnie trudno to rozwiązać bo [powód]. Idealnie chciałby Pan [cel]. To kosztuje firmę szacunkowo [kwota] miesięcznie. Zgadza się?",
      },
      { t: "client", text: "[potwierdza lub koryguje]" },
      { t: "note", text: "Parafraza obowiązkowa przed pitchem. Klient który potwierdza własny ból kupuje ideę, nie produkt." },
    ],
  },
  {
    id: "przejscie",
    nr: "3",
    label: "PRZEJŚCIE DO PITCHU",
    tag: "MÓWISZ",
    lines: [
      { t: "say", text: "Dziękuję za szczerość. Mam przygotowaną prezentację specjalnie dla [nazwa firmy] — z Pana liczbami. Mogę ją teraz pokazać?" },
    ],
  },
  {
    id: "pitch",
    nr: "4",
    label: "PITCH",
    tag: "PREZENTACJA",
    lines: [
      { t: "action", text: "SLAJD 1: Okładka z nazwą firmy klienta. Przewiń gdy skończysz intro o firmie." },
      { t: "action", text: "SLAJD 2: Sytuacja dziś. Pokaż 4 problem-cards. Wskaż TYLKO te które dotyczą tego klienta." },
      { t: "action", text: "SLAJD 3: System. Pokaż TYLKO moduły z pitch recipe Agenta 02. Pomiń moduły które nie dotyczą klienta." },
      { t: "action", text: "SLAJD 5: Efekt. Wykres ROI z liczbami tego klienta. Sprawdź czy Agent 03 je wstawił." },
      { t: "action", text: "SLAJD 6: Inwestycja. Cena na ekranie. CISZA 20 sekund." },
      { t: "action", text: "SLAJD 7: Gwarancja 80h. Ten slajd zamyka pitch. Nie przewijaj dalej." },
      { t: "say", text: "To jest to co przygotowałem dla Pana firmy. Jak Pan to widzi?" },
    ],
  },
  {
    id: "temperatura",
    nr: "5",
    label: "TEMPERATURA",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Na skali 1-10 — gdzie jesteśmy?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "note", text: "7+: idź do commitment. 5-6: 'Co musiałoby się zmienić żeby to było 9?' Poniżej 5: wróć do parafrazy bólu." },
    ],
  },
  {
    id: "commitment",
    nr: "5a",
    label: "COMMITMENT — DECYDENT",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Czy jest Pan osobą która podejmuje tę decyzję, czy potrzebujemy kogoś jeszcze?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "note", text: "Jeśli 'muszę z żoną / wspólnikiem' — użyj obiekcji od2 lub od2b. Nie przechodź do ceny bez decydenta." },
      { t: "say", text: "Jeśli zdecyduje się Pan dziś — możemy zacząć wdrożenie w tym tygodniu. Co Pan myśli?" },
    ],
  },
  {
    id: "cena",
    nr: "5b",
    label: "CENA",
    tag: "MÓWISZ",
    lines: [
      { t: "say", text: "Inwestycja to 15 000 zł jednorazowo lub dwie raty po 7 500 zł. Plus 4 000 zł miesięcznie opieki. Gwarancja: jeśli w 30 dni nie odzyska Pan 80 godzin — zwrot 100% bez pytań." },
      { t: "action", text: "CISZA. Poczekaj. Nie wypełniaj ciszy." },
    ],
  },
  {
    id: "roi_d",
    nr: "5c",
    label: "ROI W LICZBACH",
    tag: "MÓWISZ",
    lines: [
      { t: "say", text: "Przy [kwota oszczędności] miesięcznie, inwestycja zwraca się w [X] miesięcy. Czy to ma sens dla Pana firmy?" },
    ],
  },
  {
    id: "closing",
    nr: "5d",
    label: "CLOSING",
    tag: "ZAMKNIĘCIE",
    lines: [
      { t: "say", text: "Co potrzebuje Pan żeby podjąć decyzję dziś?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "note", text: "Jeśli brak obiekcji: 'Super. Prześlę umowę na maila. Mogę teraz?' Jeśli jest obiekcja — użyj sekcji Obiekcje." },
      { t: "say", text: "Zaczynamy. Prześlę umowę i fakturę na [email]. Kickoff umawiamy na [termin]. Pasuje?" },
    ],
  },
];

const OBJECTIONS_D: Objection[] = [
  {
    id: "od1",
    label: "Muszę się zastanowić",
    script:
      "Oczywiście. Żebym wiedział jak Panu pomóc — co konkretnie wymaga zastanowienia? Czy to kwestia budżetu, kwestia czy to zadziała u Pana, czy może chce Pan porozmawiać z kimś bliskim?",
    note: "3 gałęzie: (A) wątpliwość co do produktu — wróć do wartości i gwarancji; (B) finanse — zaproponuj raty; (C) partner — przejdź do od2 lub od2b.",
  },
  {
    id: "od2",
    label: "Muszę porozmawiać z żoną",
    script:
      "Gdyby Pana żona była dzisiaj na tym spotkaniu i miała pełen kontekst tak jak Pan, co myśli Pan że by powiedziała?",
    followup:
      "A jeśli mimo pełnego kontekstu z jakiegoś powodu powiedziałaby nie, co Pan wtedy robi?",
    note: "Anchor decision przed rozłączeniem: 'Kiedy rozmawia Pan z żoną — dziś wieczór czy jutro?' Zapisz konkretną datę follow-up.",
  },
  {
    id: "od2b",
    label: "Muszę porozmawiać ze wspólnikiem / partnerem biznesowym",
    script:
      "Rozumiem. Czy możemy umówić drugie spotkanie razem ze wspólnikiem — tak żeby miał ten sam kontekst co Pan?",
    note: "Opcja A: umów 2. spotkanie z decydentem. Opcja B: reframing — 'Co musiałoby się wydarzyć żeby Pan mógł podjąć tę decyzję samodzielnie?'",
  },
  {
    id: "od3",
    label: "Za drogo",
    script:
      "Rozumiem. Chcę się upewnić że dobrze rozumiem. Czy to kwestia samej kwoty, czy kwestia czy inwestycja się zwróci, czy porównuje Pan nas z inną ofertą?",
    note: "LOGISTYKA (kwota): 'Mamy raty: 2 × 7 500 zł. Zwrot w [X] mc.' WARTOŚĆ (zwrot): wróć do ROI z liczbami klienta. KONKURENCJA: 'Kto i co oferuje za tę cenę? Czy mają gwarancję zwrotu 80h?'",
  },
  {
    id: "od4",
    label: "Jestem już przekonany, ale...",
    script: "Słyszę 'ale' — co konkretnie stoi na przeszkodzie żeby zdecydować się dziś?",
    note: "To najczęściej zamaskowana obiekcja od1, od3 lub od2. Słuchaj co pojawi się po 'ale'.",
  },
  {
    id: "od5",
    label: "Mam teraz inne priorytety",
    script:
      "Rozumiem. Ile czasu zajmie Panu te priorytety? A czy w tym czasie biuro nadal traci te [X] godzin tygodniowo?",
    note: "Cel: pokazać koszt zwlekania. Nie naciskaj — zaproponuj konkretną datę powrotu.",
  },
  {
    id: "od6",
    label: "Chcę najpierw zobaczyć demo / testować",
    script:
      "Nasze demo to realne wdrożenie z Pana danymi — dlatego mamy gwarancję 30-dniową z 100% zwrotem. Nie pokazujemy sandboxa — wdrażamy i Pan ocenia na żywych danych. Czy to zmienia Pana perspektywę?",
  },
  {
    id: "od7",
    label: "Mam pracownika który to robi",
    script:
      "Dobrze. I właśnie o to chodzi — ta osoba robi coś co można zautomatyzować. Co mogłaby robić zamiast tego, gdyby miała te [X] godzin dziennie z powrotem?",
  },
  {
    id: "od8",
    label: "Mam dwie firmy, nie wiem dla której",
    script:
      "Dla której z firm ból jest większy — gdzie traci się więcej czasu? Możemy zacząć od jednej i rozszerzyć na drugą po 30 dniach.",
  },
  {
    id: "od9",
    label: "Korzystam już z konkurencji",
    script:
      "Rozumiem. Co Pan od nich dostaje i co działa dobrze? A czego Panu brakuje?",
    note: "Nie atakuj konkurencji. Szukaj luki — co nasze rozwiązanie robi czego tamto nie robi. Zaproponuj 30-dniowy test równoległy z gwarancją.",
  },
  {
    id: "od10",
    label: "Muszę to przespać",
    script: "Oczywiście. Co musiałoby się stać żeby jutro rano powiedział Pan 'tak'?",
    followup: "Zadzwonię jutro o [godzina]. Pasuje Panu?",
    note: "Anchor konkretnego czasu. Jeśli nie chce jutro — zapisz w pipeline jako follow-up z datą.",
  },
  {
    id: "od11",
    label: "Mogę płacić w ratach?",
    script:
      "Tak — mamy opcję 2 × 7 500 zł zamiast 15 000 zł jednorazowo. Retainer pozostaje 4 000 zł / mc. Przy ratach zaczynacie wdrożenie po pierwszej wpłacie. Pasuje Panu?",
  },
];

function objectionColor(label: string): { bg: string; accent: string; category: string } {
  if (/czas|odbioru|komentarz|urlop/i.test(label))
    return { bg: "rgba(59,130,246,0.06)", accent: "#3b82f6", category: "Logistyczne" };
  if (/zastanow|pomyśl|przemyśl|priorytety|tydzień|znać|przespać/i.test(label))
    return { bg: "rgba(251,191,36,0.08)", accent: "#f59e0b", category: "Niezdecydowanie" };
  if (/drogo|budżet|finans|przekonany|raty/i.test(label))
    return { bg: "rgba(239,68,68,0.06)", accent: "#ef4444", category: "Finanse" };
  if (/żon|partner|wspólnik|decydent|syn/i.test(label))
    return { bg: "rgba(139,92,246,0.06)", accent: "#8b5cf6", category: "Decydenci" };
  if (/system|program|pracownik|firm|demo|konkurencj/i.test(label))
    return { bg: "rgba(20,184,166,0.06)", accent: "#14b8a6", category: "Produkt" };
  return { bg: "transparent", accent: "var(--text-tertiary)", category: "Inne" };
}

const ICP_RULES: IcpRule[] = [
  { ok: true, label: "Biuro", val: "Min. 2 osoby przy zleceniach (twardy disqualifier)" },
  { ok: true, label: "Decydent", val: "Właściciel lub wspólnik — weryfikuj na kwalifikacji" },
  { ok: true, label: "Ból", val: "Ręczna praca potwierdzona kalkulatorem ROI ≥ 80h/mc" },
  { ok: true, label: "Flota", val: "Orientacyjnie 10–150 pojazdów — sprawdź kalkulator" },
  { ok: false, label: "Odrzuć", val: "< 2 osoby w biurze LUB potencjał ROI < 80h/mc łącznie" },
];

const DISCOVERY_STATUSES_SCRIPT = [
  "Discovery umówione",
  "Finalizacja",
  "Kickoff",
  "Wdrożenie",
  "Retainer",
  "Upsell",
];

function ScriptTab({
  type,
  selectedClient,
  clients,
  onSelectClient,
}: {
  type: "kwalifikacyjna" | "sprzedazowa";
  selectedClient: PipelineClientDetailed | null;
  clients: PipelineClientDetailed[];
  onSelectClient: (c: PipelineClientDetailed | null) => void;
}) {
  const steps = type === "kwalifikacyjna" ? STEPS_K : STEPS_D;
  const objections = type === "kwalifikacyjna" ? OBJECTIONS_K : OBJECTIONS_D;
  const [vocative, setVocative] = useState("");
  const [openObj, setOpenObj] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");

  const isQualified = selectedClient
    ? DISCOVERY_STATUSES_SCRIPT.includes(selectedClient.status)
    : false;

  const visibleClients =
    type === "sprzedazowa"
      ? clients.filter((c) => DISCOVERY_STATUSES_SCRIPT.includes(c.status))
      : clients;

  const filteredClients = search.trim()
    ? visibleClients.filter((c) =>
        `${c.kontakt} ${c.firma}`.toLowerCase().includes(search.toLowerCase()),
      )
    : visibleClients;

  useEffect(() => {
    if (selectedClient) {
      setVocative(toVocative(selectedClient.kontakt || selectedClient.firma || ""));
    } else {
      setVocative("");
    }
  }, [selectedClient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const saved = localStorage.getItem(`script_notes_${selectedClient?.id ?? "global"}`);
    setNote(saved ?? "");
  }, [selectedClient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fill = (text: string): string => {
    let out = text;
    // Nominative: "Pan Jacek" / "Pani Jacek" — before global vocative replacement
    const nominative = (selectedClient?.kontakt ?? "").trim().split(/\s+/)[0];
    if (nominative) {
      out = out.replace(/Pan \{IMIĘ\}/g, `Pan ${nominative}`);
      out = out.replace(/Pani \{IMIĘ\}/g, `Pani ${nominative}`);
    }
    if (vocative.trim()) out = out.replace(/\{IMIĘ\}/g, vocative.trim());
    if (selectedClient) {
      const bolGlowny = selectedClient.bolGlowny?.trim() ?? "";
      const kwalNote = selectedClient.nastepnyKrok?.trim() ?? "";
      const poprzednieProby = selectedClient.poprzednieProby?.trim() ?? "";
      const prob = selectedClient.liczbaProb ?? 0;
      // [podsumowanie z kwalifikacji] — bolGlowny primary, nastepnyKrok fallback
      out = out.replace(
        /\[podsumowanie z kwalifikacji\]/g,
        bolGlowny
          ? `„${bolGlowny}"`
          : kwalNote
            ? `„${kwalNote}"`
            : "— brak danych z kwalifikacji —",
      );
      // [poprzednia próba] — poprzednieProby primary, liczbaProb fallback
      out = out.replace(
        /\[poprzednia próba\]/g,
        poprzednieProby
          ? `„${poprzednieProby}"`
          : prob > 0
            ? `(${prob} ${prob === 1 ? "poprzednia próba" : prob < 5 ? "poprzednie próby" : "poprzednich prób"} kontaktu bez odpowiedzi)`
            : "— klient bez wcześniejszych prób kontaktu —",
      );
      // [kwota roczna] i [kwota]
      out = out.replace(/\[kwota roczna\]/g, "— policz z kalkulatorem ROI —");
      out = out.replace(/\[kwota\]/g, "— policz z kalkulatorem ROI —");
      // [ocena ICP]
      out = out.replace(
        /\[ocena ICP\]/g,
        selectedClient.ocenaICP?.trim() ? `ICP: ${selectedClient.ocenaICP}` : "— brak oceny ICP —",
      );
    }
    return out;
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(fill(text)).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const lineColor: Record<ScriptLine["t"], string> = {
    say: "var(--text-primary)",
    client: "var(--text-secondary)",
    note: "var(--warning)",
    action: "var(--accent)",
    branch: "var(--success-text)",
    "branch-bad": "var(--error)",
  };
  const lineBg: Record<ScriptLine["t"], string> = {
    say: "transparent",
    client: "transparent",
    note: "var(--warning-bg)",
    action: "var(--accent-muted)",
    branch: "var(--success-bg)",
    "branch-bad": "var(--error-bg)",
  };
  const linePrefix: Record<ScriptLine["t"], React.ReactNode> = {
    say: <MessageSquare size={15} color="var(--accent)" strokeWidth={1.6} />,
    client: <Users size={15} color="var(--text-primary)" strokeWidth={1.8} />,
    note: <AlertTriangle size={14} color="var(--warning)" strokeWidth={1.6} />,
    action: <Check size={14} color="var(--accent)" strokeWidth={2} />,
    branch: <Check size={14} color="var(--success-text)" strokeWidth={2} />,
    "branch-bad": <X size={14} color="var(--error)" strokeWidth={2} />,
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left panel — script (65%) */}
      <div
        style={{
          flex: "0 0 65%",
          overflowY: "auto",
          padding: "20px 24px",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Client + vocative bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
            padding: "10px 14px",
            background: "var(--glass)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              flexShrink: 0,
            }}
          >
            Klient:
          </span>
          {selectedClient ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  flex: 1,
                }}
              >
                {selectedClient.kontakt || selectedClient.firma || "—"}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 99,
                  background: isQualified ? "var(--success-bg)" : "var(--accent-muted)",
                  color: isQualified ? "var(--success-text)" : "var(--accent)",
                  fontFamily: "var(--font-sans)",
                  letterSpacing: "0.04em",
                  flexShrink: 0,
                }}
              >
                {selectedClient.status}
              </span>
              <button
                onClick={() => {
                  onSelectClient(null);
                  setSearch("");
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-sans)",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xs)",
                  padding: "3px 8px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Zmień
              </button>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              {type === "sprzedazowa" && visibleClients.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--warning)",
                    fontFamily: "var(--font-sans)",
                    padding: "6px 10px",
                    background: "rgba(255,159,10,0.08)",
                    border: "1px solid rgba(255,159,10,0.25)",
                    borderRadius: "var(--radius-xs)",
                  }}
                >
                  Brak klientów po kwalifikacji. Przeprowadź rozmowę kwalifikacyjną (Agent 1).
                </div>
              ) : (
                <>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={
                      type === "sprzedazowa"
                        ? "Szukaj klienta po kwalifikacji..."
                        : "Szukaj klienta..."
                    }
                    style={{
                      width: "100%",
                      height: 30,
                      padding: "0 10px",
                      border: "1px solid var(--accent-border)",
                      borderRadius: "var(--radius-xs)",
                      background: "var(--accent-muted)",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  {filteredClients.length > 0 && (
                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: "auto",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-xs)",
                        background: "var(--bg-elevated)",
                      }}
                    >
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            onSelectClient(c);
                            setSearch("");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "7px 10px",
                            border: "none",
                            borderBottom: "1px solid var(--border)",
                            background: "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background =
                              "var(--bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: "var(--text-primary)",
                              fontFamily: "var(--font-sans)",
                              flex: 1,
                            }}
                          >
                            {c.kontakt || c.firma}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 99,
                              background: DISCOVERY_STATUSES_SCRIPT.includes(c.status)
                                ? "var(--success-bg)"
                                : "var(--bg)",
                              color: DISCOVERY_STATUSES_SCRIPT.includes(c.status)
                                ? "var(--success-text)"
                                : "var(--text-tertiary)",
                              fontFamily: "var(--font-sans)",
                              border: "1px solid var(--border)",
                              flexShrink: 0,
                            }}
                          >
                            {c.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              flexShrink: 0,
            }}
          >
            Forma grzecz.:
          </span>
          <input
            value={vocative}
            onChange={(e) => setVocative(e.target.value)}
            placeholder="np. Kowalski"
            style={{
              width: 140,
              padding: "4px 8px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              background: "var(--bg)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        {/* Blokada dostępu do skryptu sprzedażowego dla niekwalifikowanych */}
        {type === "sprzedazowa" && selectedClient && !isQualified && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "rgba(255,159,10,0.08)",
              border: "1px solid rgba(255,159,10,0.3)",
              borderLeft: "3px solid var(--warning)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <AlertTriangle
              size={15}
              color="var(--warning)"
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--warning)",
                  fontFamily: "var(--font-sans)",
                  marginBottom: 3,
                }}
              >
                Klient nie przeszedł jeszcze kwalifikacji
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-sans)",
                  lineHeight: 1.5,
                }}
              >
                Skrypt sprzedażowy wymaga statusu: <strong>Discovery umówione</strong> lub wyżej.
                <br />
                Aktualny status: <strong>{selectedClient.status}</strong>. Najpierw przeprowadź
                rozmowę kwalifikacyjną.
              </div>
            </div>
          </div>
        )}

        {/* Warning: brak pola bolGlowny w Notion */}
        {type === "sprzedazowa" && selectedClient && isQualified && !selectedClient.bolGlowny && (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 14px",
              background: "var(--warning-bg)",
              border: "1px solid var(--warning-border)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle
              size={14}
              color="var(--warning)"
              strokeWidth={2}
              style={{ flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Brak pola "Ból główny" w Notion dla tego klienta. Uzupełnij kartę klienta przed
              rozmową Discovery.
            </span>
          </div>
        )}

        {/* Kontekst klienta + ostrzeżenia */}
        {selectedClient && (
          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            {/* Kontekst z kwalifikacji — nastepnyKrok (output agenta 1) */}
            {selectedClient.nastepnyKrok ? (
              <div
                style={{
                  padding: "8px 12px",
                  background: "var(--accent-muted)",
                  border: "1px solid var(--accent-border)",
                  borderLeft: "3px solid var(--accent)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                    marginBottom: 3,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Kontekst z kwalifikacji (Agent 1)
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-sans)",
                    lineHeight: 1.5,
                  }}
                >
                  {selectedClient.nastepnyKrok}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(255,159,10,0.08)",
                  border: "1px solid rgba(255,159,10,0.25)",
                  borderLeft: "3px solid var(--warning)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <AlertTriangle
                  size={13}
                  color="var(--warning)"
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--warning)",
                      fontFamily: "var(--font-sans)",
                      marginBottom: 2,
                    }}
                  >
                    Brak danych z kwalifikacji w systemie
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-sans)",
                      lineHeight: 1.4,
                    }}
                  >
                    {type === "sprzedazowa"
                      ? "Przed prezentacją koniecznie sonduj ból — zastosuj kroki 2 i 2b. Nie pomiń diagnozy."
                      : "Dokładnie przejdź przez krok ICP i kalkulator ROI."}
                  </div>
                </div>
              </div>
            )}
            {/* Następny krok */}
            {selectedClient.nastepnyKrok && (
              <div
                style={{
                  padding: "6px 10px",
                  background: "rgba(48,209,88,0.07)",
                  border: "1px solid rgba(48,209,88,0.2)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Check size={11} color="var(--success)" />
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Następny krok:{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    {selectedClient.nastepnyKrok}
                  </strong>
                </span>
              </div>
            )}
            {/* Liczba prób */}
            {(selectedClient.liczbaProb ?? 0) > 0 && (
              <div
                style={{
                  padding: "6px 10px",
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.18)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <AlertTriangle size={11} color="#ef4444" />
                <span style={{ fontSize: 11, color: "#ef4444", fontFamily: "var(--font-sans)" }}>
                  {selectedClient.liczbaProb} poprzednia próba kontaktu — nawiąż do tego w openerze
                </span>
              </div>
            )}
          </div>
        )}

        {/* Agent 2 brief — Discovery tab only */}
        {type === "sprzedazowa" && selectedClient?.hipotezaBolGlowny && (
          <div
            style={{
              background: "var(--accent-muted)",
              border: "1px solid var(--accent-border)",
              borderLeft: "3px solid var(--accent)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 16px",
              marginBottom: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--accent)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontFamily: "var(--font-sans)",
              }}
            >
              Brief od Agenta 2 — Pytania priorytetowe
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-primary)",
                lineHeight: 1.7,
                fontFamily: "var(--font-sans)",
                whiteSpace: "pre-line",
              }}
            >
              {selectedClient.hipotezaBolGlowny}
            </div>
            {selectedClient.przewidywaneObiekcje && (
              <div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Przewidywane obiekcje
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    fontFamily: "var(--font-sans)",
                    whiteSpace: "pre-line",
                  }}
                >
                  {selectedClient.przewidywaneObiekcje}
                </div>
              </div>
            )}
            {selectedClient.ryzyka && (
              <div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Ryzyka rozmowy
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {selectedClient.ryzyka
                    .split(/(?=FLAGA|UWAGA|BORDERLINE|Bądź gotów|Pre-commit)/i)
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((item, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "4px 8px",
                          background: /FLAGA/i.test(item)
                            ? "rgba(255,69,58,0.08)"
                            : "var(--warning-bg)",
                          borderLeft: `3px solid ${/FLAGA/i.test(item) ? "var(--error)" : "var(--warning)"}`,
                          borderRadius: "var(--radius-xs)",
                          fontSize: 11,
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-sans)",
                          lineHeight: 1.5,
                        }}
                      >
                        {item}
                      </div>
                    ))}
                </div>
              </div>
            )}
            {selectedClient.uwagiFAgent2 && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  fontStyle: "italic",
                  fontFamily: "var(--font-sans)",
                  lineHeight: 1.5,
                }}
              >
                {selectedClient.uwagiFAgent2}
              </div>
            )}
          </div>
        )}

        {/* Steps */}
        {steps.map((step) => (
          <div key={step.id} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-sans)",
                  textTransform: "uppercase",
                }}
              >
                Krok {step.nr}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--accent)",
                  fontFamily: "var(--font-sans)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {step.tag}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {step.label}
              </span>
              {step.duration && (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-sans)",
                    marginLeft: "auto",
                  }}
                >
                  {step.duration}
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {step.lines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: "var(--radius-xs)",
                    background: lineBg[line.t],
                    color: lineColor[line.t],
                    fontSize: 13,
                    fontFamily: "var(--font-sans)",
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ flexShrink: 0, fontSize: 12, marginTop: 1 }}>
                    {linePrefix[line.t]}
                  </span>
                  <span>{fill(line.text)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Right panel — objections + SMS (35%) */}
      <div
        style={{
          flex: "0 0 35%",
          overflowY: "auto",
          padding: "20px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Objections accordion */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-sans)",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Obiekcje
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {objections.map((obj) => {
              const oc = objectionColor(obj.label);
              return (
              <div
                key={obj.id}
                style={{
                  border: "1px solid var(--border)",
                  borderLeft: `3px solid ${oc.accent}`,
                  borderRadius: "var(--radius-xs)",
                  overflow: "hidden",
                  background: openObj === obj.id ? oc.bg : "transparent",
                }}
              >
                <button
                  onClick={() => setOpenObj(openObj === obj.id ? null : obj.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    padding: "7px 10px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    gap: 8,
                    flexDirection: "column",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: oc.accent,
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {oc.category}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-sans)",
                          fontWeight: openObj === obj.id ? 600 : 400,
                        }}
                      >
                        {obj.label}
                      </span>
                    </div>
                    <ChevronDown
                      size={12}
                      color="var(--text-tertiary)"
                      style={{
                        flexShrink: 0,
                        transform: openObj === obj.id ? "rotate(180deg)" : "none",
                        transition: "transform 120ms",
                        marginTop: 2,
                      }}
                    />
                  </div>
                </button>
                {openObj === obj.id && (
                  <div style={{ padding: "8px 10px 10px", borderTop: "1px solid var(--border)" }}>
                    {obj.script && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-sans)",
                          lineHeight: 1.6,
                        }}
                      >
                        {fill(obj.script)}
                      </p>
                    )}
                    {obj.note && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: "6px 10px",
                          background: "var(--warning-bg)",
                          borderRadius: "var(--radius-xs)",
                          fontSize: 11,
                          color: "var(--warning)",
                          fontFamily: "var(--font-sans)",
                          fontStyle: "italic",
                          lineHeight: 1.5,
                        }}
                      >
                        {obj.note}
                      </div>
                    )}
                    {obj.followup && (
                      <div style={{ marginTop: 10 }}>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--text-tertiary)",
                            marginBottom: 4,
                            fontFamily: "var(--font-sans)",
                          }}
                        >
                          Następnie powiedz
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-sans)",
                            lineHeight: 1.6,
                          }}
                        >
                          {fill(obj.followup)}
                        </p>
                        <button
                          onClick={() => copyText(obj.id + "_followup", obj.followup!)}
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            padding: "2px 8px",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-xs)",
                            background: "transparent",
                            cursor: "pointer",
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-sans)",
                          }}
                        >
                          {copied === obj.id + "_followup" ? "✓ Skopiowano" : "Kopiuj"}
                        </button>
                      </div>
                    )}
                    {obj.sms && (
                      <div style={{ marginTop: obj.script ? 8 : 0, position: "relative" }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-sans)",
                            lineHeight: 1.6,
                          }}
                        >
                          SMS: {fill(obj.sms)}
                        </p>
                        <button
                          onClick={() => copyText(obj.id + "_sms", obj.sms!)}
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            padding: "2px 8px",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-xs)",
                            background: "transparent",
                            cursor: "pointer",
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-sans)",
                          }}
                        >
                          {copied === obj.id + "_sms" ? "✓ Skopiowano" : "Kopiuj SMS"}
                        </button>
                      </div>
                    )}
                    {obj.extra && (
                      <div style={{ marginTop: 8 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-sans)",
                            lineHeight: 1.6,
                          }}
                        >
                          DM: {fill(obj.extra)}
                        </p>
                        <button
                          onClick={() => copyText(obj.id + "_extra", obj.extra!)}
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            padding: "2px 8px",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-xs)",
                            background: "transparent",
                            cursor: "pointer",
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-sans)",
                          }}
                        >
                          {copied === obj.id + "_extra" ? "✓ Skopiowano" : "Kopiuj DM"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        </div>

        {/* ICP Quick Reference — only on kwalifikacyjna */}
        {type === "kwalifikacyjna" && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-sans)",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              ICP Quick Reference
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {ICP_RULES.map((rule) => (
                <div
                  key={rule.label}
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: "var(--radius-xs)",
                    background: rule.ok ? "var(--success-bg)" : "var(--error-bg)",
                    border: `1px solid ${rule.ok ? "var(--success)" : "var(--error)"}`,
                    opacity: 0.9,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: rule.ok ? "var(--success-text)" : "var(--error)",
                      fontFamily: "var(--font-sans)",
                      flexShrink: 0,
                      width: 54,
                    }}
                  >
                    {rule.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-sans)",
                      lineHeight: 1.4,
                    }}
                  >
                    {rule.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notatnik */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-sans)",
              textTransform: "uppercase",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FileText size={11} color="var(--text-tertiary)" />
            Notatnik
          </div>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              localStorage.setItem(
                `script_notes_${selectedClient?.id ?? "global"}`,
                e.target.value,
              );
            }}
            placeholder="Notatki do rozmowy..."
            style={{
              width: "100%",
              minHeight: 120,
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── MessagesTab ───────────────────────────────────────────────────────

interface MsgItem {
  id: string;
  label: string;
  text: string;
  group: string;
}

const MESSAGES_DATA: Record<"sms" | "telefon" | "fb", MsgItem[]> = {
  sms: [
    {
      id: "m1",
      group: "Kwalifikacja",
      label: "Brak odbioru — po 3 próbach",
      text: "Dzień dobry Panie {IMIĘ}, dzwoniłem ponieważ wypełnił Pan formularz w sprawie oszczędności czasu w firmie transportowej. Będę wdzięczny za oddzwonienie lub wskazanie terminu. Michał Roth, Autorise, +48 575 902 350",
    },
    {
      id: "m2",
      group: "Przed Discovery",
      label: "Potwierdzenie spotkania Discovery",
      text: "Dzień dobry Panie {IMIĘ}, potwierdzam nasze spotkanie: [data] o [godzina] przez Google Meet. Link wyślę na Pana email. Proszę dołączyć z laptopa. Do zobaczenia — Michał Roth, Autorise",
    },
    {
      id: "m3",
      group: "Przed Discovery",
      label: "Reminder — dzień przed Discovery",
      text: "Dzień dobry Panie {IMIĘ}, jutro o [godzina] mamy spotkanie przez Google Meet. Link jest w zaproszeniu na Pana skrzynce. Proszę dołączyć z laptopa. Do zobaczenia — Michał Roth, Autorise",
    },
    {
      id: "m4",
      group: "Przed Discovery",
      label: "Reminder — rano w dniu Discovery",
      text: "Dzień dobry Panie {IMIĘ}, dzisiaj o [godzina] nasze spotkanie Google Meet. Link w zaproszeniu email. Do zobaczenia — Michał",
    },
    {
      id: "m5",
      group: "Przed Discovery",
      label: "Klient nie pojawił się na spotkaniu",
      text: "Dzień dobry Panie {IMIĘ}, widzę że nie mogło dojść do skutku nasze spotkanie. Czy możemy umówić się na inny termin? Michał Roth, Autorise",
    },
    {
      id: "m6",
      group: "Po Discovery",
      label: "Follow-up po Discovery — nie zamknął",
      text: "Dzień dobry Panie {IMIĘ}, jak ustaliliśmy — piszę żeby sprawdzić czy miał Pan czas przemyśleć naszą rozmowę. Są pytania na które mogę odpowiedzieć? Michał Roth, Autorise",
    },
    {
      id: "m7",
      group: "Po Discovery",
      label: "Follow-up po ustalonym terminie oddzwonienia",
      text: "Dzień dobry Panie {IMIĘ}, jak ustaliliśmy — dzwonię dzisiaj o [godzina] w sprawie [temat]. Michał Roth, Autorise",
    },
    {
      id: "m8",
      group: "Closing",
      label: "Zamknięcie — potwierdzenie startu współpracy",
      text: "Dzień dobry Panie {IMIĘ}, potwierdzam naszą decyzję o współpracy. W ciągu 24h skontaktuję się w sprawie umowy i szczegółów kickoffu. Michał Roth, Autorise",
    },
    {
      id: "m9",
      group: "Re-engagement",
      label: "Re-engagement po 90 dniach",
      text: "Dzień dobry Panie {IMIĘ}, jakiś czas temu rozmawialiśmy o optymalizacji procesów w Pana firmie. Chciałem sprawdzić czy sytuacja się zmieniła i czy nie warto wrócić do tematu. Michał Roth, Autorise",
    },
  ],
  telefon: [
    {
      id: "t1",
      group: "Przed Discovery",
      label: "Skrypt — telefon z przypomnieniem (dzień przed)",
      text: "Dzień dobry, Panie {IMIĘ}? Michał Roth z Autorise. Dzwonię żeby potwierdzić jutrzejsze spotkanie o [godzina]. Wszystko OK z dołączeniem przez Google Meet? Proszę pamiętać o laptopie — będę udostępniał ekran. Do zobaczenia jutro.",
    },
    {
      id: "t2",
      group: "Przed Discovery",
      label: "SMS jeśli nie odbiera (dzień przed)",
      text: "Dzień dobry Panie {IMIĘ}, próbowałem się dodzwonić żeby potwierdzić jutrzejsze spotkanie o [godzina]. Proszę odpisać lub zadzwonić jeśli coś się zmieniło. Michał Roth, Autorise",
    },
  ],
  fb: [
    {
      id: "fb1",
      group: "Pozyskanie",
      label: "Odpowiedź pod komentarzem (publiczna — krótka)",
      text: "Napisałem Panu wiadomość prywatną z odpowiedzią.",
    },
    {
      id: "fb2",
      group: "Pozyskanie",
      label: "Wiadomość prywatna po komentarzu",
      text: "Dzień dobry Panie {IMIĘ}, piszę ponieważ zostawił Pan komentarz pod naszą reklamą w sprawie oszczędności czasu dla firm transportowych. Zanim opowiem więcej — chciałbym zadać kilka pytań. Czy mógłbym prosić o numer telefonu?",
    },
    {
      id: "fb3",
      group: "Pozyskanie",
      label: "DM po kliknięciu reklamy (bez komentarza)",
      text: "Dzień dobry Panie {IMIĘ}, widzę że zainteresowała Pana nasza reklama. Zajmuję się firmami transportowymi — konkretnie tym, że biura tracą za dużo czasu na ręczną robotę. Czy to temat który dotyczy Pana firmy?",
    },
  ],
};

const GROUP_COLORS: Record<string, string> = {
  Kwalifikacja: "var(--accent)",
  "Przed Discovery": "#f59e0b",
  "Po Discovery": "#8b5cf6",
  Closing: "var(--success-text)",
  "Re-engagement": "var(--text-tertiary)",
  Pozyskanie: "var(--accent)",
};

type MsgTab = "sms" | "telefon" | "fb";

function MessagesTab({
  selectedClient,
  clients,
  onSelectClient,
}: {
  selectedClient: PipelineClientDetailed | null;
  clients: PipelineClientDetailed[];
  onSelectClient: (c: PipelineClientDetailed) => void;
}) {
  const [msgTab, setMsgTab] = useState<MsgTab>("sms");
  const [vocative, setVocative] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedClient) {
      setVocative(toVocative(selectedClient.kontakt || selectedClient.firma || ""));
    } else {
      setVocative("");
    }
  }, [selectedClient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentData = MESSAGES_DATA[msgTab];

  const fill = (text: string) =>
    vocative.trim() ? text.replace(/\{IMIĘ\}/g, vocative.trim()) : text;

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(fill(text)).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  // Reset selection when tab changes
  const handleTabChange = (t: MsgTab) => {
    setMsgTab(t);
    setSelectedId(null);
  };

  const selectedItem = currentData.find((x) => x.id === selectedId) ?? currentData[0];

  // Group items
  const groups = Array.from(new Set(currentData.map((x) => x.group)));

  const tabLabels: { key: MsgTab; label: string; icon: React.ReactNode }[] = [
    { key: "sms", label: "SMS / WhatsApp", icon: <MessageSquare size={13} strokeWidth={1.5} /> },
    { key: "telefon", label: "Telefon", icon: <Phone size={13} strokeWidth={1.5} /> },
    { key: "fb", label: "Facebook", icon: <Users size={13} strokeWidth={1.5} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top bar */}
      <div
        style={{
          padding: "11px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexShrink: 0,
          background: "var(--bg-elevated)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            style={{
              fontSize: 11.5,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
            }}
          >
            Klient:
          </span>
          {selectedClient ? (
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {selectedClient.kontakt || selectedClient.firma || "—"}
            </span>
          ) : (
            <select
              defaultValue=""
              onChange={(e) => {
                const c = clients.find((cl) => cl.id === e.target.value);
                if (c) onSelectClient(c);
              }}
              style={{
                height: 28,
                padding: "0 8px",
                border: "1px solid var(--accent-border)",
                borderRadius: "var(--radius-xs)",
                background: "var(--accent-muted)",
                color: "var(--accent)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="" disabled>
                — wybierz klienta —
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kontakt || c.firma || c.id}
                  {c.status ? ` (${c.status})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <div style={{ width: 1, height: 16, background: "var(--border)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            style={{
              fontSize: 11.5,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
            }}
          >
            Forma grzecz.:
          </span>
          <input
            value={vocative}
            onChange={(e) => setVocative(e.target.value)}
            placeholder="np. Kowalski"
            style={{
              width: 130,
              padding: "3px 8px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              background: "var(--bg)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>
        <div style={{ flex: 1 }} />
        {/* Channel selector */}
        <div style={{ display: "flex", gap: 4 }}>
          {tabLabels.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                border: msgTab === key ? "1px solid var(--accent)" : "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: msgTab === key ? "var(--accent-muted)" : "transparent",
                color: msgTab === key ? "var(--accent)" : "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: msgTab === key ? 600 : 400,
                cursor: "pointer",
                transition: "all 120ms",
                whiteSpace: "nowrap",
              }}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-panel layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: template list grouped */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            overflowY: "auto",
            padding: "12px 0",
          }}
        >
          {groups.map((group) => {
            const items = currentData.filter((x) => x.group === group);
            const color = GROUP_COLORS[group] ?? "var(--text-tertiary)";
            return (
              <div key={group} style={{ marginBottom: 4 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 16px 4px 16px",
                    marginBottom: 2,
                  }}
                >
                  <div
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: "50%",
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color,
                    }}
                  >
                    {group}
                  </span>
                </div>
                {items.map((item) => {
                  const isActive = (selectedId ?? currentData[0]?.id) === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "7px 16px 7px 24px",
                        border: "none",
                        background: isActive ? "var(--bg-active)" : "transparent",
                        borderLeft: isActive ? `2px solid ${color}` : "2px solid transparent",
                        cursor: "pointer",
                        transition: "background 100ms",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                          lineHeight: 1.4,
                          display: "block",
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Right: message preview */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {selectedItem && (
            <>
              {/* Header */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 3,
                      height: 14,
                      borderRadius: 2,
                      background: GROUP_COLORS[selectedItem.group] ?? "var(--accent)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: GROUP_COLORS[selectedItem.group] ?? "var(--accent)",
                    }}
                  >
                    {selectedItem.group}
                  </span>
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-sans)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {selectedItem.label}
                </h3>
              </div>

              {/* Message bubble */}
              <div
                style={{
                  background: "var(--glass)",
                  backdropFilter: "var(--glass-blur)",
                  WebkitBackdropFilter: "var(--glass-blur)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px 24px",
                  position: "relative",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-sans)",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {fill(selectedItem.text)}
                </p>
                {vocative && selectedItem.text.includes("{IMIĘ}") && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 14,
                      fontSize: 10,
                      color: "var(--success-text)",
                      fontFamily: "var(--font-sans)",
                      fontWeight: 600,
                    }}
                  >
                    ✓ {vocative}
                  </div>
                )}
              </div>

              {/* Footer row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => copyText(selectedItem.id, selectedItem.text)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 18px",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    background: copied === selectedItem.id ? "var(--success-bg)" : "var(--accent)",
                    color: copied === selectedItem.id ? "var(--success-text)" : "#fff",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 150ms",
                  }}
                >
                  {copied === selectedItem.id ? "✓ Skopiowano" : "Kopiuj wiadomość"}
                </button>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {fill(selectedItem.text).length} znaków
                </span>
              </div>

              {/* Placeholders reminder */}
              {selectedItem.text.match(/\[[\w\s]+\]/g) && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--warning-bg)",
                    border: "1px solid rgba(255,159,10,0.2)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--warning)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    Uzupełnij przed wysyłką: {selectedItem.text.match(/\[[\w\s]+\]/g)?.join(", ")}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
