-- Firma NOT NULL blokowało czyszczenie błędnie wpisanej nazwy firmy (imię i nazwisko zamiast
-- realnej nazwy) — jednorazowy backfill 2026-08-24 przenosił te wartości do "kontakt" i czyścił
-- "firma", GET /api/notion/pipeline i tak ma fallback firma: row.firma || row.kontakt || "Bez
-- nazwy", więc puste pole nigdy nie trafia do UI jako brak danych.
alter table public.pipeline alter column firma drop not null;
