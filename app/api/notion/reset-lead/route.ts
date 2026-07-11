import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BLOCKED_RESET_STATUSES, LEAD_RESET_PROPERTIES } from "@/lib/notion/resetFields";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
// In @notionhq/client v5, databases.query moved to dataSources.query
const PIPELINE_DATA_SOURCE_ID = "2ea38355-7529-48f9-8d7f-1c62f5570df3";

const bodySchema = z.object({
  telefon: z.string().optional(),
  firma: z.string().optional(),
  kontakt: z.string().optional(),
});

// Ta sama normalizacja co w app/api/notion/pipeline/route.ts — dedup po ostatnich 9 cyfrach.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

function extractTitle(prop: PageObjectResponse["properties"][string] | undefined): string {
  if (!prop || prop.type !== "title") return "";
  return prop.title
    .map((t) => t.plain_text)
    .join("")
    .trim();
}

function extractRichText(prop: PageObjectResponse["properties"][string] | undefined): string {
  if (!prop || prop.type !== "rich_text") return "";
  return prop.rich_text
    .map((t) => t.plain_text)
    .join("")
    .trim();
}

function extractPhone(prop: PageObjectResponse["properties"][string] | undefined): string {
  if (!prop || prop.type !== "phone_number") return "";
  return prop.phone_number ?? "";
}

function extractSelect(prop: PageObjectResponse["properties"][string] | undefined): string {
  if (!prop || prop.type !== "select") return "";
  return prop.select?.name ?? "";
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" },
      { status: 400 },
    );
  }
  const { telefon, firma, kontakt } = parsed.data;

  try {
    const pages: PageObjectResponse[] = [];
    let cursor: string | undefined;
    do {
      const response = await notion.dataSources.query({
        data_source_id: PIPELINE_DATA_SOURCE_ID,
        page_size: 100,
        start_cursor: cursor,
      });
      pages.push(...response.results.filter((p): p is PageObjectResponse => p.object === "page"));
      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);

    let match: PageObjectResponse | undefined;
    let matchedBy: "telefon" | "firma" | "kontakt" | null = null;

    const phoneKey = telefon ? normalizePhone(telefon) : "";
    if (phoneKey) {
      match = pages.find((p) => normalizePhone(extractPhone(p.properties["Telefon"])) === phoneKey);
      if (match) matchedBy = "telefon";
    }

    if (!match && firma?.trim()) {
      const firmaKey = firma.toLowerCase().trim();
      match = pages.find(
        (p) => extractTitle(p.properties["Firma"]).toLowerCase().trim() === firmaKey,
      );
      if (match) matchedBy = "firma";
    }

    if (!match && kontakt?.trim()) {
      const kontaktKey = kontakt.toLowerCase().trim();
      match = pages.find(
        (p) => extractRichText(p.properties["Kontakt"]).toLowerCase().trim() === kontaktKey,
      );
      if (match) matchedBy = "kontakt";
    }

    if (!match) {
      // Diagnostyka: pokazuje dokładnie czego szukano, żeby dało się od razu
      // stwierdzić czy problem jest w normalizacji telefonu, pisowni Firma/Kontakt,
      // czy w tym że lead faktycznie jeszcze nie istnieje w Pipeline.
      return NextResponse.json({
        success: true,
        found: false,
        searched: { telefonKey: phoneKey || null, firma: firma ?? null, kontakt: kontakt ?? null },
        pipelineCount: pages.length,
      });
    }

    const status = extractSelect(match.properties["Status"]);
    if (BLOCKED_RESET_STATUSES.includes(status)) {
      return NextResponse.json({
        success: false,
        found: true,
        blocked: true,
        status,
        error: `Klient ma status "${status}" — to aktywny lub zakończony klient płacący. Reset zablokowany, wymaga ręcznego potwierdzenia poza tym przyciskiem.`,
      });
    }

    await notion.pages.update({ page_id: match.id, properties: LEAD_RESET_PROPERTIES });

    return NextResponse.json({
      success: true,
      found: true,
      cleared: true,
      pageId: match.id,
      matchedBy,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd resetu karty w Notion";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
