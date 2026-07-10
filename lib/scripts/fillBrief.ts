import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";

function formatPln(value: number): string {
  return `${Math.round(value).toLocaleString("pl-PL")} PLN`;
}

export function fillBrief(text: string, client: PipelineClientDetailed): string {
  if (!text) return text;
  let out = text;
  out = out.replace(/\[nazwa\]/gi, client.firma || "firma klienta");
  out = out.replace(
    /\[X\]\s*pojazd(?:ów|y|u)?/gi,
    client.flota ? `${client.flota} pojazdów` : "[flota nieznana]",
  );
  out = out.replace(/\[TMS\]/gi, client.tms || "system klienta");
  out = out.replace(/\[imię\]/gi, client.kontakt?.split(" ")[0] || client.firma || "klient");
  out = out.replace(
    /\[kwota roczna\]|\[koszt roczny\]/gi,
    client.kosztRoczny
      ? `${formatPln(client.kosztRoczny)}/rok`
      : "kwota do wyliczenia z kalkulatora",
  );
  out = out.replace(
    /\[X\]/gi,
    client.flota
      ? `${client.flota}`
      : client.godzinyWpisywania
        ? `${client.godzinyWpisywania}`
        : "___",
  );
  return out;
}

export interface CytatKlienta {
  cytat: string;
  kontekst: string;
}

export function parseCytatyKlienta(raw: string): CytatKlienta[] {
  if (!raw?.trim()) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [cytat, kontekst = ""] = line.split("|||");
      return { cytat: cytat.trim(), kontekst: kontekst.trim() };
    })
    .filter((c) => c.cytat);
}
