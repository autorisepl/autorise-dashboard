export type ScriptLineType = "say" | "client" | "note" | "action" | "branch" | "branch-bad";

// Faza 1 fundamentu (2026-08-14): `speech` i `setterNote` są teraz DWOMA fizycznie
// rozdzielonymi polami przez discriminated union, nie tylko konwencją nazewniczą —
// linia typu "note" nie ma pola `speech` w ogóle, więc tekst wewnętrzny (instrukcja dla
// settera) fizycznie nie może się wymieszać z tekstem czytanym klientowi ani zostać
// przez pomyłkę wyrenderowany jako mowa. Wcześniejsza wersja miała jedno pole `text`
// współdzielone przez oba przypadki — to była realna przyczyna trzykrotnego złamania
// tej zasady (2026-08).
//
// Zasada treści `setterNote` (niezmieniona): MUSI być instrukcją co zrobić/powiedzieć
// TERAZ, w trakcie żywej rozmowy ("Jeśli klient powie X, zrób Y") — nigdy wyjaśnieniem
// DLACZEGO linia/krok istnieje, nigdy odniesieniem do wewnętrznej struktury skryptu
// ("Krok b) sekwencji..."), nigdy cytowaniem źródła/rozmowy/dokumentu wewnętrznego
// (Agency Leaders, Arek Burkowski, SZKIC_UMOWA.md). Takie uzasadnienia/źródła należą do
// komentarza TypeScript nad danym Step/Objection, który setter nigdy nie widzi na żywo.
// Krótka, jedno zdanie, limit 120 znaków (miękki), 150 znaków (twardy, weryfikowany).
//
// Nawigację do konkretnej obiekcji zapisuj przez `linkObjectionId` (renderuje się jako
// klikalny przycisk), nie jako zdanie tekstowe "patrz obiekcja X w prawym panelu".
interface ScriptSpeechLine {
  t: Exclude<ScriptLineType, "note">;
  // Treść do przeczytania/pokazania klientowi na żywo (say/client), albo etykieta
  // systemowa nawigacji/akcji (action/branch/branch-bad) — nigdy notatka dla settera.
  text: string | string[];
  // Krótka adnotacja "Cel:" widoczna pod linią `say` — jedno zdanie, wyjaśnia PO CO
  // pada ta kwestia, nie instrukcja co robić (to rola `setterNote` niżej).
  cel?: string;
  // Wersja tej linii dla settera, gdy oryginalna treść zakłada że mówi Michał
  // (Founder) osobiście — np. "prowadzę wdrożenie osobiście". Jeśli brak,
  // linia renderuje się identycznie dla obu ról.
  textSetter?: string | string[];
  // Opcjonalna taktyczna notatka doczepiona do tej konkretnej linii `say`/`client`, gdy
  // sama linia potrzebuje instrukcji "co zrobić TERAZ" obok "Cel:". Ta sama zasada treści
  // i limit długości co w ScriptNoteLine.setterNote wyżej — nigdy nie zastępuje `text`.
  setterNote?: string;
  linkObjectionId?: string;
}

interface ScriptNoteLine {
  t: "note";
  // Jedyne pole treści na tej linii — patrz zasada `setterNote` wyżej. Nie ma `text`,
  // więc nie da się jej przez pomyłkę podłączyć pod renderer mowy.
  setterNote: string;
  linkObjectionId?: string;
}

export type ScriptLine = ScriptSpeechLine | ScriptNoteLine;

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
  // Ta sama zasada co ScriptNoteLine.setterNote wyżej: instrukcja co zrobić przy tej
  // obiekcji TERAZ, nigdy uzasadnienie/źródło/cytat wewnętrzny — te należą do komentarza
  // .ts, nie do `setterNote`. Jedno zdanie, limit 120/150 znaków, patrz zasada wyżej.
  setterNote?: string;
  followup?: string;
  // Krok skryptu do którego wraca rozmowa po tej obiekcji (np. "Po 'tak':
  // przejdź do kroku 2 Otwarcie diagnozy") — renderowany jako NextStepArrow,
  // nie jako gołe zdanie zmieszane z resztą instrukcji w `note`.
  nextStepId?: string;
  stage:
    | "opening"
    | "icp"
    | "diagnoza"
    | "kalkulator"
    | "pitch"
    | "cena"
    | "closing"
    | "wszedzie"
    | "kickoff"
    | "przedkontraktowa";
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
