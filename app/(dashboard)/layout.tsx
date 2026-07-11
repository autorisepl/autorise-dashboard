import { cookies } from "next/headers";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { resolveRole } from "@/lib/auth/resolveRole";
import { RoleProvider } from "@/lib/auth/RoleContext";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = (await cookies()).get("autorise_session")?.value;
  const role = resolveRole(session);

  return (
    <RoleProvider role={role}>
      <DashboardShell>{children}</DashboardShell>
    </RoleProvider>
  );
}
