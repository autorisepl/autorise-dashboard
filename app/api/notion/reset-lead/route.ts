import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
// In @notionhq/client v5, databases.query moved to dataSources.query
const PIPELINE_DATA_SOURCE_ID = "2ea38355-7529-48f9-8d7f-1c62f5570df3";

// Klienci płacący lub zakończeni — reset wymaga ręcznego potwierdzenia, nigdy automatycznego.
const BLOCKED_STATUSES = ["Kickoff", "Wdrożenie", "Retainer", "Upsell", "Zakończona współpraca"];

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

    const phoneKey = telefon ? normalizePhone(telefon) : "";
    if (phoneKey) {
      match = pages.find((p) => normalizePhone(extractPhone(p.properties["Telefon"])) === phoneKey);
    }

    if (!match && firma?.trim()) {
      const firmaKey = firma.toLowerCase().trim();
      match = pages.find(
        (p) => extractTitle(p.properties["Firma"]).toLowerCase().trim() === firmaKey,
      );
    }

    if (!match && kontakt?.trim()) {
      const kontaktKey = kontakt.toLowerCase().trim();
      match = pages.find(
        (p) => extractRichText(p.properties["Kontakt"]).toLowerCase().trim() === kontaktKey,
      );
    }

    if (!match) {
      return NextResponse.json({ success: true, found: false });
    }

    const status = extractSelect(match.properties["Status"]);
    if (BLOCKED_STATUSES.includes(status)) {
      return NextResponse.json({
        success: false,
        found: true,
        blocked: true,
        status,
        error: `Klient ma status "${status}" — to aktywny lub zakończony klient płacący. Reset zablokowany, wymaga ręcznego potwierdzenia poza tym przyciskiem.`,
      });
    }

    type NotionProps = Parameters<typeof notion.pages.update>[0]["properties"];
    const emptyRichText = { rich_text: [] };
    const properties = {
      "Hipoteza ból główny": emptyRichText,
      "Przewidywane obiekcje": emptyRichText,
      "Ryzyka rozmowy": emptyRichText,
      "Uwagi Agenta 2": emptyRichText,
      "Poprzednie próby": emptyRichText,
      "Koszt problemu PLN/mc": { number: null },
      "Koszt roczny PLN/rok": { number: null },
      "Uwagi Agenta 1": emptyRichText,
      "Uwagi Agenta 4": emptyRichText,
      "Maile ze zleceniami / dzień": { number: null },
      "Godziny wpisywania / spedytor": { number: null },
      "Faktury po terminie / mc": { number: null },
      "Średnia wartość faktury PLN": { number: null },
      "Ból główny": emptyRichText,
      "Podejście TMS": emptyRichText,
      Obiekcje: emptyRichText,
      Notatki: emptyRichText,
      "Następny krok": emptyRichText,
      "Pitch Recipe": emptyRichText,
      "Cytaty klienta": emptyRichText,
      "Personalizacja prezentacji": emptyRichText,
      "Ocena ICP": { select: null },
      "Data discovery": { date: null },
      "Data następnego kroku": { date: null },
      "Liczba prób kontaktu": { number: 0 },
      Status: { select: { name: "Nowy lead" } },
    } as Record<string, unknown> as NotionProps;

    await notion.pages.update({ page_id: match.id, properties });

    return NextResponse.json({ success: true, found: true, cleared: true, pageId: match.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd resetu karty w Notion";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
