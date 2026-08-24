"use client";

import {
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  GripVertical,
  Lock,
  LogOut,
  Mail,
  Phone,
  Settings,
  UserCircle2,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

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
      style={{
        padding: "3px 8px",
        borderRadius: 5,
        border: "1px solid var(--border)",
        background: "transparent",
        cursor: "pointer",
        color: copied ? "var(--success-text)" : "var(--text-tertiary)",
        display: "flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        fontFamily: "var(--font-sans)",
      }}
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
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </h2>
  );
}

// ── Color swatch ──────────────────────────────────────────────────────

const COLORS: { name: string; var: string; value: string }[] = [
  { name: "Accent", var: "--accent", value: "#4379b1" },
  { name: "Accent hover", var: "--accent-hover", value: "#5588be" },
  { name: "Success", var: "--success", value: "#2fa262" },
  { name: "Error", var: "--error", value: "#c8483f" },
  { name: "Warning", var: "--warning", value: "#9e6a2e" },
  { name: "Text primary", var: "--text-primary", value: "#eeeae4" },
  { name: "Text secondary", var: "--text-secondary", value: "#b8b4ad" },
  { name: "Text tertiary", var: "--text-tertiary", value: "#8d8a84" },
  { name: "BG", var: "--bg", value: "#17181b" },
  { name: "BG elevated", var: "--bg-elevated", value: "#201f23" },
  { name: "Border", var: "--border", value: "rgba(255,255,255,0.08)" },
];

function ColorSwatches() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {COLORS.map((c) => (
        <div
          key={c.var}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
            width: 140,
          }}
        >
          <div
            style={{
              height: 60,
              background: c.value,
              borderBottom: "1px solid var(--border)",
            }}
          />
          <div style={{ padding: "8px 10px" }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 2,
              }}
            >
              {c.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                color: "var(--text-tertiary)",
                marginBottom: 4,
              }}
            >
              var({c.var})
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-secondary)" }}
              >
                {c.value}
              </span>
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
    {
      label: "Body — Treść",
      size: 13,
      weight: 400,
      example: "Dzień dobry, Pan Jacek? Mówi Michał z Autorise.",
    },
    {
      label: "Caption — Opis / Meta",
      size: 11,
      weight: 400,
      example: "Discovery umówione · 3 dni temu",
    },
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
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
        >
          <div style={{ width: 180, flexShrink: 0 }}>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontFamily: "monospace",
                marginTop: 2,
              }}
            >
              {s.size}px / {s.weight}
            </div>
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: s.size,
              fontWeight: s.weight,
              color: "var(--text-primary)",
              flex: 1,
              letterSpacing: s.weight >= 700 ? "0.01em" : "normal",
            }}
          >
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
        <div
          key={s}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
        >
          <div
            style={{
              width: 24,
              height: s,
              background: "var(--accent)",
              opacity: 0.6,
              borderRadius: 2,
            }}
          />
          <span style={{ fontSize: 9, color: "var(--text-tertiary)", fontFamily: "monospace" }}>
            {s}
          </span>
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
        <div
          key={r.var}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
        >
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
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {r.name}
            </div>
            <div style={{ fontSize: 9, color: "var(--text-tertiary)", fontFamily: "monospace" }}>
              {r.value}px
            </div>
            <div style={{ fontSize: 9, color: "var(--accent)", fontFamily: "monospace" }}>
              var({r.var})
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Panel — jeden wzorzec dla całego Autorise (Blok 2, punkt 2.3, 2026-07-15) ──────────

