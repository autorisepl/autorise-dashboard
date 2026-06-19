# Autorise Dashboard

Command Center dla Autorise — sprzedaż i automatyzacja TSL.

## Uruchomienie lokalne

```bash
pnpm install
cp .env.example .env.local
# Wypełnij .env.local wartościami
pnpm dev
```

Otwórz [http://localhost:3000](http://localhost:3000).

## Zmienne środowiskowe

| Zmienna | Opis |
|---------|------|
| `ANTHROPIC_API_KEY` | Klucz API Anthropic (agenci AI) |
| `NOTION_TOKEN` | Integration token Notion |
| `NOTION_DATABASE_ID` | ID bazy Pipeline (`75ac8bc6...`) |
| `DASHBOARD_PASSWORD` | Hasło dostępu do dashboardu |
| `DASHBOARD_SESSION_SECRET` | Secret do JWT sesji (min. 64 znaki) |
| `WORKSPACE_ROOT` | Ścieżka do workspace (`D:\autorise\workspace`) |
| `GROQ_API_KEY` | Klucz Groq API (transkrypcja Whisper) |

## Deploy — Cloudflare Pages

Repo podpięte do Cloudflare Pages via GitHub. Każdy push do `main` triggeruje auto-deploy.

**Wymagane ustawienia w Cloudflare Pages:**
- Build command: `pnpm build`
- Build output: `.next`
- Compatibility flags: `nodejs_compat` (Settings → Functions)

**UWAGA timeout**: Free plan = 30s limit per request. Agent2 (claude-opus-4-8 z extended thinking) może trwać 60–180s → może wymagać upgrade do paid planu.

## Stack

- Next.js 14 App Router + TypeScript strict
- Tailwind CSS + Geist + Sora fonts
- Anthropic API (claude-sonnet-4-6, claude-opus-4-8)
- Notion API (`@notionhq/client`)
- Zod validation na wszystkich API routes

## Repozytorium

`https://github.com/autorisepl/autorise-dashboard` (prywatne)
