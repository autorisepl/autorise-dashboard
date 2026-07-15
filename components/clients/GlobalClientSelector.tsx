"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ClientContactDetails, type ClientContactFields } from "./ClientContactDetails";

export interface GlobalClientOption extends ClientContactFields {
  id: string;
  status?: string;
}

// Blok 2, punkt 2.2 (2026-07-15) — PROTOTYP do potwierdzenia z Michałem PRZED wdrożeniem
// wszędzie (patrz AUTORISE_MASTER_PLAN.md). Jedno dedykowane pole wyboru klienta z
// wyszukiwarką, scroll WEWNĄTRZ pola (nie scroll całej strony) — zastępuje rozwijaną listę
// per zakładka. Świadomie NIE ma jeszcze globalnej persystencji między zakładkami w tej
// wersji (to "reszta" z zadania, wdrażana dopiero po akceptacji kierunku) — ten komponent
// przyjmuje `clients`/`selectedId`/`onSelect` jak dotychczasowe selektory per-stronowe, żeby
// dało się go ocenić w izolacji zanim podniesiemy stan wyżej (do layoutu dashboardu).
export function GlobalClientSelector({
  clients,
  selectedId,
  onSelect,
  placeholder = "Wybierz klienta...",
}: {
  clients: GlobalClientOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const selected = clients.find((c) => c.id === selectedId);
  const filtered = clients.filter((c) => {
    if (!q.trim()) return true;
    const haystack = `${c.kontakt ?? ""} ${c.firma ?? ""}`.toLowerCase();
    return haystack.includes(q.toLowerCase());
  });

  return (
    <div ref={ref} style={{ position: "relative", width: 240 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          height: 32,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 10px",
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${open ? "var(--accent)" : "var(--border)"}`,
          background: "var(--bg-elevated)",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            flex: 1,
            textAlign: "left",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: selected ? "var(--text-primary)" : "var(--text-tertiary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selected ? selected.kontakt || selected.firma : placeholder}
        </span>
        {selected ? (
          <X
            size={12}
            color="var(--text-tertiary)"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("");
            }}
          />
        ) : (
          <ChevronDown size={12} color="var(--text-tertiary)" />
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 300,
            background: "var(--glass)",
            backdropFilter: "var(--glass-blur)",
            WebkitBackdropFilter: "var(--glass-blur)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-menu)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "6px 6px 3px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                background: "var(--bg-hover)",
                borderRadius: "var(--radius-xs)",
              }}
            >
              <Search size={11} color="var(--text-tertiary)" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Szukaj po nazwie / firmie..."
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>
          {/* Scroll WEWNĄTRZ pola — to jest cały sens tego prototypu, żeby lista klientów
              rosnąc nie wymuszała scrolla całej strony. */}
          <div style={{ maxHeight: 320, overflowY: "auto", padding: "3px 6px 6px" }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "16px 8px",
                  textAlign: "center",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                }}
              >
                Brak wyników
              </div>
            ) : (
              filtered.map((c) => {
                const isSelected = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelect(c.id);
                      setOpen(false);
                      setQ("");
                    }}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "var(--radius-xs)",
                      border: "none",
                      cursor: "pointer",
                      background: isSelected ? "var(--bg-active)" : "transparent",
                      textAlign: "left",
                      display: "block",
                      marginBottom: 2,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 12,
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? "var(--accent)" : "var(--text-primary)",
                      }}
                    >
                      {c.kontakt || c.firma}
                    </div>
                    {c.status && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                          marginTop: 1,
                        }}
                      >
                        {c.status}
                      </div>
                    )}
                    <ClientContactDetails client={c} size="xs" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
