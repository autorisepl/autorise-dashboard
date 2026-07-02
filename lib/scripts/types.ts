export type ScriptLineType = "say" | "client" | "note" | "action" | "branch" | "branch-bad";

export interface ScriptLine {
  t: ScriptLineType;
  text: string;
}

export interface Step {
  id: string;
  nr: string;
  label: string;
  tag: string;
  duration?: string;
  lines: ScriptLine[];
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
