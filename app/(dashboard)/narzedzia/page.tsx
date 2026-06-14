'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, Upload, Loader2, CheckCircle, AlertCircle, Copy, Download, X, Wrench } from 'lucide-react'
import { tokens } from '@/lib/tokens'

type State = 'idle' | 'processing' | 'done' | 'error'

const t = tokens

function bytesToMb(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1)
}

export default function NarzedziaPage() {
  const [state, setState] = useState<State>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setFileSize(file.size)
    setState('processing')
    setTranscript('')
    setError('')

    const form = new FormData()
    form.append('audio', file)

    try {
      const res = await fetch('/api/tools/transcribe', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? `Błąd serwera (${res.status})`)
        setState('error')
      } else {
        setTranscript(json.transcript)
        setState('done')
      }
    } catch {
      setError('Błąd połączenia z serwerem.')
      setState('error')
    }
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const downloadTxt = () => {
    const base = fileName.replace(/\.[^.]+$/, '') || 'transkrypt'
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${base}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setState('idle')
    setTranscript('')
    setError('')
    setFileName('')
    setFileSize(0)
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 860, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: t.accent.muted,
            border: `1px solid ${t.accent.mutedBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Wrench size={17} color={t.accent.primary} />
          </div>
          <h1 style={{
            fontFamily: t.font.sans,
            fontSize: 26,
            fontWeight: 800,
            color: t.text.primary,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            margin: 0,
          }}>
            Narzędzia
          </h1>
        </div>
        <p style={{
          fontFamily: t.font.sans,
          fontSize: 14,
          color: t.text.muted,
          margin: 0,
          marginLeft: 48,
        }}>
          Utilities pomocnicze dla procesu sprzedaży.
        </p>
      </div>

      {/* ── Tool card ── */}
      <div style={{
        background: t.bg.primary,
        border: `1px solid ${t.border.default}`,
        borderRadius: t.radius.xl,
        boxShadow: t.shadow.card,
        overflow: 'hidden',
      }}>

        {/* Card header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: `1px solid ${t.border.subtle}`,
          display: 'flex', alignItems: 'center', gap: 12,
          background: t.bg.surface,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: t.accent.muted,
            border: `1px solid ${t.accent.mutedBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Mic size={15} color={t.accent.primary} />
          </div>
          <div>
            <div style={{
              fontFamily: t.font.sans,
              fontSize: 15,
              fontWeight: 700,
              color: t.text.primary,
              lineHeight: 1,
            }}>
              Transkrypcja audio → tekst
            </div>
            <div style={{
              fontFamily: t.font.sans,
              fontSize: 12,
              color: t.text.muted,
              marginTop: 4,
            }}>
              mp3, m4a, wav · do 20 MB · Gemini 1.5 Flash
            </div>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: '28px 24px' }}>

          {/* IDLE — dropzone */}
          {state === 'idle' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? t.accent.primary : t.border.strong}`,
                borderRadius: t.radius.lg,
                padding: '48px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                background: isDragOver ? t.accent.muted : t.bg.surface,
                userSelect: 'none',
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: isDragOver ? t.accent.muted : t.bg.elevated,
                border: `1px solid ${isDragOver ? t.accent.mutedBorder : t.border.default}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                <Upload size={22} color={isDragOver ? t.accent.primary : t.text.muted} />
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: t.font.sans,
                  fontSize: 15,
                  fontWeight: 600,
                  color: isDragOver ? t.accent.primary : t.text.primary,
                  marginBottom: 5,
                }}>
                  Przeciągnij plik audio lub kliknij
                </div>
                <div style={{
                  fontFamily: t.font.sans,
                  fontSize: 13,
                  color: t.text.muted,
                }}>
                  mp3, m4a, wav, ogg · maksymalnie 20 MB
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                style={{
                  padding: '9px 22px',
                  background: t.accent.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: t.radius.md,
                  fontFamily: t.font.sans,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
              >
                Wybierz plik
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.m4a,.wav,.ogg,.webm"
                style={{ display: 'none' }}
                onChange={onFileChange}
              />
            </div>
          )}

          {/* PROCESSING */}
          {state === 'processing' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              padding: '48px 24px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: t.accent.muted,
                border: `1px solid ${t.accent.mutedBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader2
                  size={24}
                  color={t.accent.primary}
                  style={{ animation: 'spin 1s linear infinite' }}
                />
              </div>
              <div>
                <div style={{
                  fontFamily: t.font.sans,
                  fontSize: 16,
                  fontWeight: 700,
                  color: t.text.primary,
                  marginBottom: 6,
                }}>
                  Transkrybuję...
                </div>
                <div style={{
                  fontFamily: t.font.sans,
                  fontSize: 13,
                  color: t.text.muted,
                  lineHeight: 1.6,
                }}>
                  {fileName && (
                    <span style={{ color: t.text.secondary }}>{fileName} ({bytesToMb(fileSize)} MB)</span>
                  )}<br />
                  To może potrwać kilka minut dla dłuższych nagrań.
                </div>
              </div>
            </div>
          )}

          {/* DONE */}
          {state === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Result header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} color={t.status.success} />
                  <span style={{
                    fontFamily: t.font.sans,
                    fontSize: 14,
                    fontWeight: 600,
                    color: t.status.success,
                  }}>
                    Gotowe
                  </span>
                  {fileName && (
                    <span style={{
                      fontFamily: t.font.mono,
                      fontSize: 11,
                      color: t.text.muted,
                      padding: '2px 7px',
                      background: t.bg.elevated,
                      borderRadius: 4,
                    }}>
                      {fileName}
                    </span>
                  )}
                </div>
                <button
                  onClick={reset}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px',
                    background: 'none',
                    border: `1px solid ${t.border.default}`,
                    borderRadius: t.radius.sm,
                    fontFamily: t.font.sans,
                    fontSize: 12,
                    color: t.text.muted,
                    cursor: 'pointer',
                  }}
                >
                  <X size={11} />
                  Nowy plik
                </button>
              </div>

              {/* Textarea */}
              <textarea
                readOnly
                value={transcript}
                style={{
                  width: '100%',
                  minHeight: 320,
                  padding: '14px 16px',
                  background: t.bg.surface,
                  border: `1px solid ${t.border.default}`,
                  borderRadius: t.radius.md,
                  fontFamily: t.font.sans,
                  fontSize: 14,
                  color: t.text.primary,
                  lineHeight: 1.65,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={copyToClipboard}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 18px',
                    background: copied ? t.status.successMuted : t.accent.primary,
                    color: copied ? t.status.success : '#fff',
                    border: copied ? `1px solid rgba(22,163,74,0.3)` : 'none',
                    borderRadius: t.radius.md,
                    fontFamily: t.font.sans,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <Copy size={14} />
                  {copied ? 'Skopiowano!' : 'Kopiuj do schowka'}
                </button>

                <button
                  onClick={downloadTxt}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 18px',
                    background: 'none',
                    border: `1px solid ${t.border.strong}`,
                    borderRadius: t.radius.md,
                    fontFamily: t.font.sans,
                    fontSize: 13,
                    fontWeight: 500,
                    color: t.text.secondary,
                    cursor: 'pointer',
                  }}
                >
                  <Download size={14} />
                  Pobierz .txt
                </button>
              </div>
            </div>
          )}

          {/* ERROR */}
          {state === 'error' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              padding: '40px 24px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: t.status.errorMuted,
                border: `1px solid rgba(220,38,38,0.2)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertCircle size={22} color={t.status.error} />
              </div>
              <div>
                <div style={{
                  fontFamily: t.font.sans,
                  fontSize: 15,
                  fontWeight: 700,
                  color: t.text.primary,
                  marginBottom: 8,
                }}>
                  Błąd transkrypcji
                </div>
                <div style={{
                  fontFamily: t.font.sans,
                  fontSize: 13,
                  color: t.status.error,
                  lineHeight: 1.6,
                  maxWidth: 420,
                }}>
                  {error}
                </div>
              </div>
              <button
                onClick={reset}
                style={{
                  padding: '9px 22px',
                  background: t.accent.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: t.radius.md,
                  fontFamily: t.font.sans,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Spróbuj ponownie
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
