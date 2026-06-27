// Generator wiadomości SMS do ręcznej wysyłki (kopiuj-wklej, bez API).
// Tekst budowany dynamicznie z danych Agenta 1: imię, data i godzina spotkania.
// Trzy scenariusze: Discovery umówione / klient oddzwoni / poza ICP.

export type SmsScenario = "discovery" | "callback" | "out_of_icp";

export interface SmsContext {
  imieNazwisko?: string | null;
  data?: string | null;
  godzina?: string | null;
  dyskwalifikacja?: boolean | null;
  kwalifikacja?: string | null;
}

export interface SmsTemplate {
  scenario: SmsScenario;
  label: string;
  text: string;
}

const SIGNATURE = "— Autorise";

// Pierwsze imię z pełnej nazwy ("Artsiom Biahun" → "Artsiom"). Pusty → forma ogólna.
function firstName(full?: string | null): string {
  const name = (full ?? "").trim().split(/\s+/)[0];
  return name && /^[\p{L}]+$/u.test(name) ? name : "";
}

function greeting(name: string): string {
  return name ? `Dzień dobry ${name},` : "Dzień dobry,";
}

// Automatyczny dobór scenariusza na podstawie wyniku Agenta 1.
export function pickScenario(ctx: SmsContext): SmsScenario {
  const kwal = (ctx.kwalifikacja ?? "").toUpperCase();
  if (ctx.dyskwalifikacja === true || kwal.includes("NIE KWALIFIKUJE")) return "out_of_icp";
  if (ctx.data) return "discovery";
  return "callback";
}

function discoveryText(ctx: SmsContext): string {
  const hello = greeting(firstName(ctx.imieNazwisko));
  const kiedy = ctx.data
    ? ` Potwierdzam nasze spotkanie ${ctx.data}${ctx.godzina ? ` o godz. ${ctx.godzina}` : ""}.`
    : " Potwierdzam nasze najbliższe spotkanie.";
  return `${hello} dziękuję za rozmowę.${kiedy} Do usłyszenia! ${SIGNATURE}`;
}

function callbackText(ctx: SmsContext): string {
  const hello = greeting(firstName(ctx.imieNazwisko));
  return `${hello} dziękuję za dzisiejszą rozmowę. Czekam na kontakt z Pana/Pani strony — w razie pytań jestem do dyspozycji. ${SIGNATURE}`;
}

function outOfIcpText(ctx: SmsContext): string {
  const hello = greeting(firstName(ctx.imieNazwisko));
  return `${hello} dziękuję za rozmowę i poświęcony czas. Na ten moment nasze rozwiązanie nie będzie optymalnie dopasowane do Państwa potrzeb. Pozostaję w kontakcie, gdyby sytuacja się zmieniła. ${SIGNATURE}`;
}

export function buildSms(scenario: SmsScenario, ctx: SmsContext): string {
  if (scenario === "discovery") return discoveryText(ctx);
  if (scenario === "out_of_icp") return outOfIcpText(ctx);
  return callbackText(ctx);
}

export const SCENARIO_LABELS: Record<SmsScenario, string> = {
  discovery: "Discovery umówione",
  callback: "Klient oddzwoni",
  out_of_icp: "Poza ICP",
};

// Wszystkie trzy gotowe szablony (do przełączania w UI) + sugerowany scenariusz.
export function buildAllSms(ctx: SmsContext): { suggested: SmsScenario; templates: SmsTemplate[] } {
  const suggested = pickScenario(ctx);
  const order: SmsScenario[] = ["discovery", "callback", "out_of_icp"];
  return {
    suggested,
    templates: order.map((scenario) => ({
      scenario,
      label: SCENARIO_LABELS[scenario],
      text: buildSms(scenario, ctx),
    })),
  };
}
