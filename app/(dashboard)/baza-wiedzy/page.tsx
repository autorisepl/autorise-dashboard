"use client";

import { Library } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

// Placeholder (A2, 2026-07-16). Docelowo: wizualizacja baz Notion "Produkty"
// i "Moduły (komponenty PR-0)" plus metodologia 4 sposobów na brak API,
// tylko do odczytu — patrz context/PLAN_CLAUDE_CODE.md, blok A3. Poza
// zakresem tej sesji autonomicznej (świadomie, instrukcja planu).
export default function BazaWiedzyPage() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PageHeader icon={<Library size={15} color="var(--accent)" />} title="Baza wiedzy" />
      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        <Panel>
          <div
            style={{
              padding: 32,
              textAlign: "center",
              fontFamily: "var(--font-sans)",
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            Zakładka w budowie. Docelowo katalog produktów i modułów Autorise oraz
            metodologia integracji, czytane bezpośrednio z Notion — patrz blok A3 w
            context/PLAN_CLAUDE_CODE.md.
          </div>
        </Panel>
      </div>
    </div>
  );
}
