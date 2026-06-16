'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Copy, Check, Save, ChevronDown, ChevronUp, ExternalLink, X, Loader2 } from 'lucide-react'
import { agentTokens as at } from '@/lib/tokens'
import type { PipelineClient } from '@/lib/notion/client'

// ── Colors ──────────────────────────────────────────────────────────

const d = {
  bg: at.bg.terminal,
  surface: 'rgba(255,255,255,0.04)',
  border: at.border.default,
  borderSubtle: 'rgba(255,255,255,0.07)',
  blue: at.accent.primary,
  blueFaint: 'rgba(59,130,246,0.10)',
  blueBorder: 'rgba(59,130,246,0.22)',
  white: at.text.primary,
  whiteDim: at.text.secondary,
  secondary: at.text.muted,
  success: at.status.success,
  successFaint: 'rgba(34,197,94,0.09)',
  successBorder: 'rgba(34,197,94,0.22)',
  sans: at.font.sans,
  mono: at.font.mono,
}

// ── Field ──────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = 'number', placeholder, suffix, min, readOnly,
}: {
  label: string; value: string | number; onChange?: (v: string) => void;
  type?: string; placeholder?: string; suffix?: string; min?: number; readOnly?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: d.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: d.blue }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          min={min}
          readOnly={readOnly}
          style={{
            flex: 1, background: readOnly ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${d.borderSubtle}`,
            borderRight: suffix ? 'none' : `1px solid ${d.borderSubtle}`,
            borderRadius: suffix ? '8px 0 0 8px' : 8,
            color: readOnly ? d.secondary : d.white,
            fontFamily: d.mono, fontSize: 16, fontWeight: 600,
            padding: '12px 14px', outline: 'none', minHeight: 44,
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { if (!readOnly) (e.target as HTMLInputElement).style.borderColor = d.blue }}
          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = d.borderSubtle }}
        />
        {suffix && (
          <span style={{
            padding: '12px 12px', background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${d.borderSubtle}`, borderLeft: 'none',
            borderRadius: '0 8px 8px 0', fontFamily: d.mono,
            fontSize: 13, color: d.secondary, whiteSpace: 'nowrap',
          }}>{suffix}</span>
        )}
      </div>
    </div>
  )
}

// ── Result row ────────────────────────────────────────────────────

function Result({ label, value, big, accent }: { label: string; value: string; big?: boolean; accent?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: `1px solid ${d.borderSubtle}`,
    }}>
      <span style={{ fontFamily: d.sans, fontSize: 13, color: d.secondary }}>
        {label}
      </span>
      <span style={{
        fontFamily: d.mono,
        fontSize: big ? 28 : 18,
        fontWeight: 800,
        color: accent ? d.success : d.white,
        letterSpacing: '-0.03em',
      }}>
        {value}
      </span>
    </div>
  )
}

// ── Save to Notion modal ──────────────────────────────────────────

