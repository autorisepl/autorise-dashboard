# STACK.md — Autorise Dashboard

Prowadzona lista wyborów technologicznych. Cel: dało się świadomie ocenić, czy każdy wybór jest nadal najlepszy, nie tylko wygodny. Aktualizuj przy każdej zmianie stacku, nie tylko przy dodaniu nowej zależności.

## Framework

**Next.js 16.2.7** (App Router, TypeScript strict, React 19.2.4) — główny framework aplikacji. Wybrane bo: powód historyczny nieznany (projekt zastany na tej wersji), ale App Router + strict TS są aktywnie utrzymywane (patrz reguły `useSearchParams()` + `<Suspense>` w CLAUDE.md, `Rules of Hooks` egzekwowane ręcznie).

**React 19.2.4 / react-dom 19.2.4** — zsynchronizowane z wymaganiami Next.js 16.

## Hosting / Deploy

**Vercel** (GitHub integration) — hosting produkcyjny, auto-deploy przy push do `main`. Wybrane bo: `maxDuration` do 300s na Hobby wystarcza dla agentów z extended thinking (Opus 4.8, 60-180s). Produkcyjna gałąź na Vercel to `main`, lokalnie praca na `master` → deploy przez `git push origin master:main`. URL: **app.autorise.pl**, DNS przez Cloudflare (CNAME do `cname.vercel-dns.com`, DNS only, bez proxy Cloudflare).

**UWAGA — niespójność do wyjaśnienia z Michałem**: w repo istnieje `wrangler.toml` skonfigurowany pod **Cloudflare Pages** (z komentarzem o 30s wall-clock timeout na free planie, dokładnie problem który Vercel Hobby 300s rozwiązuje). To wygląda na porzucony wcześniejszy kierunek deploymentu, sprzeczny z aktualnym stanem w CLAUDE.md (Vercel jest jedynym opisanym mechanizmem produkcyjnym). Do potwierdzenia: czy `wrangler.toml` można usunąć, czy jest z niego jeszcze jakiś powód korzystać.

## Baza danych / źródło danych biznesowych

**Notion API** (`@notionhq/client` ^5.22.0) — jedyne źródło prawdy dla danych klientów (baza Pipeline, `PIPELINE_DB_ID` w `lib/notion/client.ts`, "never change"). Wybrane bo: powód historyczny nieznany, do potwierdzenia z Michałem — ale świadoma decyzja architektoniczna jest udokumentowana: Claude Code NIE ma bezpośredniego zapisu do Notion, zapis idzie wyłącznie przez API routes agentów. Rozdzielenie: kod przez git, dane biznesowe przez dashboard + agentów. Brak klasycznej relacyjnej bazy danych (Postgres/Supabase) w projekcie — Notion pełni tę rolę.

## AI / LLM

**@anthropic-ai/sdk ^0.102.0** (Claude Sonnet 4.6 / Opus 4.8) — silnik wszystkich agentów (kwalifikacja, discovery, knowledge report, wywiad rynkowy). Wybrane bo: powód historyczny nieznany, do potwierdzenia z Michałem. Reguły twarde: `extended thinking` zawsze `{ type: 'adaptive' }` dla Opus 4.8 (nigdy `enabled` z jawnym `budget_tokens`), każdy `messages.create()` musi mieć `metadata: { user_id: "autorise-agentN" }`, sprawdzenie `stop_reason === "max_tokens"` przed parsowaniem.

**Groq Whisper large-v3** — transkrypcja audio (nagrywarka w `/narzedzia`). Wybrane bo: powód historyczny nieznany, do potwierdzenia z Michałem (prawdopodobnie koszt/szybkość względem alternatyw typu OpenAI Whisper API).

## Integracje zewnętrzne

**Google APIs** (`googleapis` ^173.0.0) — OAuth2, Calendar, Tasks, Drive, Sheets. Wybrane bo: klient korzysta z Google Workspace, integracja bezpośrednia zamiast pośrednika (np. Zapier/Make) — brak potwierdzonego uzasadnienia w historii, ale spójne z resztą stacku (bezpośrednie SDK, nie warstwy pośrednie).

**Calendly** — zapisy na Discovery Call, celowo NIE ręcznie tworzone wydarzenia Google Meet. Wybrane bo: automatyzacja zapisu bez ręcznej pracy sprzedawcy (wniosek z CLAUDE.md, sekcja Calendly).

## Monitoring

**@sentry/nextjs ^10** — error tracking, skonfigurowany z `tracesSampleRate: 0` (bez performance tracing, tylko błędy). Wybrane bo: zadanie z dziennika decyzji (2026-07-30: "Sentry dla klientów" w ramach sesji "środowisko na maksa") — świadomy priorytet obserwowalności przed skalowaniem liczby klientów, ale sampling wyłączony (koszt/limit planu, do potwierdzenia).

