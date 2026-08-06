"use client";

import { Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DemoStepTimeline } from "@/components/demo/DemoStepTimeline";
import { demoColors, demoFont } from "@/components/demo/demoTheme";
import { ManagementDashboard } from "@/components/demo/ManagementDashboard";
import { Step1Gielda } from "@/components/demo/steps/Step1Gielda";
import { Step2Tms } from "@/components/demo/steps/Step2Tms";
import { Step3WebFleet } from "@/components/demo/steps/Step3WebFleet";
import { Step4Cmr } from "@/components/demo/steps/Step4Cmr";
import { Step5Faktura } from "@/components/demo/steps/Step5Faktura";
import { Step6Powiadomienie } from "@/components/demo/steps/Step6Powiadomienie";

const STEP_LABELS = [
  "Giełda",
  "HMSoft",
  "WebFleet",
  "CMR / POD",
  "Faktura",
  "Powiadomienie",
] as const;

const STEP_TITLES = [
  "Krok 1. Nowe zlecenie z giełdy.",
  "Krok 2. Zapis w HMSoft.",
  "Krok 3. Trasa do kierowcy przez WebFleet.",
  "Krok 4. Odczyt CMR.",
  "Krok 5. Faktura do zlecenia.",
  "Krok 6. Powiadomienie automatyczne.",
] as const;

// §10 ust. 3 umowy: zaksięgowanie faktury i wysłanie powiadomienia do kontrahenta wymagają
// tego samego jednoklikowego potwierdzenia spedytora co odczyt CMR — kroki 4, 5, 6 (indeksy
// 3, 4, 5) blokują automatyczne przejście dalej (ręczne i autoplay) do czasu potwierdzenia.
const GATE_STEP_INDEXES = new Set([3, 4, 5]);

const AUTOPLAY_INTERVAL_MS = 4200;

type View = "zlecenie" | "dashboard";

