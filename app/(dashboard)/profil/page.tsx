"use client";

import { Briefcase, ChevronRight, Link2, Mail, Unlink, UserCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────

interface GoogleStatus {
  connected: boolean;
  email?: string;
  name?: string;
  picture?: string;
  source?: "env" | "cookie";
  reason?: string;
  stale_env?: boolean;
}

// ── Google SVG ─────────────────────────────────────────────────────────

function GoogleSvg({ size = 16 }: { size?: number }) {
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

// ── Status banner ──────────────────────────────────────────────────────

const AUTH_ERROR_LABELS: Record<string, string> = {
  access_denied: "Odmówiono dostępu. Zatwierdź wszystkie uprawnienia przy kolejnej próbie.",
  no_code: "Nie otrzymano kodu autoryzacji od Google.",
  redirect_uri_mismatch: "Niezgodność adresu przekierowania. Sprawdź konfigurację OAuth.",
};

function StatusBanner() {
  const params = useSearchParams();
  const p = params.get("google");
  const authError = params.get("auth_error");
  if (!p) return null;

  const errorDetail = authError
    ? (AUTH_ERROR_LABELS[authError] ?? `Kod błędu: ${authError}`)
    : null;

  const msgs: Record<string, { text: string; color: string; bg: string; border: string }> = {
    success: {
      text: "Połączono z Google pomyślnie",
      color: "#34c759",
      bg: "rgba(52,199,89,0.08)",
      border: "rgba(52,199,89,0.2)",
    },
    error: {
      text: errorDetail ?? "Błąd podczas łączenia z Google. Spróbuj ponownie.",
      color: "#ff3b30",
      bg: "rgba(255,59,48,0.08)",
      border: "rgba(255,59,48,0.2)",
    },
    no_refresh_token: {
      text: "Nie otrzymano refresh token. Odwołaj dostęp w ustawieniach Google i spróbuj ponownie.",
      color: "#ff9500",
      bg: "rgba(255,149,0,0.08)",
      border: "rgba(255,149,0,0.2)",
    },
    not_configured: {
      text: "Brak GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET",
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
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        color: m.color,
        fontWeight: 500,
      }}
    >
      {m.text}
    </div>
  );
}

// ── Google service mini-panel ──────────────────────────────────────────

const GOOGLE_SERVICES = [
  { key: "tasks", label: "Google Tasks", icon: null, desc: "Zarządzaj zadaniami" },
  { key: "drive", label: "Google Drive", icon: null, desc: "Transkrypty i pliki" },
  { key: "calendar", label: "Google Calendar", icon: null, desc: "Harmonogram i spotkania" },
  { key: "sheets", label: "Google Sheets", icon: null, desc: "Nasza karta (Agency)" },
] as const;

function GoogleServicePanel({
  label,
  desc,
  connected,
}: {
  label: string;
  desc: string;
  connected: boolean;
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "var(--bg-card)",
        border: `1px solid ${connected ? "rgba(52,199,89,0.2)" : "var(--border)"}`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <GoogleSvg size={14} />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {label}
        </span>
        <div
          style={{
            marginLeft: "auto",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: connected ? "#34c759" : "var(--border)",
            boxShadow: connected ? "0 0 5px rgba(52,199,89,0.5)" : "none",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          color: "var(--text-tertiary)",
          lineHeight: 1.4,
        }}
      >
        {desc}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          color: connected ? "#34c759" : "var(--text-placeholder)",
        }}
      >
        {connected ? "Połączono" : "Niepołączono"}
      </div>
    </div>
  );
}

