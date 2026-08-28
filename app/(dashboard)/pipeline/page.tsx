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
  ArrowUpAZ,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Radio,
  RefreshCw,
  Search,
  UserX,
  X,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type PipelineClientDetailed, SKRYPT_V4_DATA } from "@/app/api/notion/pipeline/route";
import { ContactAttemptsBadge } from "@/components/clients/ContactAttemptsBadge";
import { Button } from "@/components/ui/Button";
import { formatPhone } from "@/lib/format/phone";
import { DASHBOARD_ZARZADCZY_LABEL, MODULE_CATALOG } from "@/lib/scripts/moduleCatalog";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  KANBAN_DRAGGABLE_STATUSES,
  KANBAN_GROUPS,
  KANBAN_LOCKED_STATUSES,
} from "@/lib/supabase/pipelineKanban";

// ── Constants ────────────────────────────────────────────────────────

// Blok 1, punkt 1.4 — klucz localStorage dla kierunku sortowania kart w kolumnach Kanbanu.
const PIPELINE_SORT_KEY = "autorise_pipeline_sort_direction";

// Płaska lista wszystkich statusów widocznych na Kanbanie, wyprowadzona z KANBAN_GROUPS —
// jedno źródło prawdy, żeby grupowanie i lista statusów nigdy się nie rozjechały.
const ALL_VISIBLE_STATUSES = KANBAN_GROUPS.flatMap((g) => g.statuses);

function pluralKarty(n: number): string {
  if (n === 1) return "karta";
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return "karty";
  return "kart";
}

// Pole "Moduły wdrażane" (Batch 6, 2026-07-26) nie istniało wcześniej na karcie klienta —
// dotąd żadne miejsce nie zapisywało które moduły faktycznie wdraża się dla danego klienta.
// MODULE_CATALOG samo wydzielone do lib/scripts/moduleCatalog.ts (2026-07-26), bo /wdrozenie
// potrzebuje tych samych etykiet dla tabeli czasu bazowego per moduł.

const STATUS_COLORS: Record<string, string> = {
  "Nowy lead": "#3b82f6",
  Kwalifikacja: "#c026d3",
  "Discovery umówione": "#06b6d4",
  Niekwalifikowany: "#6b7280",
  "Nieaktywny (follow up)": "#eab308",
  Finalizacja: "#f97316",
  Kickoff: "#22c55e",
  Wdrożenie: "#14b8a6",
  Retainer: "#e879f9",
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

// Re-engagement "do kontaktu" — dziś lub data przeszła. Porównanie po dniu kalendarzowym
// (nie pełnym timestampie), żeby data ustawiona na "dziś rano" nie wypadała z listy po
// południu tego samego dnia.
function isReengagementDue(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() <= today.getTime();
}

// Dni w etapie: liczone od pierwszego kontaktu (najbardziej stabilny sygnał "jak długo karta
// czeka"), z fallbackiem na datę następnego kroku gdy pierwszy kontakt nieznany — model danych
// nie ma osobnego znacznika czasu wejścia w konkretny status.
function daysInStage(client: PipelineClientDetailed): number | null {
  const primary = daysSince(client.dataPierwszegoKontaktu);
  return primary ?? daysSince(client.dataFollowup);
}

// "55 d" → "55 dni temu" (feedback 2026-08-24: skrót nieczytelny na pierwszy rzut oka).
function daysAgoLabel(n: number): string {
  if (n === 0) return "dziś";
  if (n === 1) return "1 dzień temu";
  return `${n} dni temu`;
}

// "Cytaty klienta" — surowy tekst z jednym wpisem na linię, cytat i adnotacja rozdzielone
// "|||". Wpis bez separatora (starsze dane sprzed tego formatu) wyświetla się jako sam cytat,
// bez adnotacji, zamiast znikać albo wywalać się na parsowaniu.
function parseCytaty(raw: string): { cytat: string; adnotacja: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [cytat, adnotacja = ""] = line.split("|||").map((s) => s.trim());
      return { cytat, adnotacja };
    });
}

