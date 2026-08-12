import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createFinanceEntry,
  ensureFinanceSubscriptionSchema,
  getFinanceSchemaOptions,
  listFinanceEntries,
  RENEWAL_INTERVALS,
  RENEWAL_KINDS,
} from "@/lib/notion/finance";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Uruchamiane RÓWNOLEGLE z odczytem, nie przed nim — ensure jest idempotentne i błędy są
    // połykane wewnątrz (patrz komentarz przy definicji), więc nie musi blokować właściwego
    // odczytu danych sekwencyjnie. Dawniej `await` przed Promise.all dokładał pełny dodatkowy
    // round-trip do Notion do KAŻDEGO ładowania panelu, niepotrzebnie spowalniając.
    const [entries, schema] = await Promise.all([
      listFinanceEntries(),
      getFinanceSchemaOptions(),
      ensureFinanceSubscriptionSchema(),
    ]);
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
  data: z.string(), // "" = data nieznana
  notatka: z.string().optional(),
  przypisaneDoPrzychoduId: z.string().nullable().optional(),
  subskrypcja: z.boolean().optional(),
  cyklOdnawiania: z.enum(RENEWAL_INTERVALS).nullable().optional(),
  rodzajCyklu: z.enum(RENEWAL_KINDS).nullable().optional(),
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
