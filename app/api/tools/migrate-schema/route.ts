import { NextResponse } from "next/server";
import { migrateNotionSchema } from "@/lib/notion/client";

export async function POST() {
  try {
    const result = await migrateNotionSchema();

    if (result.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          added: result.added,
          errors: result.errors,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Zaktualizowano schemat Pipeline. Pola: ${result.added.join(", ")}`,
      added: result.added,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd migracji" },
      { status: 500 },
    );
  }
}
