import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

// ZAŁOŻENIE SCHEMATU (nie zweryfikowane na żywo — integracja "autorise-dashboard" nie miała
// w momencie budowy dostępu do tej bazy w Notion, patrz CLAUDE.md sekcja Finanse osobiste).
// Nazwy property poniżej wprost z treści zadania. Jeśli realne nazwy w Notion się różnią,
// wywołania Notion API zwrócą "... is not a property that exists" — ten błąd jest przepuszczany
// do UI 1:1 (ten sam wzorzec co /api/notion/pipeline-update), więc niezgodność będzie widoczna
// od razu, nie ukryta.
export const FINANCE_DATA_SOURCE_ID = "2c5f037e-6673-4af0-8ae7-18a7e192d353";

const PROP = {
  nazwa: "Nazwa",
  typ: "Typ",
  kwota: "Kwota",
  kategoria: "Kategoria",
  data: "Data",
  notatka: "Notatka",
  przypisanie: "Przypisane do przychodu",
} as const;

export type FinanceTyp = "Przychód" | "Wydatek";

export interface FinanceEntry {
  id: string;
  nazwa: string;
  typ: FinanceTyp | "";
  kwota: number;
  kategoria: string[];
  data: string; // yyyy-mm-dd
  notatka: string;
  przypisaneDoPrzychoduId: string | null;
  przypisaneDoPrzychoduNazwa: string | null;
  lastEdited: string;
}

export interface FinanceEntryInput {
  nazwa: string;
  typ: FinanceTyp;
  kwota: number;
  kategoria: string[];
  data: string;
  notatka?: string;
  przypisaneDoPrzychoduId?: string | null;
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });

function richText(text: string) {
  return [{ type: "text" as const, text: { content: text.slice(0, 2000) } }];
}

function extractText(prop: PageObjectResponse["properties"][string] | undefined): string {
  if (!prop) return "";
  if (prop.type === "rich_text")
    return prop.rich_text
      .map((t) => t.plain_text)
      .join("")
      .trim();
  if (prop.type === "title")
    return prop.title
      .map((t) => t.plain_text)
      .join("")
      .trim();
  if (prop.type === "select") return prop.select?.name ?? "";
  if (prop.type === "date") return prop.date?.start ?? "";
  return "";
}

function extractNumber(prop: PageObjectResponse["properties"][string] | undefined): number {
  if (!prop) return 0;
  if (prop.type === "number") return prop.number ?? 0;
  return 0;
}

function extractMultiSelect(prop: PageObjectResponse["properties"][string] | undefined): string[] {
  if (!prop) return [];
  if (prop.type === "multi_select") return prop.multi_select.map((o) => o.name);
  return [];
}

function extractRelationIds(prop: PageObjectResponse["properties"][string] | undefined): string[] {
  if (!prop) return [];
  if (prop.type === "relation") return prop.relation.map((r) => r.id);
  return [];
}

function toEntryShape(page: PageObjectResponse): Omit<FinanceEntry, "przypisaneDoPrzychoduNazwa"> {
  const props = page.properties;
  const relIds = extractRelationIds(props[PROP.przypisanie]);
  return {
    id: page.id,
    nazwa: extractText(props[PROP.nazwa]),
    typ: (extractText(props[PROP.typ]) as FinanceTyp | "") || "",
    kwota: extractNumber(props[PROP.kwota]),
    kategoria: extractMultiSelect(props[PROP.kategoria]),
    data: extractText(props[PROP.data]),
    notatka: extractText(props[PROP.notatka]),
    przypisaneDoPrzychoduId: relIds[0] ?? null,
    lastEdited: page.last_edited_time,
  };
}

export interface FinanceSchemaOptions {
  kategoria: string[];
}

/** Opcje multi-select "Kategoria" już istniejące w Notion — wyłącznie do podpowiedzi w UI,
 * nowe wartości i tak można wpisać dowolne (Notion API sam dopisuje nową opcję do property). */