// components/ui/Panel.tsx to JEDYNY dozwolony wzorzec "karty"/panelu w dashboardzie:
// var(--glass) + var(--glass-blur) + border var(--glass-border) + var(--radius-lg) +
// var(--shadow) (glass-shadow). Nie twórz ad-hoc divów z ręcznie wpisanym
// background/border/radius żeby "wyglądały jak panel" — importuj Panel i przekaż
// dzieci/padding/style. Audyt tej sesji znalazł ~10 miejsc z ręcznym odtworzeniem stylu
// glass (drobne odchylenia: inny radius, inny border, brak cienia) — największe z nich to
// karty w Agent0Card.tsx i AgentsOverview.tsx (mają hover/transition, którego Panel dziś nie
// replikuje w pełni) — świadomie NIE przepisane w tej sesji bez możliwości weryfikacji
// wizualnej na żywo (brak przeglądarki), do zrobienia w sesji z realnym podglądem zrzutów.
function PanelShowcase() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          To jest &lt;Panel&gt; z domyślnym paddingiem (16px)
        </div>
        <div
          style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)" }}
        >
          background: var(--glass) · backdrop-filter: var(--glass-blur) · border:
          var(--glass-border) · border-radius: var(--radius-lg) · box-shadow: var(--glass-shadow)
        </div>
      </Panel>
      <Panel padding={12}>
        <div
          style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)" }}
        >
          To samo z padding={"{12}"} — jedyny parametr który realnie różni się między zastosowaniami
          (kompaktowe listy vs pełne karty).
        </div>
      </Panel>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          color: "var(--text-tertiary)",
          lineHeight: 1.6,
        }}
      >
        Użycie: <code>import {"{ Panel }"} from "@/components/ui/Panel"</code>. Props:{" "}
        <code>children</code>, <code>padding</code> (domyślnie 16), <code>style</code> (nadpisania
        punktowe), <code>onClick</code> (dodaje cursor: pointer automatycznie),{" "}
        <code>className</code>.
      </div>
    </div>
  );
}

// ── Button variants ───────────────────────────────────────────────────

function ButtonVariants() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <button
        style={{
          height: 36,
          padding: "0 16px",
          borderRadius: 8,
          border: "none",
          background: "var(--accent)",
          color: "#fff",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Primary
      </button>
      <button
        style={{
          height: 36,
          padding: "0 16px",
          borderRadius: 8,
          border: "1px solid var(--accent-border)",
          background: "var(--accent-muted)",
          color: "var(--accent)",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Secondary
      </button>
      <button
        style={{
          height: 36,
          padding: "0 16px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 400,
          cursor: "pointer",
        }}
      >
        Default
      </button>
      <button
        style={{
          height: 36,
          padding: "0 16px",
          borderRadius: 8,
          border: "none",
          background: "var(--error)",
          color: "#fff",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Danger
      </button>
      <button
        disabled
        style={{
          height: 36,
          padding: "0 16px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--bg-hover)",
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          cursor: "not-allowed",
        }}
      >
        Disabled
      </button>
    </div>
  );
}

// ── Karta klienta (Kanban) ──────────────────────────────────────────────

// Statyczna replika ClientCard z app/(dashboard)/pipeline/page.tsx (nie import realnego
// komponentu — tamten jest prywatny wewnątrz strony i sprzężony z @dnd-kit/PipelineClientDetailed
// na żywych danych, więc dokumentujemy tu wyłącznie WYGLĄD, ten sam wzorzec co ShadowShowcase/
// PanelShowcase niżej). Dwa stany: zablokowana (status ustawiany rozmową kwalifikacyjną/
// sprzedażową, próba przeciągnięcia pokazuje toast zamiast ruszać kartę) i odblokowana
// (Finalizacja/Kickoff/Wdrożenie/Retainer, przeciągalna między tymi czterema kolumnami).
function BrandBookIconCircle({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: "var(--bg-elevated)",
        border: "1px solid rgba(255,255,255,0.22)",
        flexShrink: 0,
      }}
    >
      <Icon size={12} strokeWidth={2.5} color="var(--text-primary)" />
    </div>
  );
}

function BrandBookClientCard({ locked }: { locked: boolean }) {
  return (
    <div
      style={{
        width: 260,
        padding: "10px 12px",
        background: "var(--bg)",
        border: "1px solid rgba(255,255,255,0.22)",
        borderRadius: "var(--radius-sm)",
        boxShadow: "var(--shadow-sm)",
        cursor: locked ? "default" : "grab",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#f97316",
            flexShrink: 0,
          }}
        />
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            flex: 1,
          }}
        >
          Jan Kowalski
        </div>
        {!locked && <GripVertical size={14} color="var(--text-tertiary)" />}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <BrandBookIconCircle icon={Building2} />
        <span
          style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-primary)" }}
        >
          Kowalski Logistics Sp. z o.o.
        </span>
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--accent-text)",
            background: "var(--accent-muted)",
            padding: "3px 7px",
            borderRadius: "var(--radius-xs)",
            fontFamily: "var(--font-sans)",
          }}
        >
          ICP Wysoki
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-primary)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            padding: "3px 7px",
            borderRadius: "var(--radius-xs)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <Clock size={12} strokeWidth={2.5} color="var(--text-primary)" />4 dni temu
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          paddingTop: 6,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BrandBookIconCircle icon={Phone} />
          <span
            style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-primary)" }}
          >
            +48 600 100 200
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BrandBookIconCircle icon={Mail} />
          <span
            style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-primary)" }}
          >
            jan@kowalski-logistics.pl
          </span>
        </div>
      </div>
    </div>
  );
}

