# AUTORISE — PLAN CLAUDE CODE (v1, 2026-07-17)

Plan wyłącznie dla Claude Code. Decyzje i dokumenty są w osobnym planie (PLAN_CLAUDE_AI.md), tam nie zaglądać.
Podział: CZĘŚĆ A to dashboard (UI, zakładki, design). CZĘŚĆ B to workflow (agenci, skrypty, Notion, integracje).

## Zasady obowiązujące w każdym zadaniu

Weryfikacja: czyste `tsc --noEmit` nie jest dowodem że funkcja działa. Zmiany dotyczące treści generowanej przez AI wymagają realnego testu na prawdziwym transkrypcie i pokazania surowego JSON-a. Zmiany w Notion: sprawdź czy pole/baza już istnieje zanim stworzysz nowe.

Narracja: przed każdym wywołaniem narzędzia jedno krótkie zdanie po polsku co robisz i dlaczego. Nie surowe wywołanie bez kontekstu.

Commity: osobny commit per punkt, nie jeden zbiorczy. Wpis do SESSION_LOG po każdym punkcie, nie na końcu sesji.

Prototypy: punkty oznaczone [PROTOTYP] wymagają pokazania Michałowi jednego elementu przed budową całości. Nie zaczynać bez akceptacji kierunku.

---

# CZĘŚĆ A — DASHBOARD

## A1. Nowa zakładka /wdrozenie (PRIORYTET 0, nie istnieje, blokuje pierwszą sprzedaż) [PROTOTYP]

Kontekst: "Kickoff" i "Wdrożenie" istnieją dziś wyłącznie jako statusy w Pipeline i kolory w UI. Zero procesu. Jeśli klient podpisze, masz 4 tygodnie i zero struktury. Umowa zobowiązuje do zwrotu 15 000 zł przy niedowiezieniu 80h oszczędności.

Zakładka ma prowadzić Michała krok po kroku od podpisu do weryfikacji, bez czytania żadnego dokumentu. Wszystko widoczne, klikalne, zapisywane do Notion.

### Struktura zakładki

Globalny selektor klienta u góry (ten sam mechanizm co Blok A4). Pod nim wizualna oś czasu: Tydzień 0 → 1 → 2-3 → 4 → Dzień 30. Aktualny etap podświetlony. Ta sama stylistyka co pasek postępu w prezentacji.

**Panel 1: Dostępy (Tydzień 0)**
Lista dostępów do zebrania, generowana z pól klienta w Notion (TMS z pola "TMS", poczta, system księgowy, kontakty operacyjne). Każdy z checkboxem. Pod listą przycisk "Potwierdź komplet dostępów", nieaktywny dopóki wszystkie checkboxy nie są zaznaczone.

Kliknięcie przycisku: zapisuje dzisiejszą datę do nowego pola Notion "Data potwierdzenia dostępów", pokazuje potwierdzenie "Zegar 30 dni uruchomiony, weryfikacja [data +30 dni]", i od tego momentu licznik dni jest widoczny na górze zakładki. To jest jedyny moment startu zegara zgodnie z umową (§2 ust. 2).

Obok listy: pole "Termin ustalony z klientem" (czytane z pola Notion "Warunki umowy — dni dostępów", ustalonego na rozmowie zamykającej) i licznik ile dni minęło od Kickoff. Jeśli przekroczony: wyraźne ostrzeżenie że termin ustalony w umowie minął, z przypomnieniem o §2 ust. 4 (opóźnienie powyżej 30 dni = prawo odstąpienia bez zwrotu).

**Panel 2: Pomiar bazowy (Tydzień 1, krytyczny dla gwarancji)**
Dwie kolumny obok siebie. Lewa: liczby z kalkulatora kwalifikacji (godziny/mc, osoby, stawka), tylko do odczytu, źródło: pola Notion. Prawa: pola do wpisania realnego pomiaru z Tygodnia 1 (co faktycznie zmierzono na miejscu). Pod spodem różnica procentowa między deklaracją a pomiarem.

Powód istnienia tego panelu: gwarancja 80h liczy się względem czasu bazowego (umowa §3 ust. 1). Jeśli czas bazowy jest tylko szacunkiem z telefonu (jak u Arka: 788h wyliczone z benchmarku 50 PLN/h), weryfikacja po 30 dniach jest sporna. Realny pomiar w Tygodniu 1 zamyka ten problem zanim powstanie.

