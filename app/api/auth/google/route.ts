import { NextResponse } from "next/server";
import { getAuthUrl, isGoogleConfigured } from "@/lib/google/auth";

export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/profil?google=not_configured", process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
    );
  }
  return NextResponse.redirect(getAuthUrl());
}
