"use client";

import { Briefcase, ChevronRight, Link2, Mail, Shield, Unlink } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// ── Design tokens ──────────────────────────────────────────────────

const f = {
  system: "var(--font-system)",
  mono: "var(--font-mono)",
};
const ACCENT = "#1a56ff";

// ── Types ──────────────────────────────────────────────────────────

interface GoogleStatus {
  connected: boolean;
  email?: string;
  name?: string;
  picture?: string;
  source?: "env" | "cookie";
  reason?: string;
}

// ── Google SVG ─────────────────────────────────────────────────────

function GoogleSvg({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ── Status banner ──────────────────────────────────────────────────

function StatusBanner() {
  const params = useSearchParams();
  const p = params.get("google");
  if (!p) return null;

  const msgs: Record<string, { text: string; color: string; bg: string; border: string }> = {
    success: {
      text: "✓ Połączono z Google pomyślnie",
      color: "#34c759",
      bg: "rgba(52,199,89,0.08)",
      border: "rgba(52,199,89,0.2)",
    },
    error: {
      text: "✗ Błąd podczas łączenia. Spróbuj ponownie.",
      color: "#ff3b30",
      bg: "rgba(255,59,48,0.08)",
      border: "rgba(255,59,48,0.2)",
    },
    no_refresh_token: {
      text: "⚠ Nie otrzymano refresh token. Spróbuj ponownie.",
      color: "#ff9500",
      bg: "rgba(255,149,0,0.08)",
      border: "rgba(255,149,0,0.2)",
    },
    not_configured: {
      text: "⚠ Brak GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET",
      color: "#ff9500",
      bg: "rgba(255,149,0,0.08)",
      border: "rgba(255,149,0,0.2)",
    },
  };

  const m = msgs[p];
  if (!m) return null;

  return (
    <div
      style={{
        padding: "10px 16px",
        borderRadius: 10,
        marginBottom: 20,
        background: m.bg,
        border: `1px solid ${m.border}`,
        fontFamily: f.mono,
        fontSize: 12,
        color: m.color,
        fontWeight: 500,
      }}
    >
      {m.text}
    </div>
  );
}

// ── User card ──────────────────────────────────────────────────────

function UserCard() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "24px 22px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        marginBottom: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: -40,
          left: -20,
          width: 160,
          height: 160,
          background: "radial-gradient(circle, rgba(26,86,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Avatar */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #1a56ff 0%, #4b7bff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 2px rgba(26,86,255,0.25), 0 4px 20px rgba(26,86,255,0.3)",
          }}
        >
          <span style={{ fontFamily: f.system, fontSize: 20, fontWeight: 800, color: "#fff" }}>
            MR
          </span>
        </div>
        {/* Online dot */}
        <div
          style={{
            position: "absolute",
            bottom: 2,
            right: 2,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#34c759",
            border: "2px solid var(--bg-card)",
            boxShadow: "0 0 6px rgba(52,199,89,0.5)",
          }}
        />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: f.system,
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
          }}
        >
          Michał Roth
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <Briefcase size={11} color="var(--text-tertiary)" />
          <span style={{ fontFamily: f.system, fontSize: 12, color: "var(--text-secondary)" }}>
            Autorise · Founder
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <Mail size={11} color="var(--text-tertiary)" />
          <span style={{ fontFamily: f.mono, fontSize: 11, color: "var(--text-tertiary)" }}>
            info.autorise@gmail.com
          </span>
        </div>
      </div>

      {/* Badge */}
      <div style={{ flexShrink: 0 }}>
        <div
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            background: "var(--accent-subtle)",
            border: "1px solid rgba(26,86,255,0.2)",
            fontFamily: f.mono,
            fontSize: 10,
            color: "var(--accent)",
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          FOUNDER
        </div>
      </div>
    </div>
  );
}

// ── Google card ────────────────────────────────────────────────────

