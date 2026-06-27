"use client";

import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Phone,
  Target,
  TrendingUp,
  Truck,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { CalendarAddButton } from "./CalendarAddButton";
import { SmsPanel } from "./SmsPanel";

export interface Agent1Output {
  imie_nazwisko?: string | null;
  firma?: string | null;
  telefon?: string | null;
  pojazdy?: string | number | null;
  spedytorzy_biuro?: string | null;
  wlasciciel_czy_manager?: string | null;
  decydent?: string | null;
  bol_glowny_cytat?: string | null;
  motywacja_cytat?: string | null;
  poprzednie_proby?: string | null;
  poprzednie_proby_powod_niepowodzenia?: string | null;
  koszt_problemu?: {
    spedytorzy_liczba?: number | null;
    procent_czasu?: number | null;
    stawka_miesiecznie?: number | null;
    koszt_miesiecznie?: number | null;
    koszt_roczny?: number | null;
    czy_szacunek?: boolean;
  } | null;
  tms?: string | null;
  inne_systemy?: string | null;
  podejscie_integracyjne?: string | null;
  czas_setup_dni?: number | null;
  pre_commit_cytat?: string | null;
  urgency?: string | null;
  icp?: {
    wynik?: number | null;
    flota_ok?: boolean | string | null;
    biuro_ok?: boolean | string | null;
    decyzyjnosc_ok?: boolean | string | null;
    bol_ok?: boolean | string | null;
    aktywne_szukanie_ok?: boolean | string | null;
    kwalifikacja?: string | null;
  } | null;
  status?: string | null;
  meet_data?: string | null;
  meet_godzina?: string | null;
  nastepny_krok?: string | null;
  uwagi_agenta?: string | null;
  dyskwalifikacja?: boolean | null;
  dyskwalifikacja_powod?: string | null;
}

// ─── Apple system palette (hardcoded per spec) ───────────────────────────────
const ACCENT = "#1a56ff";
const SUCCESS = "#34c759";
const ERROR = "#ff3b30";
const WARNING = "#ff9500";

function icpOk(val?: boolean | string | null): boolean {
  if (val == null) return false;
  if (typeof val === "boolean") return val;
  return val.toUpperCase() === "TAK";
}

function stripQuotes(text: string): string {
  return text
    .replace(/^["«„]/, "")
    .replace(/["»"]$/, "")
    .trim();
}

function parseQuotes(text: string | null | undefined): string[] {
  if (!text) return [];
  const cleaned = stripQuotes(text);
  const parts = cleaned
    .split(/[/]\s*/)
    .map((s) => stripQuotes(s).trim())
    .filter((s) => s.length > 6);
  return parts.length > 1 ? parts : [cleaned];
}

function parseNotes(text: string | null | undefined): Array<{ head: string; body: string }> {
  if (!text) return [];
  return text
    .split(/\n(?=\d+\.)/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const lines = s.split("\n");
      return {
        head: lines[0].replace(/^\d+\.\s*/, "").trim(),
        body: lines.slice(1).join("\n").trim(),
      };
    });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-system)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: color ?? "var(--text-tertiary)",
      }}
    >
      {children}
    </span>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        paddingBottom: 12,
        borderBottom: "1px solid var(--separator)",
        marginBottom: 14,
      }}
    >
      <span style={{ color: ACCENT, display: "flex", alignItems: "center" }}>{icon}</span>
      <Label>{label}</Label>
    </div>
  );
}

