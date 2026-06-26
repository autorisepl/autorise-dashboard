import { type NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/google/auth";

export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${base}/profil?google=error`);
  }

  try {
    // redirect_uri przy wymianie kodu MUSI być identyczny jak w auth URL.
    const auth = getOAuth2Client(`${base}/api/auth/google/callback`);
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
  } catch {
    return NextResponse.redirect(`${base}/profil?google=error`);
  }
}
