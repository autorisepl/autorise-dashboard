import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Klient serwerowy (Server Components, Route Handlers) — klucz anon, sesja z ciasteczek
// żądania. Respektuje RLS. Używany w app/(dashboard)/layout.tsx, app/api/auth/me,
// app/api/auth/callback i wylogowaniu w app/api/auth (DELETE).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll wywołane z Server Component (nie Route Handler) — middleware
            // odświeży sesję przy następnym żądaniu, bezpiecznie pomijamy błąd.
          }
        },
      },
    },
  );
}
