import { type NextRequest, NextResponse } from "next/server";
import { getAuthUrl, isGoogleConfigured, resolveRedirectUri } from "@/lib/google/auth";

export async function GET(req: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/profil?google=not_configured", req.nextUrl.origin));
  }
  // redirect_uri kanoniczne (GOOGLE_REDIRECT_URI w produkcji) → zawsze zgodne z
  // Google Cloud Console, niezależnie od proxy. Fallback: forwarded host (localhost).
  return NextResponse.redirect(getAuthUrl(resolveRedirectUri(req)));
}
