import { NextResponse } from "next/server";
import {
  clearOldDefaultPriceForCards,
  findPipelineCardsWithOldDefaultPrice,
  type PipelineCardOldDefaultPrice,
} from "@/lib/notion/client";

// GET: podgląd kart z "Cena wdrożenia" = 18000 i/lub "Retainer PLN/mc" = 4000 (stare wartości
// domyślne sprzed przejścia na UMOWA_SYSTEM_AUTORISE.pdf — pod obecną umową to zwyczajnie
// złe ceny) — bez zapisu.
export async function GET() {
  try {
    const cards = await findPipelineCardsWithOldDefaultPrice();
    return NextResponse.json({ success: true, cards });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd odczytu Pipeline" },
      { status: 500 },
    );
  }
}

// POST: czyści "Cena wdrożenia" wyłącznie dla kart przekazanych w body.cards (świeże z GET).
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { cards?: PipelineCardOldDefaultPrice[] };
    if (!body.cards || body.cards.length === 0) {
      return NextResponse.json(
        { success: false, error: "Brak listy kart do aktualizacji" },
        { status: 400 },
      );
    }

    const result = await clearOldDefaultPriceForCards(body.cards);

    if (result.errors.length > 0) {
      return NextResponse.json(
        { success: false, updated: result.updated, errors: result.errors },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Wyczyszczono stare ceny dla ${result.updated.length} kart (wracają do domyślnych: 30000 wdrożenie / 1000 retainer).`,
      updated: result.updated,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd zapisu" },
      { status: 500 },
    );
  }
}
