# Produkt Autorise — źródło prawdy

Źródło: `public/prezentacja.html` (slajd 3) + `UMOWA_AUTORISE_FINAL.md` + Załącznik nr 1.
Ostatnia weryfikacja: 08.08.2026.

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

- **Wdrożenie:** 18 000 PLN netto, jednorazowo (cena regularna). Rabat za terminowość 3 000
  PLN (15 000 PLN) pod warunkiem zapłaty faktury w 14 dni ORAZ dostarczenia kompletu
  dostępów w ustalonym terminie — niespełnienie któregokolwiek warunku cofa rabat.
- **Retainer:** 4 000 PLN netto miesięcznie, minimum 12 miesięcy od zakończenia wdrożenia.
- Autorise korzysta ze zwolnienia podmiotowego z VAT (art. 113 ust. 1 ustawy o VAT) — podane
  kwoty są kwotami do zapłaty, bez doliczanego VAT.
- Standardowy czas wdrożenia: 4 tygodnie od otrzymania pełnych dostępów (możliwe wydłużenie
  o max. 2 tygodnie przy nietypowej konfiguracji systemów klienta lub oczekiwaniu na API
  strony trzeciej).

## Gwarancja: wzór i pomiar

Zobowiązanie zwrotu (nie gwarancja rezultatu w sensie prawnym — umowa starannego działania).

**Pomiar C — przed podpisaniem/na Kickoffie (Tydzień 1):** realny czas manualny na jedną
operację, per moduł, w godzinach. Mierzony obserwacją/zrzutami ekranu z timestampami, nie
deklaracją słowną klienta. Wolumen operacji świadomie NIE jest zbierany na tym etapie.

**Dzień 30 — Weryfikacja:** dla każdego modułu objętego celem efektywności zbierane są dwie
nowe liczby: D = liczba operacji wykonanych przez System w okresie, F = rzeczywisty czas
jaki zajęła obsługa tych operacji człowiekowi przy Systemie (z logów/obserwacji, nie
zakładane jako zero).

**Wzór:**
```
E (teoretyczny czas manualny, per moduł) = C × D
Wynik = (ΣE − ΣF) / ΣE × 100  =  osiągnięty procent efektywności
```
Suma po wszystkich modułach objętych celem efektywności (`MODULE_DEFAULT_WLICZAJ_DO_CELU` w
`lib/scripts/moduleCatalog.ts` — domyślnie `whatsapp-alerts` jest wyłączony z celu, bo
zdarzenie eskalacyjne nie jest podstawową jednostką pracy jak zlecenie czy dokument).

Cel domyślny: **minimum 70%** obliczonej efektywności (edytowalny per klient na Kickoffie,
jedno źródło tej liczby). 100% zwrotu wynagrodzenia za wdrożenie, jeśli cel nieosiągnięty
przy łącznym spełnieniu WSZYSTKICH warunków z umowy §3 ust. 4: dostępy w ustalonym terminie,
odpowiedź na uzgodnionym kanale w maks. 48h w dni robocze, udział w Kickoffie i sesjach
uzupełniających, brak ingerencji w konfigurację Systemu bez zgody, ciągłość systemów
zewnętrznych klienta. Zwrot nie dotyczy wynagrodzenia za retainer.

## ICP

Kalkulator ROI musi pokazać minimum 80h/mc oszczędności łącznie z dostępnych modułów.
Orientacyjnie flota 10-150 pojazdów. Twardy disqualifier: poniżej 2 osób w biurze
administracji. Właściciel jako decydent obecny na rozmowie.
