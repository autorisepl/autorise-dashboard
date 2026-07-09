import { NextResponse } from "next/server";

type Role = "admin" | "setter";

const CREDENTIALS: { passwordEnvVar: string; sessionEnvVar: string; role: Role }[] = [
  {
    passwordEnvVar: "DASHBOARD_PASSWORD_ADMIN",
    sessionEnvVar: "DASHBOARD_SESSION_SECRET_ADMIN",
    role: "admin",
  },
  {
    passwordEnvVar: "DASHBOARD_PASSWORD_SETTER",
    sessionEnvVar: "DASHBOARD_SESSION_SECRET_SETTER",
    role: "setter",
  },
];

export async function POST(req: Request) {
  const { password } = await req.json();

  for (const cred of CREDENTIALS) {
    const correct = process.env[cred.passwordEnvVar];
    const sessionSecret = process.env[cred.sessionEnvVar];
    if (!correct || !sessionSecret) continue;

    if (password === correct) {
      const res = NextResponse.json({ success: true, role: cred.role });
      res.cookies.set("autorise_session", sessionSecret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      return res;
    }
  }

  // Small delay to prevent brute force
  await new Promise((r) => setTimeout(r, 400));
  return NextResponse.json({ success: false, error: "Złe hasło" }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("autorise_session");
  return res;
}
