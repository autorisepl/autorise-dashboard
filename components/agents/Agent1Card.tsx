'use client'

import { useState } from 'react'
import {
  Phone,
  Truck,
  Users,
  Database,
  AlertTriangle,
  TrendingUp,
  Clock,
  Target,
  Calendar,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react'

export interface Agent1Output {
  imie_nazwisko?: string | null
  firma?: string | null
  telefon?: string | null
  pojazdy?: string | number | null
  spedytorzy_biuro?: string | null
  wlasciciel_czy_manager?: string | null
  decydent?: string | null
  bol_glowny_cytat?: string | null
  motywacja_cytat?: string | null
  poprzednie_proby?: string | null
  poprzednie_proby_powod_niepowodzenia?: string | null
  koszt_problemu?: {
    spedytorzy_liczba?: number | null
    procent_czasu?: number | null
    stawka_miesiecznie?: number | null
    koszt_miesiecznie?: number | null
    koszt_roczny?: number | null
    czy_szacunek?: boolean
  } | null
  tms?: string | null
  inne_systemy?: string | null
  podejscie_integracyjne?: string | null
  czas_setup_dni?: number | null
  pre_commit_cytat?: string | null
  urgency?: string | null
  icp?: {
    wynik?: number | null
    flota_ok?: boolean | string | null
    biuro_ok?: boolean | string | null
    decyzyjnosc_ok?: boolean | string | null
    bol_ok?: boolean | string | null
    aktywne_szukanie_ok?: boolean | string | null
    kwalifikacja?: string | null
  } | null
  status?: string | null
  meet_data?: string | null
  meet_godzina?: string | null
  nastepny_krok?: string | null
  uwagi_agenta?: string | null
}

const d = {
  bg: '#080e1c',
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.06)',
  border: 'rgba(59,130,246,0.14)',
  borderSubtle: 'rgba(255,255,255,0.07)',
  blue: '#3b82f6',
  blueDeep: '#2563eb',
  blueFaint: 'rgba(59,130,246,0.10)',
  blueFaintBorder: 'rgba(59,130,246,0.22)',
  white: '#f0f4ff',
  whiteDim: '#c8d8f0',
  secondary: '#7a96b8',
  muted: '#475569',
  success: '#22c55e',
  successFaint: 'rgba(34,197,94,0.10)',
  successBorder: 'rgba(34,197,94,0.22)',
  error: '#ef4444',
  errorFaint: 'rgba(239,68,68,0.10)',
  errorBorder: 'rgba(239,68,68,0.22)',
  warning: '#f59e0b',
  warningFaint: 'rgba(245,158,11,0.10)',
  warningBorder: 'rgba(245,158,11,0.22)',
  font: '"Geist", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"Geist Mono", "Fira Code", monospace',
}

function icpOk(val?: boolean | string | null): boolean {
  if (val == null) return false
  if (typeof val === 'boolean') return val
  return val.toUpperCase() === 'TAK'
}

function stripQuotes(text: string): string {
  return text.replace(/^["«„]/, '').replace(/["»"]$/, '').trim()
}

function parseQuotes(text: string | null | undefined): string[] {
  if (!text) return []
  const cleaned = stripQuotes(text)
  const parts = cleaned
    .split(/[/]\s*/)
    .map((s) => stripQuotes(s).trim())
    .filter((s) => s.length > 6)
  return parts.length > 1 ? parts : [cleaned]
}

function parseNotes(text: string | null | undefined): Array<{ head: string; body: string }> {
  if (!text) return []
  return text
    .split(/\n(?=\d+\.)/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const lines = s.split('\n')
      return {
        head: lines[0].replace(/^\d+\.\s*/, '').trim(),
        body: lines.slice(1).join('\n').trim(),
      }
    })
}

function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        fontFamily: d.font,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: color ?? d.muted,
      }}
    >
      {children}
    </span>
  )
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        paddingBottom: 12,
        borderBottom: `1px solid ${d.borderSubtle}`,
        marginBottom: 14,
      }}
    >
      <span style={{ color: d.blue, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <Label>{label}</Label>
    </div>
  )
}

