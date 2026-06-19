"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Calculator,
  CheckSquare,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Folder,
  Menu,
  Mic,
  Moon,
  Sparkles,
  Sun,
  Terminal,
  Users,
  Wind,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { WeatherData } from "@/app/api/weather/route";
import { useTheme } from "@/lib/theme";

const f = { system: "var(--font-system)", mono: "var(--font-mono)" };

// ── Nav structure ──────────────────────────────────────────────────

const NAV_SECTIONS: {
  label: string;
  items: { href: string; label: string; icon: React.ElementType; exact?: boolean }[];
}[] = [
  {
    label: "Agenci",
    items: [{ href: "/agenci", label: "Agenci AI", icon: Sparkles, exact: false }],
  },
  {
    label: "Workspace",
    items: [
      { href: "/workspace", label: "Pliki", icon: Folder },
      { href: "/zadania", label: "Zadania", icon: CheckSquare },
      { href: "/obszar-roboczy", label: "Obszar Roboczy", icon: Terminal },
    ],
  },
  {
    label: "Firma",
    items: [{ href: "/agencja", label: "Agencja", icon: Users }],
  },
  {
    label: "Narzędzia",
    items: [
      { href: "/narzedzia", label: "Transkrypcja", icon: Mic, exact: true },
      { href: "/narzedzia/kalkulator", label: "Kalkulator ROI", icon: Calculator },
    ],
  },
];

// ── Weather hook ───────────────────────────────────────────────────

function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/weather");
      const data = await res.json();
      if (data.success) setWeather(data.weather);
    } catch {
      /* silent */
    }
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);
  return weather;
}

// ── Analog Clock ───────────────────────────────────────────────────

function AnalogClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const SIZE = 114;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 48;

  if (!now) return <div style={{ width: SIZE, height: SIZE + 36, flexShrink: 0 }} />;

  const sec = now.getSeconds();
  const min = now.getMinutes();
  const hr = now.getHours() % 12;

  const secDeg = sec * 6;
  const minDeg = min * 6 + sec * 0.1;
  const hrDeg = hr * 30 + min * 0.5;

  function tip(deg: number, len: number): [number, number] {
    const rad = (deg - 90) * (Math.PI / 180);
    return [cx + Math.cos(rad) * len, cy + Math.sin(rad) * len];
  }

  const [hx, hy] = tip(hrDeg, 22);
  const [mx, my] = tip(minDeg, 32);
  const [sx, sy] = tip(secDeg, 38);
  const [stx, sty] = tip(secDeg + 180, 8);

  const timeStr = now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const arcR = R + 5;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={SIZE} height={SIZE} style={{ display: "block", overflow: "visible" }}>
        {/* Outer bezel */}
        <circle cx={cx} cy={cy} r={R + 6} fill="none" stroke="var(--border)" strokeWidth="1" />

        {/* Accent arc — top-right quarter (Porsche-style) */}
        <path
          d={`M ${cx} ${cy - R - 5} A ${arcR} ${arcR} 0 0 1 ${cx + arcR} ${cy}`}
          fill="none"
          stroke="#1a56ff"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.65"
        />

        {/* Glass face */}
        <circle cx={cx} cy={cy} r={R} fill="var(--glass)" />

        {/* 60 tick marks */}
        {Array.from({ length: 60 }, (_, i) => {
          const rad = ((i / 60) * 360 - 90) * (Math.PI / 180);
          const major = i % 5 === 0;
          const r1 = R - 1;
          const r2 = major ? R - 8 : R - 4;
          return (
            <line
              key={i}
              x1={cx + Math.cos(rad) * r1}
              y1={cy + Math.sin(rad) * r1}
              x2={cx + Math.cos(rad) * r2}
              y2={cy + Math.sin(rad) * r2}
              stroke={major ? "var(--text-secondary)" : "var(--border)"}
              strokeWidth={major ? 1.5 : 0.8}
              strokeLinecap="round"
            />
          );
        })}

        {/* Cardinal markers (12, 3, 6, 9) */}
        {[0, 90, 180, 270].map((deg) => {
          const rad = (deg - 90) * (Math.PI / 180);
          const mr = R - 12;
          return (
            <circle
              key={deg}
              cx={cx + Math.cos(rad) * mr}
              cy={cy + Math.sin(rad) * mr}
              r="2.2"
              fill="var(--text-primary)"
            />
          );
        })}

        {/* Hour hand */}
        <line
          x1={cx}
          y1={cy}
          x2={hx}
          y2={hy}
          stroke="var(--text-primary)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Minute hand */}
        <line
          x1={cx}
          y1={cy}
          x2={mx}
          y2={my}
          stroke="var(--text-primary)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Second hand + counterweight */}
        <line
          x1={stx}
          y1={sty}
          x2={sx}
          y2={sy}
          stroke="#1a56ff"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Center cap */}
        <circle cx={cx} cy={cy} r="3.5" fill="#1a56ff" />
        <circle cx={cx} cy={cy} r="1.5" fill="var(--bg-elevated)" />
      </svg>

      {/* Digital time */}
      <div
        style={{
          fontFamily: f.mono,
          fontSize: 13,
          fontWeight: 300,
          color: "var(--text-primary)",
          letterSpacing: "0.06em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {timeStr}
      </div>

      {/* Day + date */}
      <div
        style={{
          fontFamily: f.system,
          fontSize: 10,
          color: "var(--text-tertiary)",
          textTransform: "capitalize",
          letterSpacing: "-0.01em",
        }}
      >
        {dateStr}
      </div>
    </div>
  );
}

