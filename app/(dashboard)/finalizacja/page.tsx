"use client";

import { useCallback, useEffect, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { ClientSidebar } from "@/components/clients/ClientSidebar";
import { AnalizaPrzedkontraktowaPanel } from "@/components/sprzedaz/AnalizaPrzedkontraktowaPanel";

// Nowa zakładka (2026-08-29, Michał), między /pipeline a /wdrozenie w nawigacji. Przejmuje
// skrypt analizy przedkontraktowej — spotkanie PO Discovery Call, PRZED wysłaniem umowy — który
// dotąd żył w /sprzedaz mimo że logicznie do niego nie pasował: strona /sprzedaz to sama
// rozmowa Discovery, ta analiza to osobne, kolejne spotkanie (patrz zaktualizowany komentarz w
// AnalizaPrzedkontraktowaPanel.tsx). Klienci filtrowani do statusu "Finalizacja" — ten sam
// status Pipeline co nazwa zakładki, zgodnie z konwencją /sprzedaz ("Discovery umówione").
export default function FinalizacjaPage() {
  const [clients, setClients] = useState<PipelineClientDetailed[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PipelineClientDetailed | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notion/pipeline");
      const data = await res.json();
      if (data.success) setClients(data.clients);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClients();
    const id = setInterval(() => void fetchClients(), 60_000);
    return () => clearInterval(id);
  }, [fetchClients]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
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
            Finalizacja i analiza
          </h1>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            {selected ? selected.kontakt || selected.firma : "Wybierz klienta z listy"}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <ClientSidebar
          clients={clients}
          loading={loading}
          selected={selected}
          onSelect={setSelected}
          onRefresh={fetchClients}
          filterStatuses={["Finalizacja"]}
          headerLabel="Finalizacja"
          emptyLabel='Brak klientów "Finalizacja"'
          showPresentation={false}
        />

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: "var(--bg)" }}>
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid rgba(255,255,255,0.42)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-sm)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
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
                Skrypt: Analiza przedkontraktowa
              </span>
            </div>
            <div style={{ padding: 16 }}>
              <AnalizaPrzedkontraktowaPanel
                client={selected}
                onSaved={(patch) => {
                  setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
                  setClients((prev) =>
                    prev.map((c) => (c.id === selected?.id ? { ...c, ...patch } : c)),
                  );
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
