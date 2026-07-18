# CLAUDE.md — Autorise Dashboard

## Język i ton (NADRZĘDNE, czytaj pierwsze)

- Zawsze odpowiadaj po polsku. Bez wyjątków, niezależnie od języka commit message, nazw zmiennych w kodzie, czy treści promptu.
- Komentarze w kodzie: po polsku, chyba że dotyczą standardowej terminologii technicznej bez naturalnego polskiego odpowiednika.
- Ton: ekspert do eksperta, zdanie pod zdaniem, bez zbędnych wstępów.
- Zakaz: em dash w jakiejkolwiek formie, strzałki "→" (pisz "A: B" albo "Jeśli A, to B"), myślnik narracyjny w środku zdania.
- Zakaz AI-slop: "świetnie", "oczywiście", "z pewnością", "świetne pytanie", nadmiarowe podsumowania na końcu bez treści.
- Jeśli coś w kodzie lub planie ma błąd, powiedz to wprost, zanim powiesz co jest dobre. Nie szukaj jak uzasadnić słabe rozwiązanie.

## Stack

- **Next.js 16.2.7** App Router, TypeScript strict mode, React 19
- **Vercel** (GitHub integration) — auto-deploy przy każdym push do `main`, `maxDuration` do 300s
  - **URL produkcyjny: app.autorise.pl** (DNS przez Cloudflare, CNAME → cname.vercel-dns.com, DNS only)
  - Produkcyjna gałąź na Vercel to `main`; lokalnie pracujesz na `master` → deploy: `git push origin master:main`
- **UI**: var(--font-sans) WSZĘDZIE (Roboto). ZERO var(--font-mono) w UI labels/number/time
- **Design tokens**: CSS custom properties w `app/globals.css`
- **Animation**: framer-motion, lucide-react icons
- **Validation**: Zod on all API routes

## Design System

- macOS/Apple light theme — single theme, no dark mode toggle, no exceptions
- Font: Roboto (next/font/google)
- CSS custom properties w `app/globals.css`: `var(--bg)`, `var(--accent)`, `var(--border)`, `var(--text-primary)`, etc.
- Accent: `#0a84ff`; SUCCESS `#34c759`, ERROR `#ff3b30`, WARNING `#ff9500`
- Text: `--text-secondary`, `--text-tertiary`
- UI components: `Panel`, `Button`, `StatusDiode`, `SectionLabel` w `components/ui/`
- Model names: "Claude Sonnet 4.6", "Claude Opus 4.8" — nigdy z myślnikami, nigdy lowercase
- Buttons sync/odśwież: transparent bg, var(--border), var(--text-secondary)
- Timestamps: ZAWSZE HH:MM:SS z sekundami
- Design system live preview: `/brand-book`

## Nawigacja (sidebar) — 3 grupy (A2, 2026-07-16), zgodne z `components/layout/sidebar.tsx`

```
ORGANIZACJA
  /pipeline        → Pipeline Kanban (3 rzędy: ROW1/ROW2/ROW3 z "Nieaktywny follow up" + "Upsell")
  /statystyki      → KPI dzienne/lejek/wynik, rozmowy kwalifikacyjne i sprzedażowe osobno
  /harmonogram     → Harmonogram (Google Calendar + Tasks)
  /zadania         → Zadania (Google Tasks, 4 listy)
  /kontrola        → Kontrola obszaru roboczego (v6)
  /brand-book      → Design system live preview

KLIENCI
  /kwalifikacja    → widok etapowy: skrypt kwalifikacyjny + kalkulator inline (krok 2.6) + dalsze kroki
  /sprzedaz        → widok etapowy: brief Agent 2 + skrypt sprzedażowy + kalkulator + prezentacja sync
  /wdrozenie       → PROTOTYP (2026-07-18): jednorazowy proces Tydzień 0 do Dzień 30 (dostępy + oś czasu)
  /utrzymanie      → PROTOTYP (2026-07-18): stały retainer po zamknięciu wdrożenia
  /agenci          → Agenci wspomagania sprzedaży (6 tabów, agent0 ukryty)
  /prezentacja     → link do prezentacja.html
  /narzedzia       → Transkrypcja (AudioRecorder + Drive picker + Groq Whisper)

WIEDZA I PROCES
  /agencja         → Karta (Agency Leaders) — Sheets sync
  /mapa            → Mapa procesu sprzedażowego (live client tracking)
  /baza-wiedzy     → placeholder, czeka na sesję z Michałem (blok A3 w PLAN_CLAUDE_CODE.md)
  /analiza-narzedzi → Analiza nowych narzędzi
```

Zakładka `/pliki` usunięta z nawigacji (A2, 2026-07-16) — strona zostaje w kodzie, nielinkowana, ten sam wzorzec co wcześniej `/sesje`. `/sesje` nadal bez linku w menu (Agent 5 dostępny wyłącznie przez `/agenci`), `/analiza-narzedzi` PRZYWRÓCONA do menu mimo wcześniejszego usunięcia jako duplikatu — nadrzędny plan tak wskazał, patrz `AUTORISE_SESSION_LOG.md`.

**A1 rozdzielone na dwie zakładki (decyzja Michała, 2026-07-18)**: pierwotny plan A1 zakładał jedną zakładkę `/wdrozenie` ze wszystkim (dostępy, pomiar bazowy, checklist, weryfikacja Dzień 30, ORAZ retainer). Michał zdecydował rozdzielić: `/wdrozenie` wyłącznie jednorazowy proces (Tydzień 0 do Dzień 30, kończy się ustawieniem statusu Retainer), `/utrzymanie` wyłącznie stały retainer po zamknięciu wdrożenia. Oba PROTOTYPY, czekają na ocenę Michała przed rozbudową.

