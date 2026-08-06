// Paleta wyłącznie dla prezentacji /demo-arek — świadomie osobna od tokenów dashboardu
// (app/globals.css), bo to ma być produkt sprzedażowy dla jednego klienta, nie kolejny
// ekran panelu administracyjnego. Ciepły grafit + bursztyn (kontekst transportowy), nie
// stalowy niebieski dashboardu.

export const demoColors = {
  bg: "#0b0c0e",
  bgGradient: "radial-gradient(circle at 15% 0%, #1a1610 0%, #0b0c0e 45%)",
  surface: "#16171a",
  surfaceRaised: "#1d1e22",
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.14)",
  accent: "#f0973b",
  accentSoft: "rgba(240, 151, 59, 0.14)",
  accentBorder: "rgba(240, 151, 59, 0.35)",
  textPrimary: "#f5f2ec",
  textSecondary: "#b6b0a5",
  textTertiary: "#8f8a7d",
  success: "#5fbf8f",
  successBg: "rgba(95, 191, 143, 0.12)",
  successBorder: "rgba(95, 191, 143, 0.3)",
  terminalBg: "#0d1117",
  terminalGreen: "#7ee787",
  terminalDim: "#8b949e",
  terminalText: "#c9d1d9",
  warning: "#c98a3a",
  warningBg: "rgba(201, 138, 58, 0.1)",
  warningBorder: "rgba(201, 138, 58, 0.3)",
  cardShadow: "0 1px 2px rgba(0,0,0,0.35), 0 10px 28px -14px rgba(0,0,0,0.55)",
} as const;

export const demoFont = {
  sans: "var(--font-sans)",
  mono: "var(--font-jetbrains-mono), 'SF Mono', Menlo, monospace",
} as const;
