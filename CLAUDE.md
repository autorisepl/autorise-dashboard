# CLAUDE.md — Autorise Dashboard

## Stack

- **Next.js 16.2.7** App Router, TypeScript strict mode, React 19
- **Cloudflare Pages** (GitHub integration) — free tier: **30s** wall-clock timeout per request
  - Agent2/5 (claude-opus-4-8 + extended thinking) mogą trwać 60–180s → ryzyko timeout na free tier
  - `maxDuration` z Vercela nie działa na CF Pages — timeout kontrolowany przez plan CF
- **UI**: var(--font-sans) WSZĘDZIE. ZERO var(--font-mono) w UI labels/number/time
- **Design tokens**: CSS custom properties w `app/globals.css`
- **Animation**: framer-motion, lucide-react icons
- **Validation**: Zod on all API routes

## Design System

- macOS Glassmorphism light theme — single theme, no dark mode toggle
- CSS custom properties in `app/globals.css`: `var(--bg)`, `var(--glass)`, `var(--accent)`, `var(--border)`, `var(--text-primary)`, etc.
- Accent: `#0a84ff`; SUCCESS `var(--success)` `#30d158`, ERROR `var(--error)` `#ff453a`, WARNING `var(--warning)` `#ff9f0a`
- Text: `--text-secondary: #3a3a3c`, `--text-tertiary: #6e6e73`
- Sidebar: 260px, 5 stref (WDROŻENIA AI / OBSZAR ROBOCZY / KALENDARZ I ZADANIA / WSPÓŁPRACA / NARZĘDZIA)
- UI components: `Panel`, `Button`, `StatusDiode`, `SectionLabel` in `components/ui/`
- Model names: "Claude Sonnet 4.6", "Claude Opus 4.8" — nigdy z myślnikami, nigdy lowercase
- Buttons sync/odśwież: transparent bg, var(--border), var(--text-secondary)
- Timestamps: ZAWSZE HH:MM:SS z sekundami

## Nawigacja (sidebar)

```
WDROŻENIA AI
  /agenci          → "Agenci wspomagania sprzedaży"
  /sesje           → "Sesje szkoleniowe"
  /analiza-narzedzi → "Analiza nowych narzędzi"

OBSZAR ROBOCZY
  /pliki           → "Najważniejsze pliki"
  /pipeline        → "Pipeline" (Kanban Notion, 2×4)
  /kontrola        → "Kontrola obszaru roboczego"

KALENDARZ I ZADANIA
  /harmonogram     → "Harmonogram" (Google Calendar + Tasks)
  /zadania         → "Zadania" (Google Tasks, 4 listy)

WSPÓŁPRACA Z AGENCY LEADERS
  /agencja         → "Nasza karta"

NARZĘDZIA
  /narzedzia       → "Transkrypcja"
```

## Agents

| ID | Model | Thinking | Notes |
|---|---|---|---|
| agent0 | claude-sonnet-4-6 | no | KRS + MF API enrichment (hidden in UI) |
| agent1 | claude-sonnet-4-6 | no | ICP qualification → Notion Pipeline |
| agent2 | claude-opus-4-8 | **adaptive** | Pre-discovery brief |
| agent3 | claude-opus-4-8 | no | Presentation personalization |
| agent4 | claude-sonnet-4-6 | no | Discovery call analysis |
| agent5 | claude-opus-4-8 | **adaptive** | Agency Leaders training |
| agent6 | claude-opus-4-8 | no | Tool/library evaluation |

**Extended thinking**: always `{ type: 'adaptive' }` for claude-opus-4-8. Never `{ type: 'enabled', budget_tokens: N }`.
**Metadata**: every `messages.create()` must have `metadata: { user_id: "autorise-agentN" }`.
**stop_reason**: check `message.stop_reason === "max_tokens"` and warn before parsing content.

## Security rules (ENFORCE)

- Każde `messages.create()` → `metadata: { user_id: "autorise-agentN" }`
- Sprawdź `stop_reason` przed dostępem do `message.content`
- Securecoder skanuje `.next/server/chunks/` — to false positives w minified code
- `.vscode/settings.json` ma exclusions dla `.next/` i `node_modules/`

## Notion

- `PIPELINE_DB_ID = "75ac8bc6fd6d4c36934bedc1270217eb"` w `lib/notion/client.ts` — **never change**
- `PIPELINE_DATA_SOURCE_ID = "2ea38355-7529-48f9-8d7f-1c62f5570df3"`
- `upsertClientInPipeline` ma graceful fallback na unknown property errors

