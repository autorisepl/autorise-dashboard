import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/prezentacja.html"];

const SETTER_ALLOWED_PREFIXES = [
  "/kwalifikacja",
  "/sprzedaz",
  "/agencja",
  "/prezentacja",
  "/api/notion",
  "/api/agents",
  "/api/google",
];

function resolveRole(session: string | undefined): "admin" | "setter" | null {
  if (!session) return null;
  if (session === process.env.DASHBOARD_SESSION_SECRET_ADMIN) return "admin";
  if (session === process.env.DASHBOARD_SESSION_SECRET_SETTER) return "setter";
  return null;
}

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
