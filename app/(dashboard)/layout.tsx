import { DashboardShell } from "@/components/layout/DashboardShell";
import { RoleProvider } from "@/lib/auth/RoleContext";
import { resolveIdentity } from "@/lib/auth/resolveRole";
import { lookupIdentityByEmail } from "@/lib/auth/teamLookup";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // Sama walidacja JWT (getUser()) już się odbyła w proxy.ts dla tego requestu — tu
  // wystarczy odczytać sesję z ciasteczek po access_token z claimsami tożsamości.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let identity = resolveIdentity(session?.access_token);
  if (!identity) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) identity = await lookupIdentityByEmail(user.email);
  }

  return (
    <RoleProvider role={identity}>
      <DashboardShell>{children}</DashboardShell>
    </RoleProvider>
  );
}
