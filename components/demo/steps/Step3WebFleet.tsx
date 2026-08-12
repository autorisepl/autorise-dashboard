import { CheckCircle2, Clock, MapPin, Navigation, Truck, User } from "lucide-react";
import { demoColors, demoFont } from "@/components/demo/demoTheme";
import { ZLECENIE } from "@/lib/demo/arekDemoData";

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

const LOG_LINES = [
  "Zlecenie dopasowane po numerze rejestracyjnym PO 4821W do pozycji GPS pojazdu w WebFleet.",
  "Do aplikacji WebFleet Driver wysłano: adresy, okna czasowe, numer zlecenia i trasę nawigacji.",
  "Kierowca dostaje powiadomienie na terminal i potwierdza OK (tak jak dziś - bez zmiany nawyków kierowców).",
  "Pozycja pojazdu aktualizowana automatycznie z GPS WebFleet, bez ręcznego odpytywania kierowcy.",
];

export function Step3WebFleet() {
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Navigation size={16} color={demoColors.accent} />
            <span
              style={{
                fontFamily: demoFont.sans,
                fontSize: 13,
                fontWeight: 700,
                color: demoColors.textPrimary,
              }}
            >
              WebFleet
            </span>
          </div>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: demoFont.sans,
              fontSize: 11,
              fontWeight: 600,
              color: demoColors.success,
            }}
          >
            <CheckCircle2 size={13} />
            Trasa wysłana
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={rowStyle}>
            <User size={15} color={demoColors.textTertiary} />
            <div>
              <div style={labelStyle}>Kierowca</div>
              <div style={valueStyle}>{ZLECENIE.kierowca}</div>
            </div>
          </div>
          <div style={rowStyle}>
            <Truck size={15} color={demoColors.textTertiary} />
            <div>
              <div style={labelStyle}>Pojazd</div>
              <div style={valueStyle}>{ZLECENIE.pojazd}</div>
            </div>
          </div>
          <div style={rowStyle}>
            <MapPin size={15} color={demoColors.textTertiary} />
            <div>
              <div style={labelStyle}>Trasa</div>
              <div style={valueStyle}>
                {ZLECENIE.zaladunek.miejsce}, do {ZLECENIE.rozladunek.miejsce}
              </div>
            </div>
          </div>
          <div style={rowStyle}>
            <Clock size={15} color={demoColors.textTertiary} />
            <div>
              <div style={labelStyle}>ETA rozładunku</div>
              <div style={valueStyle}>13.08.2026, 07:40</div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            height: 90,
            borderRadius: 10,
            position: "relative",
            background:
              "repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 10px, transparent 10px, transparent 20px)",
            border: `1px dashed ${demoColors.border}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "38%",
              top: "48%",
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: demoColors.accent,
              boxShadow: `0 0 0 5px ${demoColors.accentSoft}`,
              animation: "demoPulse 1.8s ease-in-out infinite",
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: 8,
              left: 0,
              right: 0,
              textAlign: "center",
              ...labelStyle,
              fontSize: 11,
            }}
          >
            Pozycja pojazdu na mapie floty
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {LOG_LINES.map((line) => (
          <div key={line} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={13} color={demoColors.terminalDim} style={{ flexShrink: 0 }} />
            <span
              style={{ fontFamily: demoFont.mono, fontSize: 12, color: demoColors.textTertiary }}
            >
              {line}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