- `/wdrozenie`: globalny selektor klienta (`GlobalClientSelector`) + wizualna oś czasu 5 etapów (Tydzień 0/1/2-3/4/Dzień 30, etap wyliczany deterministycznie z `dataPotwierdzeniaDostepow` — bez osobnego pola "Tydzień wdrożenia", świadomie żeby nie mnożyć pól w tym prototypie) + Panel Dostępy (4 stałe pozycje z KARTA_PRODUKTU pkt 9: TMS/poczta/księgowość/kontakty operacyjne, checkboxy zapisywane do Notion na żywo, przycisk "Potwierdź komplet dostępów" nieaktywny dopóki nie wszystkie zaznaczone, zapisuje `dataPotwierdzeniaDostepow` = dziś i pokazuje datę weryfikacji +30 dni). Reszta specyfikacji A1 (Pomiar bazowy, Checklist tygodniowa, Weryfikacja Dzień 30) świadomie NIE zbudowana, czeka na akceptację kierunku tego prototypu.
- `/utrzymanie`: ten sam selektor klienta + 4 panele. "Co obejmuje retainer" w pełni gotowy, deterministyczny, treść identyczna ze slajdu 6 prezentacji (`RETAINER_ZAKRES` w `utrzymanie/page.tsx`, jedno źródło prawdy dla tego tekstu docelowo powinno zastąpić duplikat w `prezentacja.html`, nie zrobione w tym punkcie). "Metryki miesięczne" (KARTA_PRODUKTU pkt 13) honest placeholder — brak integracji z logami systemu, świadomie NIE pokazuje wymyślonych liczb. "Drabinka eskalacji" (pkt 14, 5 progów 0/3-4/7/14/30 dni) liczona z nowego pola `ostatniKontaktRetainer`, przycisk ręcznej rejestracji kontaktu; reużywa `ContactAttemptsBadge` wyłącznie dla wyświetlenia istniejącego licznika prób sprzedażowych (`liczbaProb`), sama drabinka dni to nowy, osobny komponent bo kształt nie pasuje 1:1 (3-poziomowy licznik prób vs 5-poziomowa drabinka dni). "Historia zgłoszeń" — prosta lista data+opis, serializowana jako tekst do nowego pola Notion, realnie zapisywana.
- Wspólny komponent `components/clients/ContactAttemptsBadge.tsx` wydzielony z `/pipeline` (przyjmuje `proby`/opcjonalny `onIncrement`, Pipeline dalej jedynym miejscem z przyciskiem "+").
- Nowe pola Notion Pipeline (Batch 4 w `migrateNotionSchema()`, **migracja NIE uruchomiona w tej sesji** — wymaga kliknięcia "Migruj schemat" w `/kontrola`): "Data potwierdzenia dostępów" (date), "Czas bazowy potwierdzony h/mc" (number, na razie niewykorzystane w UI, zarezerwowane dla Panelu Pomiar bazowy), "Dostępy zebrane" (rich_text, comma-separated klucze checkboxów), "Ostatni kontakt (retainer)" (date), "Historia zgłoszeń (retainer)" (rich_text, serializacja "data | opis" per linia). `PipelineClientDetailed` (`app/api/notion/pipeline/route.ts`) i `PATCH /api/notion/pipeline-update` rozszerzone o te pola plus istniejące `Retainer PLN/mc` (wcześniej pobierane tylko przez `/api/notion/prezentacja-dane`, teraz też przez główny endpoint Pipeline).

UWAGA: `/narzedzia/kalkulator` to osierocona strona z wcześniejszej sesji, bez linku w nawigacji. Kalkulator ROI właściwy żyje inline w `/kwalifikacja` (krok 2.6) i `/sprzedaz`. Jeśli osierocona strona nie jest jeszcze usunięta, usuń ją przy najbliższej okazji, żeby uniknąć dwóch wersji tego samego narzędzia.

## Skrypty sprzedażowe — struktura danych

```
lib/scripts/types.ts           — Step, Line, Objection, IcpRule interfaces
lib/scripts/kwalifikacyjna.ts  — STEPS_K (12 kroków V4), OBJECTIONS_K (12), ICP_RULES
lib/scripts/sprzedaz.ts        — STEPS_D, OBJECTIONS_D (framework Robert AAA, od1-od11). Do 2026-07-16 plik nazywał się discovery.ts — zmieniono, bo nazwa legacy sugerowała trzeci, osobny etap sprzedaży, mamy dwa (kwalifikacja + sprzedaż)
lib/scripts/messages.ts        — MESSAGES_DATA (SMS/WhatsApp/FB templates)
```

Struktura `STEPS_K` V4: Opening (krok 1) → Diagnoza z ICP i kalkulatorem wbudowanym (kroki 2.1-2.8, w tym `hasCalculator: true` w kroku 2.6) → Spotkanie (krok 3, Calendly nie Google Meet). ICP NIE jest osobnym krokiem przed diagnozą — jest jej częścią (Miro framework: Opening, Diagnoza, Spotkanie, trzy kroki).

Zasada stała wpisana jako komentarz na górze obu plików skryptów: jeśli Agency Leaders nie dał gotowej instrukcji na konkretną sytuację, rozwiązanie buduje się z ich zasad ogólnych (personalizacja, konkret zamiast ogólnika, klient sam dochodzi do wniosku przez pytania), nie jako coś oderwanego od frameworku.

Każdy krok diagnozy ma jawny `branch` na końcu `lines` pokazujący dokąd przejść po odpowiedzi klienta (wzorzec z kroku "opener"). Obiekcje otwierające (`ok_em`, `ok_cc`, `ok_ms`, `ok_cp`, `ok_nb`) zawsze kończą się przejściem do kroku 2.1, nigdy nie zadają diagnostycznego pytania w oderwaniu od struktury.

