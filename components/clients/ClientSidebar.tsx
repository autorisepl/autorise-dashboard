"use client";

import {
  ArrowDownAZ,
  ArrowUpAZ,
  Building2,
  ExternalLink,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { ClientContactDetails } from "@/components/clients/ClientContactDetails";

// Wydzielone 2026-07-18 z /kwalifikacja i /sprzedaz, gdzie ten sam panel żył jako dwie
// osobne, ręcznie zsynchronizowane kopie (świadoma decyzja z sesji 2026-07-15/16, "osobny
// punkt backlogu"). /wdrozenie i /utrzymanie dostały ten sam panel zamiast trzeciej/czwartej
// kopii — stąd realna ekstrakcja teraz. Zachowuje identyczny wygląd i mechanizm zwijania
// (ten sam klucz localStorage co wcześniej, więc stan zwinięcia jest teraz spójny między
// wszystkimi czterema zakładkami, nie tylko dwiema).
const CLIENT_SIDEBAR_COLLAPSE_KEY = "autorise_client_sidebar_collapsed";

interface ClientSidebarProps {
  clients: PipelineClientDetailed[];
  loading: boolean;
  selected: PipelineClientDetailed | null;
  onSelect: (c: PipelineClientDetailed | null) => void;
  onRefresh: () => void;
  /** Jeśli podane: lista zawężona do tych statusów. Gdy `groupByStatus` też podane,
   * kolejność tej tablicy determinuje kolejność sekcji. Bez tego pola panel pokazuje
   * wszystkich klientów płasko (przypadek /wdrozenie, /utrzymanie — jeszcze brak realnych
   * kart w docelowych statusach, prototyp musi dać się testować na dowolnym kliencie). */
  filterStatuses?: string[];
  /** Grupowanie sekcjami per status (wzorem /sprzedaz) zamiast płaskiej listy (wzorem
   * /kwalifikacja). Wymaga `filterStatuses` dla kolejności sekcji. */
  groupByStatus?: boolean;
  /** Kolory nagłówków sekcji w trybie groupByStatus, klucz = nazwa statusu. */
  statusColors?: Record<string, string>;
  /** Etykieta nagłówka w trybie płaskim (np. "Nowy lead"). Domyślnie "Klienci". */
  headerLabel?: string;
  /** Tekst pustej listy. */
  emptyLabel?: string;
  /** Id klientów, dla których zarejestrowano odbytą rozmowę kwalifikacyjną — zielona
   * plakietka na karcie klienta. */
  callDoneClientIds?: string[];
  /** Nazwa sprzedawcy per klient (klucz = client.id) — pokazywana wprost na karcie klienta. */
  sellerNameById?: Record<string, string>;
  /** Pokaż link "Otwórz prezentację" + "Odznacz klienta" na dole panelu (domyślnie tak).
   * W /kwalifikacja wyłączone — prezentacja jest dopiero na etapie sprzedaży, a odznaczasz
   * klienta klikając go ponownie na liście. */
  showPresentation?: boolean;
}

export function ClientSidebar({
  clients,
  loading,
  selected,
  onSelect,
  onRefresh,
  filterStatuses,
  groupByStatus = false,
  statusColors = {},
  headerLabel = "Klienci",
  emptyLabel = "Brak klientów",
  callDoneClientIds,
  sellerNameById,
  showPresentation = true,
}: ClientSidebarProps) {
  const callDoneSet = new Set(callDoneClientIds ?? []);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(CLIENT_SIDEBAR_COLLAPSE_KEY) === "true");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(CLIENT_SIDEBAR_COLLAPSE_KEY, String(next));
      return next;
    });
  };

  const filtered = clients
    .filter((c) => (filterStatuses ? filterStatuses.includes(c.status ?? "") : true))
    .filter((c) =>
      search.trim() ? `${c.kontakt} ${c.firma}`.toLowerCase().includes(search.toLowerCase()) : true,
    )
    .sort((a, b) => {
      const cmp = (a.kontakt || a.firma || "").localeCompare(b.kontakt || b.firma || "", "pl");
      return sortDir === "asc" ? cmp : -cmp;
    });

  const grouped = groupByStatus
    ? (filterStatuses ?? []).reduce<Record<string, PipelineClientDetailed[]>>((acc, s) => {
        acc[s] = filtered.filter((c) => c.status === s);
        return acc;
      }, {})
    : null;

  return (
    <div
      style={{
        width: collapsed ? 44 : 276,
        minWidth: collapsed ? 44 : 276,
        height: "100%",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-elevated)",
        position: "relative",
        transition:
          "width 240ms cubic-bezier(0.4, 0, 0.2, 1), min-width 240ms cubic-bezier(0.4, 0, 0.2, 1)",
        // Bez overflow:hidden na TYM poziomie — inaczej przycisk zwijania poniżej (celowo
        // wystający poza krawędź przy right:-15px, ten sam wzorzec co .sidebar-toggle-btn
        // głównego menu) jest przez to obcinany. Przycinanie treści listy podczas animacji
        // szerokości robi wewnętrzny wrapper niżej.
      }}
    >
      {/* Ten sam wzorzec co .sidebar-toggle-btn głównego menu (DashboardShell/globals.css) —
          okrągły przycisk, tokeny koloru, hover z akcentem (Blok "Arek" pkt 14, 2026-07-15). */}
      <button
        onClick={toggleCollapsed}
        title={collapsed ? "Rozwiń panel klienta" : "Zwiń panel klienta"}
        style={{
          position: "absolute",
          top: 11,
          right: collapsed ? 7 : -15,
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.42)",
          background: "var(--bg-elevated)",
          boxShadow: "var(--shadow-card)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-primary)",
          zIndex: 1,
          transition:
            "right 240ms cubic-bezier(0.4, 0, 0.2, 1), background 120ms, color 120ms, border-color 120ms, box-shadow 120ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--accent)";
          e.currentTarget.style.borderColor = "var(--accent-border)";
          e.currentTarget.style.boxShadow = "var(--shadow-elevated)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-primary)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.42)";
          e.currentTarget.style.boxShadow = "var(--shadow-card)";
        }}
      >
        {collapsed ? (
          <PanelLeft size={15} strokeWidth={2.5} />
        ) : (
          <PanelLeftClose size={15} strokeWidth={2.5} />
        )}
      </button>

      {/* Wewnętrzny wrapper: overflow:hidden tu (nie na kontenerze głównym), żeby przycinać
          treść listy podczas animacji szerokości bez obcinania wystającego przycisku wyżej. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {collapsed ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: 48,
              gap: 6,
            }}
          >
            <Users size={14} color="var(--text-tertiary)" />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-tertiary)",
              }}
            >
              {filtered.length}
            </span>
          </div>
        ) : (
          <>
            <div
              style={{
                padding: "12px 12px 8px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                {/* Plakietka statusu — ten sam wygląd co "Nowy lead" w /pipeline:
                    kolor akcentu z alfą, biała kropka, białe wersaliki.
                    Sortowanie i odświeżanie dosunięte tuż za plakietkę. */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    height: 30,
                    padding: "0 11px",
                    borderRadius: "var(--radius-sm)",
                    background: "#4379b126",
                    border: "1px solid #4379b170",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                  }}
                >
                  <span
                    style={{ width: 7, height: 7, borderRadius: "50%", background: "#ffffff" }}
                  />
                  {groupByStatus ? "Klienci" : headerLabel}
                  <span style={{ fontWeight: 700, opacity: 0.75 }}>{filtered.length}</span>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    title={sortDir === "asc" ? "Sortowanie A-Z" : "Sortowanie Z-A"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      height: 30,
                      padding: "0 9px",
                      background: "var(--bg)",
                      border: "1px solid rgba(255,255,255,0.42)",
                      borderRadius: "var(--radius-xs)",
                      cursor: "pointer",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {sortDir === "asc" ? (
                      <ArrowDownAZ size={15} strokeWidth={2.5} />
                    ) : (
                      <ArrowUpAZ size={15} strokeWidth={2.5} />
                    )}
                  </button>
                  <button
                    onClick={onRefresh}
                    disabled={loading}
                    title="Odśwież listę"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 30,
                      height: 30,
                      background: "var(--bg)",
                      border: "1px solid rgba(255,255,255,0.42)",
                      borderRadius: "var(--radius-xs)",
                      cursor: loading ? "not-allowed" : "pointer",
                      color: "var(--text-primary)",
                    }}
                  >
                    <RefreshCw
                      size={14}
                      strokeWidth={2.5}
                      style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
                    />
                  </button>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 32,
                  background: "var(--bg)",
                  border: "1px solid rgba(255,255,255,0.42)",
                  borderRadius: "var(--radius-xs)",
                  padding: "0 10px",
                }}
              >
                <Search size={13} strokeWidth={2.5} color="var(--text-primary)" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Szukaj klienta..."
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
              {groupByStatus && grouped
                ? (filterStatuses ?? []).map((status) => {
                    const group = grouped[status] ?? [];
                    if (!group.length) return null;
                    const color = statusColors[status] ?? "var(--text-tertiary)";
                    return (
                      <div key={status} style={{ marginBottom: 8 }}>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color,
                            padding: "3px 8px 4px",
                          }}
                        >
                          {status} ({group.length})
                        </div>
                        {group.map((c) => (
                          <ClientRow
                            key={c.id}
                            client={c}
                            selected={selected}
                            onSelect={onSelect}
                            callDone={callDoneSet.has(c.id)}
                            sellerName={sellerNameById?.[c.id] ?? null}
                          />
                        ))}
                      </div>
                    );
                  })
                : filtered.map((c) => (
                    <ClientRow
                      key={c.id}
                      client={c}
                      selected={selected}
                      onSelect={onSelect}
                      callDone={callDoneSet.has(c.id)}
                      sellerName={sellerNameById?.[c.id] ?? null}
                    />
                  ))}
              {filtered.length === 0 && (
                <div
                  style={{
                    padding: "20px 8px",
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                    fontSize: 12,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {emptyLabel}
                </div>
              )}
            </div>

            {selected && showPresentation && (
              <div
                style={{
                  padding: "12px",
                  borderTop: "1px solid var(--border)",
                  flexShrink: 0,
                  background: "var(--bg-hover)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <a
                  href={`/prezentacja.html?id=${encodeURIComponent(selected.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "var(--accent-muted)",
                    border: "1px solid var(--accent-border)",
                    borderRadius: 8,
                    padding: "6px 8px",
                    cursor: "pointer",
                    color: "var(--accent)",
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    textDecoration: "none",
                  }}
                >
                  <ExternalLink size={11} />
                  Otwórz prezentację
                </a>
                <button
                  onClick={() => onSelect(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-tertiary)",
                    fontSize: 11,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <X size={11} />
                  Odznacz klienta
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ContactAttemptsMeter({ proby }: { proby: number }) {
  const maxed = proby >= 3;
  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px solid rgba(255,255,255,0.42)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12.5,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-primary)",
        }}
      >
        Próby kontaktu
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {[1, 2, 3].map((n) => {
          const done = n <= proby;
          return (
            <span
              key={n}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: `1.5px solid ${done ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.42)"}`,
                background: done ? "var(--accent)" : "transparent",
                color: done ? "var(--text-on-accent)" : "var(--text-tertiary)",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              {n}
            </span>
          );
        })}
        {maxed && (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--error-text)",
              marginLeft: 2,
            }}
          >
            Wyślij SMS
          </span>
        )}
      </div>
    </div>
  );
}

