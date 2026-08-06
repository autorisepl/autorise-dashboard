import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE_TTL = 20_000; // 20 seconds — ta sama polityka co /api/health

export type ToolCategory = "read" | "write" | "notion";

export interface ToolCatalogEntry {
  name: string;
  description: string;
  category: ToolCategory;
}

export interface McpToolsResponse {
  ok: boolean;
  toolsCatalog: ToolCatalogEntry[];
  cached: boolean;
  error?: string;
}

let _cache: { data: McpToolsResponse; expiresAt: number } | null = null;

export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("force") === "1";
  if (!force && _cache && Date.now() < _cache.expiresAt) {
    return NextResponse.json({ ..._cache.data, cached: true });
  }

  try {
    const res = await fetch("https://mcp.autorise.pl/health", {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { toolsCatalog?: ToolCatalogEntry[] };
    const result: McpToolsResponse = {
      ok: true,
      toolsCatalog: data.toolsCatalog ?? [],
      cached: false,
    };
    _cache = { data: result, expiresAt: Date.now() + CACHE_TTL };
    return NextResponse.json(result);
  } catch (err) {
    const result: McpToolsResponse = {
      ok: false,
      toolsCatalog: [],
      cached: false,
      error: err instanceof Error ? err.message : String(err),
    };
    return NextResponse.json(result);
  }
}
