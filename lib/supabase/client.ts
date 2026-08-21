import { createBrowserClient } from "@supabase/ssr";

// Klient przeglądarkowy, klucz anon (publiczny, bezpieczny w kodzie klienckim).
// Używany w app/login/page.tsx do signInWithOAuth/signInWithPassword.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}
