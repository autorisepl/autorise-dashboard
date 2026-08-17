// Analiza przedkontraktowa — potwierdzone z prawniczką (2026-07-28): pomiar czasu manualnego
// (kolumna C Załącznika 1) musi być gotowy PRZED podpisem umowy, nie na Kickoffie. Ta rozmowa
// dzieje się PO Discovery Call (werbalna zgoda klienta), PRZED przygotowaniem finalnej umowy —
// bez kompletnego Załącznika 1 umowa nie może zostać sporządzona. Kickoff (kickoff.ts, krok 4)
// tylko POTWIERDZA te liczby jako już wiążące, nie mierzy ich od nowa.
//
// Zasada stała (jak w kwalifikacyjna.ts/sprzedaz.ts/kickoff.ts): jeśli Agency Leaders nie dał
// gotowej instrukcji na konkretną sytuację, rozwiązanie buduje się z ich zasad ogólnych
// (personalizacja, konkret zamiast ogólnika, klient sam dochodzi do wniosku przez pytania), nie
// jako coś oderwanego od frameworku.

import type { Objection, Step } from "./types";

export const STEPS_AP: Step[] = [
  {
    id: "otwarcie_ap",
    nr: "1",
    label: "OTWARCIE",
    tag: "MÓWISZ",
    duration: "2 min",
    lines: [
      {
        t: "say",
        text: "Dziękuję za rozmowę i decyzję o współpracy. Zanim przygotuję dla Pana finalną umowę, potrzebuję 20-30 minut żeby dokładnie zmierzyć z Panem kilka liczb. To jest dokładnie to co potem pozwoli nam uczciwie sprawdzić czy system działa, dla obu stron.",
        cel: "Klient rozumie od razu po co jest to spotkanie i że to krok konieczny przed umową, nie dodatkowa formalność",
      },
      { t: "client", text: "[potwierdzenie]" },
    ],
  },
  {
    id: "zakres_ap",
    nr: "2",
    label: "POTWIERDZENIE ZAKRESU",
    tag: "MÓWISZ",
    duration: "2 min",
    lines: [
      {
        t: "action",
        text: "Odczytaj listę modułów i systemów do integracji ustalonych na Discovery, jeden po drugim.",
      },
      {
        t: "say",
        text: "Z naszej rozmowy wynika że wdrażamy: [lista modułów z briefu]. System który trzeba zintegrować to [nazwa TMS/system klienta]. Zgadza się, czy coś się zmieniło od Discovery?",
        cel: "Zakres musi być identyczny z tym co było na Discovery. Jeśli coś się zmieniło, wychodzi to teraz, nie dopiero w umowie",
      },
      { t: "client", text: "[potwierdzenie albo korekta]" },
    ],
  },
  {
    id: "pomiar_czasu_ap",
    nr: "3",
    label: "POMIAR CZASU MANUALNEGO, MODUŁ PO MODULE",
    tag: "MÓWISZ",
    duration: "15-20 min",
    hasModuleRecommendation: true,
    lines: [
      {
        // Wynik trafia wprost do Załącznika 1, jest wiążący od podpisu umowy.
        t: "note",
        setterNote: "Dla każdego modułu osobno: opis czynności, konkretna liczba, zapis od razu.",
      },
      {
        t: "say",
        text: "Jak dziś wygląda [ta konkretna czynność] krok po kroku, od początku do końca?",
        cel: "Zrozumieć realny proces, nie założenie z rozmowy kwalifikacyjnej czy Discovery, bo czasem różni się w szczegółach",
      },
      { t: "client", text: "[opis procesu]" },
      {
        t: "say",
        text: "Ile realnie czasu to zajmuje, jedna taka operacja?",
      },
      { t: "client", text: "[czas w minutach albo godzinach na operację]" },
      {
        // Sposób szacowania: obserwacja ekranu jeśli możliwe, albo rozbicie na mniejsze
        // kroki (otwarcie maila, przepisanie do systemu, sprawdzenie poprawności osobno).
        t: "note",
        setterNote: "Jeśli klient nie wie dokładnie, pomóż oszacować wspólnie. Przybliżenie zawsze lepsze niż nic.",
        linkObjectionId: "ap_nie_wiem_ile",
      },
      {
        t: "action",
        text: "Zapisz wynik od razu do tabeli w /sprzedaz, moduł po module, nie z pamięci na końcu spotkania.",
      },
    ],
  },
  {
    id: "cel_efektywnosci_ap",
    nr: "4",
    label: "USTALENIE CELU EFEKTYWNOŚCI",
    tag: "MÓWISZ",
    duration: "3 min",
    lines: [
      {
        t: "say",
        text: "Standardowy cel to 70%. Gwarantujemy zaoszczędzenie minimum 70% czasu który przed chwilą zmierzyliśmy. Potwierdzamy tę liczbę?",
        cel: "70% to domyślna wartość, nie osobna decyzja do wynegocjowania na nowo za każdym razem",
      },
      { t: "client", text: "[potwierdzenie]" },
      {
        t: "note",
        setterNote: "Edytowalne tylko przy wyraźnym powodzie biznesowym, nie negocjuj w dół dla szybszego zamknięcia.",
      },
    ],
  },
  {
    id: "zamkniecie_ap",
    nr: "5",
    label: "ZAMKNIĘCIE",
    tag: "MÓWISZ",
    duration: "3 min",
    lines: [
      {
        t: "say",
        text: "To wszystko czego potrzebuję. Przygotuję teraz finalną umowę z tymi dokładnymi liczbami i wyślę ją Panu do [termin] wraz z Załącznikiem. Będzie Pan mógł to spokojnie przejrzeć, ewentualnie z prawnikiem, zanim podpiszemy.",
      },
      {
        t: "action",
        text: "Zapisz tabelę czasu manualnego w /sprzedaz, jeśli jeszcze nie zapisana. Bez niej umowa nie może zostać sporządzona.",
      },
    ],
  },
];

export const OBJECTIONS_AP: Objection[] = [
  {
    id: "ap_po_co_teraz",
    label: "Po co to teraz, mieliśmy już to omówione",
    stage: "przedkontraktowa",
    script:
      "To co mieliśmy wcześniej to był orientacyjny szacunek na potrzeby oferty. To spotkanie to dokładny pomiar na potrzeby prawnie wiążącego dokumentu, chcemy mieć uczciwe liczby, nie przybliżenie, zanim coś podpiszemy.",
    setterNote: "Wcześniejsze etapy dawały przybliżenie, Załącznik 1 wymaga dokładnego pomiaru per moduł.",
  },
  {
    id: "ap_nie_wiem_ile",
    label: "Nie wiem dokładnie ile to zajmuje",
    stage: "przedkontraktowa",
    script:
      "Rozumiem, mało kto ma to zmierzone stoperem. Rozbijmy to na mniejsze kroki: ile zajmuje samo otwarcie maila, ile przepisanie do systemu, ile sprawdzenie poprawności? Albo jeśli to możliwe teraz, proszę mi pokazać na ekranie, policzę czas obok.",
    setterNote: "Przybliżenie zawsze lepsze niż nic, nie zostawiaj pola pustego. Ta sama zasada co w kalkulatorze kroku 2.6 kwalifikacji.",
  },
  {
    id: "ap_opoznienie",
    label: "Czy to opóźni podpisanie",
    stage: "przedkontraktowa",
    script:
      "To jest jeden krok, 20-30 minut, i przyspiesza resztę: umowa którą Pan dostanie będzie już kompletna, nie będziemy do niej wracać.",
  },
];
