import { NextResponse } from "next/server";

export async function GET() {
  const port = process.env.MCP_PORT ?? "3010";
  try {
    const res = await fetch(`http://localhost:${port}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: true, port: Number(port), data });
  } catch {
    return NextResponse.json({ ok: false, port: Number(port) });
  }
}
