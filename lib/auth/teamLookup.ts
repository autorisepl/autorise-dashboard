import { createAdminClient } from "@/lib/supabase/admin";
import type { Identity, Role } from "./resolveRole";

// Fallback tożsamości: gdy JWT nie ma jeszcze claimsów z Custom Access Token hooka
// (hook wyłączony w Dashboardzie albo stary token), czytamy rolę wprost z Supabase
// po e-mailu zalogowanego usera. service_role, wyłącznie server-side (proxy.ts, layout).
export async function lookupIdentityByEmail(
  email: string | null | undefined,
): Promise<Identity | null> {
  if (!email) return null;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("team_member_emails")
      .select("team_members!inner(id, role, display_name, active)")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (error || !data) return null;

    const raw = (data as { team_members: unknown }).team_members;
    const tm = Array.isArray(raw) ? raw[0] : raw;
    if (!tm || typeof tm !== "object") return null;

    const record = tm as { id?: string; role?: string; display_name?: string; active?: boolean };
    if (!record.id || !record.role || !record.display_name || record.active === false) return null;

    return {
      role: record.role as Role,
      teamMemberId: record.id,
      displayName: record.display_name,
    };
  } catch {
    return null;
  }
}
