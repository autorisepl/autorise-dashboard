// Wewnętrznie czyta z Supabase (public.pipeline), NIE z Notion — przepięte 2026-08-22.
// Kontrakt zewnętrzny (URL, kształt JSON, nazwy pól PipelineClientDetailed) pozostał
// identyczny, żeby wszystkie miejsca wołające ten endpoint (sprzedaz/utrzymanie/wdrozenie/
// mapa/pipeline/KalkulatorRoi) działały bez zmian. Notion nie jest już w ogóle odpytywany
// przez ten route. Ścieżka nazwana wcześniej "DEPRECATED" bo miała zostać zastąpiona przez
// /api/pipeline (Supabase, inny kontrakt) — ale nic realnie się na ten nowy kontrakt nie
// przepięło, więc zamiast migrować wszystkich wołających, przepinamy wnętrze tego route'a.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export interface PipelineClientDetailed {
  id: string;
  firma: string;
  kontakt: string;
  telefon: string;
  email: string;
  nip: string;
  status: string;
  lastModified: string;
  dataDiscovery: string;
  nastepnyKrok: string;
  ocenaICP: string;
  dataFollowup: string;
  liczbaProb: number;
  notatki: string;
  bolGlowny: string;
  poprzednieProby: string;
  hipotezaBolGlowny: string;
  uwagiFAgent2: string;
  przewidywaneObiekcje: string;
  pitchRecipe: string;
  ryzyka: string;
  godzinyWpisywania: number;
  flota: number;
  tms: string;
  kosztRoczny: number;
  cytatyKlienta: string;
  warunkiDniDostepow: number;
  warunkiUwagi: string;
  pozaZakresem: string;
  dataPierwszegoKontaktu: string;
  utracony: boolean;
  powodUtraty: string;
  dataReengagement: string;
  systemTransformacji: string[];
  zdanieRoznicujace: string;
  roiDopowiedzenie: string;
  retainer: number;
  dataPotwierdzeniaDostepow: string;
  czasBazowyPotwierdzony: number;
  dostepyZebrane: string;
  ostatniKontaktRetainer: string;
  historiaZgloszenRetainer: string;
  wynikDiscovery: string;
  protokolOdbioruPodpisany: boolean;
  dataProtokoluOdbioru: string;
  kickoffOdbyty: boolean;
  dataKickoff: string;
  uwagiAgenta1: string;
  moduleWdrazane: string[];
  tabelaModulowKickoff: string;
  tabelaModulowWeryfikacja: string;
  celEfektywnosciProcent: number;
  tabelaModulowPrzedkontraktowa: string;
  cenaWdrozenia: number;
  jestTestowy: boolean;
  assignedSellerId: string;
  qualificationCallDone: boolean;
}

// Blok 1, punkt 1.5 (2026-07-14) — data premiery skryptu kwalifikacyjnego V4 (12 kroków, ICP
// wbudowane w diagnozę, kalkulator wielogrupowy — patrz CLAUDE.md, sekcja Skrypty
// sprzedażowe). Karty założone PRZED tą datą pochodzą ze starszej wersji rozmowy — dane mogą
// być niepełne wg dzisiejszych standardów. Wyprowadzone z istniejącego pola "Data pierwszego
// kontaktu", świadomie NIE jako nowe pole Notion (nic nowego do ręcznego wypełniania, nie
// rozjeżdża się z rzeczywistą datą wdrożenia zmiany).
export const SKRYPT_V4_DATA = "2026-07-03";

