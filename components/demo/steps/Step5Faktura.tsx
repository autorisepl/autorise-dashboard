"use client";

import { CheckCircle2, FileText, Hourglass, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { demoColors, demoFont } from "@/components/demo/demoTheme";
import { FAKTURA, ZLECENIE } from "@/lib/demo/arekDemoData";

interface Step5FakturaProps {
  active: boolean;
  confirmed: boolean;
  onConfirm: () => void;
}

const rowStyle = { display: "flex", alignItems: "center", gap: 10 } as const;
const labelStyle = {
  fontFamily: demoFont.sans,
  fontSize: 11,
  color: demoColors.textTertiary,
} as const;
const valueStyle = {
  fontFamily: demoFont.sans,
  fontSize: 13,
  color: demoColors.textPrimary,
  fontWeight: 500,
} as const;

function InvoicePreview() {
  return (
    <div
      style={{
        width: 92,
        height: 118,
        flexShrink: 0,
        background: "#f4f2ec",
        borderRadius: 6,
        boxShadow: demoColors.cardShadow,
        padding: "10px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ height: 6, width: "60%", background: "#d8d3c6", borderRadius: 2 }} />
      <div style={{ height: 4, width: "40%", background: "#e3dfd3", borderRadius: 2 }} />
      <div
        style={{ marginTop: 6, height: 4, width: "90%", background: "#e3dfd3", borderRadius: 2 }}
      />
      <div style={{ height: 4, width: "80%", background: "#e3dfd3", borderRadius: 2 }} />
      <div style={{ height: 4, width: "85%", background: "#e3dfd3", borderRadius: 2 }} />
      <div
        style={{
          marginTop: "auto",
          height: 8,
          width: "55%",
          background: demoColors.accent,
          borderRadius: 2,
        }}
      />
    </div>
  );
}

export function Step5Faktura({ active, confirmed, onConfirm }: Step5FakturaProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) {
      setReady(false);
      return;
    }
    const t = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        background: demoColors.surfaceRaised,
        border: `1px solid ${demoColors.border}`,
        borderRadius: 14,
        padding: 16,
        boxShadow: demoColors.cardShadow,
      }}
    >
      <InvoicePreview />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={16} color={demoColors.accent} />
            <span
              style={{
                fontFamily: demoFont.sans,
                fontSize: 13,
                fontWeight: 700,
                color: demoColors.textPrimary,
              }}
            >
              {FAKTURA.numer}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={rowStyle}>
            <div style={labelStyle}>Zlecenie</div>
            <div style={valueStyle}>{ZLECENIE.numerZleceniaTms}</div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>Kontrahent</div>
            <div style={valueStyle}>{ZLECENIE.zleceniodawca}</div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>Kwota</div>
            <div style={valueStyle}>{FAKTURA.kwota}</div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>Termin płatności</div>
            <div style={valueStyle}>{FAKTURA.terminPlatnosci}</div>
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
              Odczyt dokumentu faktury...
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
              System odczytał i przypisał fakturę do zlecenia. Oczekuje potwierdzenia spedytora
              przed zaksięgowaniem.
            </div>
            <button type="button" onClick={onConfirm} style={confirmButtonStyle}>
              Potwierdź i zapisz
            </button>
          </div>
        )}

        {ready && confirmed && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
              Faktura zaksięgowana i przypisana do zlecenia {ZLECENIE.numerZleceniaTms}.
            </div>
            <div
              style={{
                fontFamily: demoFont.sans,
                fontSize: 11,
                color: demoColors.textSecondary,
              }}
            >
              Spedytor: jedno kliknięcie zamiast ręcznego przepisywania
            </div>
          </div>
        )}
      </div>
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
