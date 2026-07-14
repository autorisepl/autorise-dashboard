import { NextResponse } from "next/server";
import {
  deprecateBrokenFollowupOptions,
  findPipelineCardsWithBrokenFollowup,
  fixFollowupTypesForCards,
  type PipelineCardBrokenFollowup,
} from "@/lib/notion/client";

// GET: podgląd kart z zepsutą wartością "Typ follow-up" (mojibake/duplikat) — bez zapisu.
export async function GET() {
  try {
    const cards = await findPipelineCardsWithBrokenFollowup();
    return NextResponse.json({ success: true, cards });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd odczytu Pipeline" },
      { status: 500 },
    );
  }
}

// POST: migruje wyłącznie karty przekazane w body.cards (świeże z GET), potem oznacza
// zepsute opcje w schemacie jako jawnie nieużywane (Notion API nie pozwala ich usunąć).
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { cards?: PipelineCardBrokenFollowup[] };
    if (!body.cards || body.cards.length === 0) {
      return NextResponse.json(
        { success: false, error: "Brak listy kart do aktualizacji" },
        { status: 400 },
      );
    }

    const result = await fixFollowupTypesForCards(body.cards);
    const deprecated = await deprecateBrokenFollowupOptions();

    if (result.errors.length > 0 || deprecated.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          updated: result.updated,
          errors: [...result.errors, ...deprecated.errors],
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Zmigrowano "Typ follow-up" dla ${result.updated.length} kart, oznaczono ${deprecated.renamed.length} zepsutych opcji jako nieużywane.`,
      updated: result.updated,
      deprecatedOptions: deprecated.renamed,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd zapisu" },
      { status: 500 },
    );
  }
}
