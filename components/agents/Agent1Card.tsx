'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
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
  CheckCircle,
  XCircle,
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
    flota_ok?: boolean
    biuro_ok?: boolean
    decyzyjnosc_ok?: boolean
    bol_ok?: boolean
    aktywne_szukanie_ok?: boolean
    kwalifikacja?: string | null
  } | null
  status?: string | null
  meet_data?: string | null
  meet_godzina?: string | null
  nastepny_krok?: string | null
  uwagi_agenta?: string | null
}

const c = {
  bg: '#ffffff',
  card: '#f8fafc',
  elevated: '#f1f5f9',
  section: '#f8fafc',
  border: '#e2e8f0',
  borderStrong: 'rgba(37,99,235,0.2)',
  blue: '#2563eb',
  blueBright: '#3b82f6',
  blueGlow: 'rgba(37,99,235,0.06)',
  white: '#0f172a',
  secondary: '#475569',
  muted: '#94a3b8',
  success: '#16a34a',
  successBg: 'rgba(22,163,74,0.08)',
  successBorder: 'rgba(22,163,74,0.2)',
  error: '#dc2626',
  errorBg: 'rgba(220,38,38,0.08)',
  errorBorder: 'rgba(220,38,38,0.2)',
  warning: '#d97706',
  warningBg: 'rgba(217,119,6,0.08)',
  warningBorder: 'rgba(217,119,6,0.2)',
  mono: '"Geist Mono", "Fira Code", monospace',
  sans: '"Geist", -apple-system, BlinkMacSystemFont, sans-serif',
}

function parseQuotes(text: string | null | undefined): string[] {
  if (!text) return []
  const cleaned = text.replace(/^["«]/, '').replace(/["»]$/, '').trim()
  const parts = cleaned
    .split(/"\s*\/\s*"/)
    .map((s) => s.replace(/^["«]/, '').replace(/["»]$/, '').trim())
    .filter((s) => s.length > 8)
  return parts.length ? parts : [cleaned]
}

function parseNotes(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(/\n(?=\d+\.)/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function IcpDots({ score }: { score: number | null | undefined }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: i <= (score ?? 0) ? c.blue : 'rgba(255,255,255,0.08)',
            border: `1px solid ${i <= (score ?? 0) ? c.blue : 'rgba(255,255,255,0.12)'}`,
            boxShadow: i <= (score ?? 0) ? `0 0 6px ${c.blue}60` : 'none',
          }}
        />
      ))}
    </div>
  )
}

