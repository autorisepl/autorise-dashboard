import { type NextRequest, NextResponse } from "next/server";
import { getAuthUrl, isGoogleConfigured } from "@/lib/google/auth";

export async function GET(req: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/profil?google=not_configured", req.nextUrl.origin));
  }
  // redirect_uri wyliczone z domeny żądania → działa na localhost i na produkcji
  // (musi być dodane w Google Cloud Console → Authorized redirect URIs).
  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;
  return NextResponse.redirect(getAuthUrl(redirectUri));
}