Przycisk "Zatwierdź czas bazowy" zapisuje potwierdzoną liczbę do nowego pola Notion "Czas bazowy potwierdzony h/mc". Ta liczba, nie szacunek z kwalifikacji, jest podstawą weryfikacji.

**Panel 3: Checklist tygodniowa**
Cztery sekcje (Tydzień 1, 2, 3, 4), każda rozwijana, każda z zadaniami jako checkboxy. Zaznaczone zadania zapisują się do Notion (nowe pole tekstowe albo child page, wybierz prostsze rozwiązanie).

Zadania Tydzień 1 (Discovery techniczne):
- Zmapowane realne procesy (nie deklarowane na sprzedaży)
- Test dostępu do API głównego TMS: działa / nie działa
- Jeśli API nie działa: wybrana ścieżka z metodologii 4 sposobów (kontakt z dostawcą / RPA klikające / rozpoznawanie wizualne / panel przeglądarki)
- Zmierzony realny czas bazowy (Panel 2)
- Lista priorytetowych automatyzacji z szacowanym czasem każdej
- Zidentyfikowane wymagania dodatkowe (np. wyższa licencja API u dostawcy) i przekazane klientowi

Zadania Tydzień 2-3 (Integracja):
- Moduł 1 podłączony i testowany na realnych danych
- Moduł 2 podłączony i testowany
- Moduł 3 podłączony i testowany
- Pierwsze realne zlecenie przechodzi przez system testowo
- Mechanizm potwierdzenia jednym kliknięciem przez spedytora skonfigurowany (jeśli klient go chce, umowa §8 ust. 2)

Zadania Tydzień 4 (Live i szkolenie):
- Zespół przeszkolony (spedytorzy, księgowość)
- Stare metody wyłączone
- Logi zbierają dane do weryfikacji
- Klient potwierdził odbiór

**Panel 4: Weryfikacja (Dzień 30)**
Widoczny dopiero gdy minęło 30 dni od "Data potwierdzenia dostępów". Pokazuje: czas bazowy potwierdzony (Panel 2), zmierzone oszczędności z logów systemu, różnicę, i werdykt: cel osiągnięty / nieosiągnięty.

Pod spodem checklist warunków z umowy §3 ust. 4 (dostępy w terminie, responsywność 48h, udział w Kickoff, brak ingerencji w konfigurację, ciągłość systemów zewnętrznych). Każdy z checkboxem spełniony/niespełniony. Jeśli którykolwiek niespełniony: informacja że zobowiązanie zwrotu nie obowiązuje (§3 ust. 5).

### Nowe pola Notion wymagane przez tę zakładkę

Sprawdź najpierw czy nie istnieją. Jeśli nie: "Data potwierdzenia dostępów" (date), "Czas bazowy potwierdzony h/mc" (number), "Tydzień wdrożenia" (select: Kickoff/T1/T2-3/T4/Weryfikacja/Zakończone), "Dostępy zebrane" (rich_text albo multi-select), "Checklist wdrożenia" (rich_text, serializowany stan checkboxów).

### Kolejność budowy

Najpierw prototyp: sam Panel 1 (dostępy) plus oś czasu, dla jednego klienta, bez reszty paneli. Pokaż Michałowi. Po akceptacji: reszta paneli.

## A2. Redesign menu (nowa struktura, usunięcie zakładki Pliki)

Docelowa struktura, trzy grupy z nagłówkami:

**Organizacja**: Pipeline, Statystyki, Harmonogram, Kontrola, Brand Book
**Klienci**: Kwalifikacja, Sprzedaż, Wdrożenie (nowa, A1), Prezentacja, Transkrypcja
**Wiedza i proces**: Karta (Agency Leaders), Mapa procesów, Baza wiedzy (nowa, A3), Analiza narzędzi

Usunąć zakładkę Pliki. Agent 5 i 6 zostają wyłącznie wewnątrz /agenci (już zrobione), nie w menu.

Nazwy po polsku, sprawdzone, bez skrótów. Wizualnie: nagłówki grup subtelne, nie krzykliwe. Zachować mechanizm zwijania menu który już działa.

## A3. Nowa zakładka /baza-wiedzy (wizualizacja Notion poza Pipeline)

