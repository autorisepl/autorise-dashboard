"use client";

import {
  BookOpen,
  Check,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";

// ── Token viewer ──────────────────────────────────────────────────────

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <button
      onClick={handleCopy}
      style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid #E5E5EA", background: "transparent", cursor: "pointer", color: copied ? "var(--success-text)" : "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontFamily: "var(--font-sans)" }}
    >
      {copied ? <CheckCircle2 size={9} /> : <Copy size={9} />}
      {copied ? "OK" : "Kopiuj"}
    </button>
  );
}

// ── Section title ─────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-tertiary)",
        margin: "28px 0 12px",
        paddingBottom: 8,
        borderBottom: "1px solid #E5E5EA",
      }}
    >
      {children}
    </h2>
  );
}

// ── Color swatch ──────────────────────────────────────────────────────

const COLORS: { name: string; var: string; value: string }[] = [
  { name: "Accent", var: "--accent", value: "#0a84ff" },
  { name: "Accent hover", var: "--accent-hover", value: "#0071e3" },
  { name: "Success", var: "--success", value: "#34c759" },
  { name: "Error", var: "--error", value: "#ff3b30" },
  { name: "Warning", var: "--warning", value: "#ff9500" },
  { name: "Text primary", var: "--text-primary", value: "#1d1d1f" },
  { name: "Text secondary", var: "--text-secondary", value: "#3a3a3c" },
  { name: "Text tertiary", var: "--text-tertiary", value: "#6e6e73" },
  { name: "BG", var: "--bg", value: "#f5f5f7" },
  { name: "BG elevated", var: "--bg-elevated", value: "#ffffff" },
  { name: "Border", var: "--border", value: "rgba(0,0,0,0.08)" },
];

function ColorSwatches() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {COLORS.map((c) => (
        <div
          key={c.var}
          style={{
            background: "#fff",
            border: "1px solid #E5E5EA",
            borderRadius: 10,
            overflow: "hidden",
            width: 140,
          }}
        >
          <div
            style={{
              height: 60,
              background: c.value,
              borderBottom: "1px solid #E5E5EA",
            }}
          />
          <div style={{ padding: "8px 10px" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{c.name}</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-tertiary)", marginBottom: 4 }}>var({c.var})</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-secondary)" }}>{c.value}</span>
              <CopyBtn value={`var(${c.var})`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Typography showcase ───────────────────────────────────────────────

function TypographyShowcase() {
  const sizes: { label: string; size: number; weight: number; example: string }[] = [
    { label: "H1 — Nagłówek strony", size: 24, weight: 700, example: "Autorise Dashboard" },
    { label: "H2 — Sekcja", size: 18, weight: 600, example: "Praca z klientami" },
    { label: "H3 — Karta / Panel", size: 15, weight: 600, example: "Skrypt kwalifikacyjny" },
    { label: "Body — Treść", size: 13, weight: 400, example: "Dzień dobry, Pan Jacek? Mówi Michał z Autorise." },
    { label: "Caption — Opis / Meta", size: 11, weight: 400, example: "Discovery umówione · 3 dni temu" },
    { label: "Label — Badge / Tag", size: 10, weight: 700, example: "NOWY LEAD · KWALIFIKACJA" },
    { label: "Micro — Metadata", size: 9, weight: 600, example: "MÓWISZ · AKCJA · UWAGA" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sizes.map((s) => (
        <div
          key={s.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "10px 14px",
            background: "#fff",
            border: "1px solid #E5E5EA",
            borderRadius: 8,
          }}
        >
          <div style={{ width: 180, flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}>{s.label}</div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "monospace", marginTop: 2 }}>
              {s.size}px / {s.weight}
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: s.size, fontWeight: s.weight, color: "var(--text-primary)", flex: 1, letterSpacing: s.weight >= 700 ? "0.01em" : "normal" }}>
            {s.example}
          </div>
          <CopyBtn value={`fontSize: ${s.size}, fontWeight: ${s.weight}`} />
        </div>
      ))}
    </div>
  );
}

// ── Spacing scale ─────────────────────────────────────────────────────

const SPACING = [4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 64];

