"use client";

import { Eye, EyeOff, Loader2, Lock, Mail, Zap } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Twoje konto nie ma dostępu do tego panelu.",
  oauth_failed: "Logowanie przez Google nie powiodło się. Spróbuj ponownie.",
};

function GoogleButton({ from }: { from: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    const next = from ?? "/agenci";
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) {
      setError("Błąd połączenia z Google");
      setLoading(false);
    }
    // Sukces: przeglądarka jest już w trakcie przekierowania do Google, nie ma czego dalej robić tutaj.
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px",
          background: "var(--bg-elevated)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          transition: "background 0.15s",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <GoogleIcon />
        )}
        {loading ? "Łączenie…" : "Zaloguj przez Google"}
      </button>
      {error && (
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--error-text)",
            marginTop: 8,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.9 6.1 29.7 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.9 6.1 29.7 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.6 0 10.7-2.1 14.5-5.6l-6.7-5.7C29.6 34.4 26.9 35.4 24 35.4c-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.7 5.7C41.6 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

function PasswordLoginForm({ from }: { from: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);

  useEffect(() => {
    setError("");
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || loading) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Złe dane logowania");
      setPassword("");
      setLoading(false);
      return;
    }
    // Twarde przeładowanie (nie router.push) — Router Cache Next.js potrafi trzymać
    // przechwycony wcześniej redirect do /login dla stron bez force-dynamic.
    window.location.href = from ?? "/agenci";
  };

  const fieldBorder = (field: "email" | "password") =>
    error ? "var(--error-border)" : focused === field ? "var(--border-focus)" : "var(--border)";

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            display: "block",
            fontFamily: "var(--font-sans)",
            fontSize: 10.5,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            marginBottom: 8,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          E-mail
        </label>
        <div style={{ position: "relative" }}>
          <Mail
            size={14}
            color="var(--text-tertiary)"
            style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
            placeholder="imie@autorise.pl"
            style={{
              width: "100%",
              padding: "12px 14px 12px 40px",
              boxSizing: "border-box",
              background: "var(--bg-elevated)",
              border: `1px solid ${fieldBorder("email")}`,
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-primary)",
              outline: "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
              boxShadow: focused === "email" && !error ? "0 0 0 3px var(--accent-muted)" : "none",
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label
          style={{
            display: "block",
            fontFamily: "var(--font-sans)",
            fontSize: 10.5,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            marginBottom: 8,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          Hasło
        </label>
        <div style={{ position: "relative" }}>
          <Lock
            size={14}
            color="var(--text-tertiary)"
            style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
            placeholder="••••••••••••"
            style={{
              width: "100%",
              padding: "12px 40px",
              boxSizing: "border-box",
              background: "var(--bg-elevated)",
              border: `1px solid ${fieldBorder("password")}`,
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              color: "var(--text-primary)",
              outline: "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
              letterSpacing: "0.12em",
              boxShadow:
                focused === "password" && !error ? "0 0 0 3px var(--accent-muted)" : "none",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              padding: 2,
            }}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {error && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--error-text)",
              marginTop: 8,
            }}
          >
            {error}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!email || !password || loading}
        style={{
          width: "100%",
          padding: "12px",
          background: email && password && !loading ? "var(--accent)" : "var(--bg-hover)",
          color: email && password && !loading ? "#fff" : "var(--text-tertiary)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 600,
          cursor: email && password && !loading ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "all 0.15s",
          boxShadow: email && password && !loading ? "0 4px 16px rgba(10,132,255,0.30)" : "none",
        }}
      >
        {loading && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
        {loading ? "Logowanie…" : "Wejdź"}
      </button>
    </form>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const from = params.get("from");
  const errorCode = params.get("error");

  return (
    <div>
      {errorCode && ERROR_MESSAGES[errorCode] && (
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12.5,
            color: "var(--error-text)",
            background: "var(--error-bg)",
            border: "1px solid var(--error-border)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 12px",
            marginBottom: 18,
          }}
        >
          {ERROR_MESSAGES[errorCode]}
        </div>
      )}

      <GoogleButton from={from} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "18px 0",
        }}
      >
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10.5,
            color: "var(--text-placeholder)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          lub
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <PasswordLoginForm from={from} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        backgroundImage: "var(--page-gradient)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-elevated)",
          padding: "40px 36px 32px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 15,
              background: "linear-gradient(135deg, var(--accent) 0%, #4b7bff 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 22px rgba(10,132,255,0.35)",
              marginBottom: 18,
            }}
          >
            <Zap size={24} color="#fff" strokeWidth={2.4} />
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            Autorise
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginTop: 6,
              letterSpacing: "0.02em",
            }}
          >
            Panel operacyjny
          </div>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <div
          style={{
            marginTop: 22,
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
            textAlign: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--text-placeholder)",
          }}
        >
          Dostęp tylko dla zespołu Autorise
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