export default function DemoArekPage() {
  const [view, setView] = useState<View>("zlecenie");
  const [step, setStep] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [confirmedGates, setConfirmedGates] = useState<Set<number>>(new Set());

  const lastStep = STEP_LABELS.length - 1;
  const gatePending = GATE_STEP_INDEXES.has(step) && !confirmedGates.has(step);

  const goTo = useCallback((next: number) => {
    setStep(Math.max(0, Math.min(STEP_LABELS.length - 1, next)));
  }, []);

  const confirmGate = useCallback((index: number) => {
    setConfirmedGates((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    if (step >= lastStep) {
      setAutoplay(false);
      return;
    }
    if (GATE_STEP_INDEXES.has(step) && !confirmedGates.has(step)) return;
    const t = setTimeout(() => setStep((s) => Math.min(lastStep, s + 1)), AUTOPLAY_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [autoplay, step, lastStep, confirmedGates]);

  const restart = useCallback(() => {
    setStep(0);
    setConfirmedGates(new Set());
    setAutoplay(true);
  }, []);

  const stepContent = useMemo(() => {
    switch (step) {
      case 0:
        return <Step1Gielda />;
      case 1:
        return <Step2Tms active={step === 1} />;
      case 2:
        return <Step3WebFleet />;
      case 3:
        return (
          <Step4Cmr
            active={step === 3}
            confirmed={confirmedGates.has(3)}
            onConfirm={() => confirmGate(3)}
          />
        );
      case 4:
        return (
          <Step5Faktura
            active={step === 4}
            confirmed={confirmedGates.has(4)}
            onConfirm={() => confirmGate(4)}
          />
        );
      case 5:
        return (
          <Step6Powiadomienie
            active={step === 5}
            confirmed={confirmedGates.has(5)}
            onConfirm={() => confirmGate(5)}
          />
        );
      default:
        return null;
    }
  }, [step, confirmedGates, confirmGate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: demoColors.bg,
        backgroundImage: demoColors.bgGradient,
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "48px 32px 96px" }}>
        {/* Wordmark produktu */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: demoFont.sans, fontSize: 16, lineHeight: 1.3 }}>
            <span style={{ fontWeight: 800, color: demoColors.textPrimary }}>Autorise</span>
            <span style={{ color: demoColors.textTertiary }}>
              {" "}
              — System Operacyjny Firmy Transportowej
            </span>
          </div>
        </div>

        {/* Przełącznik części */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setView("zlecenie")}
            style={tabButtonStyle(view === "zlecenie")}
          >
            Część 1 · Jedno zlecenie
          </button>
          <button
            type="button"
            onClick={() => setView("dashboard")}
            style={tabButtonStyle(view === "dashboard")}
          >
            Część 2 · Dashboard zarządczy
          </button>
        </div>

        <h1
          style={{
            fontFamily: demoFont.sans,
            fontSize: "clamp(20px, 2.4vw, 26px)",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: demoColors.textPrimary,
            margin: "0 0 24px",
          }}
        >
          {view === "zlecenie" ? STEP_TITLES[step] : "Dashboard zarządczy."}
        </h1>

        {view === "zlecenie" ? (
          <div style={{ maxWidth: 820 }}>
            <div
              style={{
                background: demoColors.surface,
                border: `1px solid ${demoColors.border}`,
                borderRadius: 18,
                padding: 20,
                boxShadow: demoColors.cardShadow,
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <DemoStepTimeline labels={STEP_LABELS} activeIndex={step} onSelect={goTo} />
              </div>

              <div
                style={{
                  background: demoColors.bg,
                  border: `1px solid ${demoColors.border}`,
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                {stepContent}
              </div>

              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  disabled={step === 0}
                  style={navButtonStyle(step === 0)}
                >
                  Poprzedni krok
                </button>

                <button
                  type="button"
                  onClick={restart}
                  style={{ ...ghostButtonStyle, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <RotateCcw size={13} />
                  Odtwórz od nowa
                </button>

                {step < lastStep ? (
                  <button
                    type="button"
                    onClick={() => goTo(step + 1)}
                    disabled={gatePending}
                    style={{
                      ...primaryButtonStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      opacity: gatePending ? 0.4 : 1,
                      cursor: gatePending ? "default" : "pointer",
                    }}
                  >
                    {autoplay ? null : <Play size={13} />}
                    Następny krok
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setView("dashboard")}
                    style={{ ...primaryButtonStyle, display: "flex", alignItems: "center", gap: 6 }}
                  >
                    Koniec przepływu, zobacz dashboard zarządczy
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: demoColors.surface,
              border: `1px solid ${demoColors.border}`,
              borderRadius: 18,
              padding: 24,
              boxShadow: demoColors.cardShadow,
            }}
          >
            <ManagementDashboard />
          </div>
        )}
      </div>
    </div>
  );
}

const buttonBase = {
  fontFamily: demoFont.sans,
  fontSize: 13,
  fontWeight: 600,
  height: 36,
  padding: "0 16px",
  borderRadius: 8,
  cursor: "pointer",
} as const;

function navButtonStyle(disabled: boolean) {
  return {
    ...buttonBase,
    background: "transparent",
    border: `1px solid ${demoColors.border}`,
    color: disabled ? demoColors.textTertiary : demoColors.textSecondary,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}

function tabButtonStyle(active: boolean) {
  return {
    ...buttonBase,
    background: active ? demoColors.accent : "transparent",
    border: active ? "none" : `1px solid ${demoColors.border}`,
    color: active ? "#1a1207" : demoColors.textSecondary,
  };
}

const ghostButtonStyle = {
  ...buttonBase,
  background: "transparent",
  border: "none",
  color: demoColors.textTertiary,
};

const primaryButtonStyle = {
  ...buttonBase,
  background: demoColors.accent,
  border: "none",
  color: "#1a1207",
};
