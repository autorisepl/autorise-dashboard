-- RLS dla public.pipeline. Uruchom PO 0001_pipeline_schema.sql.
-- Odczyt (SELECT) dozwolony dla każdego zalogowanego (authenticated) użytkownika Supabase Auth.
-- Zero polityk INSERT/UPDATE/DELETE dla ról klienckich (anon/authenticated) — każdy zapis
-- wyłącznie przez API routes dashboardu, które używają SUPABASE_SERVICE_ROLE_KEY po stronie
-- serwera i z definicji omijają RLS. Domyślne zachowanie Postgresa przy włączonym RLS bez
-- pasującej polityki to odmowa, więc anon nie ma dostępu do niczego w tej tabeli.

alter table public.pipeline enable row level security;

create policy "pipeline_select_authenticated"
  on public.pipeline
  for select
  to authenticated
  using (auth.role() = 'authenticated');
