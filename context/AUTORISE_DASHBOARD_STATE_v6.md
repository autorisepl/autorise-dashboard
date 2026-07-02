# AUTORISE DASHBOARD — Stan systemu v8
**Data:** 2026-07-03 | **Wersja:** v8 (scripts-v3 + Robert AAA objections + mapa 9 nodów + ROW3 kanban + Agent1 3 statusy)

---

## Stack techniczny

| Element | Wersja / szczegóły |
|---|---|
| Framework | Next.js 16.2.7, App Router, React 19 |
| TypeScript | Strict mode, zero errors |
| CSS | Custom properties only, macOS Glassmorphism, var(--font-sans) everywhere |
| Deploy | Vercel (GitHub integration) → app.autorise.pl, gałąź `main` (lokalna: `master`) |
| Dev server | localhost:3000 (pnpm dev) |

---

## Design system

- Temat: macOS Glassmorphism light, ZERO dark mode toggle
- Font: `var(--font-sans)` wszędzie. ZERO `var(--font-mono)` w UI labels/numbers/time
- Kolory: `--accent: #0a84ff`, `--success: #30d158`, `--error: #ff453a`, `--warning: #ff9f0a`
- Text: `--text-secondary: #3a3a3c`, `--text-tertiary: #6e6e73`
- Sidebar: 260px, 5 stref nawigacyjnych
- Model names: "Claude Sonnet 4.6", "Claude Opus 4.8" (nigdy "claude-sonnet-4-6" ani z myślnikami)
- Sync/Odśwież buttons: zawsze transparent bg + `var(--border)` + `var(--text-secondary)`
- Timestamps: zawsze HH:MM:SS z sekundami

---

## Struktura stron (dashboard)

| Trasa | Tytuł w sidebar | Status |
|---|---|---|
| /agenci | Agenci wspomagania sprzedaży | ✅ 6 agentów (agent0 usunięty z UI) |
| /sesje | Sesje szkoleniowe | ✅ |
| /analiza-narzedzi | Analiza nowych narzędzi | ✅ |
| /pliki | Najważniejsze pliki | ✅ |
| /pipeline | Pipeline | ✅ Kanban 2×4, Notion data |
| /kontrola | Kontrola obszaru roboczego | ✅ v6 redesign |
| /harmonogram | Harmonogram | ✅ Google Calendar + Tasks |
| /zadania | Zadania | ✅ Google Tasks, 4 listy |
| /agencja | Nasza karta | ✅ Mobile responsive (panel switch), phone+email fix, Wyczyść etapy button |
| /narzedzia | Transkrypcja | ✅ Groq Whisper SSE |
| /profil | Profil | ✅ Google OAuth |

---

## Agenci AI

| Agent | Model | Opis |
|---|---|---|
| Agent 1 | Claude Sonnet 4.6 | Kwalifikacja telefoniczna → JSON + Notion Pipeline |
| Agent 2 | Claude Opus 4.8 + adaptive thinking | Pre-Discovery Brief |
| Agent 3 | Claude Opus 4.8 | Personalizacja prezentacji |
| Agent 4 | Claude Sonnet 4.6 | Analiza Discovery Call |
| Agent 5 | Claude Opus 4.8 + adaptive thinking | Knowledge Report dla Agency Leaders |
| Agent 6 | Claude Opus 4.8 | Ocena nowych narzędzi |

Wszystkie agenty: `metadata: { user_id: "autorise-agentN" }` + `stop_reason` check.

---

## API endpoints

