"use client";

import { Check, Copy, MessageSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { buildAllSms, type SmsContext, type SmsScenario } from "@/lib/sms/templates";

const ACCENT = "#1a56ff";

export function SmsPanel({ ctx }: { ctx: SmsContext }) {
  const { suggested, templates } = useMemo(() => buildAllSms(ctx), [ctx]);
  const [active, setActive] = useState<SmsScenario>(suggested);
  const [copied, setCopied] = useState(false);

  const current = templates.find((t) => t.scenario === active) ?? templates[0];

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback dla starszych przeglądarek / braku uprawnień do schowka.
      const el = document.createElement("textarea");
      el.value = current.text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        padding: "18px 24px 20px",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <MessageSquare size={13} color={ACCENT} />
        <span
          style={{
            fontFamily: "var(--font-system)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          SMS do wysłania
        </span>
      </div>

      {/* Przełącznik scenariusza */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {templates.map((t) => {
          const isActive = t.scenario === active;
          const isSuggested = t.scenario === suggested;
          return (
            <button
              key={t.scenario}
              onClick={() => setActive(t.scenario)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 7,
                fontFamily: "var(--font-system)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: isActive ? `${ACCENT}1a` : "transparent",
                color: isActive ? ACCENT : "var(--text-secondary)",
                border: `1px solid ${isActive ? `${ACCENT}50` : "var(--border)"}`,
              }}
            >
              {t.label}
              {isSuggested && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: isActive ? ACCENT : "var(--text-tertiary)",
                    opacity: 0.8,
                  }}
                >
                  sugerowane
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tekst + Kopiuj */}
      <div
        style={{
          position: "relative",
          padding: "14px 16px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 9,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-system)",
            fontSize: 14,
            color: "var(--text-primary)",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            paddingRight: 92,
          }}
        >
          {current.text}
        </div>
        <button
          onClick={copy}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 7,
            fontFamily: "var(--font-system)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            background: copied ? "var(--success-bg)" : `${ACCENT}1a`,
            color: copied ? "var(--success-text)" : ACCENT,
            border: `1px solid ${copied ? "var(--success-border)" : `${ACCENT}50`}`,
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Skopiowano" : "Kopiuj"}
        </button>
      </div>

      <div
        style={{
          marginTop: 8,
          fontFamily: "var(--font-system)",
          fontSize: 11,
          color: "var(--text-tertiary)",
          lineHeight: 1.5,
        }}
      >
        {current.text.length} znaków
        {current.text.length > 160 ? " · 2 wiadomości SMS" : " · 1 wiadomość SMS"}
      </div>
    </div>
  );
}
