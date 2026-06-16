'use client'

import { ArrowRight, Presentation, Quote } from 'lucide-react'

export interface Agent3Output {
  hero_stat_godziny?: string | number | null
  roi_dzis_h?: number | null
  roi_po_h?: number | null
  roi_roznica_h?: number | null
  modul_priorytet?: string | null
  dopasowanie_problem_sekcja?: string | null
  cytat_poprzednie_proby?: string | null
  harmonogram_uwaga?: string | null
  kontekst_roi_cena?: string | null
  uwagi_agenta?: string | null
}

const d = {
  bg: '#07111f',
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.06)',
  border: 'rgba(59,130,246,0.13)',
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
  warning: '#f59e0b',
  warningFaint: 'rgba(245,158,11,0.10)',
  sans: '"Geist", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"Geist Mono", "Fira Code", monospace',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: d.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
      textTransform: 'uppercase' as const, color: d.blue, marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: d.borderSubtle, margin: '18px 0' }} />
}

function formatHours(val: number | null | undefined): string {
  if (val == null) return '—'
  return val % 1 === 0 ? `${val}h` : `${val.toFixed(1)}h`
}

export function Agent3Card({ output }: { output: Agent3Output }) {
  const hasRoi = output.roi_dzis_h != null || output.roi_po_h != null || output.roi_roznica_h != null

  return (
    <div style={{
      background: d.bg,
      height: '100%',
      overflow: 'auto',
      fontFamily: d.sans,
      color: d.white,
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 18px',
        background: 'linear-gradient(160deg, rgba(37,99,235,0.1) 0%, transparent 55%)',
        borderBottom: `1px solid ${d.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: d.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: d.blue, marginBottom: 5 }}>
            Personalizacja
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.025em' }}>
            HTML Prezentacja · Dane gotowe
          </div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: d.blueFaint, border: `1px solid ${d.blueFaintBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Presentation size={16} color={d.blue} />
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* ROI Numbers */}
        {hasRoi && (
          <>
            <Label>Wykres ROI — dane do wpisania</Label>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 0,
              background: d.surface, border: `1px solid ${d.border}`,
              borderRadius: 14, overflow: 'hidden', marginBottom: 0,
            }}>
              {/* Dziś */}
              <div style={{ padding: '20px 22px', textAlign: 'center' as const }}>
                <div style={{
                  fontFamily: d.mono, fontSize: 44, fontWeight: 800, lineHeight: 1,
                  letterSpacing: '-0.04em', color: d.warning,
                }}>
                  {output.roi_dzis_h != null ? formatHours(output.roi_dzis_h) : (output.hero_stat_godziny ?? '—')}
                </div>
                <div style={{ fontFamily: d.sans, fontSize: 11, color: d.muted, marginTop: 7, letterSpacing: '0.02em' }}>
                  marnowane dziś / mies.
                </div>
              </div>

              {/* Arrow */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                <ArrowRight size={16} color={d.muted} />
              </div>

              {/* Po Autorise */}
              <div style={{ padding: '20px 22px', textAlign: 'center' as const }}>
                <div style={{
                  fontFamily: d.mono, fontSize: 44, fontWeight: 800, lineHeight: 1,
                  letterSpacing: '-0.04em', color: d.success,
                }}>
                  {output.roi_po_h != null ? formatHours(output.roi_po_h) : '—'}
                </div>
                <div style={{ fontFamily: d.sans, fontSize: 11, color: d.muted, marginTop: 7, letterSpacing: '0.02em' }}>
                  zostaje po wdrożeniu
                </div>
              </div>

              {/* Arrow */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                <ArrowRight size={16} color={d.muted} />
              </div>

              {/* Oszczędność */}
              <div style={{
                padding: '20px 22px', textAlign: 'center' as const,
                background: d.blueFaint, borderLeft: `1px solid ${d.blueFaintBorder}`,
              }}>
                <div style={{
                  fontFamily: d.mono, fontSize: 44, fontWeight: 800, lineHeight: 1,
                  letterSpacing: '-0.04em', color: d.blue,
                }}>
                  {output.roi_roznica_h != null ? formatHours(output.roi_roznica_h) : '—'}
                </div>
                <div style={{ fontFamily: d.sans, fontSize: 11, color: d.secondary, marginTop: 7, letterSpacing: '0.02em' }}>
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
            <div style={{
              padding: '14px 18px',
              background: d.blueFaint,
              border: `1px solid ${d.blueFaintBorder}`,
              borderRadius: 10,
              fontSize: 14, fontWeight: 600, color: d.white, lineHeight: 1.6,
            }}>
              {output.modul_priorytet}
            </div>
            <Divider />
          </>
        )}

        {/* Dopasowanie prezentacji */}
        {output.dopasowanie_problem_sekcja && (
          <>
            <Label>Dopasowanie sekcji "Problem"</Label>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: d.whiteDim, margin: 0 }}>
              {output.dopasowanie_problem_sekcja}
            </p>
            <Divider />
          </>
        )}

        {/* Cytat do sekcji USP */}
        {output.cytat_poprzednie_proby && (
          <>
            <Label>Cytat do sekcji USP — poprzednie próby</Label>
            <div style={{
              padding: '14px 18px 14px 20px',
              borderLeft: `3px solid ${d.blue}60`,
              background: 'rgba(59,130,246,0.05)',
              borderRadius: '0 10px 10px 0',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <Quote size={13} color={`${d.blue}60`} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 14, color: d.whiteDim, lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
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
            <div style={{
              padding: '14px 18px',
              background: d.successFaint,
              border: `1px solid ${d.successBorder}`,
              borderRadius: 10,
              fontSize: 14, color: d.success, lineHeight: 1.65,
            }}>
              {output.kontekst_roi_cena}
            </div>
            <Divider />
          </>
        )}

        {/* Harmonogram */}
        {output.harmonogram_uwaga && (
          <>
            <Label>Harmonogram wdrożenia — uwaga</Label>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: d.secondary, margin: 0 }}>
              {output.harmonogram_uwaga}
            </p>
            <Divider />
          </>
        )}

        {/* Uwagi agenta */}
        {output.uwagi_agenta && (
          <>
            <Label>Obserwacje agenta</Label>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: d.secondary, margin: 0 }}>
              {output.uwagi_agenta}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
