import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteFinanceEntry,
  RENEWAL_INTERVALS,
  RENEWAL_KINDS,
  updateFinanceEntry,
} from "@/lib/notion/finance";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  nazwa: z.string().min(1).optional(),
  typ: z.enum(["Przychód", "Wydatek"]).optional(),
  kwota: z.number().optional(),
  kategoria: z.array(z.string()).optional(),
  data: z.string().optional(), // "" = data nieznana
  notatka: z.string().optional(),
  przypisaneDoPrzychoduId: z.string().nullable().optional(),
  subskrypcja: z.boolean().optional(),
  cyklOdnawiania: z.enum(RENEWAL_INTERVALS).nullable().optional(),
  rodzajCyklu: z.enum(RENEWAL_KINDS).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const raw = await req.json();
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" },
        { status: 400 },
      );
    }
    await updateFinanceEntry(id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Notion";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteFinanceEntry(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Notion";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
