import type { CSSProperties, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "var(--accent)",
    color: "#ffffff",
    border: "none",
  },
  secondary: {
    background: "var(--glass)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    backdropFilter: "var(--glass-blur)",
    WebkitBackdropFilter: "var(--glass-blur)" as never,
  },
  ghost: {
    background: "transparent",
    color: "var(--text-secondary)",
    border: "none",
  },
  danger: {
    background: "var(--error)",
    color: "#ffffff",
    border: "none",
  },
};

const SIZES: Record<ButtonSize, CSSProperties> = {
  sm: { fontSize: 11, padding: "5px 10px", borderRadius: "var(--radius-xs)" },
  md: { fontSize: 13, padding: "7px 14px", borderRadius: "var(--radius-sm)" },
  lg: { fontSize: 14, padding: "10px 18px", borderRadius: "var(--radius-sm)" },
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  onClick,
  type = "button",
  style,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.5 : 1,
        transition: "background 150ms, opacity 150ms, transform 80ms",
        width: fullWidth ? "100%" : undefined,
        whiteSpace: "nowrap",
        ...VARIANTS[variant],
        ...SIZES[size],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (isDisabled) return;
        if (variant === "primary")
          (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
        if (variant === "secondary")
          (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        if (variant === "primary")
          (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
        if (variant === "secondary")
          (e.currentTarget as HTMLButtonElement).style.background = "var(--glass)";
      }}
    >
      {loading ? (
        <span
          style={{
            width: 12,
            height: 12,
            border: "1.5px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.7s linear infinite",
          }}
        />
      ) : null}
      {children}
    </button>
  );
}
