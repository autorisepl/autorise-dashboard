import { DashboardShell } from "@/components/layout/DashboardShell";
import { RoleProvider } from "@/lib/auth/RoleContext";
import { resolveRole } from "@/lib/auth/resolveRole";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // Sama walidacja JWT (getUser()) już się odbyła w proxy.ts dla tego requestu — tu
  // wystarczy odczytać sesję z ciasteczek po access_token z claimsami roli.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const role = resolveRole(session?.access_token);

  return (
    <RoleProvider role={role}>
      <DashboardShell>{children}</DashboardShell>
    </RoleProvider>
  );
}
