import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Klient service_role — WYŁĄCZNIE server-side, wyłącznie w API routes zapisu
// (app/api/pipeline) i w skrypcie migracji. Omija RLS z definicji, nigdy nie
// importować z komponentu klienckiego ("use client").
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nie jest ustawiony w środowisku");
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
