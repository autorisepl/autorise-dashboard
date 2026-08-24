// Jedyna ścieżka wylogowania w całym dashboardzie — używana przez ProfilContent (przycisk
// "Wyloguj" w /profil) i Sidebar (karta użytkownika na dole, dostępna z każdej strony).
// DELETE /api/auth czyści sesję Supabase (supabase.auth.signOut()) po stronie serwera.
export async function logout(): Promise<void> {
  await fetch("/api/auth", { method: "DELETE" });
  window.location.href = "/login";
}
