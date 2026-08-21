// Jednorazowa migracja: kopiuje wszystkie rekordy z bazy Pipeline w Notion do
// public.pipeline w Supabase. Uruchamiana ręcznie z terminala, NIE jest endpointem API.
//
// Wymagania przed uruchomieniem:
//   1. supabase/migrations/0001_pipeline_schema.sql i 0002_pipeline_rls.sql muszą być
//      już wklejone i wykonane w Supabase Dashboard > SQL Editor.
//   2. .env.local musi mieć NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
//      (już tam są) oraz SUPABASE_SERVICE_ROLE_KEY (wklej ręcznie z Supabase Dashboard).
//
// Użycie:
//   node scripts/migrate-notion-to-supabase.mjs
//
// Bezpieczne do uruchomienia wielokrotnie — upsert po notion_page_id, nic nie usuwa
// ani nie modyfikuje w Notion (tylko odczyt), zapisuje pełny backup JSON PRZED
// jakimkolwiek zapisem do Supabase.
import { Client } from "@notionhq/client";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envFile = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
function envVar(name) {
  const m = envFile.match(new RegExp(`^${name}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

const NOTION_TOKEN = envVar("NOTION_TOKEN");
const SUPABASE_URL = envVar("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = envVar("SUPABASE_SERVICE_ROLE_KEY");
const PIPELINE_DATA_SOURCE_ID = "2ea38355-7529-48f9-8d7f-1c62f5570df3";

if (!NOTION_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Brakuje NOTION_TOKEN / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY w .env.local. " +
      "SUPABASE_SERVICE_ROLE_KEY wklej ręcznie z Supabase Dashboard > Project Settings > API.",
  );
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ALLOWED_STATUSES = new Set([
  "Nowy lead",
  "Kwalifikacja",
  "Discovery umówione",
  "Niekwalifikowany",
  "Nieaktywny (follow up)",
  "Finalizacja",
  "Kickoff",
  "Wdrożenie",
  "Retainer",
  "Upsell",
  "Zakończona współpraca",
]);

// column -> { notionProp, type }. type steruje generycznym konwerterem niżej.
const FIELD_MAP = {
  firma: { prop: "Firma", type: "title" },
  telefon: { prop: "Telefon", type: "phone_number" },
  utracony: { prop: "Utracony", type: "checkbox" },
  data_oferty: { prop: "Data oferty", type: "date" },
  srednia_wartosc_faktury_pln: { prop: "Średnia wartość faktury PLN", type: "number" },
  historia_zgloszen_retainer: { prop: "Historia zgłoszeń (retainer)", type: "rich_text" },
  decydent: { prop: "Decydent", type: "checkbox" },
  uwagi_agenta_1: { prop: "Uwagi Agenta 1", type: "rich_text" },
  nastepny_krok: { prop: "Następny krok", type: "rich_text" },
  spedytorzy: { prop: "Spedytorzy", type: "number" },
  re_engagement: { prop: "Re-engagement", type: "date" },
  roi_dopowiedzenie: { prop: "ROI dopowiedzenie", type: "rich_text" },
  cel_efektywnosci_procent: { prop: "Cel efektywności (%)", type: "number" },
  dostepy_zebrane: { prop: "Dostępy zebrane", type: "rich_text" },
  wynik_discovery: { prop: "Wynik Discovery", type: "select" },
  retainer_pln_mc: { prop: "Retainer PLN/mc", type: "number" },
  podejscie_tms: { prop: "Podejście TMS", type: "rich_text" },
  przewidywane_obiekcje: { prop: "Przewidywane obiekcje", type: "rich_text" },
  faktury_po_terminie_mc: { prop: "Faktury po terminie / mc", type: "number" },
  personalizacja_prezentacji: { prop: "Personalizacja prezentacji", type: "rich_text" },
  ryzyka_rozmowy: { prop: "Ryzyka rozmowy", type: "rich_text" },
  konkurencja_wspomniana: { prop: "Konkurencja wspomniana", type: "rich_text" },
  data_discovery: { prop: "Data discovery", type: "date" },
  warunki_umowy_dni_dostepow: { prop: "Warunki umowy — dni dostępów", type: "number" },
  warunki_umowy_uwagi: { prop: "Warunki umowy — uwagi", type: "rich_text" },
  hipoteza_bol_glowny: { prop: "Hipoteza ból główny", type: "rich_text" },
  powod_utraty: { prop: "Powód utraty", type: "rich_text" },
  koszt_problemu_pln_mc: { prop: "Koszt problemu PLN/mc", type: "number" },
  obiekcje: { prop: "Obiekcje", type: "rich_text" },
  cytaty_klienta: { prop: "Cytaty klienta", type: "rich_text" },
  email: { prop: "Email", type: "email" },
  czas_bazowy_potwierdzony_h_mc: { prop: "Czas bazowy potwierdzony h/mc", type: "number" },
  tms: { prop: "TMS", type: "rich_text" },
  protokol_odbioru_podpisany: { prop: "Protokół odbioru podpisany", type: "checkbox" },
  typ_follow_up: { prop: "Typ follow-up", type: "select" },
  kickoff_odbyty: { prop: "Kickoff odbyty", type: "checkbox" },
  liczba_prob_kontaktu: { prop: "Liczba prób kontaktu", type: "number" },
  kontakt: { prop: "Kontakt", type: "rich_text" },
  nip: { prop: "NIP", type: "rich_text" },
  pilnosc: { prop: "Pilność", type: "select" },
  maile_ze_zleceniami_dzien: { prop: "Maile ze zleceniami / dzień", type: "number" },
  uwagi_agenta_2: { prop: "Uwagi Agenta 2", type: "rich_text" },
  ostatni_kontakt_retainer: { prop: "Ostatni kontakt (retainer)", type: "date" },
  kalkulator_dane: { prop: "Kalkulator dane", type: "rich_text" },
  uwagi_agenta_4: { prop: "Uwagi Agenta 4", type: "rich_text" },
  data_kickoff: { prop: "Data Kickoff", type: "date" },
  godziny_wpisywania_spedytor: { prop: "Godziny wpisywania / spedytor", type: "number" },
  data_nastepnego_kroku: { prop: "Data następnego kroku", type: "date" },
  status: { prop: "Status", type: "select" },
  pomysl_na_funkcje: { prop: "Pomysł na funkcję", type: "rich_text" },
  flota: { prop: "Flota", type: "number" },
  data_zamkniecia: { prop: "Data zamknięcia", type: "date" },
  ocena_icp: { prop: "Ocena ICP", type: "select" },
  koszt_roczny_pln_rok: { prop: "Koszt roczny PLN/rok", type: "number" },
  zrodlo: { prop: "Źródło", type: "select" },
  tabela_modulow_kickoff: { prop: "Tabela modułów Kickoff", type: "rich_text" },
  system_transformacji_3_kroki: { prop: "System transformacji (3 kroki)", type: "rich_text" },
  tabela_modulow_weryfikacja: { prop: "Tabela modułów Weryfikacja", type: "rich_text" },
  wszystkie_transkrypty: { prop: "Wszystkie transkrypty", type: "rich_text" },
  cena_wdrozenia: { prop: "Cena wdrożenia", type: "number" },
  zdanie_roznicujace: { prop: "Zdanie różnicujące", type: "rich_text" },
  poprzednie_proby: { prop: "Poprzednie próby", type: "rich_text" },
  data_protokolu_odbioru: { prop: "Data protokołu odbioru", type: "date" },
  bol_glowny: { prop: "Ból główny", type: "rich_text" },
  powod_rezygnacji: { prop: "Powód rezygnacji", type: "rich_text" },
  notatki: { prop: "Notatki", type: "rich_text" },
  data_pierwszego_kontaktu: { prop: "Data pierwszego kontaktu", type: "date" },
  gotowosc_zakupowa: { prop: "Gotowość zakupowa", type: "select" },
  poza_zakresem_ustalenia: { prop: "Poza zakresem — ustalenia", type: "rich_text" },
  moduly_wdrazane: { prop: "Moduły wdrażane", type: "multi_select" },
  data_potwierdzenia_dostepow: { prop: "Data potwierdzenia dostępów", type: "date" },
  pitch_recipe: { prop: "Pitch Recipe", type: "rich_text" },
};

function extractValue(property, type) {
  if (!property) return null;
  switch (type) {
    case "title": {
      const text = (property.title ?? []).map((t) => t.plain_text).join("");
      return text || null;
    }
    case "rich_text": {
      const text = (property.rich_text ?? []).map((t) => t.plain_text).join("");
      return text || null;
    }
    case "number":
      return property.number ?? null;
    case "checkbox":
      return Boolean(property.checkbox);
    case "date":
      return property.date?.start ? new Date(property.date.start).toISOString() : null;
    case "select":
      return property.select?.name ?? null;
    case "multi_select": {
      const names = (property.multi_select ?? []).map((o) => o.name);
      return names.length ? names : null;
    }
    case "email":
      return property.email ?? null;
    case "phone_number":
      return property.phone_number ?? null;
    default:
      return null;
  }
}

function mapPageToRow(page) {
  const row = { notion_page_id: page.id };
  for (const [column, { prop, type }] of Object.entries(FIELD_MAP)) {
    row[column] = extractValue(page.properties[prop], type);
  }
  return row;
}

async function fetchAllPipelinePages() {
  const pages = [];
  let cursor;
  do {
    const response = await notion.dataSources.query({
      data_source_id: PIPELINE_DATA_SOURCE_ID,
      page_size: 100,
      start_cursor: cursor,
    });
    pages.push(...response.results.filter((p) => p.object === "page"));
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  return pages;
}

async function main() {
  console.log("Pobieram strony z bazy Pipeline w Notion...");
  const pages = await fetchAllPipelinePages();
  console.log(`Pobrano ${pages.length} rekordów.`);

  const backupDir = new URL("../backups/", import.meta.url);
  fs.mkdirSync(backupDir, { recursive: true });
  const dateStamp = new Date().toISOString().slice(0, 10);
  const backupPath = new URL(`notion-pipeline-export-${dateStamp}.json`, backupDir);
  fs.writeFileSync(backupPath, JSON.stringify(pages, null, 2), "utf8");
  console.log(`Backup zapisany: ${backupPath.pathname}`);

  let ok = 0;
  const errors = [];

  for (const page of pages) {
    const row = mapPageToRow(page);
    const firma = row.firma ?? "(bez nazwy)";

    if (row.status && !ALLOWED_STATUSES.has(row.status)) {
      errors.push({
        notion_page_id: page.id,
        firma,
        reason: `Status "${row.status}" nie jest jedną z 11 dozwolonych wartości — rekord pominięty`,
      });
      continue;
    }

    const { error } = await supabase.from("pipeline").upsert(row, { onConflict: "notion_page_id" });
    if (error) {
      errors.push({ notion_page_id: page.id, firma, reason: error.message });
      continue;
    }
    ok += 1;
  }

  console.log("\n=== Podsumowanie migracji ===");
  console.log(`Pobrane z Notion: ${pages.length}`);
  console.log(`Zapisane do Supabase: ${ok}`);
  console.log(`Błędy: ${errors.length}`);
  if (errors.length) {
    for (const e of errors) {
      console.log(`  - ${e.firma} (${e.notion_page_id}): ${e.reason}`);
    }
  }
}

main().catch((err) => {
  console.error("Migracja przerwana błędem krytycznym:", err);
  process.exit(1);
});
