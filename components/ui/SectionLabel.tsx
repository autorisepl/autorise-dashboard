import type { CSSProperties, ReactNode } from "react";

interface SectionLabelProps {
  children: ReactNode;
  style?: CSSProperties;
  paddingX?: number;
}

export function SectionLabel({ children, style, paddingX = 12 }: SectionLabelProps) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-tertiary)",
        padding: `10px ${paddingX}px 4px`,
        fontFamily: "var(--font-sans)",
        userSelect: "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
