"use client";

import { Eye, EyeOff, Loader2, Lock, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setError("");
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        router.push(params.get("from") ?? "/agenci");
        router.refresh();
      } else {
        setError(json.error ?? "Błąd logowania");
        setPassword("");
      }
    } catch {
      setError("Błąd połączenia");
    } finally {
      setLoading(false);
    }
  };

  const borderColor = error
    ? "var(--error-border)"
    : focused
      ? "var(--border-focus)"
      : "var(--border)";

  return (
    <form onSubmit={handleSubmit}>
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
          Hasło dostępu
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
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="••••••••••••"
            autoFocus
            style={{
              width: "100%",
              padding: "12px 40px",
              boxSizing: "border-box",
              background: "var(--bg-elevated)",
              border: `1px solid ${borderColor}`,
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              color: "var(--text-primary)",
              outline: "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
              letterSpacing: "0.12em",
              boxShadow: focused && !error ? "0 0 0 3px var(--accent-muted)" : "none",
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
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--error)", marginTop: 8 }}>
            {error}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!password || loading}
        style={{
          width: "100%",
          padding: "12px",
          background: password && !loading ? "var(--accent)" : "var(--bg-hover)",
          color: password && !loading ? "#fff" : "var(--text-tertiary)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 600,
          cursor: password && !loading ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "all 0.15s",
          boxShadow: password && !loading ? "0 4px 16px rgba(10,132,255,0.30)" : "none",
        }}
      >
        {loading && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
        {loading ? "Logowanie…" : "Wejdź"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        backgroundImage: "var(--page-gradient)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        padding: "0 20px",
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
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
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6, letterSpacing: "0.02em" }}>
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