Nagrywanie: kwalifikacja to komputerowa nagrywarka (AudioRecorder w `/narzedzia`), NIE Fathom. Fathom jest wyłącznie dla Discovery Call (Google Meet).

## Agents

| ID | Model | Thinking | Notes |
|---|---|---|---|
| agent0 | claude-sonnet-4-6 | no | KRS + MF API enrichment (hidden in UI) |
| **agentKwalifikacja** | claude-opus-4-8 | **adaptive** | Od 2026-07-13: scalony Agent 1+2+3 w jednym wywołaniu (`app/api/agents/kwalifikacja/route.ts`, `KWALIFIKACJA_MERGED_SYSTEM_PROMPT`). Zwraca `{kwalifikacja, brief_discovery, prezentacja}` — dokładnie te same kształty co dawne agent1/2/3 output. Jedyna zakładka "01 Kwalifikacja" w `/agenci`, zapisuje do Notion identycznymi funkcjami co stare agenty (`saveKwalifikacjaMergedOutput`). Trzy statusy wyjściowe kwalifikacji jak dawniej: Kwalifikacja / Niekwalifikowany / Nieaktywny (follow up) z obowiązkową data_re_engagement. Od 2026-07-14 (Blok 0.2): tryb weryfikacja/uzupełnienie i auto-wczytywanie historii Notion PRZENIESIONE ze starego Agenta 1, patrz sekcja niżej |
| ~~agent1~~ | claude-sonnet-4-6 | no | Zastąpiony przez agentKwalifikacja w UI. Kod route'a zostaje jako fallback (tryb weryfikacja/uzupełnienie), nieosiągalny z żadnej zakładki |
| ~~agent2~~ | claude-opus-4-8 | adaptive | Zastąpiony przez agentKwalifikacja w UI. Kod route'a zostaje jako fallback |
| ~~agent3~~ | claude-opus-4-8 | no | Zastąpiony przez agentKwalifikacja w UI. Kod route'a zostaje jako fallback |
| agent4 | claude-sonnet-4-6 | no | Discovery call analysis |
| agent5 | claude-opus-4-8 | **adaptive** | Agency Leaders training |
| agent6 | claude-opus-4-8 | no | Tool/library evaluation |

**Rozszerzenie schematu o treść skryptów (Blok "Arek" pkt 1/16, 2026-07-15):** `brief_discovery` ma teraz trzy nowe pola obok `pitch_recipe`: `system_transformacji` (tablica 3 gotowych zdań, jedno na krok wdrożenia), `roznicowanie_zdanie` (jedno zdanie: poprzednia próba klienta + powód porażki + jak Autorise robi to inaczej) i `roi_dopowiedzenie` (jedno zdanie ROI z podstawionymi liczbami). Zapisywane do trzech nowych pól Notion Pipeline ("System transformacji (3 kroki)"/"Zdanie różnicujące"/"ROI dopowiedzenie", `saveAgent2Output` w `lib/notion/client.ts`). Powód: `discovery.ts` miał dosłowne, nieusuwane nawiasy ("[moduł 1 opisany korzyścią]", "[poprzednia próba z rozmowy]"/"[powód z rozmowy]", "[kwota oszczędności]"/"[X] miesięcy") które sprzedawca czytał klientowi na żywo słowo w słowo — zgłoszone przez Michała po rozmowie z Arkiem 15 lipca. `fill()` w `app/(dashboard)/sprzedaz/page.tsx` (funkcja lokalna renderująca `line.text`/`obj.script`) podstawia teraz te pola zamiast literalnych nawiasów, z honest fallbackiem gdy dane jeszcze nie istnieją. `kwalifikacyjna.ts` sprawdzony i NIE ma tego problemu — jego jedyne nawiasy ("[WYNIK Z KALKULATORA]" itp.) są już live-computed przez kalkulator wbudowany w UI, nie wymagają danych z agenta.

**Tryb weryfikacja/aktualizacja agentKwalifikacja** (Blok 0.2 2026-07-14, auto-wykrywanie dodane w Bloku 1 część 1, 2026-07-14): tryb "Aktualizacja klienta" (backend nadal `mode: "uzupelnienie"`, tylko etykieta UI się zmieniła) jest WYKRYWANY AUTOMATYCZNIE, bez ręcznego przełącznika — przy wyborze klienta `checkHistoryAndLoad` w `page.tsx` sprawdza historię Notion (`HISTORY_TYPE_BY_AGENT`), jeśli istnieje zapisana analiza ustawia `historyDetected=true` (stąd wyliczony `analysisMode="uzupelnienie"`) i od razu wczytuje tę analizę do podglądu; baner "Wykryto wcześniejszą analizę…" + dyskretny link "Zacznij od zera mimo to" (`handleForceNowa`, ustawia `modeOverride="nowa"`) to jedyny ręczny wyjątek. Toggle "Tryb weryfikacji" zostaje ręczny (nie da się wykryć automatycznie który transkrypt jest "stary") i widoczny tylko w efektywnym trybie "nowa" (`MODE_CAPABLE_AGENTS` w `page.tsx`, dziś `agent1` i `agentKwalifikacja`). Backend: `KWALIFIKACJA_MERGED_UZUPELNIENIE_SUFFIX` w `prompts.ts` instruuje Część A żeby zmieniała TYLKO dotknięte pola (null = bez zmian) i dopisywała `uwagi_agenta` do istniejącej historii zamiast nadpisywać; Część B/C (`brief_discovery`/`prezentacja`) zwracają dosłowny JSON `null` — mały fragment nie generuje nowego briefu Discovery ani nowej prezentacji, żeby nie nadpisać dobrych danych zgadywanymi. Weryfikacja: `KWALIFIKACJA_MERGED_VERIFICATION_SUFFIX` dopisuje `luki_do_uzupelnienia`/`bledy_obliczen`/`rekomendacja_reaktywacji` do klucza `kwalifikacja` (nie do najwyższego poziomu, w przeciwieństwie do starego Agenta 1, bo merged output jest zagnieżdżony). Dla `agentKwalifikacja` wpis historii "Agent Kwalifikacja — Część A (kwalifikacja)" trzyma CAŁY scalony output (nie samą Część A) właśnie po to, żeby dało się go wczytać z powrotem do `AgentKwalifikacjaCard`.

