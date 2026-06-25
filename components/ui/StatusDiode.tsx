import type { CSSProperties } from "react";

type DiodeStatus = "online" | "offline" | "warning" | "idle";

interface StatusDiodeProps {
  status: DiodeStatus;
  label?: string;
  pulse?: boolean;
  size?: number;
  style?: CSSProperties;
}

const COLORS: Record<DiodeStatus, string> = {
  online: "var(--success)",
  offline: "var(--error)",
  warning: "var(--warning)",
  idle: "var(--text-tertiary)",
};

export function StatusDiode({ status, label, pulse = false, size = 8, style }: StatusDiodeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
    >
      <span
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: COLORS[status],
          display: "inline-block",
          flexShrink: 0,
          animation:
            pulse && status === "online" ? "diodePulse 2s ease-in-out infinite" : undefined,
        }}
      />
      {label ? (
        <span
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
