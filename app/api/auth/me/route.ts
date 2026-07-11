import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveRole } from "@/lib/auth/resolveRole";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = (await cookies()).get("autorise_session")?.value;
  const role = resolveRole(session);

  if (!role) {
    return NextResponse.json({ role: null }, { status: 401 });
  }
  return NextResponse.json({ role });
}