## Styling / UI

**Tailwind CSS ^4** (`@tailwindcss/postcss`) — silnik CSS. Współistnieje z ręcznymi CSS custom properties w `app/globals.css` (design tokens: `--bg`, `--accent`, `--border`, `--text-primary` itd.) — Tailwind nie jest jedynym źródłem stylu, tokens design systemu są warstwą nadrzędną. Powód wyboru Tailwind v4 konkretnie: nieznany, do potwierdzenia.

**framer-motion ^12.40.0** — animacje. Wybrane bo: potrzeba subtelnych, kontrolowanych animacji w duchu macOS/Apple light theme (jedyny theme, bez dark mode) — brak jawnego uzasadnienia w historii poza tym, że jest jedyną biblioteką animacji w projekcie (brak GSAP, brak CSS-only rozwiązania).

**lucide-react ^1.17.0** — ikony. Wybrane bo: zasada bezwzględna "ZERO emojis w UI" wymaga spójnego zestawu ikon SVG — Lucide jest jedynym dozwolonym źródłem (reguła wpisana wprost w CLAUDE.md, nie do naruszenia).

**geist ^1.7.2** — pakiet fontów Vercel, obecny w zależnościach mimo że font UI to Roboto (`next/font/google`) na całej aplikacji. Do potwierdzenia: czy `geist` jest faktycznie używany gdziekolwiek, czy to martwa zależność (kandydat do `knip`).

## Walidacja

**Zod ^4.4.3** — walidacja wszystkich API routes (reguła "Validation: Zod on all API routes" w CLAUDE.md). Wybrane bo: standard branżowy dla TypeScript, brak alternatyw rozważanych w historii.

## Narzędzia deweloperskie

**Biome ^2.5.0** — lint + format (`pnpm lint:fix`), zastępuje ESLint + Prettier jednym narzędziem. Wybrane bo: szybkość (Rust-based), jeden config zamiast dwóch narzędzi — brak jawnego uzasadnienia w historii, ale spójne z resztą stacku (preferencja dla mniejszej liczby zależności).

**knip ^6.17.1** — wykrywanie martwego kodu (`pnpm lint:dead`), uruchamiany też jako pre-commit hook (`npx knip --no-exit-code`, nie blokuje commitu, tylko raportuje).

**husky ^9.1.7** — git hooks. Pre-commit: `knip` (raport, non-blocking) + `biome check --write .` (auto-fix, blocking).

**TypeScript ^5** — `npx tsc --noEmit` jako lekka lokalna bramka jakości. Reguła projektowa: NIE uruchamiać `npm run build` lokalnie równolegle z `git commit` (pre-commit hook + build razem zawieszały maszynę Michała, zdarzyło się dwukrotnie) — pełny build wykonuje zdalnie Vercel po pushu.

## MCP Server (`autorise-mcp-server/`, osobny pakiet)

**@modelcontextprotocol/sdk ^1.29.0** — bezpieczny dostęp do workspace dla Claude.ai i Claude Code (append do dziennika decyzji, narzędzia read/write/notion skatalogowane w `src/tools/catalog.ts`). Wybrane bo: potrzeba mostu między sesjami Claude.ai (bez dostępu do dysku) a plikami projektu, przez tunel Cloudflare (`mcp.autorise.pl` → `localhost:3010`).

**express ^4.18.0 + cors + morgan** — serwer HTTP pod MCP, standardowy wybór Node.js, brak alternatyw rozważanych.

**pm2 ^5.3.0** — process manager dla MCP servera (restart wymagany po każdej zmianie `TOOL_CATALOG`/nowego narzędzia — sama zmiana na dysku nie wystarcza, to udokumentowana pułapka).

**Zod ^3.22.0** (osobna, starsza wersja niż w dashboardzie ^4.4.3) — walidacja narzędzi MCP. Do potwierdzenia: czy rozjazd wersji Zod między dashboardem a MCP serverem jest celowy, czy przypadkowy dryf (dwa osobne `package.json`, brak monorepo/workspace).

═══════════════════════════════════════

## Otwarte pytania do Michała

1. `wrangler.toml` (Cloudflare Pages) w `autorise-dashboard` — usunąć jako martwy config, czy jest jeszcze z niego powód korzystać skoro produkcja jedzie na Vercel?
2. `geist` w zależnościach dashboardu — używany gdziekolwiek, czy martwa zależność (font UI to Roboto)?
3. Rozjazd wersji Zod (^4 w dashboardzie, ^3 w MCP server) — celowy, czy do wyrównania?
4. Powód wyboru Notion jako jedynej bazy danych zamiast Postgres/Supabase — nieznany, warto spisać zanim zniknie z pamięci zespołu.
5. Powód wyboru Groq Whisper large-v3 (koszt? szybkość? jakość transkrypcji PL?) — nieznany.