export async function getFinanceSchemaOptions(): Promise<FinanceSchemaOptions> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ds = (await (notion.dataSources as any).retrieve({
      data_source_id: FINANCE_DATA_SOURCE_ID,
    })) as {
      properties: Record<string, { type: string; multi_select?: { options: { name: string }[] } }>;
    };
    const kategoriaProp = ds.properties?.[PROP.kategoria];
    const kategoria =
      kategoriaProp?.type === "multi_select"
        ? (kategoriaProp.multi_select?.options.map((o) => o.name) ?? [])
        : [];
    return { kategoria };
  } catch {
    return { kategoria: [] };
  }
}

export async function listFinanceEntries(): Promise<FinanceEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = (await (notion.dataSources as any).query({
    data_source_id: FINANCE_DATA_SOURCE_ID,
    sorts: [{ property: PROP.data, direction: "descending" }],
    page_size: 100,
  })) as { results: PageObjectResponse[] };

  const pages = response.results.filter((p): p is PageObjectResponse => p.object === "page");
  const shapes = pages.map(toEntryShape);
  const nameById = new Map(shapes.map((s) => [s.id, s.nazwa]));

  return shapes.map((s) => ({
    ...s,
    przypisaneDoPrzychoduNazwa: s.przypisaneDoPrzychoduId
      ? (nameById.get(s.przypisaneDoPrzychoduId) ?? null)
      : null,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProperties(input: Partial<FinanceEntryInput>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {};
  if (input.nazwa !== undefined) properties[PROP.nazwa] = { title: richText(input.nazwa) };
  if (input.typ !== undefined) properties[PROP.typ] = { select: { name: input.typ } };
  if (input.kwota !== undefined) properties[PROP.kwota] = { number: input.kwota };
  if (input.kategoria !== undefined) {
    properties[PROP.kategoria] = { multi_select: input.kategoria.map((name) => ({ name })) };
  }
  if (input.data !== undefined) properties[PROP.data] = { date: { start: input.data } };
  if (input.notatka !== undefined) {
    properties[PROP.notatka] = { rich_text: input.notatka ? richText(input.notatka) : [] };
  }
  if (input.przypisaneDoPrzychoduId !== undefined) {
    properties[PROP.przypisanie] = {
      relation: input.przypisaneDoPrzychoduId ? [{ id: input.przypisaneDoPrzychoduId }] : [],
    };
  }
  return properties;
}

export async function createFinanceEntry(input: FinanceEntryInput): Promise<string> {
  const page = await notion.pages.create({
    parent: { data_source_id: FINANCE_DATA_SOURCE_ID },
    properties: buildProperties(input),
  });
  return page.id;
}

export async function updateFinanceEntry(
  id: string,
  input: Partial<FinanceEntryInput>,
): Promise<void> {
  const properties = buildProperties(input);
  if (Object.keys(properties).length === 0) return;
  await notion.pages.update({ page_id: id, properties });
}

/**
 * Usuwa wpis (kosz Notion, `in_trash`). Jeśli to przychód, najpierw czyści "Przypisane do
 * przychodu" na wszystkich wydatkach które na niego wskazywały — same trashowanie strony w
 * Notion NIE czyści relacji po drugiej stronie automatycznie dopóki strona jest tylko w koszu
 * (nie trwale usunięta), więc bez tego kroku zostałyby martwe odnośniki.
 */
export async function deleteFinanceEntry(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dependents = (await (notion.dataSources as any).query({
    data_source_id: FINANCE_DATA_SOURCE_ID,
    filter: { property: PROP.przypisanie, relation: { contains: id } },
    page_size: 100,
  })) as { results: PageObjectResponse[] };

  for (const page of dependents.results) {
    if (page.object !== "page") continue;
    const current = extractRelationIds((page as PageObjectResponse).properties[PROP.przypisanie]);
    const cleaned = current.filter((relId) => relId !== id);
    await notion.pages.update({
      page_id: page.id,
      properties: { [PROP.przypisanie]: { relation: cleaned.map((relId) => ({ id: relId })) } },
    });
  }

  await notion.pages.update({ page_id: id, in_trash: true });
}
