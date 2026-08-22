import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PIPELINE_STATUSES, pipelineCreateSchema } from "@/lib/supabase/pipelineSchema";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const statusQuerySchema = z.enum(PIPELINE_STATUSES).optional();

// GET — odczyt przez klucz anon + RLS (użytkownik musi być zalogowany, polityka SELECT
// w supabase/migrations/0002_pipeline_rls.sql). Zgodnie z architekturą: odczyt nie
// wymaga service_role, tylko zapis.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") ?? undefined;
  const parsedStatus = statusQuerySchema.safeParse(statusParam);
  if (!parsedStatus.success) {
    return NextResponse.json(
      { success: false, error: "Nieprawidłowa wartość parametru status" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  let query = supabase.from("pipeline").select("*").order("data_pierwszego_kontaktu", {
    ascending: false,
    nullsFirst: false,
  });
  if (parsedStatus.data) {
    query = query.eq("status", parsedStatus.data);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
}

// POST — tworzenie rekordu, wyłącznie service_role (omija RLS z definicji).
export async function POST(req: Request) {
  const raw = await req.json();
  const parsed = pipelineCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" },
      { status: 400 },
    );
  }

  // notion_page_id jest NOT NULL UNIQUE w schemacie (klucz idempotencji migracji), ale
  // rekordy tworzone od teraz bezpośrednio w Supabase nigdy nie istniały w Notion —
  // generujemy syntetyczny, jednoznacznie odróżnialny od realnych ID stron Notion.
  const row = { ...parsed.data, notion_page_id: `native-${crypto.randomUUID()}` };

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("pipeline").insert(row).select().single();
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
}