function IcpRow({ label, ok }: { label: string; ok?: boolean }) {
  const color = ok ? c.success : c.error
  const bg = ok ? c.successBg : c.errorBg
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          background: bg,
          border: `1px solid ${ok ? c.successBorder : c.errorBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {ok ? (
          <CheckCircle size={10} color={c.success} />
        ) : (
          <XCircle size={10} color={c.error} />
        )}
      </div>
      <span
        style={{
          fontFamily: c.sans,
          fontSize: 12,
          color: ok ? c.white : c.secondary,
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  )
}

function Quotes({ text }: { text: string | null | undefined }) {
  const parts = parseQuotes(text)
  if (!parts.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {parts.slice(0, 3).map((q, i) => (
        <div
          key={i}
          style={{
            paddingLeft: 12,
            borderLeft: `2px solid ${c.blue}60`,
            fontFamily: c.sans,
            fontSize: 12,
            color: '#b8cce8',
            fontStyle: 'italic',
            lineHeight: 1.55,
          }}
        >
          &ldquo;{q}&rdquo;
        </div>
      ))}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: c.sans,
        fontSize: 10,
        fontWeight: 700,
        color: c.muted,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  )
}

function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      {icon && <span style={{ color: c.blue, opacity: 0.7, display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <Label>{children}</Label>
    </div>
  )
}

function BigStat({
  value,
  unit,
  highlight,
}: {
  value: string | number
  unit: string
  highlight?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span
        style={{
          fontFamily: c.mono,
          fontSize: 28,
          fontWeight: 800,
          color: highlight ? c.blue : c.white,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </span>
      <span style={{ fontFamily: c.sans, fontSize: 12, color: c.secondary }}>{unit}</span>
    </div>
  )
}

export function Agent1Card({ output }: { output: Agent1Output }) {
  const [notesOpen, setNotesOpen] = useState(false)

  const icp = output.icp
  const score = icp?.wynik ?? null
  const kwal = icp?.kwalifikacja ?? ''
  const isDisq = kwal.toUpperCase().includes('NIE KWALIFIKUJE')
  const isOk =
    kwal.toUpperCase().includes('KWALIFIKUJE') &&
    !kwal.toUpperCase().includes('NIE') &&
    !kwal.toUpperCase().includes('WYMAGA')

  const verdictColor = isDisq ? c.error : isOk ? c.success : c.warning
  const verdictBg = isDisq ? c.errorBg : isOk ? c.successBg : c.warningBg
  const verdictBorder = isDisq ? c.errorBorder : isOk ? c.successBorder : c.warningBorder
  const verdictLabel = isDisq ? 'NIE KWALIFIKUJE' : isOk ? 'KWALIFIKUJE' : 'WYMAGA ANALIZY'

  const displayName = output.firma || output.imie_nazwisko || 'Nieznany klient'
  const displaySub = output.firma && output.imie_nazwisko ? output.imie_nazwisko : null

  const hasCost =
    output.koszt_problemu?.koszt_miesiecznie != null ||
    output.koszt_problemu?.koszt_roczny != null

  const notes = parseNotes(output.uwagi_agenta)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'auto',
        background: c.bg,
        fontFamily: c.sans,
      }}
    >
      {/* ─── HEADER ─── */}
      <div
        style={{
          padding: '20px 24px 18px',
          background: `linear-gradient(160deg, #eff6ff 0%, #ffffff 100%)`,
          borderBottom: `1px solid ${c.border}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          {/* Identity */}
          <div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: c.white,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              {displayName}
            </div>
            {displaySub && (
              <div style={{ fontSize: 13, color: c.secondary, marginTop: 4 }}>{displaySub}</div>
            )}
            {output.telefon && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 8,
                  padding: '4px 10px',
                  background: c.blueGlow,
                  border: `1px solid ${c.borderStrong}`,
                  borderRadius: 6,
                  width: 'fit-content',
                }}
              >
                <Phone size={11} color={c.blueBright} />
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: c.mono,
                    color: c.blueBright,
                    letterSpacing: '0.03em',
                  }}
                >
                  {output.telefon}
                </span>
              </div>
            )}
          </div>

          {/* ICP verdict block */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                background: verdictBg,
                border: `1px solid ${verdictBorder}`,
                fontSize: 11,
                fontWeight: 800,
                color: verdictColor,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {verdictLabel}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IcpDots score={score} />
              <span
                style={{
                  fontFamily: c.mono,
                  fontSize: 16,
                  fontWeight: 700,
                  color: c.white,
                  letterSpacing: '-0.02em',
                }}
              >
                {score ?? '?'}
                <span style={{ color: c.muted }}>/5</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── GRID 2×2 ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: 'auto auto',
          gap: 1,
          background: c.border,
          flexShrink: 0,
        }}
      >
        {/* Cell 1 — Dane firmy + ICP checks */}
        <div
          style={{
            background: c.card,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div>
            <SectionTitle icon={<Truck size={13} />}>Dane firmy</SectionTitle>
            <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
              <BigStat
                value={output.pojazdy ?? '—'}
                unit="pojazdy"
                highlight
              />
              {output.spedytorzy_biuro && (
                <BigStat value={output.spedytorzy_biuro} unit="biuro" />
              )}
            </div>
            {output.wlasciciel_czy_manager && (
              <div style={{ fontSize: 12, color: c.secondary }}>
                {output.wlasciciel_czy_manager}
              </div>
            )}
            {output.decydent && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: '#93c5fd',
                  padding: '4px 8px',
                  background: c.blueGlow,
                  border: `1px solid ${c.borderStrong}`,
                  borderRadius: 4,
                  lineHeight: 1.4,
                }}
              >
                {output.decydent}
              </div>
            )}
          </div>

          <div>
            <SectionTitle icon={<Target size={13} />}>Weryfikacja ICP</SectionTitle>
            <IcpRow label="Flota ≥ 10 pojazdów" ok={icp?.flota_ok} />
            <IcpRow label="Biuro ≥ 2 osoby" ok={icp?.biuro_ok} />
            <IcpRow label="Decyzyjność" ok={icp?.decyzyjnosc_ok} />
            <IcpRow label="Ból zdefiniowany" ok={icp?.bol_ok} />
            <IcpRow label="Aktywnie szuka rozwiązania" ok={icp?.aktywne_szukanie_ok} />
          </div>
        </div>

        {/* Cell 2 — Ból + Motywacja */}
        <div
          style={{
            background: c.card,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {output.bol_glowny_cytat && (
            <div>
              <SectionTitle icon={<AlertTriangle size={13} />}>Ból główny</SectionTitle>
              <Quotes text={output.bol_glowny_cytat} />
            </div>
          )}

          {output.motywacja_cytat && (
            <div>
              <SectionTitle icon={<TrendingUp size={13} />}>Motywacja</SectionTitle>
              <Quotes text={output.motywacja_cytat} />
            </div>
          )}

          {output.pre_commit_cytat && (
            <div>
              <SectionTitle>Pre-commit</SectionTitle>
              <div
                style={{
                  padding: '8px 12px',
                  background: c.warningBg,
                  border: `1px solid ${c.warningBorder}`,
                  borderRadius: 6,
                  fontSize: 12,
                  color: c.warning,
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                &ldquo;{output.pre_commit_cytat.replace(/^["«]/, '').replace(/["»]$/, '').trim()}&rdquo;
              </div>
            </div>
          )}
        </div>

        {/* Cell 3 — Systemy */}
        <div
          style={{
            background: c.card,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <SectionTitle icon={<Database size={13} />}>Systemy</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <Label>TMS</Label>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    color: output.tms?.toLowerCase().includes('brak') ? c.error : c.white,
                    fontWeight: 500,
                  }}
                >
                  {output.tms || '—'}
                </div>
              </div>

              {output.inne_systemy && (
                <div>
                  <Label>Inne systemy</Label>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: c.secondary,
                      lineHeight: 1.55,
                    }}
                  >
                    {output.inne_systemy}
                  </div>
                </div>
              )}

              {output.podejscie_integracyjne && (
                <div>
                  <Label>Podejście integracyjne</Label>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: c.blueBright,
                      fontWeight: 500,
                    }}
                  >
                    {output.podejscie_integracyjne}
                  </div>
                </div>
              )}

              {output.poprzednie_proby && (
                <div>
                  <Label>Poprzednie próby</Label>
                  <div style={{ marginTop: 4, fontSize: 12, color: c.secondary, lineHeight: 1.5 }}>
                    {output.poprzednie_proby}
                  </div>
                  {output.poprzednie_proby_powod_niepowodzenia && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: c.error,
                        opacity: 0.8,
                        fontStyle: 'italic',
                        lineHeight: 1.4,
                      }}
                    >
                      {output.poprzednie_proby_powod_niepowodzenia}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cell 4 — Koszt + Status + Urgency */}
        <div
          style={{
            background: c.card,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div>
            <SectionTitle>Koszt problemu</SectionTitle>
            {hasCost ? (
              <div style={{ display: 'flex', gap: 20 }}>
                {output.koszt_problemu?.koszt_miesiecznie != null && (
                  <BigStat
                    value={output.koszt_problemu.koszt_miesiecznie.toLocaleString('pl')}
                    unit="PLN/mc"
                    highlight
                  />
                )}
                {output.koszt_problemu?.koszt_roczny != null && (
                  <BigStat
                    value={output.koszt_problemu.koszt_roczny.toLocaleString('pl')}
                    unit="PLN/rok"
                  />
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: c.muted, fontStyle: 'italic' }}>
                Niepoliczalny — brak danych liczbowych
              </div>
            )}
            {output.koszt_problemu?.procent_czasu != null && (
              <div style={{ marginTop: 6, fontSize: 12, color: c.secondary }}>
                {output.koszt_problemu.procent_czasu}% czasu spedytora
              </div>
            )}
          </div>

          {output.urgency && (
            <div>
              <SectionTitle icon={<Clock size={13} />}>Urgency</SectionTitle>
              <div style={{ fontSize: 12, color: c.secondary, lineHeight: 1.55 }}>
                {output.urgency}
              </div>
            </div>
          )}

          <div>
            <SectionTitle icon={<ArrowRight size={13} />}>Status i następny krok</SectionTitle>
            <div
              style={{
                fontSize: 13,
                color: c.white,
                lineHeight: 1.5,
                marginBottom: output.nastepny_krok ? 8 : 0,
              }}
            >
              {output.status || '—'}
            </div>
            {output.nastepny_krok && (
              <div
                style={{
                  padding: '8px 12px',
                  background: c.blueGlow,
                  border: `1px solid ${c.borderStrong}`,
                  borderRadius: 6,
                  fontSize: 12,
                  color: c.blueBright,
                  lineHeight: 1.5,
                }}
              >
                {output.nastepny_krok}
              </div>
            )}
            {output.meet_data && (
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: c.success,
                }}
              >
                <Calendar size={12} />
                {output.meet_data}
                {output.meet_godzina && ` · ${output.meet_godzina}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── AGENT NOTES ─── */}
      {notes.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${c.border}`,
            background: c.section,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setNotesOpen((v) => !v)}
            style={{
              width: '100%',
              padding: '12px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: c.secondary,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Label>Analiza agenta</Label>
              <span
                style={{
                  padding: '1px 7px',
                  background: c.blueGlow,
                  border: `1px solid ${c.borderStrong}`,
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  color: c.blue,
                  fontFamily: c.mono,
                }}
              >
                {notes.length}
              </span>
            </div>
            {notesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {notesOpen && (
            <div style={{ padding: '0 22px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notes.map((note, i) => {
                const lines = note.trim().split('\n')
                const head = lines[0].replace(/^\d+\.\s*/, '').trim()
                const body = lines.slice(1).join('\n').trim()
                const isWarning =
                  head.toUpperCase().includes('DYSKWALIF') ||
                  head.toUpperCase().includes('BARIERA') ||
                  head.toUpperCase().includes('RYZYKO')
                const isPositive = head.toUpperCase().includes('POZYTYW') || head.toUpperCase().includes('SYGNAŁ')

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '10px 14px',
                      background: isWarning
                        ? 'rgba(239,68,68,0.05)'
                        : isPositive
                        ? 'rgba(34,197,94,0.05)'
                        : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${
                        isWarning
                          ? 'rgba(239,68,68,0.15)'
                          : isPositive
                          ? 'rgba(34,197,94,0.15)'
                          : c.border
                      }`,
                      borderRadius: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: c.mono,
                        fontSize: 11,
                        fontWeight: 700,
                        color: isWarning ? c.error : isPositive ? c.success : c.blue,
                        flexShrink: 0,
                        marginTop: 1,
                        minWidth: 18,
                      }}
                    >
                      {i + 1}.
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: c.white,
                          lineHeight: 1.4,
                        }}
                      >
                        {head}
                      </div>
                      {body && (
                        <div
                          style={{
                            fontSize: 12,
                            color: c.secondary,
                            lineHeight: 1.55,
                            marginTop: 4,
                          }}
                        >
                          {body}
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
