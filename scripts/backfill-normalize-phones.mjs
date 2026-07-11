// Jednorazowy backfill: normalizuje istniejące numery telefonów w Notion Pipeline
// do formatu "+48 XXX XXX XXX". Uruchamiany ręcznie z terminala, NIE jest
// endpointem API i nie ma przycisku w UI.
//
// Użycie:
//   node scripts/backfill-normalize-phones.mjs
//
// Wymaga NOTION_TOKEN w .env.local (czytane bezpośrednio z pliku, ten sam
// wzorzec co w innych skryptach diagnostycznych tej sesji).
//
// Logika normalizePhonePL MUSI pozostać zgodna z lib/format/normalizePhonePL.ts
// - to jest świadomy duplikat (plik .mjs nie może bezpośrednio importować .ts
// bez dodatkowego narzędzia transpilującego, którego ten projekt nie ma
// zainstalowanego).
import { Client } from "@notionhq/client";
import fs from "node:fs";

function normalizePhonePL(input) {
  if (!input) return null;
  const digitsOnly = input.replace(/\D/g, "");
  let national9 = null;
  if (digitsOnly.startsWith("0048") && digitsOnly.length === 13) {
    national9 = digitsOnly.slice(4);
  } else if (digitsOnly.startsWith("48") && digitsOnly.length === 11) {
    national9 = digitsOnly.slice(2);
  } else if (digitsOnly.length === 9) {
    national9 = digitsOnly;
  }
  if (!national9 || national9.length !== 9) return null;
  return `+48 ${national9.slice(0, 3)} ${national9.slice(3, 6)} ${national9.slice(6, 9)}`;
}

const envFile = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
function envVar(name) {
  const m = envFile.match(new RegExp(`^${name}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

const NOTION_TOKEN = envVar("NOTION_TOKEN");
const PIPELINE_DATA_SOURCE_ID = "2ea38355-7529-48f9-8d7f-1c62f5570df3";

const notion = new Client({ auth: NOTION_TOKEN });

function extractTitle(prop) {
  if (!prop || prop.type !== "title") return "";
  return prop.title.map((t) => t.plain_text).join("");
}

function extractPhone(prop) {
  if (!prop || prop.type !== "phone_number") return "";
  return prop.phone_number ?? "";
}

async function main() {
  const pages = [];
  let cursor;
  do {
    const response = await notion.dataSources.query({
      data_source_id: PIPELINE_DATA_SOURCE_ID,
      page_size: 100,
      start_cursor: cursor,
    });
    pages.push(...response.results.filter((p) => p.object === "page"));
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  console.log(`Znaleziono ${pages.length} kart w Pipeline.`);

  let updated = 0;
  let unchanged = 0;
  const unnormalizable = [];

  for (const page of pages) {
    const firma = extractTitle(page.properties["Firma"]) || page.id;
    const current = extractPhone(page.properties["Telefon"]);
    if (!current) {
      unchanged++;
      continue;
    }

    const normalized = normalizePhonePL(current);
    if (!normalized) {
      unnormalizable.push({ firma, current });
      continue;
    }

    if (normalized === current) {
      unchanged++;
      continue;
    }

    await notion.pages.update({
      page_id: page.id,
      properties: { Telefon: { phone_number: normalized } },
    });
    console.log(`Zaktualizowano ${firma}: "${current}" -> "${normalized}"`);
    updated++;
  }

  console.log("\n=== Podsumowanie ===");
  console.log(`Zaktualizowano: ${updated}`);
  console.log(`Bez zmian (już poprawny format lub pusty telefon): ${unchanged}`);
  console.log(`Nie dało się znormalizować (${unnormalizable.length}) - popraw ręcznie:`);
  for (const { firma, current } of unnormalizable) {
    console.log(`  - ${firma}: "${current}"`);
  }
}

await main();
