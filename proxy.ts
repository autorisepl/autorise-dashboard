import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveRole } from "@/lib/auth/resolveRole";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/prezentacja.html",
  // prezentacja.html jest publiczna (klient ogląda bez logowania) i fetchuje stąd swoje
  // dane personalizacji — musi być dostępne bez sesji, tak jak sama strona.
  "/api/notion/prezentacja-dane",
];

const SETTER_ALLOWED_PREFIXES = [
  "/kwalifikacja",
  "/sprzedaz",
  "/agencja",
  "/prezentacja",
  "/agenci",
  "/api/notion",
  "/api/agents",
  "/api/google",
  "/api/stats/tally",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const { supabase, getResponse } = createMiddlewareClient(request);
  // getUser() (nie getSession()) — waliduje JWT bezpośrednio u Supabase, bezpieczniejsze
  // w middleware niż samo odczytanie ciasteczka.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = resolveRole(user?.email);

  if (!role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    if (user) {
      // Zalogowany do Supabase, ale e-mail poza allowlistą ról — czytelny komunikat
      // zamiast cichego przekierowania jak przy braku sesji w ogóle.
      loginUrl.searchParams.set("error", "unauthorized");
    }
    return NextResponse.redirect(loginUrl);
  }

  if (role === "setter") {
    const allowed = SETTER_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
    if (!allowed) {
      return NextResponse.redirect(new URL("/sprzedaz", request.url));
    }
  }

  return getResponse();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|prezentacja.html).*)"],
};
