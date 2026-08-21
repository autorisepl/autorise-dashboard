-- Fundament pod migrację Pipeline z Notion do Supabase.
-- Jedna płaska tabela, bez relacji, dokładnie jak w Notion (jedna baza Pipeline).
-- Wklej ten plik w Supabase Dashboard > SQL Editor i uruchom PRZED 0002_pipeline_rls.sql.

create table public.pipeline (
  id uuid primary key default gen_random_uuid(),
  notion_page_id text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  firma text not null,
  telefon text,
  utracony boolean not null default false,
  data_oferty timestamptz,
  srednia_wartosc_faktury_pln numeric,
  historia_zgloszen_retainer text,
  decydent boolean not null default false,
  uwagi_agenta_1 text,
  nastepny_krok text,
  spedytorzy numeric,
  re_engagement timestamptz,
  roi_dopowiedzenie text,
  cel_efektywnosci_procent numeric,
  dostepy_zebrane text,
  wynik_discovery text,
  retainer_pln_mc numeric,
  podejscie_tms text,
  przewidywane_obiekcje text,
  faktury_po_terminie_mc numeric,
  personalizacja_prezentacji text,
  ryzyka_rozmowy text,
  konkurencja_wspomniana text,
  data_discovery timestamptz,
  warunki_umowy_dni_dostepow numeric,
  warunki_umowy_uwagi text,
  hipoteza_bol_glowny text,
  powod_utraty text,
  koszt_problemu_pln_mc numeric,
  obiekcje text,
  cytaty_klienta text,
  email text,
  czas_bazowy_potwierdzony_h_mc numeric,
  tms text,
  protokol_odbioru_podpisany boolean not null default false,
  typ_follow_up text,
  kickoff_odbyty boolean not null default false,
  liczba_prob_kontaktu numeric,
  kontakt text,
  nip text,
  pilnosc text,
  maile_ze_zleceniami_dzien numeric,
  uwagi_agenta_2 text,
  ostatni_kontakt_retainer timestamptz,
  kalkulator_dane text,
  uwagi_agenta_4 text,
  data_kickoff timestamptz,
  godziny_wpisywania_spedytor numeric,
  data_nastepnego_kroku timestamptz,
  status text,
  pomysl_na_funkcje text,
  flota numeric,
  data_zamkniecia timestamptz,
  ocena_icp text,
  koszt_roczny_pln_rok numeric,
  zrodlo text,
  tabela_modulow_kickoff text,
  system_transformacji_3_kroki text,
  tabela_modulow_weryfikacja text,
  wszystkie_transkrypty text,
  cena_wdrozenia numeric,
  zdanie_roznicujace text,
  poprzednie_proby text,
  data_protokolu_odbioru timestamptz,
  bol_glowny text,
  powod_rezygnacji text,
  notatki text,
  data_pierwszego_kontaktu timestamptz,
  gotowosc_zakupowa text,
  poza_zakresem_ustalenia text,
  moduly_wdrazane text[],
  data_potwierdzenia_dostepow timestamptz,
  pitch_recipe text,

  constraint pipeline_status_check check (
    status is null or status in (
      'Nowy lead',
      'Kwalifikacja',
      'Discovery umówione',
      'Niekwalifikowany',
      'Nieaktywny (follow up)',
      'Finalizacja',
      'Kickoff',
      'Wdrożenie',
      'Retainer',
      'Upsell',
      'Zakończona współpraca'
    )
  )
);

