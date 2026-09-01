# Produkt Autorise — źródło prawdy

Źródło: `public/prezentacja.html` (slajd 3) + `UMOWA_SYSTEM_AUTORISE.pdf` + Załącznik nr 1.
Ostatnia weryfikacja: 01.09.2026 — zmiana cennika wdrożenia (15 000 PLN jednorazowo lub
18 000 PLN w dwóch ratach; patrz sekcja Cennik), retainer i mechanizm gwarancji bez zmian.
Poprzednia weryfikacja: 29.08.2026 — umowa referencyjna zmieniona z `UMOWA_AUTORISE_FINAL.md`
(nieaktualna, zachowana w repo jako dokument historyczny) na `UMOWA_SYSTEM_AUTORISE.pdf`, wraz
ze zmianą cennika i mechanizmu weryfikacji efektywności (patrz sekcja Gwarancja).

**Ten plik jest źródłem prawdy o produkcie. Notion "Produkty" i stare pliki SOP (np.
`KARTA_PRODUKTU_SYSTEM_OPERACYJNY.md`, wczesna koncepcja z 01.07.2026 na stronie PR-0 w
Notion) mogą być nieaktualne — przy sprzeczności wygrywa ten plik.**

## Produkt

System Operacyjny Firmy Transportowej (PR-0). Jeden produkt, indywidualny zakres modułów
ustalany na Discovery Call, cena i struktura retainera te same niezależnie od wybranych
modułów.

## Cztery elementy wdrożenia

Trzy moduły wdrożeniowe (wybierane per klient, wliczane do kalkulatora ROI) + jeden element
informacyjny (część każdego wdrożenia, nigdy osobno wyceniany).

### 1. Automatyzacja TMS (kod: `email-parser`)
**Robi:** zlecenie przychodzi mailem jako PDF, system odczytuje trasę, ładunek, stawkę,
terminy i uwagi, wpisuje do TMS klienta.
**Nie robi:** nie negocjuje stawek, nie dzwoni do zleceniodawcy, nie tworzy zleceń bez
źródłowego maila.

### 2. Dokumenty i pliki (kod: `document-ocr`)
**Robi:** CMR, POD, faktury i pliki Excel — odczyt i przypisanie do właściwego zlecenia,
plik podpinany jako załącznik w TMS.
**Nie robi:** NIE generuje faktur, NIE wysyła do KSeF, NIE monitoruje terminów płatności ani
nie eskaluje przeterminowanych należności. Odczyt i przypisanie, nic więcej.

### 3. Powiadomienia automatyczne (kod: `whatsapp-alerts`)
**Robi:** statusy zlecenia do zleceniodawców/kierowców na każdym etapie, automatycznie.
**Nie robi:** nie dzwoni do kierowców, nie prowadzi rozmowy — wyłącznie powiadomienia
jednokierunkowe (WhatsApp/SMS jako fallback).

### 4. Dashboard zarządczy (informacyjny, nie osobny moduł)
Część każdego wdrożenia PR-0, nigdy osobno wybierany ani wyceniany, nie wchodzi do
kalkulatora ROI. Widoczność całej firmy w czasie rzeczywistym.

## Usunięty z produktu: "payment-monitor"

Moduł "Monitoring płatności / KSeF" istniał we wczesnej koncepcji produktu (01.07.2026,
inny stack: Supabase/Make.com/Twilio) i w kodzie kalkulatora do 08.08.2026. Nie ma
odpowiednika na slajdzie 3 prezentacji od dawna. Audyt Notion Pipeline (46 kart, pole
"Moduły wdrażane") z 08.08.2026 potwierdził zero kart z tym kodem — usunięty z
`lib/scripts/moduleCatalog.ts` bez ryzyka dla żywych danych. Faktury pozostają wyłącznie w
zakresie modułu "Dokumenty i pliki" (odczyt i przypisanie, nie rozliczanie).

## Cennik

**Aktualizacja 01.09.2026 — jawnie zastępuje wersję z 29.08.2026 (30 000 PLN jednorazowo, bez
rat / 1 000 PLN retainer).**

- **Wdrożenie:** 15 000 PLN brutto jednorazowo, albo 18 000 PLN brutto w dwóch ratach po
  9 000 PLN: pierwsza rata przed startem prac, druga po podpisaniu protokołu odbioru systemu.
  Zapisy UMOWA_SYSTEM_AUTORISE.pdf §2 (płatność w 2 dni robocze od faktury KSeF, brak startu
  prac przed zaksięgowaniem pełnej kwoty, warunek rozwiązujący po 7 dniach) opisują poprzedni
  model jednorazowy i wymagają aktualizacji pod wariant ratalny.
