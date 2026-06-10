'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
  Bot,
  FolderOpen,
  Menu,
  X,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Zap,
  Wind,
  PhoneCall,
  FileText,
  Megaphone,
  BarChart2,
  BookOpen,
  Microscope,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WeatherData } from '@/app/api/weather/route'

// ── Palette ────────────────────────────────────────────────────────

const s = {
  bg: '#0a0f1e',
  bgHover: 'rgba(255,255,255,0.045)',
  bgActive: 'rgba(59,130,246,0.14)',
  border: 'rgba(255,255,255,0.07)',
  blue: '#3b82f6',
  blueDim: 'rgba(59,130,246,0.4)',
  white: '#f0f4ff',
  secondary: '#566a8a',
  muted: '#2a3650',
  mono: '"Geist Mono", "Fira Code", monospace',
  sans: '"Geist", -apple-system, BlinkMacSystemFont, sans-serif',
}

// ── Sales pipeline stages ──────────────────────────────────────────

const SALES_STAGES = [
  { label: 'Kwalifikacja', icon: PhoneCall, step: 1 },
  { label: 'Discovery', icon: FileText, step: 2 },
  { label: 'Oferta', icon: Megaphone, step: 3 },
  { label: 'Analiza', icon: BarChart2, step: 4 },
  { label: 'Wiedza', icon: BookOpen, step: 5 },
  { label: 'Wywiad', icon: Microscope, step: 6 },
]

// ── Nav ────────────────────────────────────────────────────────────

const NAV_BOTTOM = [
  { href: '/workspace', label: 'Workspace', icon: FolderOpen },
]

// ── Hooks ──────────────────────────────────────────────────────────

function useTime() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'short' }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return { time, date }
}

function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/weather')
      const data = await res.json()
      if (data.success) setWeather(data.weather)
    } catch { /* silent */ }
  }, [])
  useEffect(() => {
    load()
    const id = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])
  return weather
}

// ── Weather icon ───────────────────────────────────────────────────

function WeatherIcon({ description, size = 13 }: { description?: string; size?: number }) {
  const d = description?.toLowerCase() ?? ''
  const dim = '#4a6080'
  if (d.includes('thunder') || d.includes('burz')) return <CloudLightning size={size} color="#f59e0b" />
  if (d.includes('snow') || d.includes('śnieg')) return <CloudSnow size={size} color="#93c5fd" />
  if (d.includes('rain') || d.includes('deszcz') || d.includes('drizzle')) return <CloudRain size={size} color={dim} />
  if (d.includes('cloud') || d.includes('pochmurn') || d.includes('chmur') || d.includes('overcast')) return <Cloud size={size} color={dim} />
  if (d.includes('clear') || d.includes('bezchmurn') || d.includes('sunny') || d.includes('słonecz')) return <Sun size={size} color="#fbbf24" />
  if (d.includes('wind') || d.includes('wiatr')) return <Wind size={size} color={dim} />
  return <Cloud size={size} color={dim} />
}

// ── Nav item ───────────────────────────────────────────────────────

function NavItem({ href, label, icon: Icon, isActive }: {
  href: string; label: string; icon: React.ElementType; isActive: boolean
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ position: 'relative' }}>
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            style={{
              position: 'absolute', inset: 0,
              background: s.bgActive,
              borderRadius: 8,
              border: `1px solid rgba(59,130,246,0.18)`,
            }}
            transition={{ type: 'spring', stiffness: 480, damping: 38 }}
          />
        )}
        <div
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = s.bgHover }}
          onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
        >
          <Icon size={15} color={isActive ? s.blue : s.secondary} style={{ flexShrink: 0 }} />
          <span style={{
            fontFamily: s.sans, fontSize: '14px', fontWeight: isActive ? 600 : 400,
            color: isActive ? s.white : s.secondary, flex: 1,
          }}>
            {label}
          </span>
          {isActive && (
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.blue, flexShrink: 0 }} />
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Sidebar content ────────────────────────────────────────────────

