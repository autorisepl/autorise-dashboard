import type { Objection, Step } from "./types";

export const STEPS_D: Step[] = [
  {
    id: "prep_d",
    nr: "0",
    label: "PRZYGOTOWANIE",
    tag: "AKCJA",
    lines: [
      { t: "action", text: "Przeczytaj Brief Agenta 02 (zakładka Brief)." },
      { t: "action", text: "Przeczytaj Pitch Recipe Agenta 02 — które moduły pokazać." },
      { t: "action", text: "Sprawdź czy Agent 03 zaktualizował prezentację liczbami klienta." },
      { t: "action", text: "Otwórz prezentację i kalkulator ROI. Fathom włączony." },
      { t: "action", text: "Cel: diagnoza + pitch + cena + closing w jednym spotkaniu." },
    ],
  },
  {
    id: "intro",
    nr: "1",
    label: "OTWARCIE I INTRO",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Dzień dobry, Pan {IMIĘ}. Cieszę się że możemy porozmawiać.",
          "Przed chwilą przejrzałem stronę firmy — widzę że prowadzi Pan firmę [nazwa] z flotą [X] pojazdów.",
          "Dobrze widzę?",
        ],
      },
      { t: "client", text: "[potwierdza lub koryguje]" },
      {
        t: "say",
        text: [
          "Autorise to system automatyzacji dla biur spedycji.",
          "Pracujemy głównie z firmami 10-150 pojazdów i odzyskujemy dla nich czas biura — średnio 80 godzin miesięcznie.",
        ],
      },
    ],
  },
  {
    id: "agenda",
    nr: "1b",
    label: "AGENDA SPOTKANIA",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Na to spotkanie mam dla nas 45 minut.",
          "Plan: pierwsze 20 minut pytam Pana o firmę i jak działa biuro.",
          "Drugie 20 minut pokazuję co robimy dla Pana firmy.",
          "Ostatnie 5 minut pytania i decyzja co dalej.",
          "Pasuje Panu?",
        ],
      },
      { t: "client", text: "Tak, jasne." },
    ],
  },
  {
    id: "podsumowanie_kwal",
    nr: "1c",
    label: "PODSUMOWANIE KWALIFIKACJI",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Na rozmowie telefonicznej powiedział Pan że [podsumowanie z kwalifikacji].",
          "Czy to nadal aktualne?",
        ],
      },
      { t: "client", text: "[potwierdza lub aktualizuje]" },
      {
        t: "note",
        text: "Słuchaj uważnie — zmiany w sytuacji klienta od kwalifikacji to cenny sygnał.",
      },
      {
        t: "note",
        text: "Jeśli w trakcie rozmowy klient zareaguje 'ale ja już to mówiłem' lub podobnie: nie tłumacz się i nie przepraszaj długo, jedno zdanie wystarczy. 'Ma Pan rację, przepraszam, chciałem się tylko upewnić że dobrze to zrozumiałem, idźmy dalej.' Natychmiast przejdź do kolejnego pytania z innej kategorii, nie wracaj do tego samego wątku.",
      },
    ],
  },
  {
    id: "info",
    nr: "2",
    label: "DIAGNOZA — SYTUACJA DZIŚ",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Co spowodowało że właśnie teraz zdecydował się Pan na to spotkanie?",
        cel: "Znaleźć konkretny wyzwalacz decyzji, przydatny później w podsumowaniu i pitchu",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "say",
        text: [
          "Proszę opowiedzieć jak wygląda dzień pracy w biurze — od momentu gdy wpada zlecenie do wystawienia faktury.",
          "Krok po kroku.",
        ],
        cel: "Zmapować proces operacyjny krok po kroku, żeby trafnie dobrać moduły do pitchu",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "say",
        text: "Ile osób jest zaangażowanych w ten proces i ile czasu to zajmuje łącznie?",
        cel: "Oszacować skalę problemu w godzinach i ludziach — wejście do kalkulatora ROI",
      },
    ],
  },
  {
    id: "proby",
    nr: "2b",
    label: "POPRZEDNIE PRÓBY ROZWIĄZANIA",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Co Pan do tej pory próbował żeby to usprawnić?",
        cel: "Sprawdzić czy klient już próbował rozwiązać problem, i jak, zanim zaproponujesz nowe rozwiązanie",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "say",
        text: "Dlaczego to nie zadziałało tak jak Pan chciał?",
        cel: "Znaleźć lukę którą wypełni Autorise, nie powtarzać cudzych błędów",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
  },
  {
    id: "samodzielnie",
    nr: "2c",
    label: "DLACZEGO NIE SAMODZIELNIE",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Dlaczego nie możecie tego rozwiązać samodzielnie — wewnętrznie?",
        cel: "Wyeliminować 'zrobimy to sami' jako obiekcję zanim padnie na etapie ceny",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "To pytanie pokazuje głębię problemu i eliminuje 'zrobimy to sami' jako późniejszą obiekcję.",
      },
    ],
  },
  {
    id: "koszt",
    nr: "2d",
    label: "KOSZT OBECNEJ SYTUACJI",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Ile szacuje Pan że kosztuje firma ta ręczna praca miesięcznie — w godzinach, błędach, stresie?",
        cel: "Sprawić żeby klient sam wyliczył koszt bezczynności — mocniejsze niż podanie liczby przez Ciebie",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Pomóż klientowi policzyć: godziny × stawka + błędy + opóźnienia w fakturach.",
      },
    ],
  },
  {
    id: "cel",
    nr: "2e",
    label: "CEL — WIZJA PRZYSZŁOŚCI",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: [
          "Gdybyśmy to rozwiązali w ciągu 30 dni — jak wyglądałby dla Pana idealny wynik?",
          "Co by się zmieniło w firmie?",
        ],
        cel: "Zbudować wizję pożądanego stanu, do której odwołasz się w pitchu i closing",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
  },
  {
    id: "pilnosc",
    nr: "2f",
    label: "PILNOŚĆ",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Na skali 1-10 jak pilne jest dla Pana rozwiązanie tego teraz?",
        cel: "Zmierzyć realną gotowość do działania, nie tylko zainteresowanie tematem",
      },
    ],
    decision: {
      question: "Jaka odpowiedź?",
      options: [
        {
          trigger: "7 lub więcej",
          action: "Pilność potwierdzona, kontynuuj",
          goToStepId: "parafraza",
          tone: "positive",
        },
        {
          trigger: "5-6",
          action: "Powiedz: 'Co musiałoby się wydarzyć żeby to było 9?'",
          goToStepId: "parafraza",
          tone: "neutral",
        },
        {
          trigger: "Poniżej 5",
          action: "Zastanów się czy warto kontynuować pitch dziś",
          goToStepId: "parafraza",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "parafraza",
    nr: "2g",
    label: "PARAFRAZA — PODSUMOWANIE DIAGNOZY",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Chcę się upewnić że dobrze rozumiem Pana sytuację.",
          "Proszę mnie poprawić jeśli coś pomylę.",
        ],
      },
      {
        t: "say",
        text: [
          "Prowadzi Pan [nazwa firmy] z flotą [X] pojazdów.",
          "Biuro zajmuje się [opis pracy].",
          "Problem to [ból główny].",
          "Próbował Pan [poprzednie próby] ale to nie zadziałało bo [powód].",
          "Samodzielnie trudno to rozwiązać bo [powód].",
          "Idealnie chciałby Pan [cel].",
          "To kosztuje firmę szacunkowo [kwota] miesięcznie.",
          "Zgadza się?",
        ],
      },
      { t: "client", text: "[potwierdza lub koryguje]" },
      {
        t: "note",
        text: "Parafraza obowiązkowa przed pitchem. Klient który potwierdza własny ból kupuje ideę, nie produkt.",
      },
    ],
  },
  {
    id: "przejscie",
    nr: "3",
    label: "PRZEJŚCIE DO PITCHU",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Dziękuję za szczerość.",
          "Mam przygotowaną prezentację specjalnie dla [nazwa firmy] — z Pana liczbami.",
          "Mogę ją teraz pokazać?",
        ],
      },
    ],
  },
  {
    id: "pitch",
    nr: "4",
    label: "PITCH",
    tag: "PREZENTACJA",
    lines: [
      {
        t: "action",
        text: "SLAJD 1: Okładka z nazwą firmy klienta. Przewiń gdy skończysz intro o firmie.",
      },
      {
        t: "action",
        text: "SLAJD 2: Sytuacja dziś. Pokaż 4 problem-cards. Wskaż TYLKO te które dotyczą tego klienta.",
      },
      {
        t: "action",
        text: "SLAJD 3: System. Pokaż TYLKO moduły z pitch recipe Agenta 02. Pomiń moduły które nie dotyczą klienta.",
      },
      {
        t: "action",
        text: "SLAJD 5: Efekt. Wykres ROI z liczbami tego klienta. Sprawdź czy Agent 03 je wstawił.",
      },
      { t: "action", text: "SLAJD 6: Inwestycja. Cena na ekranie. CISZA 20 sekund." },
      { t: "action", text: "SLAJD 7: Gwarancja 80h. Ten slajd zamyka pitch. Nie przewijaj dalej." },
      {
        t: "say",
        text: ["To jest to co przygotowałem dla Pana firmy.", "Jak Pan to widzi?"],
      },
    ],
  },
  {
    id: "temperatura",
    nr: "5",
    label: "TEMPERATURA",
    tag: "PYTASZ",
    lines: [{ t: "say", text: "Na skali 1-10 — gdzie jesteśmy?" }],
    decision: {
      question: "Jaka odpowiedź?",
      options: [
        {
          trigger: "7 lub więcej",
          action: "Gotowy na commitment",
          goToStepId: "commitment",
          tone: "positive",
        },
        {
          trigger: "5-6",
          action: "Powiedz: 'Co musiałoby się zmienić żeby to było 9?'",
          goToStepId: "commitment",
          tone: "neutral",
        },
        {
          trigger: "Poniżej 5",
          action: "Wróć do parafrazy bólu",
          goToStepId: "parafraza",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "commitment",
    nr: "5a",
    label: "COMMITMENT — DECYDENT",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Czy jest Pan osobą która podejmuje tę decyzję, czy potrzebujemy kogoś jeszcze?",
        cel: "Ustalić decyzyjność przed przejściem do ceny, uniknąć pustego pitchu bez decydenta",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Jeśli 'muszę z żoną / wspólnikiem' — użyj obiekcji od2 lub od2b. Nie przechodź do ceny bez decydenta.",
      },
      {
        t: "say",
        text: "Jeśli zdecyduje się Pan dziś — możemy zacząć wdrożenie w tym tygodniu. Co Pan myśli?",
      },
    ],
  },
  {
    id: "cena",
    nr: "5b",
    label: "CENA",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Inwestycja to 15 000 zł jednorazowo lub dwie raty po 7 500 zł.",
          "Plus 4 000 zł miesięcznie opieki.",
          "Gwarancja: jeśli w 30 dni nie odzyska Pan 80 godzin — zwrot 100% bez pytań.",
        ],
      },
      { t: "action", text: "CISZA. Poczekaj. Nie wypełniaj ciszy." },
    ],
  },
  {
    id: "roi_d",
    nr: "5c",
    label: "ROI W LICZBACH",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Przy [kwota oszczędności] miesięcznie, inwestycja zwraca się w [X] miesięcy.",
          "Czy to ma sens dla Pana firmy?",
        ],
      },
    ],
  },
  {
    id: "closing",
    nr: "5d",
    label: "CLOSING",
    tag: "ZAMKNIĘCIE",
    lines: [
      { t: "say", text: "Co potrzebuje Pan żeby podjąć decyzję dziś?" },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Jeśli brak obiekcji: 'Super. Prześlę umowę na maila. Mogę teraz?' Jeśli jest obiekcja — użyj sekcji Obiekcje.",
      },
      {
        t: "say",
        text: [
          "Zaczynamy.",
          "Prześlę umowę i fakturę na [email].",
          "Kickoff umawiamy na [termin].",
          "Pasuje?",
        ],
      },
    ],
  },
];