// "Uwagi Agenta 1/2" — jedna ściana tekstu z numeracją "1. 2. 3." wewnątrz, bez podziału linii.
// Rozdziel przed każdym numerem punktu (nie na kropce w ogóle, żeby nie ciąć zdań w środku).
function parseUwagi(raw: string): string[] {
  return raw
    .split(/\s+(?=\d+\.\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Mały przycisk kopiowania obok telefonu/e-maila w karcie — osobny stan "skopiowano" per
// instancja, stopPropagation żeby nie otwierał panelu bocznego karty pod spodem.
function CopyIconButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Kopiuj"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        marginLeft: "auto",
        padding: 0,
        border: "none",
        background: "transparent",
        color: copied ? "var(--success-text)" : "var(--text-secondary)",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {copied ? <CheckCircle2 size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2.5} />}
    </button>
  );
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
        // Karta ciemniejsza niż jaśniejsze tło strony (--bg-elevated) — hierarchia odwrócona
        // względem poprzedniej wersji, karty mają wyraźnie odcinać się od jaśniejszego płótna,
        // nie wtapiać się w nie. Obwódka celowo jaśniejsza niż domyślny --border (8% biały,
        // praktycznie niewidoczny) — feedback 2026-08-24: karty miały wyglądać wyraźnie
        // obramowane na biało, nie wtopione w tło.
        background: "var(--bg)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.22)"}`,
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        transition: "box-shadow 120ms, border-color 120ms",
        boxShadow: hovered ? "var(--shadow-card)" : "var(--shadow-sm)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {/* Kropka koloru statusu zamiast inicjałów — czysto dekoracyjna, bez tekstu (feedback
            2026-08-24: inicjały nie dodawały informacji, obwódka+tint były za słabo widoczne). */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
        {/* Ikona przekreślonego użytkownika dla utraconych leadów — feedback 2026-08-24.
            Świadomie NIE przenosimy karty do osobnej grupy/kolumny: lead może zostać utracony
            na dowolnym etapie (Nowy lead równie dobrze jak Finalizacja), a status realnie
            pokazuje GDZIE odpadł — to cenna informacja, którą zbiorcza "grupa utraconych"
            by zgubiła. Filtr "Utracone (N)" w headerze już realizuje "oddzielną listę"
            (domyślnie ukryte, jeden przełącznik pokazuje wszystkie) — ta ikona to dodatkowy,
            natychmiastowy sygnał wizualny, gdy filtr jest włączony. */}
        {client.utracony && (
          <UserX size={14} strokeWidth={2.5} color="var(--error-text)" style={{ flexShrink: 0 }} />
        )}
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

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {client.jestTestowy && (
          <span
            style={{
              display: "inline-block",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--accent-text)",
              background: "var(--accent-muted)",
              border: "1px solid var(--accent-border)",
              borderRadius: "var(--radius-xs)",
              padding: "1px 5px",
              marginBottom: 4,
            }}
          >
            Test
          </span>
        )}
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
      </div>

      {/* Nazwa firmy pod imieniem/nazwiskiem, tym samym stylem co telefon/e-mail niżej —
          feedback 2026-08-24: poprzednia wersja (ClientCompanyLine, 11px text-tertiary,
          bez ikony) była praktycznie niewidoczna, wyglądała jak ledwo widoczny podpis
          zamiast realnej informacji. Pokazujemy tylko gdy firma różni się od kontaktu
          (osoby) na górze karty — bez tego dublowalibyśmy tę samą wartość dwa razy. */}
      {client.firma && client.kontakt && client.firma !== client.kontakt && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "var(--bg-elevated)",
              border: "1px solid rgba(255,255,255,0.22)",
              flexShrink: 0,
            }}
          >
            <Building2 size={13} strokeWidth={2.75} color="#ffffff" />
          </div>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {client.firma}
          </span>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
        {client.ocenaICP && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--accent-text)",
              background: "var(--accent-muted)",
              padding: "3px 7px",
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
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-primary)",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              padding: "3px 7px",
              borderRadius: "var(--radius-xs)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <Clock size={13} strokeWidth={2.75} color="#ffffff" />
            {daysAgoLabel(days)}
          </span>
        )}
      </div>

      {(client.telefon || client.email) && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginTop: 8,
            paddingTop: 6,
            borderTop: "1px solid var(--border)",
          }}
        >
          {client.telefon && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--bg-elevated)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  flexShrink: 0,
                }}
              >
                <Phone size={13} strokeWidth={2.75} color="#ffffff" fill="currentColor" />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {formatPhone(client.telefon)}
              </span>
              <CopyIconButton value={formatPhone(client.telefon)} />
            </div>
          )}
          {client.email && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--bg-elevated)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  flexShrink: 0,
                }}
              >
                <Mail size={13} strokeWidth={2.75} color="#ffffff" />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                {client.email}
              </span>
              <CopyIconButton value={client.email} />
            </div>
          )}
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
  // Karta testowa (jest_testowy) wykluczona z licznika i sumy — demo, nie realny biznes.
  const realClients = clients.filter((c) => !c.jestTestowy);
  const sumPln = realClients.reduce((acc, c) => acc + (c.cenaWdrozenia || 0), 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // +15% wg feedbacku (240 → 276) — karty klienta w kolumnie miały wygodniej mieścić
        // treść (firma, kontakt, tagi), ten sam zabieg co wcześniej przy panelu bocznym
        // (340 → 391, patrz ClientSidebar niżej).
        minWidth: 276,
        width: 276,
        flexShrink: 0,
      }}
    >
      {/* Column header — etykieta statusu jako kolorowa plakietka (kolor z STATUS_COLORS,
          ten sam co kropka na karcie/badge ICP), nie płaski szary tekst (feedback 2026-08-24:
          "żeby się znacząco wyróżniało, ale pasowało do wszystkiego" — reużywa istniejący
          system kolorów statusów zamiast nowej palety). */}
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
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 9px",
            borderRadius: "var(--radius-sm)",
            background: `${color}26`,
            border: `1px solid ${color}70`,
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }}
          />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 800,
              // Tekst biały, nie kolor statusu — feedback 2026-08-24: tło+obwódka zostają
              // kolorowe (jak dotąd), sam napis ma być biały dla lepszego kontrastu.
              color: "var(--text-primary)",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {status}
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-secondary)",
            background: "var(--bg)",
            padding: "1px 6px",
            borderRadius: "var(--radius-xs)",
            border: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {realClients.length}
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

      {/* Cards — wysokość STAŁA (nie max-height zależny od zawartości), żeby wszystkie kolumny
          w rzędzie miały identyczną wysokość niezależnie od liczby kart (feedback 2026-08-24:
          kolumna z 40 kartami rozjeżdżała cały rząd względem sąsiadów z 0-1 kartą). Mieści
          2 PEŁNE karty bez przycięcia (nawet z e-mailem/telefonem/plakietką Test/Utracony —
          najbardziej rozbudowany realny wariant), reszta scrolluje. Droppable gdy kolumna jest
          częścią grupy przeciągalnej. */}
      <div
        className="pipeline-kanban-scroll"
        ref={draggable ? setNodeRef : undefined}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          overflowY: "auto",
          // 310px wciąż przycinało dolną obwódkę drugiej karty przy pełnej treści
          // (plakietka Test + linia firmy + ICP/dni + telefon + e-mail) — realny wzorzec z
          // feedbacku 2026-08-24. Podniesione z zapasem, żeby dwie najbardziej rozbudowane
          // karty zawsze mieściły się w całości. 380→410: linia firmy dostała pełny wiersz
          // z ikoną (jak telefon/e-mail) zamiast małego podpisu bez ikony, karta urosła.
          height: 410,
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

// Pole tożsamości klienta (Firma/Kontakt/Telefon/E-mail) edytowalne inline — klik przełącza
// na input, zapis na blur, ten sam wzorzec co Notatka zespołu / Powód utraty.
function EditableField({
  label,
  value,
  onSave,
  disabled,
}: {
  label: string;
  value: string;
  onSave: (next: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  return (
    <div>
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
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          disabled={disabled}
          style={{
            width: "100%",
            padding: "3px 6px",
            margin: "-3px -6px",
            borderRadius: "var(--radius-xs)",
            border: "1px solid var(--accent-border)",
            background: "var(--bg-elevated)",
            fontSize: 13,
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
            boxSizing: "border-box",
          }}
        />
      ) : (
        <div
          onClick={() => !disabled && setEditing(true)}
          style={{
            fontSize: 13,
            color: value ? "var(--text-primary)" : "var(--text-placeholder)",
            fontFamily: "var(--font-sans)",
            cursor: disabled ? "default" : "text",
            padding: "3px 6px",
            margin: "-3px -6px",
            borderRadius: "var(--radius-xs)",
          }}
        >
          {value || "—"}
        </div>
      )}
    </div>
  );
}

// ── Side panel ───────────────────────────────────────────────────────

function ClientPanel({
  client,
  onClose,
  onUpdated,
  onMarkedUtracony,
}: {
  client: PipelineClientDetailed;
  onClose: () => void;
  onUpdated: () => void;
  onMarkedUtracony: () => void;
}) {
  const color = STATUS_COLORS[client.status] ?? "var(--text-tertiary)";
  const [powodDraft, setPowodDraft] = useState(client.powodUtraty);
  const [reEngagementDraft, setReEngagementDraft] = useState(client.dataReengagement);
  const [notatkiDraft, setNotatkiDraft] = useState(client.notatki);
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
          ...(next ? {} : { powodUtraty: null, dataReengagement: null }),
        }),
      });
      onUpdated();
      // Feedback 2026-08-24 — "co się dzieje z utraconym leadem, nagle zniknął": utracone
      // leady są domyślnie ukryte z Kanbanu (showUtracone), więc karta faktycznie znika z
      // widoku natychmiast po zaznaczeniu. To zamierzone (Blok 1, punkt 1.5), ale bez
      // wyjaśnienia wygląda jak błąd — toast tłumaczy co się stało i jak to cofnąć.
      if (next) onMarkedUtracony();
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

  const saveReEngagement = async (next: string) => {
    setReEngagementDraft(next);
    if (next === client.dataReengagement) return;
    setSaving(true);
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: client.id, dataReengagement: next || null }),
      });
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const saveNotatki = async () => {
    if (notatkiDraft === client.notatki) return;
    setSaving(true);
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: client.id, notatki: notatkiDraft }),
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

  // Pola tożsamości (Firma/Kontakt/Telefon/E-mail/NIP) edytowalne inline przez EditableField —
  // jeden generyczny zapis, pole PATCH nazwane 1:1 jak klucz body /api/notion/pipeline-update.
  // NIP dołączony 2026-08-24 (feedback: był tylko do odczytu w sekcji "rows" niżej, mimo że
  // kolumna Supabase i endpoint PATCH już dawno istniały dla pozostałej trójki).
  const saveField = (field: "firma" | "kontakt" | "telefon" | "email" | "nip", value: string) => {
    setSaving(true);
    fetch("/api/notion/pipeline-update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: client.id, [field]: value }),
    })
      .then(() => onUpdated())
      .finally(() => setSaving(false));
  };

  const cytaty = client.cytatyKlienta ? parseCytaty(client.cytatyKlienta) : [];
  const uwagiAgenta1 = client.uwagiAgenta1 ? parseUwagi(client.uwagiAgenta1) : [];
  const uwagiAgenta2 = client.uwagiFAgent2 ? parseUwagi(client.uwagiFAgent2) : [];

  const rows = [
    { label: "Status", value: client.status },
    { label: "Ocena ICP", value: client.ocenaICP },
    { label: "Data discovery", value: client.dataDiscovery ? fmtDate(client.dataDiscovery) : "" },
    { label: "Następny krok", value: client.nastepnyKrok },
    { label: "Ostatnia zmiana", value: client.lastModified ? fmtDate(client.lastModified) : "" },
  ].filter((r) => r.value);

  return (
    <div
      style={{
        // +15% wg feedbacku 2026-08-24 (340 → 391).
        width: 391,
        minWidth: 391,
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
            color: "var(--text-primary)",
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div
        className="pipeline-kanban-scroll"
        style={{ padding: "14px 16px", flex: 1, overflowY: "auto" }}
      >
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

        {/* Notatka zespołu — pierwsza rzecz widoczna pod plakietkami statusu, zapis na blur
            (ten sam wzorzec co powodDraft/savePowod), pole "notatki" już istniejące w Supabase. */}
        <div style={{ marginBottom: 16 }}>
          <textarea
            value={notatkiDraft}
            onChange={(e) => setNotatkiDraft(e.target.value)}
            onBlur={() => void saveNotatki()}
            placeholder="Notatka zespołu (np. pamiętaj...)"
            disabled={saving}
            style={{
              width: "100%",
              minHeight: 44,
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
        </div>

        {/* "System Autorise" — jedna linijka na moduł, kolor zielony/czerwony wg obecności w
            moduleWdrazane, klik przełącza (toggleModule, bez zmian). Dashboard zarządczy
            zawsze zielony i nieklikalny — nie jest opcją, wchodzi w każde wdrożenie (patrz
            komentarz przy DASHBOARD_ZARZADCZY_LABEL w lib/scripts/moduleCatalog.ts).
            Feedback 2026-08-24: moduły są realnie ustalane dopiero PO rozmowie kwalifikacyjnej
            (agent nadaje kolejny status: Kwalifikacja/Niekwalifikowany/Nieaktywny) — status
            "Nowy lead" oznacza że rozmowa jeszcze się nie odbyła, więc pokazywanie w tym
            momencie 3 modułów jako "wyłączone" (czerwone) fałszywie sugerowało decyzję, która
            jeszcze nie zapadła. Dla "Nowy lead" honest fallback zamiast pełnej listy. */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 6,
              fontFamily: "var(--font-sans)",
            }}
          >
            System Autorise
          </div>
          {client.status === "Nowy lead" ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-sans)",
                fontStyle: "italic",
              }}
            >
              Moduły do ustalenia po rozmowie kwalifikacyjnej
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {MODULE_CATALOG.map((m, i) => {
                const active = (client.moduleWdrazane ?? []).includes(m.code);
                const moduleColor = active ? "var(--success-text)" : "var(--error-text)";
                return (
                  <div
                    key={m.code}
                    onClick={() => !saving && void toggleModule(m.code)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "3px 2px",
                      cursor: saving ? "default" : "pointer",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: moduleColor,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: moduleColor,
                        fontFamily: "var(--font-sans)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      Moduł {i + 1}: {m.label}
                    </span>
                  </div>
                );
              })}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 2px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--success-text)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--success-text)",
                    fontFamily: "var(--font-sans)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {DASHBOARD_ZARZADCZY_LABEL} — zawsze w zakresie
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Cytaty klienta — pary [cytat, adnotacja] rozdzielone "|||", każda para osobnym
            blokiem (cytat wyróżniony lewym borderem, adnotacja pod nim drugorzędnym tekstem).
            Dotąd renderowane jako jedna ściana surowego tekstu. */}
        {cytaty.length > 0 && (
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
              Cytaty klienta
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cytaty.map((c, i) => (
                <div
                  key={`${i}-${c.cytat.slice(0, 20)}`}
                  style={{ borderLeft: "2px solid var(--accent-border)", paddingLeft: 8 }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontStyle: "italic",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    „{c.cytat}”
                  </div>
                  {c.adnotacja && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        marginTop: 2,
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {c.adnotacja}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uwagi Agenta 1/2 — rozdzielone na osobne punkty (dotąd jedna ściana tekstu z
            numeracją "1. 2. 3." wewnątrz, bez podziału linii). */}
        {[
          { label: "Uwagi Agenta 1", points: uwagiAgenta1 },
          { label: "Uwagi Agenta 2", points: uwagiAgenta2 },
        ]
          .filter((s) => s.points.length > 0)
          .map((section) => (
            <div key={section.label} style={{ marginBottom: 16 }}>
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
                {section.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {section.points.map((point, i) => (
                  <div
                    key={`${section.label}-${i}`}
                    style={{
                      fontSize: 12,
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-sans)",
                      lineHeight: 1.5,
                    }}
                  >
                    {point}
                  </div>
                ))}
              </div>
            </div>
          ))}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
          <EditableField
            label="Firma"
            value={client.firma}
            onSave={(v) => saveField("firma", v)}
            disabled={saving}
          />
          <EditableField
            label="Kontakt"
            value={client.kontakt}
            onSave={(v) => saveField("kontakt", v)}
            disabled={saving}
          />
          <EditableField
            label="Telefon"
            value={client.telefon}
            onSave={(v) => saveField("telefon", v)}
            disabled={saving}
          />
          <EditableField
            label="E-mail"
            value={client.email}
            onSave={(v) => saveField("email", v)}
            disabled={saving}
          />
          <EditableField
            label="NIP"
            value={client.nip}
            onSave={(v) => saveField("nip", v)}
            disabled={saving}
          />
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
          {client.utracony && (
            <div style={{ marginTop: 8 }}>
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
                Wróć do tego kiedy
              </div>
              <input
                type="date"
                lang="pl-PL"
                value={reEngagementDraft ? reEngagementDraft.slice(0, 10) : ""}
                onChange={(e) => void saveReEngagement(e.target.value)}
                disabled={saving}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-xs)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-primary)",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
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
            <ExternalLink size={14} strokeWidth={2.5} />
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
              color: linkCopied ? "var(--success-text)" : "var(--text-primary)",
              background: "transparent",
              padding: "6px 10px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
          >
            {linkCopied ? (
              <CheckCircle2 size={14} strokeWidth={2.5} />
            ) : (
              <Copy size={14} strokeWidth={2.5} />
            )}
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

  // Utracone leady z Re-engagement na dziś lub datę przeszłą — "do kontaktu teraz", nie
  // wszystkie utracone. Liczone z pełnej listy clients (nie visibleClients), bo ma być
  // widoczne niezależnie od tego czy showUtracone jest akurat włączone.
  const reengagementDueCount = clients.filter(
    (c) => c.utracony && isReengagementDue(c.dataReengagement),
  ).length;

  // Wyszukiwarka nagłówka — czysto client-side, dane już wczytane. Puste pole = brak filtra.
  // Filtruje po firma/kontakt, częściowe dopasowanie, bez uwzględniania wielkości liter.
  const [searchQuery, setSearchQuery] = useState("");
  const searchedClients = searchQuery.trim()
    ? visibleClients.filter((c) => {
        const q = searchQuery.trim().toLowerCase();
        return c.firma.toLowerCase().includes(q) || c.kontakt.toLowerCase().includes(q);
      })
    : visibleClients;

  // Karta testowa (jest_testowy, patrz scripts/seed-test-pipeline-clients.mjs) zawsze
  // pinowana jako PIERWSZA w swojej kolumnie, przed sortowaniem realnych kart A-Z/Z-A —
  // demonstracyjny wzorzec, nie realny lead, więc nie powinien "pływać" po alfabecie.
  const grouped = ALL_VISIBLE_STATUSES.reduce<Record<string, PipelineClientDetailed[]>>(
    (acc, s) => {
      const bucket = searchedClients.filter((c) => c.status === s);
      const testowe = bucket.filter((c) => c.jestTestowy);
      const realne = bucket.filter((c) => !c.jestTestowy);
      realne.sort((a, b) => {
        const cmp = a.firma.localeCompare(b.firma, "pl", { sensitivity: "base" });
        return sortDirection === "asc" ? cmp : -cmp;
      });
      acc[s] = [...testowe, ...realne];
      return acc;
    },
    {},
  );

  // Licz z searchedClients (respektuje filtr utraconych + wyszukiwarkę), nie z pełnej clients
  // — inaczej liczba w nagłówku przestrzeliwała sumę kart faktycznie widocznych w kolumnach
  // Kanbanu. jest_testowy zawsze wykluczony — to dane demonstracyjne, nie realny biznes.
  const totalActive = searchedClients.filter(
    (c) => !c.jestTestowy && c.status !== "Niekwalifikowany",
  ).length;

  // Sekcje grup Kanbanu (patrz KANBAN_GROUPS) posortowane malejąco wg liczby kart — grupa z
  // największym ruchem zawsze na górze, "Nieaktywne" naturalnie spada na dół gdy jest małe.
  // Przeliczane na żywo z searchedClients, nie sztywna kolejność. jest_testowy wykluczony z
  // liczników (patrz totalActive wyżej).
  const groupsWithCounts = KANBAN_GROUPS.map((g) => {
    const count = g.statuses.reduce(
      (sum, s) => sum + (grouped[s]?.filter((c) => !c.jestTestowy).length ?? 0),
      0,
    );
    const sumPln = g.statuses.reduce(
      (sum, s) =>
        sum +
        (grouped[s] ?? [])
          .filter((c) => !c.jestTestowy)
          .reduce((a, c) => a + (c.cenaWdrozenia || 0), 0),
      0,
    );
    return { ...g, count, sumPln };
  }).sort((a, b) => b.count - a.count);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-elevated)",
      }}
    >
      {/* Header — dwuwierszowy, celowo osobny od współdzielonego PageHeader (48px, jeden
          wiersz): tytuł/licznik mają być czytelne z drugiej strony pokoju, pasek narzędzi
          (Live/Utracone/Sortowanie/Odśwież) osobnym, spójnym rzędem pod spodem, nie stłoczony
          po prawej stronie tytułu. */}
      <div
        style={{
          flexShrink: 0,
          padding: "16px 20px 12px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-sans)",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Pipeline
          </h1>
          {!loading && (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              Aktywnych klientów: {totalActive}
            </span>
          )}
        </div>

        <div
          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}
        >
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
            <Radio size={14} strokeWidth={2.5} fill="currentColor" />
            Live
          </div>
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
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              cursor: "pointer",
              color: "var(--text-primary)",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
            }}
          >
            {sortDirection === "asc" ? (
              <ArrowDownAZ size={14} strokeWidth={2.5} />
            ) : (
              <ArrowUpAZ size={14} strokeWidth={2.5} />
            )}
            {sortDirection === "asc" ? "A-Z" : "Z-A"}
          </button>
          {/* Wyszukiwarka firma/kontakt — czysto client-side (dane już wczytane), obok
              Odśwież per feedback. Ikona Search w środku pola zamiast osobnego przycisku. */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Search
              size={14}
              strokeWidth={2.5}
              color="var(--text-tertiary)"
              style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj firma / kontakt..."
              style={{
                width: 200,
                padding: "5px 10px 5px 30px",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xs)",
                color: "var(--text-primary)",
                fontSize: 12,
                fontFamily: "var(--font-sans)",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xs)",
              cursor: loading ? "default" : "pointer",
              color: "var(--text-primary)",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
            }}
          >
            <RefreshCw
              size={14}
              strokeWidth={2.5}
              style={loading ? { animation: "spin 1s linear infinite" } : undefined}
            />
            Odśwież
          </button>
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
                background: showUtracone ? "var(--error-bg)" : "var(--bg)",
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
          {/* Plakietka "do kontaktu" — osobna od "Utracone (N)": tamten pokazuje WSZYSTKIE
              utracone, ta tylko te z Re-engagement na dziś/przeszłość, czyli realnie pilne.
              Klik włącza widoczność utraconych (jeśli wyłączona) — bez podświetlania
              konkretnych kart w gridzie, świadomie uproszczone na tę rundę. */}
          {reengagementDueCount > 0 && (
            <button
              onClick={() => {
                if (!showUtracone) setShowUtracone(true);
              }}
              title="Utracone leady z terminem powrotu do kontaktu dziś lub wcześniej"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                background: "var(--warning-bg)",
                border: "1px solid var(--warning-border)",
                borderRadius: "var(--radius-xs)",
                cursor: "pointer",
                color: "var(--warning-text)",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
              }}
            >
              {reengagementDueCount} do kontaktu
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .pipeline-kanban-scroll {
          /* --border to 8% biały, praktycznie niewidoczny jako scrollbar — feedback
             2026-08-24: scrollbary mają być wyraźnie widoczne, na biało. */
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.45) transparent;
        }
        .pipeline-kanban-scroll::-webkit-scrollbar {
          height: 9px;
          width: 9px;
        }
        .pipeline-kanban-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .pipeline-kanban-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.45);
          border-radius: var(--radius-xs);
        }
        .pipeline-kanban-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.7);
        }
      `}</style>

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", position: "relative" }}>
        {/* Kanban — sekcje grup (patrz KANBAN_GROUPS) ułożone pionowo jedna pod drugą,
            posortowane wg liczby kart malejąco, strona przewija się w pionie. Wewnątrz każdej
            sekcji kolumny statusu w poziomym rzędzie, jak dotąd. */}
        <div
          className="pipeline-kanban-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "16px 20px",
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
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                {groupsWithCounts.map((group, i) => (
                  <div key={group.key}>
                    {/* Divider między sekcjami grup (nie przed pierwszą) — feedback 2026-08-24,
                        czytelniejsze rozgraniczenie niż sam odstęp. */}
                    {i > 0 && (
                      <div
                        style={{
                          // 0.15 alpha praktycznie niewidoczne — feedback 2026-08-24.
                          height: 2,
                          background: "rgba(255,255,255,0.4)",
                          marginBottom: 22,
                        }}
                      />
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 20,
                          fontWeight: 800,
                          color: "var(--text-primary)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {group.label}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 15,
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {group.count} {pluralKarty(group.count)}
                        {group.sumPln > 0 ? ` · ${fmtPln(group.sumPln)}` : ""}
                      </span>
                    </div>
                    <div
                      className="pipeline-kanban-scroll"
                      style={{
                        display: "flex",
                        gap: 12,
                        overflowX: "auto",
                        paddingBottom: 4,
                      }}
                    >
                      {group.statuses.map((status) => (
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
                  </div>
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
            onMarkedUtracony={() =>
              showToast(
                'Klient oznaczony jako utracony — ukryty domyślnie. Przywróć przyciskiem "Utracone" w headerze.',
              )
            }
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
