"use client";

import {
  BadgeCheck,
  BadgeX,
  Building2,
  CheckCircle2,
  Hash,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";

export interface Agent0Zarzad {
  imie: string;
  nazwisko: string;
  funkcja: string;
}

export interface Agent0Output {
  kontakt_imie?: string | null;
  kontakt_nazwisko?: string | null;
  telefon?: string | null;
  email?: string | null;
  nip?: string | null;
  firma_slack?: string | null;
  firma_krs?: string | null;
  krs_numer?: string | null;
  adres?: string | null;
  pkd_glowne?: string | null;
  pkd_kody?: string[];
  zarzad?: Agent0Zarzad[];
  jest_decydentem?: boolean | null;
  match_zarzadu?: string | null;
  ocena_tsl?: "pewne" | "mozliwe" | "malo_prawdopodobne" | "nieznane" | null;
  vat_status?: string | null;
  regon?: string | null;
  notatka_krs?: string | null;
  uwagi?: string | null;
  krs_source?: string | null;
}

const ACCENT = "#1a56ff";
const SUCCESS = "#34c759";
const WARNING = "#ff9500";

// ── Helpers ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.13em",
        textTransform: "uppercase" as const,
        color: ACCENT,
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 14,
      }}
    >
      <div style={{ width: 14, height: 1.5, background: ACCENT, borderRadius: 1, opacity: 0.7 }} />
      {children}
    </div>
  );
}

function TSLBadge({ ocena }: { ocena: Agent0Output["ocena_tsl"] }) {
  const cfg = {
    pewne: {
      label: "TSL · Pewne",
      color: SUCCESS,
      bg: "rgba(52,199,89,0.10)",
      border: "rgba(52,199,89,0.22)",
      Icon: ShieldCheck,
    },
    mozliwe: {
      label: "TSL · Możliwe",
      color: WARNING,
      bg: "rgba(255,149,0,0.10)",
      border: "rgba(255,149,0,0.22)",
      Icon: Truck,
    },
    malo_prawdopodobne: {
      label: "TSL · Mało prawdop.",
      color: "#ff3b30",
      bg: "rgba(255,59,48,0.08)",
      border: "rgba(255,59,48,0.22)",
      Icon: ShieldAlert,
    },
    nieznane: {
      label: "TSL · Nieznane",
      color: "var(--text-secondary)",
      bg: "rgba(107,114,128,0.07)",
      border: "var(--border)",
      Icon: HelpCircle,
    },
  }[ocena ?? "nieznane"];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 12px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 999,
      }}
    >
      <cfg.Icon size={11} color={cfg.color} />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          color: cfg.color,
          letterSpacing: "0.05em",
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