**Extended thinking**: always `{ type: 'adaptive' }` for claude-opus-4-8. Never `{ type: 'enabled', budget_tokens: N }`.
**Metadata**: every `messages.create()` must have `metadata: { user_id: "autorise-agentN" }`.
**stop_reason**: check `message.stop_reason === "max_tokens"` and warn before parsing content.

## Prezentacja (public/prezentacja.html)

Statyczny plik HTML/JS poza Next.js, celowo zero-dependency: fonty przez Google Fonts `<link>` (Manrope + Roboto Mono, z preload na oba pliki woff2), ikony jako inline SVG Tabler (nie webfont), brak frameworka, brak build stepu. Roboto Mono max waga 700 (nie 800, sprawdzone realnie przez Google Fonts API — ten sam wzorzec co Manrope max 800 nie 900).

Dokładny łańcuch skąd biorą się dane personalizacji, żeby to pytanie nie wymagało wyjaśniania od zera:

1. **Agent 1** liczy koszt problemu (PLN/rok), godziny tracone dziś i potencjał po wdrożeniu z rozmowy kwalifikacyjnej, zapisuje do Notion Pipeline.
2. **Agent 3** czyta te dane z Pipeline i personalizuje je pod konkretnego klienta, zwraca `hero_stat_godziny`/`roi_dzis_h`/`roi_po_h` i pozostałe pola.
3. Przycisk "Otwórz prezentację" w `Agent3Card.tsx` buduje link z parametrami URL: `roi` (h/mc dziś), `po` (h/mc po wdrożeniu), `bol` (koszt roczny PLN), `tms` (nazwa systemu klienta), `gwar` (gwarancja h/mc), opcjonalnie `start` (od którego slajdu otworzyć).
4. JS w `prezentacja.html` czyta te parametry przez `URLSearchParams` do obiektu `V`, funkcja `applyValues()` wypełnia nimi wszystkie elementy z klasami `.val-roi` / `.val-po` / `.val-bol` / `.val-bol-k` / `.val-tms` / `.val-gwar` plus przelicza pochodne liczby (miesiące zwrotu, % inwestycji, szerokość pasków).
5. Klawisz `E` (albo ikona w prawym górnym rogu) otwiera pasek edycji na żywo, do ręcznej korekty na miejscu podczas rozmowy, bez przeładowania linku — inputy `#ei-roi`/`#ei-po`/`#ei-bol`/`#ei-tms`/`#ei-gwar` piszą z powrotem do tego samego obiektu `V` i wywołują `applyValues()` ponownie.

Ten mechanizm (`URLSearchParams` → `V` → `applyValues()` → klasy `val-*` → tryb edycji) jest kontraktowy i nietykalny przy redesignach wizualnych — dwie kolejne sesje pełnego redesignu (najpierw paleta asfalt/bursztyn, potem navy/blue z Tabler Icons) zmieniały wyłącznie CSS i strukturę HTML wewnątrz slajdów, nigdy tej logiki. Redesign wizualny nie wymaga żadnej zmiany w `Agent3Card.tsx` ani w promptach Agenta 1/3 — parametry URL są stabilnym kontraktem, niezależnym od tego jak wygląda strona.

**Retainer na slajdzie 6 (Blok "Arek" pkt 9, 2026-07-15):** sekcja "Co obejmuje retainer" pod `.inv-note`, klasa `.val-retainer` wypełniana przez `applyValues()` z `V.retainer` (fallback 4000, spójny z `DOMYSLNY_RETAINER` w `/api/notion/prezentacja-dane`). Pole dostępne wyłącznie z `?id=` (jak `cenaWdrozenia`), nie ma odpowiednika w starym torze URL-params — retainer nigdy nie był w zestawie `roi`/`po`/`bol`/`tms`/`gwar`.

**Drugi, równoległy tor personalizacji (bez AI)**: `?id=<notion_page_id>` zamiast pełnego zestawu parametrów URL. JS przy starcie fetchuje `GET /api/notion/prezentacja-dane?id=...` (endpoint w `PUBLIC_PATHS` w `proxy.ts` — musi być dostępny bez sesji, tak jak sama strona), pokazuje krótki loading state (`#loading-overlay`), potem woła `applyValues()` z odpowiedzią. Ten endpoint NIE wywołuje AI — liczy `po`/`payback_miesiace`/`procent_kosztu`/`bol_kategoria` deterministycznie z pól Pipeline (te same heurystyki co Agent 3, opisane komentarzami w `route.ts`). Brak `?id=`, `znaleziono:false`, albo błąd fetcha — stary mechanizm URL-params odpala się dokładnie jak wcześniej, oba tory współistnieją, `V`/`applyValues()`/tryb edycji są wspólne dla obu. `cena_wdrozenia`/`retainer` w Pipeline są polami wypełnianymi WYŁĄCZNIE ręcznie przez Michała (nigdy przez agenta) — dla wczesnych leadów zwykle puste, front-end pokazuje wtedy czytelny fallback tekstowy ("Cena ustalana indywidualnie", "–"), nigdy fabrykowaną liczbę.

