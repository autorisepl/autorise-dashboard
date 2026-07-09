import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VARS = [
  "ANTHROPIC_API_KEY",
  "NOTION_TOKEN",
  "NOTION_DATABASE_ID",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GROQ_API_KEY",
  "DASHBOARD_SESSION_SECRET_ADMIN",
  "DASHBOARD_SESSION_SECRET_SETTER",
  "WORKSPACE_ROOT",
  "GOOGLE_DRIVE_TRANSCRIPTS_MP3_FOLDER_ID",
  "GOOGLE_DRIVE_TRANSCRIPTS_TXT_FOLDER_ID",
];

export interface EnvCheckResponse {
  vars: { name: string; present: boolean }[];
}

export async function GET() {
  const vars = VARS.map((name) => ({
    name,
    present: Boolean(process.env[name]),
  }));
  return NextResponse.json({ vars } satisfies EnvCheckResponse);
}
