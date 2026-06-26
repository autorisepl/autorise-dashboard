"use client";

import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  GitBranch,
  Loader2,
  MapPin,
  Phone,
  PhoneOff,
  RefreshCw,
  Target,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { KalkulatorRoi } from "@/components/kalkulator/KalkulatorRoi";
import { KartaKlienta } from "@/components/karta/KartaKlienta";
import { LiveScript } from "@/components/LiveScript";
import { formatPhone } from "@/lib/format/phone";

// ── Types ─────────────────────────────────────────────────────────────

type Tab = "pipeline" | "livescript" | "mapa" | "roi";
type QuickAction = "discovery" | "followup" | "niekwalifikowany" | "brak_odbioru" | null;

// ── Constants ─────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ["Nowy lead", "Kwalifikacja", "Discovery umówione", "Finalizacja"];

const STATUS_COLORS: Record<string, string> = {
  "Nowy lead": "var(--accent)",
  Kwalifikacja: "#7c3aed",
  "Discovery umówione": "#0d9488",
  Finalizacja: "#d97706",
};

// ── Helpers ───────────────────────────────────────────────────────────

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
  const dzisDo = clients.filter((c) => c.dataFollowup && c.dataFollowup === todayISO()).length;
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
        onDone("Status → Analiza umówiona. Termin dodany do kalendarza.");
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
        onDone("Status → Niekwalifikowany.");
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
  const activeClients = clients.filter((c) => ACTIVE_STATUSES.includes(c.status));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
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
            style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)" }}
          >
            Odśwież
          </span>
        </button>
      </div>

      {/* Kanban */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          overflow: "hidden",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {ACTIVE_STATUSES.map((status, idx) => (
          <div
            key={status}
            style={{
              borderRight: idx < ACTIVE_STATUSES.length - 1 ? "1px solid var(--border)" : "none",
              padding: "8px 8px 12px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <KanbanColumn
              status={status}
              clients={activeClients.filter((c) => c.status === status)}
              onSelect={(c) => onSelectClient(c, true)}
            />
          </div>
        ))}
      </div>
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

// Mapowanie statusu klienta (Notion) → indeks etapu mapy (0-3); -1 = poza ścieżką.
function statusToStageIdx(status: string): number {
  const s = (status ?? "").toLowerCase();
  if (s.includes("nowy") || s.includes("kwalifik")) return 0;
  if (s.includes("discovery") || s.includes("analiz") || s.includes("ofert")) return 1;
  if (s.includes("finaliz") || s.includes("negocj")) return 2;
  if (
    s.includes("aktyw") ||
    s.includes("pozysk") ||
    s.includes("wdroż") ||
    s.includes("wdroz") ||
    s.includes("retainer") ||
    s.includes("klient")
  )
    return 3;
  return -1;
}

function MapaProcesuTab({
  clients,
  selectedClient,
}: {
  clients: PipelineClientDetailed[];
  selectedClient: PipelineClientDetailed | null;
}) {
  const stages = [
    {
      etap: "ETAP 1",
      label: "Zimny kontakt",
      color: "var(--accent)",
      steps: [
        "Prospecting / META Ads",
        "Pierwszy telefon (skrypt kwalifikacyjny)",
        "Weryfikacja ICP — flota, TMS, decydent",
      ],
      exits: [
        { label: "Niekwalifikowany", reason: "Za mały, inny rynek, brak decydenta" },
        { label: "Brak odbioru", reason: "Queue → retry D+1, D+3, D+7" },
      ],
      next: "Kwalifikacja ✓",
    },
    {
      etap: "ETAP 2",
      label: "Analiza diagnostyczna z ofertowaniem",
      color: "#7c3aed",
      steps: [
        "Pre-Discovery Brief (Agent 2)",
        "Diagnoza + ofertowanie wg Live Script",
        "Kalkulator ROI + prezentacja modułów",
      ],
      exits: [
        { label: "Niekwalifikowany", reason: "ICP nie pasuje, brak bólu, brak budżetu" },
        { label: "Follow-up", reason: "Drugi decydent, budżet za X dni" },
      ],
      next: "Oferta / Finalizacja",
    },
    {
      etap: "ETAP 3",
      label: "Finalizacja",
      color: "#d97706",
      steps: ["Oferta spersonalizowana", "Rozmowa finalizacyjna", "Umowa / zamknięcie"],
      exits: [
        { label: "Odrzucenie", reason: "Re-engagement po 90 dniach" },
        { label: "Negocjacje", reason: "Wariant cenowy / etapowanie" },
      ],
      next: "Kickoff umówiony",
    },
    {
      etap: "ETAP 4",
      label: "Wdrożenie & Retainer",
      color: "#16a34a",
      steps: ["Kickoff — onboarding", "Wdrożenie (4–8 tygodni)", "Retainer — opieka stała"],
      exits: [{ label: "Pause", reason: "Renegocjacja zakresu" }],
      next: "Klient aktywny ✓",
    },
  ];

  // Liczniki klientów na każdym etapie + bieżący etap wybranego klienta.
  const counts = [0, 0, 0, 0];
  for (const c of clients) {
    const idx = statusToStageIdx(c.status);
    if (idx >= 0) counts[idx] += 1;
  }
  const currentIdx = selectedClient ? statusToStageIdx(selectedClient.status) : -1;
  const selectedName = selectedClient ? selectedClient.kontakt || selectedClient.firma : null;

  return (
    <div style={{ padding: "24px 28px", overflow: "auto", height: "100%" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}
          >
            Mapa procesu sprzedażowego
          </div>
          {selectedName ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 12px",
                borderRadius: 99,
                background: "var(--accent-muted)",
                border: "1px solid var(--accent-border)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                Śledzony klient:
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--accent)",
                }}
              >
                {selectedName}
              </span>
              {currentIdx >= 0 && (
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                  }}
                >
                  · {stages[currentIdx].etap}
                </span>
              )}
            </div>
          ) : (
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-placeholder)",
              }}
            >
              Wybierz klienta w Pipeline, aby zobaczyć jego etap
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {stages.map((stage, idx) => {
            const isCurrent = idx === currentIdx;
            const isDone = currentIdx >= 0 && idx < currentIdx;
            return (
              <div key={stage.etap} style={{ display: "flex", gap: 0, position: "relative" }}>
                {/* Main stage card */}
                <div
                  style={{
                    flex: 1,
                    background: isCurrent ? "var(--bg-elevated)" : "var(--glass)",
                    backdropFilter: "var(--glass-blur)",
                    WebkitBackdropFilter: "var(--glass-blur)",
                    border: `1px solid ${isCurrent ? stage.color : "var(--border)"}`,
                    boxShadow: isCurrent
                      ? `0 0 0 3px ${stage.color}22, var(--shadow-card)`
                      : "none",
                    opacity: isDone ? 0.62 : 1,
                    borderRadius: "var(--radius-sm)",
                    padding: "18px 20px",
                    position: "relative",
                    zIndex: isCurrent ? 2 : 1,
                    marginBottom: idx < stages.length - 1 ? 0 : 0,
                    borderBottom:
                      idx < stages.length - 1 && !isCurrent
                        ? "none"
                        : `1px solid ${isCurrent ? stage.color : "var(--border)"}`,
                    borderBottomLeftRadius:
                      idx < stages.length - 1 && !isCurrent ? 0 : "var(--radius-sm)",
                    borderBottomRightRadius:
                      idx < stages.length - 1 && !isCurrent ? 0 : "var(--radius-sm)",
                    borderTopLeftRadius: idx === 0 || isCurrent ? "var(--radius-sm)" : 0,
                    borderTopRightRadius: idx === 0 || isCurrent ? "var(--radius-sm)" : 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    {/* Stage indicator */}
                    <div style={{ flexShrink: 0 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: stage.color,
                          opacity: 0.12,
                          position: "absolute",
                        }}
                      />
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          border: `2px solid ${stage.color}`,
                          background: isDone || isCurrent ? stage.color : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                        }}
                      >
                        {isDone ? (
                          <Check size={14} color="#fff" strokeWidth={3} />
                        ) : (
                          <span
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 10,
                              fontWeight: 800,
                              color: isCurrent ? "#fff" : stage.color,
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {idx + 1}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: stage.color,
                          }}
                        >
                          {stage.etap}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {stage.label}
                        </span>
                        {isCurrent && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 9px",
                              borderRadius: 99,
                              background: stage.color,
                              color: "#fff",
                              fontFamily: "var(--font-sans)",
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                            }}
                          >
                            ◀ Tu jesteś
                          </span>
                        )}
                        <div style={{ flex: 1 }} />
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 10px",
                            borderRadius: 99,
                            background: "var(--bg-hover)",
                            border: "1px solid var(--border)",
                            fontFamily: "var(--font-sans)",
                            fontSize: 11,
                            fontWeight: 600,
                            color: counts[idx] > 0 ? "var(--text-primary)" : "var(--text-tertiary)",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: stage.color,
                              flexShrink: 0,
                            }}
                          />
                          {counts[idx]} {counts[idx] === 1 ? "klient" : "klientów"}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                        {/* Steps */}
                        <div style={{ flex: 1 }}>
                          {stage.steps.map((step, si) => (
                            <div
                              key={si}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 8,
                                marginBottom: 6,
                              }}
                            >
                              <div
                                style={{
                                  width: 4,
                                  height: 4,
                                  borderRadius: "50%",
                                  background: stage.color,
                                  marginTop: 5,
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontFamily: "var(--font-sans)",
                                  fontSize: 13,
                                  color: "var(--text-primary)",
                                  lineHeight: 1.5,
                                }}
                              >
                                {step}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Exits */}
                        <div style={{ flexShrink: 0, minWidth: 240 }}>
                          {stage.exits.map((exit, ei) => (
                            <div
                              key={ei}
                              style={{
                                padding: "7px 10px",
                                marginBottom: 5,
                                background: "rgba(239,68,68,0.04)",
                                border: "1px solid rgba(239,68,68,0.15)",
                                borderRadius: "var(--radius-sm)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  marginBottom: 2,
                                }}
                              >
                                <X size={10} color="#ef4444" />
                                <span
                                  style={{
                                    fontFamily: "var(--font-sans)",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: "#ef4444",
                                  }}
                                >
                                  {exit.label}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontFamily: "var(--font-sans)",
                                  fontSize: 11,
                                  color: "var(--text-tertiary)",
                                }}
                              >
                                {exit.reason}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Next step arrow */}
                      {idx < stages.length - 1 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 12,
                            paddingTop: 10,
                            borderTop: "1px solid var(--border)",
                          }}
                        >
                          <ArrowRight size={12} color={stage.color} />
                          <span
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 11,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {stage.next}
                          </span>
                        </div>
                      )}
                      {idx === stages.length - 1 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 12,
                            paddingTop: 10,
                            borderTop: "1px solid var(--border)",
                          }}
                        >
                          <CheckCircle2 size={12} color="#16a34a" />
                          <span
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 11,
                              color: "#16a34a",
                              fontWeight: 600,
                            }}
                          >
                            {stage.next}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
  const [tab, setTab] = useState<Tab>("pipeline");
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

  // When client selected from pipeline, switch to livescript tab
  const handleSelectClient = useCallback((c: PipelineClientDetailed, switchTab?: boolean) => {
    setSelectedClient(c);
    if (switchTab) setTab("livescript");
  }, []);

  // Inject selected client into LiveScriptTab
  const clientsWithSelected = selectedClient
    ? clients.map((c) => (c.id === selectedClient.id ? selectedClient : c))
    : clients;

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
            onClick={() => setTab("pipeline")}
          />
          <TabBtn
            icon={<Phone size={13} />}
            label="Live Script"
            active={tab === "livescript"}
            onClick={() => setTab("livescript")}
          />
          <TabBtn
            icon={<MapPin size={13} />}
            label="Mapa procesu"
            active={tab === "mapa"}
            onClick={() => setTab("mapa")}
          />
          <TabBtn
            icon={<Calculator size={13} />}
            label="Kalkulator ROI"
            active={tab === "roi"}
            onClick={() => setTab("roi")}
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
        {tab === "livescript" && (
          <LiveScriptTabWrapper clients={clientsWithSelected} preSelected={selectedClient} />
        )}
        {tab === "mapa" && <MapaProcesuTab clients={clients} selectedClient={selectedClient} />}
        {tab === "roi" && (
          <KalkulatorRoi
            embedded
            initialClientName={selectedClient?.kontakt || selectedClient?.firma || ""}
          />
        )}
      </div>
    </div>
  );
}

