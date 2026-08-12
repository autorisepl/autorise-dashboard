"use client";

import { ArrowDown } from "lucide-react";

interface NextStepArrowProps {
  label: string;
  onJump: () => void;
}

export function NextStepArrow({ label, onJump }: NextStepArrowProps) {
  return (
    <button
      onClick={onJump}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        marginTop: 8,
        borderRadius: 6,
        border: "1px solid var(--accent-border)",
        background: "var(--accent-muted)",
        color: "var(--accent-text)",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      <ArrowDown size={14} />
      {label}
    </button>
  );
}
