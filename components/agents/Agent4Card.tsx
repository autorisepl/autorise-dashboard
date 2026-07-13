"use client";

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  MessageSquare,
  MinusCircle,
  Quote,
  Sparkles,
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

// Te same tokeny co reszta dashboardu (var(--accent) #0a84ff, var(--font-sans) Roboto) —
// Agent1-3Card wciąż używają starszej, hardcodowanej palety (#1a56ff, var(--font-mono) na
// etykietach), to osobny dług wizualny poza zakresem tego patcha (Etap 5 dotyczy wyłącznie
// panelu Agenta 4). Wartości SUCCESS/ERROR/WARNING pokrywają się z app/globals.css, więc
// zamiana na zmienne CSS nie zmienia żadnego koloru, tylko źródło prawdy.
function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        color: color ?? "var(--accent)",
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

interface FeedbackItem {
  text: string;
}

function FeedbackColumn({
  label,
  color,
  icon,
  items,
  emptyText,
}: {
  label: string;
  color: string;
  icon: React.ReactNode;
  items: FeedbackItem[];
  emptyText: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 220,
        padding: "14px 16px",
        borderRadius: "var(--radius-sm, 8px)",
        background: `${color}0f`,
        border: `1px solid ${color}30`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        {icon}
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            color,
          }}
        >
          {label}
        </span>
      </div>
      {items.length === 0 ? (
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-tertiary)",
            fontStyle: "italic",
          }}
        >
          {emptyText}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              {item.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Agent4Card({ output }: { output: Agent4Output }) {
  const wynik = (output.wynik ?? "").toUpperCase();
  const isWin = wynik === "TAK";
  const isLoss = wynik === "NIE";

  const verdictColor = isWin ? "var(--success)" : isLoss ? "var(--error)" : "var(--warning)";
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

  // Wyprowadzone z istniejących pól (tri-state checki + obiekcje) — czysto prezentacyjne
  // grupowanie w stylu "mocne strony / do poprawy" z Agenta 1, bez zmiany danych z Agenta 4.
  const poszlyDobrze: FeedbackItem[] = [];
  const doPoprawy: FeedbackItem[] = [];

  if (triValue(output.cisza_zachowana) === "yes") {
    poszlyDobrze.push({ text: "Cisza po podaniu ceny została zachowana (min. 20 sekund)." });
  } else if (triValue(output.cisza_zachowana) === "no") {
    doPoprawy.push({ text: "Cisza po cenie nie została zachowana — Michał przerwał za wcześnie." });
  }

  if (triValue(output.parafraza_uzywana) === "yes") {
    poszlyDobrze.push({ text: "Parafraza używana konsekwentnie po odpowiedziach klienta." });
  } else if (triValue(output.parafraza_uzywana) === "no") {
    doPoprawy.push({ text: "Brak parafrazy po odpowiedziach klienta w Information Gathering." });
  }

  if (triValue(output.pitch_odnosil_sie_do_poprzednich_prob) === "yes") {
    poszlyDobrze.push({ text: "Pitch nawiązywał wprost do poprzednich prób klienta." });
  } else if (triValue(output.pitch_odnosil_sie_do_poprzednich_prob) === "no") {
    doPoprawy.push({
      text: "Pitch nie nawiązał do poprzednich prób klienta — brakujący fundament.",
    });
  }

  for (const obj of objekcje) {
    const z = (obj.zbita ?? "").toUpperCase();
    const quote = obj.tresc_cytat ? `„${obj.tresc_cytat.slice(0, 90)}"` : "obiekcja";
    if (z === "TAK" || z === "ZBITA") {
      poszlyDobrze.push({ text: `Obiekcja zbita: ${quote}` });
    } else if (z === "NIE" || z === "NIEZBITA") {
      doPoprawy.push({
        text: obj.rekomendacja ? `${quote} — ${obj.rekomendacja}` : `Obiekcja niezbita: ${quote}`,
      });
    }
  }

  if (output.krok_najslabszy) {
    doPoprawy.push({ text: `Krok najsłabszy: ${output.krok_najslabszy}` });
  }

  const hasFeedback = poszlyDobrze.length > 0 || doPoprawy.length > 0;

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        height: "100%",
        overflow: "auto",
        fontFamily: "var(--font-sans)",
        color: "var(--text-primary)",
      }}
    >
      {/* Header — Wynik */}
      <div
        style={{
          padding: "20px 24px 18px",
          background: "linear-gradient(160deg, rgba(10,132,255,0.09) 0%, transparent 50%)",
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
            borderRadius: "var(--radius-xs, 6px)",
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 800,
              color: verdictColor,
              letterSpacing: "0.1em",
            }}
          >
            WYNIK — {verdictLabel}
          </span>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 48,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.03em",
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
                  fontFamily: "var(--font-sans)",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                {output.kwota_potwierdzona.toLocaleString("pl")} PLN
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
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
              color: "var(--success-text)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <Calendar size={12} />
            Start wdrożenia: {output.wdrozenie_start}
          </div>
        )}
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Jak poszła rozmowa — mocne strony / do poprawy, w stylu Agenta 1 */}
        {hasFeedback && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Sparkles size={13} color="var(--accent)" />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Jak poszła rozmowa
              </span>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
              <FeedbackColumn
                label="Zadziałało"
                color="var(--success-text)"
                icon={<CheckCircle2 size={13} color="var(--success)" />}
                items={poszlyDobrze}
                emptyText="Brak jednoznacznie pozytywnych sygnałów w tej rozmowie."
              />
              <FeedbackColumn
                label="Do poprawy"
                color="#c26a00"
                icon={<AlertTriangle size={13} color="var(--warning)" />}
                items={doPoprawy}
                emptyText="Brak zidentyfikowanych braków — rozmowa zgodna ze skryptem."
              />
            </div>
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
                      borderRadius: "var(--radius-md, 10px)",
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
                            fontFamily: "var(--font-sans)",
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
                              background: "rgba(10,132,255,0.10)",
                              border: "1px solid rgba(10,132,255,0.22)",
                              borderRadius: 5,
                              fontFamily: "var(--font-sans)",
                              fontSize: 10,
                              fontWeight: 600,
                              color: "var(--accent)",
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
                              fontFamily: "var(--font-sans)",
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
                              fontFamily: "var(--font-sans)",
                              fontSize: 11,
                              fontWeight: 600,
                              color: isZbita ? "var(--success-text)" : "var(--error)",
                            }}
                          >
                            {isZbita ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                            {isZbita ? "Zbita" : "Niezbita"}
                          </span>
                        )}
                        {obj.rekomendacja && (
                          <span
                            style={{
                              fontFamily: "var(--font-sans)",
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
                borderLeft: "3px solid rgba(10,132,255,0.4)",
                background: "rgba(10,132,255,0.08)",
                borderRadius: "0 var(--radius-md, 10px) var(--radius-md, 10px) 0",
                fontFamily: "var(--font-sans)",
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
                  background: "rgba(10,132,255,0.08)",
                  border: "1px solid rgba(10,132,255,0.22)",
                  borderRadius: "var(--radius-md, 10px)",
                  fontFamily: "var(--font-sans)",
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
                    fontFamily: "var(--font-sans)",
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
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  <Calendar size={11} />
                  Re-engagement:{" "}
                  <strong style={{ color: "var(--warning)" }}>{output.data_reengagement}</strong>
                </div>
              )}
            </div>
            <Divider />
          </>
        )}

        {/* Nowe objekcje do bazy */}
        {noweObjekcje.length > 0 && noweObjekcje.some(Boolean) && (
          <>
            <Label color="var(--warning)">Nowe objekcje — do dodania do bazy</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {noweObjekcje.filter(Boolean).map((o, i) => (
                <div
                  key={i}
                  style={{
                    padding: "8px 12px",
                    background: "rgba(255,149,0,0.09)",
                    border: "1px solid rgba(255,149,0,0.22)",
                    borderRadius: 7,
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--warning)",
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
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                lineHeight: 1.75,
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              {output.uwagi_agenta}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