interface PipelineRow {
  id: string;
  firma: string;
  kontakt: string | null;
  telefon: string | null;
  email: string | null;
  nip: string | null;
  status: string | null;
  updated_at: string;
  data_discovery: string | null;
  nastepny_krok: string | null;
  ocena_icp: string | null;
  data_nastepnego_kroku: string | null;
  liczba_prob_kontaktu: number | null;
  notatki: string | null;
  bol_glowny: string | null;
  poprzednie_proby: string | null;
  hipoteza_bol_glowny: string | null;
  uwagi_agenta_2: string | null;
  przewidywane_obiekcje: string | null;
  pitch_recipe: string | null;
  ryzyka_rozmowy: string | null;
  godziny_wpisywania_spedytor: number | null;
  flota: number | null;
  tms: string | null;
  koszt_roczny_pln_rok: number | null;
  cytaty_klienta: string | null;
  warunki_umowy_dni_dostepow: number | null;
  warunki_umowy_uwagi: string | null;
  poza_zakresem_ustalenia: string | null;
  data_pierwszego_kontaktu: string | null;
  utracony: boolean;
  powod_utraty: string | null;
  re_engagement: string | null;
  system_transformacji_3_kroki: string | null;
  zdanie_roznicujace: string | null;
  roi_dopowiedzenie: string | null;
  retainer_pln_mc: number | null;
  data_potwierdzenia_dostepow: string | null;
  czas_bazowy_potwierdzony_h_mc: number | null;
  dostepy_zebrane: string | null;
  ostatni_kontakt_retainer: string | null;
  historia_zgloszen_retainer: string | null;
  wynik_discovery: string | null;
  protokol_odbioru_podpisany: boolean;
  data_protokolu_odbioru: string | null;
  kickoff_odbyty: boolean;
  data_kickoff: string | null;
  uwagi_agenta_1: string | null;
  moduly_wdrazane: string[] | null;
  tabela_modulow_kickoff: string | null;
  tabela_modulow_weryfikacja: string | null;
  cel_efektywnosci_procent: number | null;
  tabela_modulow_przedkontraktowa: string | null;
  cena_wdrozenia: number | null;
  jest_testowy: boolean | null;
  assigned_seller_id: string | null;
  qualification_call_done: boolean | null;
}