## Security rules (ENFORCE)

- Każde `messages.create()` → `metadata: { user_id: "autorise-agentN" }`
- Sprawdź `stop_reason` przed dostępem do `message.content`
- Securecoder skanuje `.next/server/chunks/` — to false positives w minified code
- `.vscode/settings.json` ma exclusions dla `.next/` i `node_modules/`

## Notion

- `PIPELINE_DB_ID = "75ac8bc6fd6d4c36934bedc1270217eb"` w `lib/notion/client.ts` — **never change**
- `PIPELINE_DATA_SOURCE_ID = "2ea38355-7529-48f9-8d7f-1c62f5570df3"`
- `upsertClientInPipeline` ma graceful fallback na unknown property errors
- Email zapisywany do dedykowanego pola Notion (nie tylko do Notatek)
- "Liczba prób kontaktu" — dokładna nazwa pola, nie "Liczba prób"
- `anyDateToISO` obsługuje format "wtorek 16 (najbliższy) · 16:30"
- "Utracony" (checkbox) + "Powód utraty" (rich_text) — Blok 1 pkt 1.5 (2026-07-14), wyłącznie ręczne (setter/Michał w `/pipeline`), żaden agent tego nie ustawia. Domyślnie ukryte z Kanbanu, filtr "Utracone (N)" w headerze przywraca widoczność.
- **KRYTYCZNE — Notion API i `select.options`**: `notion.dataSources.update({properties: {"Pole": {select: {options: [...]}}}})` **zastępuje całą listę opcji**, nie patchuje — każda opcja pominięta w tablicy zostaje TRWALE USUNIĘTA. Zawsze wysyłaj PEŁNĄ, aktualną listę opcji (retrieve najpierw), nigdy tylko te które chcesz zmienić. Incydent 2026-07-14 (patrz `AUTORISE_SESSION_LOG.md`) skasował na chwilę 4 opcje "Typ follow-up" tym błędem, przywrócone bez utraty danych na kartach. Dodatkowo: rename istniejącej opcji przez ten endpoint **w praktyce nie działa** (wywołanie kończy się bez błędu, nazwa zostaje stara) — do zmiany nazwy/usunięcia opcji użyj UI Notion, nie API.
- Claude Code NIE ma bezpośredniego zapisu do Notion — to celowe. Zapis idzie przez API routes agentów (`/api/agents/agent[0-6]`), wywoływane z dashboardu, nie z sesji kodowania. Rozdzielenie: Claude Code = kod przez git, dashboard + agenci = dane biznesowe. Nie instaluj Notion MCP pluginów do Claude Code bez wyraźnej decyzji, bo to łamie to rozdzielenie.
- **Baza "Produkty"** (utworzona 2026-07-15, jawna instrukcja z `AUTORISE_MASTER_PLAN.md` sekcja "Arek" pkt 11, wykonana przez połączony konektor Notion, nie przez API route): 4 standardowe moduły wdrożeniowe (`email-parser`/`document-ocr`/`payment-monitor`/`whatsapp-alerts`), każdy z polami Opis dla klienta/Opis techniczny/Typowy czas integracji/Warunki rekomendacji/Kategorie kalkulatora/Status modułu. Pole "Kategorie kalkulatora" (multi_select: zlecenia/cmr/faktury_recznie/komunikacja/inne) odpowiada dokładnie wartościom `calculatorFlag` z `lib/scripts/kwalifikacyjna.ts`. Powiązanie z kodem: `lib/scripts/moduleRecommendation.ts` (`MODULE_FLAG_MAP`) ma teraz pole `code` z tym samym sluggiem co "Kod modułu" w Notion — rekomendacja modułu w kroku 2j kwalifikacji nie jest już samym tekstem, ma jeden do jednego odpowiednik w tej bazie. Metodologia "4 sposoby rozwiązania braku dostępu do API strony trzeciej" opisana jako osobna strona w Notion ("Produkty — Metodologia: brak dostępu do API strony trzeciej", siostrzana do bazy Produkty): (1) bezpośredni kontakt z właścicielem/dostawcą systemu, (2) automatyzacja RPA klikająca interfejs jak człowiek, (3) rozpoznawanie elementów wizualnie na ekranie, (4) dostęp przez panel w przeglądarce — w tej kolejności preferencji, mocniejsza integracja zawsze przed słabszą.

## Google Integration

- `lib/google/auth.ts` — OAuth2 client, scopes: tasks, spreadsheets, drive, calendar, userinfo
- `app/api/auth/google/` — start OAuth / callback / status / disconnect
- `app/api/google/tasks/route.ts` — GET wszystkie listy + tasks; PATCH toggle status
- `app/api/google/calendar/events/route.ts` — GET events
- Token priority: `google_refresh_token` cookie (świeży reconnect) > `GOOGLE_REFRESH_TOKEN` env var
- Required: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI = https://app.autorise.pl/api/auth/google/callback` (prod; redirect_uri liczone też dynamicznie z origin)
- `GOOGLE_SHEETS_ID = 18BjXDFAWDVQnQkrE_1Kmvj0-ZJIGXQejLY6IJOOXnH0`

## Calendly

- Zaproszenia na Discovery Call idą przez Calendly, NIE przez ręcznie tworzone wydarzenie Google Meet
- `CALENDLY_URL` const w kroku "Spotkanie jako rozwiązanie" (`lib/scripts/kwalifikacyjna.ts`)

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

