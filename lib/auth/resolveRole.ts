export type Role = "admin" | "setter";

// Jedno źródło prawdy dla mapowania cookie sesji na rolę — używane przez
// proxy.ts (server-side gate na ścieżki), app/api/auth/me/route.ts, i
// RoleProvider (server layout przekazujący rolę do klienta bez opóźnienia).
export function resolveRole(session: string | undefined): Role | null {
  if (!session) return null;
  if (session === process.env.DASHBOARD_SESSION_SECRET_ADMIN) return "admin";
  if (session === process.env.DASHBOARD_SESSION_SECRET_SETTER) return "setter";
  return null;
}