function GoogleCard({
  status,
  onConnect,
  onDisconnect,
  loading,
}: {
  status: GoogleStatus | null;
  onConnect: () => void;
  onDisconnect: () => void;
  loading: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: hovered ? "var(--bg-item-hover)" : "transparent",
        border: `1px solid ${status?.connected ? "rgba(26,86,255,0.3)" : "var(--border)"}`,
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        transition: "background 150ms ease, border-color 150ms ease",
        boxShadow: status?.connected ? "0 0 20px rgba(26,86,255,0.06)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Google icon */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          flexShrink: 0,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <GoogleSvg size={18} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: f.system,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 3,
            letterSpacing: "-0.01em",
          }}
        >
          Google
        </div>
        {loading ? (
          <div style={{ fontFamily: f.mono, fontSize: 11, color: "var(--text-tertiary)" }}>
            Sprawdzanie...
          </div>
        ) : status?.connected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#34c759",
                  boxShadow: "0 0 5px rgba(52,199,89,0.5)",
                }}
              />
              <span style={{ fontFamily: f.mono, fontSize: 11, color: "var(--text-secondary)" }}>
                {status.email}
              </span>
              {status.source === "env" && (
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    fontFamily: f.mono,
                    fontSize: 9,
                    color: "var(--text-tertiary)",
                  }}
                >
                  .env
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 12 }}>
              {["Tasks", "Arkusze", "Drive"].map((s) => (
                <span
                  key={s}
                  style={{
                    padding: "1px 7px",
                    borderRadius: 4,
                    background: "rgba(52,199,89,0.07)",
                    border: "1px solid rgba(52,199,89,0.15)",
                    fontFamily: f.mono,
                    fontSize: 9,
                    color: "#34c759",
                    fontWeight: 600,
                  }}
                >
                  {s} ✓
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: f.system, fontSize: 11, color: "var(--text-tertiary)" }}>
            Nie połączono · Tasks · Arkusze · Drive
          </div>
        )}
      </div>

      {/* Action */}
      {!loading &&
        (status?.connected ? (
          <button
            onClick={onDisconnect}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,59,48,0.25)",
              background: "rgba(255,59,48,0.07)",
              fontFamily: f.system,
              fontSize: 11,
              color: "#ff3b30",
              cursor: "pointer",
              flexShrink: 0,
              fontWeight: 500,
              transition: "background 150ms ease",
            }}
          >
            <Unlink size={11} />
            Odłącz
          </button>
        ) : (
          <button
            onClick={onConnect}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              border: "none",
              background: "#1a56ff",
              fontFamily: f.system,
              fontSize: 11,
              color: "#fff",
              cursor: "pointer",
              flexShrink: 0,
              fontWeight: 600,
              boxShadow: "0 2px 10px rgba(26,86,255,0.3)",
            }}
          >
            <Link2 size={11} />
            Połącz
          </button>
        ))}
    </div>
  );
}

// ── Setup instructions ─────────────────────────────────────────────

