"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Zamknij drawer przy zmianie strony (nawigacja na mobile).
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Blokuj scroll tła gdy drawer otwarty (mobile).
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  return (
    <div className="app-shell">
      {/* Pasek górny — tylko mobile */}
      <div className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Otwórz menu"
        >
          <Menu size={19} strokeWidth={1.9} />
        </button>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Autorise
        </span>
      </div>

      {/* Backdrop drawera (mobile) */}
      <div
        className={`sidebar-backdrop${drawerOpen ? " open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden
      />

      <Sidebar open={drawerOpen} onNavigate={() => setDrawerOpen(false)} />

      <main className="app-main">{children}</main>
    </div>
  );
}
