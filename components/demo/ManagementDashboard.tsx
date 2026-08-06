import { AlertTriangle, Truck } from "lucide-react";
import { demoColors, demoFont } from "@/components/demo/demoTheme";
import { AKTYWNE_ZLECENIA, ALERTY, KLIENT, STAN_FLOTY } from "@/lib/demo/arekDemoData";

function fmtPln(n: number): string {
  return `${n.toLocaleString("pl-PL")} zł`;
}

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
}

function StatTile({ label, value, sub }: StatTileProps) {
  return (
    <div
      style={{
        flex: "1 1 160px",
        background: demoColors.surfaceRaised,
        border: `1px solid ${demoColors.border}`,
        borderRadius: 14,
        padding: 16,
        boxShadow: demoColors.cardShadow,
      }}
    >
      <div
        style={{
          fontFamily: demoFont.sans,
          fontSize: 11,
          color: demoColors.textTertiary,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: demoFont.mono,
          fontSize: 22,
          fontWeight: 700,
          color: demoColors.textPrimary,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: demoFont.sans,
            fontSize: 11,
            color: demoColors.textSecondary,
            marginTop: 4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

const statusColor: Record<string, string> = {
  Zrealizowane: demoColors.success,
  "W transporcie": demoColors.accent,
  "Oczekuje na CMR": demoColors.warning,
  "Nowe, z giełdy": demoColors.textTertiary,
};

function SectionLabel({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: demoFont.sans,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: demoColors.textTertiary,
        marginBottom: 10,
      }}
    >
      {text}
    </div>
  );
}

function SurfaceCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: demoColors.surfaceRaised,
        border: `1px solid ${demoColors.border}`,
        borderRadius: 14,
        boxShadow: demoColors.cardShadow,
      }}
    >
      {children}
    </div>
  );
}

export function ManagementDashboard() {
  const roznicaGodzin = KLIENT.bazowyCzasGodzinyMc - KLIENT.celCzasGodzinyMc;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(240px, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Zlecenia aktywne — lewa, szeroka kolumna */}
        <div>
          <SectionLabel text="Zlecenia aktywne" />
          <SurfaceCard>
            {AKTYWNE_ZLECENIA.map((zlecenie, i) => (
              <div
                key={zlecenie.numer}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "14px 18px",
                  borderTop: i === 0 ? "none" : `1px solid ${demoColors.border}`,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: demoFont.mono,
                        fontSize: 12,
                        fontWeight: 700,
                        color: demoColors.textPrimary,
                      }}
                    >
                      {zlecenie.numer}
                    </span>
                    <span
                      style={{
                        fontFamily: demoFont.sans,
                        fontSize: 11,
                        color: demoColors.textTertiary,
                      }}
                    >
                      {zlecenie.zleceniodawca}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: demoFont.sans,
                      fontSize: 12,
                      color: demoColors.textSecondary,
                    }}
                  >
                    {zlecenie.trasa}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: demoFont.sans,
                    fontSize: 11,
                    fontWeight: 600,
                    color: statusColor[zlecenie.status] ?? demoColors.textTertiary,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {zlecenie.status}
                </span>
              </div>
            ))}
          </SurfaceCard>
        </div>

        {/* Stan floty + alerty — prawa, wąska kolumna */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <SectionLabel text="Stan floty" />
            <SurfaceCard>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Truck size={16} color={demoColors.accent} style={{ flexShrink: 0 }} />
                  <div
                    style={{
                      fontFamily: demoFont.mono,
                      fontSize: 18,
                      fontWeight: 700,
                      color: demoColors.textPrimary,
                    }}
                  >
                    {STAN_FLOTY.pojazdyWTrasie} / {STAN_FLOTY.pojazdyLacznie}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: demoFont.sans,
                    fontSize: 11,
                    color: demoColors.textTertiary,
                  }}
                >
                  pojazdów w trasie
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.round((STAN_FLOTY.pojazdyWTrasie / STAN_FLOTY.pojazdyLacznie) * 100)}%`,
                      background: demoColors.accent,
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            </SurfaceCard>
          </div>

          <div>
            <SectionLabel text="Alerty" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ALERTY.map((alert) => (
                <div
                  key={alert}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    background: demoColors.warningBg,
                    border: `1px solid ${demoColors.warningBorder}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <AlertTriangle
                    size={14}
                    color={demoColors.warning}
                    style={{ flexShrink: 0, marginTop: 1 }}
                  />
                  <span
                    style={{
                      fontFamily: demoFont.sans,
                      fontSize: 12,
                      color: demoColors.textSecondary,
                    }}
                  >
                    {alert}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Efektywność — pełna szerokość */}
      <div>
        <SectionLabel
          text={`Efektywność, bieżący miesiąc, ${KLIENT.liczbaFakturMcOd.toLocaleString("pl-PL")}–${KLIENT.liczbaFakturMcDo.toLocaleString("pl-PL")} zleceń`}
        />

        <SurfaceCard>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: demoFont.sans,
                  fontSize: 12,
                  color: demoColors.textSecondary,
                  marginBottom: 4,
                }}
              >
                <span>Manualnie</span>
                <span
                  style={{
                    fontFamily: demoFont.mono,
                    fontWeight: 700,
                    color: demoColors.textPrimary,
                  }}
                >
                  {KLIENT.bazowyCzasGodzinyMc} h
                </span>
              </div>
              <div
                style={{
                  height: 10,
                  borderRadius: 5,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: "100%",
                    background: demoColors.warning,
                    borderRadius: 5,
                  }}
                />
              </div>
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: demoFont.sans,
                  fontSize: 12,
                  color: demoColors.textSecondary,
                  marginBottom: 4,
                }}
              >
                <span>System</span>
                <span
                  style={{
                    fontFamily: demoFont.mono,
                    fontWeight: 700,
                    color: demoColors.textPrimary,
                  }}
                >
                  {KLIENT.celCzasGodzinyMc} h
                </span>
              </div>
              <div
                style={{
                  height: 10,
                  borderRadius: 5,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round((KLIENT.celCzasGodzinyMc / KLIENT.bazowyCzasGodzinyMc) * 100)}%`,
                    background: demoColors.success,
                    borderRadius: 5,
                  }}
                />
              </div>
            </div>
          </div>
        </SurfaceCard>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <StatTile
            label="Czas manualny"
            value={`${KLIENT.bazowyCzasGodzinyMc} h`}
            sub="miesięcznie"
          />
          <StatTile label="Czas systemu" value={`${KLIENT.celCzasGodzinyMc} h`} sub="miesięcznie" />
          <StatTile label="Różnica" value={`${roznicaGodzin} h`} sub="miesięcznie" />
          <StatTile
            label="Koszt nieefektywności"
            value={fmtPln(KLIENT.kosztNieefektywnosciRokPln)}
            sub="rocznie"
          />
          <StatTile
            label="Gwarancja umowna"
            value={`${KLIENT.gwarancjaMinGodzinyMc} h`}
            sub="maksymalny czas manualny"
          />
        </div>
      </div>
    </div>
  );
}
