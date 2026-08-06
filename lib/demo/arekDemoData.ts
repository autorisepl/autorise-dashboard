// Dane demo wdrożenia dla rozmowy sprzedażowej z Arkiem Burkowskim (firma transportowa,
// ok. 80 pojazdów). Sekcja KLIENT to WYŁĄCZNIE fakty potwierdzone przez Arka na nagranej
// rozmowie kwalifikacyjnej — nie zmyślaj tu liczb. Sekcja ZLECENIE to ilustracyjny,
// realistyczny scenariusz jednego zlecenia (fikcyjny zleceniodawca, prawdziwe formaty
// dokumentów branży TSL: CMR, POD, giełda transportowa) używany wyłącznie do pokazania
// przepływu pracy, nie faktyczne dane żadnego istniejącego podmiotu.

export const KLIENT = {
  imieNazwisko: "Arek Burkowski",
  segment: "Firma transportowa, ok. 80 pojazdów",
  tms: "HMSoft",
  tmsDostawca: "Subic",
  bazowyCzasGodzinyMc: 788,
  celCzasGodzinyMc: 90,
  gwarancjaMinGodzinyMc: 80,
  spadekProcent: 81,
  kosztNieefektywnosciRokPln: 472_500,
  liczbaFakturMcOd: 1300,
  liczbaFakturMcDo: 1600,
} as const;

export const ZLECENIE = {
  gielda: "Trans.eu",
  numerGieldy: "TE-8842213",
  zleceniodawca: "Nordkern Logistics Sp. z o.o.",
  zaladunek: { miejsce: "Poznań, PL", data: "12.08.2026, 8:00–10:00" },
  rozladunek: { miejsce: "Lipsk, DE", data: "13.08.2026, 7:00–9:00" },
  ladunek: "Palety — artykuły spożywcze mrożone, 24 palety, 22 400 kg",
  stawka: "2 850 EUR",
  numerZleceniaTms: "ZL/2026/08/1147",
  kierowca: "Tomasz Wieczorek",
  pojazd: "PO 4821W · naczepa chłodnia",
  cmrNumer: "CMR/2026/113 442",
  podPotwierdzenie: "Rozładunek 13.08.2026, 08:47, odbiorca: Nordkern Logistics DE-Lager 3",
} as const;

// Czasy manualne per krok, punkt odniesienia z rozmowy: 788h/mc dziś przy 1300-1600
// fakturach/mc daje rząd wielkości kilkunastu minut manualnej pracy na jedno zlecenie
// (wpisanie zlecenia do TMS + obsługa dokumentów CMR/POD) — nie osobno potwierdzone przez
// Arka per-zlecenie, więc pokazywane jako szacunek wyprowadzony z jego własnych liczb
// miesięcznych, opisane wprost jako "szacunek" w UI, nie jako dodatkowy potwierdzony fakt.
export const CZAS_NA_ZLECENIE = {
  manualnieMinut: 16,
  systemMinut: 1.5,
} as const;

// Faktura i powiadomienie dla tego samego zlecenia (kroki 5/6 części 1) — ten sam
// ilustracyjny scenariusz co ZLECENIE, ta sama konwencja numeracji dokumentów.
export const FAKTURA = {
  numer: "FV/2026/08/0392",
  kwota: ZLECENIE.stawka,
  dataWystawienia: "13.08.2026",
  terminPlatnosci: "30 dni",
} as const;

export const POWIADOMIENIE = {
  odbiorca: "Nordkern Logistics, dział spedycji",
  kanal: "e-mail",
  tresc: `Zlecenie ${ZLECENIE.numerZleceniaTms} zrealizowane. CMR i potwierdzenie dostawy w załączeniu.`,
} as const;

// Dane części 2 (Dashboard zarządczy) — zoom out na całą firmę, nie jedno zlecenie.
// AKTYWNE_ZLECENIA i ALERTY to ten sam typ ilustracyjnego, fikcyjnego scenariusza co
// ZLECENIE (Nordkern Logistics i trasa Poznań–Lipsk to to samo zlecenie z części 1,
// pozostałe pozycje to dodatkowe, spójne stylistycznie przykłady, nie realne dane).
// STAN_FLOTY i statystyki KLIENT to jedyne miejsce w całej stronie, gdzie pojawiają się
// realne liczby z rozmowy kwalifikacyjnej.
export const AKTYWNE_ZLECENIA = [
  {
    numer: ZLECENIE.numerZleceniaTms,
    trasa: `${ZLECENIE.zaladunek.miejsce}, do ${ZLECENIE.rozladunek.miejsce}`,
    zleceniodawca: ZLECENIE.zleceniodawca,
    status: "Zrealizowane",
  },
  {
    numer: "ZL/2026/08/1152",
    trasa: "Wrocław, PL, do Drezno, DE",
    zleceniodawca: "Baltrans Cargo GmbH",
    status: "W transporcie",
  },
  {
    numer: "ZL/2026/08/1155",
    trasa: "Poznań, PL, do Berlin, DE",
    zleceniodawca: "Nordkern Logistics Sp. z o.o.",
    status: "Oczekuje na CMR",
  },
  {
    numer: "ZL/2026/08/1158",
    trasa: "Gdańsk, PL, do Hamburg, DE",
    zleceniodawca: "Vistula Freight Sp. z o.o.",
    status: "Nowe, z giełdy",
  },
] as const;

export const STAN_FLOTY = {
  pojazdyWTrasie: 62,
  pojazdyLacznie: 80,
} as const;

export const ALERTY = [
  "Zlecenie ZL/2026/08/1155: brak potwierdzenia CMR od 3 godzin.",
  "Pojazd PO 4821W: przegląd techniczny za 5 dni.",
] as const;