function SaveModal({
  clients, saving, error, onSave, onClose,
}: {
  clients: PipelineClient[]; saving: boolean; error: string | null;
  onSave: (id: string) => void; onClose: () => void;
}) {
  const eligible = clients.filter(c =>
    c.status === 'Kwalifikacja' || c.status === 'Discovery umówione' || c.status === 'Discovery Call'
  )
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#0d1b2e', border: `1px solid ${d.borderSubtle}`,
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: d.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: d.blue }}>
            Wybierz klienta
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: d.secondary }}>
            <X size={16} />
          </button>
        </div>

        {eligible.length === 0 ? (
          <p style={{ fontFamily: d.sans, fontSize: 13, color: d.secondary }}>
            Brak klientów w statusie Kwalifikacja / Discovery umówione / Discovery Call.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {eligible.map(c => (
              <button
                key={c.id}
                onClick={() => onSave(c.id)}
                disabled={saving}
                style={{
                  padding: '12px 16px', background: d.surface, border: `1px solid ${d.borderSubtle}`,
                  borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = d.blue }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = d.borderSubtle }}
              >
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} /> : null}
                <div>
                  <div style={{ fontFamily: d.sans, fontSize: 14, fontWeight: 600, color: d.white }}>
                    {c.name || c.id}
                  </div>
                  <div style={{ fontFamily: d.mono, fontSize: 10, color: d.secondary, marginTop: 2 }}>{c.status}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontFamily: d.sans, fontSize: 12, color: '#ef4444' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function KalkulatorPage() {
  const [nazwaKlienta, setNazwaKlienta] = useState('')
  const [spedytorzy, setSpedytorzy] = useState('3')
  const [czasManualny, setCzasManualny] = useState('60')
  const [stawka, setStawka] = useState('8000')
  const [fullMode, setFullMode] = useState(false)
  const [maile, setMaile] = useState('40')
  const [godzinyWpisywania, setGodzinyWpisywania] = useState('2')
  const [fakturyPo, setFakturyPo] = useState('5')
  const [sredniaCena, setSredniaCena] = useState('15000')
  const [copied, setCopied] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [clients, setClients] = useState<PipelineClient[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedClient, setSavedClient] = useState<string | null>(null)

  const n = (v: string) => parseFloat(v) || 0

  const calc = useMemo(() => {
    const s = n(spedytorzy)
    const pct = n(czasManualny) / 100
    const st = n(stawka)

    const kosztMc = Math.round(s * pct * st)
    const kosztRok = kosztMc * 12
    const roi = st > 0 ? (kosztRok / 15000).toFixed(1) : '—'
    const pctKosztu = kosztRok > 0 ? ((15000 / kosztRok) * 100).toFixed(1) : '—'

    const hMc = fullMode ? Math.round(s * n(godzinyWpisywania) * 22) : null
    const hRok = hMc != null ? hMc * 12 : null
    const ryzykoFaktur = fullMode ? Math.round(n(fakturyPo) * n(sredniaCena) * 0.15) : null
    const calkowityRok = fullMode && ryzykoFaktur != null && kosztRok > 0
      ? Math.round(kosztRok + ryzykoFaktur * 12)
      : null

    return { kosztMc, kosztRok, roi, pctKosztu, hMc, hRok, ryzykoFaktur, calkowityRok }
  }, [spedytorzy, czasManualny, stawka, fullMode, godzinyWpisywania, fakturyPo, sredniaCena])

  const copyText = useCallback(() => {
    const lines = [
      `KOSZT BÓLU${nazwaKlienta ? ` — ${nazwaKlienta}` : ''}`,
      `Spedytorzy: ${spedytorzy} | Czas manualny: ${czasManualny}% | Stawka: ${stawka} PLN`,
      `Miesięcznie: ${calc.kosztMc.toLocaleString('pl')} PLN | Rocznie: ${calc.kosztRok.toLocaleString('pl')} PLN`,
      `ROI: ${calc.roi}x | 15 000 PLN = ${calc.pctKosztu}% kosztu rocznego`,
    ]
    if (fullMode && calc.hMc) {
      lines.push(`Godziny tracone: ${calc.hMc} h/mc | ${calc.hRok} h/rok`)
      lines.push(`Ryzyko faktur po terminie: ${calc.ryzykoFaktur?.toLocaleString('pl')} PLN/mc`)
      if (calc.calkowityRok) lines.push(`Całkowity koszt roczny: ${calc.calkowityRok.toLocaleString('pl')} PLN/rok`)
    }
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }, [nazwaKlienta, spedytorzy, czasManualny, stawka, calc, fullMode])

  const loadClients = useCallback(async () => {
    if (clients.length > 0) return
    setClientsLoading(true)
    try {
      const res = await fetch('/api/clients')
      const data = await res.json()
      if (data.success) setClients(data.clients ?? [])
    } catch { /* silent */ } finally {
      setClientsLoading(false)
    }
  }, [clients.length])

  const handleOpenSave = useCallback(() => {
    loadClients()
    setSaveError(null)
    setShowSaveModal(true)
  }, [loadClients])

  const handleSave = useCallback(async (pageId: string) => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/notion/pipeline-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          fields: { koszt_problemu: calc.kosztMc, koszt_roczny: calc.kosztRok },
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Błąd zapisu')
      setSavedClient(data.firmaNazwa || pageId)
      setShowSaveModal(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Błąd zapisu do Notion')
    } finally {
      setSaving(false)
    }
  }, [calc])

  const prezentacjaUrl = useMemo(() => {
    const p = new URLSearchParams()
    if (n(spedytorzy) && n(czasManualny)) {
      const dzis = Math.round(n(spedytorzy) * (n(czasManualny) / 100) * 22 * 8)
      p.set('roi', Math.min(dzis, 70).toString())
      p.set('po', '10')
      p.set('h', Math.min(dzis, 80).toString())
    }
    if (calc.kosztRok > 0) p.set('bol', calc.kosztRok.toString())
    return `/prezentacja.html?${p.toString()}`
  }, [spedytorzy, czasManualny, calc.kosztRok])

  return (
    <div style={{
      minHeight: '100vh', background: d.bg, padding: '32px 28px',
      fontFamily: d.sans, color: d.white,
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: d.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: d.blue, marginBottom: 8 }}>
          Narzędzia · Kalkulator
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>
          Kalkulator kosztu bólu
        </h1>
        {savedClient && (
          <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: d.successFaint, border: `1px solid ${d.successBorder}`, borderRadius: 99, fontSize: 12, color: d.success }}>
            <Check size={11} /> Zapisano do Pipeline: {savedClient}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>

        {/* LEFT — Inputs */}
        <div>
          {/* Nazwa klienta */}
          <div style={{ marginBottom: 24 }}>
            <Field label="Nazwa klienta (opcjonalne)" value={nazwaKlienta} onChange={setNazwaKlienta} type="text" placeholder="np. Trans-Pol Sp. z o.o." />
          </div>

          {/* Quick mode */}
          <div style={{
            padding: '20px', background: d.surface, border: `1px solid ${d.borderSubtle}`,
            borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 16,
          }}>
            <div style={{ fontFamily: d.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: d.blue }}>
              Tryb szybki
            </div>
            <Field label="Liczba spedytorów" value={spedytorzy} onChange={setSpedytorzy} suffix="os." min={1} />
            <Field label="Procent czasu manualnego" value={czasManualny} onChange={setCzasManualny} suffix="%" min={0} />
            <Field label="Stawka miesięczna / spedytor" value={stawka} onChange={setStawka} suffix="PLN" min={0} />
          </div>

          {/* Full mode toggle */}
          <button
            onClick={() => setFullMode(v => !v)}
            style={{
              width: '100%', padding: '11px 16px',
              background: fullMode ? d.blueFaint : d.surface,
              border: `1px solid ${fullMode ? d.blueBorder : d.borderSubtle}`,
              borderRadius: 10, cursor: 'pointer', color: fullMode ? d.blue : d.secondary,
              fontFamily: d.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'all 0.15s',
            }}
          >
            <span>Tryb pełny (Discovery Call)</span>
            {fullMode ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {fullMode && (
            <div style={{
              marginTop: 10, padding: '20px', background: d.surface,
              border: `1px solid ${d.blueBorder}`, borderRadius: 14,
              display: 'flex', flexDirection: 'column', gap: 18,
            }}>
              <Field label="Maile ze zleceniami / dzień" value={maile} onChange={setMaile} suffix="szt." min={0} />
              <Field label="Godziny wpisywania / spedytor / dzień" value={godzinyWpisywania} onChange={setGodzinyWpisywania} suffix="h" min={0} />
              <Field label="Faktury po terminie / miesiąc" value={fakturyPo} onChange={setFakturyPo} suffix="szt." min={0} />
              <Field label="Średnia wartość faktury" value={sredniaCena} onChange={setSredniaCena} suffix="PLN" min={0} />
            </div>
          )}
        </div>

        {/* RIGHT — Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Main results */}
          <div style={{
            padding: '24px', background: d.surface, border: `1px solid ${d.borderSubtle}`,
            borderRadius: 14,
          }}>
            <div style={{ fontFamily: d.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: d.blue, marginBottom: 16 }}>
              Wyniki
            </div>

            <Result label="Koszt bólu miesięcznie" value={`${calc.kosztMc.toLocaleString('pl')} PLN/mc`} />
            <Result label="Koszt bólu rocznie" value={`${calc.kosztRok.toLocaleString('pl')} PLN/rok`} big accent />
            <Result label="ROI (koszt / 15 000 PLN)" value={`${calc.roi}×`} />
            <div style={{ borderBottom: 'none' }}>
              <Result label="15 000 PLN to" value={`${calc.pctKosztu}% kosztu rocznego`} />
            </div>
          </div>

          {/* Full mode results */}
          {fullMode && (
            <div style={{
              padding: '24px', background: d.surface, border: `1px solid ${d.blueBorder}`,
              borderRadius: 14,
            }}>
              <div style={{ fontFamily: d.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: d.blue, marginBottom: 16 }}>
                Analiza pełna
              </div>
              <Result label="Godziny tracone / miesiąc (cały zespół)" value={`${calc.hMc ?? 0} h/mc`} />
              <Result label="Godziny tracone / rok" value={`${calc.hRok ?? 0} h/rok`} />
              <Result label="Ryzyko faktur po terminie" value={`${calc.ryzykoFaktur?.toLocaleString('pl') ?? 0} PLN/mc`} />
              {calc.calkowityRok != null && (
                <Result label="Całkowity koszt roczny" value={`${calc.calkowityRok.toLocaleString('pl')} PLN/rok`} big accent />
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={copyText}
              style={{
                padding: '13px 20px', background: copied ? d.successFaint : d.surface,
                border: `1px solid ${copied ? d.successBorder : d.borderSubtle}`,
                borderRadius: 10, cursor: 'pointer',
                color: copied ? d.success : d.white,
                fontFamily: d.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.15s',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Skopiowano!' : 'Kopiuj wyniki'}
            </button>

            <button
              onClick={handleOpenSave}
              style={{
                padding: '13px 20px', background: d.blueFaint,
                border: `1px solid ${d.blueBorder}`,
                borderRadius: 10, cursor: 'pointer', color: d.blue,
                fontFamily: d.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.15s',
              }}
            >
              <Save size={14} />
              Zapisz do Pipeline Notion
            </button>

            <a
              href={prezentacjaUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '13px 20px', background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${d.borderSubtle}`,
                borderRadius: 10, cursor: 'pointer', color: d.secondary,
                fontFamily: d.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                textDecoration: 'none', transition: 'all 0.15s',
              }}
            >
              <ExternalLink size={14} />
              Otwórz prezentację z tymi liczbami
            </a>
          </div>
        </div>
      </div>

      {showSaveModal && (
        <SaveModal
          clients={clientsLoading ? [] : clients}
          saving={saving}
          error={saveError}
          onSave={handleSave}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  )
}
