"use client";

import { motion } from "framer-motion";
import {
  BarChart2,
  Calculator,
  Calendar,
  CheckSquare,
  Files,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  Mic,
  Monitor,
  Target,
  UserCircle2,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { WeatherData } from "@/app/api/weather/route";
import { SectionLabel } from "@/components/ui/SectionLabel";

// ── Wind speed text ─────────────────────────────────────────────────

function windText(ms: number): string {
  if (ms <= 2) return "Spokojny";
  if (ms <= 6) return "Słaby";
  if (ms <= 11) return "Umiarkowany";
  if (ms <= 17) return "Dość silny";
  if (ms <= 24) return "Silny";
  if (ms <= 32) return "Bardzo silny";
  return "Gwałtowny";
}

// ── Weather hook ────────────────────────────────────────────────────

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

// ── Clock hook ──────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── Nav structure ───────────────────────────────────────────────────

const NAV: {
  label: string;
  items: { href: string; label: string; icon: React.ElementType; exact?: boolean }[];
}[] = [
  {
    label: "Praca z klientami",
    items: [
      { href: "/sprzedaz", label: "Proces sprzedażowy", icon: Target },
      { href: "/pipeline", label: "Pipeline", icon: GitBranch },
      { href: "/narzedzia/kalkulator", label: "Kalkulator ROI", icon: Calculator, exact: true },
    ],
  },
  {
    label: "Wdrożenia AI",
    items: [
      {
        href: "/agenci",
        label: "Agenci wspomagania sprzedaży",
        icon: LayoutDashboard,
        exact: false,
      },
      { href: "/sesje", label: "Sesje szkoleniowe", icon: GraduationCap },
      { href: "/analiza-narzedzi", label: "Analiza nowych narzędzi", icon: BarChart2 },
    ],
  },
  {
    label: "Obszar Roboczy",
    items: [
      { href: "/pliki", label: "Najważniejsze pliki", icon: Files },
      { href: "/kontrola", label: "Kontrola obszaru roboczego", icon: Monitor },
    ],
  },
  {
    label: "Kalendarz i Zadania",
    items: [
      { href: "/harmonogram", label: "Harmonogram", icon: Calendar },
      { href: "/zadania", label: "Zadania", icon: CheckSquare },
    ],
  },
  {
    label: "Współpraca z Agency Leaders",
    items: [{ href: "/agencja", label: "Nasza karta", icon: Users }],
  },
  {
    label: "Narzędzia",
    items: [{ href: "/narzedzia", label: "Transkrypcja", icon: Mic, exact: true }],
  },
];

// ── Nav item ────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={href} onClick={onNavigate} style={{ textDecoration: "none", display: "block" }}>
      <div style={{ position: "relative" }}>
        {isActive && (
          <motion.div
            layoutId="nav-active"
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--bg-active)",
              borderRadius: 7,
              borderLeft: "2px solid var(--accent)",
            }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
          />
        )}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 34,
            paddingLeft: isActive ? 14 : 12,
            paddingRight: 10,
            borderRadius: 7,
            cursor: "pointer",
            background: !isActive && hovered ? "var(--bg-hover)" : "transparent",
            transition: "background 120ms",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Icon
            size={15}
            color={
              isActive ? "var(--accent)" : hovered ? "var(--text-primary)" : "var(--text-secondary)"
            }
            strokeWidth={1.6}
            style={{ flexShrink: 0, transition: "color 120ms" }}
          />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              color: isActive
                ? "var(--accent)"
                : hovered
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
              letterSpacing: "-0.01em",
              flex: 1,
              transition: "color 120ms",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  if (href === "/agenci") return pathname === "/agenci" || pathname.startsWith("/agenci/");
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({ open = false, onNavigate }: { open?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const weather = useWeather();
  const now = useClock();

  const dateStr = now
    ? now.toLocaleDateString("pl-PL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const timeStr = now
    ? now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "";

  const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <aside
      className={`app-sidebar${open ? " open" : ""}`}
      style={{
        width: 260,
        minWidth: 260,
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-sidebar)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderRight: "1px solid var(--border)",
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      {/* 1. Logo */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <Image
          src="/logo_autorise.png"
          alt="Autorise"
          width={120}
          height={30}
          style={{ objectFit: "contain", objectPosition: "left" }}
          priority
        />
      </div>

      {/* 2. Profil */}
      <button
        onClick={() => {
          router.push("/profil");
          onNavigate?.();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          flexShrink: 0,
          background: "transparent",
          border: "none",
          borderBottom: "1px solid var(--border)" as never,
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
          transition: "background 150ms",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
      >
        <UserCircle2
          size={22}
          color="var(--text-secondary)"
          strokeWidth={1.5}
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          Michał Roth
        </span>
      </button>

      {/* 3. Dziś */}
      <div
        style={{
          padding: "10px 16px 12px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginBottom: 2,
          }}
        >
          {dateStr ? capitalizeFirst(dateStr) : ""}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 22,
            fontWeight: 300,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.1,
            marginBottom: 6,
          }}
        >
          {timeStr}
        </div>
        {weather ? (
          <>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 2,
              }}
            >
              {weather.city} · {weather.temp}°C · {weather.description}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--text-tertiary)",
              }}
            >
              Deszcz: {weather.precipitationChance}% · Wiatr: {windText(weather.windMs)}
            </div>
          </>
        ) : (
          <div
            style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-tertiary)" }}
          >
            Pobieranie pogody...
          </div>
        )}
      </div>

      {/* 4. Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "4px 6px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {NAV.map((section, si) => (
          <div key={si} style={{ marginBottom: 4 }}>
            <SectionLabel paddingX={6}>{section.label}</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 2 }}>
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={isActive(pathname, item.href, item.exact)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
