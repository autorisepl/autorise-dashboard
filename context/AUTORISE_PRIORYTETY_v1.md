# Autorise, priorytety i zasady pracy (v1, aktualizacja 2026-07-13)

Jedyne źródło prawdy o priorytetach. Podpięty w CLAUDE.md. Aktualizuj na końcu każdej sesji, nie twórz nowego pliku.

## Skorygowane ustalenia (błędne wcześniej, poprawione po sprawdzeniu kodu)

Cena i retainer JUŻ są zdefiniowane w lib/agents/prompts.ts, używane w Agent 1/2/5: 15 000 PLN netto wdrożenie + 4 000 PLN/mc retainer (min. 12 mc). Gwarancja: min. 80h/mc zaoszczędzonych, weryfikacja po 30 dniach, 100% zwrotu przy spełnieniu warunków (dostęp do systemów w 5 dni od startu, kickoff, responsywność WhatsApp 48h). To nie wymaga nowej decyzji biznesowej, wymaga tylko spójnego użycia tych już istniejących liczb wszędzie (prezentacja, Notion, umowa).

Proces sprzedażowy (kwalifikacja→sprzedaż) już jest zgodny z regułą Agency Leaders (2 kroki, poniżej 30k jednorazowo). "Discovery Call" w kodzie to nazwa drugiej rozmowy (/sprzedaz), nie trzecie spotkanie. Nic w skryptach nie wymaga scalania.

## PILNE — zamknięte 2026-07-13

1. ✓ Session log uzupełniony o rundę roi-fix/GSAP/Iconify/copy kontaktowa/data prezentacji.
2. ✓ Slajd 4: tabela porównawcza — usunięto `white-space:nowrap`+ellipsis na `td`, tekst teraz zawija się (zweryfikowane zrzutem na przykładzie "WebFleet + nieznany system wewnętrzny..." na 1280px i mobile 375px, zero przycięcia).
3. ✓ Fallback ceny w `/api/notion/prezentacja-dane`: puste "Cena wdrożenia"/"Retainer PLN/mc" zwracają teraz 15000/4000 zamiast null, `procent_kosztu`/`payback_miesiace` liczone z tego samego defaultu. Wartość ręcznie wpisana w Notion ma zawsze pierwszeństwo.
4. ✓ Jednorazowa migracja (endpoint `/api/tools/fill-default-pricing`, GET podgląd + POST zapis, wzorem `migrate-schema`): 34 karty Pipeline miały puste oba pola, zero miało już wpisaną wartość — zapisano 15000/4000 po potwierdzeniu listy.

## PILNE — zamknięte 2026-07-14 (BLOK 0, AUTORISE_MASTER_PLAN.md)

1. ✓ Retest Arka Bukowskiego na finalnej wersji `KWALIFIKACJA_MERGED_SYSTEM_PROMPT` (konto Anthropic dołądowane). Uruchomiony bezpośrednio przez `node --experimental-strip-types` (transkrypcja na nowo przez Groq Whisper + wywołanie merged agenta z identyczną logiką deterministyczną co `route.ts`). Wszystkie 3 wcześniej znalezione regresje potwierdzone naprawione: `icp.*_ok` string nie boolean, `meet_data`/`meet_godzina` rozdzielone, `aktywne_szukanie_ok` poprawnie oceniane (zweryfikowane ręcznie przeciw transkryptowi). Scalony "Agent Kwalifikacja" (`app/api/agents/kwalifikacja/route.ts`) jest teraz w pełni zweryfikowany na obu testowych transkryptach (Arek, Agnieszka). Szczegóły: `context/AUTORISE_SESSION_LOG.md`, wpis 2026-07-14.
2. ✓ Tryb weryfikacja/uzupełnienie + auto-wczytywanie historii Notion przeniesione ze starego, nieużywanego w UI Agenta 1 do `agentKwalifikacja` (`KWALIFIKACJA_MERGED_VERIFICATION_SUFFIX`/`KWALIFIKACJA_MERGED_UZUPELNIENIE_SUFFIX` w `prompts.ts`, `MODE_CAPABLE_AGENTS`/`HISTORY_TYPE_BY_AGENT` w `app/(dashboard)/agenci/page.tsx`). 34+ kart Pipeline można teraz bezpiecznie uzupełniać bez nadpisywania danych albo powrotu do starego Agent1Card. Szczegóły: `CLAUDE.md` (sekcja Agents) i `AUTORISE_SESSION_LOG.md`.

