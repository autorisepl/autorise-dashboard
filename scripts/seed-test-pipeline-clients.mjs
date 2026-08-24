// Zasila public.pipeline dziewięcioma rekordami demonstracyjnymi — po jednym na każdy status
// widoczny na Kanbanie /pipeline (patrz lib/supabase/pipelineKanban.ts). Każdy pinowany jako
// PIERWSZA karta w swojej kolumnie (page.tsx sortuje jest_testowy przed resztą), żeby zespół i
// agenci mieli żywy przykład jak powinna wyglądać kompletna karta na danym etapie.
//
// Wymagania przed uruchomieniem:
//   1. supabase/migrations/0004_pipeline_jest_testowy.sql musi być już wklejone i wykonane
//      w Supabase Dashboard > SQL Editor (dokłada kolumnę jest_testowy).
//   2. .env.local musi mieć NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY.
//
// Użycie:
//   node scripts/seed-test-pipeline-clients.mjs
//
// Bezpieczne do uruchomienia wielokrotnie — upsert po notion_page_id (stałe, syntetyczne id
// per status, prefiks "test-"), nie tworzy duplikatów. jest_testowy:true wyklucza te rekordy
// z liczników biznesowych (Aktywnych klientów, sumy PLN, /statystyki).
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envFile = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
function envVar(name) {
  const m = envFile.match(new RegExp(`^${name}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

const SUPABASE_URL = envVar("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = envVar("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Brakuje NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY w .env.local.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function daysAgoIso(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysAheadIso(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const WSZYSTKIE_MODULY = ["email-parser", "document-ocr", "whatsapp-alerts"];

const base = {
  jest_testowy: true,
  kontakt: "Jan Testowy",
  nip: "1234567890",
  notatki: "Karta testowa — przykład jak powinny wyglądać dane na tym etapie.",
};

const ROWS = [
  {
    notion_page_id: "test-nowy-lead",
    firma: "[TEST] Firma Wzorcowa — Nowy lead",
    telefon: "+48 500 000 001",
    email: "test.nowylead@przyklad.pl",
    status: "Nowy lead",
    data_pierwszego_kontaktu: daysAgoIso(2),
    ...base,
  },
  {
    notion_page_id: "test-kwalifikacja",
    firma: "[TEST] Firma Wzorcowa — Kwalifikacja",
    telefon: "+48 500 000 002",
    email: "test.kwalifikacja@przyklad.pl",
    status: "Kwalifikacja",
    data_pierwszego_kontaktu: daysAgoIso(5),
    ocena_icp: "4 (świetne dopasowanie)",
    bol_glowny: "Zbyt dużo czasu na ręczne wpisywanie zleceń do TMS",
    hipoteza_bol_glowny: "Brak integracji z giełdami transportowymi",
    nastepny_krok: "Umówić Discovery Call",
    cytaty_klienta:
      "Codziennie tracimy przez to z 2 godziny.|||kontekst: pytanie o godziny wpisywania zleceń\nNikt z konkurencji nie oferował nam czegoś takiego.|||kontekst: reakcja na pitch",
    uwagi_agenta_1:
      "1. Klient wysoko zmotywowany, wspomina konkretne kwoty strat. 2. Decydent obecny na rozmowie, nie trzeba dodatkowej zgody. 3. Warto zaproponować szybki termin Discovery, klient chce ruszyć jeszcze w tym miesiącu.",
    ...base,
  },
  {
    notion_page_id: "test-discovery-umowione",
    firma: "[TEST] Firma Wzorcowa — Discovery umówione",
    telefon: "+48 500 000 003",
    email: "test.discovery@przyklad.pl",
    status: "Discovery umówione",
    data_pierwszego_kontaktu: daysAgoIso(8),
    data_discovery: daysAheadIso(3),
    ocena_icp: "4 (świetne dopasowanie)",
    nastepny_krok: "Discovery Call zaplanowany, przygotować pitch_recipe",
    ...base,
  },
  {
    notion_page_id: "test-niekwalifikowany",
    firma: "[TEST] Firma Wzorcowa — Niekwalifikowany",
    telefon: "+48 500 000 004",
    email: "test.niekwalifikowany@przyklad.pl",
    status: "Niekwalifikowany",
    data_pierwszego_kontaktu: daysAgoIso(10),
    ocena_icp: "2 (za mała skala)",
    powod_rezygnacji: "Zbyt mała flota (3 pojazdy, ICP wymaga min. 8)",
    ...base,
  },
  {
    notion_page_id: "test-nieaktywny",
    firma: "[TEST] Firma Wzorcowa — Nieaktywny (follow up)",
    telefon: "+48 500 000 005",
    email: "test.nieaktywny@przyklad.pl",
    status: "Nieaktywny (follow up)",
    data_pierwszego_kontaktu: daysAgoIso(14),
    typ_follow_up: "Callback",
    data_nastepnego_kroku: daysAheadIso(7),
    nastepny_krok: "Oddzwonić po urlopie klienta (deklarował powrót za tydzień)",
    ...base,
  },
  {
    notion_page_id: "test-finalizacja",
    firma: "[TEST] Firma Wzorcowa — Finalizacja",
    telefon: "+48 500 000 006",
    email: "test.finalizacja@przyklad.pl",
    status: "Finalizacja",
    data_pierwszego_kontaktu: daysAgoIso(20),
    ocena_icp: "4 (świetne dopasowanie)",
    cena_wdrozenia: 18000,
    moduly_wdrazane: ["email-parser", "document-ocr"],
    warunki_umowy_uwagi: "Przykładowe ustalenia warunków umowy dla karty testowej.",
    nastepny_krok: "Wysłać umowę do podpisu",
    ...base,
  },
  {
    notion_page_id: "test-kickoff",
    firma: "[TEST] Firma Wzorcowa — Kickoff",
    telefon: "+48 500 000 007",
    email: "test.kickoff@przyklad.pl",
    status: "Kickoff",
    data_pierwszego_kontaktu: daysAgoIso(28),
    cena_wdrozenia: 18000,
    moduly_wdrazane: WSZYSTKIE_MODULY,
    kickoff_odbyty: true,
    data_kickoff: daysAgoIso(1),
    ...base,
  },
  {
    notion_page_id: "test-wdrozenie",
    firma: "[TEST] Firma Wzorcowa — Wdrożenie",
    telefon: "+48 500 000 008",
    email: "test.wdrozenie@przyklad.pl",
    status: "Wdrożenie",
    data_pierwszego_kontaktu: daysAgoIso(35),
    cena_wdrozenia: 18000,
    moduly_wdrazane: WSZYSTKIE_MODULY,
    data_potwierdzenia_dostepow: daysAgoIso(5),
    czas_bazowy_potwierdzony_h_mc: 40,
    ...base,
  },
  {
    notion_page_id: "test-retainer",
    firma: "[TEST] Firma Wzorcowa — Retainer",
    telefon: "+48 500 000 009",
    email: "test.retainer@przyklad.pl",
    status: "Retainer",
    data_pierwszego_kontaktu: daysAgoIso(90),
    cena_wdrozenia: 18000,
    retainer_pln_mc: 4000,
    moduly_wdrazane: WSZYSTKIE_MODULY,
    ostatni_kontakt_retainer: daysAgoIso(3),
    historia_zgloszen_retainer: `${daysAgoIso(3)} | Przykładowe zgłoszenie testowe, wszystko działa poprawnie.`,
    ...base,
  },
];

for (const row of ROWS) {
  const { error } = await supabase
    .from("pipeline")
    .upsert(row, { onConflict: "notion_page_id" });
  if (error) {
    console.error(`Błąd dla ${row.notion_page_id}:`, error.message);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${row.firma}`);
  }
}
