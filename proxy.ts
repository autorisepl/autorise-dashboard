import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveRole } from "@/lib/auth/resolveRole";

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get("autorise_session")?.value;
  const role = resolveRole(session);

  if (!role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (role === "setter") {
    const allowed = SETTER_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
    if (!allowed) {
      return NextResponse.redirect(new URL("/sprzedaz", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|prezentacja.html).*)"],
};
