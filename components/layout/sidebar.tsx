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
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WeatherData } from '@/app/api/weather/route'

// ── Sidebar palette (dark navy, independent of page tokens) ────────

const s = {
  bg: '#0a0e1a',
  bgHover: 'rgba(255,255,255,0.04)',
  bgActive: 'rgba(59,130,246,0.12)',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.1)',
  blue: '#3b82f6',
  blueDim: 'rgba(59,130,246,0.5)',
  white: '#f1f5f9',
  secondary: '#64748b',
  muted: '#334155',
  mono: '"Geist Mono", "Fira Code", monospace',
  sans: '"Geist", -apple-system, BlinkMacSystemFont, sans-serif',
}

// ── Nav items ──────────────────────────────────────────────────────

const NAV = [
  {
    section: 'Sprzedaż',
    items: [
      { href: '/agenci', label: 'Agenci AI', icon: Bot },
    ],
  },
  {
    section: 'System',
    items: [
      { href: '/workspace', label: 'Workspace', icon: FolderOpen },
    ],
  },
]

// ── Hooks ──────────────────────────────────────────────────────────

function useTime() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(
        now.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })
      )
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
    } catch {
      // silent
    }
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
  const color = '#94a3b8'
  if (d.includes('thunder') || d.includes('burz')) return <CloudLightning size={size} color="#f59e0b" />
  if (d.includes('snow') || d.includes('śnieg')) return <CloudSnow size={size} color="#93c5fd" />
  if (d.includes('rain') || d.includes('deszcz') || d.includes('drizzle') || d.includes('mżawk')) return <CloudRain size={size} color={color} />
  if (d.includes('cloud') || d.includes('pochmurn') || d.includes('chmur') || d.includes('overcast')) return <Cloud size={size} color={color} />
  if (d.includes('clear') || d.includes('bezchmurn') || d.includes('sunny') || d.includes('słonecz')) return <Sun size={size} color="#fbbf24" />
  if (d.includes('wind') || d.includes('wiatr') || d.includes('breezy')) return <Wind size={size} color={color} />
  return <Cloud size={size} color={color} />
}

// ── Nav item ───────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string
  label: string
  icon: React.ElementType
  isActive: boolean
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ position: 'relative' }}>
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            style={{
              position: 'absolute',
              inset: 0,
              background: s.bgActive,
              borderRadius: 6,
              border: `1px solid rgba(59,130,246,0.2)`,
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          />
        )}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '7px 10px',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'background 0.12s',
          }}
          onMouseEnter={(e) => {
            if (!isActive) (e.currentTarget as HTMLDivElement).style.background = s.bgHover
          }}
          onMouseLeave={(e) => {
            if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
          }}
        >
          <Icon
            size={14}
            color={isActive ? s.blue : s.secondary}
            style={{ flexShrink: 0, transition: 'color 0.12s' }}
          />
          <span
            style={{
              fontFamily: s.sans,
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? s.white : s.secondary,
              transition: 'color 0.12s',
              letterSpacing: '-0.01em',
            }}
          >
            {label}
          </span>
          {isActive && (
            <span
              style={{
                marginLeft: 'auto',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: s.blue,
                flexShrink: 0,
              }}
            />
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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: s.bg,
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          padding: '20px 16px 18px',
          borderBottom: `1px solid ${s.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
            flexShrink: 0,
          }}
        >
          <Zap size={14} color="#fff" strokeWidth={2.5} />
        </div>
        <div>
          <div
            style={{
              fontFamily: s.sans,
              fontSize: '14px',
              fontWeight: 800,
              color: s.white,
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            Autorise
          </div>
          <div
            style={{
              fontFamily: s.mono,
              fontSize: '8px',
              color: s.muted,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginTop: 3,
            }}
          >
            Command Center
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav
        style={{
          flex: 1,
          padding: '14px 8px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
        }}
      >
        {NAV.map((section) => (
          <div key={section.section}>
            <div
              style={{
                fontFamily: s.mono,
                fontSize: '9px',
                fontWeight: 700,
                color: s.muted,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '0 10px',
                marginBottom: 5,
              }}
            >
              {section.section}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={pathname.startsWith(item.href)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div
        style={{
          padding: '14px 14px 16px',
          borderTop: `1px solid ${s.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid rgba(59,130,246,0.3)`,
            }}
          >
            <span
              style={{
                fontFamily: s.mono,
                fontSize: '10px',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '0.02em',
              }}
            >
              MR
            </span>
          </div>
          <div>
            <div
              style={{
                fontFamily: s.sans,
                fontSize: '12px',
                fontWeight: 600,
                color: s.white,
                lineHeight: 1,
              }}
            >
              Michał Roth
            </div>
            <div
              style={{
                fontFamily: s.mono,
                fontSize: '9px',
                color: s.muted,
                letterSpacing: '0.03em',
                marginTop: 3,
              }}
            >
              Autorise · Founder
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: s.border }} />

        {/* Clock */}
        <div>
          <div
            style={{
              fontFamily: s.mono,
              fontSize: '20px',
              fontWeight: 700,
              color: s.white,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {time}
          </div>
          <div
            style={{
              fontFamily: s.sans,
              fontSize: '11px',
              color: s.muted,
              marginTop: 4,
              letterSpacing: '0.01em',
            }}
          >
            {date}
          </div>
        </div>

        {/* Weather */}
        {weather ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${s.border}`,
              borderRadius: 7,
            }}
          >
            <WeatherIcon description={weather.description} size={14} />
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span
                  style={{
                    fontFamily: s.mono,
                    fontSize: '14px',
                    fontWeight: 700,
                    color: s.white,
                    lineHeight: 1,
                  }}
                >
                  {weather.temp}°
                </span>
                <span style={{ fontFamily: s.sans, fontSize: '10px', color: s.muted }}>
                  /{weather.feels_like}° odcz.
                </span>
              </div>
              <div
                style={{
                  fontFamily: s.sans,
                  fontSize: '10px',
                  color: s.secondary,
                  marginTop: 2,
                  lineHeight: 1,
                }}
              >
                {weather.description}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${s.border}`,
              borderRadius: 7,
            }}
          >
            <Cloud size={12} color={s.muted} />
            <span style={{ fontFamily: s.sans, fontSize: '10px', color: s.muted }}>
              Ładowanie pogody...
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Export ─────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <>
      {/* Desktop */}
      <aside
        className="sidebar-desktop"
        style={{
          width: 216,
          minWidth: 216,
          background: s.bg,
          borderRight: `1px solid ${s.border}`,
          height: '100vh',
          position: 'sticky',
          top: 0,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile trigger */}
      <button
        className="sidebar-mobile-trigger"
        onClick={() => setMobileOpen(true)}
        style={{
          display: 'none',
          position: 'fixed',
          top: 14,
          left: 14,
          zIndex: 200,
          width: 36,
          height: 36,
          borderRadius: 8,
          background: s.bg,
          border: `1px solid ${s.border}`,
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: s.secondary,
        }}
      >
        <Menu size={16} />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 250,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
              }}
            />
            <motion.div
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              style={{
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                width: 240,
                zIndex: 260,
                background: s.bg,
                borderRight: `1px solid ${s.border}`,
                boxShadow: '6px 0 32px rgba(0,0,0,0.4)',
              }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${s.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: s.secondary,
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
