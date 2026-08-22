"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  ArrowDownAZ,
  ArrowRight,
  ArrowUpAZ,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  LayoutGrid,
  Loader2,
  Phone,
  Radio,
  RefreshCw,
  X,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type PipelineClientDetailed, SKRYPT_V4_DATA } from "@/app/api/notion/pipeline/route";
import { ClientCompanyLine } from "@/components/clients/ClientContactDetails";
import { ContactAttemptsBadge } from "@/components/clients/ContactAttemptsBadge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatPhone } from "@/lib/format/phone";
import { MODULE_CATALOG } from "@/lib/scripts/moduleCatalog";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  KANBAN_DRAGGABLE_STATUSES,
  KANBAN_LOCKED_STATUSES,
  KANBAN_VISIBLE_STATUSES,
} from "@/lib/supabase/pipelineKanban";

// ── Constants ────────────────────────────────────────────────────────

// Blok 1, punkt 1.4 — klucz localStorage dla kierunku sortowania kart w kolumnach Kanbanu.
const PIPELINE_SORT_KEY = "autorise_pipeline_sort_direction";

// Pole "Moduły wdrażane" (Batch 6, 2026-07-26) nie istniało wcześniej na karcie klienta —
// dotąd żadne miejsce nie zapisywało które moduły faktycznie wdraża się dla danego klienta.
// MODULE_CATALOG samo wydzielone do lib/scripts/moduleCatalog.ts (2026-07-26), bo /wdrozenie
// potrzebuje tych samych etykiet dla tabeli czasu bazowego per moduł.

// Ściągawka cennika modułowego (2026-07-26) — WYŁĄCZNIE orientacyjna podpowiedź dla Michała,
// nigdy nie wysyłana do klienta ani nigdzie nie zapisywana. Stałe placeholder, nieoparte na
// żadnym realnym cenniku modułowym (dziś jest jedna cena 18 000 zł za całe wdrożenie,
// niezależnie od liczby modułów — patrz lib/agents/prompts.ts) — do skorygowania przez
// Michała, jeśli/gdy pojawi się realna decyzja o cenniku per moduł.
const MODULE_PRICE_BASE = 8000; // pierwszy moduł
const MODULE_PRICE_ADDITIONAL = 4000; // każdy kolejny moduł

function estimateModulePricing(moduleCount: number): number | null {
  if (moduleCount <= 0) return null;
  return MODULE_PRICE_BASE + (moduleCount - 1) * MODULE_PRICE_ADDITIONAL;
}

const STATUS_COLORS: Record<string, string> = {
  "Nowy lead": "var(--accent)",
  Kwalifikacja: "#a379ec",
  "Discovery umówione": "#14b8a7",
  Finalizacja: "#d97706",
  Kickoff: "#16a34a",
  Wdrożenie: "#34b262",
  Retainer: "#3fa676",
  Niekwalifikowany: "var(--text-tertiary)",
  "Nieaktywny (follow up)": "var(--warning)",
  Upsell: "#0ea5e9",
  "Zakończona współpraca": "#7c8a9c",
};

const LOCKED_DRAG_MESSAGE = "Ten etap ustawia rozmowa w /kwalifikacja lub /sprzedaz";

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function fmtPln(value: number): string {
  return `${Math.round(value).toLocaleString("pl-PL")} zł`;
}

