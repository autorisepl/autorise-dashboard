import { NextResponse } from "next/server";
import { migrateDailyStatsSchema, migrateNotionSchema } from "@/lib/notion/client";

export async function POST() {
  try {
    const pipeline = await migrateNotionSchema();
    const dailyStats = await migrateDailyStatsSchema();
    const added = [...pipeline.added, ...dailyStats.added];
    const errors = [...pipeline.errors, ...dailyStats.errors];

    if (errors.length > 0) {
      return NextResponse.json({ success: false, added, errors }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Zaktualizowano schemat Pipeline + Statystyki Dzienne. Pola: ${added.join(", ")}`,
      added,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd migracji" },
      { status: 500 },
    );
  }
}
