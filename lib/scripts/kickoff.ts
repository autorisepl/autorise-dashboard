// Zasada stała (jak w kwalifikacyjna.ts i sprzedaz.ts): jeśli Agency Leaders nie dał gotowej
// instrukcji na konkretną sytuację, rozwiązanie buduje się z ich zasad ogólnych (personalizacja,
// konkret zamiast ogólnika, klient sam dochodzi do wniosku przez pytania), nie jako coś
// oderwanego od frameworku.
//
// Kickoff to pierwszy formalny kontakt po podpisaniu umowy (30-45 minut), trzy cele: ustalić
// harmonogram i Wykaz dostępów, zmierzyć czas manualny per moduł (Załącznik 1 umowy) i ustalić
// cel efektywności. Krok 4 (pomiar czasu) jest sercem spotkania — wynik zapisuje się wprost do
// tabeli w Panelu 0 /wdrozenie (`KickoffModuleTable`, pole Notion "Tabela modułów Kickoff"),
// ten skrypt jest wyłącznie przewodnikiem rozmowy prowadzącym do tych samych liczb, nie osobnym
// miejscem zapisu.
//
// Zasada gwarancji (jak w kwalifikacyjna.ts): 70% domyślne, edytowalne tylko z wyraźnego powodu
// biznesowego — nie negocjować w dół żeby "zamknąć" spotkanie szybciej.

import type { Objection, Step } from "./types";

export const STEPS_KO: Step[] = [
  {
    id: "otwarcie",
    nr: "1",
    label: "OTWARCIE",
    tag: "MÓWISZ",
    duration: "2 min",
    lines: [
      {
        t: "say",
        text: "Dzień dobry, dziękuję za czas.",
      },
      {
        t: "say",
        text: [
          "To spotkanie ma trzy cele: ustalić dokładny harmonogram wdrożenia, zebrać listę dostępów i danych, i zmierzyć razem z Panem ile czasu dziś zajmują poszczególne zadania ręcznie — to jest podstawa do sprawdzenia efektywności za 30 dni.",
          "Zajmie nam to 30-45 minut.",
        ],
        cel: "Klient wie od pierwszych 30 sekund po co jest to spotkanie i dlaczego trwa aż tyle — zero niepewności co do formatu",
      },
      { t: "client", text: "[potwierdzenie]" },
    ],
  },
  {
    id: "potwierdzenie_modulow",
    nr: "2",
    label: "POTWIERDZENIE MODUŁÓW",
    tag: "MÓWISZ",
    duration: "2 min",
    lines: [
      {
        t: "action",
        text: "Odczytaj z karty klienta listę modułów wdrażanych ustaloną na sprzedaży, jeden po drugim.",
      },
      {
        t: "say",
        text: "Zgodnie z naszą umową wdrażamy: [lista modułów z karty klienta]. Zgadza się?",
        cel: "Zakres musi być identyczny z tym co klient podpisał — jeśli coś się zmieniło od sprzedaży, wychodzi to teraz, nie w połowie wdrożenia",
      },
      { t: "client", text: "[potwierdzenie albo korekta]" },
      {
        t: "note",
        setterNote: "Przy rozbieżności ze scope'em umowy nie decyduj sam, przenieś do rozmowy z Michałem.",
      },
    ],
  },
  {
    id: "dostepy",
    nr: "3",
    label: "ZBIERANIE LISTY DOSTĘPÓW",
    tag: "MÓWISZ",
    duration: "5-10 min",
    lines: [
      {
        t: "action",
        text: "Dla każdego modułu z listy: konkretny dostęp potrzebny (TMS, poczta, system księgowy, WhatsApp Business). Punkt odniesienia: Panel Dostępy w /wdrozenie poniżej — nie wymyślaj nowej listy.",
      },
      {
        t: "say",
        text: "Do [ten moduł] potrzebuję dostępu do [konkretny system]. Kto po Pana stronie może go nadać, i kiedy realnie mogę go otrzymać?",
        cel: "Ustalić realny termin z klientem, nie zakładać automatycznie maksimum z umowy",
      },
      { t: "client", text: "[osoba kontaktowa + orientacyjny termin]" },
      {
        t: "note",
        setterNote: "Umowa daje max 3 tygodnie od Wykazu, potwierdź wcześniejszą datę jeśli klient zdąży szybciej.",
        linkObjectionId: "ko_dostepy_wrazliwe",
      },
    ],
  },
  {
    id: "pomiar_czasu",
    nr: "4",
    label: "POTWIERDZENIE CZASU MANUALNEGO, MODUŁ PO MODULE",
    tag: "MÓWISZ",
    duration: "10-15 min",
    hasModuleRecommendation: true,
    lines: [
      {
        // Kickoff dzieje się po podpisie i wpłacie, to nie ponowny pomiar.
        t: "note",
        setterNote: "Dla każdego modułu osobno: odczytaj liczbę z umowy, poproś o potwierdzenie, zapisz od razu.",
      },
      {
        t: "say",
        text: "Zgodnie z Załącznikiem do naszej umowy, ustaliliśmy że [operacja] zajmuje dziś [X] — czy to się nadal zgadza, czy coś się zmieniło od czasu podpisania?",
        cel: "Potwierdzić liczby wiążące z podpisanego dokumentu, nie zbierać ich od nowa — mierzenie manualnego czasu należy do etapu Analizy przedkontraktowej, przed podpisem",
      },
      { t: "client", text: "[potwierdzenie albo zgłoszona zmiana]" },
      {
        t: "note",
        setterNote: "Jeśli coś się zmieniło: zanotuj rozbieżność, nie zmieniaj tabeli bez decyzji Michała.",
        linkObjectionId: "ko_nie_wiem_ile",
      },
      {
        t: "action",
        text: "Zapisz potwierdzone liczby od razu do tabeli w Panelu 0 /wdrozenie, moduł po module — nie z pamięci na końcu spotkania.",
      },
    ],
  },
  {
    id: "cel_efektywnosci",
    nr: "5",
    label: "USTALENIE CELU EFEKTYWNOŚCI",
    tag: "MÓWISZ",
    duration: "2 min",
    lines: [
      {
        t: "say",
        text: "Standardowy cel to 70% — to znaczy że gwarantujemy zaoszczędzenie minimum 70% czasu który dziś Pan mi opisał. Potwierdzamy tę liczbę?",
        cel: "70% to domyślna wartość pola Cel efektywności w tabeli Kickoff, nie osobna decyzja do wynegocjowania na nowo za każdym razem",
      },
      { t: "client", text: "[potwierdzenie]" },
      {
        t: "note",
        setterNote: "Edytowalne tylko przy wyraźnym powodzie biznesowym, nie negocjuj w dół dla szybszego zamknięcia.",
      },
    ],
  },
  {
    id: "zamkniecie",
    nr: "6",
    label: "ZAMKNIĘCIE I NASTĘPNE KROKI",
    tag: "MÓWISZ",
    duration: "3 min",
    lines: [
      {
        t: "say",
        text: [
          "Podsumowując: dostępy dostarcza Pan do [ustalona data], od tego momentu liczymy 4 tygodnie wdrożenia i 30 dni do weryfikacji.",
          "Będę się odzywał na bieżąco z postępami, a na koniec spotkamy się żeby sprawdzić wyniki razem.",
        ],
      },
      {
        t: "action",
        text: "Zaznacz 'Kickoff odbyty' w Panelu 0 /wdrozenie i zapisz tabelę czasu manualnego, jeśli jeszcze nie zapisana.",
      },
    ],
  },
];