Powód: Notion trzyma dziś Produkty (PR-0 do PR-3), Moduły (komponenty PR-0), metodologię 4 sposobów na brak API. Nikt tego nie otworzy w trakcie pracy. Ma być widoczne w dashboardzie, czytelne, z możliwością rozwijania.

Zawartość: katalog produktów (czytany z bazy Notion "Produkty"), katalog modułów (z bazy "Moduły (komponenty PR-0)"), metodologia integracji (4 sposoby na brak API). Wszystko tylko do odczytu, edycja zostaje w Notion.

Cel: szybki podgląd podczas rozmowy albo wdrożenia, nie kolejne miejsce do zarządzania danymi.

## A4. Globalny selektor klienta (rozbudowa prototypu) [PROTOTYP CZEKA NA OCENĘ]

Prototyp wdrożony w /kwalifikacja, czeka na ocenę Michała na żywo. Po akceptacji: rozbudować na wszystkie zakładki pracujące z klientem (sprzedaz, wdrozenie, prezentacja, agenci). Pamiętanie wyboru między zakładkami.

## A5. Panel "Warunki umowy" w ClientSidebar (deterministyczny, zero AI)

Stałe zasady jako stały tekst w kodzie (30 dni od dostępów, retainer niezależny od gwarancji, cap odpowiedzialności, zwrot jako jedyny środek) plus dane konkretnego klienta z pól Notion (cena, retainer, dni na dostępy, zakres, poza zakresem). Składanie szablonu z danymi, nic nie generowane na nowo.

Ten sam wzorzec zastosować dla metodologii 4 sposobów na brak API (w kroku integracji) i sekcji "Poza zakresem" per klient.

## A6. Redesign statystyk

Rozbić "rozmowy" na typy: sprzedażowe i kwalifikacyjne osobno, nie jedna zbiorcza liczba. Pełny redesign wizualny, dzisiejszy wygląda generycznie. Te same tokeny co reszta systemu.

## A7. Harmonogram + Zadania scalone [PROTOTYP]

Jedna zakładka tygodniowa. Góra: dni robocze (poniedziałek-piątek). Dół: weekend (sobota, niedziela). Każdy dzień jako panel z zadaniami (etykiety i statusy jak dziś) plus wydarzenia z kalendarza w tym samym panelu. Przełączanie wyłącznie po tygodniach. Przeciąganie zadań między dniami i listami.

Połączone z niezrealizowanymi dalszymi krokami z /kwalifikacja i /sprzedaz: zadanie nieukończone tam pojawia się tutaj z odpowiednią etykietą, nie jako osobny byt.

Prototyp jednego dnia z 2-3 zadaniami i jednym wydarzeniem przed budową całości.

## A8. Drobne funkcje

- Przycisk "Kopiuj link do prezentacji" w Pipeline, obok "Otwórz prezentację"
- Wskaźnik trybu (Founder/Setter) w panelu bocznym
- Panel "ostatni deploy Vercel" (data, godzina, status słownie) nad panelem pogody

## A9. Prezentacja, redesign wizualny [PROTOTYP, najwięcej zastrzeżeń w historii]

Prototyp 1-2 slajdów przed przebudową całości. Premortem po każdym slajdzie.

Tekst za mały i za słabe wypełnienie na wszystkich slajdach, slajd 1 priorytet. Wskaźnik etapu za mały. Slajd 2 (wizualizacja przed/po) do przeprojektowania na poziom ekspercki, wszystkie liczby widoczne i udokumentowane źródłowo. Etykieta "Dane: [klient]" za mała. Ikony większe. Statystyka "62% firm" bez źródła: dedykowane miejsce ze źródłem albo usunąć. Pełny pass kolorów i układu, spojrzenie oczami właściciela transportowego.

---

# CZĘŚĆ B — WORKFLOW

## B1. Sentry (decyzja podjęta, priorytet)

Powód: każdy realny bug produkcyjny w ostatnich tygodniach (413 przy transkrypcji, puste pola agenta, zepsuta ikona, błąd jednostek roi) wykrył Michał ręcznie, po fakcie. Sentry pokazuje je natychmiast.

Zakres: instalacja w Next.js (dashboard), przechwytywanie błędów frontendu i API routes, powiadomienia. Darmowy plan wystarcza przy tej skali. Nie konfigurować session replay ani performance monitoring na start, tylko błędy.

