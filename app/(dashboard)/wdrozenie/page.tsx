"use client";

import { Rocket } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

// Placeholder (A2, 2026-07-16). Zakładka docelowo prowadzi Michała od podpisu
// umowy do weryfikacji gwarancji 80h — pełna specyfikacja (4 panele: Dostępy,
// Pomiar bazowy, Checklist tygodniowa, Weryfikacja Dzień 30) w
// context/PLAN_CLAUDE_CODE.md, blok A1. Wymaga prototypu i akceptacji
// Michała przed budową, świadomie nie zaimplementowane w tym punkcie.
export default function WdrozenieePage() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PageHeader icon={<Rocket size={15} color="var(--accent)" />} title="Wdrożenie" />
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
            Zakładka w budowie. Pełna specyfikacja (dostępy, pomiar bazowy, checklist tygodniowa,
            weryfikacja Dzień 30) czeka na prototyp i akceptację w sesji z Michałem — patrz blok A1
            w context/PLAN_CLAUDE_CODE.md.
          </div>
        </Panel>
      </div>
    </div>
  );
}
