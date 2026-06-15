'use client'

import {
  User,
  Phone,
  Mail,
  Building2,
  MapPin,
  Hash,
  Truck,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  BadgeCheck,
  BadgeX,
  Users,
  FileSearch,
  ChevronRight,
} from 'lucide-react'

export interface Agent0Zarzad {
  imie: string
  nazwisko: string
  funkcja: string
}

export interface Agent0Output {
  kontakt_imie?: string | null
  kontakt_nazwisko?: string | null
  telefon?: string | null
  email?: string | null
  nip?: string | null
  firma_slack?: string | null
  firma_krs?: string | null
  krs_numer?: string | null
  adres?: string | null
  pkd_glowne?: string | null
  pkd_kody?: string[]
  zarzad?: Agent0Zarzad[]
  jest_decydentem?: boolean | null
  match_zarzadu?: string | null
  ocena_tsl?: 'pewne' | 'mozliwe' | 'malo_prawdopodobne' | 'nieznane' | null
  vat_status?: string | null
  regon?: string | null
  notatka_krs?: string | null
  uwagi?: string | null
  krs_source?: string | null
}

// ── Design tokens ────────────────────────────────────────────────────

const d = {
  bg: '#0d1117',
  bgCard: '#161b22',
  bgSection: '#1c2330',
  bgHover: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  blue: '#2563eb',
  blueMuted: 'rgba(37,99,235,0.12)',
  blueBorder: 'rgba(37,99,235,0.25)',
  green: '#16a34a',
  greenMuted: 'rgba(22,163,74,0.1)',
  greenBorder: 'rgba(22,163,74,0.22)',
  amber: '#d97706',
  amberMuted: 'rgba(217,119,6,0.1)',
  amberBorder: 'rgba(217,119,6,0.22)',
  red: '#dc2626',
  redMuted: 'rgba(220,38,38,0.1)',
  redBorder: 'rgba(220,38,38,0.22)',
  gray: '#6b7280',
  grayMuted: 'rgba(107,114,128,0.1)',
  white: '#f0f6fc',
  secondary: '#8b949e',
  muted: '#484f58',
  sans: '"Geist", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"Geist Mono", "Fira Code", "Cascadia Code", monospace',
}

// ── Helpers ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: d.mono,
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: d.muted,
      marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

function DataRow({ icon: Icon, label, value, mono = false, accent = false }: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
  mono?: boolean
  accent?: boolean
}) {
  if (!value) return null
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 9,
      padding: '6px 0',
      borderBottom: `1px solid ${d.border}`,
    }}>
      <Icon size={13} color={accent ? d.blue : d.muted} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: d.mono,
          fontSize: '9px',
          color: d.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          lineHeight: 1,
          marginBottom: 2,
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: mono ? d.mono : d.sans,
          fontSize: mono ? '12px' : '13px',
          color: accent ? d.white : d.secondary,
          fontWeight: accent ? 600 : 400,
          lineHeight: 1.4,
          wordBreak: 'break-all',
        }}>
          {value}
        </div>
      </div>
    </div>
  )
}

function TSLBadge({ ocena }: { ocena: Agent0Output['ocena_tsl'] }) {
  const cfg = {
    pewne: { label: 'TSL — Pewne', color: d.green, bg: d.greenMuted, border: d.greenBorder, Icon: ShieldCheck },
    mozliwe: { label: 'TSL — Możliwe', color: d.amber, bg: d.amberMuted, border: d.amberBorder, Icon: Truck },
    malo_prawdopodobne: { label: 'TSL — Mało prawdopodob.', color: d.red, bg: d.redMuted, border: d.redBorder, Icon: ShieldAlert },
    nieznane: { label: 'TSL — Nieznane', color: d.gray, bg: d.grayMuted, border: d.border, Icon: HelpCircle },
  }[ocena ?? 'nieznane']

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 10px',
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 6,
    }}>
      <cfg.Icon size={11} color={cfg.color} />
      <span style={{ fontFamily: d.mono, fontSize: '10px', fontWeight: 700, color: cfg.color, letterSpacing: '0.04em' }}>
        {cfg.label}
      </span>
    </div>
  )
}