Stare `agent1`/`agent2`/`agent3` route'y i karty zostają w kodzie jako świadomy, nieusuwany fallback.

## PILNE — zamknięte 2026-07-14 (dokończenie wątku Agenta Kwalifikacja + BLOK 1 z AUTORISE_MASTER_PLAN.md)

1. ✓ Tryb "Aktualizacja klienta" w `/agenci` wykrywany automatycznie przy wyborze klienta (zamiast ręcznego przełącznika) — baner + dyskretny "Zacznij od zera mimo to" jako jedyny ręczny wyjątek. Tryb weryfikacji zostaje ręczny (nie da się wykryć automatycznie). Szczegóły: `AUTORISE_SESSION_LOG.md`.
2. ✓ 1.1 Pole "Typ follow-up": 0 kart faktycznie dotkniętych mojibake/duplikatem (martwe opcje w dropdownie). Próba zmiany nazwy opcji spowodowała incydent (Notion API zastępuje CAŁĄ listę opcji select, nie patchuje) — wykryty i naprawiony w tej samej sesji, zero utraconych danych na kartach, potwierdzone dwukrotnie. Rename opcji przez API okazał się w ogóle nie działać (osobne ograniczenie) — **do Ciebie: przemianuj/skasuj ręcznie w Notion UI dwie zepsute opcje "Typ follow-up"**, 10 sekund, brak pilności bo 0 kart tego wymaga.
3. ✓ 1.2 Dodana automatyczna gałąź "Nieaktywny (follow up)" w `upsertClientInPipeline`. Przy audycie znalezione i naprawione 2 dodatkowe bugi: `/pipeline` Kanban nie miał ROW3 (3 statusy całkowicie niewidoczne), `STATUS_ORDER` dedup nie znał tych samych 3 statusów. Pełna tabela audytu 11 statusów w `AUTORISE_SESSION_LOG.md`.
4. ✓ 1.3 Nowy współdzielony `components/clients/ClientContactDetails.tsx` — Firma/Telefon/Email/NIP identyczne wszędzie (ClientSidebar ×2, Pipeline Kanban, selektor w `/agenci`). NIP i dane kontaktowe w `/agenci` nie istniały wcześniej w ogóle.
5. ✓ 1.4 Sortowanie Pipeline A-Z po firmie domyślnie, przełącznik kierunku, zapamiętane w localStorage.
6. ✓ 1.5 "Stary/aktualny skrypt" wyprowadzone z "Data pierwszego kontaktu" (bez nowego pola Notion). "Utracony"+"Powód utraty" jako nowe pola Notion (checkbox+rich_text, dodane bezpiecznie w izolacji od ryzykownych pól select) — filtr w Pipeline, domyślnie ukryte, jeden klik przywraca.

**Nie w pełni domknięte**: dwie zepsute opcje "Typ follow-up" wymagają ręcznej zmiany nazwy/usunięcia bezpośrednio w Notion UI (patrz punkt 2 wyżej) — API tego nie potrafi. Żaden live test UI w przeglądarce nie wykonany w tej sesji dla całego Bloku 1.

## Priorytet: umowa i warunki gwarancji

