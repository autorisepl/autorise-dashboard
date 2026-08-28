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
  // Logo w rogu slajdu 1 (2026-08-25) — bez tego wpisu middleware przekierowywał
  // niezalogowane żądanie /logo.png do /login, więc obrazek nigdy się nie ładował na
  // publicznej prezentacji (matcher niżej wyklucza tylko _next/static, _next/image,
  // favicon.ico i samo prezentacja.html — zwykłe pliki w public/ nie są z automatu pominięte).
  "/logo.png",
];

const SETTER_ALLOWED_PREFIXES = [
  "/kwalifikacja",
  "/sprzedaz",
  "/agencja",
  "/prezentacja",
  "/agenci",
  // Narzędzie transkrypcji rozmów telefonicznych — odblokowane dla settera/closera
  // (2026-08-28). Praca nad tą zakładką dopiero przed nami, ale dostęp jest już teraz.
  "/narzedzia",
  "/api/tools/transcribe",
  // Nie jest już prowizorką pod sam przycisk wylogowania (ten żyje teraz w karcie
  // użytkownika w sidebarze, dostępny z każdej strony) — zostaje z innego powodu: ikona
  // ustawień w tej samej karcie linkuje do /profil dla KAŻDEJ roli, więc setter musi mieć
  // do niego dostęp, inaczej kliknięcie cicho przekierowuje go do /sprzedaz.
  "/profil",
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
  // w middleware niż samo odczytanie ciasteczka. getSession() po walidacji tylko czyta
  // już-zweryfikowaną sesję z ciasteczek (bez dodatkowego round-tripu), żeby wyciągnąć
  // access_token z claimsami roli.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const role = resolveRole(session?.access_token);

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
