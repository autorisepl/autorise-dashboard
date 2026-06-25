import { Client } from "@notionhq/client";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pageId = searchParams.get("pageId");

  if (!pageId) {
    return NextResponse.json({ success: false, error: "pageId required" }, { status: 400 });
  }

  try {
    // List blocks of the pipeline client page
    const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 50 });

    // Find "Pre-Discovery Brief" child page
    const childPage = blocks.results.find((b) => {
      const block = b as BlockObjectResponse;
      return (
        block.type === "child_page" &&
        (block as BlockObjectResponse & { child_page: { title: string } }).child_page.title ===
          "Pre-Discovery Brief"
      );
    });

    if (!childPage) {
      return NextResponse.json({ success: true, plan: null });
    }

    // Fetch content of the child page
    const contentBlocks = await notion.blocks.children.list({
      block_id: childPage.id,
      page_size: 100,
    });

    // Reconstruct plain text from paragraph/heading blocks
    const lines: string[] = [];
    for (const block of contentBlocks.results) {
      const b = block as BlockObjectResponse;
      if (b.type === "paragraph") {
        const text = b.paragraph.rich_text.map((t) => t.plain_text).join("");
        lines.push(text);
      } else if (b.type === "heading_1") {
        const text = b.heading_1.rich_text.map((t) => t.plain_text).join("");
        lines.push(text);
      } else if (b.type === "heading_2") {
        const text = b.heading_2.rich_text.map((t) => t.plain_text).join("");
        lines.push(text);
      }
    }

    const plan = lines.join("\n\n").trim();
    return NextResponse.json({ success: true, plan: plan || null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Notion";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
