import { DashboardShell } from "@/components/layout/DashboardShell";
import { RoleProvider } from "@/lib/auth/RoleContext";
import { resolveRole } from "@/lib/auth/resolveRole";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = resolveRole(user?.email);

  return (
    <RoleProvider role={role}>
      <DashboardShell>{children}</DashboardShell>
    </RoleProvider>
  );
}
