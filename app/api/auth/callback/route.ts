import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Route Handler (Node runtime, nie proxy.ts/Edge) — odbiera ?code= po powrocie z Google,
// wymienia go na sesję i zapisuje cookies. Musi być w PUBLIC_PATHS (proxy.ts, "/api/auth"
// pokrywa ten prefiks), użytkownik ląduje tu jeszcze bez ważnej sesji.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/agenci";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