function DecydentBadge({ jest, match }: { jest: boolean | null | undefined; match?: string | null }) {
  if (jest === true) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '8px 12px',
        background: d.greenMuted,
        border: `1px solid ${d.greenBorder}`,
        borderRadius: 8,
      }}>
        <BadgeCheck size={14} color={d.green} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontFamily: d.sans, fontSize: '12px', fontWeight: 700, color: d.green, marginBottom: 2 }}>
            Decydent potwierdzony
          </div>
          {match && (
            <div style={{ fontFamily: d.mono, fontSize: '10px', color: d.green, opacity: 0.75 }}>
              Match: {match}
            </div>
          )}
        </div>
      </div>
    )
  }
  if (jest === false) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '8px 12px',
        background: d.amberMuted,
        border: `1px solid ${d.amberBorder}`,
        borderRadius: 8,
      }}>
        <BadgeX size={14} color={d.amber} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontFamily: d.sans, fontSize: '12px', fontWeight: 700, color: d.amber, marginBottom: 2 }}>
            Nie w zarządzie
          </div>
          <div style={{ fontFamily: d.mono, fontSize: '10px', color: d.amber, opacity: 0.75 }}>
            Zapytaj o decydenta w discovery call
          </div>
        </div>
      </div>
    )
  }
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      background: d.grayMuted,
      border: `1px solid ${d.border}`,
      borderRadius: 8,
    }}>
      <HelpCircle size={14} color={d.gray} style={{ flexShrink: 0 }} />
      <span style={{ fontFamily: d.sans, fontSize: '12px', color: d.gray }}>
        Nie zweryfikowano — brak zarządu w KRS
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────