function ClientRow({
  client,
  selected,
  onSelect,
  callDone,
  sellerName,
}: {
  client: PipelineClientDetailed;
  selected: PipelineClientDetailed | null;
  onSelect: (c: PipelineClientDetailed | null) => void;
  callDone?: boolean;
  sellerName?: string | null;
}) {
  const isSelected = selected?.id === client.id;
  const [hovered, setHovered] = useState(false);
  const showCompany =
    client.firma && client.kontakt && client.firma !== client.kontakt ? client.firma : null;
  return (
    <div
      onClick={() => onSelect(isSelected ? null : client)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "11px 12px",
        borderRadius: "var(--radius-sm)",
        marginBottom: 6,
        cursor: "pointer",
        background: isSelected ? "rgba(67, 121, 177, 0.12)" : "var(--bg)",
        border: `1px solid ${
          isSelected
            ? "rgba(67, 121, 177, 0.55)"
            : hovered
              ? "rgba(255,255,255,0.4)"
              : "rgba(255,255,255,0.42)"
        }`,
        boxShadow: hovered || isSelected ? "var(--shadow-card)" : "var(--shadow-sm)",
        transition: "border-color 120ms, box-shadow 120ms",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: "var(--text-primary)",
        }}
      >
        {client.kontakt || client.firma || "—"}
      </div>

      {callDone && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.42)",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: "var(--radius-xs)",
              background: "var(--success-bg)",
              border: "1px solid rgba(255,255,255,0.5)",
              color: "var(--success-text)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Rozmowa odbyta
          </span>
        </div>
      )}

      {(showCompany || client.telefon || client.email) && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.42)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {showCompany && (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "var(--bg-elevated)",
                  border: "1px solid rgba(255,255,255,0.42)",
                  flexShrink: 0,
                }}
              >
                <Building2 size={11} strokeWidth={2.5} color="var(--text-primary)" />
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                {showCompany}
              </span>
            </div>
          )}
          <ClientContactDetails client={client} />
        </div>
      )}
      {typeof client.liczbaProb === "number" && client.liczbaProb > 0 && (
        <ContactAttemptsMeter proby={client.liczbaProb} />
      )}
      {sellerName && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid rgba(255,255,255,0.42)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "var(--accent)",
              border: "1px solid rgba(255,255,255,0.5)",
              flexShrink: 0,
            }}
          >
            <User size={12} strokeWidth={2.5} color="var(--text-on-accent)" />
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              Sprzedawca
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {sellerName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
