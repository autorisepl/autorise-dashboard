"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FlaskConical,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { ClientCompanyLine, ClientContactDetails } from "@/components/clients/ClientContactDetails";
import { TEST_CLIENT } from "@/lib/demo/testClient";

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
  /** Kolory nagłówków sekcji w trybie groupByStatus i odznaki statusu przy wierszu klienta
   * (A2, Faza 2) — jedno wspólne źródło koloru dla obu miejsc, klucz = nazwa statusu. */
  statusColors?: Record<string, string>;
  /** Tekst pustej listy. */
  emptyLabel?: string;
  /** Sekcja D (Faza 2): pokazuje jeden stały, fikcyjny klient testowy przypięty na górze
   * listy, niezależnie od `filterStatuses`/wyszukiwania po statusie — żeby dało się
   * przechodzić przez skrypt i brief bez prawdziwego leada. */
  showTestClient?: boolean;
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
  emptyLabel = "Brak klientów",
  showTestClient = false,
}: ClientSidebarProps) {
  const [search, setSearch] = useState("");
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
    );

  const grouped = groupByStatus
    ? (filterStatuses ?? []).reduce<Record<string, PipelineClientDetailed[]>>((acc, s) => {
        acc[s] = filtered.filter((c) => c.status === s);
        return acc;
      }, {})
    : null;

  // Sekcja D: przypięty na górze niezależnie od filterStatuses (klient testowy nie musi
  // pasować do statusów pipeline tej zakładki), respektuje tylko wyszukiwarkę.
  const testClientVisible =
    showTestClient &&
    (!search.trim() ||
      `${TEST_CLIENT.kontakt} ${TEST_CLIENT.firma}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      style={{
        width: collapsed ? 44 : 240,
        minWidth: collapsed ? 44 : 240,
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
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          boxShadow: "var(--shadow-card)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
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
          e.currentTarget.style.color = "var(--text-secondary)";
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "var(--shadow-card)";
        }}
      >
        {collapsed ? (
          <ChevronRight size={13} strokeWidth={1.8} />
        ) : (
          <ChevronLeft size={13} strokeWidth={1.8} />
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
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {/* A2 (Faza 2): pole nagłówka jest teraz zawsze neutralne "Klienci (N)" w
                      obu trybach (dawniej w trybie płaskim pokazywało tu kolorowany label
                      statusu, np. "Nowy lead (N)") — status pipeline pojedynczego klienta
                      nie znika, przenosi się do wspólnej, jednej lokalizacji: odznaki przy
                      wierszu klienta niżej (patrz ClientRow), tej samej w obu zakładkach. */}
                  {`Klienci (${filtered.length + (testClientVisible ? 1 : 0)})`}
                </span>
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    color: "var(--text-tertiary)",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <RefreshCw
                    size={12}
                    style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
                  />
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 32,
                  background: "var(--bg-hover)",
                  borderRadius: 8,
                  padding: "0 10px",
                }}
              >
                <Search size={12} color="var(--text-tertiary)" />
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
              {testClientVisible && (
                <div style={{ marginBottom: 8 }}>
                  <ClientRow
                    client={TEST_CLIENT}
                    selected={selected}
                    onSelect={onSelect}
                    isTest
                  />
                </div>
              )}
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
                          />
                        ))}
                      </div>
                    );
                  })
                : filtered.map((c) => (
                    <ClientRow key={c.id} client={c} selected={selected} onSelect={onSelect} />
                  ))}
              {filtered.length === 0 && !testClientVisible && (
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

            {selected && (
              <div
                style={{
                  padding: "10px 12px",
                  borderTop: "1px solid var(--border)",
                  flexShrink: 0,
                  background: "var(--bg-hover)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
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

function ClientRow({
  client,
  selected,
  onSelect,
  isTest = false,
}: {
  client: PipelineClientDetailed;
  selected: PipelineClientDetailed | null;
  onSelect: (c: PipelineClientDetailed | null) => void;
  isTest?: boolean;
}) {
  const isSelected = selected?.id === client.id;
  return (
    <div
      onClick={() => onSelect(isSelected ? null : client)}
      title={isTest ? "Klient testowy — dane fikcyjne, numer telefonu celowo nieprawdziwy" : undefined}
      style={{
        padding: "9px 10px",
        borderRadius: 8,
        marginBottom: 2,
        cursor: "pointer",
        background: isSelected
          ? isTest
            ? "var(--warning-bg)"
            : "var(--accent-muted)"
          : isTest
            ? "rgba(158, 106, 46, 0.06)"
            : "transparent",
        border: isSelected
          ? `1px solid ${isTest ? "var(--warning-border)" : "var(--accent-border)"}`
          : isTest
            ? "1px dashed var(--warning-border)"
            : "1px solid transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 600,
          color: isSelected ? (isTest ? "var(--warning-text)" : "var(--accent)") : "var(--text-primary)",
          marginBottom: 2,
        }}
      >
        {isTest && <FlaskConical size={12} color="var(--warning-text)" strokeWidth={2} />}
        {client.kontakt || client.firma || "—"}
        {isTest && (
          <span
            style={{
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--warning-text)",
              padding: "1px 6px",
              borderRadius: 99,
              border: "1px solid var(--warning-border)",
              background: "var(--warning-bg)",
            }}
          >
            Testowy
          </span>
        )}
      </div>
      <ClientCompanyLine client={client} />
      <ClientContactDetails client={client} />
      {typeof client.liczbaProb === "number" && client.liczbaProb > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: `1.5px solid ${n <= client.liczbaProb ? "var(--warning)" : "var(--text-tertiary)"}`,
                background: n <= client.liczbaProb ? "var(--warning)" : "transparent",
              }}
            />
          ))}
          {client.liczbaProb >= 3 && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--error-text)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginLeft: 2,
              }}
            >
              Wyślij SMS
            </span>
          )}
        </div>
      )}
    </div>
  );
}
