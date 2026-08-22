import { DashboardShell } from "@/components/layout/DashboardShell";
import { RoleProvider } from "@/lib/auth/RoleContext";
import { resolveIdentity } from "@/lib/auth/resolveRole";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // Sama walidacja JWT (getUser()) już się odbyła w proxy.ts dla tego requestu — tu
  // wystarczy odczytać sesję z ciasteczek po access_token z claimsami tożsamości.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const identity = resolveIdentity(session?.access_token);

  return (
    <RoleProvider role={identity}>
      <DashboardShell>{children}</DashboardShell>
    </RoleProvider>
  );
}
