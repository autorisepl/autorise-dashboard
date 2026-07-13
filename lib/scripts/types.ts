export type ScriptLineType = "say" | "client" | "note" | "action" | "branch" | "branch-bad";

export interface ScriptLine {
  t: ScriptLineType;
  text: string | string[];
  cel?: string;
  // Wersja tej linii dla settera, gdy oryginalna treść zakłada że mówi Michał
  // (Founder) osobiście — np. "prowadzę wdrożenie osobiście". Jeśli brak,
  // linia renderuje się identycznie dla obu ról.
  textSetter?: string | string[];
  // Note renderowany jako klikalny przycisk skaczący do obiekcji zamiast
  // czystego tekstu instrukcji (patrz obiekcja M365 w diagnoza_tms).
  linkObjectionId?: string;
}

export interface DecisionOption {
  trigger: string;
  action?: string;
  // Gotowa fraza do wypowiedzenia klientowi PO wybraniu tej opcji — odrębna
  // od `action`, które jest instrukcją techniczną dla settera (np. "zaznacz
  // w kalkulatorze"), nie treścią do powiedzenia na głos.
  sayAfter?: string;
  goToStepId?: string;
  openObjectionId?: string;
  tone?: "neutral" | "positive" | "warning";
  calculatorFlag?: string;
}

export interface Decision {
  question: string;
  options: DecisionOption[];
}

export interface Step {
  id: string;
  nr: string;
  label: string;
  tag: string;
  duration?: string;
  lines: ScriptLine[];
  hasCalculator?: boolean;
  hasModuleRecommendation?: boolean;
  // Ten krok ma własne, wbudowane pole liczbowe zasilające kalkulator na
  // bieżąco, w momencie zbierania tej konkretnej informacji od klienta —
  // zamiast osobnego, oderwanego kalkulatora dalej w skrypcie (punkt 9).
  captureField?: "osoby" | "stawka";
  decision?: Decision;
  nextStepId?: string;
}

export interface Objection {
  id: string;
  label: string;
  script?: string;
  sms?: string;
  extra?: string;
  type?: "sms" | "fb";
  note?: string;
  followup?: string;
  stage: "opening" | "icp" | "diagnoza" | "kalkulator" | "pitch" | "cena" | "closing" | "wszedzie";
  decision?: Decision;
}

// Jedna grupa roli w kalkulatorze (np. "Spedytorzy", "Księgowość") — każda ma
// własną liczbę osób, godzin dziennie i stawkę, liczone osobno i sumowane
// razem w podsumowaniu (patrz punkt 18: różne role mają różne stawki/godziny).
export interface CalculatorGroup {
  id: string;
  label: string;
  osoby: number;
  godziny: number;
  stawka: number;
}

export interface IcpRule {
  ok: boolean;
  label: string;
  val: string;
}

export interface MsgItem {
  id: string;
  group: string;
  label: string;
  text: string;
}

export function objectionColor(label: string): { bg: string; accent: string; category: string } {
  if (/czas|odbioru|komentarz|urlop/i.test(label))
    return { bg: "rgba(59,130,246,0.06)", accent: "#3b82f6", category: "Logistyczne" };
  if (/zastanow|pomyśl|przemyśl|priorytety|tydzień|znać|przespać/i.test(label))
    return { bg: "rgba(251,191,36,0.08)", accent: "#f59e0b", category: "Niezdecydowanie" };
  if (/drogo|budżet|finans|przekonany|raty/i.test(label))
    return { bg: "rgba(239,68,68,0.06)", accent: "#ef4444", category: "Finanse" };
  if (/żon|partner|wspólnik|decydent|syn/i.test(label))
    return { bg: "rgba(139,92,246,0.06)", accent: "#8b5cf6", category: "Decydenci" };
  if (/system|program|pracownik|firm|demo|konkurencj/i.test(label))
    return { bg: "rgba(20,184,166,0.06)", accent: "#14b8a6", category: "Produkt" };
  return { bg: "transparent", accent: "var(--text-tertiary)", category: "Inne" };
}
