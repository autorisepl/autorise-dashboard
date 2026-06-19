import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const PIPELINE_DB_ID = "75ac8bc6fd6d4c36934bedc1270217eb";
const CACHE_TTL = 45_000; // 45 seconds — avoids hitting external APIs on every page load

export interface HealthStatus {
  ok: boolean;
  label: string;
  error?: string;
}

export interface HealthResponse {
  anthropic: HealthStatus;
  notion: HealthStatus;
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

export async function GET() {
  // Return cached response if still valid
  if (_cache && Date.now() < _cache.expiresAt) {
    return NextResponse.json({ ..._cache.data, cached: true });
  }

  const [anthropicResult, notionResult] = await Promise.allSettled([
    checkAnthropic(),
    checkNotion(),
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
    timestamp: new Date().toISOString(),
    cached: false,
  };

  _cache = { data, expiresAt: Date.now() + CACHE_TTL };
  return NextResponse.json(data);
}
