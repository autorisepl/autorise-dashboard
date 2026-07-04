import { type NextRequest, NextResponse } from "next/server";
import { getOAuth2Client, resolveRedirectUri } from "@/lib/google/auth";

export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    const errorCode = error ?? "no_code";
    return NextResponse.redirect(
      `${base}/profil?google=error&auth_error=${encodeURIComponent(errorCode)}`,
    );
  }

  try {
    // redirect_uri przy wymianie kodu MUSI być identyczny jak w auth URL.
    const auth = getOAuth2Client(resolveRedirectUri(req));
    const { tokens } = await auth.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${base}/profil?google=no_refresh_token`);
    }

    const res = NextResponse.redirect(`${base}/profil?google=success`);
    res.cookies.set("google_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
    return res;
  } catch (err) {
    const e = err as { response?: { data?: { error?: string; error_description?: string } } };
    const code = e.response?.data?.error;
    console.error(
      "[google/callback] token exchange failed:",
      code ?? "unknown",
      e.response?.data?.error_description ?? err,
    );
    return NextResponse.redirect(
      `${base}/profil?google=error${code ? `&auth_error=${encodeURIComponent(code)}` : ""}`,
    );
  }
}
