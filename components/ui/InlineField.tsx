import type { CSSProperties, ReactNode } from "react";

interface InlineFieldProps {
  label: string;
  value?: string | ReactNode;
  empty?: string;
  half?: boolean;
  style?: CSSProperties;
}

export function InlineField({
  label,
  value,
  empty = "Brak danych",
  half = false,
  style,
}: InlineFieldProps) {
  return (
    <div
      style={{
        width: half ? "calc(50% - 8px)" : "100%",
        minWidth: 0,
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-sans)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          color: value ? "var(--text-primary)" : "var(--text-placeholder)",
          fontStyle: value ? "normal" : "italic",
          fontFamily: "var(--font-sans)",
          lineHeight: 1.45,
          wordBreak: "break-word",
        }}
      >
        {value ?? empty}
      </div>
    </div>
  );
}
