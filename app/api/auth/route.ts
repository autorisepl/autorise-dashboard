import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Logowanie idzie teraz przez Supabase Auth bezpośrednio z klienta (app/login/page.tsx,
// signInWithOAuth/signInWithPassword) — ten route zostaje wyłącznie do wylogowania, pod
// tym samym adresem co dawniej (zero nowych call site'ów do wpinania).
export async function DELETE() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
