import { type NextRequest, NextResponse } from "next/server";
import {
  getOAuth2UserClient,
  getRefreshToken,
  isGoogleConfigured,
  isInvalidGrant,
} from "@/lib/google/auth";

export async function GET(req: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ connected: false, reason: "not_configured" });
  }

  const cookieToken = req.cookies.get("google_refresh_token")?.value;
  const token = getRefreshToken({
    get: (name: string) => {
      const val = req.cookies.get(name);
      return val ? { value: val.value } : undefined;
    },
  });

  if (!token) {
    return NextResponse.json({ connected: false, reason: "no_token" });
  }

  try {
    const userClient = getOAuth2UserClient(token);
    const { data } = await userClient.userinfo.get();
    return NextResponse.json({
      connected: true,
      email: data.email,
      name: data.name,
      picture: data.picture,
      source: cookieToken ? "cookie" : "env",
    });
  } catch (err) {
    const expired = isInvalidGrant(err);
    const res = NextResponse.json({
      connected: false,
      reason: expired ? "expired" : "invalid_token",
      // Wskazówka, czy zły token siedzi w env (cookie czyścimy automatycznie).
      stale_env: expired && !cookieToken && !!process.env.GOOGLE_REFRESH_TOKEN,
    });
    // Usuń nieważne ciasteczko, żeby UI nie pokazywał fałszywie "połączono".
    if (cookieToken) res.cookies.delete("google_refresh_token");
    return res;
  }
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("google_refresh_token");
  return res;
}