function IcpRow({ label, ok }: { label: string; ok?: boolean | string | null }) {
  const pass = icpOk(ok);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 0" }}>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          background: pass ? `${SUCCESS}1a` : `${ERROR}1a`,
          border: `1px solid ${pass ? `${SUCCESS}38` : `${ERROR}38`}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {pass ? <CheckCircle2 size={11} color={SUCCESS} /> : <XCircle size={11} color={ERROR} />}
      </div>
      <span
        style={{
          fontFamily: "var(--font-system)",
          fontSize: 13,
          color: pass ? "var(--text-primary)" : "var(--text-secondary)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function ScoreDots({ score }: { score: number | null | undefined }) {
  const filled = score ?? 0;
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: i <= filled ? ACCENT : `${ACCENT}26`,
            border: `1px solid ${i <= filled ? ACCENT : `${ACCENT}40`}`,
            boxShadow: i <= filled ? `0 0 8px ${ACCENT}60` : "none",
          }}
        />
      ))}
    </div>
  );
}

function QuoteBlock({ text }: { text: string | null | undefined }) {
  const parts = parseQuotes(text);
  if (!parts.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {parts.slice(0, 3).map((q, i) => (
        <div
          key={i}
          style={{
            paddingLeft: 14,
            borderLeft: `2px solid ${ACCENT}50`,
            fontFamily: "var(--font-system)",
            fontSize: 14,
            color: "var(--text-secondary)",
            fontStyle: "italic",
            lineHeight: 1.6,
          }}
        >
          &ldquo;{q}&rdquo;
        </div>
      ))}
    </div>
  );
}

function BigNum({
  value,
  unit,
  accent,
  size = 44,
}: {
  value: string | number;
  unit: string;
  accent?: boolean;
  size?: number;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: size,
          fontWeight: 800,
          color: accent ? ACCENT : "var(--text-primary)",
          lineHeight: 1,
          letterSpacing: "-0.04em",
        }}
      >
        {typeof value === "number" ? value.toLocaleString("pl") : value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-system)",
          fontSize: 12,
          color: "var(--text-secondary)",
          marginTop: 4,
          letterSpacing: "0.04em",
        }}
      >
        {unit}
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function Agent1Card({ output }: { output: Agent1Output }) {
  const [notesOpen, setNotesOpen] = useState(false);

  const icp = output.icp;
  const score = icp?.wynik ?? null;
  const kwal = (icp?.kwalifikacja ?? "").toUpperCase();
  const isDisq = output.dyskwalifikacja === true || kwal.includes("NIE KWALIFIKUJE");
  const isOk =
    !isDisq && kwal.includes("KWALIFIKUJE") && !kwal.includes("NIE") && !kwal.includes("WYMAGA");

  const verdictColor = isDisq ? ERROR : isOk ? SUCCESS : WARNING;
  const verdictBg = isDisq ? `${ERROR}1a` : isOk ? `${SUCCESS}1a` : `${WARNING}1a`;
  const verdictBorder = isDisq ? `${ERROR}38` : isOk ? `${SUCCESS}38` : `${WARNING}38`;
  const verdictLabel = isDisq ? "NIE KWALIFIKUJE" : isOk ? "KWALIFIKUJE" : "DO WERYFIKACJI";

  // Konkretny, krótki powód werdyktu (zamiast samego "WYMAGA ANALIZY").
  const missingIcp = [
    !icpOk(icp?.flota_ok) && "flota",
    !icpOk(icp?.biuro_ok) && "biuro 2+",
    !icpOk(icp?.decyzyjnosc_ok) && "decydent",
    !icpOk(icp?.bol_ok) && "ból",
    !icpOk(icp?.aktywne_szukanie_ok) && "aktywne szukanie",
  ].filter(Boolean) as string[];
  const verdictReason = isDisq
    ? output.dyskwalifikacja_powod || "Nie spełnia kryteriów ICP."
    : isOk
      ? null
      : output.dyskwalifikacja_powod ||
        (missingIcp.length > 0
          ? `Braki ICP: ${missingIcp.join(", ")}${score != null ? ` (${score}/5)` : ""}`
          : "Niejednoznaczna kwalifikacja — sprawdź szczegóły.");

  // KLIENT = osoba (imię i nazwisko) ma priorytet nad nazwą firmy.
  const displayName = output.imie_nazwisko || output.firma || "Nowy klient";
  const displaySub = output.firma && output.imie_nazwisko ? output.firma : null;

  const hasCost =
    output.koszt_problemu?.koszt_miesiecznie != null || output.koszt_problemu?.koszt_roczny != null;

  const notes = parseNotes(output.uwagi_agenta);

  const fleet =
    output.pojazdy != null
      ? typeof output.pojazdy === "number"
        ? output.pojazdy
        : parseInt(String(output.pojazdy), 10) || String(output.pojazdy)
      : null;

  const spedNum = output.spedytorzy_biuro
    ? (() => {
        const m = String(output.spedytorzy_biuro).match(/\d+/);
        return m ? parseInt(m[0], 10) : null;
      })()
    : null;

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        fontFamily: "var(--font-system)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
        color: "var(--text-primary)",
      }}
    >
      {/* ─── HEADER ─── */}
      <div
        style={{
          padding: "24px 28px 20px",
          background: `linear-gradient(160deg, ${ACCENT}1e 0%, transparent 60%)`,
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {/* Row 1: verdict badge + score */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          {/* Verdict — large, colored background */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 18px",
              borderRadius: 8,
              background: verdictBg,
              border: `1.5px solid ${verdictBorder}`,
            }}
          >
            <Zap size={13} color={verdictColor} />
            <span
              style={{
                fontFamily: "var(--font-system)",
                fontSize: 12,
                fontWeight: 800,
                color: verdictColor,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {verdictLabel}
            </span>
          </div>

          {/* Konkretny powód werdyktu (zamiast "WYMAGA ANALIZY" bez treści) */}
          {verdictReason && (
            <div
              style={{
                fontFamily: "var(--font-system)",
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.45,
                maxWidth: 520,
              }}
            >
              {verdictReason}
            </div>
          )}

          {/* Score dots + numeric */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ScoreDots score={score} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              {score ?? "?"}
              <span style={{ color: "var(--text-tertiary)" }}>/5</span>
            </span>
          </div>
        </div>

        {/* Row 2: company / contact name */}
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
          }}
        >
          {displayName}
        </div>

        {/* Row 3: contact name (if company shown above) + phone chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 8,
          }}
        >
          {displaySub && (
            <span style={{ fontSize: 15, color: "var(--text-secondary)" }}>{displaySub}</span>
          )}
          {output.telefon && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                background: `${ACCENT}1a`,
                border: `1px solid ${ACCENT}38`,
                borderRadius: 6,
              }}
            >
              <Phone size={11} color={ACCENT} />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: ACCENT,
                  letterSpacing: "0.04em",
                }}
              >
                {output.telefon}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── MAIN 2×2 GRID ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
          background: "var(--separator)",
          flexShrink: 0,
        }}
      >
        {/* TL — Company data + ICP checklist */}
        <div style={{ background: "var(--bg-elevated)", padding: "20px 22px" }}>
          <SectionHeader icon={<Truck size={13} />} label="Dane firmy" />

          <div style={{ display: "flex", gap: 28, marginBottom: 16 }}>
            {fleet != null && <BigNum value={fleet} unit="pojazdów" accent size={40} />}
            {spedNum != null && <BigNum value={spedNum} unit="spedytorów" size={40} />}
          </div>

          {output.wlasciciel_czy_manager && (
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
              {output.wlasciciel_czy_manager}
            </div>
          )}

          {output.decydent && (
            <div
              style={{
                display: "inline-block",
                padding: "4px 10px",
                background: `${ACCENT}1a`,
                border: `1px solid ${ACCENT}38`,
                borderRadius: 5,
                fontSize: 12,
                color: ACCENT,
                marginBottom: 18,
              }}
            >
              {output.decydent}
            </div>
          )}

          <div
            style={{
              borderTop: "1px solid var(--separator)",
              paddingTop: 14,
              marginTop: 6,
            }}
          >
            <Label>Weryfikacja ICP</Label>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column" }}>
              <IcpRow label="Flota ≥ 10 pojazdów" ok={icp?.flota_ok} />
              <IcpRow label="Biuro ≥ 2 osoby" ok={icp?.biuro_ok} />
              <IcpRow label="Decyzyjność" ok={icp?.decyzyjnosc_ok} />
              <IcpRow label="Ból zdefiniowany" ok={icp?.bol_ok} />
              <IcpRow label="Aktywnie szuka rozwiązania" ok={icp?.aktywne_szukanie_ok} />
            </div>
          </div>
        </div>

        {/* TR — Pain + Motivation + Pre-commit */}
        <div
          style={{
            background: "var(--bg-elevated)",
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {output.bol_glowny_cytat && (
            <div>
              <SectionHeader icon={<AlertTriangle size={13} />} label="Ból główny" />
              <QuoteBlock text={output.bol_glowny_cytat} />
            </div>
          )}

          {output.motywacja_cytat && (
            <div>
              <SectionHeader icon={<TrendingUp size={13} />} label="Motywacja" />
              <QuoteBlock text={output.motywacja_cytat} />
            </div>
          )}

          {output.pre_commit_cytat && (
            <div>
              <SectionHeader icon={<Zap size={13} />} label="Pre-commit" />
              <div
                style={{
                  padding: "10px 14px",
                  background: `${WARNING}1a`,
                  border: `1px solid ${WARNING}38`,
                  borderRadius: 7,
                  fontSize: 14,
                  color: WARNING,
                  fontStyle: "italic",
                  lineHeight: 1.55,
                }}
              >
                &ldquo;{stripQuotes(output.pre_commit_cytat)}&rdquo;
              </div>
            </div>
          )}
        </div>

        {/* BL — Systems */}
        <div style={{ background: "var(--bg-card)", padding: "20px 22px" }}>
          <SectionHeader icon={<Database size={13} />} label="Systemy" />

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Label>TMS</Label>
              <div
                style={{
                  marginTop: 5,
                  fontSize: 14,
                  fontWeight: 600,
                  color: output.tms?.toLowerCase().includes("brak") ? ERROR : "var(--text-primary)",
                  lineHeight: 1.4,
                }}
              >
                {output.tms || "—"}
              </div>
            </div>

            {output.inne_systemy && (
              <div>
                <Label>Inne systemy</Label>
                <div
                  style={{
                    marginTop: 5,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {output.inne_systemy}
                </div>
              </div>
            )}

            {output.podejscie_integracyjne && (
              <div>
                <Label>Integracja</Label>
                <div
                  style={{
                    marginTop: 5,
                    fontSize: 13,
                    color: output.podejscie_integracyjne.toLowerCase().includes("brak")
                      ? ERROR
                      : ACCENT,
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  {output.podejscie_integracyjne}
                </div>
              </div>
            )}

            {output.poprzednie_proby && (
              <div>
                <Label>Poprzednie próby</Label>
                <div
                  style={{
                    marginTop: 5,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {output.poprzednie_proby}
                </div>
                {output.poprzednie_proby_powod_niepowodzenia && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: ERROR,
                      opacity: 0.8,
                      fontStyle: "italic",
                    }}
                  >
                    {output.poprzednie_proby_powod_niepowodzenia}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BR — Cost + Urgency + Next step */}
        <div
          style={{
            background: "var(--bg-card)",
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div>
            <SectionHeader icon={<Target size={13} />} label="Koszt problemu" />
            {hasCost ? (
              <div style={{ display: "flex", gap: 28, alignItems: "flex-end" }}>
                {output.koszt_problemu?.koszt_miesiecznie != null && (
                  <BigNum
                    value={output.koszt_problemu.koszt_miesiecznie}
                    unit="PLN / miesiąc"
                    accent
                    size={42}
                  />
                )}
                {output.koszt_problemu?.koszt_roczny != null && (
                  <BigNum value={output.koszt_problemu.koszt_roczny} unit="PLN / rok" size={32} />
                )}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                  fontStyle: "italic",
                }}
              >
                Niepoliczalny — brak danych
              </div>
            )}
            {output.koszt_problemu?.procent_czasu != null && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                {output.koszt_problemu.procent_czasu}% czasu spedytora
                {output.koszt_problemu.czy_szacunek && (
                  <span
                    style={{
                      marginLeft: 8,
                      padding: "2px 6px",
                      background: `${WARNING}1a`,
                      border: `1px solid ${WARNING}38`,
                      borderRadius: 4,
                      fontSize: 10,
                      color: WARNING,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    szacunek
                  </span>
                )}
              </div>
            )}
          </div>

          {output.urgency && (
            <div>
              <SectionHeader icon={<Clock size={13} />} label="Urgency" />
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {output.urgency}
              </div>
            </div>
          )}

          <div>
            <SectionHeader icon={<ArrowRight size={13} />} label="Status i następny krok" />
            {output.status && (
              <div
                style={{
                  fontSize: 14,
                  color: "var(--text-primary)",
                  lineHeight: 1.5,
                  marginBottom: 10,
                }}
              >
                {output.status}
              </div>
            )}
            {output.nastepny_krok && (
              <div
                style={{
                  padding: "10px 14px",
                  background: `${ACCENT}1a`,
                  border: `1px solid ${ACCENT}38`,
                  borderRadius: 7,
                  fontSize: 14,
                  fontWeight: 600,
                  color: ACCENT,
                  lineHeight: 1.5,
                  marginBottom: 8,
                }}
              >
                {output.nastepny_krok}
              </div>
            )}
            {output.meet_data && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 13,
                    color: SUCCESS,
                  }}
                >
                  <Calendar size={13} />
                  {output.meet_data}
                  {output.meet_godzina && (
                    <span style={{ color: "var(--text-tertiary)" }}>· {output.meet_godzina}</span>
                  )}
                </div>
                <CalendarAddButton
                  summary={`Discovery — ${displayName}`}
                  dateStr={output.meet_data}
                  timeStr={output.meet_godzina}
                  description={
                    [
                      output.telefon ? `Telefon: ${output.telefon}` : null,
                      output.firma ? `Firma: ${output.firma}` : null,
                      output.nastepny_krok ? `Następny krok: ${output.nastepny_krok}` : null,
                    ]
                      .filter(Boolean)
                      .join("\n") || undefined
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── SMS DO WYSŁANIA (kopiuj-wklej, scenariusz auto z danych) ─── */}
      <SmsPanel
        ctx={{
          imieNazwisko: output.imie_nazwisko,
          data: output.meet_data,
          godzina: output.meet_godzina,
          dyskwalifikacja: output.dyskwalifikacja,
          kwalifikacja: icp?.kwalifikacja,
        }}
      />

      {/* ─── AGENT NOTES (collapsible) ─── */}
      {notes.length > 0 && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--bg-card)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setNotesOpen((v) => !v)}
            style={{
              width: "100%",
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-system)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Label color="var(--text-secondary)">Analiza agenta</Label>
              <span
                style={{
                  padding: "2px 8px",
                  background: `${ACCENT}1a`,
                  border: `1px solid ${ACCENT}38`,
                  borderRadius: 99,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: ACCENT,
                }}
              >
                {notes.length}
              </span>
            </div>
            {notesOpen ? (
              <ChevronUp size={14} color="var(--text-secondary)" />
            ) : (
              <ChevronDown size={14} color="var(--text-secondary)" />
            )}
          </button>

          {notesOpen && (
            <div
              style={{
                padding: "0 24px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {notes.map((note, i) => {
                const isRisk =
                  note.head.toUpperCase().includes("RYZYKO") ||
                  note.head.toUpperCase().includes("BARIERA") ||
                  note.head.toUpperCase().includes("NO-SHOW");
                const isPositive =
                  note.head.toUpperCase().includes("POZYTYW") ||
                  note.head.toUpperCase().includes("SYGNAŁ");

                const noteBg = isRisk
                  ? `${ERROR}0f`
                  : isPositive
                    ? `${SUCCESS}0f`
                    : "var(--bg-elevated)";
                const noteBorder = isRisk
                  ? `${ERROR}28`
                  : isPositive
                    ? `${SUCCESS}28`
                    : "var(--border)";
                const noteNumColor = isRisk ? ERROR : isPositive ? SUCCESS : ACCENT;

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 14,
                      padding: "12px 16px",
                      background: noteBg,
                      border: `1px solid ${noteBorder}`,
                      borderRadius: 7,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        fontWeight: 700,
                        color: noteNumColor,
                        flexShrink: 0,
                        minWidth: 20,
                        marginTop: 1,
                      }}
                    >
                      {i + 1}.
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          lineHeight: 1.4,
                          marginBottom: note.body ? 5 : 0,
                        }}
                      >
                        {note.head}
                      </div>
                      {note.body && (
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--text-secondary)",
                            lineHeight: 1.6,
                          }}
                        >
                          {note.body}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
