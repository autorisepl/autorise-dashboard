"use client";

import { FileCheck2 } from "lucide-react";

// Nowa zakładka (2026-08-29, Michał), między /pipeline a /wdrozenie w nawigacji — na razie
// pusty szkielet, tylko żeby miejsce w produkcie istniało. Docelowo przejmie skrypt analizy
// przedkontraktowej dziś żyjący w /sprzedaz (components/sprzedaz/AnalizaPrzedkontraktowaPanel),
// który tam stoi bez logicznego uzasadnienia w trakcie samej rozmowy Discovery — świadomie
// zostaje na miejscu w tej rundzie, żeby nie zgubić kontekstu przed właściwą migracją treści
// w kolejnej sesji (patrz notatka w AnalizaPrzedkontraktowaPanel.tsx po tej migracji).
export default function FinalizacjaPage() {
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
            W budowie
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: "var(--bg)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--accent-muted)",
            border: "1px solid var(--accent-border)",
          }}
        >
          <FileCheck2 size={24} color="var(--accent)" strokeWidth={2} />
        </span>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-secondary)",
            maxWidth: 420,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Ta zakładka przejmie skrypt analizy przedkontraktowej i inne kroki między zamknięciem
          sprzedaży a startem wdrożenia. Zawartość dochodzi w kolejnej sesji.
        </p>
      </div>
    </div>
  );
}
