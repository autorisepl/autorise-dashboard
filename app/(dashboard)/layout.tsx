"use client";

import { Menu, PanelLeft, PanelLeftClose } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Read persisted collapse state after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    if (localStorage.getItem("sidebar-collapsed") === "true") setCollapsed(true);
  }, []);

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

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <div className={`app-shell${collapsed ? " sidebar-collapsed" : ""}`}>
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

      <Sidebar
        open={drawerOpen}
        onNavigate={() => setDrawerOpen(false)}
      />

      {/* Sidebar toggle — always visible, one fixed position */}
      <button
        className="sidebar-toggle-btn"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Rozwiń panel boczny" : "Zwiń panel boczny"}
        title={collapsed ? "Rozwiń panel" : "Zwiń panel"}
      >
        {collapsed ? (
          <PanelLeft size={14} strokeWidth={1.8} />
        ) : (
          <PanelLeftClose size={14} strokeWidth={1.8} />
        )}
      </button>

      <main className="app-main">{children}</main>
    </div>
  );
}
