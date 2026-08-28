// Lista członków zespołu (team_members w Supabase) — źródło dla pickera "przypisany
// sprzedawca" w /kwalifikacja. Tylko odczyt. service_role, ten sam wzorzec co
// app/api/notion/pipeline/route.ts (proxy.ts i tak wymaga zalogowanej roli, zanim
// request tu dotrze).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export interface TeamMember {
  id: string;
  displayName: string;
  role: "admin" | "setter" | "closer";
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("team_members")
      .select("id, display_name, role, active")
      .eq("active", true)
      .order("display_name", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const members: TeamMember[] = (data ?? []).map((row) => ({
      id: row.id as string,
      displayName: (row.display_name as string) ?? "Bez nazwy",
      role: row.role as TeamMember["role"],
    }));

    return NextResponse.json({ success: true, members });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nieznany błąd";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
