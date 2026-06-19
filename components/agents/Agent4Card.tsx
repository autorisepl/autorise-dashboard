"use client";

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  MessageSquare,
  MinusCircle,
  Quote,
  XCircle,
} from "lucide-react";

export interface Agent4Output {
  wynik?: string | null;
  wdrozenie_start?: string | null;
  kwota_potwierdzona?: number | null;
  reakcja_na_cene_cytat?: string | null;
  cisza_zachowana?: boolean | string | null;
  obiekcje?: Array<{
    tresc_cytat?: string | null;
    krok?: string | number | null;
    odpowiedz_michala?: string | null;
    zbita?: string | null;
    rekomendacja?: string | null;
  }> | null;
  krok_najslabszy?: string | null;
  parafraza_uzywana?: boolean | string | null;
  pitch_odnosil_sie_do_poprzednich_prob?: boolean | string | null;
  nastepne_kroki?: string | null;
  nastepny_kontakt_data?: string | null;
  data_reengagement?: string | null;
  nowe_objekcje_do_bazy?: string[] | null;
  nowe_obiekcje_do_bazy?: string[] | null;
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
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--separator)", margin: "18px 0" }} />;
}

function triValue(val: boolean | string | null | undefined): "yes" | "no" | "unknown" {
  if (val == null) return "unknown";
  if (typeof val === "boolean") return val ? "yes" : "no";
  const v = val.toUpperCase();
  if (v === "TAK" || v === "TRUE") return "yes";
  if (v === "NIE" || v === "FALSE") return "no";
  return "unknown";
}