function SpacingScale() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
      {SPACING.map((s) => (
        <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div
            style={{
              width: 24,
              height: s,
              background: "var(--accent)",
              opacity: 0.6,
              borderRadius: 2,
            }}
          />
          <span style={{ fontSize: 9, color: "var(--text-tertiary)", fontFamily: "monospace" }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

// ── Border radius scale ───────────────────────────────────────────────

const RADII: { name: string; var: string; value: number }[] = [
  { name: "xs", var: "--radius-xs", value: 6 },
  { name: "sm", var: "--radius-sm", value: 8 },
  { name: "md", var: "--radius-md", value: 12 },
  { name: "lg", var: "--radius-lg", value: 16 },
  { name: "xl", var: "--radius-xl", value: 20 },
];

function RadiusScale() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {RADII.map((r) => (
        <div key={r.var} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 60,
              height: 60,
              background: "var(--accent-muted)",
              border: "1px solid var(--accent-border)",
              borderRadius: r.value,
            }}
          />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>{r.name}</div>
            <div style={{ fontSize: 9, color: "var(--text-tertiary)", fontFamily: "monospace" }}>{r.value}px</div>
            <div style={{ fontSize: 9, color: "var(--accent)", fontFamily: "monospace" }}>var({r.var})</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Button variants ───────────────────────────────────────────────────

function ButtonVariants() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <button style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
        Primary
      </button>
      <button style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "1px solid var(--accent-border)", background: "var(--accent-muted)", color: "var(--accent)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
        Secondary
      </button>
      <button style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "1px solid #E5E5EA", background: "#fff", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 400, cursor: "pointer" }}>
        Default
      </button>
      <button style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "none", background: "var(--error)", color: "#fff", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
        Danger
      </button>
      <button disabled style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "1px solid #E5E5EA", background: "#F5F5F7", color: "var(--text-tertiary)", fontFamily: "var(--font-sans)", fontSize: 13, cursor: "not-allowed" }}>
        Disabled
      </button>
    </div>
  );
}

// ── Status badges ─────────────────────────────────────────────────────

const STATUSES: { label: string; color: string; bg: string }[] = [
  { label: "Nowy lead", color: "#0a84ff", bg: "rgba(10,132,255,0.08)" },
  { label: "Kwalifikacja", color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  { label: "Discovery umówione", color: "#0d9488", bg: "rgba(13,148,136,0.08)" },
  { label: "Finalizacja", color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  { label: "Kickoff", color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  { label: "Retainer", color: "#166534", bg: "rgba(22,101,52,0.08)" },
  { label: "Niekwalifikowany", color: "#6e6e73", bg: "rgba(0,0,0,0.04)" },
  { label: "Nieaktywny (follow up)", color: "#ff9500", bg: "rgba(255,149,0,0.08)" },
];

function StatusBadges() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {STATUSES.map((s) => (
        <div
          key={s.label}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            background: s.bg,
            color: s.color,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "var(--font-sans)",
            letterSpacing: "0.02em",
          }}
        >
          {s.label}
        </div>
      ))}
    </div>
  );
}

// ── Shadow showcase ───────────────────────────────────────────────────

const SHADOWS: { name: string; var: string; value: string }[] = [
  { name: "sm", var: "--shadow-sm", value: "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" },
  { name: "card", var: "--shadow-card", value: "0 2px 8px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)" },
  { name: "elevated", var: "--shadow-elevated", value: "0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)" },
  { name: "menu", var: "--shadow-menu", value: "0 16px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)" },
];

function ShadowShowcase() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
      {SHADOWS.map((s) => (
        <div key={s.var} style={{ textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 80,
              background: "#fff",
              borderRadius: 12,
              boxShadow: s.value,
              marginBottom: 8,
            }}
          />
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>{s.name}</div>
          <div style={{ fontSize: 9, color: "var(--accent)", fontFamily: "monospace" }}>var({s.var})</div>
        </div>
      ))}
    </div>
  );
}

// ── CSS variable reference ────────────────────────────────────────────

