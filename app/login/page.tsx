'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, Lock, Loader2, Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  useEffect(() => { setError('') }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (json.success) {
        router.push(params.get('from') ?? '/agenci')
        router.refresh()
      } else {
        setError(json.error ?? 'Błąd logowania')
        setPassword('')
      }
    } catch {
      setError('Błąd połączenia')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 16 }}>
        <label style={{
          display: 'block', fontSize: '12px', fontWeight: 600, color: '#566a8a',
          marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Hasło dostępu
        </label>
        <div style={{ position: 'relative' }}>
          <Lock size={14} color="#334155" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoFocus
            style={{
              width: '100%', padding: '12px 40px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: error ? '1px solid rgba(220,38,38,0.5)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, fontFamily: '"Geist Mono", monospace',
              fontSize: '15px', color: '#f0f4ff', outline: 'none',
              transition: 'border-color 0.15s', letterSpacing: '0.12em',
            }}
            onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)' }}
            onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#334155',
              display: 'flex', alignItems: 'center', padding: 2,
            }}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {error && (
          <div style={{ fontSize: '12px', color: '#f87171', marginTop: 8 }}>{error}</div>
        )}
      </div>

      <button
        type="submit"
        disabled={!password || loading}
        style={{
          width: '100%', padding: '12px',
          background: password && !loading ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'rgba(255,255,255,0.05)',
          color: password && !loading ? '#fff' : '#334155',
          border: 'none', borderRadius: 10,
          fontFamily: '"Geist", sans-serif', fontSize: '14px', fontWeight: 600,
          cursor: password && !loading ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.15s',
          boxShadow: password && !loading ? '0 2px 12px rgba(37,99,235,0.35)' : 'none',
        }}
      >
        {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
        {loading ? 'Logowanie...' : 'Wejdź'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Geist", -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 360, padding: '0 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(37,99,235,0.5)', marginBottom: 16,
          }}>
            <Zap size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#f0f4ff', letterSpacing: '-0.04em', lineHeight: 1 }}>
            Autorise
          </div>
          <div style={{ fontSize: '12px', color: '#566a8a', marginTop: 6, letterSpacing: '0.04em' }}>
            Command Center
          </div>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
