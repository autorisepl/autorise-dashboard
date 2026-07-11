"use client";

import { ArrowRight, ExternalLink, Presentation, Quote } from "lucide-react";

export interface Agent3Output {
  hero_stat_godziny?: string | number | null;
  roi_dzis_h?: number | null;
  roi_po_h?: number | null;
  roi_roznica_h?: number | null;
  modul_priorytet?: string | null;
  dopasowanie_problem_sekcja?: string | null;
  cytat_poprzednie_proby?: string | null;
  harmonogram_uwaga?: string | null;
  kontekst_roi_cena?: string | null;
  uwagi_agenta?: string | null;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase" as const,
        color: "#1a56ff",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--separator)", margin: "18px 0" }} />;
}

function formatHours(val: number | null | undefined): string {
  if (val == null) return "—";
  return val % 1 === 0 ? `${val}h` : `${val.toFixed(1)}h`;
}

// prezentacja.html czyta parametry URL "roi"/"po" (nie hero_stat_godziny/roi_dzis_h/roi_po_h
// jak zwraca Agent 3) — bez tego mapowania spersonalizowane dane Agenta 3 nigdy realnie
// nie trafiały do prezentacji pokazywanej klientowi.
function buildPrezentacjaUrl(output: Agent3Output): string {
  const p = new URLSearchParams();
  if (output.roi_dzis_h != null) p.set("roi", String(Math.round(output.roi_dzis_h)));
  if (output.roi_po_h != null) p.set("po", String(Math.round(output.roi_po_h)));
  const qs = p.toString();
  return `/prezentacja.html${qs ? `?${qs}` : ""}`;
}

export function Agent3Card({ output }: { output: Agent3Output }) {
  const hasRoi =
    output.roi_dzis_h != null || output.roi_po_h != null || output.roi_roznica_h != null;
  const prezentacjaUrl = buildPrezentacjaUrl(output);

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        height: "100%",
        overflow: "auto",
        fontFamily: "var(--font-system)",
        color: "var(--text-primary)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 18px",
          background: "linear-gradient(160deg, rgba(26,86,255,0.08) 0%, transparent 55%)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#1a56ff",
              marginBottom: 5,
            }}
          >
            Personalizacja
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: "var(--text-primary)",
            }}
          >
            HTML Prezentacja · Dane gotowe
          </div>
        </div>
        <a
          href={prezentacjaUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(26,86,255,0.10)",
            border: "1px solid rgba(26,86,255,0.22)",
            flexShrink: 0,
            textDecoration: "none",
            fontFamily: "var(--font-system)",
            fontSize: 12,
            fontWeight: 600,
            color: "#1a56ff",
          }}
        >
          <Presentation size={15} />
          Otwórz prezentację
          <ExternalLink size={11} />
        </a>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* ROI Numbers */}
        {hasRoi && (
          <>
            <Label>Wykres ROI — dane do wpisania</Label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr auto 1fr",
                gap: 0,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                overflow: "hidden",
                marginBottom: 0,
              }}
            >
              {/* Dziś */}
              <div style={{ padding: "20px 22px", textAlign: "center" as const }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 44,
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    color: "#ff9500",
                  }}
                >
                  {output.roi_dzis_h != null
                    ? formatHours(output.roi_dzis_h)
                    : (output.hero_stat_godziny ?? "—")}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-system)",
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 7,
                    letterSpacing: "0.02em",
                  }}
                >
                  marnowane dziś / mies.
                </div>
              </div>

              {/* Arrow */}
              <div style={{ display: "flex", alignItems: "center", padding: "0 4px" }}>
                <ArrowRight size={16} color="var(--text-tertiary)" />
              </div>

              {/* Po Autorise */}
              <div style={{ padding: "20px 22px", textAlign: "center" as const }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 44,
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    color: "#34c759",
                  }}
                >
                  {output.roi_po_h != null ? formatHours(output.roi_po_h) : "—"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-system)",
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 7,
                    letterSpacing: "0.02em",
                  }}
                >
                  zostaje po wdrożeniu
                </div>
              </div>

              {/* Arrow */}
              <div style={{ display: "flex", alignItems: "center", padding: "0 4px" }}>
                <ArrowRight size={16} color="var(--text-tertiary)" />
              </div>

              {/* Oszczędność */}
              <div
                style={{
                  padding: "20px 22px",
                  textAlign: "center" as const,
                  background: "rgba(26,86,255,0.10)",
                  borderLeft: "1px solid rgba(26,86,255,0.22)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 44,
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    color: "#1a56ff",
                  }}
                >
                  {output.roi_roznica_h != null ? formatHours(output.roi_roznica_h) : "—"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-system)",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    marginTop: 7,
                    letterSpacing: "0.02em",
                  }}
                >
                  odzysk / miesiąc
                </div>
              </div>
            </div>
            <Divider />
          </>
        )}

        {/* Moduł priorytetowy */}
        {output.modul_priorytet && (
          <>
            <Label>Moduł priorytetowy</Label>
            <div
              style={{
                padding: "14px 18px",
                background: "rgba(26,86,255,0.10)",
                border: "1px solid rgba(26,86,255,0.22)",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                lineHeight: 1.6,
              }}
            >
              {output.modul_priorytet}
            </div>
            <Divider />
          </>
        )}

        {/* Dopasowanie prezentacji */}
        {output.dopasowanie_problem_sekcja && (
          <>
            <Label>Dopasowanie sekcji &ldquo;Problem&rdquo;</Label>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 }}>
              {output.dopasowanie_problem_sekcja}
            </p>
            <Divider />
          </>
        )}

        {/* Cytat do sekcji USP */}
        {output.cytat_poprzednie_proby && (
          <>
            <Label>Cytat do sekcji USP — poprzednie próby</Label>
            <div
              style={{
                padding: "14px 18px 14px 20px",
                borderLeft: "3px solid rgba(26,86,255,0.4)",
                background: "rgba(26,86,255,0.05)",
                borderRadius: "0 10px 10px 0",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <Quote
                size={13}
                color="rgba(26,86,255,0.4)"
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  lineHeight: 1.65,
                  margin: 0,
                  fontStyle: "italic",
                }}
              >
                {output.cytat_poprzednie_proby}
              </p>
            </div>
            <Divider />
          </>
        )}

        {/* Kontekst ROI → cena */}
        {output.kontekst_roi_cena && (
          <>
            <Label>Kontekst ROI przy rozmowie o cenie</Label>
            <div
              style={{
                padding: "14px 18px",
                background: "rgba(52,199,89,0.10)",
                border: "1px solid rgba(52,199,89,0.22)",
                borderRadius: 10,
                fontSize: 14,
                color: "#34c759",
                lineHeight: 1.65,
              }}
            >
              {output.kontekst_roi_cena}
            </div>
            <Divider />
          </>
        )}

        {/* Harmonogram */}
        {output.harmonogram_uwaga && (
          <>
            <Label>Harmonogram wdrożenia — uwaga</Label>
            <p
              style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-secondary)", margin: 0 }}
            >
              {output.harmonogram_uwaga}
            </p>
            <Divider />
          </>
        )}

        {/* Uwagi agenta */}
        {output.uwagi_agenta && (
          <>
            <Label>Obserwacje agenta</Label>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 }}>
              {output.uwagi_agenta}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
