# KARTA PRODUKTU: System Operacyjny Firmy Transportowej (PR-0)

Struktura wzorem sprawdzonej metody Agency Leaders (15 punktów), treść w pełni zgodna z aktualnym produktem: 4 standardowe moduły, cena 18000/15000, retainer 4000/mc, gwarancja 80h/30 dni.

## 1. Snapshot

Dedykowany automat dla transportu i spedycji. Eliminuje ręczne przepisywanie zleceń, dokumentów (CMR/POD/faktury), monitoring płatności i komunikację ze spedytorami/klientami. Wdrożenie 4 tygodnie od zebrania dostępów.

## 2. Wyróżnik vs konkurencja

Vs generyczny SaaS: nie wymaga że TMS klienta ma gotową integrację, budujemy pod konkretny system, nie ogólne narzędzie. Vs software house: 4 tygodnie nie miesiące, gwarancja 100% zwrotu nie tylko obietnica. Vs "zatrudnię kolejną osobę": koszt nie rośnie liniowo z flotą, jednorazowa inwestycja zamiast stałej pensji. Główny wyróżnik: ryzyko finansowe po naszej stronie, Michał prowadzi każde wdrożenie osobiście od telefonu do Live.

## 3. ICP

Flota 10-150 pojazdów. Minimum 2 osoby w biurze zajmujące się zleceniami/dokumentami. Aktywny TMS, dowolny (w tym bez API — patrz punkt 8). Decydent dostępny do rozmowy.

## 4. Warunki wstępne (weryfikować PRZED podpisaniem)

Klient ma jakikolwiek TMS. Da się ustalić dostęp do poczty/dokumentów. Decydent uczestniczy w rozmowie zamykającej, nie tylko w kwalifikacji.

## 5. Sygnały na kwalifikacji/discovery

"Zatrudniamy dodatkową osobę do klepania." "Program X nie działa dokładnie, musimy ręcznie poprawiać." "Dokumenty lecą przez WhatsApp, ktoś je ręcznie przerzuca do systemu." "Sprawdzam płatności raz w miesiącu, to zajmuje mnóstwo czasu."

## 6. Pytanie kwalifikujące

"Ile osób w biurze realnie dotyka ręcznie zleceń i dokumentów każdego dnia, i ile czasu to zajmuje?"

## 7. Liczby do wyceny

Wzór: liczba osób × godziny dziennie × 21 dni roboczych × stawka godzinowa (domyślnie 50 PLN/h, edytowalna). Cena wdrożenia: 18000 PLN regularnie, 15000 PLN przy płatności w 14 dni i dostępach w ustalonym terminie. Retainer: 4000 PLN/mc, minimum 12 miesięcy.

## 8. Wymagania techniczne

Dowolny TMS. Gdy brak API (jak HMSoft u Arka Burkowskiego, właściciel odmawia dostępu): cztery ścieżki w kolejności próby — (1) bezpośredni kontakt z dostawcą systemu o udzielenie dostępu, (2) automatyzacja RPA klikająca interfejs jak człowiek, (3) rozpoznawanie elementów wizualnie na ekranie, (4) dostęp przez panel w przeglądarce jeśli istnieje. Decyzję którą ścieżkę wybrać podejmuje się na Tygodniu 1 (Discovery techniczne), nie wcześniej — wymaga realnego testu dostępu.

## 9. Dostępy na kickoff

TMS (login albo klucz API, zależnie od punktu 8). Poczta firmowa, jeśli moduł email-parser w zakresie. Dostęp do systemu księgowego/KSeF, jeśli payment-monitor w zakresie. Numer WhatsApp Business, jeśli whatsapp-alerts w zakresie. Kontakt do osoby technicznej u dostawcy TMS, jeśli brak API.

## 10. Pytania mapowania procesów (Tydzień 1, pogłębione względem kwalifikacji)

Z kim się kontaktować przy problemach technicznych po stronie klienta. Jakie są wyjątki w standardowym procesie (nietypowe zlecenia, nietypowi kontrahenci). Ile realnie wariantów dokumentów istnieje (nie tylko standardowy CMR).

## 11. Harmonogram delivery

**Tydzień 1 — Discovery techniczne**: zmapowane realne procesy (nie deklarowane na sprzedaży). Test dostępu do API głównego TMS — działa/nie działa. Jeśli nie działa: wybrana ścieżka z punktu 8. Zmierzony REALNY czas bazowy (nie szacunek z telefonu) — metodologia: obserwacja/pomiar rzeczywistego czasu pracy zespołu na miejscu lub przez zrzuty ekranu z timestampami, nie deklaracja słowna. Lista priorytetowych automatyzacji z szacowanym czasem każdej. Zidentyfikowane wymagania dodatkowe (np. wyższa licencja API) przekazane klientowi od razu, zgodnie z umową §5 ust. 5.

