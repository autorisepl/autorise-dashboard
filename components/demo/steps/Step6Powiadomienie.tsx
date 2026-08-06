"use client";

import { CheckCircle2, Hourglass, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { demoColors, demoFont } from "@/components/demo/demoTheme";
import { POWIADOMIENIE, ZLECENIE } from "@/lib/demo/arekDemoData";

interface Step6PowiadomienieProps {
  active: boolean;
  confirmed: boolean;
  onConfirm: () => void;
}

const fieldLabelStyle = {
  fontFamily: demoFont.sans,
  fontSize: 11,
  color: demoColors.textTertiary,
} as const;
const fieldValueStyle = {
  fontFamily: demoFont.sans,
  fontSize: 13,
  color: demoColors.textPrimary,
  fontWeight: 500,
} as const;

export function Step6Powiadomienie({ active, confirmed, onConfirm }: Step6PowiadomienieProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) {
      setReady(false);
      return;
    }
    const t = setTimeout(() => setReady(true), 1000);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          background: demoColors.surfaceRaised,
          border: `1px solid ${demoColors.border}`,
          borderRadius: 14,
          padding: 16,
          boxShadow: demoColors.cardShadow,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Send size={16} color={demoColors.accent} />
          <span
            style={{
              fontFamily: demoFont.sans,
              fontSize: 13,
              fontWeight: 700,
              color: demoColors.textPrimary,
            }}
          >
            Powiadomienie automatyczne
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          <div>
            <div style={fieldLabelStyle}>Odbiorca</div>
            <div style={fieldValueStyle}>{POWIADOMIENIE.odbiorca}</div>
          </div>
          <div>
            <div style={fieldLabelStyle}>Kanał</div>
            <div style={fieldValueStyle}>{POWIADOMIENIE.kanal}</div>
          </div>
          <div>
            <div style={fieldLabelStyle}>Treść</div>
            <div style={fieldValueStyle}>{POWIADOMIENIE.tresc}</div>
          </div>
        </div>

        {!ready && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Loader2
              size={14}
              color={demoColors.textTertiary}
              style={{ animation: "spin 1s linear infinite" }}
            />
            <span
              style={{ fontFamily: demoFont.sans, fontSize: 12, color: demoColors.textSecondary }}
            >
              Przygotowywanie powiadomienia...
            </span>
          </div>
        )}

        {ready && !confirmed && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: demoFont.sans,
                fontSize: 12,
                color: demoColors.warning,
                fontWeight: 600,
              }}
            >
              <Hourglass size={13} />
              System przygotował powiadomienie. Oczekuje potwierdzenia spedytora przed wysłaniem.
            </div>
            <button type="button" onClick={onConfirm} style={confirmButtonStyle}>
              Potwierdź i wyślij
            </button>
          </div>
        )}

        {ready && confirmed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: demoFont.sans,
              fontSize: 12,
              color: demoColors.success,
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={13} />
            Powiadomienie wysłane.
          </div>
        )}
      </div>

      {confirmed && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={13} color={demoColors.terminalDim} style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: demoFont.mono, fontSize: 12, color: demoColors.textTertiary }}>
            Zlecenie {ZLECENIE.numerZleceniaTms}: status końcowy, Zrealizowane.
          </span>
        </div>
      )}
    </div>
  );
}

const confirmButtonStyle = {
  alignSelf: "flex-start",
  fontFamily: demoFont.sans,
  fontSize: 12,
  fontWeight: 600,
  height: 32,
  padding: "0 14px",
  borderRadius: 8,
  background: demoColors.accent,
  border: "none",
  color: "#1a1207",
  cursor: "pointer",
} as const;