function ClientCardShowcase() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
      <div>
        <BrandBookClientCard locked />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginTop: 8,
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          <Lock size={11} />
          Zablokowana — status ustawia rozmowa w /kwalifikacja lub /sprzedaz
        </div>
      </div>
      <div>
        <BrandBookClientCard locked={false} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginTop: 8,
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          <GripVertical size={11} />
          Odblokowana — przeciągalna między Finalizacja/Kickoff/Wdrożenie/Retainer
        </div>
      </div>
    </div>
  );
}

// ── Status badges ─────────────────────────────────────────────────────

// Zgodne 1:1 z STATUS_COLORS w app/(dashboard)/pipeline/page.tsx — ten sam zestaw 11
// statusów w tej samej kolejności. Zsynchronizowane 2026-08-24 po rundzie poprawek Kanbanu
// (redesign sekcji makro-etapów), która zmieniła wszystkie wartości poza Upsell/Zakończona
// współpraca — Brand Book miał nadal stare hexy sprzed tej rundy, rozjechany z realną kartą.
const STATUSES: { label: string; color: string; bg: string }[] = [
  { label: "Nowy lead", color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  { label: "Kwalifikacja", color: "#c026d3", bg: "rgba(192,38,211,0.08)" },
  { label: "Discovery umówione", color: "#06b6d4", bg: "rgba(6,182,212,0.08)" },
  { label: "Niekwalifikowany", color: "#6b7280", bg: "rgba(107,114,128,0.08)" },
  { label: "Nieaktywny (follow up)", color: "#eab308", bg: "rgba(234,179,8,0.08)" },
  { label: "Finalizacja", color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  { label: "Kickoff", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  { label: "Wdrożenie", color: "#14b8a6", bg: "rgba(20,184,166,0.08)" },
  { label: "Retainer", color: "#e879f9", bg: "rgba(232,121,249,0.08)" },
  { label: "Upsell", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)" },
  { label: "Zakończona współpraca", color: "#7c8a9c", bg: "rgba(124,138,156,0.08)" },
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

// ── Sidebar — karta użytkownika ─────────────────────────────────────────

// Statyczny podgląd finalnego wzorca z components/layout/sidebar.tsx (Część A redesignu
// sidebara, 2026-08-24) — avatar, imię/rola, licznik sesji, ikony ustawień/wylogowania.
// Nie musi być funkcjonalne wewnątrz Brand Booka (ten sam wzorzec co reszta strony), tylko
// dokumentować wygląd obok Paneli/Przycisków.
function SidebarUserCardShowcase() {
  return (
    <div
      style={{
        width: 260,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-sidebar)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <UserCircle2 size={18} color="var(--text-secondary)" strokeWidth={1.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Michał Roth
          </div>
          <div
            style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-tertiary)" }}
          >
            Founder · Sesja 1h 24m
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            color: "var(--text-secondary)",
          }}
        >
          <Settings size={15} strokeWidth={1.6} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            color: "var(--error-text)",
          }}
        >
          <LogOut size={15} strokeWidth={1.6} />
        </div>
      </div>
    </div>
  );
}

// ── Shadow showcase ───────────────────────────────────────────────────

const SHADOWS: { name: string; var: string; value: string }[] = [
  {
    name: "sm",
    var: "--shadow-sm",
    value: "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  },
  {
    name: "card",
    var: "--shadow-card",
    value: "0 2px 8px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)",
  },
  {
    name: "elevated",
    var: "--shadow-elevated",
    value: "0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
  },
  {
    name: "menu",
    var: "--shadow-menu",
    value: "0 16px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
  },
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
              background: "var(--bg-card)",
              borderRadius: 12,
              boxShadow: s.value,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {s.name}
          </div>
          <div style={{ fontSize: 9, color: "var(--accent)", fontFamily: "monospace" }}>
            var({s.var})
          </div>
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
      { name: "--bg", desc: "#17181b — tło strony (grafit)" },
      { name: "--bg-elevated", desc: "#201f23 — karty, panele" },
      { name: "--bg-sidebar", desc: "rgba(23,24,27,0.94) — sidebar" },
      { name: "--bg-hover", desc: "rgba(255,255,255,0.06) — hover" },
      { name: "--bg-active", desc: "rgba(67,121,177,0.14) — aktywny element" },
    ],
  },
  {
    title: "Akcent",
    vars: [
      { name: "--accent", desc: "#4379b1 — stonowany stalowy niebieski" },
      { name: "--accent-hover", desc: "#5588be — hover stanu" },
      { name: "--accent-muted", desc: "rgba(67,121,177,0.16) — tło akcentu" },
      { name: "--accent-border", desc: "rgba(67,121,177,0.35) — obramowanie akcentu" },
    ],
  },
  {
    title: "Statusy",
    vars: [
      { name: "--success", desc: "#2fa262 — zielony" },
      { name: "--success-text", desc: "#6bdb9c — kontrast AA na ciemnym tle" },
      { name: "--success-bg", desc: "rgba(47,162,98,0.16)" },
      { name: "--error", desc: "#c8483f — czerwony" },
      { name: "--error-text", desc: "#ff9992 — kontrast AA na ciemnym tle" },
      { name: "--error-bg", desc: "rgba(200,72,63,0.16)" },
      { name: "--warning", desc: "#9e6a2e — bursztynowy" },
      { name: "--warning-text", desc: "#f2bd70 — kontrast AA na ciemnym tle" },
      { name: "--warning-bg", desc: "rgba(158,106,46,0.16)" },
    ],
  },
];