function TechCheck({ label, value }: { label: string; value: "yes" | "no" | "unknown" }) {
  const icon =
    value === "yes" ? (
      <CheckCircle2 size={13} color="#34c759" />
    ) : value === "no" ? (
      <XCircle size={13} color="#ff3b30" />
    ) : (
      <MinusCircle size={13} color="var(--text-tertiary)" />
    );
  const color = value === "yes" ? "#34c759" : value === "no" ? "#ff3b30" : "var(--text-tertiary)";
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}
    >
      {icon}
      <span
        style={{
          fontFamily: "var(--font-system)",
          fontSize: 11,
          color,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function Agent4Card({ output }: { output: Agent4Output }) {
  const wynik = (output.wynik ?? "").toUpperCase();
  const isWin = wynik === "TAK";
  const isLoss = wynik === "NIE";

  const verdictColor = isWin ? "#34c759" : isLoss ? "#ff3b30" : "#ff9500";
  const verdictBg = isWin
    ? "rgba(52,199,89,0.09)"
    : isLoss
      ? "rgba(255,59,48,0.09)"
      : "rgba(255,149,0,0.09)";
  const verdictBorder = isWin
    ? "rgba(52,199,89,0.22)"
    : isLoss
      ? "rgba(255,59,48,0.22)"
      : "rgba(255,149,0,0.22)";
  const verdictLabel = isWin ? "ZAMKNIĘTE" : isLoss ? "NIE ZAMKNIĘTO" : "W TRAKCIE";

  const objekcje = output.obiekcje ?? [];
  const noweObjekcje = output.nowe_objekcje_do_bazy ?? output.nowe_obiekcje_do_bazy ?? [];

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
      {/* Header — Wynik */}
      <div
        style={{
          padding: "20px 24px 18px",
          background: "linear-gradient(160deg, rgba(26,86,255,0.09) 0%, transparent 50%)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 14px",
            background: verdictBg,
            border: `1px solid ${verdictBorder}`,
            borderRadius: 6,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 800,
              color: verdictColor,
              letterSpacing: "0.12em",
            }}
          >
            WYNIK — {verdictLabel}
          </span>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 54,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                color: verdictColor,
              }}
            >
              {wynik === "W TRAKCIE" || wynik === "W_TRAKCIE"
                ? "~"
                : wynik === "TAK"
                  ? "TAK"
                  : "NIE"}
            </div>
          </div>
          {output.kwota_potwierdzona != null && (
            <div style={{ marginBottom: 6 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {output.kwota_potwierdzona.toLocaleString("pl")} PLN
              </div>
              <div
                style={{
                  fontFamily: "var(--font-system)",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                kwota potwierdzona
              </div>
            </div>
          )}
        </div>

        {output.wdrozenie_start && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 10,
              fontSize: 13,
              color: "#34c759",
            }}
          >
            <Calendar size={12} />
            Start wdrożenia: {output.wdrozenie_start}
          </div>
        )}
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Techniki */}
        {(output.cisza_zachowana != null ||
          output.parafraza_uzywana != null ||
          output.pitch_odnosil_sie_do_poprzednich_prob != null ||
          output.krok_najslabszy) && (
          <>
            <Label>Analiza techniki sprzedaży</Label>
            <div style={{ display: "flex", gap: 8, marginBottom: output.krok_najslabszy ? 14 : 0 }}>
              <TechCheck label="Cisza zachowana" value={triValue(output.cisza_zachowana)} />
              <TechCheck label="Parafraza" value={triValue(output.parafraza_uzywana)} />
              <TechCheck
                label="Nawiązał do prób"
                value={triValue(output.pitch_odnosil_sie_do_poprzednich_prob)}
              />
            </div>
            {output.krok_najslabszy && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "10px 14px",
                  background: "rgba(255,149,0,0.09)",
                  border: "1px solid rgba(255,149,0,0.22)",
                  borderRadius: 8,
                }}
              >
                <AlertTriangle size={13} color="#ff9500" style={{ marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#ff9500",
                      marginBottom: 4,
                    }}
                  >
                    Krok najsłabszy
                  </div>
                  <div style={{ fontSize: 13, color: "#ff9500", lineHeight: 1.55 }}>
                    {output.krok_najslabszy}
                  </div>
                </div>
              </div>
            )}
            <Divider />
          </>
        )}

        {/* Objekcje */}
        {objekcje.length > 0 && (
          <>
            <Label>Objekcje na spotkaniu — {objekcje.length}</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {objekcje.map((obj, i) => {
                const zbita = (obj.zbita ?? "").toUpperCase();
                const isZbita = zbita === "TAK" || zbita === "ZBITA";
                const isNieZbita = zbita === "NIE" || zbita === "NIEZBITA";
                return (
                  <div
                    key={i}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    {/* Quote */}
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--border)",
                        background: "var(--bg-elevated)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <Quote
                          size={12}
                          color="var(--text-tertiary)"
                          style={{ flexShrink: 0, marginTop: 2 }}
                        />
                        <span
                          style={{
                            fontSize: 14,
                            color: "var(--text-secondary)",
                            fontStyle: "italic",
                            lineHeight: 1.55,
                          }}
                        >
                          {obj.tresc_cytat || "—"}
                        </span>
                        {obj.krok != null && (
                          <span
                            style={{
                              marginLeft: "auto",
                              flexShrink: 0,
                              padding: "2px 8px",
                              background: "rgba(26,86,255,0.10)",
                              border: "1px solid rgba(26,86,255,0.22)",
                              borderRadius: 5,
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "#1a56ff",
                            }}
                          >
                            Krok {obj.krok}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Response */}
                    <div style={{ padding: "10px 16px 10px 38px" }}>
                      {obj.odpowiedz_michala && (
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
                        >
                          <MessageSquare
                            size={11}
                            color="var(--text-tertiary)"
                            style={{ flexShrink: 0 }}
                          />
                          <span
                            style={{
                              fontSize: 13,
                              color: "var(--text-secondary)",
                              lineHeight: 1.55,
                            }}
                          >
                            {obj.odpowiedz_michala}
                          </span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
                        {(isZbita || isNieZbita) && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              color: isZbita ? "#34c759" : "#ff3b30",
                            }}
                          >
                            {isZbita ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                            {isZbita ? "Zbita" : "Niezbita"}
                          </span>
                        )}
                        {obj.rekomendacja && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-tertiary)",
                              fontStyle: "italic",
                              lineHeight: 1.4,
                            }}
                          >
                            {obj.rekomendacja}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Divider />
          </>
        )}

        {/* Reakcja na cenę */}
        {output.reakcja_na_cene_cytat && (
          <>
            <Label>Reakcja na cenę</Label>
            <div
              style={{
                padding: "14px 18px 14px 20px",
                borderLeft: "3px solid rgba(26,86,255,0.4)",
                background: "rgba(26,86,255,0.10)",
                borderRadius: "0 10px 10px 0",
                fontSize: 14,
                color: "var(--text-secondary)",
                fontStyle: "italic",
                lineHeight: 1.65,
              }}
            >
              &ldquo;{output.reakcja_na_cene_cytat}&rdquo;
            </div>
            <Divider />
          </>
        )}

        {/* Następne kroki */}
        {(output.nastepne_kroki || output.nastepny_kontakt_data || output.data_reengagement) && (
          <>
            <Label>Następne kroki</Label>
            {output.nastepne_kroki && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(26,86,255,0.10)",
                  border: "1px solid rgba(26,86,255,0.22)",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  lineHeight: 1.6,
                  marginBottom: 8,
                }}
              >
                {output.nastepne_kroki}
              </div>
            )}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {output.nastepny_kontakt_data && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  <Calendar size={11} />
                  Kontakt:{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    {output.nastepny_kontakt_data}
                  </strong>
                </div>
              )}
              {output.data_reengagement && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  <Calendar size={11} />
                  Re-engagement:{" "}
                  <strong style={{ color: "#ff9500" }}>{output.data_reengagement}</strong>
                </div>
              )}
            </div>
            <Divider />
          </>
        )}

        {/* Nowe objekcje do bazy */}
        {noweObjekcje.length > 0 && noweObjekcje.some(Boolean) && (
          <>
            <Label>Nowe objekcje — do dodania do bazy</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {noweObjekcje.filter(Boolean).map((o, i) => (
                <div
                  key={i}
                  style={{
                    padding: "8px 12px",
                    background: "rgba(255,149,0,0.09)",
                    border: "1px solid rgba(255,149,0,0.22)",
                    borderRadius: 7,
                    fontSize: 13,
                    color: "#ff9500",
                    lineHeight: 1.5,
                  }}
                >
                  {o}
                </div>
              ))}
            </div>
            <Divider />
          </>
        )}

        {/* Uwagi agenta */}
        {output.uwagi_agenta && (
          <>
            <Label>Obserwacje agenta</Label>
            <p
              style={{ fontSize: 13, lineHeight: 1.75, color: "var(--text-secondary)", margin: 0 }}
            >
              {output.uwagi_agenta}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