// ── Profile content ────────────────────────────────────────────────────

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
    void fetchGoogleStatus();
  }, []);

  async function handleDisconnect() {
    await fetch("/api/auth/google/status", { method: "DELETE" });
    setGoogleStatus({ connected: false });
  }

  function handleConnect() {
    window.location.href = "/api/auth/google";
  }

  const connected = googleStatus?.connected ?? false;

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", padding: "28px 28px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "var(--font-mono)",
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
            fontFamily: "var(--font-sans)",
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
            fontFamily: "var(--font-sans)",
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 900 }}>
        {/* Left — user card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "24px 22px",
              display: "flex",
              alignItems: "center",
              gap: 18,
              position: "relative",
              overflow: "hidden",
            }}
          >
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
                  background: "var(--bg-elevated)",
                  border: "2px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserCircle2 size={32} color="var(--text-secondary)" />
              </div>
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
                  fontFamily: "var(--font-sans)",
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
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  Autorise · Founder
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <Mail size={11} color="var(--text-tertiary)" />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  info.autorise@gmail.com
                </span>
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <div
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "var(--accent-subtle)",
                  border: "1px solid rgba(26,86,255,0.2)",
                  fontFamily: "var(--font-mono)",
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
        </div>

        {/* Right — Google connections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                fontFamily: "var(--font-mono)",
                fontSize: "8.5px",
                fontWeight: 600,
                color: "var(--text-tertiary)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>Połączenia Google</span>
              {!loadingGoogle &&
                (connected ? (
                  <button
                    onClick={() => void handleDisconnect()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,59,48,0.25)",
                      background: "rgba(255,59,48,0.07)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "#ff3b30",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    <Unlink size={10} />
                    Odłącz
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: "#1a56ff",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    <Link2 size={10} />
                    Połącz z Google
                  </button>
                ))}
            </div>

            {loadingGoogle ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  padding: "8px 0",
                }}
              >
                Sprawdzanie...
              </div>
            ) : (
              <>
                {connected && googleStatus?.email && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(52,199,89,0.06)",
                      border: "1px solid rgba(52,199,89,0.15)",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{ width: 6, height: 6, borderRadius: "50%", background: "#34c759" }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {googleStatus.email}
                    </span>
                    {googleStatus.source === "env" && (
                      <span
                        style={{
                          marginLeft: 4,
                          padding: "1px 5px",
                          borderRadius: 4,
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        .env
                      </span>
                    )}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {GOOGLE_SERVICES.map((s) => (
                    <GoogleServicePanel
                      key={s.key}
                      label={s.label}
                      desc={s.desc}
                      connected={connected}
                    />
                  ))}
                </div>

                {!connected && googleStatus?.reason === "not_configured" && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "12px 14px",
                      background: "rgba(255,149,0,0.05)",
                      border: "1px solid rgba(255,149,0,0.15)",
                      borderRadius: 10,
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    Brak konfiguracji Google OAuth. Ustaw GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET w
                    .env.local.
                  </div>
                )}

                {!connected &&
                  (googleStatus?.reason === "expired" ||
                    googleStatus?.reason === "invalid_token") && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "12px 14px",
                        background: "var(--warning-bg)",
                        border: "1px solid var(--warning-border)",
                        borderRadius: 10,
                        fontFamily: "var(--font-sans)",
                        fontSize: 11.5,
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "var(--warning)", marginBottom: 4 }}>
                        Połączenie z Google wygasło
                      </div>
                      Token dostępu stracił ważność (Google odświeża go co kilka dni w trybie
                      testowym). Kliknij <strong>„Połącz z Google"</strong> powyżej, aby połączyć
                      ponownie.
                      {googleStatus?.stale_env && (
                        <div style={{ marginTop: 6, color: "var(--text-tertiary)" }}>
                          Uwaga: w zmiennych środowiskowych jest nieważny{" "}
                          <code>GOOGLE_REFRESH_TOKEN</code> — usuń go (Vercel → Settings → Env), aby
                          ponowne łączenie działało na stałe.
                        </div>
                      )}
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export ─────────────────────────────────────────────────────────────

export default function ProfilPage() {
  return (
    <Suspense>
      <ProfilContent />
    </Suspense>
  );
}
