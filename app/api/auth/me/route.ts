import { NextResponse } from "next/server";
import { resolveRole } from "@/lib/auth/resolveRole";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const role = resolveRole(session?.access_token);

  if (!role) {
    return NextResponse.json({ role: null, email: null }, { status: 401 });
  }
  return NextResponse.json({ role, email: user?.email ?? null });
}
