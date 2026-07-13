# Autorise, priorytety i zasady pracy (v1, aktualizacja 2026-07-13)

Jedyne źródło prawdy o priorytetach. Podpięty w CLAUDE.md. Aktualizuj na końcu każdej sesji, nie twórz nowego pliku.

## Skorygowane ustalenia (błędne wcześniej, poprawione po sprawdzeniu kodu)

Cena i retainer JUŻ są zdefiniowane w lib/agents/prompts.ts, używane w Agent 1/2/5: 15 000 PLN netto wdrożenie + 4 000 PLN/mc retainer (min. 12 mc). Gwarancja: min. 80h/mc zaoszczędzonych, weryfikacja po 30 dniach, 100% zwrotu przy spełnieniu warunków (dostęp do systemów w 5 dni od startu, kickoff, responsywność WhatsApp 48h). To nie wymaga nowej decyzji biznesowej, wymaga tylko spójnego użycia tych już istniejących liczb wszędzie (prezentacja, Notion, umowa).

Proces sprzedażowy (kwalifikacja→sprzedaż) już jest zgodny z regułą Agency Leaders (2 kroki, poniżej 30k jednorazowo). "Discovery Call" w kodzie to nazwa drugiej rozmowy (/sprzedaz), nie trzecie spotkanie. Nic w skryptach nie wymaga scalania.

## PILNE — do zrobienia jako pierwsze po resecie limitu

1. Session log: dopisać wpis o rundzie roi-fix/GSAP/Iconify/copy kontaktowa/data prezentacji (wykonana 2026-07-13, deploy poszedł, log nigdy nie uzupełniony).
2. Slajd 4 prezentacji: tabela porównawcza nadal ucina tekst ("WebFleet + nieznany system wewnętrzny (p...") mimo wcześniejszej próby naprawy — poprzednia poprawka szerokości nie zadziałała w pełni, wymaga realnej weryfikacji zrzutem po zmianie.
3. Fallback ceny w prezentacji: gdy "Cena wdrożenia" puste w Notion, pokazuj 15 000 PLN (cena standardowa) zamiast "Cena ustalana indywidualnie" — ten tekst zostaje wyłącznie dla przypadków faktycznie wykraczających poza 4 standardowe moduły.
4. Jednorazowe wypełnienie pola "Cena wdrożenia" = 15 000 i "Retainer PLN/mc" = 4 000 dla istniejących kart Pipeline gdzie puste (żeby prezentacja i statystyki liczyły poprawnie od razu, nie tylko dla nowych leadów od teraz).

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
