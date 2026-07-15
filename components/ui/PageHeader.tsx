"use client";

import type { ReactNode } from "react";

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  /** Reszta headera — separator/meta/akcje, treść dowolna, przenoszona 1:1 z istniejących
   * implementacji stron. PageHeader wymusza tylko wspólną powłokę (wysokość, tło, ramka,
   * ikona+tytuł), nie narzuca struktury tego co po tytule — te różnią się realnie między
   * stronami (liczniki, formularze, przełączniki) i próba ich sztucznego ujednolicenia
   * zrobiłaby więcej szkody niż korzyści. */
  children?: ReactNode;
  /** Przepuszczone 1:1 na kontener — np. "responsive-wrap" na /harmonogram, potrzebne dla
   * media queries specyficznych dla tej strony. */
  className?: string;
}

// Blok 2, punkt 2.1 (2026-07-15) — jeden współdzielony header zakładki zamiast osobnych,
// ręcznie powielanych implementacji per strona. Powłoka to styl "glass" 48px, już dominujący
// wzorzec (harmonogram/zadania/pliki/kontrola/sesje/analiza-narzedzi/agencja — 7 z 10
// zbadanych stron) — wybrany świadomie przez Michała nad alternatywnym stylem "solid" 52px
// (/kwalifikacja, /sprzedaz, /brand-book) właśnie dlatego że już był większościowy i spójny
// między sobą. /kwalifikacja i /sprzedaz podniesione DO tego stylu przy tym patchu, nie
// odwrotnie — patrz commit tego bloku.
export function PageHeader({ icon, title, children, className }: PageHeaderProps) {
  return (
    <div
      className={className}
      style={{
        height: 48,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 18px",
        background: "var(--glass)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {icon}
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
      {children}
    </div>
  );
}