const CSS_VARS_GROUPS: { title: string; vars: { name: string; desc: string }[] }[] = [
  {
    title: "Fonty",
    vars: [
      { name: "--font-sans", desc: "Roboto — główny font UI" },
      { name: "--font-mono", desc: "SF Mono — kod, dane numeryczne" },
    ],
  },
  {
    title: "Tła",
    vars: [
      { name: "--bg", desc: "#f5f5f7 — tło strony" },
      { name: "--bg-elevated", desc: "#ffffff — karty, panele" },
      { name: "--bg-sidebar", desc: "rgba(246,246,248,0.94) — sidebar" },
      { name: "--bg-hover", desc: "rgba(0,0,0,0.04) — hover" },
      { name: "--bg-active", desc: "rgba(10,132,255,0.08) — aktywny element" },
    ],
  },
  {
    title: "Akcent",
    vars: [
      { name: "--accent", desc: "#0a84ff — iOS Blue" },
      { name: "--accent-hover", desc: "#0071e3 — hover stanu" },
      { name: "--accent-muted", desc: "rgba(10,132,255,0.10) — tło akcentu" },
      { name: "--accent-border", desc: "rgba(10,132,255,0.25) — obramowanie akcentu" },
    ],
  },
  {
    title: "Statusy",
    vars: [
      { name: "--success", desc: "#34c759 — iOS Green" },
      { name: "--success-text", desc: "#1a7f37 — kontrast AA na jasnym tle" },
      { name: "--success-bg", desc: "rgba(52,199,89,0.12)" },
      { name: "--error", desc: "#ff3b30 — iOS Red" },
      { name: "--error-bg", desc: "rgba(255,59,48,0.10)" },
      { name: "--warning", desc: "#ff9500 — iOS Orange" },
      { name: "--warning-bg", desc: "rgba(255,149,0,0.10)" },
    ],
  },
];

function CssVarReference() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {CSS_VARS_GROUPS.map((g) => (
        <div key={g.title}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", fontFamily: "var(--font-sans)", marginBottom: 6 }}>{g.title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {g.vars.map((v) => (
              <div
                key={v.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "6px 10px",
                  background: "#fff",
                  border: "1px solid #E5E5EA",
                  borderRadius: 7,
                }}
              >
                <code style={{ fontSize: 11, color: "var(--accent)", fontFamily: "monospace", minWidth: 200, flexShrink: 0 }}>{v.name}</code>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-sans)", flex: 1 }}>{v.desc}</span>
                <CopyBtn value={`var(${v.name})`} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function BrandBookPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          borderBottom: "1px solid #E5E5EA",
          background: "#fff",
          flexShrink: 0,
          gap: 12,
        }}
      >
        <BookOpen size={16} color="var(--accent)" strokeWidth={1.8} />
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
          Brand Book
        </span>
        <div style={{ height: 20, width: 1, background: "#E5E5EA" }} />
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}>
          Design system — live CSS variables preview
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px 40px", background: "#F5F5F7" }}>
        <div style={{ maxWidth: 900 }}>
          <SectionTitle>Kolory</SectionTitle>
          <ColorSwatches />

          <SectionTitle>Typografia</SectionTitle>
          <TypographyShowcase />

          <SectionTitle>Spacing (px)</SectionTitle>
          <SpacingScale />

          <SectionTitle>Border Radius</SectionTitle>
          <RadiusScale />

          <SectionTitle>Cienie</SectionTitle>
          <ShadowShowcase />

          <SectionTitle>Przyciski</SectionTitle>
          <ButtonVariants />

          <SectionTitle>Statusy Pipeline</SectionTitle>
          <StatusBadges />

          <SectionTitle>CSS Variables Reference</SectionTitle>
          <CssVarReference />

          {/* Font showcase */}
          <SectionTitle>Roboto — próbka fontowa</SectionTitle>
          <div
            style={{
              background: "#fff",
              border: "1px solid #E5E5EA",
              borderRadius: 12,
              padding: "24px",
            }}
          >
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 32, fontWeight: 300, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 8 }}>
              Autorise — Automatyzacja TSL
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 400, color: "var(--text-secondary)", marginBottom: 8 }}>
              Odzyskujemy dla Ciebie czas biura. Średnio 80 godzin miesięcznie.
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 400, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 8 }}>
              System agentów AI dostosowanych do branży TSL. Agent 01 kwalifikuje leady telefonicznie. Agent 02 przygotowuje brief przed Discovery. Agent 03 personalizuje prezentację. Agent 04 analizuje Discovery Call.
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
              Autorise · Kórnik · 2026
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