// ── History types (mirroring lib/notion/client HistoryEntry) ─────────

interface HistoryEntry {
  id: string;
  title: string;
  date: string;
  type: string;
}

// ── Tab 2: Live Script wrapper ────────────────────────────────────────

function LiveScriptTabWrapper({
  clients,
  preSelected,
}: {
  clients: PipelineClientDetailed[];
  preSelected: PipelineClientDetailed | null;
}) {
  const [selectedId, setSelectedId] = useState<string>(preSelected?.id ?? "");
  const [plan, setPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickAction>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewTab, setViewTab] = useState<"skrypt" | "karta">("skrypt");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = clients.find((c) => c.id === selectedId) ?? null;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const loadPlan = useCallback(async (id: string) => {
    setPlanLoading(true);
    setPlan(null);
    try {
      const res = await fetch(`/api/notion/client-plan?pageId=${id}`);
      const data = await res.json();
      setPlan((data as { plan?: string | null }).plan ?? null);
    } catch {
      setPlan(null);
    } finally {
      setPlanLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (id: string) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/notion/client-history?pageId=${id}`);
      const data = await res.json();
      setHistory((data as { history?: HistoryEntry[] }).history ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const saveHistory = useCallback(
    (id: string, type: string, summary: string) => {
      fetch("/api/notion/client-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: id, type, summary }),
      })
        .then(() => loadHistory(id))
        .catch(() => {});
    },
    [loadHistory],
  );

  // Auto-load plan + history if pre-selected
  useEffect(() => {
    if (preSelected?.id) {
      setSelectedId(preSelected.id);
      void loadPlan(preSelected.id);
      void loadHistory(preSelected.id);
    }
  }, [preSelected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    setHistory([]);
    setHistoryOpen(false);
    if (id) {
      void loadPlan(id);
      void loadHistory(id);
    } else {
      setPlan(null);
    }
  };

  const activeClients = clients.filter((c) =>
    ["Nowy lead", "Kwalifikacja", "Discovery umówione", "Finalizacja"].includes(c.status),
  );

  const ACTION_HISTORY_LABELS: Record<NonNullable<QuickAction>, string> = {
    discovery: "Akcja — Analiza diagnostyczna umówiona",
    followup: "Akcja — Follow-up zaplanowany",
    niekwalifikowany: "Akcja — Status: Niekwalifikowany",
    brak_odbioru: "Akcja — Brak odbioru",
  };

  const HISTORY_TYPE_COLORS: Record<string, string> = {
    "Agent 01": "#7c3aed",
    "Agent 02": "#0d9488",
    Akcja: "#d97706",
  };

  function historyTypeColor(type: string): string {
    for (const [key, color] of Object.entries(HISTORY_TYPE_COLORS)) {
      if (type.startsWith(key)) return color;
    }
    return "var(--text-tertiary)";
  }

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
      {/* Selector */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Target size={14} color="var(--accent)" />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Klient
        </span>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <select
            value={selectedId}
            onChange={handleSelect}
            style={{
              width: "100%",
              padding: "6px 30px 6px 10px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              outline: "none",
              appearance: "none",
              cursor: "pointer",
            }}
          >
            <option value="">— Wybierz klienta —</option>
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kontakt || c.firma}
                {c.firma && c.kontakt && c.firma !== c.kontakt ? ` · ${c.firma}` : ""}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "var(--text-tertiary)",
            }}
          />
        </div>
        {selected && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: STATUS_COLORS[selected.status] ?? "var(--text-tertiary)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                {selected.status}
              </span>
            </div>
            <a
              href={`/skrypt?pageId=${selected.id}&name=${encodeURIComponent(selected.kontakt ?? "")}&firma=${encodeURIComponent(selected.firma ?? "")}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 9px",
                borderRadius: "var(--radius-xs)",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                textDecoration: "none",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              <ExternalLink size={10} />
              Otwórz skrypt
            </a>
          </div>
        )}
      </div>

      {/* Historia operacji */}
      {selectedId && (
        <div
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            style={{
              width: "100%",
              padding: "7px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--text-secondary)",
            }}
          >
            <ChevronDown
              size={11}
              style={{
                transform: historyOpen ? "none" : "rotate(-90deg)",
                transition: "transform 180ms",
                color: "var(--text-tertiary)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Historia operacji
            </span>
            {historyLoading ? (
              <Loader2
                size={10}
                style={{ animation: "spin 1s linear infinite", color: "var(--text-tertiary)" }}
              />
            ) : (
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 99,
                  background: history.length > 0 ? "rgba(26,86,255,0.1)" : "var(--bg-card)",
                  color: history.length > 0 ? "var(--accent)" : "var(--text-tertiary)",
                  border: `1px solid ${history.length > 0 ? "rgba(26,86,255,0.2)" : "var(--border)"}`,
                }}
              >
                {history.length}
              </span>
            )}
          </button>

          {historyOpen && (
            <div
              style={{
                padding: "0 16px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxHeight: 220,
                overflow: "auto",
              }}
            >
              {history.length === 0 ? (
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-placeholder)",
                    padding: "4px 0",
                  }}
                >
                  Brak zapisanych operacji dla tego klienta.
                </div>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "7px 10px",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      borderLeft: `3px solid ${historyTypeColor(entry.type)}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          marginBottom: 1,
                        }}
                      >
                        {entry.type}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {entry.date}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Sub-tab: Skrypt / Karta klienta */}
      {selectedId && (
        <div style={{ display: "flex", gap: 4, padding: "8px 16px 0", flexShrink: 0 }}>
          {(
            [
              ["skrypt", "Skrypt"],
              ["karta", "Karta klienta"],
            ] as const
          ).map(([key, lbl]) => (
            <button
              key={key}
              onClick={() => setViewTab(key)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                border: "1px solid var(--border)",
                borderBottom: viewTab === key ? "1px solid var(--bg)" : "1px solid var(--border)",
                background: viewTab === key ? "var(--bg)" : "var(--bg-elevated)",
                color: viewTab === key ? "var(--text-primary)" : "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: viewTab === key ? 600 : 500,
                cursor: "pointer",
                position: "relative",
                top: 1,
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      )}

      {/* Body: Skrypt or Karta klienta */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {!selectedId ? (
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
              Wybierz klienta, żeby załadować skrypt
            </span>
          </div>
        ) : viewTab === "karta" ? (
          <div style={{ padding: 16 }}>
            <KartaKlienta
              clientName={selected?.kontakt || selected?.firma || ""}
              phone={selected?.telefon}
              email={selected?.email}
            />
          </div>
        ) : planLoading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 10,
              color: "var(--text-tertiary)",
            }}
          >
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13 }}>
              Ładowanie skryptu z Notion…
            </span>
          </div>
        ) : plan ? (
          <LiveScript
            plan={plan}
            clientName={selected?.kontakt ?? ""}
            firmaNazwa={selected?.firma ?? ""}
          />
        ) : selectedId ? (
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
            <AlertTriangle size={32} strokeWidth={1} color="var(--text-placeholder)" />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, marginBottom: 6 }}>
                Brak Pre-Discovery Brief
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12 }}>
                Uruchom Agenta 2 w zakładce Agenci dla tego klienta
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Quick Actions */}
      {selected && (
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
            bottom: selected ? 64 : 16,
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

      {activeAction && selected && (
        <QuickActionModal
          action={activeAction}
          client={selected}
          onClose={() => setActiveAction(null)}
          onDone={(msg) => {
            const action = activeAction;
            setActiveAction(null);
            showToast(msg);
            if (action) saveHistory(selected.id, ACTION_HISTORY_LABELS[action], msg);
          }}
        />
      )}
    </div>
  );
}
