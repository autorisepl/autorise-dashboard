# CLAUDE.md — Autorise Dashboard

## Stack

- **Next.js 14** App Router, TypeScript strict mode
- **Cloudflare Pages** (GitHub integration) — free tier: **30s** wall-clock timeout per request
  - Agent2/5 (claude-opus-4-8 + extended thinking) mogą trwać 60–180s → ryzyko timeout na free tier
  - `maxDuration` z Vercela nie działa na CF Pages — timeout kontrolowany przez plan CF
- **UI**: Geist Sans + Geist Mono (via `var(--font-system)` / `var(--font-mono)`)
- **Design tokens**: `lib/tokens.ts` — `tokens` (light), `agentTokens` (dark terminal, legacy)
- **Animation**: framer-motion, lucide-react icons
- **Validation**: Zod on all API routes

## Design System

- Light theme uses `tokens` from `lib/tokens.ts`
- Dark terminal theme uses `agentTokens` (agents 0–4 output cards, sidebar)
- All pages use CSS custom properties: `var(--bg)`, `var(--text-primary)`, `var(--border)`, etc.
- Accent: `#1a56ff` everywhere; system colors: SUCCESS `#34c759`, ERROR `#ff3b30`, WARNING `#ff9500`

## Agents

| ID | Model | Thinking | Notes |
|---|---|---|---|
| agent0 | claude-sonnet-4-6 | no | KRS + MF API enrichment |
| agent1 | claude-sonnet-4-6 | no | ICP qualification |
| agent2 | claude-opus-4-8 | **adaptive** | Pre-discovery brief |
| agent3 | claude-opus-4-8 | no | Presentation personalization |
| agent4 | claude-sonnet-4-6 | no | Discovery call analysis |
| agent5 | claude-opus-4-8 | **adaptive** | Agency Leaders training |
| agent6 | claude-opus-4-8 | no | Tool/library evaluation |

**Extended thinking**: always `{ type: 'adaptive' }` for claude-opus-4-8. Never `{ type: 'enabled', budget_tokens: N }`.

## Notion

- `PIPELINE_DB_ID` in `lib/notion/client.ts` — **never change this constant**
- Run `/api/tools/migrate-schema` once to add new Notion properties
- `upsertClientInPipeline` has graceful auto-migration fallback on unknown property errors

## Google Integration

- `lib/google/auth.ts` — OAuth2 client (googleapis), helper functions
- `app/api/auth/google/route.ts` — start OAuth flow (redirect to Google)
- `app/api/auth/google/callback/route.ts` — exchange code → store `google_refresh_token` cookie (90d)
- `app/api/auth/google/status/route.ts` — GET: check connection + userinfo; DELETE: disconnect
- `app/api/google/tasks/route.ts` — GET: all task lists + tasks; PATCH: toggle task status
- `app/(dashboard)/profil/page.tsx` — profil page with Google connect card
- Sidebar MR avatar links to `/profil`
- Zadania page: shows Google Tasks section below local tasks (auto-loads if connected)
- Token priority: `GOOGLE_REFRESH_TOKEN` env var > `google_refresh_token` cookie
- Required env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

## Workspace & MCP

- `WORKSPACE_ROOT=D:\autorise\workspace` in `.env.local`
- MCP Server at `D:\autorise\workspace\autorise-mcp-server\`, port **3010**
- Build: `npm run build` in `autorise-mcp-server/`
- Cloudflare Tunnel: `mcp.autorise.pl` → `localhost:3010`
  - Setup: `cloudflared tunnel login` → `.\scripts\setup-tunnel.ps1`
  - Permanent: `cloudflared service install` (Windows Service)

## Key Rules

- `maxDuration = 300` max on Vercel Hobby (agent2 uses this)
- `hasThinking` badge: only agent2, agent5 (not agent6)
- Agent2 takes `{ transcript, agent1_json? }` — two separate inputs in UI
- Agent3 takes `{ agent1_json, agent2_json? }` — two separate inputs in UI
- Sidebar stage links: `href="/agenci?tab=agent${N}"` (not hash anchors)
- `useSearchParams()` requires `<Suspense>` wrapper in Next.js 14 App Router

## Live Script

- `components/LiveScript.tsx` — parses `plan_discovery` string from Agent 2 output into collapsible KROK sections
- Integrated in `Agent2Card.tsx` — replaces raw pre-tag display of plan_discovery
- Line types: `> ` speech (blue), `🖥️` presentation marker (orange), `[WARIANT`/`⚠️` variant (yellow), `→` next step (green), `[`/`(` instruction (gray italic)
- KROK 3 and KROK 5 open by default; rest collapsed

## Kalkulator → Prezentacja

- `public/prezentacja.html` supports URL params: `?roi=&po=&h=&tms=&bol=`
- Kalkulator page computes `prezentacjaUrl` and renders "Otwórz prezentację z tymi liczbami" button

## Pipeline Fields (Agent 1 → Notion)

| Agent 1 JSON key | Notion property |
|---|---|
| `kalkulator_dane.maile_dziennie` | Maile ze zleceniami / dzień |
| `kalkulator_dane.godziny_wpisywania` | Godziny wpisywania / spedytor |
| `kalkulator_dane.faktury_po_terminie` | Faktury po terminie / mc |
| `kalkulator_dane.srednia_wartosc_faktury` | Średnia wartość faktury PLN |

- `/api/notion/pipeline-update` — POST `{ pageId, fields: Record<string, number|null> }` — updates any of 6 pipeline number fields via `FIELD_MAP`

## Dev Tools

- **knip** — dead code detection: `pnpm lint:dead`
- **Biome** — lint + format: `pnpm lint:fix`
- **husky** — pre-commit: runs knip + biome check
- Config files: `knip.json`, `biome.json`, `.husky/pre-commit`

## File Locations

```
app/(dashboard)/agenci/page.tsx       — agents page (7 agents)
app/(dashboard)/narzedzia/kalkulator/ — ROI calculator (light theme)
app/api/agents/agent*/route.ts        — agent API routes
app/api/notion/pipeline-update/       — pipeline field update endpoint
components/layout/sidebar.tsx         — navigation sidebar
components/LiveScript.tsx             — live discovery call script UI
lib/agents/prompts.ts                 — all system prompts + labels
lib/agents/field-map.ts               — agent Notion field mappings
lib/notion/client.ts                  — Notion API client
lib/tokens.ts                         — design tokens (light + dark)
```
