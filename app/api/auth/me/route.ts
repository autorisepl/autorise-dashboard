import { NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth/resolveRole";
import { lookupIdentityByEmail } from "@/lib/auth/teamLookup";
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
  let identity = resolveIdentity(session?.access_token);
  if (!identity && user?.email) identity = await lookupIdentityByEmail(user.email);

  if (!identity) {
    return NextResponse.json({ role: null, email: null }, { status: 401 });
  }
  return NextResponse.json({ role: identity.role, email: user?.email ?? null });
}