| Endpoint | Metoda | Opis |
|---|---|---|
| /api/agents/agent[1-6] | POST | Wywołanie agenta AI |
| /api/health | GET | Status Anthropic/Notion/Google/Groq/MCP (cache 20s) |
| /api/env-check | GET | Lista zmiennych środowiskowych (obecne/brak) |
| /api/claude-config | GET | Agenci i skills z ~/.claude/ (filtr workspace, max 20 każdy) |
| /api/notion/pipeline | GET | Klienci z Notion Pipeline DB |
| /api/notion/pipeline-update | POST | Aktualizacja pól numerycznych klienta |
| /api/notion/sheets-sync | POST | Import Sheets → Notion (flex column detection) |
| /api/google/tasks | GET/PATCH | Google Tasks lists + toggle status |
| /api/google/calendar/events | GET | Google Calendar events |
| /api/google/drive/transcripts | GET | Pliki TXT/MP3 z Drive |
| /api/workspace/list | GET | Lista plików w workspace subdir |
| /api/auth/google/* | GET/DELETE | OAuth flow + status |

---

## Kluczowe implementacje (v6)

### Security fixes (wszystkie agenty)
- Każde `messages.create()` ma `metadata: { user_id: "autorise-agentN" }`
- Każdy agent sprawdza `message.stop_reason === "max_tokens"` przed parsowaniem
- `.vscode/settings.json`: exclusions dla `.next/` żeby securecoder nie skanował build artifacts

### Kontrola page — redesign (v6)
**Nowy layout (2 wiersze):**
- **Wiersz 1 (3 równe kolumny):** `autorise-mcp` | `autorise-dashboard` | `Integracje`
  - Karta "Integracje" zawiera wszystkie 5 statusów API (Anthropic, Notion, Google, Groq, MCP) w kompaktowych kafelkach
  - Każdy status: StatusDot + label + sublabel (np. "Połączono" lub "Whisper large-v3")
- **Wiersz 2 (40%/60%):** Zmienne środowiskowe | Claude Code konfiguracja
  - Env vars: kompaktowy 2-kolumnowy grid badge'ów (zielony/czerwony) z prefix-skrótami
  - Claude Code: agenci + skills (clickable, otwierają DetailPanel) + modele

### Sheets-sync (naprawiono w v5)
- `findCol()` z regex patterns — elastyczne dopasowanie kolumn Sheets
- Obsługuje: "Imię i Nazwisko", "Numer", "Email" i dowolne inne konwencje
- Przycisk "Synchronizuj leadów": styl identyczny jak "Odśwież"
- Wynik: prosty tekst counter "Dodano X leadów"

### Harmonogram (naprawiono w v5)
- **Layout fix:** sticky headers w jednym scrollable container → no misalignment
- **All-day section:** na górze (nad siatką godzinową)
- **Google Tasks:** zintegrowane — zadania z terminem w sekcji all-day, bez terminu w pomarańczowym pasku
- **TaskChip:** amber border-left, circle dot — odróżnia od EventChip
- Polling: 30s + focus listener

### Zadania (naprawiono w v5)
- Daty: "Poniedziałek 22.06.2026" (pełna nazwa dnia) zamiast "pon., 22 cze"
- Badge'y terminów: fontSize 11, fontWeight 700, padding 3×10px, mocniejsze kolory
- 4-tier: czerwony (overdue), pomarańczowy (today), zielony (week), szary (future)
- Filtr list: pokazuje wszystkie z wyjątkiem "Pomysły i inspiracje"

### Pipeline Kanban (v5 — ROW3)
- Trzy wiersze: ROW1 (4 statusy: Nowy lead, Kwalifikacja, Discovery umówione, Finalizacja), ROW2 (4: Kickoff, Wdrożenie, Retainer, Niekwalifikowany), ROW3 (2: Nieaktywny follow up, Upsell)
- Dynamic `gridTemplateColumns: repeat(N, 1fr)` per KanbanRow
- Separator `1px var(--border)` między wierszami
- ClientPanel (slide-in 340px): pokazuje tylko niepuste pola + link do Notion

### /sprzedaz — Skrypty v3
- **STEPS_K:** 9 kroków (0-Przygotowanie → 6-Umawianie przez pre-commitment w kroku 5)
- **STEPS_D:** 18 kroków (framework Robert — krok 1c podsumowanie kwalifikacji, 4-Pitch z 6 action notes dla slajdów 1/2/3/5/6/7, 5a-Commitment przed ceną, 7-Handling, 8-Closing, 9-Kontrakt)
- **OBJECTIONS_K:** ok1-ok7 (Logistyczne + Decydenci + SMS/FB)
- **OBJECTIONS_D:** od1-od11 (Robert AAA full — Niezdecydowanie, Decydenci, Finanse, Produkt, Logistyczne)
- **objectionColor():** 5 kategorii (Logistyczne=blue, Niezdecydowanie=amber, Finanse=red, Decydenci=purple, Produkt=teal) + left-border + bg tint na open
- **MapaProcesuTab:** 9 nodów flexbox (reklama→kwalifikacja→brief→personalizacja→discovery→umowa→wdrozenie→retainer→upsell), exit paths z kolorami, legenda 7 kolorów, liczniki klientów per nod, horizontal scroll

### Agent 1 — trzeci status
- 3 statusy: "Kwalifikacja" | "Discovery umówione" | "Nieaktywny (follow up)"
- "Nieaktywny (follow up)": wymagana `data_re_engagement` (obowiązkowa, agent ustala +30 dni jeśli klient nie podał)
- Kryteria: urlop 2+ tygodnie, aktualnie wdraża TMS, budżet za X mc, brak bólu po 2 próbach

---

## Konfiguracja środowiskowa

```
ANTHROPIC_API_KEY=sk-ant-...
NOTION_TOKEN=secret_...
NOTION_DATABASE_ID=75ac8bc6fd6d4c36934bedc1270217eb
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GROQ_API_KEY=gsk_...
DASHBOARD_SESSION_SECRET=...
WORKSPACE_ROOT=D:\autorise\workspace
GOOGLE_DRIVE_TRANSCRIPTS_MP3_FOLDER_ID=15xY1klu-c_3EqDDVT7SpzzUVRGRYVHNo
GOOGLE_DRIVE_TRANSCRIPTS_TXT_FOLDER_ID=1wk2yKYnC_7kvk8-P0Na8lBYrWO8DqHox
```

---

## Formatowanie — zasady (ZAWSZE przestrzegaj)

- Model names: "Claude Sonnet 4.6", "Claude Opus 4.8" (nie "claude-sonnet-4-6")
- Integration labels: "Anthropic", "Notion" (bez modelu w nazwie)
- Czasy: HH:MM:SS (z sekundami)
- No `var(--font-mono)` w UI labels
- Sync/Odśwież: transparent bg, `var(--border)`, `var(--text-secondary)`

---

## MCP Server

- Lokalizacja: `D:\autorise\workspace\autorise-mcp-server\`
- Port: 3010
- Cloudflare Tunnel: `mcp.autorise.pl` → `localhost:3010`
- Start: `npm run start` w `autorise-mcp-server/`
- Status: sprawdzany live przez `/api/health` endpoint

---

## Co wymaga działania użytkownika

1. **Google OAuth rescope**: Jeśli calendar nie działa — odłącz i połącz ponownie w /profil
2. **MCP Server**: Uruchom `npm run start` w `autorise-mcp-server/` lub sprawdź `cloudflared service install`
3. **Securecoder reload**: Po aktualizacji `.vscode/settings.json` — przeładuj okno VSCode (Ctrl+Shift+P → Reload Window)
