import { type NextRequest, NextResponse } from "next/server";
import { getOAuth2UserClient, getRefreshToken, isGoogleConfigured } from "@/lib/google/auth";

export async function GET(req: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ connected: false, reason: "not_configured" });
  }

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
      source: process.env.GOOGLE_REFRESH_TOKEN ? "env" : "cookie",
    });
  } catch {
    return NextResponse.json({ connected: false, reason: "invalid_token" });
  }
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("google_refresh_token");
  return res;
}
