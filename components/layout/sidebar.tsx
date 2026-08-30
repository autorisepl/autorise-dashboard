"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  CalendarDays,
  Clock,
  FileCheck2,
  Kanban,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mic,
  Monitor,
  Phone,
  Presentation,
  Rocket,
  Settings,
  Target,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { VercelDeployData } from "@/app/api/vercel/last-deploy/route";
import type { WeatherData } from "@/app/api/weather/route";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { logout } from "@/lib/auth/logout";
import { useIdentity } from "@/lib/auth/RoleContext";
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/auth/resolveRole";

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

// ── Vercel last deploy hook ─────────────────────────────────────────

function useLastDeploy() {
  const [deploy, setDeploy] = useState<VercelDeployData | null>(null);
  const [configured, setConfigured] = useState(true);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vercel/last-deploy");
      const data = await res.json();
      setConfigured(Boolean(data.configured));
      if (data.success) setDeploy(data.deploy);
    } catch {
      /* silent */
    }
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);
  return { deploy, configured };
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

// ── Session timer ───────────────────────────────────────────────────

// "Sesja Xh Ym" — od momentu otwarcia aplikacji w TEJ karcie przeglądarki, nie z tokenu
// JWT (który odświeża się cyklicznie i zresetowałby licznik do zera, dając mylący wynik).
// sessionStorage (nie localStorage) — świadomie: nowa karta = nowa sesja licznika, zamknięcie
// karty go kasuje, zgodnie z "jak długo jesteś dziś zalogowany w TEJ karcie".
const SESSION_STARTED_AT_KEY = "autorise_session_started_at";

