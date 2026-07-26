import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import { getOAuth2UserClient, getRefreshToken, isInvalidGrant } from "@/lib/google/auth";

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

// Wcześniej ta funkcja sprawdzała TYLKO obecność GOOGLE_CLIENT_ID — zawsze zwracała "ok" nawet
// gdy token odświeżający realnie wygasł/został unieważniony (invalid_client/invalid_grant),
// więc /kontrola pokazywało fałszywe "Połączono" mimo że każde realne wywołanie Google API
// faktycznie failowało. Teraz robi tę samą realną weryfikację co /api/auth/google/status —
// czyta ciasteczko z requestu i wykonuje jedno prawdziwe wywołanie userinfo.get().
async function checkGoogle(req: Request): Promise<HealthStatus> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId)
    return { ok: false, label: "Brak konfiguracji", error: "GOOGLE_CLIENT_ID nie ustawiony" };

  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)google_refresh_token=([^;]+)/);
  const token = getRefreshToken({
    get: (name: string) =>
      name === "google_refresh_token" && cookieMatch
        ? { value: decodeURIComponent(cookieMatch[1]) }
        : undefined,
  });

  if (!token) {
    return {
      ok: false,
      label: "Niepołączono",
      error: "Brak tokenu odświeżającego — połącz konto na stronie profilu",
    };
  }

  try {
    const userClient = getOAuth2UserClient(token);
    await userClient.userinfo.get();
    return { ok: true, label: "Połączono" };
  } catch (err) {
    if (isInvalidGrant(err)) {
      return {
        ok: false,
        label: "Token wygasł",
        error:
          "Token odświeżający nieważny (invalid_grant/invalid_client) — połącz konto ponownie na stronie profilu. Częste przy niezweryfikowanej (Testing) aplikacji w Google Cloud Console: token wygasa po 7 dniach.",
      };
    }
    return {
      ok: false,
      label: "Błąd połączenia",
      error: err instanceof Error ? err.message : String(err),
    };
  }
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
      checkGoogle(req),
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
