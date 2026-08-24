-- Dokłada kolumnę dla "Tabela modułów Analiza przedkontraktowa" — jedyne pole Notion Pipeline
-- pominięte w 0001_pipeline_schema.sql (używane przez AnalizaPrzedkontraktowaPanel.tsx,
-- zapisywane jako JSON.stringify(rows) w rich_text w Notion). Uruchom w Supabase SQL Editor
-- PRZED przepięciem app/api/notion/pipeline-update na Supabase (patrz CLAUDE.md).

alter table public.pipeline
  add column tabela_modulow_przedkontraktowa text;

comment on column public.pipeline.tabela_modulow_przedkontraktowa is 'Notion property "Tabela modułów Analiza przedkontraktowa" (JSON.stringify KickoffModuleRow[])';