function ContactChip({
  icon: Icon,
  value,
  mono = false,
}: {
  icon: React.ElementType;
  value: string | null | undefined;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 12px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
      }}
    >
      <Icon size={12} color="var(--text-tertiary)" />
      <span
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-system)",
          fontSize: mono ? 11 : 13,
          color: "var(--text-secondary)",
          letterSpacing: mono ? "0.03em" : 0,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function DataLine({
  label,
  value,
  accent = false,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  accent?: boolean;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          color: "var(--text-tertiary)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-system)",
          fontSize: mono ? 12 : 13,
          color: accent ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight: accent ? 600 : 400,
          lineHeight: 1.45,
          letterSpacing: mono ? "0.02em" : 0,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Decydent + Zarząd ─────────────────────────────────────────────────

function DecydentBlock({
  jest,
  match,
  zarzad,
}: {
  jest: boolean | null | undefined;
  match?: string | null;
  zarzad: Agent0Zarzad[];
}) {
  const verdict = (() => {
    if (jest === true)
      return {
        icon: <BadgeCheck size={16} color={SUCCESS} />,
        headline: "Decydent potwierdzony",
        sub: match ? `Dopasowanie: ${match}` : null,
        bg: "rgba(52,199,89,0.07)",
        border: "rgba(52,199,89,0.2)",
        color: SUCCESS,
      };
    if (jest === false)
      return {
        icon: <BadgeX size={16} color={WARNING} />,
        headline: "Nie figuruje w zarządzie",
        sub: "Zapytaj o decydenta w discovery call",
        bg: "rgba(255,149,0,0.07)",
        border: "rgba(255,149,0,0.2)",
        color: WARNING,
      };
    return {
      icon: <HelpCircle size={16} color="var(--text-secondary)" />,
      headline: "Nie zweryfikowano",
      sub: "Brak zarządu w KRS lub dane niekompletne",
      bg: "rgba(107,114,128,0.05)",
      border: "var(--border)",
      color: "var(--text-secondary)",
    };
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "13px 18px",
          background: verdict.bg,
          border: `1px solid ${verdict.border}`,
          borderRadius: 12,
        }}
      >
        {verdict.icon}
        <div>
          <div
            style={{
              fontFamily: "var(--font-system)",
              fontSize: 14,
              fontWeight: 700,
              color: verdict.color,
              lineHeight: 1.2,
            }}
          >
            {verdict.headline}
          </div>
          {verdict.sub && (
            <div
              style={{
                fontFamily: "var(--font-system)",
                fontSize: 12,
                color: verdict.color,
                opacity: 0.7,
                marginTop: 2,
              }}
            >
              {verdict.sub}
            </div>
          )}
        </div>
      </div>

      {zarzad.length > 0 && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <Users size={11} color="var(--text-tertiary)" />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: "var(--text-tertiary)",
              }}
            >
              Zarząd KRS
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {zarzad.map((z, i) => {
              const fullName = `${z.imie} ${z.nazwisko}`;
              const isMatch = match?.toLowerCase().includes(z.nazwisko.toLowerCase());
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 9,
                    background: isMatch ? "rgba(52,199,89,0.07)" : "var(--bg-elevated)",
                    border: `1px solid ${isMatch ? "rgba(52,199,89,0.2)" : "var(--border)"}`,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontFamily: "var(--font-system)",
                        fontSize: 13,
                        fontWeight: isMatch ? 700 : 500,
                        color: isMatch ? SUCCESS : "var(--text-primary)",
                      }}
                    >
                      {fullName}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                        marginLeft: 8,
                      }}
                    >
                      {z.funkcja}
                    </span>
                  </div>
                  {isMatch && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        fontWeight: 700,
                        color: SUCCESS,
                        background: "rgba(52,199,89,0.10)",
                        border: "1px solid rgba(52,199,89,0.22)",
                        padding: "2px 8px",
                        borderRadius: 999,
                        letterSpacing: "0.07em",
                        flexShrink: 0,
                      }}
                    >
                      KONTAKT
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export function Agent0Card({ output }: { output: Agent0Output }) {
  const kontaktFull = [output.kontakt_imie, output.kontakt_nazwisko].filter(Boolean).join(" ");
  const firma = output.firma_krs || output.firma_slack;
  const hasKRS = Boolean(output.krs_numer || output.firma_krs);
  const zarzad = output.zarzad ?? [];
  const pkdKody = output.pkd_kody ?? [];
  const initials = kontaktFull
    ? kontaktFull
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "NN";

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        background: "var(--bg-elevated)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          padding: "24px 28px 20px",
          background: `linear-gradient(160deg, rgba(26,86,255,0.07) 0%, transparent 55%)`,
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
              color: ACCENT,
            }}
          >
            Karta leada
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={12} color={SUCCESS} />
            <span
              style={{
                fontFamily: "var(--font-system)",
                fontSize: 12,
                color: SUCCESS,
                fontWeight: 600,
              }}
            >
              Zapisano w Notion
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              flexShrink: 0,
              background: "linear-gradient(135deg, #1a56ff 0%, #1d4ed8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px rgba(26,86,255,0.28)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-system)",
                fontSize: 17,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              {initials}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-system)",
                fontSize: 26,
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.035em",
                lineHeight: 1.1,
                marginBottom: 4,
              }}
            >
              {kontaktFull || "Nowy Lead"}
            </div>
            {firma && (
              <div
                style={{
                  fontFamily: "var(--font-system)",
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                {firma}
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 7,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                background: "rgba(26,86,255,0.10)",
                border: "1px solid rgba(26,86,255,0.22)",
                borderRadius: 999,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: ACCENT,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 700,
                  color: ACCENT,
                  letterSpacing: "0.1em",
                }}
              >
                NOWY LEAD
              </span>
            </div>
            <TSLBadge ocena={output.ocena_tsl} />
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <ContactChip icon={Phone} value={output.telefon} mono />
          <ContactChip icon={Mail} value={output.email} mono />
          {output.nip && <ContactChip icon={Hash} value={`NIP ${output.nip}`} mono />}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Company + KRS */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "20px 22px",
          }}
        >
          <SectionLabel>Firma {hasKRS ? "· dane KRS" : "· brak KRS"}</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 28px" }}>
            <DataLine label="Nazwa oficjalna" value={output.firma_krs} accent />
            {output.firma_slack && output.firma_krs !== output.firma_slack && (
              <DataLine label="Nazwa ze Slacka" value={output.firma_slack} />
            )}
            <DataLine label="Adres siedziby" value={output.adres} />
            <DataLine label="Numer KRS" value={output.krs_numer} mono />
            <DataLine label="REGON" value={output.regon} mono />
            {output.vat_status && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    color: "var(--text-tertiary)",
                  }}
                >
                  Status VAT
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck
                    size={12}
                    color={output.vat_status === "Czynny" ? SUCCESS : "var(--text-secondary)"}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-system)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: output.vat_status === "Czynny" ? SUCCESS : "var(--text-secondary)",
                    }}
                  >
                    {output.vat_status}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Decydent + Zarząd */}
        <div>
          <SectionLabel>Analiza decydenta</SectionLabel>
          <DecydentBlock
            jest={output.jest_decydentem}
            match={output.match_zarzadu}
            zarzad={zarzad}
          />
        </div>

        {/* PKD */}
        {(output.pkd_glowne || pkdKody.length > 0) && (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "20px 22px",
            }}
          >
            <SectionLabel>Działalność PKD</SectionLabel>
            {output.pkd_glowne && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 14px",
                  background: "rgba(26,86,255,0.07)",
                  border: "1px solid rgba(26,86,255,0.15)",
                  borderRadius: 10,
                  marginBottom: pkdKody.length > 1 ? 10 : 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fontWeight: 700,
                    color: ACCENT,
                    background: "rgba(26,86,255,0.12)",
                    border: "1px solid rgba(26,86,255,0.2)",
                    padding: "2px 8px",
                    borderRadius: 999,
                    flexShrink: 0,
                    marginTop: 1,
                    letterSpacing: "0.07em",
                  }}
                >
                  GŁÓWNE
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-system)",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    lineHeight: 1.5,
                  }}
                >
                  {output.pkd_glowne}
                </span>
              </div>
            )}
            {pkdKody.length > 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {pkdKody.slice(1, 12).map((kod) => (
                  <span
                    key={kod}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--text-secondary)",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      padding: "3px 9px",
                      borderRadius: 6,
                    }}
                  >
                    {kod}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notatka — prose paragraphs, NOT pre/mono AI slop */}
        {output.notatka_krs && (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "20px 22px",
            }}
          >
            <SectionLabel>Notatka · Notion</SectionLabel>
            <div
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                lineHeight: 1.75,
                fontFamily: "var(--font-system)",
              }}
            >
              {output.notatka_krs
                .split("\n")
                .filter((p) => p.trim())
                .map((para, i) => (
                  <p key={i} style={{ margin: i > 0 ? "10px 0 0" : 0 }}>
                    {para}
                  </p>
                ))}
            </div>
          </div>
        )}

        {/* Agent warning */}
        {output.uwagi && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              padding: "14px 18px",
              background: "rgba(255,149,0,0.07)",
              border: "1px solid rgba(255,149,0,0.2)",
              borderRadius: 12,
            }}
          >
            <div
              style={{
                width: 3,
                alignSelf: "stretch",
                background: WARNING,
                borderRadius: 2,
                flexShrink: 0,
                minHeight: 16,
              }}
            />
            <div
              style={{
                fontFamily: "var(--font-system)",
                fontSize: 13,
                color: "var(--text-primary)",
                lineHeight: 1.65,
              }}
            >
              {output.uwagi}
            </div>
          </div>
        )}

        {/* Source */}
        {output.krs_source && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--text-tertiary)",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                padding: "3px 9px",
                borderRadius: 6,
                letterSpacing: "0.05em",
              }}
            >
              źródło: {output.krs_source}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
