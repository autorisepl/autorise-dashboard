import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pipelinePatchSchema } from "@/lib/supabase/pipelineSchema";

export const dynamic = "force-dynamic";

// PATCH — aktualizacja częściowa, wyłącznie service_role (omija RLS z definicji).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await req.json();
  const parsed = pipelinePatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" },
      { status: 400 },
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { success: false, error: "Brak pól do aktualizacji" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pipeline")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
}
