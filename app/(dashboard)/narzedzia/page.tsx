'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Mic, Upload, Loader2, CheckCircle, AlertCircle,
  Copy, Download, FileAudio, RotateCcw,
} from 'lucide-react'

// ── Tokens ───────────────────────────────────────────────────────────
const d = {
  navy:   '#0B1F3A',
  accent: '#2563eb',
  accentSoft: '#EBF2FF',
  paper:  '#FFFFFF',
  soft:   '#F4F6FA',
  steel:  '#5A6B85',
  line:   '#E1E6EE',
  good:   '#16a34a',
  goodBg: 'rgba(22,163,74,0.08)',
  err:    '#dc2626',
  sans:   '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono:   '"Geist Mono", "Fira Code", monospace',
}

// ── Types ────────────────────────────────────────────────────────────
type PageState = 'idle' | 'processing' | 'done' | 'error'
type ViewMode  = 'timestamps' | 'clean'

interface Segment { start: number; end: number; text: string }

interface TranscriptResult {
  transcript: string
  segments:   Segment[]
  duration:   number
  language:   string
  chunks:     number
}

interface ChunkProgress {
  total:             number
  done:              number
  processedDuration: number
  partialTexts:      string[]
}

interface SSEEvent {
  type:              string
  chunks?:           number
  done?:             number
  total?:            number
  partialText?:      string
  processedDuration?: number
  transcript?:       string
  segments?:         Segment[]
  duration?:         number
  language?:         string
  message?:          string
  fileName?:         string
  fileSize?:         number
}

