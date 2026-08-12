import type { CSSProperties, ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  icon?: ReactNode;
  size?: "xs" | "sm";
  style?: CSSProperties;
}

// Jedna, neutralna pigułka używana wszędzie w /planowanie (etykieta listy zadania, kategoria
// finansowa, cykl subskrypcji/retainera) — szare tło + biała ramka + biały tekst wielkimi
// literami. Świadomie BEZ kolorowania per-typ (żądanie: "wszystkie identyczne, bez koloru") —
// rozróżnienie typu idzie przez treść tekstu/ikonę, nie przez hue tła. Kolorowanie zostaje
// wyłącznie tam gdzie jest funkcjonalnie potrzebne (legenda wykresu donut), nie w odznakach.
export function Badge({ children, icon, size = "sm", style }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontFamily: "var(--font-sans)",
        fontSize: size === "xs" ? 9 : 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "#fff",
        background: "var(--bg-hover)",
        border: "1px solid rgba(255,255,255,0.3)",
        borderRadius: "var(--radius-xs)",
        padding: size === "xs" ? "2px 6px" : "2px 8px",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
}
