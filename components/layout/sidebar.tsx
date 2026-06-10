'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Bot, FolderTree, Zap, Menu, X, Cloud } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { tokens } from '@/lib/tokens'
import type { WeatherData } from '@/app/api/weather/route'

const NAV_ITEMS = [
  { href: '/agenci', label: 'Agenci AI', icon: Bot, badge: null },
  { href: '/workspace', label: 'Workspace', icon: FolderTree, badge: 'live' },
]

const NAV_SECTIONS = [
  { label: 'Sprzedaż', items: NAV_ITEMS.slice(0, 1) },
  { label: 'System', items: NAV_ITEMS.slice(1) },
]

function useTime() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(now.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return { time, date }
}

function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null)

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/weather')
      const data = await res.json()
      if (data.success) setWeather(data.weather)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetch_()
    const id = setInterval(fetch_, 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetch_])

  return weather
}

function NavItem({ href, label, icon: Icon, badge, isActive }: {
  href: string; label: string; icon: React.ElementType
  badge: string | null; isActive: boolean
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ position: 'relative' }}>
        {isActive && (
          <motion.div
            layoutId="sidebar-pill"
            style={{
              position: 'absolute', inset: 0,
              background: tokens.accent.muted,
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.accent.mutedBorder}`,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          />
        )}
        <div
          style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '7px 11px', borderRadius: tokens.radius.md,
            color: isActive ? tokens.accent.primary : tokens.text.secondary,
            fontFamily: tokens.font.sans, fontSize: '13px',
            fontWeight: isActive ? 600 : 400,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!isActive) (e.currentTarget as HTMLDivElement).style.color = tokens.text.primary
          }}
          onMouseLeave={(e) => {
            if (!isActive) (e.currentTarget as HTMLDivElement).style.color = tokens.text.secondary
          }}
        >
          <Icon size={14} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{label}</span>
          {badge && (
            <span style={{
              fontSize: '9px', fontFamily: tokens.font.mono, fontWeight: 700,
              color: tokens.status.success, letterSpacing: '0.05em',
              padding: '1px 5px', borderRadius: '999px',
              background: tokens.status.successMuted,
              border: `1px solid rgba(22,163,74,0.2)`,
              textTransform: 'uppercase' as const,
            }}>
              {badge}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function SidebarContent({ pathname }: { pathname: string }) {
  const { time, date } = useTime()
  const weather = useWeather()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{
        padding: '18px 16px 16px',
        borderBottom: `1px solid ${tokens.border.default}`,
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32,
          background: tokens.accent.primary,
          borderRadius: tokens.radius.lg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
          flexShrink: 0,
        }}>
          <Zap size={16} color="#fff" />
        </div>
        <div>
          <div style={{
            fontFamily: tokens.font.sans, fontSize: '14px', fontWeight: 800,
            color: tokens.text.primary, letterSpacing: '-0.02em',
          }}>
            Autorise
          </div>
          <div style={{
            fontFamily: tokens.font.mono, fontSize: '8px',
            color: tokens.text.muted, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Command Center
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div style={{
              fontFamily: tokens.font.mono, fontSize: '9px', fontWeight: 700,
              color: tokens.text.muted, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '0 11px', marginBottom: 4,
            }}>
              {section.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  isActive={pathname.startsWith(item.href)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 14px 14px',
        borderTop: `1px solid ${tokens.border.default}`,
        display: 'flex', flexDirection: 'column', gap: 10,
        flexShrink: 0,
      }}>
        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: tokens.font.sans, fontSize: '11px', fontWeight: 700, color: '#fff' }}>
              MR
            </span>
          </div>
          <div>
            <div style={{ fontFamily: tokens.font.sans, fontSize: '12px', fontWeight: 600, color: tokens.text.primary }}>
              Michał Roth
            </div>
            <div style={{ fontFamily: tokens.font.mono, fontSize: '9px', color: tokens.text.muted, letterSpacing: '0.02em' }}>
              Autorise · Founder
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: tokens.border.default }} />

        {/* Time + Weather */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Clock */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontFamily: tokens.font.mono, fontSize: '18px', fontWeight: 700,
              color: tokens.text.primary, letterSpacing: '-0.02em', lineHeight: 1,
            }}>
              {time}
            </span>
          </div>
          <div style={{ fontFamily: tokens.font.sans, fontSize: '11px', color: tokens.text.muted }}>
            {date}
          </div>

          {/* Weather */}
          {weather ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 9px',
              background: tokens.bg.elevated,
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.border.default}`,
            }}>
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{weather.emoji}</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{
                    fontFamily: tokens.font.mono, fontSize: '14px', fontWeight: 700,
                    color: tokens.text.primary, lineHeight: 1,
                  }}>
                    {weather.temp}°C
                  </span>
                  <span style={{ fontFamily: tokens.font.sans, fontSize: '10px', color: tokens.text.muted }}>
                    odczuwalne {weather.feels_like}°
                  </span>
                </div>
                <div style={{ fontFamily: tokens.font.sans, fontSize: '10px', color: tokens.text.secondary, marginTop: 1 }}>
                  {weather.description} · {weather.city}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 9px', background: tokens.bg.elevated,
              borderRadius: tokens.radius.md, border: `1px solid ${tokens.border.default}`,
            }}>
              <Cloud size={13} color={tokens.text.muted} />
              <span style={{ fontFamily: tokens.font.sans, fontSize: '10px', color: tokens.text.muted }}>
                Ładowanie pogody...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on navigation
  useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="sidebar-desktop"
        style={{
          width: 220, minWidth: 220,
          background: tokens.bg.surface,
          borderRight: `1px solid ${tokens.border.default}`,
          height: '100vh', position: 'sticky', top: 0,
          overflow: 'hidden', flexShrink: 0,
        }}
      >
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile hamburger button */}
      <button
        className="sidebar-mobile-trigger"
        onClick={() => setMobileOpen(true)}
        style={{
          display: 'none', // shown via CSS media query
          position: 'fixed', top: 14, left: 14, zIndex: 200,
          width: 36, height: 36, borderRadius: tokens.radius.md,
          background: tokens.bg.surface,
          border: `1px solid ${tokens.border.default}`,
          boxShadow: tokens.shadow.elevated,
          alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: tokens.text.primary,
        }}
      >
        <Menu size={16} />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 250,
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
              }}
            />
            <motion.div
              initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              style={{
                position: 'fixed', left: 0, top: 0, bottom: 0, width: 240, zIndex: 260,
                background: tokens.bg.surface,
                borderRight: `1px solid ${tokens.border.default}`,
                boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
              }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  position: 'absolute', top: 14, right: 14,
                  width: 28, height: 28, borderRadius: tokens.radius.sm,
                  background: tokens.bg.elevated, border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: tokens.text.muted,
                }}
              >
                <X size={14} />
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
