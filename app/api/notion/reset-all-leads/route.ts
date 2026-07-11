import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NextResponse } from "next/server";
import { BLOCKED_RESET_STATUSES, LEAD_RESET_PROPERTIES } from "@/lib/notion/resetFields";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const PIPELINE_DATA_SOURCE_ID = "2ea38355-7529-48f9-8d7f-1c62f5570df3";

function extractTitle(prop: PageObjectResponse["properties"][string] | undefined): string {
  if (!prop || prop.type !== "title") return "";
  return prop.title
    .map((t) => t.plain_text)
    .join("")
    .trim();
}

function extractSelect(prop: PageObjectResponse["properties"][string] | undefined): string {
  if (!prop || prop.type !== "select") return "";
  return prop.select?.name ?? "";
}

export async function POST() {
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

    const blocked: Array<{ firma: string; status: string }> = [];
    const errors: Array<{ firma: string; error: string }> = [];
    let resetCount = 0;

    for (const page of pages) {
      const status = extractSelect(page.properties["Status"]);
      const firma = extractTitle(page.properties["Firma"]) || page.id;

      if (BLOCKED_RESET_STATUSES.includes(status)) {
        blocked.push({ firma, status });
        continue;
      }

      try {
        await notion.pages.update({ page_id: page.id, properties: LEAD_RESET_PROPERTIES });
        resetCount += 1;
      } catch (err) {
        errors.push({ firma, error: err instanceof Error ? err.message : "Nieznany błąd" });
      }
    }

    return NextResponse.json({
      success: true,
      total: pages.length,
      resetCount,
      blockedCount: blocked.length,
      blocked,
      errors,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd bulk resetu Pipeline";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
