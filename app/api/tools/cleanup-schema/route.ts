import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const PIPELINE_DATA_SOURCE_ID = "2ea38355-7529-48f9-8d7f-1c62f5570df3";

// Zombie property'e po wcześniejszej migracji z błędem kodowania polskich znaków /
// duplikaty nazw — zweryfikowane grep'em całego repo, nigdzie nie czytane ani
// zapisywane. Jednorazowe sprzątanie, nie funkcja do regularnego użytku.
const ORPHAN_CANDIDATES = [
  "Liczba pr█b kontaktu",
  "Wynik Discovery 1",
  "Followup typ",
  "Followup data",
  "Data follow-up",
];

function isEmptyPropertyValue(
  prop: PageObjectResponse["properties"][string] | undefined,
): boolean {
  if (!prop) return true;
  switch (prop.type) {
    case "title":
      return prop.title.length === 0;
    case "rich_text":
      return prop.rich_text.length === 0;
    case "number":
      return prop.number == null;
    case "select":
      return prop.select == null;
    case "status":
      return prop.status == null;
    case "multi_select":
      return prop.multi_select.length === 0;
    case "date":
      return prop.date == null;
    case "checkbox":
      return prop.checkbox === false;
    case "phone_number":
      return !prop.phone_number;
    case "email":
      return !prop.email;
    case "url":
      return !prop.url;
    case "people":
      return prop.people.length === 0;
    case "files":
      return prop.files.length === 0;
    case "relation":
      return prop.relation.length === 0;
    default:
      // Nieznany/rzadki typ (formula, rollup, itd.) - nie ryzykuj usunięcia
      // bez pewności, że jest puste.
      return false;
  }
}

export async function POST() {
  const usuniete: string[] = [];
  const pominiete_zawiera_dane: string[] = [];
  const nie_znaleziono: string[] = [];
  const errors: string[] = [];

  try {
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: PIPELINE_DATA_SOURCE_ID,
    });
    const liveProperties = dataSource.properties ?? {};

    const existingCandidates = ORPHAN_CANDIDATES.filter((name) => {
      if (name in liveProperties) return true;
      nie_znaleziono.push(name);
      return false;
    });

    if (existingCandidates.length === 0) {
      return NextResponse.json({ usuniete, pominiete_zawiera_dane, nie_znaleziono, errors });
    }

    // Przejdź cały Pipeline JEDEN raz, sprawdzając wartość każdego kandydata
    // na każdej stronie — twardy warunek, nie ufaj samej liście z grep'a.
    const containsData = new Set<string>();
    let cursor: string | undefined;
    do {
      const response = await notion.dataSources.query({
        data_source_id: PIPELINE_DATA_SOURCE_ID,
        page_size: 100,
        start_cursor: cursor,
      });
      const pages = response.results.filter((p): p is PageObjectResponse => p.object === "page");
      for (const page of pages) {
        for (const name of existingCandidates) {
          if (containsData.has(name)) continue;
          if (!isEmptyPropertyValue(page.properties[name])) {
            containsData.add(name);
          }
        }
      }
      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);

    const toDelete = existingCandidates.filter((name) => {
      if (containsData.has(name)) {
        pominiete_zawiera_dane.push(name);
        return false;
      }
      return true;
    });

    for (const name of toDelete) {
      try {
        await notion.dataSources.update({
          data_source_id: PIPELINE_DATA_SOURCE_ID,
          properties: { [name]: null },
        });
        usuniete.push(name);
      } catch (err) {
        errors.push(`${name}: ${err instanceof Error ? err.message : "nieznany błąd"}`);
      }
    }

    return NextResponse.json({ usuniete, pominiete_zawiera_dane, nie_znaleziono, errors });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd czyszczenia schematu";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
