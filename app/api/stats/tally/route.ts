import { NextResponse } from "next/server";
import { type DailyStatType, incrementDailyStat } from "@/lib/notion/client";

export const dynamic = "force-dynamic";

const VALID_TYPES: DailyStatType[] = ["dial", "rozmowa", "sms"];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body?.type;

    if (typeof type !== "string" || !VALID_TYPES.includes(type as DailyStatType)) {
      return NextResponse.json(
        { success: false, error: `Nieprawidłowy typ. Oczekiwano: ${VALID_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    await incrementDailyStat(type as DailyStatType);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Błąd zapisu licznika" },
      { status: 500 },
    );
  }
}