**Tydzień 2-3 — Integracja**: moduł po module podłączony i testowany na realnych danych klienta. Pierwsze realne zlecenie przechodzi przez system testowo. Mechanizm potwierdzenia jednym kliknięciem przez spedytora skonfigurowany, jeśli klient go chce (umowa §8 ust. 2).

**Tydzień 4 — Live i szkolenie**: zespół przeszkolony (spedytorzy, księgowość). Stare metody ręczne wyłączone. Logi systemu zbierają dane do weryfikacji.

**Dzień 30 — Weryfikacja**: porównanie logów systemu z czasem bazowym z Tygodnia 1. Sprawdzenie warunków umowy §3 ust. 4 (dostępy w terminie, responsywność 48h, udział w Kickoff, brak ingerencji w konfigurację, ciągłość systemów zewnętrznych).

## 12. Kryterium odbioru

Wszystkie ustalone moduły działają na realnych zleceniach klienta. Zespół przeszkolony i faktycznie korzysta z systemu (nie wraca do starych metod). Zero krytycznych błędów w logach z ostatniego tygodnia przed weryfikacją.

## 13. Metryki sukcesu retainera (mierzone co miesiąc)

Godziny zaoszczędzone (z logów systemu, nie deklaracja). Liczba automatycznie przetworzonych dokumentów/zleceń. Liczba wyjątków wymagających ręcznej interwencji (trend malejący = system się uczy/stabilizuje). Czas reakcji na zgłoszenia klienta (cel: 24h, zgodnie z umową §5 ust. 2b).

## 14. Najczęstsze problemy i reakcja

TMS bez API → metodologia z punktu 8, decyzja na Tygodniu 1, nie przed. Klient nie dostarcza dostępów w terminie → zegar weryfikacji przesuwa się proporcjonalnie (umowa §2 ust. 4), po 30 dniach opóźnienia prawo do odstąpienia bez zwrotu. Klient kwestionuje wynik weryfikacji → logi systemu jako obiektywne źródło prawdy (umowa §8 ust. 3), nie negocjacja słowna. Druga osoba decyzyjna ujawnia się późno (przypadek "jednej wariatki" u Arka Burkowskiego) → dopytać wprost na Discovery kto to jest, nie ignorować drugi raz.

**Klient przestaje odpowiadać w trakcie wdrożenia** (zdecydowane 2026-07-17, spójne z resztą umowy, nie nowe, oderwane liczby): dzień 0 (przekroczone 48h z umowy §3 ust. 4b) — swobodne przypomnienie tym samym kanałem. Dzień 3-4 (drugie przekroczenie) — próba telefonu + wiadomość wprost mówiąca że brak odpowiedzi zagraża harmonogramowi. Dzień 7 — formalne, pisemne zawiadomienie e-mailem, odwołujące się do §3 ust. 4b. Dzień 14 — formalne wstrzymanie prac, status w Notion "Wstrzymane — brak kontaktu", używany ten sam licznik prób kontaktu co dziś w Pipeline na etapie sprzedaży, nie nowy mechanizm. Dzień 30 łącznej ciszy — to samo uprawnienie co przy spóźnionych dostępach (§2 ust. 4): prawo do zakończenia współpracy bez zwrotu.

## 15. Upsell

Po 3-6 miesiącach retainera, gdy klient widzi realną wartość: PR-1 Analizator Rentowności, PR-2 Tarcza ITD, PR-3 Centrum Dowodzenia — wszystkie już opisane w bazie Produkty w Notion z cenami.

---

## Premortem i weryfikacja przeciw Agency Leaders

Sprawdziłem to pod kątem czterech scenariuszy z wcześniejszego premortemu umowy (czarna skrzynka, paraliż dostępowy, zgubione oczekiwania, brak retainera) — wszystkie cztery mają teraz odpowiadający mechanizm w tej karcie, nie tylko w umowie: pomiar bazowy realny nie szacowany (punkt 11), zegar i eskalacja przy opóźnieniu (punkt 14), lista "poza zakresem" i wymagań dodatkowych ujawniana na Tygodniu 1 (punkty 8, 11), metryki retainera niezależne od wyniku gwarancji (punkt 13).

**Jedyna wcześniejsza luka (brak procesu przy braku kontaktu w trakcie wdrożenia) zamknięta 2026-07-17** — patrz punkt 14, drabinka eskalacji 0/3-4/7/14/30 dni, spójna z już istniejącymi mechanizmami (48h z umowy, licznik prób kontaktu z Pipeline, 30-dniowy limit z §2 ust. 4). Karta jest teraz kompletna, żaden punkt nie wymaga już decyzji.
