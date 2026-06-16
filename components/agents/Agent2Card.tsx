'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Target, HelpCircle } from 'lucide-react'

export interface Agent2Output {
  pre_discovery_brief?: {
    profil_klienta?: string
    hipoteza_bol_glowny?: string
    hipotezy_bole_dodatkowe?: string[]
    pytania_priorytetowe?: Array<{ pytanie: string; uzasadnienie: string }>
    priorytetyzacja_modulow_hipoteza?: Array<{ modul: string; uzasadnienie_cytat: string }>
    tms_potwierdzenie?: string
    przewidywane_obiekcje?: Array<{ objekcja?: string; obiekcja_wariant?: string; odpowiedz: string }>
    ryzyka_rozmowy?: string
    uwagi_agenta?: string
  }
  plan_discovery?: string
}

const d = {
  bg: '#ffffff',
  surface: '#f8faff',
  border: '#e4e9f4',
  blue: '#2563eb',
  blueSoft: 'rgba(37,99,235,0.07)',
  blueBorder: 'rgba(37,99,235,0.18)',
  navy: '#0f172a',
  secondary: '#4b5f7c',
  muted: '#8896aa',
  warning: '#b45309',
  warningBg: 'rgba(180,83,9,0.06)',
  warningBorder: 'rgba(180,83,9,0.18)',
  success: '#15803d',
  successBg: 'rgba(21,128,61,0.07)',
  sans: '"Geist", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"Geist Mono", "Fira Code", monospace',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: d.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
      textTransform: 'uppercase' as const, color: d.blue, marginBottom: 10,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <div style={{ width: 18, height: 2, background: d.blue, borderRadius: 1, flexShrink: 0 }} />
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: d.border, margin: '20px 0' }} />
}