function CssVarReference() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {CSS_VARS_GROUPS.map((g) => (
        <div key={g.title}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              marginBottom: 6,
            }}
          >
            {g.title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {g.vars.map((v) => (
              <div
                key={v.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "6px 10px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                }}
              >
                <code
                  style={{
                    fontSize: 11,
                    color: "var(--accent)",
                    fontFamily: "monospace",
                    minWidth: 200,
                    flexShrink: 0,
                  }}
                >
                  {v.name}
                </code>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-sans)",
                    flex: 1,
                  }}
                >
                  {v.desc}
                </span>
                <CopyBtn value={`var(${v.name})`} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Placeholdery w skryptach ──────────────────────────────────────────

interface PlaceholderEntry {
  token: string;
  description: string;
  source: string;
  example: string;
}

const PLACEHOLDERS: PlaceholderEntry[] = [
  {
    token: "{IMIĘ}",
    description: "Wołacz imienia klienta (np. 'Michale', 'Anno')",
    source: "Pole kontakt w Pipeline — obliczane przez toVocative() w /kwalifikacja i /sprzedaz",
    example: "Dzień dobry, Pan {IMIĘ} → Dzień dobry, Pan Michał",
  },
  {
    token: "Pan {IMIĘ}",
    description: "Forma oficjalna z mianownikiem imienia (nie wołaczem)",
    source: "Pole kontakt w Pipeline — fill() podstawia nominatyw (pierwsze słowo pola kontakt)",
    example: "Dzień dobry, Pan {IMIĘ}? → Dzień dobry, Pan Jacek?",
  },
  {
    token: "Pani {IMIĘ}",
    description: "Forma żeńska z mianownikiem imienia",
    source: "Pole kontakt w Pipeline — analogicznie jak Pan {IMIĘ}",
    example: "Dzień dobry, Pani {IMIĘ}? → Dzień dobry, Pani Anna?",
  },
  {
    token: "[LICZBA Z KALKULATORA]",
    description: "Wynik godzin miesięcznie z kalkulatora ROI inline",
    source: "ScriptKalkulator w /kwalifikacja krok 2.6 — osoby × godziny × 22",
    example: "Policzyłem: [LICZBA Z KALKULATORA] godzin miesięcznie → 132 godziny miesięcznie",
  },
  {
    token: "[WYNIK Z KALKULATORA]",
    description: "Gotowe zdanie z wynikiem kalkulatora do wypowiedzenia na głos",
    source: "ScriptKalkulator — gotowe zdanie: 'Przy X osobach i Y godzinach dziennie...'",
    example:
      "Zdanie: Przy 2 osobach i 3 godzinach dziennie — to 132 godziny miesięcznie, czyli 6 600 zł kosztu pracy. Rocznie 79 200 zł.",
  },
  {
    token: "[WARTOŚĆ PLN]",
    description: "Wartość miesięczna kosztu pracy w złotych (osoby × godziny × 22 × 50 zł/h)",
    source: "ScriptKalkulator — pole miesieczniePLN",
    example: "To [WARTOŚĆ PLN] zł miesięcznie tylko na ręczną robotę → 6 600 zł miesięcznie",
  },
];

function PlaceholderySkryptow() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(67,121,177,0.05)",
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
        }}
      >
        Wszystkie placeholdery aktywne w skryptach STEPS_K i STEPS_D
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {PLACEHOLDERS.map((p, i) => (
          <div
            key={p.token}
            style={{
              padding: "14px 18px",
              borderBottom: i < PLACEHOLDERS.length - 1 ? "1px solid #F0F0F5" : "none",
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--accent)",
                minWidth: 180,
                flexShrink: 0,
                background: "rgba(67,121,177,0.12)",
                borderRadius: 6,
                padding: "4px 10px",
                letterSpacing: "0.01em",
              }}
            >
              {p.token}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {p.description}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                Źródło: {p.source}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  background: "var(--bg-hover)",
                  borderRadius: 5,
                  padding: "4px 8px",
                  lineHeight: 1.5,
                }}
              >
                {p.example}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function BrandBookPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <PageHeader icon={<BookOpen size={15} color="var(--accent)" />} title="Brand Book">
        <div style={{ height: 20, width: 1, background: "var(--border)" }} />
        <span
          style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}
        >
          Design system — live CSS variables preview
        </span>
      </PageHeader>

      {/* Scrollable content */}
      <div
        style={{ flex: 1, overflowY: "auto", padding: "8px 24px 40px", background: "var(--bg)" }}
      >
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

          <SectionTitle>Panele</SectionTitle>
          <PanelShowcase />

          <SectionTitle>Przyciski</SectionTitle>
          <ButtonVariants />

          <SectionTitle>Statusy Pipeline</SectionTitle>
          <StatusBadges />

          <SectionTitle>Karta klienta (Kanban)</SectionTitle>
          <ClientCardShowcase />

          <SectionTitle>Sidebar — karta użytkownika</SectionTitle>
          <SidebarUserCardShowcase />

          <SectionTitle>CSS Variables Reference</SectionTitle>
          <CssVarReference />

          {/* Font showcase */}
          <SectionTitle>Placeholdery w skryptach</SectionTitle>
          <PlaceholderySkryptow />

          <SectionTitle>Roboto — próbka fontowa</SectionTitle>
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "24px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 32,
                fontWeight: 300,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                marginBottom: 8,
              }}
            >
              Autorise — Automatyzacja TSL
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 18,
                fontWeight: 400,
                color: "var(--text-secondary)",
                marginBottom: 8,
              }}
            >
              Odzyskujemy dla Ciebie czas biura. Średnio 80 godzin miesięcznie.
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 400,
                color: "var(--text-secondary)",
                lineHeight: 1.65,
                marginBottom: 8,
              }}
            >
              System agentów AI dostosowanych do branży TSL. Agent 01 kwalifikuje leady
              telefonicznie. Agent 02 przygotowuje brief przed Discovery. Agent 03 personalizuje
              prezentację. Agent 04 analizuje Discovery Call.
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              Autorise · Kórnik · 2026
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
