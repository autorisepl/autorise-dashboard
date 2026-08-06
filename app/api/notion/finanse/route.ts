import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createFinanceEntry,
  getFinanceSchemaOptions,
  listFinanceEntries,
} from "@/lib/notion/finance";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [entries, schema] = await Promise.all([listFinanceEntries(), getFinanceSchemaOptions()]);
    return NextResponse.json({ success: true, entries, categoryOptions: schema.kategoria });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Notion";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

const createSchema = z.object({
  nazwa: z.string().min(1),
  typ: z.enum(["Przychód", "Wydatek"]),
  kwota: z.number(),
  kategoria: z.array(z.string()),
  data: z.string().min(1),
  notatka: z.string().optional(),
  przypisaneDoPrzychoduId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" },
        { status: 400 },
      );
    }
    const id = await createFinanceEntry(parsed.data);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Notion";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