export function Agent0Card({ output }: { output: Agent0Output }) {
  const kontaktFull = [output.kontakt_imie, output.kontakt_nazwisko].filter(Boolean).join(' ')
  const firma = output.firma_krs || output.firma_slack
  const hasKRS = Boolean(output.krs_numer || output.firma_krs)
  const zarzad = output.zarzad ?? []
  const pkdKody = output.pkd_kody ?? []

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      background: d.bg,
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Hero header ─────────────────────────────────────────── */}
      <div style={{
        padding: '18px 20px 16px',
        borderBottom: `1px solid ${d.border}`,
        background: `linear-gradient(135deg, #0d1117 0%, #111827 100%)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <User size={15} color="#93c5fd" strokeWidth={2} />
              </div>
              <div>
                <div style={{
                  fontFamily: d.sans, fontSize: '17px', fontWeight: 800,
                  color: d.white, letterSpacing: '-0.025em', lineHeight: 1.1,
                }}>
                  {kontaktFull || 'Nowy Lead'}
                </div>
                {firma && (
                  <div style={{ fontFamily: d.sans, fontSize: '12px', color: d.secondary, marginTop: 2 }}>
                    {firma}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 9px',
              background: d.blueMuted,
              border: `1px solid ${d.blueBorder}`,
              borderRadius: 999,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: d.blue }} />
              <span style={{ fontFamily: d.mono, fontSize: '9px', fontWeight: 700, color: d.blue, letterSpacing: '0.08em' }}>
                NOWY LEAD
              </span>
            </div>
            <TSLBadge ocena={output.ocena_tsl} />
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Row 1: Contact + Company — two column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Contact section */}
          <div style={{
            background: d.bgCard,
            border: `1px solid ${d.border}`,
            borderRadius: 10,
            padding: '12px 14px',
          }}>
            <SectionLabel>Kontakt</SectionLabel>
            <DataRow icon={User} label="Imię i nazwisko" value={kontaktFull || null} accent />
            <DataRow icon={Phone} label="Telefon" value={output.telefon} mono />
            <DataRow icon={Mail} label="Email" value={output.email} mono />
            <DataRow icon={Hash} label="NIP" value={output.nip} mono />
          </div>

          {/* Company section */}
          <div style={{
            background: d.bgCard,
            border: `1px solid ${d.border}`,
            borderRadius: 10,
            padding: '12px 14px',
          }}>
            <SectionLabel>Firma {hasKRS ? '· KRS' : '(brak KRS)'}</SectionLabel>
            <DataRow icon={Building2} label="Nazwa oficjalna" value={output.firma_krs} accent />
            {output.firma_slack && output.firma_krs !== output.firma_slack && (
              <DataRow icon={Building2} label="Nazwa ze Slacka" value={output.firma_slack} />
            )}
            <DataRow icon={MapPin} label="Adres" value={output.adres} />
            <DataRow icon={Hash} label="KRS" value={output.krs_numer} mono />
            <DataRow icon={Hash} label="REGON" value={output.regon} mono />
            {output.vat_status && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 0', borderBottom: `1px solid ${d.border}`,
              }}>
                <ShieldCheck size={12} color={output.vat_status === 'Czynny' ? d.green : d.gray} />
                <span style={{
                  fontFamily: d.mono, fontSize: '9px', color: d.muted,
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4,
                }}>VAT</span>
                <span style={{
                  fontFamily: d.sans, fontSize: '12px',
                  color: output.vat_status === 'Czynny' ? d.green : d.secondary,
                  fontWeight: 600,
                }}>
                  {output.vat_status}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Decydent analysis */}
        <div>
          <SectionLabel>Analiza decydenta</SectionLabel>
          <DecydentBadge jest={output.jest_decydentem} match={output.match_zarzadu} />
        </div>

        {/* Management board */}
        {zarzad.length > 0 && (
          <div style={{
            background: d.bgCard,
            border: `1px solid ${d.border}`,
            borderRadius: 10,
            padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <Users size={12} color={d.muted} />
              <SectionLabel>Zarząd / Reprezentacja KRS</SectionLabel>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {zarzad.map((z, i) => {
                const fullName = `${z.imie} ${z.nazwisko}`
                const isMatch = output.match_zarzadu?.toLowerCase().includes(z.nazwisko.toLowerCase())
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 7,
                      background: isMatch ? d.greenMuted : d.bgSection,
                      border: `1px solid ${isMatch ? d.greenBorder : 'transparent'}`,
                      marginBottom: 4,
                    }}
                  >
                    <ChevronRight size={10} color={isMatch ? d.green : d.muted} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontFamily: d.sans, fontSize: '13px',
                        fontWeight: isMatch ? 700 : 500,
                        color: isMatch ? d.green : d.white,
                      }}>
                        {fullName}
                      </span>
                      <span style={{
                        fontFamily: d.mono, fontSize: '9px',
                        color: d.muted,
                        marginLeft: 8,
                        letterSpacing: '0.05em',
                      }}>
                        {z.funkcja}
                      </span>
                    </div>
                    {isMatch && (
                      <span style={{
                        fontFamily: d.mono, fontSize: '9px',
                        fontWeight: 700, color: d.green,
                        background: d.greenMuted, border: `1px solid ${d.greenBorder}`,
                        padding: '2px 7px', borderRadius: 4,
                        letterSpacing: '0.06em',
                      }}>
                        KONTAKT
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* PKD / Industry */}
        {(output.pkd_glowne || pkdKody.length > 0) && (
          <div style={{
            background: d.bgCard,
            border: `1px solid ${d.border}`,
            borderRadius: 10,
            padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <Truck size={12} color={d.muted} />
              <SectionLabel>Działalność PKD</SectionLabel>
            </div>
            {output.pkd_glowne && (
              <div style={{
                padding: '8px 10px',
                background: d.bgSection,
                borderRadius: 7,
                marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  fontFamily: d.mono, fontSize: '9px', fontWeight: 700,
                  color: d.blue, background: d.blueMuted, border: `1px solid ${d.blueBorder}`,
                  padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                }}>
                  GŁÓWNE
                </span>
                <span style={{ fontFamily: d.sans, fontSize: '12px', color: d.white, lineHeight: 1.4 }}>
                  {output.pkd_glowne}
                </span>
              </div>
            )}
            {pkdKody.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                {pkdKody.slice(1, 10).map((kod) => (
                  <span key={kod} style={{
                    fontFamily: d.mono, fontSize: '10px',
                    color: d.secondary,
                    background: d.bgSection,
                    border: `1px solid ${d.border}`,
                    padding: '3px 8px', borderRadius: 4,
                  }}>
                    {kod}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* KRS enrichment note */}
        {output.notatka_krs && (
          <div style={{
            background: d.bgCard,
            border: `1px solid ${d.border}`,
            borderRadius: 10,
            padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <FileSearch size={12} color={d.muted} />
              <SectionLabel>Notatka do Notion</SectionLabel>
            </div>
            <pre style={{
              margin: 0,
              fontFamily: d.mono,
              fontSize: '10.5px',
              color: d.secondary,
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {output.notatka_krs}
            </pre>
          </div>
        )}

        {/* Agent notes */}
        {output.uwagi && (
          <div style={{
            padding: '10px 12px',
            background: d.amberMuted,
            border: `1px solid ${d.amberBorder}`,
            borderRadius: 8,
            fontFamily: d.sans, fontSize: '12px', color: d.amber, lineHeight: 1.5,
          }}>
            {output.uwagi}
          </div>
        )}

        {/* Source chip */}
        {output.krs_source && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{
              fontFamily: d.mono, fontSize: '9px', color: d.muted,
              background: d.bgCard, border: `1px solid ${d.border}`,
              padding: '3px 8px', borderRadius: 4, letterSpacing: '0.05em',
            }}>
              źródło: {output.krs_source}
            </span>
          </div>
        )}

      </div>
    </div>
  )
}