function mapRow(row: PipelineRow): PipelineClientDetailed {
  return {
    id: row.id,
    firma: row.firma || row.kontakt || "Bez nazwy",
    kontakt: row.kontakt ?? "",
    telefon: row.telefon ?? "",
    email: row.email ?? "",
    nip: row.nip ?? "",
    status: row.status ?? "",
    lastModified: row.updated_at,
    dataDiscovery: row.data_discovery ?? "",
    nastepnyKrok: row.nastepny_krok ?? "",
    ocenaICP: row.ocena_icp ?? "",
    dataFollowup: row.data_nastepnego_kroku ?? "",
    liczbaProb: row.liczba_prob_kontaktu ?? 0,
    notatki: row.notatki ?? "",
    bolGlowny: row.bol_glowny ?? "",
    poprzednieProby: row.poprzednie_proby ?? "",
    hipotezaBolGlowny: row.hipoteza_bol_glowny ?? "",
    uwagiFAgent2: row.uwagi_agenta_2 ?? "",
    przewidywaneObiekcje: row.przewidywane_obiekcje ?? "",
    pitchRecipe: row.pitch_recipe ?? "",
    ryzyka: row.ryzyka_rozmowy ?? "",
    godzinyWpisywania: row.godziny_wpisywania_spedytor ?? 0,
    flota: row.flota ?? 0,
    tms: row.tms ?? "",
    kosztRoczny: row.koszt_roczny_pln_rok ?? 0,
    cytatyKlienta: row.cytaty_klienta ?? "",
    warunkiDniDostepow: row.warunki_umowy_dni_dostepow ?? 0,
    warunkiUwagi: row.warunki_umowy_uwagi ?? "",
    pozaZakresem: row.poza_zakresem_ustalenia ?? "",
    dataPierwszegoKontaktu: row.data_pierwszego_kontaktu ?? "",
    utracony: row.utracony,
    powodUtraty: row.powod_utraty ?? "",
    dataReengagement: row.re_engagement ?? "",
    systemTransformacji: (row.system_transformacji_3_kroki ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    zdanieRoznicujace: row.zdanie_roznicujace ?? "",
    roiDopowiedzenie: row.roi_dopowiedzenie ?? "",
    retainer: row.retainer_pln_mc ?? 0,
    dataPotwierdzeniaDostepow: row.data_potwierdzenia_dostepow ?? "",
    czasBazowyPotwierdzony: row.czas_bazowy_potwierdzony_h_mc ?? 0,
    dostepyZebrane: row.dostepy_zebrane ?? "",
    ostatniKontaktRetainer: row.ostatni_kontakt_retainer ?? "",
    historiaZgloszenRetainer: row.historia_zgloszen_retainer ?? "",
    wynikDiscovery: row.wynik_discovery ?? "",
    protokolOdbioruPodpisany: row.protokol_odbioru_podpisany,
    dataProtokoluOdbioru: row.data_protokolu_odbioru ?? "",
    kickoffOdbyty: row.kickoff_odbyty,
    dataKickoff: row.data_kickoff ?? "",
    uwagiAgenta1: row.uwagi_agenta_1 ?? "",
    moduleWdrazane: row.moduly_wdrazane ?? [],
    tabelaModulowKickoff: row.tabela_modulow_kickoff ?? "",
    tabelaModulowWeryfikacja: row.tabela_modulow_weryfikacja ?? "",
    celEfektywnosciProcent: row.cel_efektywnosci_procent ?? 0,
    tabelaModulowPrzedkontraktowa: row.tabela_modulow_przedkontraktowa ?? "",
    cenaWdrozenia: row.cena_wdrozenia ?? 0,
    jestTestowy: row.jest_testowy ?? false,
    assignedSellerId: row.assigned_seller_id ?? "",
    qualificationCallDone: row.qualification_call_done ?? false,
  };
}

export async function GET() {
  try {
    // service_role (nie anon+RLS z lib/supabase/server) — celowo: ta strona jest client
    // component i importuje z tego pliku realną wartość SKRYPT_V4_DATA (nie tylko typ), więc
    // bundler wciąga całe drzewo importów route.ts do bundla klienckiego. lib/supabase/server
    // zależy od next/headers, co wywala build Turbopack ("Pages Router" error mimo App
    // Routera) w każdej wersji (statyczny czy dynamiczny import). lib/supabase/admin nie ma tej
    // zależności. Bezpieczne: ta ścieżka i tak jest chroniona przez proxy.ts (rola wymagana,
    // patrz SETTER_ALLOWED_PREFIXES) zanim request w ogóle dotrze do handlera — RLS był tu
    // dodatkową warstwą, nie jedyną granicą autoryzacji.
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("pipeline")
      .select("*")
      .order("data_pierwszego_kontaktu", { ascending: false, nullsFirst: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const clients: PipelineClientDetailed[] = (data as PipelineRow[])
      .map(mapRow)
      .filter((c) => c.firma !== "Bez nazwy");

    // Deduplikacja: ten sam klucz firma+kontakt → zostaje karta z wyższym statusem. Realny
    // rekord Supabase raczej nie ma duplikatów (jeden wiersz per klient), ale zachowane 1:1
    // z dawną logiką Notion na wypadek ręcznie założonych duplikatów.
    const STATUS_ORDER = [
      "Nowy lead",
      "Kwalifikacja",
      "Nieaktywny (follow up)",
      "Discovery umówione",
      "Finalizacja",
      "Kickoff",
      "Wdrożenie",
      "Retainer",
      "Upsell",
      "Niekwalifikowany",
      "Zakończona współpraca",
    ];
    const deduped = new Map<string, PipelineClientDetailed>();
    for (const c of clients) {
      const key = `${c.firma.toLowerCase().trim()}|${c.kontakt.toLowerCase().trim()}`;
      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, c);
      } else {
        const existingRank = STATUS_ORDER.indexOf(existing.status);
        const currentRank = STATUS_ORDER.indexOf(c.status);
        if (currentRank > existingRank) deduped.set(key, c);
      }
    }
    const dedupedClients = Array.from(deduped.values());

    // Druga deduplikacja: ten sam telefon (ostatnie 9 cyfr) → zostaje karta z wyższym statusem.
    const phoneDeduped = new Map<string, PipelineClientDetailed>();
    for (const c of dedupedClients) {
      const raw = c.telefon.replace(/\D/g, "");
      const phoneKey = raw.length >= 9 ? raw.slice(-9) : raw;
      if (!phoneKey) {
        phoneDeduped.set(c.id, c);
        continue;
      }
      const existing = phoneDeduped.get(phoneKey);
      if (!existing) {
        phoneDeduped.set(phoneKey, c);
      } else {
        const existingRank = STATUS_ORDER.indexOf(existing.status);
        const currentRank = STATUS_ORDER.indexOf(c.status);
        if (currentRank > existingRank) phoneDeduped.set(phoneKey, c);
      }
    }
    const finalClients = Array.from(phoneDeduped.values());

    return NextResponse.json({ success: true, clients: finalClients });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Supabase";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
