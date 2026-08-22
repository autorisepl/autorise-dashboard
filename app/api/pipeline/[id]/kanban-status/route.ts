import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { KANBAN_LOCKED_STATUSES } from "@/lib/supabase/pipelineKanban";
import { PIPELINE_STATUSES } from "@/lib/supabase/pipelineSchema";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ status: z.enum(PIPELINE_STATUSES) });

// Osobny od ogólnego PATCH /api/pipeline/[id] — WYŁĄCZNIE zmiana statusu przez przeciągnięcie
// karty na Kanbanie /pipeline. Reguła blokady (patrz lib/supabase/pipelineKanban.ts) musi być
// wymuszona tutaj, nie tylko w UI — klient HTTP może pominąć interfejs. Odrzuca próbę jeśli
// STARY lub NOWY status należy do zablokowanej grupy (etapy ustawiane rozmową
// kwalifikacyjną/sprzedażową), w obu kierunkach.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await req.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: current, error: readError } = await supabase
    .from("pipeline")
    .select("status")
    .eq("id", id)
    .single();
  if (readError || !current) {
    return NextResponse.json({ success: false, error: "Nie znaleziono karty" }, { status: 404 });
  }

  const nextStatus = parsed.data.status;
  if (
    (current.status && KANBAN_LOCKED_STATUSES.includes(current.status)) ||
    KANBAN_LOCKED_STATUSES.includes(nextStatus)
  ) {
    return NextResponse.json(
      { success: false, error: "Ten etap ustawia rozmowa w /kwalifikacja lub /sprzedaz" },
      { status: 403 },
    );
  }

  const { error: updateError } = await supabase
    .from("pipeline")
    .update({ status: nextStatus })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