- **Retainer:** 1 000 PLN brutto miesięcznie, bez zmian, płatne z góry, minimum 12 miesięcy
  licząc od dnia odbioru systemu (nie od podpisania umowy).
- **Mechanizm gwarancji** (wzór procentowy `(ΣE − ΣF) / ΣE`) bez zmian — dotyczy godzin, nie
  kwoty, więc zmiana ceny go nie rusza (patrz sekcja Gwarancja).
- Autorise korzysta ze zwolnienia podmiotowego z VAT (art. 113 ust. 1 ustawy o VAT) — podane
  kwoty są kwotami do zapłaty, bez doliczanego VAT.
- Standardowy czas wdrożenia: 4 tygodnie od potwierdzenia otrzymania pełnych dostępów (możliwe
  wydłużenie o max. 2 tygodnie przy nietypowej konfiguracji systemów klienta, dłużej przy
  oczekiwaniu na API strony trzeciej — patrz §3 ust. 4-5).

## Gwarancja: wzór i pomiar

Prawo do odstąpienia i zwrotu (nie gwarancja rezultatu w sensie prawnym — umowa starannego
działania, UMOWA_SYSTEM_AUTORISE.pdf §5).

**Pomiar C — przed podpisaniem/na Kickoffie (Tydzień 1):** realny czas manualny na jedną
operację, per moduł, w godzinach. Mierzony obserwacją/zrzutami ekranu z timestampami, nie
deklaracją słowną klienta. Wolumen operacji świadomie NIE jest zbierany na tym etapie.

**30 dni od odbioru systemu — pierwsza weryfikacja:** dla każdego modułu objętego celem
efektywności zbierane są dwie nowe liczby: D = liczba operacji wykonanych przez System w
okresie, F = rzeczywisty czas jaki zajęła obsługa tych operacji człowiekowi przy Systemie (z
logów/obserwacji, nie zakładane jako zero).

**Wzór:**
```
E (teoretyczny czas manualny, per moduł) = C × D
Wynik = (ΣE − ΣF) / ΣE × 100  =  osiągnięty procent efektywności
```
Suma po wszystkich modułach objętych celem efektywności (`MODULE_DEFAULT_WLICZAJ_DO_CELU` w
`lib/scripts/moduleCatalog.ts` — domyślnie `whatsapp-alerts` jest wyłączony z celu, bo
zdarzenie eskalacyjne nie jest podstawową jednostką pracy jak zlecenie czy dokument).

Cel domyślny: **minimum 70%** obliczonej efektywności (edytowalny per klient na Kickoffie,
jedno źródło tej liczby, zapisany w Załączniku nr 1). Jeśli pierwsza weryfikacja wypadnie
negatywnie z przyczyn leżących po stronie Systemu (§5 ust. 6), Wykonawca ma 14 dni roboczych na
działania naprawcze, po czym weryfikacja powtarza się na kolejne 30 dni kalendarzowych (§5
ust. 7). Dopiero jeśli DRUGA weryfikacja też wypadnie negatywnie, Zamawiający ma prawo (nie
obowiązek Wykonawcy — trzeba je aktywnie wykonać) odstąpić od umowy w terminie miesiąca i
dostać zwrot dotychczas faktycznie zapłaconego wynagrodzenia (§5 ust. 8) — jeśli tego prawa nie
wykona w terminie, umowa trwa dalej i cel uważa się za osiągnięty. To NIE jest jednorazowy,
automatyczny zwrot 100% po pierwszym negatywnym wyniku.

## ICP

Kalkulator ROI musi pokazać minimum 80h/mc oszczędności łącznie z dostępnych modułów.
Orientacyjnie flota 10-150 pojazdów. Twardy disqualifier: poniżej 2 osób w biurze
administracji. Właściciel jako decydent obecny na rozmowie.

## Otwarte pytania (dodane 01.09.2026)

Nierozstrzygnięte, do rozwiązania dopiero w trakcie budowy skryptu sprzedażowego, ściśle
według materiałów od Agency Leaders (nie jako doraźna decyzja oderwana od frameworku):

1. Czy wracamy do jednego spotkania sprzedażowego, czy zostaje podział na spotkanie
   sprzedażowe plus Finalizację.
2. Czy pomiar realnego czasu u klienta odbywa się na żywo na ekranie, czy szacunkowo ze słów
   klienta.
3. Los pliku `lib/scripts/finalizacja.ts`, zbudowanego 29.08.2026, dziś nieużywanego.
