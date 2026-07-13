import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Gwarancja to stała firmowa (minimum 80h/mc, patrz AGENT1_SYSTEM_PROMPT), nie pole per-klient.
const GWARANCJA_H_MC = 80;
// "Po wdrożeniu" nie ma dedykowanego pola w Notion — Agent 3 szacuje je jako 10-15%
// wartości "Dziś" (patrz AGENT3_SYSTEM_PROMPT). Ten endpoint nie wywołuje AI, więc
// replikuje tę samą heurystykę deterministycznie, na środku podanego zakresu (12.5%).
const PO_WDROZENIU_FRACTION = 0.125;
// "Godziny wpisywania / spedytor" to godziny DZIENNIE NA JEDNĄ OSOBĘ, nie h/mc całego
// biura — ten sam wzór co koszt_problemu.wzor_obliczenia Agenta 1 (patrz prompts.ts):
// godziny dziennie × liczba spedytorów × dni robocze/mc.
const DNI_ROBOCZE_MC = 21;
// Cena standardowa, zdefiniowana w lib/agents/prompts.ts (Agent 1/2/5): 15 000 PLN netto
// wdrożenie + 4 000 PLN/mc retainer. Pola Notion "Cena wdrożenia"/"Retainer PLN/mc" są
// wypełniane ręcznie przez Michała — puste pole oznacza standardową ofertę, nie brak
// ceny, więc fallback na te stałe zamiast null/"ustalana indywidualnie".
const DOMYSLNA_CENA_WDROZENIA = 15000;
const DOMYSLNY_RETAINER = 4000;

function extractText(prop: PageObjectResponse["properties"][string] | undefined): string {
  if (!prop) return "";
  if (prop.type === "rich_text")
    return prop.rich_text
      .map((t) => t.plain_text)
      .join("")
      .trim();
  if (prop.type === "title")
    return prop.title
      .map((t) => t.plain_text)
      .join("")
      .trim();
  return "";
}

function extractNumber(prop: PageObjectResponse["properties"][string] | undefined): number {
  if (!prop) return 0;
  if (prop.type === "number") return prop.number ?? 0;
  return 0;
}

type BolKategoria = "dokumenty" | "tms" | "komunikacja" | "widocznosc" | null;

// Proste dopasowanie słów kluczowych do treści "Ból główny" — brak jednoznacznego
// trafienia (albo puste pole) zwraca null, front-end wtedy nie podświetla żadnego modułu.
function determineBolKategoria(bolGlowny: string): BolKategoria {
  const text = bolGlowny.toLowerCase();
  if (!text) return null;
  if (/faktur|cmr|dokument|pod\b|excel/.test(text)) return "dokumenty";
  if (/tms|system|wpisywani[ae]|wpisuj/.test(text)) return "tms";
  if (/sms|telefon|dzwoni|klient pyta|powiadomien/.test(text)) return "komunikacja";
  if (/widoczno|status|nie wiadomo/.test(text)) return "widocznosc";
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ znaleziono: false, error: "Brak parametru id" }, { status: 400 });
  }

  try {
    const page = (await notion.pages.retrieve({ page_id: id })) as PageObjectResponse;
    const props = page.properties;

    const firma = extractText(props["Firma"]);
    const kosztMiesiecznie = extractNumber(props["Koszt problemu PLN/mc"]);
    const kosztRoczny = extractNumber(props["Koszt roczny PLN/rok"]);
    const godzinyDziennie = extractNumber(props["Godziny wpisywania / spedytor"]);
    const spedytorzy = extractNumber(props["Spedytorzy"]);
    const tms = extractText(props["TMS"]);
    const cenaWdrozenia = extractNumber(props["Cena wdrożenia"]);
    const retainer = extractNumber(props["Retainer PLN/mc"]);
    const bolGlowny = extractText(props["Ból główny"]);

    // roi = h/mc CAŁEGO biura, nie surowa wartość dzienna na osobę (patrz stała
    // DNI_ROBOCZE_MC wyżej). Brak "Spedytorzy" w Notion nie może cicho wyzerować
    // wyniku przez mnożenie przez 0 — fallback na samą wartość dzienną z jawnym
    // ostrzeżeniem, żeby niepełne dane było widać, nie zgadywać w ciemno.
    let roi: number;
    let ostrzezenie: string | null = null;
    if (spedytorzy > 0) {
      roi = Math.round(godzinyDziennie * spedytorzy * DNI_ROBOCZE_MC);
    } else {
      roi = Math.round(godzinyDziennie);
      if (godzinyDziennie > 0) {
        ostrzezenie =
          'Brak liczby spedytorów w polu "Spedytorzy" w Notion — roi to surowa wartość dzienna na jedną osobę, nie h/mc całego biura. Uzupełnij "Spedytorzy" w Pipeline dla poprawnego przeliczenia.';
      }
    }

    const po = roi > 0 ? Math.max(Math.round(roi * PO_WDROZENIU_FRACTION), 0) : 0;

    // Pole puste w Notion (<=0) = standardowa oferta, nie brak ceny — fallback na stałe
    // z prompts.ts. Wartość faktycznie wpisana ręcznie (np. większe, niestandardowe
    // wdrożenie) zawsze ma pierwszeństwo, fallback dotyczy wyłącznie pustego pola.
    const cenaWdrozeniaEfektywna = cenaWdrozenia > 0 ? cenaWdrozenia : DOMYSLNA_CENA_WDROZENIA;
    const retainerEfektywny = retainer > 0 ? retainer : DOMYSLNY_RETAINER;

    let procentKosztu: number | null = null;
    let paybackMiesiace: number | null = null;
    if (kosztMiesiecznie > 0) {
      paybackMiesiace = Math.round(cenaWdrozeniaEfektywna / kosztMiesiecznie);
      if (kosztRoczny > 0) {
        procentKosztu = Math.round((cenaWdrozeniaEfektywna / kosztRoczny) * 100);
      }
    }

    return NextResponse.json({
      znaleziono: true,
      firma,
      roi,
      po,
      bol: kosztRoczny,
      tms,
      gwar: GWARANCJA_H_MC,
      cena_wdrozenia: cenaWdrozeniaEfektywna,
      retainer: retainerEfektywny,
      procent_kosztu: procentKosztu,
      payback_miesiace: paybackMiesiace,
      bol_glowny: bolGlowny,
      bol_kategoria: determineBolKategoria(bolGlowny),
      ostrzezenie,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Notion";
    // notion.pages.retrieve rzuca dla nieistniejącego/niedostępnego id — traktuj jako "nie znaleziono",
    // nie jako błąd serwera, żeby frontend mógł cicho przełączyć się na fallback.
    if (msg.toLowerCase().includes("could not find") || msg.toLowerCase().includes("not found")) {
      return NextResponse.json({ znaleziono: false });
    }
    return NextResponse.json({ znaleziono: false, error: msg }, { status: 500 });
  }
}