function SidebarContent({ pathname }: { pathname: string }) {
  const { time, date } = useTime()
  const weather = useWeather()
  const isAgentsActive = pathname.startsWith('/agenci')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: s.bg }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '22px 18px 20px',
        borderBottom: `1px solid ${s.border}`,
        display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(37,99,235,0.45)', flexShrink: 0,
        }}>
          <Zap size={15} color="#fff" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{
            fontFamily: s.sans, fontSize: '16px', fontWeight: 800,
            color: s.white, letterSpacing: '-0.04em', lineHeight: 1,
          }}>
            Autorise
          </div>
          <div style={{
            fontFamily: s.mono, fontSize: '9px', color: s.secondary,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4,
          }}>
            Command Center
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: '16px 10px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>

        {/* Sales pipeline section */}
        <div style={{
          fontFamily: s.mono, fontSize: '9px', fontWeight: 700, color: s.muted,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '0 10px', marginBottom: 8,
        }}>
          Proces sprzedaży
        </div>

        {/* Agents hub */}
        <Link href="/agenci" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ position: 'relative' }}>
            {isAgentsActive && (
              <motion.div
                layoutId="nav-pill"
                style={{
                  position: 'absolute', inset: 0, background: s.bgActive,
                  borderRadius: 8, border: `1px solid rgba(59,130,246,0.18)`,
                }}
                transition={{ type: 'spring', stiffness: 480, damping: 38 }}
              />
            )}
            <div
              style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { if (!isAgentsActive) (e.currentTarget as HTMLDivElement).style.background = s.bgHover }}
              onMouseLeave={(e) => { if (!isAgentsActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <Bot size={15} color={isAgentsActive ? s.blue : s.secondary} style={{ flexShrink: 0 }} />
              <span style={{
                fontFamily: s.sans, fontSize: '14px', fontWeight: isAgentsActive ? 600 : 400,
                color: isAgentsActive ? s.white : s.secondary, flex: 1,
              }}>
                Agenci AI
              </span>
              {isAgentsActive && (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.blue, flexShrink: 0 }} />
              )}
            </div>
          </div>
        </Link>

        {/* Pipeline stages — always visible */}
        <div style={{ marginTop: 4, marginBottom: 4, paddingLeft: 6 }}>
          {SALES_STAGES.map((stage) => {
            const Icon = stage.icon
            return (
              <Link key={stage.step} href={`/agenci#agent${stage.step}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = s.bgHover }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <span style={{
                    fontFamily: s.mono, fontSize: '9px', fontWeight: 700,
                    color: s.muted, width: 14, textAlign: 'right', flexShrink: 0,
                  }}>
                    {stage.step}
                  </span>
                  <Icon size={12} color={s.secondary} style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: s.sans, fontSize: '12px', color: s.secondary, lineHeight: 1 }}>
                    {stage.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: s.border, margin: '8px 0' }} />

        {/* System section */}
        <div style={{
          fontFamily: s.mono, fontSize: '9px', fontWeight: 700, color: s.muted,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '0 10px', marginBottom: 6,
        }}>
          System
        </div>

        {NAV_BOTTOM.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      {/* ── Footer ── */}
      <div style={{
        padding: '14px 14px 18px',
        borderTop: `1px solid ${s.border}`,
        display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0,
      }}>

        {/* Clock */}
        <div>
          <div style={{
            fontFamily: s.mono, fontSize: '22px', fontWeight: 700,
            color: s.white, letterSpacing: '-0.03em', lineHeight: 1,
          }}>
            {time}
          </div>
          <div style={{
            fontFamily: s.sans, fontSize: '11px', color: s.secondary, marginTop: 5,
            textTransform: 'capitalize',
          }}>
            {date}
          </div>
        </div>

        {/* Weather */}
        {weather ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.025)',
            border: `1px solid ${s.border}`, borderRadius: 8,
          }}>
            <WeatherIcon description={weather.description} size={14} />
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: s.mono, fontSize: '14px', fontWeight: 700, color: s.white, lineHeight: 1 }}>
                  {weather.temp}°
                </span>
                <span style={{ fontFamily: s.sans, fontSize: '10px', color: s.secondary }}>
                  / {weather.feels_like}° odcz.
                </span>
              </div>
              <div style={{ fontFamily: s.sans, fontSize: '10px', color: s.secondary, marginTop: 2, lineHeight: 1 }}>
                {weather.description}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px',
            background: 'rgba(255,255,255,0.02)', border: `1px solid ${s.border}`, borderRadius: 8,
          }}>
            <Cloud size={12} color={s.muted} />
            <span style={{ fontFamily: s.sans, fontSize: '10px', color: s.muted }}>Ładowanie pogody...</span>
          </div>
        )}

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, border: `1px solid rgba(59,130,246,0.25)`,
          }}>
            <span style={{ fontFamily: s.mono, fontSize: '10px', fontWeight: 700, color: '#93c5fd' }}>
              MR
            </span>
          </div>
          <div>
            <div style={{ fontFamily: s.sans, fontSize: '13px', fontWeight: 600, color: s.white, lineHeight: 1 }}>
              Michał Roth
            </div>
            <div style={{ fontFamily: s.mono, fontSize: '9px', color: s.secondary, letterSpacing: '0.04em', marginTop: 3 }}>
              Autorise · Founder
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Export ─────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <>
      <aside
        className="sidebar-desktop"
        style={{
          width: 224, minWidth: 224, background: s.bg,
          borderRight: `1px solid ${s.border}`,
          height: '100vh', position: 'sticky', top: 0,
          overflow: 'hidden', flexShrink: 0,
        }}
      >
        <SidebarContent pathname={pathname} />
      </aside>

      <button
        className="sidebar-mobile-trigger"
        onClick={() => setMobileOpen(true)}
        style={{
          display: 'none', position: 'fixed', top: 14, left: 14, zIndex: 200,
          width: 36, height: 36, borderRadius: 8, background: s.bg,
          border: `1px solid ${s.border}`,
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: s.secondary,
        }}
      >
        <Menu size={16} />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              style={{
                position: 'fixed', left: 0, top: 0, bottom: 0, width: 240,
                zIndex: 260, background: s.bg, borderRight: `1px solid ${s.border}`,
                boxShadow: '6px 0 32px rgba(0,0,0,0.5)',
              }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  position: 'absolute', top: 14, right: 14, width: 28, height: 28,
                  borderRadius: 6, background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${s.border}`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: s.secondary,
                }}
              >
                <X size={13} />
              </button>
              <SidebarContent pathname={pathname} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile-trigger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