export const OBJECTIONS_D: Objection[] = [
  {
    id: "od1",
    label: "Muszę się zastanowić",
    script:
      "Oczywiście. Żebym wiedział jak Panu pomóc — co konkretnie wymaga zastanowienia? Czy to kwestia budżetu, kwestia czy to zadziała u Pana, czy może chce Pan porozmawiać z kimś bliskim?",
    note: "3 gałęzie: (A) wątpliwość co do produktu — wróć do wartości i gwarancji; (B) finanse — zaproponuj raty; (C) partner — przejdź do od2 lub od2b.",
  },
  {
    id: "od2",
    label: "Muszę porozmawiać z żoną",
    script:
      "Gdyby Pana żona była dzisiaj na tym spotkaniu i miała pełen kontekst tak jak Pan, co myśli Pan że by powiedziała?",
    followup:
      "A jeśli mimo pełnego kontekstu z jakiegoś powodu powiedziałaby nie, co Pan wtedy robi?",
    note: "Anchor decision przed rozłączeniem: 'Kiedy rozmawia Pan z żoną — dziś wieczór czy jutro?' Zapisz konkretną datę follow-up.",
  },
  {
    id: "od2b",
    label: "Muszę porozmawiać ze wspólnikiem / partnerem biznesowym",
    script:
      "Rozumiem. Czy możemy umówić drugie spotkanie razem ze wspólnikiem — tak żeby miał ten sam kontekst co Pan?",
    note: "Opcja A: umów 2. spotkanie z decydentem. Opcja B: reframing — 'Co musiałoby się wydarzyć żeby Pan mógł podjąć tę decyzję samodzielnie?'",
  },
  {
    id: "od3",
    label: "Za drogo",
    script:
      "Rozumiem. Chcę się upewnić że dobrze rozumiem. Czy to kwestia samej kwoty, czy kwestia czy inwestycja się zwróci, czy porównuje Pan nas z inną ofertą?",
    note: "LOGISTYKA (kwota): 'Mamy raty: 2 × 7 500 zł. Zwrot w [X] mc.' WARTOŚĆ (zwrot): wróć do ROI z liczbami klienta. KONKURENCJA: 'Kto i co oferuje za tę cenę? Czy mają gwarancję zwrotu 80h?'",
  },
  {
    id: "od4",
    label: "Jestem już przekonany, ale...",
    script: "Słyszę 'ale' — co konkretnie stoi na przeszkodzie żeby zdecydować się dziś?",
    note: "To najczęściej zamaskowana obiekcja od1, od3 lub od2. Słuchaj co pojawi się po 'ale'.",
  },
  {
    id: "od5",
    label: "Mam teraz inne priorytety",
    script:
      "Rozumiem. Ile czasu zajmie Panu te priorytety? A czy w tym czasie biuro nadal traci te [X] godzin tygodniowo?",
    note: "Cel: pokazać koszt zwlekania. Nie naciskaj — zaproponuj konkretną datę powrotu.",
  },
  {
    id: "od6",
    label: "Chcę najpierw zobaczyć demo / testować",
    script:
      "Nasze demo to realne wdrożenie z Pana danymi — dlatego mamy gwarancję 30-dniową z 100% zwrotem. Nie pokazujemy sandboxa — wdrażamy i Pan ocenia na żywych danych. Czy to zmienia Pana perspektywę?",
  },
  {
    id: "od7",
    label: "Mam pracownika który to robi",
    script:
      "Dobrze. I właśnie o to chodzi — ta osoba robi coś co można zautomatyzować. Co mogłaby robić zamiast tego, gdyby miała te [X] godzin dziennie z powrotem?",
  },
  {
    id: "od8",
    label: "Mam dwie firmy, nie wiem dla której",
    script:
      "Dla której z firm ból jest większy — gdzie traci się więcej czasu? Możemy zacząć od jednej i rozszerzyć na drugą po 30 dniach.",
  },
  {
    id: "od9",
    label: "Korzystam już z konkurencji",
    script: "Rozumiem. Co Pan od nich dostaje i co działa dobrze? A czego Panu brakuje?",
    note: "Nie atakuj konkurencji. Szukaj luki — co nasze rozwiązanie robi czego tamto nie robi. Zaproponuj 30-dniowy test równoległy z gwarancją.",
  },
  {
    id: "od10",
    label: "Muszę to przespać",
    script: "Oczywiście. Co musiałoby się stać żeby jutro rano powiedział Pan 'tak'?",
    followup: "Zadzwonię jutro o [godzina]. Pasuje Panu?",
    note: "Anchor konkretnego czasu. Jeśli nie chce jutro — zapisz w pipeline jako follow-up z datą.",
  },
  {
    id: "od11",
    label: "Mogę płacić w ratach?",
    script:
      "Tak — mamy opcję 2 × 7 500 zł zamiast 15 000 zł jednorazowo. Retainer pozostaje 4 000 zł / mc. Przy ratach zaczynacie wdrożenie po pierwszej wpłacie. Pasuje Panu?",
  },
];

export const DISCOVERY_STATUSES = [
  "Kwalifikacja",
  "Discovery umówione",
  "Finalizacja",
  "Kickoff",
  "Wdrożenie",
  "Retainer",
  "Upsell",
];
