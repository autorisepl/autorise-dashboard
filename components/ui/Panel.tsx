import type { CSSProperties, ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  style?: CSSProperties;
  padding?: number | string;
  className?: string;
  onClick?: () => void;
  // Opaque background zamiast szkła + backdrop-filter. Blur jest kosztowny do przeliczania
  // przy każdej klatce scrolla, a wielokrotny blur (kilka paneli naraz, np. kolumny dni w
  // /planowanie) potrafi realnie laggować i tworzyć artefakty przy position:sticky (widoczne
  // przebijanie treści zza półprzezroczystego, "opóźnionego" tła). Użyj `solid` dla paneli
  // które scrollują dużo treści albo mają sticky nagłówki wewnątrz.
  solid?: boolean;
}

export function Panel({ children, style, padding = 16, className, onClick, solid }: PanelProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: solid ? "var(--bg-elevated)" : "var(--glass)",
        backdropFilter: solid ? undefined : "var(--glass-blur)",
        WebkitBackdropFilter: solid ? undefined : "var(--glass-blur)",
        border: solid ? "1px solid var(--border)" : "1px solid var(--glass-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: solid ? "var(--shadow-card)" : "var(--glass-shadow)",
        padding,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