function useSessionTimerLabel(): string | null {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let raw = sessionStorage.getItem(SESSION_STARTED_AT_KEY);
    if (!raw) {
      raw = String(Date.now());
      sessionStorage.setItem(SESSION_STARTED_AT_KEY, raw);
    }
    setStartedAt(Number(raw));
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (startedAt === null || now === null) return null;
  const totalMinutes = Math.max(0, Math.floor((now - startedAt) / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `Sesja ${h}h ${m}m`;
}

// ── Name formatting ─────────────────────────────────────────────────

// team_display_name w Supabase to wolny tekst wpisany ręcznie przy zakładaniu konta —
// bez gwarancji wielkości liter ("michał roth", "MICHAŁ ROTH"). Wyświetlamy zawsze z
// wielkiej litery każdego słowa, nie zmieniając wartości w bazie. toLocaleUpperCase/
// LowerCase("pl-PL") zamiast zwykłego toUpperCase — poprawne traktowanie ą/ę/ł/ż itd.
function toDisplayName(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toLocaleUpperCase("pl-PL") + word.slice(1).toLocaleLowerCase("pl-PL"),
    )
    .join(" ");
}

// ── Role ────────────────────────────────────────────────────────────

const SETTER_VISIBLE_HREFS = [
  "/kwalifikacja",
  "/sprzedaz",
  // Drugie spotkanie sprzedażowe, ten sam dostęp co /sprzedaz (2026-08-30) — patrz komentarz
  // przy wpisie w NAV niżej.
  "/finalizacja",
  "/agencja",
  "/prezentacja.html",
  "/agenci",
  // Transkrypcja rozmów telefonicznych — odblokowana dla settera/closera (2026-08-28),
  // zakładka jeszcze w budowie ale dostęp jest już teraz.
  "/narzedzia",
];

// ── Nav structure ───────────────────────────────────────────────────

// Runda 2 (2026-08-25, Michał: "mega bałagan i bez sensu"): stary podział 3-grupowy
// mieszał w "Klienci" siedem niepowiązanych rzeczy (kwalifikacja, sprzedaż, wdrożenie,
// utrzymanie, agenci, prezentacja, transkrypcja). Nowy podział 4-grupowy wg FAZY pracy,
// nie wg tego "kto/co to jest":
// - Klienci: przegląd i praca z klientem PO sprzedaży (pipeline jako punkt wejścia).
// - Spotkania: narzędzia używane W TRAKCIE rozmowy z klientem (kwalifikacja, sprzedaż,
//   prezentacja pokazywana na żywo, nagrywarka/transkrypcja tej samej rozmowy) — dokładnie
//   grupa, o którą prosił Michał wprost.
// - Organizacja: wewnętrzne metryki/planowanie/monitoring, nie dotyczy jednego klienta.
// - Wiedza: statyczne materiały referencyjne (brand book, karta frameworku sprzedażowego).
const NAV: {
  label: string;
  items: { href: string; label: string; icon: React.ElementType; exact?: boolean }[];
}[] = [
  {
    label: "Klienci",
    items: [
      { href: "/pipeline", label: "Pipeline", icon: Kanban },
      { href: "/wdrozenie", label: "Wdrożenie", icon: Rocket, exact: true },
      { href: "/utrzymanie", label: "Utrzymanie", icon: LifeBuoy, exact: true },
      { href: "/agenci", label: "Agenci AI", icon: LayoutDashboard, exact: false },
    ],
  },
  {
    label: "Spotkania",
    items: [
      { href: "/kwalifikacja", label: "Kwalifikacja", icon: Phone },
      { href: "/sprzedaz", label: "Sprzedaż", icon: Target },
      // Przeniesione z grupy "Klienci" (2026-08-30) — od tej rundy strona nie jest już
      // wyłącznie skryptem analizy przedkontraktowej, tylko pełnym drugim spotkaniem
      // sprzedażowym (pomiar czasu, Załącznik nr 1, podpis), patrz lib/scripts/finalizacja.ts.
      // Ten sam status Pipeline "Finalizacja" co wcześniej, ale to teraz rozmowa z klientem
      // na żywo, nie narzędzie porządkowe po fakcie — miejsce w nawigacji i dostęp settera
      // dopasowane 1:1 do /sprzedaz.
      { href: "/finalizacja", label: "Finalizacja i analiza", icon: FileCheck2, exact: true },
      { href: "/prezentacja.html", label: "Prezentacja", icon: Presentation },
      { href: "/narzedzia", label: "Transkrypcja", icon: Mic, exact: true },
    ],
  },
  {
    label: "Organizacja",
    items: [
      { href: "/statystyki", label: "Statystyki", icon: TrendingUp },
      { href: "/planowanie", label: "Planowanie", icon: CalendarDays, exact: true },
      { href: "/kontrola", label: "Kontrola", icon: Monitor },
    ],
  },
  {
    label: "Wiedza",
    items: [
      // Mapa procesów / Baza wiedzy / Analiza narzędzi usunięte z nawigacji (Michał,
      // 2026-08-25) — strony zostają w kodzie nielinkowane, ten sam wzorzec co
      // wcześniej /pliki i /sesje (patrz CLAUDE.md).
      { href: "/brand-book", label: "Brand Book", icon: BookOpen, exact: true },
      { href: "/agencja", label: "Karta (Agency Leaders)", icon: Users },
    ],
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
              background: "var(--brand-blue-bg)",
              borderRadius: 7,
              borderLeft: "3px solid var(--brand-blue)",
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
            paddingLeft: isActive ? 13 : 12,
            paddingRight: 10,
            borderRadius: 7,
            cursor: "pointer",
            background: !isActive && hovered ? "var(--brand-blue-bg-hover)" : "transparent",
            transition: "background 120ms",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* fill="currentColor" cofnięty (2026-08-25, druga runda) — na ikonach Lucide
              wielościeżkowych (Target, LifeBuoy, Kanban...) dosłowne wypełnienie zalewało
              wnętrze i gubiło kształt, wyglądało "dziwacznie", nie jak wypełniona ikona.
              Zamiast tego: czysty, bardzo gruby biały stroke — czytelny odpowiednik
              "wypełnionej" ikony bez psucia geometrii. */}
          <Icon size={18} color="#ffffff" strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12.5,
              fontWeight: isActive ? 700 : hovered ? 600 : 500,
              color: "#ffffff",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
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
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ open = false, onNavigate }: { open?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const weather = useWeather();
  const { deploy, configured: deployConfigured } = useLastDeploy();
  const now = useClock();
  const identity = useIdentity();
  const role = identity?.role ?? null;
  const sessionLabel = useSessionTimerLabel();
  const [loggingOut, setLoggingOut] = useState(false);
  const [settingsHovered, setSettingsHovered] = useState(false);
  const [logoutHovered, setLogoutHovered] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
  };

  const visibleNav =
    role === "setter"
      ? NAV.map((section) => ({
          ...section,
          items: section.items.filter((item) => SETTER_VISIBLE_HREFS.includes(item.href)),
        })).filter((section) => section.items.length > 0)
      : NAV;

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
        borderRight: "1px solid var(--border-sidebar-divider)",
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      {/* 1. Logo — marka Autorise, zastępuje dawny tekstowy lockup + osobną etykietę
          workspace'u (2026-08-24, jedno źródło tożsamości marki zamiast dwóch). Plik
          public/logo.png jest ciasno przycięty (bez czarnego marginesu) w
          scratchpad/crop_logo.py z branding/logo/logo.png, żeby wordmark wypełniał
          całą wysokość nagłówka zamiast ginąć w dużym marginesie oryginału. */}
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 46px 0 14px" /* right 46px clears the toggle button at left:245px */,
          borderBottom: "1px solid var(--border-sidebar-divider)",
          flexShrink: 0,
        }}
      >
        {/* biome-ignore lint: statyczny lokalny asset marki, next/image niepotrzebny dla stałego logo w sidebarze */}
        <img
          src="/logo.png"
          alt="Autorise"
          style={{
            height: 30,
            width: "auto",
            flexShrink: 0,
          }}
        />
      </div>

      {/* 2b. Ostatni deploy Vercel */}
      {deployConfigured && deploy && (
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border-sidebar-divider)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              flexShrink: 0,
              background:
                deploy.state === "Zaktualizowano" ? "var(--success-text)" : "var(--warning)",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {new Date(deploy.createdAt).toLocaleDateString("pl-PL", {
                day: "numeric",
                month: "long",
              })}{" "}
              ·{" "}
              {new Date(deploy.createdAt).toLocaleTimeString("pl-PL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginTop: 2,
              }}
            >
              {deploy.state}
            </div>
          </div>
        </div>
      )}

      {/* 3. Dziś — data/godzina/miejscowość podniesione w hierarchii (Michał 2026-08-25:
          "znacznie lepiej widoczna i pasująca do nowego motywu"), godzina teraz cięższa
          zamiast cienkiej 300-wagi, plakietka miasta przełączona na --brand-blue (#38b6ff,
          z logo) zamiast starego stonowanego --accent. */}
      <div
        style={{
          padding: "10px 16px 12px",
          borderBottom: "1px solid var(--border-sidebar-divider)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-primary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 3,
          }}
        >
          {dateStr}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 26,
            fontWeight: 500,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.1,
            marginBottom: 8,
          }}
        >
          {timeStr}
        </div>
        {weather && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {weather.city}
            </span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "#ffffff",
                background: "var(--brand-blue-bg)",
                border: "1px solid var(--brand-blue-border)",
                borderRadius: 999,
                padding: "2px 10px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {weather.temp}°C
            </span>
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
        {visibleNav.map((section, si) => (
          <div
            key={si}
            style={{
              marginBottom: 8,
              // Divider MIĘDZY kategoriami (nie przed pierwszą) — dotąd zerowa
              // widoczność granicy Organizacja/Klienci/Wiedza i proces (zgłoszenie
              // Michała 2026-08-25).
              borderTop: si > 0 ? "1px solid var(--border-sidebar-divider)" : "none",
              paddingTop: si > 0 ? 8 : 0,
            }}
          >
            <SectionLabel
              paddingX={6}
              style={{ color: "var(--text-primary)", fontSize: 11, letterSpacing: "0.06em" }}
            >
              {section.label}
            </SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
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

      {/* 5. Karta użytkownika — dół, funkcjonalna (nie tylko wizualna): identity z
          useIdentity() (nie osobny stan), licznik sesji, ikona ustawień (→ /profil) i
          DZIAŁająca ikona wylogowania wywołująca dokładnie tę samą logout() co przycisk
          "Wyloguj" w /profil. Rozwiązuje ostatecznie "wylogowanie tylko z /profil" —
          patrz proxy.ts, wpis "/profil" usunięty z SETTER_ALLOWED_PREFIXES w tej samej
          rundzie, bo przestał być jedyną drogą do wylogowania settera.
          Redesign 2026-08-25 (Michał, wg wizualnej inspiracji): awatar wypełniony, rola
          i sesja jako dwie osobne, wyraźne odznaki zamiast jednej wyblakłej linijki
          tekstu — rola kolorowana per ranga (ROLE_COLORS, ten sam wzorzec bg/border/text
          co status Pipeline), sesja neutralną plakietką z ikoną zegara. */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border-sidebar-divider)",
          padding: "12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* Awatar: pełne niebieskie kółko (--brand-blue, nie przezroczysty tint) + prosta
            wypełniona sylwetka (User, nie UserCircle2) — UserCircle2 rysował WŁASNE kółko
            w środku naszego kółka, przy jasnym tincie na tincie ikona ginęła całkowicie
            (zgłoszenie Michała: "nie widać totalnie usera ikonki"). */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--brand-blue)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <User size={19} color="#ffffff" fill="#ffffff" strokeWidth={1.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 600,
              color: "#ffffff",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: 4,
            }}
          >
            {identity ? toDisplayName(identity.displayName) : "Nieznany użytkownik"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            {role && (
              // Runda 2 (Michał: "musi być białą czcionką na tym niebieskim tle, tak jak
              // stopnie w pogodzie") — samo tło/border zostają z ROLE_COLORS (ten sam
              // przezroczysty tint co plakietka pogody), ale tekst zawsze biały zamiast
              // wyblakłego koloru per rola, i trochę większa plakietka.
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "#ffffff",
                  background: ROLE_COLORS[role].bg,
                  border: `1px solid ${ROLE_COLORS[role].border}`,
                  borderRadius: 999,
                  padding: "3px 9px",
                  flexShrink: 0,
                }}
              >
                {ROLE_LABELS[role]}
              </span>
            )}
            {sessionLabel && (
              // Ten sam ciężar wizualny co "ZAKTUALIZOWANO" w bloku deployu — pogrubiony
              // biały wersalik. Runda 2 (Michał: "napis SESJA musi być widoczny, ikonka
              // wypełniona tak jak wszystkie"): etykieta "Sesja" nie jest już wycinana
              // (textTransform:uppercase renderuje ją jako "SESJA"), a Clock — jak każda
              // wielościeżkowa ikona Lucide w tym pliku — "wypełniona" przez bardzo gruby
              // stroke zamiast fill (fill gubiłby wskazówki zegara, patrz komentarz przy
              // NavItem), nie przez dosłowne fill, które by ją rozwaliło.
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#ffffff",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <Clock size={13} strokeWidth={2.75} style={{ flexShrink: 0 }} />
                {sessionLabel}
              </span>
            )}
          </div>
        </div>
        <Link
          href="/profil"
          onClick={onNavigate}
          title="Ustawienia konta"
          onMouseEnter={() => setSettingsHovered(true)}
          onMouseLeave={() => setSettingsHovered(false)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            flexShrink: 0,
            background: settingsHovered ? "var(--bg-hover)" : "transparent",
            transition: "background 120ms",
            color: "#ffffff",
          }}
        >
          <Settings size={16} color="#ffffff" fill="currentColor" strokeWidth={1.3} />
        </Link>
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          title="Wyloguj"
          onMouseEnter={() => setLogoutHovered(true)}
          onMouseLeave={() => setLogoutHovered(false)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            flexShrink: 0,
            background: logoutHovered && !loggingOut ? "var(--error-bg)" : "transparent",
            border: "none",
            cursor: loggingOut ? "default" : "pointer",
            color: "var(--error-text)",
            opacity: loggingOut ? 0.5 : 1,
            transition: "background 120ms",
          }}
        >
          <LogOut size={17} strokeWidth={2.2} />
        </button>
      </div>
    </aside>
  );
}