export function Agent2Card({ output }: { output: Agent2Output }) {
  const [planOpen, setPlanOpen] = useState(false)
  const brief = output.pre_discovery_brief ?? {}

  return (
    <div style={{
      background: d.bg,
      height: '100%',
      overflow: 'auto',
      fontFamily: d.sans,
      color: d.navy,
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 18px',
        background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(255,255,255,0) 60%)',
        borderBottom: `1px solid ${d.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: d.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: d.blue, marginBottom: 5 }}>
            Pre-Discovery Brief
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: d.navy, letterSpacing: '-0.025em' }}>
            Gotowy do spotkania
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
          background: d.successBg, border: `1px solid rgba(21,128,61,0.2)`,
          borderRadius: 99, fontFamily: d.mono, fontSize: 10, fontWeight: 700, color: d.success,
        }}>
          <CheckCircle2 size={11} />
          Analiza gotowa
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Profil klienta */}
        {brief.profil_klienta && (
          <>
            <SectionLabel>Profil klienta</SectionLabel>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: d.secondary, margin: '0 0 0 24px' }}>
              {brief.profil_klienta}
            </p>
            <Divider />
          </>
        )}

        {/* Hipoteza bólu */}
        {brief.hipoteza_bol_glowny && (
          <>
            <SectionLabel>Hipoteza bólu głównego</SectionLabel>
            <div style={{
              margin: '0 0 0 24px',
              padding: '16px 20px',
              background: d.blueSoft,
              border: `1px solid ${d.blueBorder}`,
              borderLeft: `3px solid ${d.blue}`,
              borderRadius: '0 10px 10px 0',
              fontSize: 15,
              fontWeight: 500,
              color: d.navy,
              lineHeight: 1.65,
            }}>
              {brief.hipoteza_bol_glowny}
            </div>

            {brief.hipotezy_bole_dodatkowe && brief.hipotezy_bole_dodatkowe.length > 0 && (
              <div style={{ margin: '10px 0 0 24px', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {brief.hipotezy_bole_dodatkowe.filter(Boolean).map((h, i) => (
                  <span key={i} style={{
                    padding: '4px 12px',
                    background: '#f1f5f9',
                    border: `1px solid ${d.border}`,
                    borderRadius: 99,
                    fontSize: 12, color: d.secondary,
                  }}>
                    {h}
                  </span>
                ))}
              </div>
            )}
            <Divider />
          </>
        )}

        {/* TMS */}
        {brief.tms_potwierdzenie && (
          <>
            <SectionLabel>TMS i integracja</SectionLabel>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: d.secondary, margin: '0 0 0 24px' }}>
              {brief.tms_potwierdzenie}
            </p>
            <Divider />
          </>
        )}

        {/* Pytania priorytetowe */}
        {brief.pytania_priorytetowe && brief.pytania_priorytetowe.length > 0 && (
          <>
            <SectionLabel>Pytania kluczowe do zadania</SectionLabel>
            <div style={{ margin: '0 0 0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {brief.pytania_priorytetowe.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{
                    fontFamily: d.mono, fontSize: 12, fontWeight: 700, color: d.blue,
                    flexShrink: 0, width: 22, marginTop: 1,
                  }}>
                    {i + 1}.
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: d.navy, lineHeight: 1.5, marginBottom: 3 }}>
                      {item.pytanie}
                    </div>
                    {item.uzasadnienie && (
                      <div style={{ fontSize: 12, color: d.muted, lineHeight: 1.55 }}>
                        {item.uzasadnienie}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Divider />
          </>
        )}

        {/* Moduły */}
        {brief.priorytetyzacja_modulow_hipoteza && brief.priorytetyzacja_modulow_hipoteza.length > 0 && (
          <>
            <SectionLabel>Rekomendowane moduły</SectionLabel>
            <div style={{ margin: '0 0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {brief.priorytetyzacja_modulow_hipoteza.map((item, i) => (
                <div key={i} style={{
                  padding: '12px 14px',
                  background: d.surface,
                  border: `1px solid ${d.border}`,
                  borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: item.uzasadnienie_cytat ? 6 : 0 }}>
                    <Target size={12} color={d.blue} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: d.navy }}>{item.modul}</span>
                    {i === 0 && (
                      <span style={{
                        padding: '1px 8px', background: d.blueSoft, border: `1px solid ${d.blueBorder}`,
                        borderRadius: 99, fontSize: 10, fontWeight: 700, color: d.blue,
                      }}>główny</span>
                    )}
                  </div>
                  {item.uzasadnienie_cytat && (
                    <p style={{ fontSize: 12, color: d.secondary, margin: '0 0 0 20px', lineHeight: 1.55, fontStyle: 'italic' }}>
                      &ldquo;{item.uzasadnienie_cytat}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
            <Divider />
          </>
        )}

        {/* Przewidywane objekcje */}
        {brief.przewidywane_obiekcje && brief.przewidywane_obiekcje.length > 0 && (
          <>
            <SectionLabel>Przewidywane objekcje i odpowiedzi</SectionLabel>
            <div style={{ margin: '0 0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {brief.przewidywane_obiekcje.map((item, i) => {
                const objekcja = item.objekcja ?? item.obiekcja_wariant ?? ''
                return (
                  <div key={i} style={{
                    background: '#fff', border: `1px solid ${d.border}`,
                    borderRadius: 10, overflow: 'hidden',
                  }}>
                    <div style={{
                      padding: '10px 14px', borderBottom: `1px solid ${d.border}`,
                      background: '#fafbfd',
                    }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <HelpCircle size={12} color={d.muted} style={{ marginTop: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: d.secondary, fontStyle: 'italic' }}>
                          &ldquo;{objekcja}&rdquo;
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: '10px 14px 10px 34px', fontSize: 13, color: d.navy, lineHeight: 1.6 }}>
                      {item.odpowiedz}
                    </div>
                  </div>
                )
              })}
            </div>
            <Divider />
          </>
        )}

        {/* Ryzyka */}
        {brief.ryzyka_rozmowy && (
          <>
            <div style={{
              margin: '0 0 0 0',
              padding: '14px 18px',
              background: d.warningBg,
              border: `1px solid ${d.warningBorder}`,
              borderRadius: 10,
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <AlertTriangle size={14} color={d.warning} style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: d.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: d.warning, marginBottom: 5 }}>
                  Ryzyka rozmowy
                </div>
                <p style={{ fontSize: 13, color: d.warning, margin: 0, lineHeight: 1.65 }}>
                  {brief.ryzyka_rozmowy}
                </p>
              </div>
            </div>
            <Divider />
          </>
        )}

        {/* Uwagi agenta */}
        {brief.uwagi_agenta && (
          <>
            <SectionLabel>Obserwacje agenta</SectionLabel>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: d.secondary, margin: '0 0 0 24px' }}>
              {brief.uwagi_agenta}
            </p>
            <Divider />
          </>
        )}

        {/* Plan Discovery — collapsible */}
        {output.plan_discovery && (
          <div style={{ border: `1px solid ${d.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <button
              onClick={() => setPlanOpen(v => !v)}
              style={{
                width: '100%', padding: '14px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: planOpen ? d.surface : '#fff',
                border: 'none', cursor: 'pointer',
                borderBottom: planOpen ? `1px solid ${d.border}` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 18, height: 2, background: d.blue, borderRadius: 1 }} />
                <span style={{ fontFamily: d.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: d.blue }}>
                  Plan Discovery Call
                </span>
              </div>
              {planOpen ? <ChevronUp size={14} color={d.muted} /> : <ChevronDown size={14} color={d.muted} />}
            </button>
            {planOpen && (
              <div style={{ padding: '18px 22px' }}>
                <pre style={{
                  fontFamily: d.sans, fontSize: 13.5, color: d.navy,
                  lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                }}>
                  {output.plan_discovery}
                </pre>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
