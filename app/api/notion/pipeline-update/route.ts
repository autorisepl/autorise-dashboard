import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const FIELD_MAP: Record<string, string> = {
  koszt_problemu: "Koszt problemu PLN/mc",
  koszt_roczny: "Koszt roczny PLN/rok",
  maile_dziennie: "Maile ze zleceniami / dzień",
  godziny_wpisywania: "Godziny wpisywania / spedytor",
  faktury_po_terminie: "Faktury po terminie / mc",
  srednia_wartosc_faktury: "Średnia wartość faktury PLN",
};

const bodySchema = z.object({
  pageId: z.string().min(1),
  fields: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" },
        { status: 400 },
      );
    }

    const { pageId, fields } = parsed.data;
    const properties: Record<string, { number: number }> = {};

    for (const [key, notionProp] of Object.entries(FIELD_MAP)) {
      const val = fields[key];
      if (val != null && typeof val === "number") {
        properties[notionProp] = { number: val };
      }
    }

    if (Object.keys(properties).length === 0) {
      return NextResponse.json(
        { success: false, error: "Brak pól do aktualizacji" },
        { status: 400 },
      );
    }

    await notion.pages.update({ page_id: pageId, properties });

    const page = (await notion.pages.retrieve({ page_id: pageId })) as Record<string, unknown>;
    const props = (page.properties ?? {}) as Record<string, unknown>;
    const nameField = props["Firma / Nazwa"] as
      | { title?: Array<{ plain_text: string }> }
      | undefined;
    const firmaNazwa = nameField?.title?.[0]?.plain_text ?? "";

    return NextResponse.json({ success: true, firmaNazwa });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Nieznany błąd";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
