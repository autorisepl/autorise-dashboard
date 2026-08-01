import { NextResponse } from "next/server";
import { getOAuth2Client, resolveRedirectUri } from "@/lib/google/auth";

// TYMCZASOWY endpoint diagnostyczny do debugowania invalid_client.
// Wysyła celowo nieprawidłowy authorization code do Google - jeśli
// client_id/client_secret są poprawne, Google odrzuci to jako invalid_grant
// (bo najpierw waliduje dane klienta, potem sam grant). Jeśli dostaniemy
// invalid_client, to znaczy że client_id/secret same w sobie są złe.
// USUNĄĆ po zdiagnozowaniu.
export async function GET(req: Request) {
  const id = process.env.GOOGLE_CLIENT_ID ?? "";
  const secret = process.env.GOOGLE_CLIENT_SECRET ?? "";

  const auth = getOAuth2Client(
    resolveRedirectUri({
      headers: { get: (n: string) => new Headers(req.headers).get(n) },
      nextUrl: { origin: new URL(req.url).origin },
    }),
  );

  let result: unknown;
  try {
    await auth.getToken("obviously_fake_code_for_diagnostics_12345");
    result = "unexpected_success";
  } catch (err) {
    const e = err as { response?: { data?: unknown } };
    result = e.response?.data ?? String(err);
  }

  return NextResponse.json({
    clientIdMasked: id ? `${id.slice(0, 6)}...${id.slice(-10)} (len=${id.length})` : "MISSING",
    clientSecretMasked: secret
      ? `${secret.slice(0, 4)}...${secret.slice(-4)} (len=${secret.length})`
      : "MISSING",
    tokenExchangeResult: result,
  });
}
