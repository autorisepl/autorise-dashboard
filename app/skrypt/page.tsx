"use client";

import { Loader2, Monitor } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LiveScript } from "@/components/LiveScript";

function SkryptContent() {
  const params = useSearchParams();
  const pageId = params.get("pageId");
  const nameParam = params.get("name") ?? "";
  const firmaParam = params.get("firma") ?? "";

  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/notion/client-plan?pageId=${pageId}`)
      .then((r) => r.json())
      .then((d: { plan?: string | null }) => {
        if (d.plan) {
          setPlan(d.plan);
        } else {
          setError("Brak Pre-Discovery Brief dla tego klienta. Uruchom Agenta 02 w dashboardzie.");
        }
      })
      .catch(() => setError("Błąd połączenia — sprawdź sieć"))
      .finally(() => setLoading(false));
  }, [pageId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1117",
        color: "#c9d1d9",
        fontFamily: '"Geist", -apple-system, BlinkMacSystemFont, sans-serif',
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Minimal top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 20px",
          height: 44,
          flexShrink: 0,
          background: "#161b22",
          borderBottom: "1px solid #21262d",
        }}
      >
        <Monitor size={14} color="#2563eb" />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "#2563eb",
            textTransform: "uppercase",
          }}
        >
          Autorise
        </span>
        <div style={{ width: 1, height: 16, background: "#21262d" }} />
        <span style={{ fontSize: 12, color: "#6b7280" }}>Live Script</span>
        {nameParam && (
          <>
            <div style={{ width: 1, height: 16, background: "#21262d" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#c9d1d9" }}>{nameParam}</span>
            {firmaParam && <span style={{ fontSize: 11, color: "#6b7280" }}>· {firmaParam}</span>}
          </>
        )}
        <div style={{ flex: 1 }} />
        <a
          href="/sprzedaz"
          style={{
            fontSize: 11,
            color: "#4b5563",
            textDecoration: "none",
            padding: "4px 10px",
            border: "1px solid #21262d",
            borderRadius: 6,
          }}
        >
          ← Dashboard
        </a>
      </div>

      {/* Body */}
      <div style={{ flex: 1 }}>
        {!pageId && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "calc(100vh - 44px)",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Monitor size={36} color="#21262d" strokeWidth={1} />
            <span style={{ color: "#6b7280", fontSize: 14 }}>
              Otwórz przez zakładkę Sprzedaż w dashboardzie
            </span>
          </div>
        )}

        {pageId && loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "calc(100vh - 44px)",
              gap: 10,
            }}
          >
            <Loader2 size={20} color="#2563eb" style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ color: "#6b7280", fontSize: 14 }}>Ładowanie skryptu z Notion…</span>
          </div>
        )}

        {pageId && !loading && error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "calc(100vh - 44px)",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ color: "#ef4444", fontSize: 14 }}>{error}</span>
          </div>
        )}

        {pageId && !loading && !error && plan && (
          <LiveScript plan={plan} clientName={nameParam} firmaNazwa={firmaParam} />
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function SkryptPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#0f1117",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Loader2 size={20} color="#2563eb" style={{ animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <SkryptContent />
    </Suspense>
  );
}
