import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getOperationHistory,
  getOperationHistoryDetails,
  saveOperationHistory,
} from "@/lib/notion/client";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  pageId: z.string().min(1),
  type: z.string().min(1),
  summary: z.string(),
  details: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = postSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" },
        { status: 400 },
      );
    }
    const { pageId, type, summary, details } = parsed.data;
    await saveOperationHistory(pageId, type, summary, details);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Notion";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pageId = searchParams.get("pageId");
  const entryId = searchParams.get("entryId");

  if (entryId) {
    try {
      const details = await getOperationHistoryDetails(entryId);
      return NextResponse.json({ success: true, details });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Błąd Notion";
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  if (!pageId) {
    return NextResponse.json({ success: false, error: "pageId required" }, { status: 400 });
  }
  try {
    const history = await getOperationHistory(pageId);
    return NextResponse.json({ success: true, history });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Notion";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