comment on column public.pipeline.notion_page_id is 'ID strony źródłowej w Notion (klucz idempotencji migracji)';
comment on column public.pipeline.firma is 'Firma (title, główny identyfikator) — Notion property "Firma"';
comment on column public.pipeline.telefon is 'Notion property "Telefon"';
comment on column public.pipeline.utracony is 'Notion property "Utracony"';
comment on column public.pipeline.data_oferty is 'Notion property "Data oferty"';
comment on column public.pipeline.srednia_wartosc_faktury_pln is 'Notion property "Średnia wartość faktury PLN"';
comment on column public.pipeline.historia_zgloszen_retainer is 'Notion property "Historia zgłoszeń (retainer)"';
comment on column public.pipeline.decydent is 'Notion property "Decydent"';
comment on column public.pipeline.uwagi_agenta_1 is 'Notion property "Uwagi Agenta 1"';
comment on column public.pipeline.nastepny_krok is 'Notion property "Następny krok"';
comment on column public.pipeline.spedytorzy is 'Notion property "Spedytorzy"';
comment on column public.pipeline.re_engagement is 'Notion property "Re-engagement"';
comment on column public.pipeline.roi_dopowiedzenie is 'Notion property "ROI dopowiedzenie"';
comment on column public.pipeline.cel_efektywnosci_procent is 'Notion property "Cel efektywności (%)"';
comment on column public.pipeline.dostepy_zebrane is 'Notion property "Dostępy zebrane"';
comment on column public.pipeline.wynik_discovery is 'Notion property "Wynik Discovery" (TAK/NIE/W TRAKCIE/NO-SHOW)';
comment on column public.pipeline.retainer_pln_mc is 'Notion property "Retainer PLN/mc"';
comment on column public.pipeline.podejscie_tms is 'Notion property "Podejście TMS"';
comment on column public.pipeline.przewidywane_obiekcje is 'Notion property "Przewidywane obiekcje"';
comment on column public.pipeline.faktury_po_terminie_mc is 'Notion property "Faktury po terminie / mc"';
comment on column public.pipeline.personalizacja_prezentacji is 'Notion property "Personalizacja prezentacji"';
comment on column public.pipeline.ryzyka_rozmowy is 'Notion property "Ryzyka rozmowy"';
comment on column public.pipeline.konkurencja_wspomniana is 'Notion property "Konkurencja wspomniana"';
comment on column public.pipeline.data_discovery is 'Notion property "Data discovery"';
comment on column public.pipeline.warunki_umowy_dni_dostepow is 'Notion property "Warunki umowy — dni dostępów"';
comment on column public.pipeline.warunki_umowy_uwagi is 'Notion property "Warunki umowy — uwagi"';
comment on column public.pipeline.hipoteza_bol_glowny is 'Notion property "Hipoteza ból główny"';
comment on column public.pipeline.powod_utraty is 'Notion property "Powód utraty"';
comment on column public.pipeline.koszt_problemu_pln_mc is 'Notion property "Koszt problemu PLN/mc"';
comment on column public.pipeline.obiekcje is 'Notion property "Obiekcje"';
comment on column public.pipeline.cytaty_klienta is 'Notion property "Cytaty klienta"';
comment on column public.pipeline.email is 'Notion property "Email"';
comment on column public.pipeline.czas_bazowy_potwierdzony_h_mc is 'Notion property "Czas bazowy potwierdzony h/mc"';
comment on column public.pipeline.tms is 'Notion property "TMS"';
comment on column public.pipeline.protokol_odbioru_podpisany is 'Notion property "Protokół odbioru podpisany"';
comment on column public.pipeline.typ_follow_up is 'Notion property "Typ follow-up"';
comment on column public.pipeline.kickoff_odbyty is 'Notion property "Kickoff odbyty"';
comment on column public.pipeline.liczba_prob_kontaktu is 'Notion property "Liczba prób kontaktu"';
comment on column public.pipeline.kontakt is 'Notion property "Kontakt"';
comment on column public.pipeline.nip is 'Notion property "NIP"';
comment on column public.pipeline.pilnosc is 'Notion property "Pilność"';
comment on column public.pipeline.maile_ze_zleceniami_dzien is 'Notion property "Maile ze zleceniami / dzień"';
comment on column public.pipeline.uwagi_agenta_2 is 'Notion property "Uwagi Agenta 2"';
comment on column public.pipeline.ostatni_kontakt_retainer is 'Notion property "Ostatni kontakt (retainer)"';
comment on column public.pipeline.kalkulator_dane is 'Notion property "Kalkulator dane"';
comment on column public.pipeline.uwagi_agenta_4 is 'Notion property "Uwagi Agenta 4"';
comment on column public.pipeline.data_kickoff is 'Notion property "Data Kickoff"';
comment on column public.pipeline.godziny_wpisywania_spedytor is 'Notion property "Godziny wpisywania / spedytor"';
comment on column public.pipeline.data_nastepnego_kroku is 'Notion property "Data następnego kroku"';
comment on column public.pipeline.status is 'Notion property "Status" (11 wartości, patrz constraint pipeline_status_check)';
comment on column public.pipeline.pomysl_na_funkcje is 'Notion property "Pomysł na funkcję"';
comment on column public.pipeline.flota is 'Notion property "Flota"';
comment on column public.pipeline.data_zamkniecia is 'Notion property "Data zamknięcia"';
comment on column public.pipeline.ocena_icp is 'Notion property "Ocena ICP"';
comment on column public.pipeline.koszt_roczny_pln_rok is 'Notion property "Koszt roczny PLN/rok"';
comment on column public.pipeline.zrodlo is 'Notion property "Źródło"';
comment on column public.pipeline.tabela_modulow_kickoff is 'Notion property "Tabela modułów Kickoff"';
comment on column public.pipeline.system_transformacji_3_kroki is 'Notion property "System transformacji (3 kroki)"';
comment on column public.pipeline.tabela_modulow_weryfikacja is 'Notion property "Tabela modułów Weryfikacja"';
comment on column public.pipeline.wszystkie_transkrypty is 'Notion property "Wszystkie transkrypty"';
comment on column public.pipeline.cena_wdrozenia is 'Notion property "Cena wdrożenia"';
comment on column public.pipeline.zdanie_roznicujace is 'Notion property "Zdanie różnicujące"';
comment on column public.pipeline.poprzednie_proby is 'Notion property "Poprzednie próby"';
comment on column public.pipeline.data_protokolu_odbioru is 'Notion property "Data protokołu odbioru"';
comment on column public.pipeline.bol_glowny is 'Notion property "Ból główny"';
comment on column public.pipeline.powod_rezygnacji is 'Notion property "Powód rezygnacji"';
comment on column public.pipeline.notatki is 'Notion property "Notatki"';
comment on column public.pipeline.data_pierwszego_kontaktu is 'Notion property "Data pierwszego kontaktu"';
comment on column public.pipeline.gotowosc_zakupowa is 'Notion property "Gotowość zakupowa"';
comment on column public.pipeline.poza_zakresem_ustalenia is 'Notion property "Poza zakresem — ustalenia"';
comment on column public.pipeline.moduly_wdrazane is 'Notion property "Moduły wdrażane" (multi-select)';
comment on column public.pipeline.data_potwierdzenia_dostepow is 'Notion property "Data potwierdzenia dostępów"';
comment on column public.pipeline.pitch_recipe is 'Notion property "Pitch Recipe"';

create index pipeline_status_idx on public.pipeline (status);
create index pipeline_data_nastepnego_kroku_idx on public.pipeline (data_nastepnego_kroku);
create index pipeline_firma_idx on public.pipeline (firma);

create function public.pipeline_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pipeline_set_updated_at
  before update on public.pipeline
  for each row
  execute function public.pipeline_set_updated_at();
