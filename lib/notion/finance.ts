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
  subskrypcja: "Subskrypcja",
  cyklOdnawiania: "Cykl odnawiania",
  rodzajCyklu: "Rodzaj cyklu",
} as const;

export type FinanceTyp = "Przychód" | "Wydatek";

export const RENEWAL_INTERVALS = ["Tydzień", "Miesiąc", "Kwartał", "Rok"] as const;
export type RenewalInterval = (typeof RENEWAL_INTERVALS)[number];

// Subskrypcja osobista (Netflix, Claude Code itp.) vs Retainer klienta Autorise (stały,
// cykliczny przychód od klienta na wdrożeniu/utrzymaniu) — to samo mechanicznie (cykliczna
// kwota, cykl odnawiania), ale semantycznie różne rzeczy, więc liczone i pokazywane osobno.
export const RENEWAL_KINDS = ["Subskrypcja", "Retainer klienta"] as const;
export type RenewalKind = (typeof RENEWAL_KINDS)[number];

export interface FinanceEntry {
  id: string;
  nazwa: string;
  typ: FinanceTyp | "";
  kwota: number;
  kategoria: string[];
  data: string; // yyyy-mm-dd, "" = data nieznana
  notatka: string;
  przypisaneDoPrzychoduId: string | null;
  przypisaneDoPrzychoduNazwa: string | null;
  subskrypcja: boolean;
  cyklOdnawiania: RenewalInterval | null;
  rodzajCyklu: RenewalKind | null;
  lastEdited: string;
}

export interface FinanceEntryInput {
  nazwa: string;
  typ: FinanceTyp;
  kwota: number;
  kategoria: string[];
  data: string; // "" = data nieznana, czyści pole Data w Notion
  notatka?: string;
  przypisaneDoPrzychoduId?: string | null;
  subskrypcja?: boolean;
  cyklOdnawiania?: RenewalInterval | null;
  rodzajCyklu?: RenewalKind | null;
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

function extractCheckbox(prop: PageObjectResponse["properties"][string] | undefined): boolean {
  if (!prop) return false;
  if (prop.type === "checkbox") return prop.checkbox;
  return false;
}

function extractRenewalInterval(
  prop: PageObjectResponse["properties"][string] | undefined,
): RenewalInterval | null {
  if (prop?.type !== "select" || !prop.select) return null;
  const name = prop.select.name;
  return (RENEWAL_INTERVALS as readonly string[]).includes(name) ? (name as RenewalInterval) : null;
}

function extractRenewalKind(
  prop: PageObjectResponse["properties"][string] | undefined,
): RenewalKind | null {
  if (prop?.type !== "select" || !prop.select) return null;
  const name = prop.select.name;
  return (RENEWAL_KINDS as readonly string[]).includes(name) ? (name as RenewalKind) : null;
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
    subskrypcja: extractCheckbox(props[PROP.subskrypcja]),
    cyklOdnawiania: extractRenewalInterval(props[PROP.cyklOdnawiania]),
    rodzajCyklu: extractRenewalKind(props[PROP.rodzajCyklu]),
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

// Property "Subskrypcja"/"Cykl odnawiania" mogą nie istnieć jeszcze w bazie (dodane w tej
// rundzie, po pierwszej sesji budowy panelu). Tworzone idempotentnie przy każdym GET —
// bezpieczne mimo wywoływania za każdym razem, bo zawsze wysyłamy tę samą, pełną, stałą listę
// opcji cyklu (Tydzień/Miesiąc/Kwartał/Rok), nigdy częściową — więc nawet gdyby Notion
// nadpisywał opcje select przy update (jak robi dla ISTNIEJĄCYCH property, patrz CLAUDE.md),
// nic tu nigdy nie ginie. Błąd (np. brak uprawnień) połykany świadomie — panel ma działać
// dalej nawet bez tych dwóch pól, tylko bez funkcji subskrypcji.
export async function ensureFinanceSubscriptionSchema(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (notion.dataSources as any).update({
      data_source_id: FINANCE_DATA_SOURCE_ID,
      properties: {
        [PROP.subskrypcja]: { checkbox: {} },
        [PROP.cyklOdnawiania]: {
          select: { options: RENEWAL_INTERVALS.map((name) => ({ name })) },
        },
        [PROP.rodzajCyklu]: {
          select: { options: RENEWAL_KINDS.map((name) => ({ name })) },
        },
      },
    });
  } catch {
    // Brak dostępu albo property już istnieje w niekompatybilnym typie — nie blokuj reszty.
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
  if (input.data !== undefined) {
    // "" = data nieznana — czyści pole Data w Notion zamiast wysyłać nieprawidłowy pusty string.
    properties[PROP.data] = input.data ? { date: { start: input.data } } : { date: null };
  }
  if (input.notatka !== undefined) {
    properties[PROP.notatka] = { rich_text: input.notatka ? richText(input.notatka) : [] };
  }
  if (input.przypisaneDoPrzychoduId !== undefined) {
    properties[PROP.przypisanie] = {
      relation: input.przypisaneDoPrzychoduId ? [{ id: input.przypisaneDoPrzychoduId }] : [],
    };
  }
  if (input.subskrypcja !== undefined) {
    properties[PROP.subskrypcja] = { checkbox: input.subskrypcja };
  }
  if (input.cyklOdnawiania !== undefined) {
    properties[PROP.cyklOdnawiania] = input.cyklOdnawiania
      ? { select: { name: input.cyklOdnawiania } }
      : { select: null };
  }
  if (input.rodzajCyklu !== undefined) {
    properties[PROP.rodzajCyklu] = input.rodzajCyklu
      ? { select: { name: input.rodzajCyklu } }
      : { select: null };
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