function daysSince(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

// Dni w etapie: liczone od pierwszego kontaktu (najbardziej stabilny sygnał "jak długo karta
// czeka"), z fallbackiem na datę następnego kroku gdy pierwszy kontakt nieznany — model danych
// nie ma osobnego znacznika czasu wejścia w konkretny status.
function daysInStage(client: PipelineClientDetailed): number | null {
  const primary = daysSince(client.dataPierwszegoKontaktu);
  return primary ?? daysSince(client.dataFollowup);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
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
  const name = client.kontakt || client.firma;
  const color = STATUS_COLORS[client.status] ?? "var(--text-tertiary)";
  const days = daysInStage(client);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "10px 12px",
        background: hovered ? "var(--bg-elevated)" : "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        transition: "background 120ms, box-shadow 120ms, border-color 120ms",
        boxShadow: hovered ? "var(--shadow-card)" : "var(--shadow-sm)",
        borderColor: hovered ? "var(--border-hover)" : "var(--border)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: `${color}22`,
            border: `1px solid ${color}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 9,
            fontWeight: 700,
            color,
            fontFamily: "var(--font-sans)",
          }}
        >
          {initials(name)}
        </div>
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
          {name}
        </div>
        <ContactAttemptsBadge
          proby={client.liczbaProb ?? 0}
          onIncrement={() => onIncrement(client)}
        />
      </div>

      {client.utracony && (
        <span
          style={{
            display: "inline-block",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--error-text)",
            background: "var(--error-bg)",
            border: "1px solid var(--error-border)",
            borderRadius: "var(--radius-xs)",
            padding: "1px 5px",
            marginBottom: 4,
          }}
        >
          Utracony
        </span>
      )}

      <ClientCompanyLine client={client} style={{ marginBottom: 4 }} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
        {client.ocenaICP && (
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
        )}
        {days != null && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              padding: "2px 6px",
              borderRadius: "var(--radius-xs)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <Clock size={9} />
            {days} d
          </span>
        )}
      </div>

      {client.telefon && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginTop: 8,
            paddingTop: 6,
            borderTop: "1px solid var(--border)",
          }}
        >
          <Phone size={10} color="var(--text-tertiary)" />
          <span
            style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)" }}
          >
            {formatPhone(client.telefon)}
          </span>
        </div>
      )}
    </div>
  );
}

// Karta w kolumnie przeciągalnej (Finalizacja/Kickoff/Wdrożenie/Retainer) — owinięta
// useDraggable. PointerSensor ma activationConstraint (patrz sensors w komponencie głównym),
// więc zwykłe kliknięcie bez ruchu myszy nadal otwiera panel, nie inicjuje przeciągania.
function DraggableClientCard({
  client,
  onClick,
  onIncrement,
}: {
  client: PipelineClientDetailed;
  onClick: () => void;
  onIncrement: (client: PipelineClientDetailed) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: client.id,
  });
  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 10 : undefined,
    touchAction: "none",
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <ClientCard client={client} onClick={onClick} onIncrement={onIncrement} />
    </div>
  );
}

// Karta w kolumnie zablokowanej — zwykły div, bez useDraggable. Próba przeciągnięcia (mousedown)
// pokazuje krótki komunikat zamiast cicho nic nie robić.
function LockedClientCard({
  client,
  onClick,
  onIncrement,
  onDragAttempt,
}: {
  client: PipelineClientDetailed;
  onClick: () => void;
  onIncrement: (client: PipelineClientDetailed) => void;
  onDragAttempt: () => void;
}) {
  return (
    <div onMouseDown={onDragAttempt}>
      <ClientCard client={client} onClick={onClick} onIncrement={onIncrement} />
    </div>
  );
}

// ── Kanban column ────────────────────────────────────────────────────

function KanbanColumn({
  status,
  clients,
  draggable,
  onClientClick,
  onIncrement,
  onDragAttempt,
}: {
  status: string;
  clients: PipelineClientDetailed[];
  draggable: boolean;
  onClientClick: (c: PipelineClientDetailed) => void;
  onIncrement: (client: PipelineClientDetailed) => void;
  onDragAttempt: () => void;
}) {
  const color = STATUS_COLORS[status] ?? "var(--text-tertiary)";
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: !draggable });
  const sumPln = clients.reduce((acc, c) => acc + (c.cenaWdrozenia || 0), 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 240,
        width: 240,
        minHeight: 0,
        height: "100%",
        flexShrink: 0,
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
            background: "var(--bg-elevated)",
            padding: "1px 6px",
            borderRadius: "var(--radius-xs)",
            border: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {clients.length}
        </span>
      </div>
      {sumPln > 0 && (
        <div
          style={{
            padding: "0 10px 8px",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            flexShrink: 0,
          }}
        >
          {fmtPln(sumPln)}
        </div>
      )}

      {/* Cards — internal scroll, droppable when kolumna jest częścią grupy przeciągalnej */}
      <div
        ref={draggable ? setNodeRef : undefined}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          overflowY: "auto",
          flex: 1,
          paddingRight: 2,
          paddingBottom: 4,
          borderRadius: "var(--radius-sm)",
          background: isOver ? "var(--accent-muted)" : "transparent",
          transition: "background 100ms",
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
          clients.map((c) =>
            draggable ? (
              <DraggableClientCard
                key={c.id}
                client={c}
                onClick={() => onClientClick(c)}
                onIncrement={onIncrement}
              />
            ) : (
              <LockedClientCard
                key={c.id}
                client={c}
                onClick={() => onClientClick(c)}
                onIncrement={onIncrement}
                onDragAttempt={onDragAttempt}
              />
            ),
          )
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

  const toggleModule = async (code: string) => {
    const current = client.moduleWdrazane ?? [];
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    setSaving(true);
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: client.id, moduleWdrazane: next }),
      });
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const notatkiJakosciowe = [
    { label: "Cytaty klienta", value: client.cytatyKlienta },
    { label: "Uwagi Agenta 1", value: client.uwagiAgenta1 },
    { label: "Uwagi Agenta 2", value: client.uwagiFAgent2 },
  ].filter((n) => n.value);

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
                  color: "var(--error-text)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Utracony
              </span>
            </div>
          )}
        </div>

        {/* Moduły wdrażane — widoczne od razu, edytowalne na miejscu (Batch 6, 2026-07-26).
            Checkbox toggle, ten sam wzorzec co Panel Dostępy w /wdrozenie. */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: 6,
              fontFamily: "var(--font-sans)",
            }}
          >
            Moduły wdrażane
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {MODULE_CATALOG.map((m) => {
              const active = (client.moduleWdrazane ?? []).includes(m.code);
              return (
                <label
                  key={m.code}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid var(--border)",
                    background: active ? "var(--accent-muted)" : "var(--bg-elevated)",
                    cursor: saving ? "default" : "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    disabled={saving}
                    onChange={() => void toggleModule(m.code)}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: active ? "var(--accent)" : "var(--text-secondary)",
                      fontWeight: active ? 600 : 400,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {m.label}
                  </span>
                </label>
              );
            })}
          </div>
          {/* Ściągawka cennika modułowego — WYŁĄCZNIE wewnętrzna podpowiedź, nigdy nie
              wysyłana/pokazywana klientowi, Michał decyduje ostatecznie sam. Bez dodatkowego
              sprawdzania roli w kodzie — /pipeline jest już dostępne wyłącznie dla admina
              (Foundera), setter jest przekierowywany na poziomie proxy.ts zanim ta strona się
              w ogóle wyrenderuje (patrz SETTER_ALLOWED_PREFIXES), więc ten panel i tak nigdy
              nie trafia przed oczy settera. */}
          {(() => {
            const moduleCount = (client.moduleWdrazane ?? []).length;
            const estimate = estimateModulePricing(moduleCount);
            if (estimate == null) return null;
            return (
              <div
                style={{
                  marginTop: 8,
                  padding: "6px 8px",
                  borderRadius: "var(--radius-xs)",
                  border: "1px dashed var(--border)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                }}
                title="Wyłącznie orientacyjna podpowiedź wewnętrzna — nigdy niewysyłana do klienta."
              >
                Sugerowana cena (orientacyjnie, {moduleCount}{" "}
                {moduleCount === 1 ? "moduł" : "moduły"}): {estimate.toLocaleString("pl-PL")} zł
              </div>
            );
          })()}
        </div>

        {/* Notatki jakościowe — Cytaty klienta / Uwagi Agenta 1 / Uwagi Agenta 2, dotąd
            zapisywane wyłącznie do Notion bez żadnego miejsca do przeczytania ich w
            dashboardzie. Widoczne od razu, nie wymaga scrollowania w typowej karcie. */}
        {notatkiJakosciowe.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                marginBottom: 6,
                fontFamily: "var(--font-sans)",
              }}
            >
              Notatki jakościowe
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notatkiJakosciowe.map((n) => (
                <div
                  key={n.label}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--radius-xs)",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      marginBottom: 3,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {n.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-sans)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {n.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

// ── Main ─────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [clients, setClients] = useState<PipelineClientDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PipelineClientDetailed | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeDragClient, setActiveDragClient] = useState<PipelineClientDetailed | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

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

  // Supabase Realtime: subskrypcja na public.pipeline (replikacja włączona przez Michała) —
  // każda zmiana (dowolna sesja, dowolny użytkownik) odświeża lokalny stan bez przeładowania
  // strony. Debounce 400ms, żeby seria szybkich zmian (np. bulk update) nie odpalała refetcha
  // przy każdym evencie z osobna.
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("pipeline-kanban")
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline" }, () => {
        if (realtimeDebounce.current) clearTimeout(realtimeDebounce.current);
        realtimeDebounce.current = setTimeout(() => void load(), 400);
      })
      .subscribe();
    return () => {
      if (realtimeDebounce.current) clearTimeout(realtimeDebounce.current);
      void supabase.removeChannel(channel);
    };
  }, [load]);

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = useCallback(
    (event: { active: { id: string | number } }) => {
      const client = clients.find((c) => c.id === String(event.active.id));
      setActiveDragClient(client ?? null);
    },
    [clients],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragClient(null);
      const { active, over } = event;
      if (!over) return;
      const clientId = String(active.id);
      const newStatus = String(over.id);
      const client = clients.find((c) => c.id === clientId);
      if (!client || client.status === newStatus) return;

      // Obrona w głębi — serwer i tak weryfikuje to samo, ale bez tego karta wizualnie
      // "wskoczy" do zablokowanej kolumny na chwilę przed odrzuceniem przez API.
      if (
        KANBAN_LOCKED_STATUSES.includes(client.status) ||
        KANBAN_LOCKED_STATUSES.includes(newStatus)
      ) {
        showToast(LOCKED_DRAG_MESSAGE);
        return;
      }

      const prevStatus = client.status;
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c)));

      fetch(`/api/pipeline/${clientId}/kanban-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
        .then(async (res) => {
          const data = (await res.json()) as { success: boolean; error?: string };
          if (!data.success) {
            setClients((prev) =>
              prev.map((c) => (c.id === clientId ? { ...c, status: prevStatus } : c)),
            );
            showToast(data.error ?? "Nie udało się zmienić statusu");
          }
        })
        .catch(() => {
          setClients((prev) =>
            prev.map((c) => (c.id === clientId ? { ...c, status: prevStatus } : c)),
          );
          showToast("Błąd połączenia z serwerem");
        });
    },
    [clients, showToast],
  );

  // Blok 1, punkt 1.5 — utracone leady domyślnie ukryte z Kanbanu (żeby nie zaśmiecały
  // aktywnego pipeline'u), ale zawsze możliwe do przywrócenia jednym przełącznikiem —
  // "filtrowalne, nie znikające cicho", zgodnie z założeniem.
  const [showUtracone, setShowUtracone] = useState(false);
  const visibleClients = showUtracone ? clients : clients.filter((c) => !c.utracony);
  const utraconeCount = clients.filter((c) => c.utracony).length;

  const grouped = KANBAN_VISIBLE_STATUSES.reduce<Record<string, PipelineClientDetailed[]>>(
    (acc, s) => {
      const bucket = visibleClients.filter((c) => c.status === s);
      bucket.sort((a, b) => {
        const cmp = a.firma.localeCompare(b.firma, "pl", { sensitivity: "base" });
        return sortDirection === "asc" ? cmp : -cmp;
      });
      acc[s] = bucket;
      return acc;
    },
    {},
  );

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
          <div
            title="Kanban aktualizuje się na żywo dla wszystkich (Supabase Realtime)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              border: "1px solid var(--success-border)",
              background: "var(--success-bg)",
              borderRadius: "var(--radius-xs)",
              color: "var(--success-text)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
            }}
          >
            <Radio size={11} />
            Live
          </div>
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
                color: showUtracone ? "var(--error-text)" : "var(--text-secondary)",
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
      <div style={{ flex: 1, overflow: "hidden", display: "flex", position: "relative" }}>
        {/* Kanban — jeden poziomy rząd, scroll w poziomie */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
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
              <span
                style={{ fontSize: 13, color: "var(--error-text)", fontFamily: "var(--font-sans)" }}
              >
                {error}
              </span>
              <Button variant="secondary" size="sm" onClick={() => void load()}>
                Spróbuj ponownie
              </Button>
            </div>
          ) : (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flex: 1,
                  minHeight: 0,
                  overflowX: "auto",
                  overflowY: "hidden",
                  paddingBottom: 4,
                }}
              >
                {KANBAN_VISIBLE_STATUSES.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    clients={grouped[status] ?? []}
                    draggable={KANBAN_DRAGGABLE_STATUSES.includes(status)}
                    onClientClick={(c) => setSelected(c)}
                    onIncrement={handleIncrementProby}
                    onDragAttempt={() => showToast(LOCKED_DRAG_MESSAGE)}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeDragClient ? (
                  <ClientCard client={activeDragClient} onClick={() => {}} onIncrement={() => {}} />
                ) : null}
              </DragOverlay>
            </DndContext>
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

        {/* Toast — komunikat o zablokowanym przeciągnięciu / błędzie zmiany statusu */}
        {toast && (
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "8px 14px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--warning-border)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-elevated)",
              color: "var(--warning-text)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              zIndex: 20,
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
