import { NextResponse } from "next/server";

// Wymaga VERCEL_API_TOKEN (Account Settings -> Tokens) i VERCEL_PROJECT_ID
// (Project Settings -> General). Bez tych zmiennych panel w sidebarze po
// prostu się nie renderuje, zamiast pokazywać błąd — ten sam wzorzec co
// Google OAuth (profil działa bez połączonego konta).
export interface VercelDeployData {
  state: string;
  createdAt: string;
  target: string | null;
  url: string | null;
}

const STATE_LABELS: Record<string, string> = {
  READY: "Wdrożony",
  ERROR: "Błąd wdrożenia",
  BUILDING: "Buduje się",
  QUEUED: "W kolejce",
  CANCELED: "Anulowany",
  INITIALIZING: "Inicjalizacja",
};

export async function GET() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return NextResponse.json({ success: false, configured: false });
  }

  try {
    const params = new URLSearchParams({
      projectId,
      limit: "1",
      target: "production",
    });
    if (teamId) params.set("teamId", teamId);

    const res = await fetch(`https://api.vercel.com/v6/deployments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Vercel API error: ${res.status}`);

    const json = await res.json();
    const deploy = json.deployments?.[0];
    if (!deploy) {
      return NextResponse.json({ success: false, configured: true, error: "Brak deployów." });
    }

    const data: VercelDeployData = {
      state: STATE_LABELS[deploy.state as string] ?? (deploy.state as string),
      createdAt: new Date(deploy.createdAt).toISOString(),
      target: deploy.target ?? null,
      url: deploy.url ? `https://${deploy.url}` : null,
    };

    return NextResponse.json({ success: true, configured: true, deploy: data });
  } catch (err) {
    return NextResponse.json({
      success: false,
      configured: true,
      error: err instanceof Error ? err.message : "Nieznany błąd",
    });
  }
}
