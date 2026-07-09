import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = (await cookies()).get("autorise_session")?.value;

  if (session && session === process.env.DASHBOARD_SESSION_SECRET_ADMIN) {
    return NextResponse.json({ role: "admin" });
  }
  if (session && session === process.env.DASHBOARD_SESSION_SECRET_SETTER) {
    return NextResponse.json({ role: "setter" });
  }
  return NextResponse.json({ role: null }, { status: 401 });
}