## Google Integration

- `lib/google/auth.ts` — OAuth2 client, scopes: tasks, spreadsheets, drive, calendar, userinfo
- `app/api/auth/google/` — start OAuth / callback / status / disconnect
- `app/api/google/tasks/route.ts` — GET wszystkie listy + tasks; PATCH toggle status
- `app/api/google/calendar/events/route.ts` — GET events
- Token priority: `GOOGLE_REFRESH_TOKEN` env var > `google_refresh_token` cookie
- Required: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

## Sheets Sync (Agencja)

- `app/api/notion/sheets-sync/route.ts`
- `GOOGLE_SHEETS_ID = "18BjXDFAWDVQnQkrE_1Kmvj0-ZJIGXQejLY6IJOOXnH0"`
- Elastyczne dopasowanie kolumn przez `findCol(headers, ...patterns: RegExp[])`
- Obsługuje: "Imię i Nazwisko", "Numer", "Email" i każdą inną konwencję nazewnictwa

## Workspace & MCP

- `WORKSPACE_ROOT=D:\autorise\workspace` w `.env.local`
- MCP Server: `D:\autorise\workspace\autorise-mcp-server\`, port **3010**
- Build: `npm run build` w `autorise-mcp-server/`
- Cloudflare Tunnel: `mcp.autorise.pl` → `localhost:3010`
- Status sprawdzany live przez `/api/health` endpoint

## Kontrola page (v6 — redesign)

**Layout:**
- Wiersz 1 (3 kolumny): autorise-mcp | autorise-dashboard | Integracje (5 API statusów)
- Wiersz 2 (40/60): Zmienne środowiskowe (grid badge'ów) | Claude Code (agenci/skills/modele)
- Polling: 20s + focus listener
- Claude-config: max 20 agentów i 20 skills, filtr RELEVANT_KEYWORDS

## Harmonogram (v5 — layout fix)

- Sticky headers w jednym scrollable container (eliminuje misalignment kolumn)
- All-day section: NA GÓRZE (przed siatką godzinową)
- Google Tasks zintegrowane: zadania z terminem w all-day, bez terminu w pomarańczowym pasku
- TaskChip: amber border-left, circle dot (odróżnia od EventChip)
- Polling: 30s + focus listener

## Zadania (v5)

- Pełne nazwy dni: "Poniedziałek 22.06.2026"
- Badge'y terminów: fontSize 11, fontWeight 700, padding 3×10px
- 4-tier: overdue(red), today(orange), week(green), future(gray)
- Filtr: wszystkie listy poza "Pomysły i inspiracje"

## Dev Tools

- **knip** — dead code: `pnpm lint:dead`
- **Biome** — lint + format: `pnpm lint:fix`
- **TypeScript**: `npx tsc --noEmit` (must be zero errors)

## Key Rules

- `maxDuration = 300` max on Vercel Hobby
- `hasThinking` badge: tylko agent2, agent5
- `useSearchParams()` wymaga `<Suspense>` wrapper w Next.js App Router
- ZERO hardcode secrets — zawsze `process.env.XXX`
- ZERO `console.log` w production

## File Locations

```
app/(dashboard)/agenci/page.tsx       — agents page (6 agents, agent0 ukryty)
app/(dashboard)/pipeline/page.tsx     — Pipeline Kanban (2×4)
app/(dashboard)/kontrola/page.tsx     — Kontrola (v6 redesign)
app/(dashboard)/harmonogram/page.tsx  — Calendar + Google Tasks
app/(dashboard)/zadania/page.tsx      — Google Tasks (4 listy)
app/(dashboard)/agencja/page.tsx      — Nasza karta + Sheets sync
app/api/agents/agent[0-6]/route.ts    — agent API routes
app/api/health/route.ts               — health check (Anthropic/Notion/Google/Groq/MCP)
app/api/env-check/route.ts            — env vars check
app/api/claude-config/route.ts        — Claude Code agents/skills (filtered)
app/api/notion/pipeline/route.ts      — Pipeline clients
app/api/notion/sheets-sync/route.ts   — Sheets → Notion sync
components/layout/sidebar.tsx         — navigation sidebar (260px)
lib/agents/prompts.ts                 — all system prompts
lib/notion/client.ts                  — Notion API client
context/AUTORISE_DASHBOARD_STATE_v6.md — stan systemu dla Claude AI
```
