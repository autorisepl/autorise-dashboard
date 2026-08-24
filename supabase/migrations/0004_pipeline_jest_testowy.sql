-- Flaguje rekordy testowe/demo w public.pipeline (jeden przykładowy klient pinowany jako
-- pierwsza karta w każdym statusie Kanbanu /pipeline — patrz scripts/seed-test-pipeline-clients.mjs).
-- Wykluczane z liczników biznesowych (Aktywnych klientów, sumy PLN w nagłówkach grup,
-- /statystyki) — to dane demonstracyjne dla zespołu/agentów, nie realny lead.
-- Uruchom w Supabase SQL Editor PRZED skryptem scripts/seed-test-pipeline-clients.mjs.

alter table public.pipeline
  add column jest_testowy boolean not null default false;

comment on column public.pipeline.jest_testowy is 'Rekord demonstracyjny (pinowany jako pierwsza karta w kolumnie /pipeline) — wykluczony z liczników biznesowych, nie realny lead';

create index pipeline_jest_testowy_idx on public.pipeline (jest_testowy);