// ── Helpers ──────────────────────────────────────────────────────────
function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const mm = m.toString().padStart(2, '0')
  const ss = s.toString().padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function fmtElapsed(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function bytesLabel(b: number): string {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`
}

const LANG_MAP: Record<string, string> = {
  pl: 'Polski', en: 'Angielski', de: 'Niemiecki',
  fr: 'Francuski', uk: 'Ukraiński', ru: 'Rosyjski',
}
const langLabel = (c: string) => LANG_MAP[c] ?? c.toUpperCase()

function timestampText(segments: Segment[]): string {
  return segments.map(s => `[${fmtTime(s.start)}]  ${s.text}`).join('\n')
}

function statusMsg(info: ChunkProgress, elapsed: number): string {
  if (info.total > 1) {
    if (info.done === 0) return 'Przygotowuję plik...'
    return `Przetwarzam fragment ${info.done} z ${info.total}...`
  }
  if (elapsed < 5)  return 'Łączę z Groq Whisper...'
  if (elapsed < 20) return 'Analizuję mowę...'
  if (elapsed < 45) return 'Wyciągam słowa...'
  return 'Finalizuję transkrypt...'
}

// ── Sub-components ───────────────────────────────────────────────────

function StatCard({ value, label, accent = false }: {
  value: string; label: string; accent?: boolean
}) {
  return (
    <div style={{
      flex: 1, padding: '18px 20px', borderRadius: 14,
      background: accent ? d.navy : d.paper,
      border: `1px solid ${accent ? d.navy : d.line}`,
    }}>
      <div style={{
        fontFamily: d.mono, fontSize: 24, fontWeight: 800, lineHeight: 1,
        letterSpacing: '-0.03em', marginBottom: 7,
        color: accent ? '#fff' : d.navy,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: d.sans, fontSize: 11, fontWeight: 600,
        color: accent ? 'rgba(255,255,255,0.5)' : d.steel, letterSpacing: '0.01em',
      }}>
        {label}
      </div>
    </div>
  )
}

function SegmentRow({ seg }: { seg: Segment }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '72px 1fr', gap: 20,
      padding: '8px 0', borderBottom: `1px solid ${d.line}`, alignItems: 'baseline',
    }}>
      <span style={{
        fontFamily: d.mono, fontSize: 11.5, fontWeight: 600,
        color: d.accent, flexShrink: 0, userSelect: 'none' as const,
      }}>
        {fmtTime(seg.start)}
      </span>
      <span style={{
        fontFamily: d.sans, fontSize: 14.5, lineHeight: 1.65, color: d.navy, fontWeight: 400,
      }}>
        {seg.text}
      </span>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────
export default function NarzedziaPage() {
  const [state, setState]       = useState<PageState>('idle')
  const [result, setResult]     = useState<TranscriptResult | null>(null)
  const [error, setError]       = useState('')
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('timestamps')
  const [copied, setCopied]     = useState(false)
  const [elapsed, setElapsed]   = useState(0)
  const [progress, setProgress] = useState<ChunkProgress>({
    total: 1, done: 0, processedDuration: 0, partialTexts: [],
  })

  const fileInputRef  = useRef<HTMLInputElement>(null)
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const gotResultRef  = useRef(false)

  // Elapsed timer
  const startTimer = () => {
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
  }
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }
  useEffect(() => () => stopTimer(), [])

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setFileSize(file.size)
    setState('processing')
    setResult(null)
    setError('')
    setProgress({ total: 1, done: 0, processedDuration: 0, partialTexts: [] })
    gotResultRef.current = false
    startTimer()

    const form = new FormData()
    form.append('audio', file)

    let res: Response
    try {
      res = await fetch('/api/tools/transcribe', { method: 'POST', body: form })
    } catch {
      stopTimer()
      setError('Błąd połączenia z serwerem.')
      setState('error')
      return
    }

    if (!res.body) {
      stopTimer()
      setError('Serwer nie zwrócił streamu.')
      setState('error')
      return
    }

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer    = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: SSEEvent
          try { event = JSON.parse(line.slice(6)) as SSEEvent }
          catch { continue }

          if (event.type === 'start') {
            setProgress(prev => ({ ...prev, total: event.chunks ?? 1 }))

          } else if (event.type === 'chunk') {
            setProgress(prev => ({
              total:             event.total ?? prev.total,
              done:              event.done  ?? prev.done,
              processedDuration: event.processedDuration ?? prev.processedDuration,
              partialTexts:      [...prev.partialTexts, event.partialText ?? ''],
            }))

          } else if (event.type === 'done') {
            gotResultRef.current = true
            stopTimer()
            setResult({
              transcript: event.transcript ?? '',
              segments:   event.segments   ?? [],
              duration:   event.duration   ?? 0,
              language:   event.language   ?? 'pl',
              chunks:     event.chunks     ?? 1,
            })
            setState('done')

          } else if (event.type === 'error') {
            stopTimer()
            setError(event.message ?? 'Nieznany błąd.')
            setState('error')
          }
        }
      }
    } catch {
      stopTimer()
      if (!gotResultRef.current) {
        setError('Przerwano połączenie z serwerem.')
        setState('error')
      }
    }
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  const copy = async () => {
    if (!result) return
    const text = viewMode === 'timestamps' ? timestampText(result.segments) : result.transcript
    await navigator.clipboard.writeText(text).catch(() => null)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    if (!result) return
    const base = fileName.replace(/\.[^.]+$/, '') || 'transkrypt'
    const text = viewMode === 'timestamps' ? timestampText(result.segments) : result.transcript
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `${base}${viewMode === 'timestamps' ? '_timestamps' : ''}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    stopTimer()
    setState('idle')
    setResult(null)
    setError('')
    setFileName('')
    setFileSize(0)
    setElapsed(0)
    setProgress({ total: 1, done: 0, processedDuration: 0, partialTexts: [] })
    gotResultRef.current = false
  }

  // Derived progress values
  const pct = progress.total > 1
    ? Math.round((progress.done / progress.total) * 100)
    : null  // indeterminate for single chunk

  const previewText = progress.partialTexts.join(' ')

  return (
    <div style={{ padding: '44px 48px', maxWidth: 980, margin: '0 auto' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ width: 28, height: 2, background: d.accent, flexShrink: 0 }} />
          <span style={{
            fontFamily: d.mono, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: d.accent,
          }}>
            Narzędzia / Audio
          </span>
        </div>
        <h1 style={{
          fontFamily: d.sans, fontSize: 38, fontWeight: 800, color: d.navy,
          letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 12px',
        }}>
          Transkrypcja Nagrań
        </h1>
        <p style={{
          fontFamily: d.sans, fontSize: 16, color: d.steel, fontWeight: 500,
          margin: 0, lineHeight: 1.6,
        }}>
          Nagranie rozmowy sprzedażowej, discovery lub kwalifikacji → profesjonalny transkrypt z timestampami.
        </p>
      </div>

      {/* ── Card ── */}
      <div style={{
        background: d.paper,
        border: `1px solid ${d.line}`,
        borderRadius: 20,
        boxShadow: '0 1px 4px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)',
        overflow: 'hidden',
      }}>

        {/* Card header */}
        <div style={{
          padding: '16px 28px', borderBottom: `1px solid ${d.line}`,
          background: d.soft, display: 'flex', alignItems: 'center',
          gap: 14, justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: d.accentSoft, border: `1px solid rgba(37,99,235,0.2)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Mic size={16} color={d.accent} />
            </div>
            <div>
              <div style={{ fontFamily: d.sans, fontSize: 14, fontWeight: 700, color: d.navy, lineHeight: 1 }}>
                Audio → TXT
              </div>
              <div style={{ fontFamily: d.mono, fontSize: 10, color: d.steel, marginTop: 3, letterSpacing: '0.04em' }}>
                Groq · Whisper large-v3 · do 100 MB · auto-chunking
              </div>
            </div>
          </div>

          {(state === 'done' || state === 'error') && (
            <button onClick={reset} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              background: 'none', border: `1px solid ${d.line}`, borderRadius: 8,
              fontFamily: d.sans, fontSize: 12, fontWeight: 600, color: d.steel, cursor: 'pointer',
            }}>
              <RotateCcw size={11} />
              Nowe nagranie
            </button>
          )}
        </div>

        {/* ── IDLE ── */}
        {state === 'idle' && (
          <div style={{ padding: '32px 28px' }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? d.accent : d.line}`,
                borderRadius: 16, padding: '60px 32px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
                cursor: 'pointer', background: isDragOver ? d.accentSoft : d.soft,
                transition: 'all 0.15s', userSelect: 'none' as const,
              }}
            >
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: isDragOver ? d.accentSoft : d.paper,
                border: `1px solid ${isDragOver ? 'rgba(37,99,235,0.3)' : d.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              }}>
                <Upload size={24} color={isDragOver ? d.accent : d.steel} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: d.sans, fontSize: 16, fontWeight: 700,
                  color: isDragOver ? d.accent : d.navy, marginBottom: 6,
                }}>
                  Przeciągnij nagranie lub kliknij, aby wybrać
                </div>
                <div style={{ fontFamily: d.sans, fontSize: 13, color: d.steel }}>
                  MP3, M4A, WAV, FLAC, OGG · Maksymalnie 100 MB
                </div>
                <div style={{
                  fontFamily: d.mono, fontSize: 11, color: '#94a3b8', marginTop: 5, letterSpacing: '0.03em',
                }}>
                  Pliki &gt;22 MB dzielone automatycznie na fragmenty
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                style={{
                  padding: '10px 28px', background: d.accent, color: '#fff', border: 'none',
                  borderRadius: 10, fontFamily: d.sans, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
                }}
              >
                Wybierz plik
              </button>
              <input
                ref={fileInputRef} type="file"
                accept=".mp3,.m4a,.wav,.ogg,.webm,.flac"
                style={{ display: 'none' }} onChange={onFileChange}
              />
            </div>

            {/* Bottom info strip */}
            <div style={{
              marginTop: 20, display: 'flex', gap: 0,
              background: d.soft, border: `1px solid ${d.line}`,
              borderRadius: 12, overflow: 'hidden',
            }}>
              {[
                { label: 'Prędkość', value: '~50× realtime' },
                { label: 'Model', value: 'Whisper large-v3' },
                { label: 'Prywatność', value: 'Pliki nie są zapisywane' },
                { label: 'Duże pliki', value: 'Auto-chunking' },
              ].map((item, i, arr) => (
                <div key={item.label} style={{
                  flex: 1, padding: '14px 18px',
                  borderRight: i < arr.length - 1 ? `1px solid ${d.line}` : 'none',
                }}>
                  <div style={{
                    fontFamily: d.mono, fontSize: 9, fontWeight: 700, color: d.accent,
                    letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 4,
                  }}>
                    {item.label}
                  </div>
                  <div style={{ fontFamily: d.sans, fontSize: 13, fontWeight: 600, color: d.steel }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {state === 'processing' && (
          <div style={{ padding: '32px 28px' }}>

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
              {/* Spinner */}
              <div style={{
                position: 'relative', width: 52, height: 52, flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%', background: d.navy,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Loader2 size={22} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
                <div style={{
                  position: 'absolute', inset: -5, borderRadius: '50%',
                  border: `2.5px solid transparent`,
                  borderTopColor: d.accent,
                  animation: 'spin 1.6s linear infinite',
                }} />
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: d.sans, fontSize: 17, fontWeight: 800, color: d.navy, marginBottom: 5,
                }}>
                  {statusMsg(progress, elapsed)}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontFamily: d.mono, fontSize: 11, color: d.steel,
                }}>
                  <FileAudio size={12} color={d.steel} />
                  <span>{fileName}</span>
                  <span style={{
                    background: d.soft, border: `1px solid ${d.line}`,
                    padding: '1px 6px', borderRadius: 4,
                  }}>
                    {bytesLabel(fileSize)}
                  </span>
                </div>
              </div>

              {/* Elapsed timer */}
              <div style={{
                fontFamily: d.mono, fontSize: 28, fontWeight: 800,
                color: d.navy, letterSpacing: '-0.04em', flexShrink: 0,
              }}>
                {fmtElapsed(elapsed)}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{
              height: 7, background: d.line, borderRadius: 4, overflow: 'hidden', marginBottom: 12,
            }}>
              {pct !== null ? (
                /* Determinate — real chunk progress */
                <div style={{
                  height: '100%', borderRadius: 4, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${d.navy} 0%, ${d.accent} 100%)`,
                }} />
              ) : (
                /* Indeterminate shimmer */
                <div style={{
                  height: '100%', borderRadius: 4, width: '35%',
                  background: `linear-gradient(90deg, transparent, ${d.accent}, transparent)`,
                  animation: 'slide 1.6s ease-in-out infinite',
                }} />
              )}
            </div>

            {/* Progress meta row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
              fontFamily: d.mono, fontSize: 11,
            }}>
              {pct !== null && (
                <span style={{
                  color: '#fff', background: d.accent,
                  padding: '2px 10px', borderRadius: 100, fontWeight: 700, fontSize: 12,
                }}>
                  {pct}%
                </span>
              )}
              {progress.total > 1 && (
                <span style={{ color: d.steel }}>
                  Fragment {progress.done}/{progress.total}
                </span>
              )}
              {progress.processedDuration > 0 && (
                <span style={{ color: d.steel }}>
                  Przetworzone: <span style={{ color: d.accent, fontWeight: 700 }}>{fmtTime(progress.processedDuration)}</span> nagrania
                </span>
              )}
              <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>
                Groq Whisper · ~50× realtime
              </span>
            </div>

            {/* Live transcript preview */}
            {previewText ? (
              <div style={{
                background: d.navy, borderRadius: 14, padding: '18px 22px',
                maxHeight: 200, overflowY: 'auto',
              }}>
                <div style={{
                  fontFamily: d.mono, fontSize: 9, fontWeight: 700,
                  color: 'rgba(255,255,255,0.28)', letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const, marginBottom: 12,
                }}>
                  ▸ Podgląd na żywo
                </div>
                <p style={{
                  fontFamily: d.sans, fontSize: 13.5, color: 'rgba(255,255,255,0.82)',
                  lineHeight: 1.7, margin: 0,
                }}>
                  {previewText}
                  <span style={{
                    display: 'inline-block', width: 2, height: 14,
                    background: d.accent, marginLeft: 3, verticalAlign: 'middle',
                    animation: 'blink 1s step-end infinite',
                  }} />
                </p>
              </div>
            ) : (
              /* Placeholder while waiting for first chunk */
              <div style={{
                background: d.navy, borderRadius: 14, padding: '18px 22px', opacity: 0.6,
              }}>
                <div style={{
                  fontFamily: d.mono, fontSize: 9, fontWeight: 700,
                  color: 'rgba(255,255,255,0.28)', letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const, marginBottom: 12,
                }}>
                  ▸ Podgląd na żywo
                </div>
                <div style={{
                  height: 14, background: 'rgba(255,255,255,0.07)', borderRadius: 4,
                  width: '80%', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                <div style={{
                  height: 14, background: 'rgba(255,255,255,0.07)', borderRadius: 4,
                  width: '60%', animation: 'pulse 1.5s ease-in-out infinite 0.3s',
                }} />
              </div>
            )}
          </div>
        )}

        {/* ── DONE ── */}
        {state === 'done' && result && (
          <div>
            {/* Stats strip */}
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${d.line}` }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <StatCard value={fmtTime(result.duration)} label="Czas nagrania" accent />
                <StatCard value={result.segments.length.toString()} label="Segmenty" />
                <StatCard value={`≈ ${wordCount(result.transcript).toLocaleString('pl')}`} label="Słowa" />
                <StatCard value={langLabel(result.language)} label="Język" />
                {result.chunks > 1 && <StatCard value={`${result.chunks}×`} label="Fragmenty" />}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={13} color={d.good} />
                <span style={{ fontFamily: d.mono, fontSize: 11, color: d.good, fontWeight: 600 }}>
                  Transkrypt gotowy
                </span>
                <span style={{ fontFamily: d.mono, fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>
                  · {fileName}
                  {fileSize > 0 && ` · ${bytesLabel(fileSize)}`}
                  {result.chunks > 1 && ` · ${result.chunks} fragmenty`}
                </span>
              </div>
            </div>

            {/* View toggle + actions */}
            <div style={{
              padding: '14px 28px', borderBottom: `1px solid ${d.line}`,
              background: d.soft, display: 'flex', alignItems: 'center',
              gap: 12, justifyContent: 'space-between',
            }}>
              <div style={{
                display: 'flex', gap: 2, background: d.paper,
                border: `1px solid ${d.line}`, borderRadius: 8, padding: 3,
              }}>
                {(['timestamps', 'clean'] as ViewMode[]).map(mode => (
                  <button key={mode} onClick={() => setViewMode(mode)} style={{
                    padding: '5px 14px', borderRadius: 6, border: 'none',
                    background: viewMode === mode ? d.navy : 'transparent',
                    color: viewMode === mode ? '#fff' : d.steel,
                    fontFamily: d.sans, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}>
                    {mode === 'timestamps' ? '⏱ Timestamps' : '☰ Czysty tekst'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copy} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
                  background: copied ? d.goodBg : d.accent,
                  color: copied ? d.good : '#fff',
                  border: copied ? `1px solid rgba(22,163,74,0.3)` : 'none',
                  borderRadius: 8, fontFamily: d.sans, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: copied ? 'none' : '0 1px 4px rgba(37,99,235,0.3)',
                }}>
                  <Copy size={13} />
                  {copied ? 'Skopiowano!' : 'Kopiuj'}
                </button>
                <button onClick={download} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
                  background: 'none', border: `1px solid ${d.line}`, borderRadius: 8,
                  fontFamily: d.sans, fontSize: 12, fontWeight: 600, color: d.steel, cursor: 'pointer',
                }}>
                  <Download size={13} />
                  .txt
                </button>
              </div>
            </div>

            {/* Transcript body */}
            <div style={{ padding: '0 28px', maxHeight: 520, overflowY: 'auto' }}>
              {viewMode === 'timestamps' ? (
                <div>
                  {result.segments.map((seg, i) => <SegmentRow key={i} seg={seg} />)}
                  <div style={{ height: 20 }} />
                </div>
              ) : (
                <textarea readOnly value={result.transcript} style={{
                  width: '100%', minHeight: 400, padding: '20px 0',
                  background: 'transparent', border: 'none',
                  fontFamily: d.sans, fontSize: 14.5, color: d.navy, lineHeight: 1.75,
                  resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const,
                }} />
              )}
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {state === 'error' && (
          <div style={{
            padding: '64px 28px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertCircle size={24} color={d.err} />
            </div>
            <div>
              <div style={{
                fontFamily: d.sans, fontSize: 16, fontWeight: 700, color: d.navy, marginBottom: 10,
              }}>
                Nie udało się przetworzyć nagrania
              </div>
              <div style={{
                fontFamily: d.mono, fontSize: 12, color: d.err, lineHeight: 1.6,
                maxWidth: 480, background: 'rgba(220,38,38,0.05)',
                border: '1px solid rgba(220,38,38,0.12)', borderRadius: 8, padding: '10px 16px',
              }}>
                {error}
              </div>
            </div>
            <button onClick={reset} style={{
              padding: '10px 28px', background: d.navy, color: '#fff', border: 'none',
              borderRadius: 10, fontFamily: d.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              Spróbuj ponownie
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slide   { 0% { transform: translateX(-200%); } 100% { transform: translateX(400%); } }
        @keyframes blink   { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulse   { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>
    </div>
  )
}