Napisać pełne warunki umowy Autorise wzorem załączonego wzorca Agency Leaders (Umowa_systemu_AI_konkurencji.pdf): okres rozliczeniowy liczony od zakończenia warsztatów wdrożeniowych/zebrania dostępów (nie od podpisania), obowiązki klienta jako warunek gwarancji (dostęp w 5 dni, odpowiedź WhatsApp 48h — już zdefiniowane w prompts.ts, przenieść do formalnego dokumentu), siła wyższa, poufność 2 lata, płatność z góry w terminie 3 dni od faktury. Zastrzeżenie: brak dostępu do wyspecjalizowanego skilla prawnego, to szkic do realnej konsultacji prawnej przed użyciem, nie gotowy dokument.

Po ustaleniu: dodać krok "zebranie dostępów" do mapy procesów (/mapa) między Kickoff a Wdrożenie, z jasnym warunkiem że 30-dniowy zegar gwarancji startuje stąd, nie od podpisania.

## Priorytet: aktualizacja plików kontekstowych

CLAUDE.md i AUTORISE_DASHBOARD_STATE_v6.md wymagają przeglądu i aktualizacji po całej tej sesji (redesign prezentacji x5 rund, architektura fetch-po-ID, konsolidacja /mapa, nowe endpointy, GSAP/Iconify, korekta cena/retainer) — dużo zmieniło się i nie wszystko jest odzwierciedlone w dokumentacji na poziomie eksperckim.

## Priorytet: drobne, bezpieczne funkcje (kolejność wg wartości)

1. Przycisk "Kopiuj link do prezentacji" w Pipeline, obok istniejącego "Otwórz prezentację".
2. Wskaźnik trybu (Founder / Setter) widoczny w panelu bocznym.
3. Panel "ostatni deploy Vercel" (data, godzina, status) nad panelem pogody w sidebar — wymaga integracji z Vercel API/MCP.

## Priorytet: panel pogody, rozszerzenia (przemyślane, nie budowane od razu)

Poziom pyłków/ciśnienia i wpływ na samopoczucie, kalendarz świąt i sezonowości branżowej (koniec roku podatkowego, urlopy), pora dnia z oceną czy to dobry moment na telefon, jakość powietrza per województwo (nie per miejscowość — zbyt duża granulacja, nieefektywna). Wymaga osobnego zaplanowania designu, nie doklejania do istniejącej kropki.

## Priorytet: nowa zakładka "Ustawienia strefy roboczej"

Pod Profilem, wizualizacja CLAUDE.md w czasie rzeczywistym (żeby Michał widział dokładnie co Claude Code wie), plus panel pogody/deploy z powyższych punktów, plus checklist zaplanowanego redesignu/aktualizacji menu.

## Priorytet: redesign menu i wydajność

Nowa struktura nawigacji (grupy: Organizacyjne / Rozmowy z klientami / Proces od A do Z), usunięcie zakładki "Pliki". Wydajność menu i całego dashboardu — po ustabilizowaniu treści, przed finalnym redesignem wizualnym całej aplikacji (mobile responsywność też wtedy).

## Narzędzia ocenione i odłożone (nie teraz, ewentualnie osobny czat po zakończeniu budowy)

GSAP i Iconify — wdrożone, aktywnie używane w prezentacji. Reszta z ostatniej listy (bklit-ui, kokonutui, animmasterlib, vengenceui, skiper-ui, shadcn/ui) — nieocenione szczegółowo na wyraźną prośbę Michała, żeby nie rozpraszać się teraz. Wcześniej odłożone: motion.dev/react-spring/magicui/ui.lumen (pytanie architektoniczne React vs vanilla HTML dla prezentacji), shadergradient (odrzucone, zbyt ciężkie), haikei.app (niski priorytet estetyczny).

## Zasada oceny narzędzi (bez zmian)

Narzędzie zostaje tylko jeśli: pasuje do realnego stacku, wiadomo dokładnie kiedy się odpala, zastępuje pracę robioną w kółko, oszczędza więcej niż kosztuje kontekstu.

## Rytm aktualizacji

Koniec każdej sesji: dopisz wiersz do AUTORISE_SESSION_LOG.md, bez wyjątków, nawet przy presji czasu/limitu. Zmiana priorytetów: aktualizuj ten plik, nie twórz nowego.