// ── Mini Calendar ──────────────────────────────────────────────────

function MiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const firstDow = new Date(year, month, 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1; // Mon-first
  const daysTotal = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysTotal; d++) cells.push(d);

  const monthLabel = now.toLocaleDateString("pl-PL", { month: "long" });

  return (
    <div>
      <div
        style={{
          fontFamily: f.system,
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          textAlign: "center",
          marginBottom: 6,
          textTransform: "capitalize",
        }}
      >
        {monthLabel}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 1 }}>
        {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => (
          <div
            key={d}
            style={{
              fontFamily: f.system,
              fontSize: 9,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textAlign: "center",
              paddingBottom: 3,
            }}
          >
            {d}
          </div>
        ))}

        {cells.map((d, i) => {
          const col = i % 7;
          const isWeekend = col >= 5;
          const isToday = d === today;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                aspectRatio: "1",
                fontFamily: f.mono,
                fontSize: 10,
                fontWeight: isToday ? 700 : 400,
                color: isToday
                  ? "#fff"
                  : !d
                    ? "transparent"
                    : isWeekend
                      ? "var(--text-tertiary)"
                      : "var(--text-secondary)",
                background: isToday ? "#1a56ff" : "transparent",
                borderRadius: "50%",
              }}
            >
              {d ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Weather icon ───────────────────────────────────────────────────

function WeatherIcon({ description, size = 15 }: { description?: string; size?: number }) {
  const d = description?.toLowerCase() ?? "";
  if (d.includes("burz")) return <CloudLightning size={size} color="#f59e0b" />;
  if (d.includes("śnieg")) return <CloudSnow size={size} color="#93c5fd" />;
  if (d.includes("deszcz") || d.includes("mżawka"))
    return <CloudRain size={size} color="#60a5fa" />;
  if (d.includes("zachm") || d.includes("chmur"))
    return <Cloud size={size} color="var(--text-secondary)" />;
  if (d.includes("bezchmurn") || d.includes("słonecz") || d.includes("przew"))
    return <Sun size={size} color="#fbbf24" />;
  if (d.includes("wiatr")) return <Wind size={size} color="var(--text-secondary)" />;
  return <Cloud size={size} color="var(--text-secondary)" />;
}

// ── Nav item ───────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <div style={{ position: "relative" }}>
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--bg-item-active)",
              borderRadius: 7,
            }}
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
          />
        )}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            borderRadius: 7,
            cursor: "pointer",
            background: !isActive && hovered ? "var(--bg-item-hover)" : "transparent",
            transition: "background 120ms ease",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Icon
            size={15}
            color={isActive ? "var(--text-on-active)" : "var(--text-secondary)"}
            strokeWidth={1.6}
            style={{ flexShrink: 0 }}
          />
          <span
            style={{
              fontFamily: f.system,
              fontSize: "13px",
              fontWeight: isActive ? 500 : 400,
              color: isActive ? "var(--text-on-active)" : "var(--text-secondary)",
              letterSpacing: "-0.01em",
              flex: 1,
            }}
          >
            {label}
          </span>
        </div>
      </div>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: f.system,
        fontSize: "10px",
        fontWeight: 600,
        color: "var(--text-tertiary)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: "0 10px",
        marginBottom: 2,
      }}
    >
      {children}
    </div>
  );
}

// ── User row ───────────────────────────────────────────────────────

function UserRow() {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "6px 8px",
        borderRadius: 8,
        cursor: "pointer",
        background: hovered ? "var(--bg-item-hover)" : "transparent",
        transition: "background 120ms ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          flexShrink: 0,
          background: "linear-gradient(135deg, #1a56ff 0%, #7c3aed 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 6px rgba(26,86,255,0.35)",
        }}
      >
        <span style={{ fontFamily: f.system, fontSize: "11px", fontWeight: 700, color: "#fff" }}>
          MR
        </span>
      </div>
      <div>
        <div
          style={{
            fontFamily: f.system,
            fontSize: "12.5px",
            fontWeight: 500,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Michał Roth
        </div>
        <div
          style={{
            fontFamily: f.mono,
            fontSize: "9px",
            color: "var(--text-tertiary)",
            marginTop: 3,
          }}
        >
          Autorise · Founder
        </div>
      </div>
    </div>
  );
}

