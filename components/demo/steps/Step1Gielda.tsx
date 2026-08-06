import { ArrowDownToLine, Building2, Calendar, MapPin, Package, Truck } from "lucide-react";
import { demoColors, demoFont } from "@/components/demo/demoTheme";
import { ZLECENIE } from "@/lib/demo/arekDemoData";

const rowStyle = { display: "flex", alignItems: "flex-start", gap: 10 } as const;
const labelStyle = {
  fontFamily: demoFont.sans,
  fontSize: 11,
  color: demoColors.textTertiary,
  marginBottom: 2,
} as const;
const valueStyle = {
  fontFamily: demoFont.sans,
  fontSize: 13,
  color: demoColors.textPrimary,
  fontWeight: 500,
} as const;

export function Step1Gielda() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: demoColors.successBg,
          border: `1px solid ${demoColors.successBorder}`,
          borderRadius: 10,
          padding: "8px 12px",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: demoColors.success,
            flexShrink: 0,
            animation: "demoPulse 1.6s ease-in-out infinite",
          }}
        />
        <span style={{ fontFamily: demoFont.sans, fontSize: 12, color: demoColors.textSecondary }}>
          Nasłuch giełd: Trans.eu, Timocom — aktywny
        </span>
      </div>

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
            <Truck size={16} color={demoColors.accent} />
            <span
              style={{
                fontFamily: demoFont.sans,
                fontSize: 13,
                fontWeight: 700,
                color: demoColors.textPrimary,
              }}
            >
              {ZLECENIE.gielda}
            </span>
          </div>
          <span style={{ fontFamily: demoFont.mono, fontSize: 11, color: demoColors.textTertiary }}>
            Nr giełdy: {ZLECENIE.numerGieldy}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={rowStyle}>
            <Building2 size={15} color={demoColors.textTertiary} style={{ marginTop: 1 }} />
            <div>
              <div style={labelStyle}>Zleceniodawca</div>
              <div style={valueStyle}>{ZLECENIE.zleceniodawca}</div>
            </div>
          </div>

          <div style={rowStyle}>
            <MapPin size={15} color={demoColors.textTertiary} style={{ marginTop: 1 }} />
            <div>
              <div style={labelStyle}>Trasa</div>
              <div style={valueStyle}>
                {ZLECENIE.zaladunek.miejsce}, do {ZLECENIE.rozladunek.miejsce}
              </div>
              <div style={{ ...labelStyle, marginTop: 4 }}>
                Załadunek: {ZLECENIE.zaladunek.data}
              </div>
              <div style={labelStyle}>Rozładunek: {ZLECENIE.rozladunek.data}</div>
            </div>
          </div>

          <div style={rowStyle}>
            <Package size={15} color={demoColors.textTertiary} style={{ marginTop: 1 }} />
            <div>
              <div style={labelStyle}>Ładunek</div>
              <div style={valueStyle}>{ZLECENIE.ladunek}</div>
            </div>
          </div>

          <div style={rowStyle}>
            <Calendar size={15} color={demoColors.textTertiary} style={{ marginTop: 1 }} />
            <div>
              <div style={labelStyle}>Stawka</div>
              <div style={valueStyle}>{ZLECENIE.stawka}</div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${demoColors.border}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              fontFamily: demoFont.sans,
              fontSize: 11,
              fontWeight: 600,
              color: demoColors.accent,
              background: demoColors.accentSoft,
              border: `1px solid ${demoColors.accentBorder}`,
              borderRadius: 6,
              padding: "3px 8px",
            }}
          >
            Dopasowanie do floty: naczepa chłodnia
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ArrowDownToLine size={13} color={demoColors.terminalDim} style={{ flexShrink: 0 }} />
        <span style={{ fontFamily: demoFont.mono, fontSize: 12, color: demoColors.textTertiary }}>
          Źródło: {ZLECENIE.gielda}, import automatyczny
        </span>
      </div>
    </div>
  );
}