## Kontrola page (v6)

- Wiersz 1 (3 kolumny): autorise-mcp | autorise-dashboard | Integracje (5 API statusów)
- Wiersz 2 (40/60): Zmienne środowiskowe (grid badge'ów) | Claude Code (agenci/skills/modele)
- Polling: 20s + focus listener
- Claude-config: max 20 agentów i 20 skills, filtr RELEVANT_KEYWORDS

## Harmonogram (v5)

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

## Diagnoza INP ~700ms (2026-07-18, zgłoszenie Michała z Vercel Speed Insights)

Zmierzone realnie (Playwright + Chrome DevTools `PerformanceObserver` longtask, na `localhost:3000` w trybie dev, więc liczby bezwzględne są zawyżone względem produkcji, ale rozkład między stronami jest wiarygodny): **pojedyncze, kontrolowane kliknięcia w realną kartę klienta na `/pipeline` kosztują ~50ms, nie są problemem.** Duże longtaski (1.5-1.6s) pojawiały się wyłącznie przy pierwszych interakcjach zaraz po nawigacji na `/pipeline` i `/harmonogram`, nie były powtarzalne przy identycznym kliknięciu wykonanym drugi raz po ustabilizowaniu strony. Pasuje do znanego wzorca: strona "wygląda" na gotową (pierwszy paint), ale hydration/efekty jeszcze dokańczają pracę na głównym wątku, więc pierwsze kliknięcie użytkownika ustawia się w kolejce za tą resztą pracy i INP przypisuje cały ten czas do kliknięcia, mimo że sam handler jest tani.

Dlaczego akurat te dwie strony: `/pipeline` renderuje ok. 30-90 kart Kanbanu (deduplikowany wynik z `page_size: 100` w `/api/notion/pipeline`) bez wirtualizacji (brak `react-window` czy odpowiednika w `package.json`) — każda karta to kilkanaście zagnieżdżonych divów z inline style, początkowy mount/reflow całej listy jest realnie kosztowny. `/harmonogram` miał `networkidle` na poziomie 29 sekund w tym samym teście — długi łańcuch fetchy Google Calendar/Tasks, więc pierwsze kliknięcie zaraz po tym jak strona wygląda gotowo ma dużą szansę trafić w wciąż trwające pobieranie/renderowanie danych.

`/mapa` i `/statystyki` w tym samym teście: zero longtasków przy identycznym sweep'ie kliknięć, potwierdza że to nie problem całego dashboardu, tylko tych dwóch stron. `/kwalifikacja` miał serię małych (56-113ms) longtasków rozłożonych na wiele kliknięć zamiast jednego dużego — inny wzorzec (ogólny koszt per-interakcja, prawdopodobnie brak `useMemo`/`React.memo` przy dużym drzewie skryptu), mieści się w paśmie "dobre" wg progów Core Web Vitals (poniżej 200ms), nie priorytet.

**Nie naprawione w tej sesji, zgodnie z instrukcją "nie zgaduj i nie napraw na ślepo"**: zanim ktokolwiek dotknie kodu, potwierdzić w Vercel Speed Insights (produkcja, realni użytkownicy) który dokładnie element/interakcja ma atrybucję ~700ms, bo dev-mode nie jest 1:1 z produkcją. Jeśli potwierdzi się `/pipeline`: kandydat do naprawy to wirtualizacja listy kart (`react-window`) i/lub `React.memo` na `ClientCard`. Jeśli `/harmonogram`: właściwy problem jest wcześniej w łańcuchu (29s do `networkidle`), osobny temat od INP per se, wymaga równoległych zamiast sekwencyjnych fetchy Calendar/Tasks, nie da się naprawić na poziomie pojedynczego handlera kliknięcia.

## Key Rules

- `maxDuration = 300` max on Vercel Hobby
- `hasThinking` badge: tylko agent2, agent5
- `useSearchParams()` wymaga `<Suspense>` wrapper w Next.js App Router
- ZERO hardcode secrets — zawsze `process.env.XXX`
- ZERO `console.log` w production

## UI — ZASADY BEZWZGLĘDNE

- **ZERO emojis** w UI — zawsze Lucide React icons (MessageSquare, Phone, Users, Check, X, AlertTriangle itd.)
- **ZERO strzałek →** w UI i w tekstach — zamiast "A → B" pisz "A: B" lub "Jeśli A, to B"
- **ZERO myślnika narracyjnego —** w środku zdania — zamiast tego użyj kropki lub dwukropka
- React hooks muszą być zdefiniowane PRZED każdym conditional `return` (Rules of Hooks)
- Wszystkie buttony/inputy/selecty: ten sam height (36px), border-radius (8px), font-size (13px) w całym dashboardzie, żeby zachować jeden spójny wygląd

## Skills (lokalne w Claude Code)

Zainstalowane w `~/.claude/skills/`: `taste-skill`, `redesign-skill`, `impeccable`. Te są niezależne od projektu Claude.ai (który ma osobny zestaw: `agency-leaders-analysis`, `humanizer`, `stop-slop`, `frontend-design`). Oba systemy się nie widzą nawzajem, każdy czyta tylko ze swojego środowiska.

## File Locations

```
app/(dashboard)/kwalifikacja/page.tsx     — widok etapowy Kwalifikacja
app/(dashboard)/sprzedaz/page.tsx         — widok etapowy Discovery/Sprzedaż
app/(dashboard)/pipeline/page.tsx         — Pipeline Kanban (3 rzędy)
app/(dashboard)/mapa/page.tsx             — Mapa procesu sprzedażowego
app/(dashboard)/agenci/page.tsx           — agents page (6 agents, agent0 ukryty)
app/(dashboard)/brand-book/page.tsx       — design system live preview
app/(dashboard)/narzedzia/page.tsx        — Transkrypcja (AudioRecorder + Drive)
app/(dashboard)/narzedzia/kalkulator/page.tsx — OSIEROCONA strona, do usunięcia
app/(dashboard)/kontrola/page.tsx         — Kontrola (v6 redesign)
app/(dashboard)/harmonogram/page.tsx      — Calendar + Google Tasks
app/(dashboard)/zadania/page.tsx          — Google Tasks (4 listy)
app/(dashboard)/agencja/page.tsx          — Nasza karta + Sheets sync
app/api/agents/agent[0-6]/route.ts        — agent API routes (agent1/2/3 fallback, nieużywane z UI od 2026-07-13)
app/api/agents/kwalifikacja/route.ts      — scalony Agent 1+2+3, jedyny wywoływany z /agenci "01 Kwalifikacja"
components/agents/AgentKwalifikacjaCard.tsx — renderuje wynik agentKwalifikacja (składa Agent1/2/3Card)
app/api/health/route.ts                   — health check (Anthropic/Notion/Google/Groq/MCP)
app/api/env-check/route.ts                — env vars check
app/api/claude-config/route.ts            — Claude Code agents/skills (filtered)
app/api/notion/pipeline/route.ts          — Pipeline clients
app/api/notion/sheets-sync/route.ts       — Sheets → Notion sync
app/(dashboard)/wdrozenie/page.tsx        — PROTOTYP: jednorazowy proces wdrożenia (Tydzień 0 do Dzień 30)
app/(dashboard)/utrzymanie/page.tsx       — PROTOTYP: stały retainer po zamknięciu wdrożenia
components/clients/ContactAttemptsBadge.tsx — licznik prób kontaktu, wydzielony z /pipeline
app/(dashboard)/baza-wiedzy/page.tsx      — placeholder, czeka na sesję z Michałem (blok A3)
components/layout/sidebar.tsx             — navigation sidebar (260px, 3 grupy: Organizacja/Klienci/Wiedza i proces)
components/kalkulator/KalkulatorRoi.tsx   — kalkulator ROI (inline w skryptach)
lib/agents/prompts.ts                     — all system prompts
lib/scripts/{types,kwalifikacyjna,sprzedaz,messages}.ts — dane skryptów
lib/notion/client.ts                      — Notion API client
context/AUTORISE_SESSION_LOG.md           — log sesji, czytaj na starcie każdej sesji
context/PLAN_CLAUDE_CODE.md               — bieżący plan wykonawczy dla Claude Code, czytaj na starcie każdej sesji obok SESSION_LOG
```

## Hierarchia plików kontekstowych (B10, 2026-07-16)

Dwa równoległe, ręcznie synchronizowane plany istnieją celowo:

- **`context/PLAN_CLAUDE_CODE.md`** — jedyny plan który czyta i wykonuje Claude Code w tym repo. Aktualny stan priorytetów i zadań technicznych. Czytaj na starcie każdej sesji.
- **`PLAN_CLAUDE_AI.md`** — plan decyzji i dokumentów, żyje w projekcie Claude.ai, NIE istnieje lokalnie w workspace i Claude Code go nie widzi ani nie czyta. Synchronizacja między oboma planami jest wyłącznie ręczna, robi ją Michał — nie zakładaj że jeden odzwierciedla drugi bez potwierdzenia.
- **`CLAUDE.md` (ten plik)** — źródło prawdy o BIEŻĄCYM stanie systemu (stack, struktura, wzorce), nie o priorytetach czy planach. Aktualizuj po każdej zmianie struktury/architektury, nie tylko na końcu sesji.
- **`context/AUTORISE_SESSION_LOG.md`** — historia, append-only, jeden wiersz per punkt sesji, nigdy nie edytuj wstecz.

Usunięte 2026-07-16 (B10) jako zdublowane/przestarzałe wobec powyższego: `AUTORISE_PRIORYTETY_v1.md` i `AUTORISE_PRIORYTETY_v3_FINAL.md` (oba deklarowały się jako "jedyne źródło prawdy o priorytetach" tego samego dnia 2026-07-13 — to samo zjawisko narastających wersji, które ten punkt miał naprawić; treść albo już zrealizowana, albo w pełni pokryta przez `PLAN_CLAUDE_CODE.md`), `AUTORISE_DASHBOARD_STATE_v6.md` (snapshot z 2026-07-03, kolory/nawigacja/lista stron dawno nieaktualne wobec realnego kodu, rola w pełni przejęta przez ten plik).

## Historia zmian

| Data | Zmiana |
|------|--------|
| 2026-06-25 | Migracja z Cloudflare Workers/Pages na Vercel (prod: app.autorise.pl) |
| 2026-06-25 | GOOGLE_REDIRECT_URI → app.autorise.pl; cookie ma priorytet nad env |
| 2026-06-27 | Agent 1 uwagi_agenta + nastepny_krok — naturalny język, zakaz AI-slop |
| 2026-06-27 | Agent 1 — dyskwalifikacja (zła osoba/brak zainteresowania) → Niekwalifikowany; nazwa = osoba nie firma |
| 2026-06-27 | KartaKlienta NoteField — auto-resize textarea |
| 2026-06-27 | Responsywność mobilna — drawer sidebar + adaptacyjne układy |
| 2026-07-01 | Sprint v2: tab persist, Pan fix, notepad, logo text, calendar fix, overdue days, responsive grids, MP3→Drive, agenci tabs, JSON parsing, transkrypcja cleanup, OAuth errors |
| 2026-07-03 | MEGA PATCH scripts-v3 + Sesja 2 redesign etapowy: /kwalifikacja, /sprzedaz, /mapa, /brand-book jako nowe widoki; Roboto; nawigacja 4 grupy |
| 2026-07-03 | Skrypt Kwalifikacyjny V4: 12 kroków, ICP wbudowane w diagnozę, kalkulator inline krok 2.6, Calendly, Fathom usunięty z kwalifikacji, jawne branch notes 2.1-2.8, fix ok_em/ok7 |
| 2026-07-12 | prezentacja.html: drugi tor personalizacji przez `?id=` (bez AI) — nowy `GET /api/notion/prezentacja-dane`, fetch z loading state, wyróżnienie modułu wg `bol_kategoria`, oś czasu na slajdzie 5, realne dane inwestycji na slajdzie 6 z honest fallbackami. Stary tor URL-params nietknięty jako fallback |
| 2026-07-12 | 4 fixy: wyblakłe karty slajd 2 (stagger timing), font JetBrains→Roboto Mono (max waga 700), zwijany ClientSidebar w /kwalifikacja+/sprzedaz (współdzielony localStorage klucz), przycisk "Otwórz prezentację" w Pipeline+ClientSidebar dla dowolnego klienta |
| 2026-07-13 | Duży patch /kwalifikacja (22 punkty, pkt 20 odłożony za zgodą Michała): banner "Brak odbioru", obiekcja M365 klikalna (linkObjectionId), DecisionOption.sayAfter (fraza do powiedzenia oddzielona od action), kalkulator ROI wielogrupowy (CalculatorGroup[], role z osobnymi stawkami), captureField inline (osoby/stawka wpisywane w treści kroku), textSetter dla trybu Founder/Setter, karty modułów w języku klienta, licznik dials/rozmowy/sms z cofnięciem (delta w Notion). Szczegóły: context/AUTORISE_SESSION_LOG.md |
| 2026-07-13 | Scalenie Agent 1+2+3 → agentKwalifikacja (etapowo, z obowiązkową weryfikacją na 2 realnych transkryptach przed podłączeniem UI). 3 regresje znalezione i naprawione w Etapie 3 (icp boolean vs "TAK", meet_data/meet_godzina sklejone, aktywne_szukanie_ok błędny). Stare agent1/2/3 route'y + karty zostają jako nieusuwany fallback. Redesign wizualny Agent4Card (tokeny var(--accent)/var(--font-sans) zamiast starej hardcodowanej palety). PILNE do zrobienia po doładowaniu Anthropic API: retest Arka na finalnej wersji prompta — patrz context/AUTORISE_PRIORYTETY_v1.md. Szczegóły: context/AUTORISE_SESSION_LOG.md |
| 2026-07-18 | A1 rozdzielone na dwie zakładki (decyzja Michała): `/wdrozenie` (PROTOTYP, jednorazowy proces Tydzień 0 do Dzień 30, Panel Dostępy + oś czasu żywe) i `/utrzymanie` (PROTOTYP, stały retainer: Co obejmuje retainer/Metryki miesięczne/Drabinka eskalacji/Historia zgłoszeń). `ContactAttemptsBadge` wydzielony z /pipeline do współdzielonego komponentu. Nowe pola Notion Batch 4 (migracja NIE uruchomiona, do zrobienia w /kontrola). Diagnoza INP: patrz sekcja niżej |
| 2026-07-15/16 | Sesja autonomiczna nocna (Michał poza domem), 10 punktów z listy autonomicznej, każdy osobny commit + wpis SESSION_LOG: (1) usunięto VAT/netto z ceny wszędzie — Autorise ma zwolnienie podmiotowe; (2) nowa baza Notion Produkty (4 moduły standardowe) powiązana z kalkulatorem przez pole `code`; (3) metodologia braku dostępu do API spisana jako strona Notion; (4) `brief_discovery` rozszerzony o `system_transformacji`/`roznicowanie_zdanie`/`roi_dopowiedzenie` — naprawiony realny bug, sprzedawca czytał dosłowne nawiasy klientowi na żywo; (5) sekcja "Co obejmuje retainer" na slajdzie 6 prezentacji; (6) wyróżnik "ryzyko finansowe po naszej stronie" na slajd 4 i krok pitch; (7) naprawiony routing obiekcji "Niepewna, wymaga dopytania" (szedł do commitment zamiast parafrazy); (8) nowa obiekcja od18 "demo przed podpisem"; (9) licznik prób kontaktu dodany do Pipeline Kanban (nie istniał wcale), przypięty na górze karty; (10) ClientSidebar zwijanie ujednolicone z głównym menu. Nie ruszono Bloku 2.2/5/9/4.5 (wymóg prototypu/decyzji Michała) zgodnie z instrukcją. Szczegóły każdego punktu: context/AUTORISE_SESSION_LOG.md |

## LOGI SESJI (OBOWIĄZKOWE)

Na końcu każdej sesji: zaktualizuj `context/AUTORISE_SESSION_LOG.md` (1 wiersz tabeli) i tę sekcję "Nawigacja" / "File Locations" w CLAUDE.md, jeśli struktura stron się zmieniła. Ten plik ma być zawsze zgodny z rzeczywistym `sidebar.tsx` — jeśli się rozjeżdżają, każda następna sesja zaczyna z błędnym obrazem systemu. Aktualizuj też `context/PLAN_CLAUDE_CODE.md`, gdy priorytety się zmieniają, nie tylko session log. Przed każdym wywołaniem narzędzia: jedno krótkie zdanie po polsku co robisz i dlaczego (zasada z PLAN_CLAUDE_CODE.md, dopisana tu żeby nie zgubić się przy czytaniu samego CLAUDE.md).