function IcpRow({ label, ok }: { label: string; ok?: boolean | string | null }) {
  const pass = icpOk(ok)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 0' }}>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          background: pass ? d.successFaint : d.errorFaint,
          border: `1px solid ${pass ? d.successBorder : d.errorBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {pass ? (
          <CheckCircle2 size={11} color={d.success} />
        ) : (
          <XCircle size={11} color={d.error} />
        )}
      </div>
      <span style={{ fontFamily: d.font, fontSize: 13, color: pass ? d.whiteDim : d.secondary }}>
        {label}
      </span>
    </div>
  )
}

function ScoreDots({ score }: { score: number | null | undefined }) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: i <= (score ?? 0) ? d.blue : 'rgba(59,130,246,0.15)',
            border: `1px solid ${i <= (score ?? 0) ? d.blue : 'rgba(59,130,246,0.25)'}`,
            boxShadow: i <= (score ?? 0) ? `0 0 8px ${d.blue}60` : 'none',
          }}
        />
      ))}
    </div>
  )
}

function QuoteBlock({ text }: { text: string | null | undefined }) {
  const parts = parseQuotes(text)
  if (!parts.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {parts.slice(0, 3).map((q, i) => (
        <div
          key={i}
          style={{
            paddingLeft: 14,
            borderLeft: `2px solid ${d.blue}50`,
            fontFamily: d.font,
            fontSize: 14,
            color: d.whiteDim,
            fontStyle: 'italic',
            lineHeight: 1.6,
          }}
        >
          &ldquo;{q}&rdquo;
        </div>
      ))}
    </div>
  )
}

function BigNum({
  value,
  unit,
  accent,
  size = 44,
}: {
  value: string | number
  unit: string
  accent?: boolean
  size?: number
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: d.mono,
          fontSize: size,
          fontWeight: 800,
          color: accent ? d.blue : d.white,
          lineHeight: 1,
          letterSpacing: '-0.04em',
        }}
      >
        {typeof value === 'number' ? value.toLocaleString('pl') : value}
      </div>
      <div
        style={{
          fontFamily: d.font,
          fontSize: 12,
          color: d.secondary,
          marginTop: 4,
          letterSpacing: '0.04em',
        }}
      >
        {unit}
      </div>
    </div>
  )
}

export function Agent1Card({ output }: { output: Agent1Output }) {
  const [notesOpen, setNotesOpen] = useState(false)

  const icp = output.icp
  const score = icp?.wynik ?? null
  const kwal = (icp?.kwalifikacja ?? '').toUpperCase()
  const isDisq = kwal.includes('NIE KWALIFIKUJE')
  const isOk = kwal.includes('KWALIFIKUJE') && !kwal.includes('NIE') && !kwal.includes('WYMAGA')

  const verdictColor = isDisq ? d.error : isOk ? d.success : d.warning
  const verdictBg = isDisq ? d.errorFaint : isOk ? d.successFaint : d.warningFaint
  const verdictBorder = isDisq ? d.errorBorder : isOk ? d.successBorder : d.warningBorder
  const verdictLabel = isDisq ? 'NIE KWALIFIKUJE' : isOk ? 'KWALIFIKUJE' : 'WYMAGA ANALIZY'

  const displayName = output.firma || output.imie_nazwisko || 'Nowy klient'
  const displaySub =
    output.firma && output.imie_nazwisko ? output.imie_nazwisko : null

  const hasCost =
    output.koszt_problemu?.koszt_miesiecznie != null ||
    output.koszt_problemu?.koszt_roczny != null

  const notes = parseNotes(output.uwagi_agenta)

  const fleet =
    output.pojazdy != null
      ? typeof output.pojazdy === 'number'
        ? output.pojazdy
        : parseInt(String(output.pojazdy), 10) || String(output.pojazdy)
      : null

  const spedNum =
    output.spedytorzy_biuro
      ? (() => {
          const m = String(output.spedytorzy_biuro).match(/\d+/)
          return m ? parseInt(m[0], 10) : null
        })()
      : null

  return (
    <div
      style={{
        background: d.bg,
        fontFamily: d.font,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'auto',
        color: d.white,
      }}
    >
      {/* ─── HEADER ─── */}
      <div
        style={{
          padding: '24px 28px 20px',
          background: 'linear-gradient(160deg, rgba(37,99,235,0.12) 0%, rgba(8,14,28,0) 60%)',
          borderBottom: `1px solid ${d.border}`,
          flexShrink: 0,
        }}
      >
        {/* Row 1: verdict + score */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '5px 14px',
              borderRadius: 6,
              background: verdictBg,
              border: `1px solid ${verdictBorder}`,
            }}
          >
            <Zap size={11} color={verdictColor} />
            <span
              style={{
                fontFamily: d.font,
                fontSize: 11,
                fontWeight: 800,
                color: verdictColor,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {verdictLabel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ScoreDots score={score} />
            <span
              style={{
                fontFamily: d.mono,
                fontSize: 18,
                fontWeight: 700,
                color: d.white,
                letterSpacing: '-0.02em',
              }}
            >
              {score ?? '?'}
              <span style={{ color: d.muted }}>/5</span>
            </span>
          </div>
        </div>

        {/* Row 2: name */}
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: d.white,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
          }}
        >
          {displayName}
        </div>

        {/* Row 3: sub + phone */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 8,
          }}
        >
          {displaySub && (
            <span style={{ fontSize: 15, color: d.secondary }}>{displaySub}</span>
          )}
          {output.telefon && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: d.blueFaint,
                border: `1px solid ${d.blueFaintBorder}`,
                borderRadius: 6,
              }}
            >
              <Phone size={11} color={d.blue} />
              <span style={{ fontFamily: d.mono, fontSize: 13, color: d.blue, letterSpacing: '0.04em' }}>
                {output.telefon}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── MAIN GRID 2×2 ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1,
          background: d.border,
          flexShrink: 0,
        }}
      >
        {/* TL — Dane firmy + ICP */}
        <div style={{ background: d.bg, padding: '20px 22px' }}>
          <SectionHeader icon={<Truck size={13} />} label="Dane firmy" />

          <div style={{ display: 'flex', gap: 28, marginBottom: 16 }}>
            {fleet != null && (
              <BigNum value={fleet} unit="pojazdów" accent size={40} />
            )}
            {spedNum != null && (
              <BigNum value={spedNum} unit="spedytorów" size={40} />
            )}
          </div>

          {output.wlasciciel_czy_manager && (
            <div style={{ fontSize: 13, color: d.secondary, marginBottom: 6 }}>
              {output.wlasciciel_czy_manager}
            </div>
          )}
          {output.decydent && (
            <div
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                background: d.blueFaint,
                border: `1px solid ${d.blueFaintBorder}`,
                borderRadius: 5,
                fontSize: 12,
                color: d.blue,
                marginBottom: 18,
              }}
            >
              {output.decydent}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${d.borderSubtle}`, paddingTop: 14, marginTop: 6 }}>
            <Label>Weryfikacja ICP</Label>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' }}>
              <IcpRow label="Flota ≥ 10 pojazdów" ok={icp?.flota_ok} />
              <IcpRow label="Biuro ≥ 2 osoby" ok={icp?.biuro_ok} />
              <IcpRow label="Decyzyjność" ok={icp?.decyzyjnosc_ok} />
              <IcpRow label="Ból zdefiniowany" ok={icp?.bol_ok} />
              <IcpRow label="Aktywnie szuka rozwiązania" ok={icp?.aktywne_szukanie_ok} />
            </div>
          </div>
        </div>

        {/* TR — Ból + Motywacja + Pre-commit */}
        <div style={{ background: d.bg, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                  padding: '10px 14px',
                  background: d.warningFaint,
                  border: `1px solid ${d.warningBorder}`,
                  borderRadius: 7,
                  fontSize: 14,
                  color: d.warning,
                  fontStyle: 'italic',
                  lineHeight: 1.55,
                }}
              >
                &ldquo;{stripQuotes(output.pre_commit_cytat)}&rdquo;
              </div>
            </div>
          )}
        </div>

        {/* BL — Systemy */}
        <div style={{ background: d.surface, padding: '20px 22px' }}>
          <SectionHeader icon={<Database size={13} />} label="Systemy" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Label>TMS</Label>
              <div
                style={{
                  marginTop: 5,
                  fontSize: 14,
                  fontWeight: 600,
                  color: output.tms?.toLowerCase().includes('brak') ? d.error : d.white,
                  lineHeight: 1.4,
                }}
              >
                {output.tms || '—'}
              </div>
            </div>

            {output.inne_systemy && (
              <div>
                <Label>Inne systemy</Label>
                <div style={{ marginTop: 5, fontSize: 13, color: d.secondary, lineHeight: 1.5 }}>
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
                    color: output.podejscie_integracyjne.toLowerCase().includes('brak') ? d.error : d.blue,
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
                <div style={{ marginTop: 5, fontSize: 13, color: d.secondary, lineHeight: 1.5 }}>
                  {output.poprzednie_proby}
                </div>
                {output.poprzednie_proby_powod_niepowodzenia && (
                  <div style={{ marginTop: 4, fontSize: 12, color: d.error, opacity: 0.8, fontStyle: 'italic' }}>
                    {output.poprzednie_proby_powod_niepowodzenia}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BR — Koszt + Urgency + Next step */}
        <div style={{ background: d.surface, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <SectionHeader icon={<Target size={13} />} label="Koszt problemu" />
            {hasCost ? (
              <div style={{ display: 'flex', gap: 28, alignItems: 'flex-end' }}>
                {output.koszt_problemu?.koszt_miesiecznie != null && (
                  <BigNum
                    value={output.koszt_problemu.koszt_miesiecznie}
                    unit="PLN / miesiąc"
                    accent
                    size={42}
                  />
                )}
                {output.koszt_problemu?.koszt_roczny != null && (
                  <BigNum
                    value={output.koszt_problemu.koszt_roczny}
                    unit="PLN / rok"
                    size={32}
                  />
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: d.muted, fontStyle: 'italic' }}>
                Niepoliczalny — brak danych
              </div>
            )}
            {output.koszt_problemu?.procent_czasu != null && (
              <div style={{ marginTop: 8, fontSize: 12, color: d.secondary }}>
                {output.koszt_problemu.procent_czasu}% czasu spedytora
                {output.koszt_problemu.czy_szacunek && (
                  <span
                    style={{
                      marginLeft: 8,
                      padding: '2px 6px',
                      background: d.warningFaint,
                      border: `1px solid ${d.warningBorder}`,
                      borderRadius: 4,
                      fontSize: 10,
                      color: d.warning,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
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
              <div style={{ fontSize: 13, color: d.secondary, lineHeight: 1.6 }}>
                {output.urgency}
              </div>
            </div>
          )}

          <div>
            <SectionHeader icon={<ArrowRight size={13} />} label="Status i następny krok" />
            {output.status && (
              <div style={{ fontSize: 14, color: d.whiteDim, lineHeight: 1.5, marginBottom: 10 }}>
                {output.status}
              </div>
            )}
            {output.nastepny_krok && (
              <div
                style={{
                  padding: '10px 14px',
                  background: d.blueFaint,
                  border: `1px solid ${d.blueFaintBorder}`,
                  borderRadius: 7,
                  fontSize: 14,
                  fontWeight: 600,
                  color: d.blue,
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  color: d.success,
                }}
              >
                <Calendar size={13} />
                {output.meet_data}
                {output.meet_godzina && (
                  <span style={{ color: d.secondary }}>· {output.meet_godzina}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── AGENT NOTES ─── */}
      {notes.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${d.border}`,
            background: d.surface,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setNotesOpen((v) => !v)}
            style={{
              width: '100%',
              padding: '14px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: d.secondary,
              fontFamily: d.font,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Label color={d.secondary}>Analiza agenta</Label>
              <span
                style={{
                  padding: '2px 8px',
                  background: d.blueFaint,
                  border: `1px solid ${d.blueFaintBorder}`,
                  borderRadius: 99,
                  fontFamily: d.mono,
                  fontSize: 11,
                  fontWeight: 700,
                  color: d.blue,
                }}
              >
                {notes.length}
              </span>
            </div>
            {notesOpen ? <ChevronUp size={14} color={d.secondary} /> : <ChevronDown size={14} color={d.secondary} />}
          </button>

          {notesOpen && (
            <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notes.map((note, i) => {
                const isRisk =
                  note.head.toUpperCase().includes('RYZYKO') ||
                  note.head.toUpperCase().includes('BARIERA') ||
                  note.head.toUpperCase().includes('NO-SHOW')
                const isPositive =
                  note.head.toUpperCase().includes('POZYTYW') ||
                  note.head.toUpperCase().includes('SYGNAŁ')

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 14,
                      padding: '12px 16px',
                      background: isRisk
                        ? 'rgba(239,68,68,0.06)'
                        : isPositive
                        ? 'rgba(34,197,94,0.06)'
                        : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${
                        isRisk
                          ? 'rgba(239,68,68,0.16)'
                          : isPositive
                          ? 'rgba(34,197,94,0.16)'
                          : d.borderSubtle
                      }`,
                      borderRadius: 7,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: d.mono,
                        fontSize: 12,
                        fontWeight: 700,
                        color: isRisk ? d.error : isPositive ? d.success : d.blue,
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
                          color: d.white,
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
                            color: d.secondary,
                            lineHeight: 1.6,
                          }}
                        >
                          {note.body}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
