import { Check } from "lucide-react";
import { demoColors, demoFont } from "@/components/demo/demoTheme";

interface DemoStepTimelineProps {
  labels: readonly string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function DemoStepTimeline({ labels, activeIndex, onSelect }: DemoStepTimelineProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      {labels.map((label, i) => (
        <div
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            flex: i < labels.length - 1 ? 1 : "0 0 auto",
          }}
        >
          <button
            type="button"
            onClick={() => onSelect(i)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: demoFont.mono,
                fontSize: 12,
                fontWeight: 700,
                background: i <= activeIndex ? demoColors.accent : demoColors.surface,
                color: i <= activeIndex ? "#1a1207" : demoColors.textTertiary,
                border: i <= activeIndex ? "none" : `1px solid ${demoColors.border}`,
                boxShadow: i === activeIndex ? `0 0 0 4px ${demoColors.accentSoft}` : "none",
                transition: "box-shadow 0.2s ease",
                flexShrink: 0,
              }}
            >
              {i < activeIndex ? <Check size={14} /> : i + 1}
            </div>
            <span
              style={{
                fontFamily: demoFont.sans,
                fontSize: 11,
                fontWeight: i === activeIndex ? 700 : 500,
                color: i === activeIndex ? demoColors.textPrimary : demoColors.textTertiary,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          </button>
          {i < labels.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                margin: "0 6px",
                marginBottom: 17,
                background: i < activeIndex ? demoColors.accent : demoColors.border,
                borderRadius: 1,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
