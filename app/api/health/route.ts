import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const PIPELINE_DB_ID = "75ac8bc6fd6d4c36934bedc1270217eb";
const CACHE_TTL = 20_000; // 20 seconds

export interface HealthStatus {
  ok: boolean;
  label: string;
  error?: string;
}

export interface HealthResponse {
  anthropic: HealthStatus;
  notion: HealthStatus;
  google: HealthStatus;
  groq: HealthStatus;
  mcp: HealthStatus;
  timestamp: string;
  cached: boolean;
}

let _cache: { data: HealthResponse; expiresAt: number } | null = null;

async function checkAnthropic(): Promise<HealthStatus> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, label: "Brak klucza", error: "ANTHROPIC_API_KEY nie ustawiony" };
  // Validate key format — avoids slow external call on every health check
  if (!key.startsWith("sk-ant-")) {
    return { ok: false, label: "Nieprawidłowy klucz", error: "Klucz musi zaczynać się od sk-ant-" };
  }
  // One real call every CACHE_TTL ms — prove the key actually works
  const client = new Anthropic({ apiKey: key });
  await client.models.list();
  return { ok: true, label: "Połączono" };
}

async function checkNotion(): Promise<HealthStatus> {
  const token = process.env.NOTION_TOKEN;
  if (!token) return { ok: false, label: "Brak tokenu", error: "NOTION_TOKEN nie ustawiony" };
  const notion = new Client({ auth: token });
  await notion.databases.retrieve({ database_id: PIPELINE_DB_ID });
  return { ok: true, label: "Pipeline dostępny" };
}

async function checkGoogle(): Promise<HealthStatus> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId)
    return { ok: false, label: "Brak konfiguracji", error: "GOOGLE_CLIENT_ID nie ustawiony" };
  return { ok: true, label: "Skonfigurowano OAuth" };
}

async function checkGroq(): Promise<HealthStatus> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false, label: "Brak klucza", error: "GROQ_API_KEY nie ustawiony" };
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { ok: false, label: `HTTP ${res.status}` };
    return { ok: true, label: "Whisper large-v3" };
  } catch {
    return { ok: false, label: "Timeout / brak połączenia" };
  }
}

async function checkMcp(): Promise<HealthStatus> {
  try {
    const res = await fetch("https://mcp.autorise.pl/health", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { ok: false, label: `HTTP ${res.status}` };
    return { ok: true, label: "mcp.autorise.pl → :3010" };
  } catch {
    return { ok: false, label: "Niedostępny" };
  }
}

export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("force") === "1";
  if (!force && _cache && Date.now() < _cache.expiresAt) {
    return NextResponse.json({ ..._cache.data, cached: true });
  }

  const [anthropicResult, notionResult, googleResult, groqResult, mcpResult] =
    await Promise.allSettled([
      checkAnthropic(),
      checkNotion(),
      checkGoogle(),
      checkGroq(),
      checkMcp(),
    ]);

  const toStatus = (r: PromiseSettledResult<HealthStatus>): HealthStatus =>
    r.status === "fulfilled"
      ? r.value
      : {
          ok: false,
          label: "Błąd połączenia",
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        };

  const data: HealthResponse = {
    anthropic: toStatus(anthropicResult),
    notion: toStatus(notionResult),
    google: toStatus(googleResult),
    groq: toStatus(groqResult),
    mcp: toStatus(mcpResult),
    timestamp: new Date().toISOString(),
    cached: false,
  };

  _cache = { data, expiresAt: Date.now() + CACHE_TTL };
  return NextResponse.json(data);
}
