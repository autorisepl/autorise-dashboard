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

## PILNE — otwarte, do sprawdzenia po doładowaniu konta Anthropic API

Scalony "Agent Kwalifikacja" (`app/api/agents/kwalifikacja/route.ts`, `lib/agents/prompts.ts` — `KWALIFIKACJA_MERGED_SYSTEM_PROMPT`) zastąpił Agent 1+2+3 w UI (`/agenci`) po weryfikacji na 2 realnych transkryptach (Arek Bukowski, Agnieszka) — 3 regresje znalezione i naprawione (icp boolean zamiast "TAK"/"NIE"/"BRAK DANYCH", meet_data+meet_godzina sklejone w jedno pole, icp.aktywne_szukanie_ok błędnie TAK gdy klient nie pamiętał formularza).

**Nie w pełni domknięte**: ostatnia poprawka (aktywne_szukanie_ok) była przetestowana tylko na transkrypcie Agnieszki, nie na Arku — retest Arka na finalnej wersji prompta przerwał brak środków na koncie Anthropic API (`credit balance is too low`). Michał dopłaca konto po tym deployu. Do zrobienia w najbliższej sesji: odtworzyć krótki test-harness (patrz historia sesji z 2026-07-13, "Duża przebudowa architektury agentów" — logika w `.tmp-etap3-compare.mjs`, plik był tymczasowy i usunięty), uruchomić scalony agent na transkrypcie Arka jeszcze raz, potwierdzić że wynik `icp`/`meet_data`/`meet_godzina` pozostaje identyczny z wcześniej zweryfikowaną wersją. Stare `agent1`/`agent2`/`agent3` route'y zostają w kodzie jako fallback — nie kasować przed potwierdzeniem kilku kolejnych realnych rozmów przez Michała.

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