## B2. Dokończenie pól agenta (system_transformacji, zdanie_roznicujace, roi_dopowiedzenie)

Status: naprawa wykonana, wymaga potwierdzenia surowym JSON-em z realnego uruchomienia na Arku. Jeśli pola wychodzą puste, prompt nadal ich nie prosi.

## B3. Placeholdery w kwalifikacyjna.ts

Sprawdzić czy skrypt kwalifikacji ma te same nieusuwane placeholdery co discovery.ts ("[nazwa]", "[X] pojazdów"). Jeśli tak: ta sama metoda naprawy co B2, rozszerzenie schematu agenta o gotowe zdania zamiast nawiasów.

## B4. Audyt statusów Pipeline (11 wartości)

Dla każdego statusu potwierdzić: kto go ustawia (agent automatycznie, człowiek ręcznie, UI), czy /mapa pokazuje go zgodnie, czy licznik liczy poprawnie. Wynik jako tabela w SESSION_LOG.

Znana luka: kwalifikacjaToStatus() nie ma gałęzi dla "Nieaktywny (follow up)" mimo że prompt agenta go instruuje. Zdecydować: dodać gałąź albo usunąć z promptu.

Dodatkowo: statusy Kickoff/Wdrożenie/Retainer muszą teraz współgrać z nową zakładką /wdrozenie (A1). Sprawdzić czy przejście między nimi jest ręczne czy automatyczne i czy ma sens.

## B5. Audyt hooks i konfiguracji Claude Code

Sprawdzić co jest w `.claude/` (MCP nie widzi ukrytych folderów, sprawdzić lokalnie): hooks, agents, commands, skills. Zweryfikować co faktycznie działa i jest używane, co jest martwym ustawieniem. Usunąć nieużywane, dopasować resztę do realnej pracy nad Autorise.

Osobno: Michał zgłasza że mechanizm memory "wogóle nie funkcjonuje". Sprawdzić czy jest skonfigurowany i czy działa. Jeśli nie działa: naprawić albo usunąć, nie zostawiać połowicznego.

## B6. Zmiana nazwy discovery.ts na sprzedaz.ts

Legacy nazwa regularnie wywołuje zamieszanie ("czy mamy trzy etapy?"). Proces jest dwuetapowy. Zmiana nazwy pliku plus wszystkie importy plus wzmianki w CLAUDE.md.

## B7. Aktualizacja CLAUDE.md

Po zakończeniu powyższych: pełna aktualizacja opisu stanu systemu, w tym nowa zakładka /wdrozenie, nowe pola Notion, Sentry, zmiana nazwy skryptu. Dopisać zasadę narracji po polsku przy każdym wywołaniu narzędzia.

## B8. Finalny audyt spójności end-to-end

Ostatni krok, po wszystkim powyżej. Sprawdzić połączenia, nie elementy osobno:

- Skrypt kwalifikacji ↔ skrypt sprzedaży: brak powtórnych pytań bez powodu
- Skrypt sprzedaży ↔ prezentacja: każdy parametr wypełniony realnymi danymi, zero placeholderów
- Skrypt sprzedaży ↔ umowa: każdy mechanizm z kroku warunków ma odpowiadający zapis w UMOWA_AUTORISE_FINAL.md
- Umowa ↔ obiekcje w skrypcie: spójność liczb i mechanizmów
- Wszystko ↔ /mapa: aktualny proces (2 etapy sprzedaży + wdrożenie), nie starsza wersja
- Wszystko ↔ Notion: zero pól które istnieją ale nic ich nie czyta, zero pól czytanych ale nieistniejących
- Nowa zakładka /wdrozenie ↔ umowa: mechanizm startu zegara, warunki gwarancji, checklist weryfikacji zgodne z §2, §3
- Kontrola punktowa ze zrzutem: czy zniknęło "MÓWIĆ", czy zniknął mały napis "Dalej", czy numeracja kroków jest uproszczona

Zbudować przez skill-creator trwały skill "audyt struktury workspace Autorise": duplikaty nazw (jak dwie bazy Produkty), pliki nieaktualizowane mimo zmian w kodzie, rozjazdy CLAUDE.md kontra rzeczywistość. Uruchamiany na żądanie.