export const OBJECTIONS_KO: Objection[] = [
  {
    id: "ko_nie_wiem_ile",
    label: "Nie wiem czy ta liczba z umowy się nadal zgadza",
    stage: "kickoff",
    script:
      "Rozumiem, to nie musi być pamiętane co do minuty. Tę liczbę ustaliliśmy wspólnie i podpisaliśmy w Załączniku, więc jeśli nic się od tego czasu nie zmieniło w tym procesie, przyjmujemy ją jako punkt odniesienia do weryfikacji za 30 dni. Jeśli coś realnie się zmieniło, proszę powiedzieć co, zanotuję to do dalszej rozmowy.",
    setterNote: "Nie proponuj nowego pomiaru, liczba jest wiążąca. Zgłoszoną zmianę zanotuj, nie zmieniaj tabeli.",
  },
  {
    id: "ko_dlaczego_teraz",
    label: "Dlaczego to potwierdzamy teraz, a nie mierzymy na miejscu",
    stage: "kickoff",
    script:
      "Bo dokładny pomiar czasu manualnego jest częścią Analizy przedkontraktowej, robionej przed podpisaniem umowy — te liczby są już w podpisanym Załączniku 1 i są wiążące. Dzisiejsze spotkanie to potwierdzenie że nic się nie zmieniło od tamtego momentu, żeby weryfikacja za 30 dni była uczciwa i policzalna.",
    setterNote: "To potwierdzenie liczb z Załącznika, nie renegocjacja. Rozbieżności idą do notatki, nie do tabeli.",
  },
  {
    id: "ko_dostepy_wrazliwe",
    label: "Te dostępy które macie, zbyt szerokie / wrażliwe",
    stage: "kickoff",
    script:
      "Rozumiem obawę. Dane operacyjne zostają cały czas własnością Pana firmy, zgodnie z §8 umowy i RODO — my jesteśmy wyłącznie powierzającym przetwarzanie. Jeśli wolałby Pan ograniczyć dostęp tylko do niezbędnego zakresu na start, możemy tak zrobić i rozszerzyć później, jeśli okaże się potrzebne.",
    setterNote: "Zaproponuj ograniczenie zakresu jako opcję, nie żądaj pełnego dostępu jako warunku koniecznego jeśli klient się waha.",
  },
];