// ── Sidebar content ────────────────────────────────────────────────

function SidebarContent({ pathname }: { pathname: string }) {
  const weather = useWeather();
  const { theme, toggleTheme } = useTheme();

  function isActive(href: string, exact?: boolean): boolean {
    if (exact) return pathname === href;
    if (href === "/agenci") return pathname === "/agenci" || pathname.startsWith("/agenci/");
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-sidebar)",
        backdropFilter: "blur(20px) saturate(200%)",
        WebkitBackdropFilter: "blur(20px) saturate(200%)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "16px 14px 14px",
          borderBottom: "1px solid var(--border-sidebar)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            flexShrink: 0,
            background: "#1a56ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 4px rgba(26,86,255,0.35)",
          }}
        >
          <span
            style={{
              fontFamily: f.system,
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "-0.03em",
            }}
          >
            A
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: f.system,
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            AUTORISE
          </div>
          <div
            style={{
              fontFamily: f.mono,
              fontSize: "9px",
              color: "var(--text-tertiary)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: 3,
            }}
          >
            DASHBOARD
          </div>
        </div>
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Tryb jasny" : "Tryb ciemny"}
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            flexShrink: 0,
            background: "var(--bg-item-hover)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 120ms ease",
            color: "var(--text-tertiary)",
          }}
        >
          {theme === "dark" ? (
            <Sun size={13} strokeWidth={1.8} />
          ) : (
            <Moon size={13} strokeWidth={1.8} />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: "10px 6px 8px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            <SectionLabel>{section.label}</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 4 }}>
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={isActive(item.href, item.exact)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "14px 14px 14px",
          borderTop: "1px solid var(--border-sidebar)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          flexShrink: 0,
        }}
      >
        {/* Analog clock */}
        <AnalogClock />

        {/* Separator */}
        <div style={{ height: 1, background: "var(--border)", margin: "0 2px" }} />

        {/* Mini calendar */}
        <MiniCalendar />

        {/* Weather card */}
        {weather && (
          <div
            style={{
              padding: "9px 11px",
              background: "var(--glass)",
              backdropFilter: "var(--glass-blur)",
              WebkitBackdropFilter: "var(--glass-blur)",
              border: "1px solid var(--glass-border)",
              borderRadius: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
              <WeatherIcon description={weather.description} size={15} />
              <span
                style={{
                  fontFamily: f.system,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {weather.temp}°C
              </span>
              <span
                style={{
                  fontFamily: f.system,
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  flex: 1,
                  textAlign: "right",
                }}
              >
                {weather.city}
              </span>
            </div>
            <div
              style={{
                fontFamily: f.system,
                fontSize: 12,
                color: "var(--text-tertiary)",
                marginBottom: 5,
              }}
            >
              {weather.description} · odczuw. {weather.feels_like}°
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: f.system,
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                }}
              >
                <Droplets size={10} />
                {weather.humidity}%
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: f.system,
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                }}
              >
                <Wind size={10} />
                {weather.wind} km/h
              </span>
            </div>
          </div>
        )}

        {/* User */}
        <Link href="/profil" style={{ textDecoration: "none", display: "block" }}>
          <UserRow />
        </Link>
      </div>
    </div>
  );
}

// ── Export ─────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <aside
        className="sidebar-desktop"
        style={{
          width: 210,
          minWidth: 210,
          borderRight: "1px solid var(--border-sidebar)",
          height: "100vh",
          position: "sticky",
          top: 0,
          overflow: "hidden",
          flexShrink: 0,
          overflowY: "auto",
        }}
      >
        <SidebarContent pathname={pathname} />
      </aside>

      <button
        className="sidebar-mobile-trigger"
        onClick={() => setMobileOpen(true)}
        style={{
          display: "none",
          position: "fixed",
          top: 14,
          left: 14,
          zIndex: 200,
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "var(--bg-sidebar)",
          border: "1px solid var(--border)",
          backdropFilter: "blur(16px)",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--text-secondary)",
        }}
      >
        <Menu size={16} />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 250,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
              }}
            />
            <motion.div
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              style={{
                position: "fixed",
                left: 0,
                top: 0,
                bottom: 0,
                width: 240,
                zIndex: 260,
                borderRight: "1px solid var(--border-sidebar)",
                boxShadow: "var(--shadow-md)",
                overflowY: "auto",
              }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "var(--bg-item-hover)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
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
  );
}
