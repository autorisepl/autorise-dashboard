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
    // "Godziny wpisywania / spedytor" to najbliższe istniejące pole liczbowe godzin
    // manualnej pracy — ten sam wzorzec co PipelineClientDetailed.godzinyWpisywania
    // w app/api/notion/pipeline/route.ts, używane tu jako źródło "roi" (h/mc dziś).
    const roi = extractNumber(props["Godziny wpisywania / spedytor"]);
    const tms = extractText(props["TMS"]);
    const cenaWdrozenia = extractNumber(props["Cena wdrożenia"]);
    const retainer = extractNumber(props["Retainer PLN/mc"]);
    const bolGlowny = extractText(props["Ból główny"]);

    const po = roi > 0 ? Math.max(Math.round(roi * PO_WDROZENIU_FRACTION), 0) : 0;

    const cenaWdrozeniaPusta = cenaWdrozenia <= 0;
    let procentKosztu: number | null = null;
    let paybackMiesiace: number | null = null;
    if (kosztMiesiecznie > 0 && !cenaWdrozeniaPusta) {
      paybackMiesiace = Math.round(cenaWdrozenia / kosztMiesiecznie);
      if (kosztRoczny > 0) {
        procentKosztu = Math.round((cenaWdrozenia / kosztRoczny) * 100);
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
      cena_wdrozenia: cenaWdrozeniaPusta ? null : cenaWdrozenia,
      retainer: retainer > 0 ? retainer : null,
      procent_kosztu: procentKosztu,
      payback_miesiace: paybackMiesiace,
      bol_glowny: bolGlowny,
      bol_kategoria: determineBolKategoria(bolGlowny),
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