## B9. Przypomnienia Calendly (zadanie ręczne dla Michała, nie dla Sonneta)

Trzy przypomnienia (dzień wcześniej, kilka godzin wcześniej) włączane natywnie w ustawieniach Calendly (Workflows) dla typu spotkania Discovery. Zero kodu. Zostawić jako przypomnienie w SESSION_LOG że to czeka na Michała, nie na Sonneta.

## B10. Audyt plików kontekstowych i struktura CLAUDE.md

Przegląd WSZYSTKICH plików w context/ (workspace): usunięcie zdublowanych/przestarzałych wersji (np. AUTORISE_PRIORYTETY_v1.md i AUTORISE_PRIORYTETY_v3_FINAL.md współistnieją, sprawdzić czy oba potrzebne). Jedna spójna struktura zamiast narastających v1/v2/v3.

Jasna hierarchia: który plik czyta Claude Code (workspace CLAUDE.md), co się synchronizuje ręcznie z PLAN_CLAUDE_AI.md w Claude.ai a co automatycznie. Dopisać tę hierarchię wprost w CLAUDE.md, żeby przyszła sesja wiedziała gdzie szukać czego, zamiast zgadywać.

## B11. Synchronizacja kontekstu przez Google Drive (wymaga zaprojektowania)

Michał chce edytować pliki kontekstowe przez Google Drive (Opus ma tam bezpośredni dostęp przez connector), a Claude Code czyta dziś wyłącznie lokalny dysk workspace. Potrzebny mechanizm ściągania z Drive do workspace (albo odwrotnie) — to nie jest "włącz i działa", wymaga zaprojektowania: czy to skrypt uruchamiany ręcznie na start sesji, czy webhook, czy coś innego. Zaproponować konkretne rozwiązanie techniczne, nie zakładać że wystarczy dodać connector.

## B12. Test narzędzi już ocenionych i aktualność dokumentacji stacku

Poza samymi skillami (Zadanie 5 w PLAN_CLAUDE_AI.md): sprawdzić realnie, nie tylko teoretycznie, czy GSAP i Iconify są używane optymalnie, czy jest coś jeszcze z wcześniejszych list oceny narzędzi co faktycznie warto wdrożyć. Przy każdej zmianie dotykającej stacku (nowa biblioteka, zmiana frameworka, nowe API) — obowiązkowo zaktualizować opis stacku w CLAUDE.md, żeby zawsze odzwierciedlał realny wybór, nie starą listę sprzed tygodni.

## Kolejność realizacji

1. A1 prototyp (Panel 1 dostępów + oś czasu) — priorytet 0, blokuje pierwszą sprzedaż
2. B1 Sentry — szybkie, natychmiastowa wartość
3. B2, B3, B4 — dokończenie długu z poprzednich sesji
4. B10 audyt plików kontekstowych — wcześnie, żeby reszta pracy opierała się na czystej strukturze
5. A2 menu, A3 baza wiedzy, A6 statystyki, A8 drobne — po akceptacji A1
6. A4, A5 — po ocenie prototypu selektora
7. A7, A9 — prototypy, sesja z Michałem
8. B5, B6, B7 — infrastruktura
9. B11 synchronizacja Drive, B12 test narzędzi — gdy reszta stabilna, nie pilne
10. B8 — finalny audyt, ostatni

Poza tym planem, ale wymaga działania Michała, nie Sonneta: B9 (Calendly).

## Świadomie poza tym planem

Supabase Auth i zarządzanie sprzedawcami (Blok 4.5): czeka, aż powyższe się ustabilizuje. Skille: Michał ma nową listę, robimy osobno na Sonnecie, nie teraz.

Backlog po pierwszej sprzedaży, konkretna lista: zakładka produktywności osobistej (Eisenhower, Pomodoro, frameworki), leaderboard AI przy panelu pogody, panel pogody rozszerzony (ciśnienie/samopoczucie, kalendarz sezonowości branżowej, pora dnia do dzwonienia), zakładka "Ustawienia strefy roboczej" pod Profilem (CLAUDE.md w czasie rzeczywistym), testowe konto Playwright do automatycznej weryfikacji wizualnej, mobile responsywność całości, realna ekstrakcja ClientSidebar do wspólnego komponentu (dziś dwie zduplikowane definicje w /kwalifikacja i /sprzedaz).
