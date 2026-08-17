// Przypomnienie stylu prowadzenia rozmowy (2026-07-27, obserwacja Michała po przesłuchaniu
// własnych nagrań) — nie zmienia treści pytań poniżej, tylko sposób ich zadawania: kroki
// diagnostyczne (proces krok po kroku, poprzednie próby, cele) mają wynikać naturalnie z tego co
// klient właśnie powiedział, nie być czytane po kolei jak ankieta. Jeśli klient już coś powiedział
// przy okazji wcześniejszego pytania, nie pytaj o to drugi raz tym samym sformułowaniem.

import type { Objection, Step } from "./types";

export const STEPS_D: Step[] = [
  {
    id: "prep_d",
    nr: "0",
    label: "PRZYGOTOWANIE",
    tag: "AKCJA",
    lines: [
      {
        t: "action",
        text: "Przeczytaj przygotowany brief dla tego klienta: hipoteza bólu, przewidywane obiekcje, rekomendowane moduły.",
      },
      {
        t: "action",
        text: "Sprawdź czy prezentacja jest podpięta z liczbami tego konkretnego klienta, nie wersją generyczną.",
      },
      { t: "action", text: "Otwórz prezentację i kalkulator ROI zanim zadzwonisz. Włącz Fathom." },
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
          "Przed chwilą przejrzałem stronę firmy. Widzę że firma [nazwa] ma flotę [X] pojazdów.",
          "Dobrze widzę?",
        ],
      },
      { t: "client", text: "[potwierdza lub koryguje]" },
      {
        t: "say",
        text: [
          "Pracujemy wyłącznie z firmami transportowymi, flota 10 do 150 pojazdów.",
          "Za chwilę porozmawiamy o sytuacji w firmie i policzymy realną liczbę dla tej konkretnej firmy, nie średnią.",
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
          "Plan na pierwsze 20 minut to pytania o firmę i o to jak działa biuro.",
          "Drugie 20 minut pokazuję co możemy zrobić dla tej firmy.",
          "Ostatnie 5 minut pytania i decyzja co dalej.",
          "Pasuje taki plan?",
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
          "Na rozmowie telefonicznej padło że [podsumowanie z kwalifikacji].",
          "Czy to nadal aktualne?",
        ],
      },
      { t: "client", text: "[potwierdza lub aktualizuje]" },
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
        text: "Co spowodowało że akurat teraz zapadła decyzja o tym spotkaniu?",
        cel: "Znaleźć wyzwalacz decyzji o spotkaniu.",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "say",
        text: [
          "Proszę opowiedzieć jak wygląda dzień pracy w biurze, od momentu gdy wpada zlecenie, aż do wystawienia faktury.",
          "Krok po kroku.",
        ],
        cel: "Zmapować proces operacyjny krok po kroku.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Jaki profil zleceń opisał klient?",
      options: [
        {
          trigger: "Głównie nowe zlecenia mailem",
          action:
            "Dopytaj: 'Ile takich maili dziennie, i co się z nimi dzieje krok po kroku?' To kandydat na moduł email-parser.",
          goToStepId: "info_czas",
          tone: "positive",
        },
        {
          trigger: "Głównie stałe zlecenia, powtarzalne trasy",
          action:
            "Dopytaj: 'Skoro trasy są stałe, gdzie mimo to traci się czas: dokumenty, faktury, rozliczenia?' To kandydat na document-ocr, nie email-parser.",
          goToStepId: "info_czas",
          tone: "positive",
        },
        {
          trigger: "Kilka rozłącznych systemów, dane nie łączą się",
          action:
            "Dopytaj: 'Jak dane z jednego systemu trafiają do drugiego, ktoś to ręcznie przepisuje?' To profil integracyjny, priorytet inny niż standardowe cztery moduły.",
          goToStepId: "info_czas",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "info_czas",
    nr: "2a",
    label: "POTWIERDZENIE SKALI",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Z naszej rozmowy telefonicznej wynika że to około [godziny z Pipeline] godzin dziennie na spedytora przy ręcznym wpisywaniu. Czy to się nadal zgadza, i ilu w sumie osób jest teraz zaangażowanych w ten proces?",
        cel: "Potwierdzić dane z kwalifikacji, nie pytać od nowa.",
      },
      { t: "client", text: "[potwierdza lub koryguje]" },
      {
        t: "note",
        setterNote: "Jeśli klient nie poda dokładnej liczby, zachęć do przybliżenia.",
      },
    ],
    nextStepId: "proby",
  },
  {
    id: "proby",
    nr: "2b",
    label: "POPRZEDNIE PRÓBY ROZWIĄZANIA",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Co dotychczas próbowano zrobić żeby to usprawnić?",
        cel: "Sprawdzić czy klient już próbował to rozwiązać.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Co odpowiedział klient?",
      options: [
        {
          trigger: "Coś już próbowano, nie zadziałało",
          action: "Zapytaj: 'Dlaczego to nie zadziałało tak jak było zamierzone?' Znajdź lukę, którą wypełni Autorise.",
          goToStepId: "samodzielnie",
          tone: "positive",
        },
        {
          trigger: "Nic nie próbowaliśmy, brak czasu",
          action:
            "Nie dopytuj o powód porażki, bo próby nie było. Sam brak wcześniejszej próby to sygnał braku zasobów, przejdź dalej.",
          goToStepId: "samodzielnie",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "samodzielnie",
    nr: "2c",
    label: "DLACZEGO NIE SAMODZIELNIE",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Dlaczego nie możecie tego rozwiązać samodzielnie, siłami zespołu wewnątrz firmy?",
        cel: "Wyeliminować obiekcję 'zrobimy to sami' zawczasu.",
      },
      { t: "client", text: "[odpowiedź]" },
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
        text: "Gdyby trzeba było oszacować, ile ta ręczna praca kosztuje firmę miesięcznie, licząc czas i pomyłki, ile by to było?",
        cel: "Niech klient sam wyliczy koszt bezczynności.",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        setterNote: "Pomóż klientowi policzyć: godziny razy stawka plus błędy i opóźnienia w fakturach.",
      },
    ],
    nextStepId: "finanse_zasoby",
  },
  {
    id: "finanse_zasoby",
    nr: "2d2",
    label: "FINANSE I ZASOBY",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Zanim przejdziemy dalej, jedno pytanie: czy macie Państwo już zarezerwowany budżet na tego typu rozwiązanie w tym roku, czy to byłaby zupełnie nowa decyzja inwestycyjna?",
        cel: "Sprawdzić realny budżet przed pełnym pitchem.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Co odpowiedział klient?",
      options: [
        {
          trigger: "Podał realny zakres budżetu",
          action: "Zapisz zakres, przejdź do celu.",
          goToStepId: "cel",
          tone: "positive",
        },
        {
          trigger: "Nie wiem jaki budżet ma Pan na myśli",
          action:
            "Doprecyzuj: 'Chodzi o to, czy w budżecie firmy jest już zarezerwowana konkretna kwota na tego typu inwestycję w tym roku, czy nie.' Zadaj pytanie ponownie.",
          goToStepId: "finanse_zasoby",
          tone: "neutral",
        },
        {
          trigger: "Ile to w ogóle kosztuje",
          action: "Klient naciska na cenę już podczas diagnozy. Użyj obiekcji cena_nacisk_diagnoza_d.",
          openObjectionId: "cena_nacisk_diagnoza_d",
          tone: "warning",
        },
      ],
    },
    nextStepId: "cel",
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
          "Gdybyśmy to rozwiązali w ciągu 30 dni, jak wyglądałby idealny wynik?",
          "Co by się zmieniło w firmie?",
        ],
        cel: "Zbudować wizję pożądanego stanu.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Co odpowiedział klient?",
      options: [
        {
          trigger: "Opisał konkretny wynik",
          action: "Zapisz wizję klienta własnymi słowami, przyda się w parafrazie.",
          goToStepId: "pilnosc",
          tone: "positive",
        },
        {
          trigger: "Nie wiem, nie zastanawiałem się",
          action:
            "Podpowiedz: 'Załóżmy że biuro dziś rano nagle przestało tracić czas na to zadanie. Co konkretnie by się zmieniło w pracy zespołu?' Poczekaj na odpowiedź.",
          goToStepId: "pilnosc",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "pilnosc",
    nr: "2f",
    label: "PILNOŚĆ",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Jak {FORMA} ocenia, jak mocno to teraz doskwiera w firmie: to coś co spokojnie poczeka do przyszłego kwartału, czy to raczej coś czego {FORMA} chce się pozbyć jak najszybciej?",
        cel: "Zmierzyć realną pilność bez brzmienia jak ankieta.",
      },
    ],
    decision: {
      question: "Jaka odpowiedź?",
      options: [
        {
          trigger: "Chce mieć to z głowy szybko",
          action: "Pilność potwierdzona, kontynuuj",
          goToStepId: "parafraza",
          tone: "positive",
        },
        {
          trigger: "Niepewny, waha się między priorytetami",
          action: "Powiedz: 'Co musiałoby się wydarzyć żeby to stało się priorytetem?'",
          goToStepId: "parafraza",
          tone: "neutral",
        },
        {
          trigger: "To może poczekać, niepilne",
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
        // Dotyczy powrotu tutaj po niskiej temperaturze po pitchu, nie pierwszego wejścia.
        t: "note",
        setterNote: "Nie czytaj tej parafrazy identycznie jak za pierwszym razem, skup się na tym co nie przekonało.",
      },
      {
        t: "say",
        text: [
          "Chcę się upewnić że dobrze rozumiem sytuację.",
          "Proszę mnie poprawić jeśli coś pomylę.",
        ],
        cel: "Uzyskać jawne potwierdzenie bólu przed pitchem.",
      },
      {
        t: "say",
        text: [
          "Prowadzi {FORMA} [nazwa firmy] z flotą [X] pojazdów.",
          "Biuro zajmuje się [opis pracy].",
          "Problem to [ból główny].",
          "Wcześniej próbowano [poprzednie próby] ale to nie zadziałało bo [powód].",
          "Samodzielnie trudno to rozwiązać bo [powód].",
          "W idealnym scenariuszu chodzi o [cel].",
          "To kosztuje firmę szacunkowo [kwota] miesięcznie.",
          "Zgadza się?",
        ],
      },
      { t: "client", text: "[potwierdza lub koryguje]" },
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
          "Dobra, mam dla {FORMA} coś konkretnego: liczby przygotowane specjalnie dla tej firmy.",
          "Pokażę?",
        ],
      },
      { t: "client", text: "Tak, proszę." },
    ],
  },
  {
    id: "pitch",
    nr: "4",
    label: "PREZENTACJA ROZWIĄZANIA",
    tag: "PREZENTACJA",
    lines: [
      {
        t: "action",
        text: "SLAJD 1: Okładka z nazwą firmy klienta.",
      },
      {
        t: "say",
        text: [
          "Autorise pracuje wyłącznie z firmami transportowymi. Nic innego nie robimy.",
          "Dzięki temu rozumiemy tę branżę od środka. Nie uczymy się jej kosztem klienta.",
        ],
        cel: "Kilka słów o firmie, max 30 sekund.",
      },
      {
        t: "action",
        text: "SLAJD 2: Sytuacja dziś. Pokaż TYLKO problem-cards które dotyczą tego klienta.",
      },
      {
        t: "say",
        text: [
          "To co przed chwilą zostało opisane, [ból główny słowami klienta z parafrazy], to dokładnie to, co u naszych klientów znika w ciągu 30 dni.",
          "Odzyskuje {FORMA} minimum 70% obliczonego czasu bazowego, czyli [gwarancja godzin] miesięcznie, albo zwracamy 100% inwestycji. Bez wyjątków.",
        ],
        cel: "Otworzyć pitch obietnicą i gwarancją od razu.",
      },
      {
        t: "say",
        text: [
          "Wcześniej pojawiła się próba rozwiązania tego inaczej: [poprzednia próba z rozmowy], która nie zadziałała bo [powód z rozmowy]. My robimy to inaczej: nie sprzedajemy kolejnego generycznego narzędzia, tylko wdrożenie dopasowane do [nazwa TMS/system klienta] i tego konkretnego procesu.",
        ],
        cel: "Pokazać konkretną różnicę, nie ogólnikowe 'jesteśmy najlepsi'.",
      },
      {
        t: "say",
        text: "I jeszcze jedno, zanim przejdziemy dalej: ryzyko finansowe jest po naszej stronie, nie po Waszej. Jeśli po 30 dniach nie odzyskacie minimum 70% obliczonego czasu bazowego, czyli [gwarancja godzin] miesięcznie, oddajemy 100% pieniędzy. Bez pytań, bez wyjątków.",
        cel: "Nazwać wprost kto ponosi ryzyko finansowe.",
      },
      {
        t: "action",
        text: "SLAJD 3: System. Pokaż TYLKO moduły rekomendowane dla tego klienta z briefu.",
      },
      {
        t: "say",
        text: [
          "System transformacji wygląda tak: krok pierwszy, [moduł 1 zakończony konkretnym efektem, nie opisem funkcji]. Krok drugi, [moduł 2 zakończony konkretnym efektem, nie opisem funkcji]. Krok trzeci, [moduł 3 zakończony konkretnym efektem, nie opisem funkcji].",
          "Od tego co ma {FORMA} dziś, do stanu w którym te godziny wracają do biura.",
        ],
        cel: "Każdy krok kończy się efektem dla klienta, nie opisem funkcji.",
      },
      {
        t: "action",
        text: "SLAJD 5: Efekt. Wykres ROI z liczbami tego klienta.",
      },
      {
        t: "action",
        text: "SLAJD 6: Inwestycja. Cena na ekranie. Nie czytaj jeszcze ceny na głos, to osobny krok.",
      },
      {
        t: "action",
        text: "SLAJD 7: Gwarancja 70%. Ten slajd zamyka pitch, nie przewijaj dalej.",
      },
      {
        t: "say",
        text: [
          "Pomożemy {FORMA} odzyskać minimum [gwarancja godzin] miesięcznie. Jeśli tego nie osiągniemy, zwracamy całość wynagrodzenia za wdrożenie.",
          "Robimy to dzięki automatyzacji panelu, odczytowi dokumentów i jednoklikowym potwierdzeniom spedytora. Mamy to opisane w umowie, nie na słowo.",
        ],
      },
      {
        t: "say",
        text: ["To jest to co przygotowałem dla tej firmy.", "Jak {FORMA} to widzi?"],
      },
    ],
  },
  {
    id: "close_a",
    nr: "4a",
    label: "KROK A — POTWIERDZENIA W TRAKCIE PREZENTACJI",
    tag: "PYTASZ",
    lines: [
      {
        t: "note",
        setterNote: "Zbieraj 2-3 takie potwierdzenia na bieżąco, nie dopiero po zakończeniu prezentacji.",
      },
      {
        t: "say",
        text: "Czy to ma dla Pana sens?",
      },
      { t: "client", text: "[potwierdza lub zgłasza wątpliwość]" },
    ],
    decision: {
      question: "Czy klient potwierdził?",
      options: [
        {
          trigger: "TAK, potwierdza",
          action: "Przejdź do kroku b), podsumowania i pytania o rezonans.",
          goToStepId: "close_b",
          tone: "positive",
        },
        {
          trigger: "Zgłasza wątpliwość",
          action:
            "Znajdź pasującą obiekcję w prawym panelu i odpowiedz na NIĄ zanim wrócisz do sekwencji zamykania wartości. Nie przechodź do kroku b) z niezaadresowaną wątpliwością.",
          goToStepId: "close_a",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "close_b",
    nr: "4b",
    label: "KROK B — PODSUMOWANIE I REZONANS",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: [
          "Podsumowując, moduły które Panu pokazałem przekładają się na [X godzin/zł miesięcznie].",
          "Pytanie do Pana: jeżeli inwestycja o której zaraz powiem będzie dla Pana do zaakceptowania, czy ten model współpracy z Panem rezonuje?",
        ],
        cel: "Sprawdzić temperaturę bez sztywnej skali liczbowej.",
      },
      { t: "client", text: "[TAK, rezonuje / niepewny / NIE]" },
    ],
    decision: {
      question: "Jaka odpowiedź?",
      options: [
        {
          trigger: "Wyraźnie pozytywna reakcja, rezonuje",
          action: "Potwierdzenie kroku b uzyskane. Przejdź do ustalenia decydenta.",
          goToStepId: "commitment",
          tone: "positive",
        },
        {
          trigger: "Niepewna, wymaga dopytania",
          action:
            "Powiedz: 'Co konkretnie budzi wątpliwość, zanim przejdziemy dalej?' Wysłuchaj odpowiedzi, znajdź pasującą obiekcję w prawym panelu i odpowiedz na NIĄ. Nie przechodź do decydenta/ceny zanim wątpliwość nie zostanie realnie zaadresowana. Po odpowiedzi na obiekcję wróć do parafrazy, nie skacz od razu do pytania o decyzyjność.",
          goToStepId: "parafraza",
          tone: "neutral",
        },
        {
          trigger: "Negatywna, coś nie przekonuje",
          action:
            "Nie wracaj do tej samej parafrazy słowo w słowo. Powiedz: 'Widzę że coś z tego co pokazałem nie do końca trafia. Co konkretnie nie przekonuje?' Wysłuchaj, dopiero potem zdecyduj czy wracać do pitchu czy do ceny.",
          goToStepId: "parafraza",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "commitment",
    nr: "5",
    label: "COMMITMENT — DECYDENT",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Z tego co ustaliliśmy na kwalifikacji, {FORMA} podejmuje tę decyzję, zgadza się?",
        cel: "Potwierdzić decyzyjność ustaloną wcześniej, nie pytać od nowa jakby to był pierwszy raz.",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        setterNote: "Jeśli 'muszę z żoną/wspólnikiem': użyj obiekcji od1_partner.",
        linkObjectionId: "od1_partner",
      },
    ],
    decision: {
      question: "Czy klient jest decydentem?",
      options: [
        {
          trigger: "TAK, jest decydentem",
          action: "Przejdź do kroku c), podania ceny.",
          goToStepId: "close_c",
          tone: "positive",
        },
        {
          trigger: "Potrzebuje kogoś jeszcze / musi skonsultować",
          action:
            "Użyj obiekcji od1_partner. Kontynuuj do kroku c) dopiero gdy droga do wspólnej decyzji jest jasna.",
          goToStepId: "close_c",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "close_c",
    nr: "5a",
    label: "KROK C — CENA",
    tag: "MÓWISZ",
    lines: [
      {
        t: "note",
        setterNote: "Przed podaniem ceny ustal termin zebrania dostępów w dniach, wpisz w formularzu obok kalkulatora.",
      },
      {
        t: "say",
        text: [
          "Za tę inwestycję odzyskuje {FORMA} minimum [gwarancja godzin] godzin miesięcznie, które dziś firma traci na ręcznej pracy.",
          "Gwarancja: minimum 70% obliczonego czasu bazowego Pana firmy, czyli [gwarancja godzin] miesięcznie, sprawdzane po 30 dniach. Jeśli nie osiągniemy progu, zwrot 100%.",
        ],
        cel: "Powiedzieć efekt przed kwotą.",
      },
      {
        t: "say",
        text: "Inwestycja żeby skorzystać z tego systemu i osiągnąć ten cel to jest 18 000 złotych za wdrożenie i 4000 miesięcznie retainera. Czy to jest w ramach Pana możliwości firmowych?",
        cel: "Podać liczbę i przetrzymać ciszę.",
      },
    ],
    nextStepId: "close_d",
  },
  {
    id: "close_d",
    nr: "5b",
    label: "KROK D — CISZA",
    tag: "MÓWISZ",
    lines: [
      { t: "action", text: "CISZA. Minimum 20 sekund. Nie wypełniaj jej niczym." },
      {
        t: "note",
        setterNote: "Jeśli klient milczy 6-8 sekund: 'Jak to {FORMA} widzi?' Jedyna dopuszczalna interwencja.",
      },
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
          "Czy to ma sens dla tej firmy?",
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
      {
        t: "say",
        text: "Ryzyko po naszej stronie, gwarancja zwrotu, i już dziś wie {FORMA} że to się zwraca w [X] miesięcy. Pytanie właściwie brzmi: co miałoby powstrzymać Pana przed startem?",
        cel: "Podsumować asymetrię ryzyka tuż przed pytaniem o decyzję.",
      },
      { t: "say", text: "Co potrzebuje {FORMA} żeby podjąć decyzję dziś?" },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        setterNote: "Jeśli jest obiekcja, użyj sekcji Obiekcje przed wyborem ścieżki A lub B poniżej.",
      },
    ],
    decision: {
      question: "Co potrzebuje klient żeby zdecydować?",
      options: [
        {
          trigger: "Gotowy podpisać dziś",
          action: "Przejdź do ścieżki A: wysyłka umowy i potwierdzenie warunków na żywo.",
          goToStepId: "closing_dzis",
          tone: "positive",
        },
        {
          trigger: "Potrzebuje czasu / konsultacji prawnej",
          action:
            "Przejdź do ścieżki B. Jeśli wprost wspomni prawnika lub dział prawny, użyj też obiekcji od19.",
          goToStepId: "closing_pozniej",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "closing_dzis",
    nr: "5d2",
    label: "ŚCIEŻKA A — GOTOWY PODPISAĆ DZIŚ",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Dobrze.",
          "Prześlę umowę na [email] do podpisu.",
          "Po podpisaniu wystawiam fakturę, płatna w 2 dni.",
          "Kickoff umawiamy w ciągu 7 dni roboczych od zaksięgowania wpłaty. To jest moment od którego realnie zaczynamy.",
          "Pasuje?",
        ],
        cel: "Praca zaczyna się po zaksięgowaniu wpłaty, nie po podpisie.",
      },
    ],
    nextStepId: "warunki_umowy",
  },
  {
    id: "closing_pozniej",
    nr: "5d3",
    label: "ŚCIEŻKA B — POTRZEBUJE CZASU",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Rozumiem, to ważna decyzja. Wysyłam umowę dziś, niech Pana prawnik ją przejrzy. Kiedy mogę się odezwać, żeby dowiedzieć się jak poszło?",
        cel: "Wysłać umowę mimo braku podpisu dziś i umówić konkretny follow-up, zamiast zawieszać rozmowę w niepewności.",
      },
      { t: "client", text: "[konkretna data lub dzień]" },
      {
        t: "note",
        setterNote: "Zapisz ustaloną datę follow-up w Pipeline zaraz po rozmowie, nie na koniec dnia.",
      },
    ],
  },
  {
    id: "warunki_umowy",
    nr: "5e",
    label: "WARUNKI UMOWY — POTWIERDŹ NA ŻYWO",
    tag: "POTWIERDZASZ",
    lines: [
      {
        t: "note",
        setterNote: "Przejdź na głos przez tych 9 punktów z klientem, każdy osobno, nie jednym zdaniem.",
      },
      {
        t: "say",
        text: "18 tysięcy złotych, płatne jednorazowo w ciągu 2 dni od faktury.",
        cel: "Potwierdzić kwotę na głos, nie zakładać że klient pamięta.",
      },
      {
        t: "say",
        text: "Praca zaczyna się dopiero po zaksięgowaniu wpłaty, nie po samym podpisaniu. Dlatego zależy mi żeby faktura poszła szybko po podpisie.",
        cel: "Powiedzieć wprost: praca zaczyna się po płatności.",
      },
      {
        t: "say",
        text: "30-dniowa weryfikacja gwarancji liczy się od dnia gdy dostanę komplet dostępów, nie od dzisiejszego podpisu.",
        cel: "Powiedzieć wprost od kiedy liczy się 30 dni.",
      },
      {
        t: "say",
        text: "Jeśli po pierwszych 30 dniach wynik nie osiągnie progu, mamy 2 tygodnie na poprawki i sprawdzamy jeszcze raz. Dopiero jeśli i to nie wyjdzie, przysługuje Panu zwrot.",
        cel: "Klient ma znać realną procedurę zwrotu.",
      },
      {
        t: "say",
        text: "[poza zakresem]",
        cel: "Dopytaj teraz jeśli pole puste, zanim wyślesz umowę.",
      },
      {
        t: "say",
        text: "4 tysiące miesięcznie przez minimum 12 miesięcy, niezależnie od wyniku gwarancji. To osobna rzecz od samego wdrożenia.",
        cel: "Oddzielić retainer od gwarancji zwrotu.",
      },
      {
        t: "say",
        text: "Jeśli Pana TMS nie ma jeszcze potwierdzonego dostępu do API, to nie jest ryzyko że wdrożenie stanie w miejscu. Mamy na to sprawdzony sposób, zajmę się tym na Kickoff.",
        cel: "Dać pewność bez rozwlekania mechanizmu integracji.",
      },
      {
        // Są jeszcze trzy sprawdzone sposoby obejścia braku dostępu do API strony trzeciej,
        // patrz metodologia w Notion "Produkty" — rozwijaj dopiero na wyraźne pytanie.
        t: "note",
        setterNote: "Jeśli dopyta jak to działa: pierwszy krok to kontakt z dostawcą systemu na Kickoff.",
      },
      {
        t: "say",
        text: "Po podpisaniu dostanie Pan konkretny rytm, nie ciszę: Kickoff w ciągu 7 dni roboczych od wpłaty, potem zbieramy dostępy, potem 4 tygodnie wdrożenia, na końcu weryfikacja efektywności. Każdy etap z ustaloną datą, nie zawieszony w niepewności.",
        cel: "Zapowiedzieć cały cykl przed prośbą o podpis.",
      },
      {
        t: "say",
        text: "Wysyłam teraz umowę do podpisu. Proszę o podpis jeszcze dziś, żeby zegar dostępów mógł ruszyć jak najszybciej.",
        cel: "Moment wysyłki umowy do podpisu.",
      },
    ],
  },
];

export const OBJECTIONS_D: Objection[] = [
  {
    id: "od1",
    stage: "cena",
    label: "Muszę się zastanowić",
    script: "Jasne, oczywiście. Żebym wiedział jak pomóc, co konkretnie wymaga zastanowienia?",
    decision: {
      question: "Co odpowiedział klient?",
      options: [
        {
          trigger: "Wątpliwość co do produktu",
          openObjectionId: "od1_watpliwosc",
          tone: "warning",
        },
        { trigger: "Kwestia budżetu", openObjectionId: "od1_finanse", tone: "warning" },
        { trigger: "Chce skonsultować z kimś", openObjectionId: "od1_partner", tone: "warning" },
      ],
    },
  },
  {
    id: "od1_watpliwosc",
    stage: "cena",
    label: "Zastanowienie: wątpliwość co do produktu",
    script:
      "Jasne. Co konkretnie budzi wątpliwość, chętnie wyjaśnię teraz zamiast żeby to chodziło Panu po głowie.",
  },
  {
    id: "od1_finanse",
    stage: "cena",
    label: "Zastanowienie: kwestia finansowa",
    script: "Rozumiem. Co możemy wspólnie zrobić, żeby dało się to zagospodarować budżetowo?",
    followup:
      "Nie każdy ma od razu pełną kwotę na taką inwestycję. Czy pomogłoby, gdybyśmy rozbili to na raty, na przykład 50 procent teraz, 25 procent po odbiorze systemu, 25 procent po weryfikacji efektywności?",
    setterNote: "Followup zadawaj tylko jeśli klient nie widzi możliwości sfinansowania od razu.",
  },
  {
    id: "od1_partner",
    stage: "closing",
    label: "Zastanowienie: chce skonsultować z kimś",
    script:
      "Jak najbardziej rozumiem. Żeby wiedzieć jak najlepiej Panu pomóc: czy to jest wspólna decyzja pięćdziesiąt na pięćdziesiąt, czy bardziej Pan decyduje, a [osoba] jest informowana?",
    followup:
      "Czy pomogłoby, gdybyśmy to wspólnie omówili na krótkim spotkaniu, żeby nie robić głuchego telefonu?",
    setterNote: "Followup, czyli propozycja krótkiego wspólnego spotkania, zadawaj po odpowiedzi klienta, zamiast przekazywania informacji z drugiej ręki.",
  },
  {
    id: "od3",
    stage: "cena",
    label: "Za drogo",
    script: "Rozumiem. Chcę się upewnić że dobrze to rozumiem, co konkretnie budzi wątpliwość?",
    decision: {
      question: "Co odpowiedział klient?",
      options: [
        {
          trigger: "Kwestia logistyki płatności",
          openObjectionId: "od3_logistyka",
          tone: "warning",
        },
        { trigger: "Wątpliwość czy się zwróci", openObjectionId: "od3_wartosc", tone: "warning" },
        { trigger: "Porównuje z inną ofertą", openObjectionId: "od3_konkurencja", tone: "warning" },
      ],
    },
  },
  {
    id: "od3_logistyka",
    stage: "cena",
    label: "Za drogo: kwestia logistyki płatności",
    script:
      "Rozumiem, to nie jest mała kwota jednorazowo. Możemy rozbić to na raty: 50 procent teraz, 25 procent po odbiorze systemu, 25 procent po weryfikacji efektywności. Retainer zostaje 4000 zł miesięcznie. Ułatwia to decyzję?",
  },
  {
    id: "od3_wartosc",
    stage: "cena",
    label: "Za drogo: wątpliwość czy się zwróci",
    script:
      "Dobre pytanie. Sam Pan policzył ze mną że to [kwota] miesięcznie, prawda? 18000 zł zwraca się w [X] miesięcy, a retainer jest mniejszy niż jedna trzecia tego co teraz tracicie. Widzi Pan to inaczej po tych liczbach?",
  },
  {
    id: "od3_konkurencja",
    stage: "cena",
    label: "Za drogo: porównuje z inną ofertą",
    script:
      "Jasne. Kto i co dokładnie oferuje za tę cenę? Dają gwarancję konkretnego efektu na umowie, tak jak my dajemy [gwarancja godzin] miesięcznie albo zwrot całości?",
  },
  {
    id: "od4",
    stage: "closing",
    label: "Jestem już przekonany, ale...",
    script: "Słyszę 'ale'. Co konkretnie stoi na przeszkodzie żeby zdecydować się dziś?",
    setterNote: "To najczęściej zamaskowana obiekcja od1, od3 lub od2. Słuchaj co pojawi się po 'ale'.",
  },
  {
    id: "od5",
    stage: "closing",
    label: "Mam teraz inne priorytety",
    script:
      "Rozumiem. Ile czasu zajmą te priorytety? A czy w tym czasie biuro nadal traci te [X] godzin tygodniowo?",
    setterNote: "Nie naciskaj, zaproponuj konkretną datę powrotu.",
  },
  {
    id: "od6",
    stage: "pitch",
    label: "Chcę najpierw zobaczyć demo / testować",
    script:
      "Nasze demo to realne wdrożenie z Pana danymi, dlatego mamy gwarancję 30-dniową ze 100% zwrotem. Nie pokazujemy sandboxa, wdrażamy i Pan ocenia na żywych danych. Zmienia to Pana perspektywę?",
  },
  {
    id: "cena_nacisk_diagnoza_d",
    stage: "diagnoza",
    label: "Naciska na cenę już podczas diagnozy",
    script:
      "Rozumiem, że cena jest ważna, i pokażę ją wprost za chwilę, razem z dokładnym wyliczeniem pod Pana firmę. Teraz chcę się tylko upewnić, że dobrze rozumiem sytuację, dobrze?",
    setterNote: "Po tej obiekcji wracaj natychmiast do pytania diagnostycznego które klient przerwał, nie przechodź do ceny wcześniej.",
  },
  {
    id: "od7",
    stage: "diagnoza",
    label: "Mam pracownika który to robi",
    script:
      "No i właśnie o to chodzi, ta osoba robi coś co można zautomatyzować. Co mogłaby robić zamiast tego z tymi [X] godzinami dziennie z powrotem?",
  },
  {
    id: "od8",
    stage: "diagnoza",
    label: "Mam dwie firmy, nie wiem dla której",
    script:
      "Dla której z firm ból jest większy, gdzie traci się więcej czasu? Możemy zacząć od jednej i rozszerzyć na drugą po 30 dniach.",
  },
  {
    id: "juz_mowilem",
    stage: "diagnoza",
    label: "Klient: 'już to mówiłem'",
    script:
      "Ma {FORMA} rację, przepraszam. Chciałem się tylko upewnić że dobrze to zrozumiałem, idźmy dalej.",
    setterNote: "Natychmiast przejdź do kolejnego pytania z innej kategorii, nie wracaj do tego samego wątku.",
  },
  {
    id: "od9",
    stage: "pitch",
    label: "Korzystam już z konkurencji",
    script: "Jasne. Co Pan od nich dostaje, co działa dobrze? A czego brakuje?",
    setterNote: "Nie atakuj konkurencji. Szukaj luki: co nasze rozwiązanie robi czego tamto nie robi. Zaproponuj 30-dniowy test równoległy z gwarancją.",
  },
  {
    id: "konkurencja_m365_d",
    stage: "pitch",
    label: "Ma wszystko w Microsoft 365 / Power Automate",
    script:
      "To brzmi jak solidna konfiguracja. Ten flow faktycznie czyta dane z dokumentu, numer rejestracyjny, trasę, kwotę, czy tylko przenosi plik do folderu?",
    followup:
      "A co się dzieje przy nietypowym dokumencie? I kto to utrzymuje po aktualizacji Microsoftu?",
  },
  {
    id: "od10",
    stage: "cena",
    label: "Muszę to przespać",
    script: "Jasne, oczywiście. Co musiałoby się stać żeby jutro rano powiedział Pan 'tak'?",
    followup: "Zadzwonię jutro o [godzina]. Pasuje Panu?",
    setterNote: "Anchor konkretnego czasu. Jeśli nie chce jutro, zapisz w pipeline jako follow-up z datą.",
  },
  {
    id: "od11",
    stage: "cena",
    label: "Mogę płacić w ratach?",
    script:
      "Tak, mamy opcję rat: 50 procent teraz, 25 procent po odbiorze systemu, 25 procent po weryfikacji efektywności. Retainer zostaje 4 000 zł/mc. Przy ratach wdrożenie startuje po pierwszej wpłacie. Pasuje Panu?",
  },
  {
    id: "od12",
    stage: "closing",
    label: "Chcę móc zrezygnować z retainera w każdej chwili",
    script:
      "Rozumiem, że chce Pan wiedzieć na czym stoi, zanim podpiszemy. To proste: retainer to 12 miesięcy, bo tyle czasu potrzeba żeby system naprawdę wszedł w krew firmy i przynosił efekt, nie na to żeby Pana związać. Jeśli coś nie działa po naszej stronie, naprawiamy to, taki jest sens gwarancji. Jeśli zdecyduje się Pan zakończyć wcześniej bez naszej winy, rozliczamy pozostałe miesiące jednorazowo, żeby obie strony miały jasność od pierwszego dnia, nie żeby to było karą. Wolę powiedzieć to teraz wprost, niż żeby to było niespodzianką za pół roku.",
    setterNote: "Wypowiedz proaktywnie przy pierwszej wzmiance o retainerze, albo w odpowiedzi na wprost zadane pytanie o rezygnację.",
  },
  {
    id: "od13",
    stage: "closing",
    label: "Czemu Pan podpisuje, nie właściciel firmy?",
    script:
      "Działam jako pełnomocnik właściciela na podstawie pisemnego pełnomocnictwa, art. 100 kodeksu cywilnego. Mam pełne prawo podpisać tę umowę w jego imieniu.",
    setterNote: "Krótko i pewnie, bez dalszego tłumaczenia się jeśli klient nie dopytuje dalej. To potwierdzenie faktu, nie negocjacja.",
  },
  {
    id: "od14",
    stage: "cena",
    label: "Co jeśli AI popełni błąd np. na fakturze?",
    script:
      "Dlatego w pierwszych 30 dniach obowiązuje wyrywkowa weryfikacja z Pana strony: sprawdzacie próbkę dokumentów zanim w pełni zaufacie automatyzacji. Jak coś nie zgadza się, poprawiamy to od razu, taki jest sens tego okresu.",
  },
  {
    id: "od15",
    stage: "closing",
    label: "Czemu zegar liczy się od dostępów, nie od podpisania?",
    script:
      "To uczciwe dla obu stron: nie płaci Pan za czas w którym fizycznie nie mogliśmy jeszcze pracować, bo nie mieliśmy dostępów. Zegar rusza dopiero gdy realnie zaczynamy.",
  },
  {
    id: "od17",
    stage: "cena",
    label: "A jeśli godziny oszczędności się nie potwierdzą bo się spóźniliście z integracją?",
    script:
      "Weryfikacja 30 dni liczy się od faktycznego startu, czyli od zebrania dostępów. Jeśli to my się spóźnimy z integracją, zegar jeszcze się nie zaczął, więc to nie obciąża Pana. Obciąża Pana tylko jeśli to Państwa strona spóźni dostępy mimo ustalonego terminu.",
  },
  {
    id: "od18",
    stage: "closing",
    label: "Chcę zobaczyć demo/wizualizację działania przed podpisem",
    script:
      "Rozumiem tę potrzebę, ale robimy to celowo w innej kolejności: najpierw podpis, potem wizualizacja. Powód jest prosty: dopiero po podpisaniu i zebraniu dostępów mogę zbudować wizualizację na Pana realnych danych, z Pana TMS-em i Pana zleceniami, nie na generycznym przykładzie który niewiele powie o tym jak to będzie działać u Was. Gwarancja minimum 70% obliczonego czasu bazowego i zwrot 100% to jest Pana realne zabezpieczenie na wypadek gdyby coś nie zadziałało, dokładnie w tym samym celu co demo, tylko że dotyczy Pana firmy, nie cudzej.",
    setterNote: "Ta obiekcja pojawi się częściej przy większych klientach. Odpowiedź musi być pewna, nie defensywna.",
  },
  {
    id: "od19",
    stage: "closing",
    label: "Musimy przesłać umowę do prawnika/działu prawnego",
    script:
      "Rozumiem, to standardowa procedura przy większych firmach. Wyślę umowę dziś/jutro na maila. Czy mogę prosić o konkretny termin kiedy spodziewa się Pan odpowiedzi od prawnika, żebyśmy mogli zaplanować start? Jeśli po drodze pojawią się pytania techniczne czy dotyczące zakresu, chętnie odpowiem prawnikowi bezpośrednio albo Panu, żeby nie utknęło bez potrzeby.",
    setterNote: "To legalna procedura, nie wymówka. Nie naciskaj na podpis dziś, wyciągnij konkretny termin follow-up.",
  },
  {
    id: "od20",
    stage: "closing",
    label: "Nie wie kiedy chce zacząć, zwleka bez konkretnego powodu",
    script:
      "Policzyliśmy razem że to kosztuje Pana firmę [kwota roczna] rocznie. Skoro wiemy ile to Pana kosztuje, czy warto dalej poświęcać na to czas i energię, czy się rozłączamy?",
    setterNote: "Nie naciskaj dalej. Zadawaj gdy klient sam nie potrafi określić momentu decyzji, nie od razu.",
  },
  {
    id: "od21",
    stage: "closing",
    label: "To temat na za miesiąc",
    script:
      "Rozumiem, ale zanim to zostawimy na później, co konkretnie sprawia że to akurat za miesiąc, nie teraz? Budżet, sezon, czy ktoś inny musi to jeszcze zaakceptować?",
    followup:
      "Skoro wiemy co konkretnie stoi na przeszkodzie, sprawdźmy razem czy da się to rozwiązać już teraz, zamiast czekać miesiąc z tym samym kosztem który dalej biegnie.",
    setterNote: "Nie akceptuj 'za miesiąc' biernie. Po poznaniu realnego powodu pokaż koszt dalszego zwlekania i sprawdź czy przeszkoda da się usunąć teraz.",
  },
  {
    id: "od22",
    stage: "cena",
    label: "Obiekcja ogólna (cokolwiek poza 'nie widzę wartości')",
    script:
      "Rozumiem, to normalne. Finanse na bok, czy to co Panu pokazałem mogłoby być odpowiedzią na to czego Pan szuka?",
    followup: "Czemu Pan tak uważa?",
    setterNote: "Jeśli klient potwierdza, zadaj followup i czekaj na jego własne uzasadnienie, nie podpowiadaj.",
  },
  {
    id: "od1_pozniej",
    stage: "closing",
    label: "Muszę się zastanowić (finanse i osoba trzecia już wyjaśnione)",
    script:
      "Rozumiem. Zgodzi się Pan, że decyzje biznesowe podejmujemy w oparciu o dotychczasowe doświadczenie?",
    followup:
      "To co powinien Pan teraz zrobić, żeby zmaksymalizować szansę na to, że to zadziała? Podjąć decyzję. Jaką decyzję?",
    setterNote: "Używaj tylko gdy finanse i osoba trzecia decyzyjna są już wyjaśnione, nie podpowiadaj odpowiedzi.",
  },
  {
    id: "od23",
    stage: "pitch",
    label: "Brak case studies / referencji",
    script:
      "Powiem wprost: jesteśmy na etapie budowania portfolio w tej gałęzi, pierwsze wdrożenie ruszamy teraz. Dlatego dajemy gwarancję zwrotu całości, nie opieramy się tylko na zaufaniu. Mogę pokazać dokładne wyliczenie oszczędności na Pana danych, to jest twardszy dowód niż cudze referencje.",
  },
  {
    id: "od24",
    stage: "cena",
    label: "Płatność z góry",
    script:
      "Rozumiem tę wątpliwość. Robimy tak, bo klient który się nie angażuje finansowo od początku, rzadziej angażuje się we współpracy po swojej stronie, a to jest kluczowe dla wyniku. Dlatego gwarancja zwrotu całej kwoty jest zapisana w umowie, nie na słowo.",
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
