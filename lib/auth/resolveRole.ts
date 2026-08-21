export type Role = "admin" | "setter";

// Jedno źródło prawdy dla mapowania e-maila (Supabase Auth) na rolę — używane przez
// proxy.ts (server-side gate na ścieżki), app/api/auth/me/route.ts, i
// RoleProvider (server layout przekazujący rolę do klienta bez opóźnienia).
//
// Self-signup w Supabase jest wyłączony, więc to jest wyłącznie warstwa defense-in-depth:
// nawet gdyby ktoś jakimś trybem założył konto Supabase spoza tej listy, resolveRole
// zwraca null i proxy.ts traktuje go jak niezalogowanego.
const EMAIL_ROLES: Record<string, Role> = {
  "roth@autorise.pl": "admin",
  "zlotnicki@autorise.pl": "setter",
};

export function resolveRole(email: string | null | undefined): Role | null {
  if (!email) return null;
  return EMAIL_ROLES[email.toLowerCase()] ?? null;
}
