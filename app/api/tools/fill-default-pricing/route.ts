import { NextResponse } from "next/server";
import {
  fillDefaultPricingForCards,
  findPipelineCardsMissingPricing,
  type PipelineCardMissingPricing,
} from "@/lib/notion/client";

// GET: podgląd kart z pustą "Cena wdrożenia" i/lub "Retainer PLN/mc" — bez zapisu.
export async function GET() {
  try {
    const cards = await findPipelineCardsMissingPricing();
    return NextResponse.json({ success: true, cards });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd odczytu Pipeline" },
      { status: 500 },
    );
  }
}

// POST: wypełnia wyłącznie karty przekazane w body.cards (świeże z GET), tylko puste pola.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { cards?: PipelineCardMissingPricing[] };
    if (!body.cards || body.cards.length === 0) {
      return NextResponse.json(
        { success: false, error: "Brak listy kart do aktualizacji" },
        { status: 400 },
      );
    }

    const result = await fillDefaultPricingForCards(body.cards);

    if (result.errors.length > 0) {
      return NextResponse.json(
        { success: false, updated: result.updated, errors: result.errors },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Uzupełniono domyślną cenę/retainer dla ${result.updated.length} kart.`,
      updated: result.updated,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd zapisu" },
      { status: 500 },
    );
  }
}