function SetupCard() {
  return (
    <div
      style={{
        marginTop: 12,
        padding: "14px 16px",
        background: "rgba(255,149,0,0.05)",
        border: "1px solid rgba(255,149,0,0.15)",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontFamily: f.system,
          fontSize: 12,
          fontWeight: 600,
          color: "#ff9500",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Shield size={12} />
        Konfiguracja Google OAuth
      </div>
      <div
        style={{
          fontFamily: f.system,
          fontSize: 11,
          color: "var(--text-secondary)",
          lineHeight: 1.8,
        }}
      >
        1. <span style={{ fontFamily: f.mono, fontSize: 10 }}>console.cloud.google.com</span> →
        Credentials → OAuth 2.0 Client IDs
        <br />
        2. Dodaj Authorized Redirect URI:
        <br />
        <span
          style={{
            display: "inline-block",
            marginTop: 4,
            marginLeft: 12,
            marginBottom: 6,
            fontFamily: f.mono,
            fontSize: 10,
            color: "rgba(255,149,0,0.8)",
            padding: "3px 8px",
            borderRadius: 4,
            background: "rgba(255,149,0,0.07)",
            border: "1px solid rgba(255,149,0,0.15)",
          }}
        >
          http://localhost:3000/api/auth/google/callback
        </span>
        <br />
        3. Dodaj do <span style={{ fontFamily: f.mono, fontSize: 10 }}>.env.local</span>:<br />
        <span
          style={{
            display: "block",
            marginTop: 6,
            marginLeft: 12,
            fontFamily: f.mono,
            fontSize: 10,
            color: "rgba(255,149,0,0.7)",
            lineHeight: 1.9,
            padding: "8px 10px",
            borderRadius: 6,
            background: "rgba(255,149,0,0.04)",
            border: "1px solid rgba(255,149,0,0.1)",
          }}
        >
          GOOGLE_CLIENT_ID=...
          <br />
          GOOGLE_CLIENT_SECRET=...
          <br />
          GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
        </span>
      </div>
    </div>
  );
}

// ── Logo info card ─────────────────────────────────────────────────

function LogoInfoCard() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "18px 18px",
      }}
    >
      <div
        style={{
          fontFamily: f.mono,
          fontSize: "8.5px",
          fontWeight: 600,
          color: "var(--text-tertiary)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        Logo aplikacji
      </div>

      {/* Logo preview */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "linear-gradient(135deg, #1a56ff 0%, #4b7bff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(26,86,255,0.3), 0 0 0 1px rgba(26,86,255,0.2)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: f.system, fontSize: 24, fontWeight: 800, color: "#fff" }}>
            A
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: f.system,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            Placeholder — zastąp własnym
          </div>
          <div
            style={{
              fontFamily: f.system,
              fontSize: 11,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            Umieść logo w{" "}
            <span style={{ fontFamily: f.mono, fontSize: 10, color: "var(--text-tertiary)" }}>
              public/logo.svg
            </span>
          </div>
        </div>
      </div>

      {/* Specs */}
      {[
        ["Format", "SVG (preferowany) lub PNG 2×"],
        ["Rozmiar", "256×256px minimum (kwadrat)"],
        ["Kolory", "max 2: biały #ffffff + niebieski #1a56ff"],
        ["Tło", "transparentne"],
      ].map(([k, v]) => (
        <div
          key={k}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "7px 0",
            borderBottom: "1px solid var(--separator)",
          }}
        >
          <span style={{ fontFamily: f.mono, fontSize: 10, color: "var(--text-tertiary)" }}>
            {k}
          </span>
          <span style={{ fontFamily: f.system, fontSize: 11, color: "var(--text-secondary)" }}>
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Profile content ────────────────────────────────────────────────

function ProfilContent() {
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(true);

  async function fetchGoogleStatus() {
    try {
      setLoadingGoogle(true);
      const res = await fetch("/api/auth/google/status");
      const data = (await res.json()) as GoogleStatus;
      setGoogleStatus(data);
    } catch {
      setGoogleStatus({ connected: false, reason: "error" });
    } finally {
      setLoadingGoogle(false);
    }
  }

  useEffect(() => {
    fetchGoogleStatus();
  }, []);

  async function handleDisconnect() {
    await fetch("/api/auth/google/status", { method: "DELETE" });
    setGoogleStatus({ connected: false });
  }

  function handleConnect() {
    window.location.href = "/api/auth/google";
  }

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", padding: "28px 28px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontFamily: f.mono,
            fontSize: "10px",
            color: "var(--text-tertiary)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          <ChevronRight size={10} />
          profil
        </div>
        <h1
          style={{
            fontFamily: f.system,
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
            letterSpacing: "-0.03em",
          }}
        >
          Twój profil
        </h1>
        <p
          style={{
            fontFamily: f.system,
            fontSize: 13,
            color: "var(--text-secondary)",
            margin: "6px 0 0",
            lineHeight: 1.5,
          }}
        >
          Ustawienia konta i połączenia z zewnętrznymi usługami
        </p>
      </div>

      <StatusBanner />

      {/* Grid layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 900 }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <UserCard />
          <LogoInfoCard />
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Connections */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "18px",
            }}
          >
            <div
              style={{
                fontFamily: f.mono,
                fontSize: "8.5px",
                fontWeight: 600,
                color: "var(--text-tertiary)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Połączenia
            </div>

            <GoogleCard
              status={googleStatus}
              loading={loadingGoogle}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />

            {!loadingGoogle && googleStatus?.reason === "not_configured" && <SetupCard />}

            {!loadingGoogle && googleStatus?.connected && (
              <div
                style={{
                  marginTop: 10,
                  padding: "12px 14px",
                  background: "rgba(26,86,255,0.04)",
                  border: "1px solid rgba(26,86,255,0.12)",
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: f.mono,
                    fontSize: 9,
                    fontWeight: 700,
                    color: ACCENT,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    marginBottom: 8,
                  }}
                >
                  Workspace · Google Drive
                </div>
                <a
                  href="https://drive.google.com/drive/folders/15xY1klu-c_3EqDDVT7SpzzUVRGRYVHNo"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: "rgba(26,86,255,0.1)",
                      border: "1px solid rgba(26,86,255,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2L2 7l10 5 10-5-10-5z"
                        stroke="#1a56ff"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2 17l10 5 10-5"
                        stroke="#1a56ff"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2 12l10 5 10-5"
                        stroke="#1a56ff"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: f.system,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      workspace/transcripts
                    </div>
                    <div
                      style={{
                        fontFamily: f.mono,
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                        marginTop: 1,
                      }}
                    >
                      Transkrypty zapisywane automatycznie ↗
                    </div>
                  </div>
                </a>
              </div>
            )}

            {!loadingGoogle && !googleStatus?.connected && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontFamily: f.system,
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  lineHeight: 1.6,
                }}
              >
                Po połączeniu z Google: transkrypty nagrań będą automatycznie zapisywane w Google
                Drive.
              </div>
            )}
          </div>

          {/* Environment info */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "18px",
            }}
          >
            <div
              style={{
                fontFamily: f.mono,
                fontSize: "8.5px",
                fontWeight: 600,
                color: "var(--text-tertiary)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Środowisko
            </div>
            {[
              ["Dashboard", "Autorise v2"],
              ["Stack", "Next.js 16 · Cloudflare Pages"],
              ["Środowisko", process.env.NODE_ENV ?? "development"],
              ["MCP", "mcp.autorise.pl → :3010"],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--separator)",
                }}
              >
                <span style={{ fontFamily: f.mono, fontSize: 10, color: "var(--text-tertiary)" }}>
                  {k}
                </span>
                <span style={{ fontFamily: f.mono, fontSize: 10, color: "var(--text-secondary)" }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export ─────────────────────────────────────────────────────────

export default function ProfilPage() {
  return (
    <Suspense>
      <ProfilContent />
    </Suspense>
  );
}
