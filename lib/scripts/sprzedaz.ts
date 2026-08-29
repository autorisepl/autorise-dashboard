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
        text: "Przeczytaj przygotowany brief dla tego klienta — hipoteza bólu, przewidywane obiekcje, rekomendowane moduły.",
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
          "Przed chwilą przejrzałem stronę firmy — widzę że firma [nazwa] ma flotę [X] pojazdów.",
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
          "Plan: pierwsze 20 minut to pytania o firmę i o to jak działa biuro.",
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
      {
        t: "note",
        text: "Słuchaj uważnie — zmiany w sytuacji klienta od kwalifikacji to cenny sygnał.",
      },
      {
        t: "note",
        text: "Jeśli klient zareaguje 'już to mówiłem': patrz obiekcja 'Klient: już to mówiłem' w prawym panelu (stage: diagnoza).",
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
        text: "Co spowodowało że akurat teraz zapadła decyzja o tym spotkaniu?",
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
    ],
    decision: {
      question: "Jaki profil zleceń opisał klient?",
      options: [
        {
          trigger: "Głównie nowe zlecenia mailem",
          action:
            "Dopytaj: 'Ile takich maili dziennie, i co się z nimi dzieje krok po kroku?' — kandydat na email-parser",
          goToStepId: "info_czas",
          tone: "positive",
        },
        {
          trigger: "Głównie stałe zlecenia, powtarzalne trasy",
          action:
            "Dopytaj: 'Skoro trasy są stałe, gdzie mimo to traci się czas — dokumenty, faktury, rozliczenia?' — kandydat na document-ocr, nie email-parser",
          goToStepId: "info_czas",
          tone: "positive",
        },
        {
          trigger: "Kilka rozłącznych systemów, dane nie łączą się",
          action:
            "Dopytaj: 'Jak dane z jednego systemu trafiają do drugiego, ktoś to ręcznie przepisuje?' — profil integracyjny, priorytet inny niż standardowe cztery moduły",
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
        text: "Z naszej rozmowy telefonicznej wynika że to około [godziny z Pipeline] godzin dziennie na spedytora przy ręcznym wpisywaniu — to się nadal zgadza, i ilu w sumie osób jest teraz zaangażowanych w ten proces?",
        cel: "Potwierdzić dane z kalkulatora kwalifikacji zamiast pytać od zera, zgodnie z zasadą że Discovery nie powtarza pytań z kwalifikacji. Godziny na spedytora to realne pole zapisane w Pipeline; liczba osób nie jest jeszcze zapisywana do Notion (kalkulator liczy ją tylko lokalnie w UI kwalifikacji), więc to jedyna część pytana od nowa",
      },
      { t: "client", text: "[potwierdza lub koryguje]" },
      {
        t: "note",
        text: 'Jeśli klient nie potrafi podać dokładnej liczby, zachęć do przybliżenia ("na oko, w przybliżeniu, żeby mieć punkt odniesienia") zamiast zostawiać pole puste albo traktować brak precyzji jako brak odpowiedzi. Szacunek przybliżony zawsze lepszy niż żaden — kalkulator ROI pokazuje rząd wielkości problemu, nie księgowość co do złotówki.',
      },
    ],
    expected: "Klient potwierdza liczby z kwalifikacji albo podaje skorygowane wartości.",
    transition: "Dobrze, mam punkt odniesienia. Sprawdźmy jeszcze, co dotychczas próbowano z tym zrobić.",
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
        cel: "Sprawdzić czy klient już próbował rozwiązać problem, i jak, zanim zaproponujesz nowe rozwiązanie",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "say",
        text: "Dlaczego to nie zadziałało tak jak było zamierzone?",
        cel: "Znaleźć lukę którą wypełni Autorise, nie powtarzać cudzych błędów",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    expected: "Klient opisuje konkretną próbę (narzędzie, proces, osobę) i miejsce gdzie to nie zadziałało.",
    transition: "Rozumiem. Sprawdźmy jeszcze, dlaczego nie da się tego rozwiązać wewnętrznie.",
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
    expected: "Klient wskazuje realną przeszkodę (czas, kompetencje, priorytety), nie tylko 'nie było okazji'.",
    transition: "Dobrze, to policzmy razem ile to dziś realnie kosztuje firmę.",
  },
  {
    id: "koszt",
    nr: "2d",
    label: "KOSZT OBECNEJ SYTUACJI",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Ile szacuje {FORMA} że kosztuje firma ta ręczna praca miesięcznie — w godzinach, błędach, stresie?",
        cel: "Sprawić żeby klient sam wyliczył koszt bezczynności — mocniejsze niż podanie liczby przez Ciebie",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Pomóż klientowi policzyć: godziny × stawka + błędy + opóźnienia w fakturach.",
      },
    ],
    expected: "Klient podaje orientacyjny koszt w godzinach, błędach albo złotówkach, choćby przybliżony.",
    transition: "Rozumiem. Zanim przejdę dalej, jeszcze jedno pytanie o budżet.",
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
        text: "Zanim przejdziemy dalej — czy macie Państwo już zarezerwowany budżet na tego typu rozwiązanie w tym roku, czy to byłaby zupełnie nowa decyzja inwestycyjna?",
        cel: "Sprawdzić realne zasoby finansowe zanim zainwestujesz czas w pełny pitch — uniknąć 20 minut prezentacji komuś bez fizycznej możliwości zapłaty",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    expected: "Klient mówi wprost czy budżet jest zarezerwowany, czy to nowa decyzja inwestycyjna.",
    transition: "Dziękuję za szczerość. Teraz spójrzmy w przód.",
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
          "Gdybyśmy to rozwiązali w ciągu 30 dni — jak wyglądałby idealny wynik?",
          "Co by się zmieniło w firmie?",
        ],
        cel: "Zbudować wizję pożądanego stanu, do której odwołasz się w pitchu i closing",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    expected: "Klient nazywa konkretny, pożądany stan firmy po rozwiązaniu problemu.",
    transition: "Rozumiem. Jeszcze jedno pytanie, zanim podsumuję całość.",
  },
  {
    id: "pilnosc",
    nr: "2f",
    label: "PILNOŚĆ",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Jak {FORMA} ocenia, jak mocno to teraz doskwiera w firmie — to coś co spokojnie poczeka do przyszłego kwartału, czy to raczej coś czego {FORMA} chce się pozbyć jak najszybciej?",
        cel: "Zmierzyć realną gotowość do działania bez brzmienia jak ankieta satysfakcji — odpowiedź daje ten sam sygnał co liczba 1-10, tylko w naturalnej formie",
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
        t: "note",
        text: "Jeśli wracasz tutaj po niskiej temperaturze po pitchu (nie pierwsze wejście), nie czytaj tej parafrazy identycznie jak za pierwszym razem. Skup się na tym co klient przed chwilą powiedział że nie przekonuje.",
      },
      {
        t: "say",
        text: [
          "Chcę się upewnić że dobrze rozumiem sytuację.",
          "Proszę mnie poprawić jeśli coś pomylę.",
        ],
        cel: "Uzyskać jawne potwierdzenie bólu przed pitchem — klient który potwierdza własny problem kupuje ideę, nie produkt",
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
      {
        t: "note",
        text: "Parafraza obowiązkowa przed pitchem. Klient który potwierdza własny ból kupuje ideę, nie produkt.",
      },
    ],
    expected: "Klient potwierdza parafrazę bez większych poprawek.",
    transition: "Dziękuję za potwierdzenie. Teraz pokażę, jak możemy to rozwiązać.",
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
          "Mam przygotowaną prezentację specjalnie dla [nazwa firmy] — z liczbami tej firmy.",
          "Mogę ją teraz pokazać?",
        ],
      },
      { t: "client", text: "Tak, proszę." },
      {
        t: "say",
        text: "Zanim pokażę rozwiązanie — jedno pytanie na rozgrzewkę. Gdyby to co za chwilę pokażę było dokładnie tym czego {FORMA} szuka, jak szybko dałoby się zacząć?",
        cel: "Pre-frame gotowości przed pitchem, technika Agency Leaders — łapiesz sygnał pilności zanim jeszcze zobaczy cenę, i zbijasz obiekcję czasową zanim się pojawi",
      },
      { t: "client", text: "[odpowiedź — zapisz, wróć do niej przy closing]" },
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
          "Autorise pracuje wyłącznie z firmami transportowymi — nic innego nie robimy.",
          "Dzięki temu rozumiemy tę branżę od środka — nie uczymy się jej kosztem klienta.",
        ],
        cel: "Kilka słów o firmie, krótko — Kimura Framework: nie za długo, max 30 sekund",
      },
      {
        t: "action",
        text: "SLAJD 2: Sytuacja dziś. Pokaż TYLKO problem-cards które dotyczą tego klienta.",
      },
      {
        t: "say",
        text: [
          "To co przed chwilą zostało opisane — [ból główny słowami klienta z parafrazy] — to dokładnie to, co u naszych klientów znika w ciągu 30 dni.",
          "Odzyskuje {FORMA} minimum 70% obliczonego czasu bazowego — [gwarancja godzin] miesięcznie — albo zwracamy 100% inwestycji. Bez wyjątków.",
        ],
        cel: "Obietnica/big promise — prowadzisz pitch od razu ofertą i gwarancją, nie chowasz jej na koniec",
      },
      {
        t: "say",
        text: [
          "Wcześniej pojawiła się próba rozwiązania tego inaczej: [poprzednia próba z rozmowy], która nie zadziałała bo [powód z rozmowy].",
          "My robimy to inaczej — nie sprzedajemy kolejnego generycznego narzędzia, tylko wdrożenie dopasowane do [nazwa TMS/system klienta] i tego konkretnego procesu.",
        ],
        cel: "Inaczej/lepiej niż konkurencja lub niż poprzednie próby — konkretne, nie ogólnikowe 'jesteśmy najlepsi'",
      },
      {
        t: "say",
        text: "I jeszcze jedno, zanim przejdziemy dalej: ryzyko finansowe jest po naszej stronie, nie po Waszej. Jeśli po 30 dniach nie odzyskacie minimum 70% obliczonego czasu bazowego, czyli [gwarancja godzin] miesięcznie, oddajemy 100% pieniędzy. Bez pytań, bez wyjątków.",
        cel: "Stały, mocny wyróżnik różnicujący (Blok 'Arek' pkt 4, 2026-07-15) — nie wzmianka o gwarancji przy okazji, tylko jawne nazwanie kto ponosi ryzyko finansowe. Zbija najczęstszą niewypowiedzianą obiekcję 'a jeśli to nie zadziała' zanim padnie",
      },
      {
        t: "action",
        text: "SLAJD 3: System. Pokaż TYLKO moduły rekomendowane dla tego klienta z briefu.",
      },
      {
        t: "say",
        text: [
          "System transformacji wygląda tak: krok pierwszy, [moduł 1 zakończony konkretnym efektem, nie opisem funkcji].",
          "Krok drugi, [moduł 2 zakończony konkretnym efektem, nie opisem funkcji].",
          "Krok trzeci, [moduł 3 zakończony konkretnym efektem, nie opisem funkcji].",
          "Od tego co ma {FORMA} dziś, do stanu w którym te godziny wracają do biura.",
        ],
        cel: "System Transformacji A do B w 3 krokach — sell the outcome, not features (Kacper Wierszewski): każdy krok kończy się efektem dla klienta (godziny/PLN), nie opisem co moduł robi",
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
          "Pomożemy Panu osiągnąć [WYNIK]. Jeśli tego nie osiągniemy, zwracamy całość wynagrodzenia za wdrożenie. Robimy to dzięki [MECHANIZM] - automatyzacji panelu, odczytowi dokumentów i jednoklikowym potwierdzeniom spedytora. Mamy to opisane w umowie, nie na słowo.",
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
        text: "Krok a) sekwencji zamykania wartości. Zbierz 2-3 takie potwierdzenia na bieżąco w trakcie prezentacji (SLAJDY 2-7 w kroku 4), nie dopiero po jej zakończeniu — tu zapisane osobno dla jasności skryptu i jawnego bramkowania przed krokiem b.",
      },
      {
        t: "say",
        text: ["Czy to ma dla Pana sens?", "Czy to jest zrozumiałe?"],
      },
      { t: "client", text: "[potwierdza lub zgłasza wątpliwość]" },
    ],
    decision: {
      question: "Czy klient potwierdził?",
      options: [
        {
          trigger: "TAK, potwierdza",
          action: "Przejdź do kroku b) — podsumowania i pytania o rezonans.",
          goToStepId: "close_b",
          tone: "positive",
        },
        {
          trigger: "Zgłasza wątpliwość",
          action:
            "Znajdź pasującą obiekcję w prawym panelu i odpowiedz na NIĄ zanim wrócisz do sekwencji zamykania wartości. Nie przechodź do kroku b) z niezaadresowaną wątpliwością.",
          goToStepId: "parafraza",
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
        t: "note",
        text: "Krok b) sekwencji zamykania wartości, wykonywany po potwierdzeniu z kroku a.",
      },
      {
        t: "say",
        text: [
          "Podsumowując, moduły które Panu pokazałem przekładają się na [X godzin/zł miesięcznie].",
          "Pytanie do Pana - jeżeli inwestycja, którą zaraz pokażę, będzie do przełknięcia, czy ten model współpracy z Panem rezonuje?",
        ],
        cel: "Sprawdzić temperaturę bez sztywnej skali liczbowej, naturalniej niż 'gdzie jesteśmy 1-10'",
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
            "Powiedz: 'Co konkretnie budzi wątpliwość, zanim przejdziemy dalej?' Wysłuchaj odpowiedzi, znajdź pasującą obiekcję w prawym panelu i odpowiedz na NIĄ. Nie przechodź do decydenta/ceny zanim wątpliwość nie zostanie realnie zaadresowana — po odpowiedzi na obiekcję wróć do parafrazy, nie skacz od razu do pytania o decyzyjność.",
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
        text: "Czy {FORMA} jest osobą która podejmuje tę decyzję, czy potrzebujemy kogoś jeszcze?",
        cel: "Ustalić decyzyjność przed przejściem do ceny — uniknąć pustego pitchu bez decydenta",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Jeśli 'muszę z żoną / wspólnikiem' — użyj obiekcji od1_partner. Nie przechodź dalej bez decydenta.",
      },
    ],
    decision: {
      question: "Czy {FORMA} jest decydentem?",
      options: [
        {
          trigger: "TAK, jest decydentem",
          action: "Przejdź do kroku c) — podania ceny.",
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
        text: "PRZED wypowiedzeniem ceny, ustal na żywo (nie zakładaj uniwersalnej liczby) konkretny termin zebrania dostępów w dniach — wpisz go w mini-formularzu obok kalkulatora, trafi do Notion i Załącznika nr 1.",
      },
      {
        t: "say",
        text: [
          "Za tę inwestycję odzyskuje {FORMA} minimum [gwarancja godzin] godzin miesięcznie, które dziś firma traci na ręcznej pracy.",
          "Gwarancja: minimum 70% obliczonego czasu bazowego Pana firmy, czyli [gwarancja godzin] miesięcznie, sprawdzane po 30 dniach — jeśli nie osiągniemy progu, zwrot 100%.",
        ],
        cel: "Clear value proposition (Kacper Wierszewski) — jedno jasne zdanie łączące liczbę z wynikiem PRZED samą kwotą, żeby klient słyszał najpierw efekt, potem cenę",
      },
      {
        t: "note",
        text: "Krok c) sekwencji zamykania wartości, wykonywany po potwierdzeniu z kroku b i ustaleniu decydenta.",
      },
      {
        t: "say",
        text: "Inwestycja żeby skorzystać z tego systemu i osiągnąć ten cel to jest 18 000 złotych za wdrożenie i 4000 miesięcznie retainera. Czy to jest w ramach Pana możliwości firmowych?",
        cel: "Podać konkretną liczbę i przetrzymać ciszę — pierwsza osoba która przerwie milczenie zwykle przegrywa negocjację",
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
      {
        t: "note",
        text: "Krok d) sekwencji zamykania wartości: cisza, brak dalszego tekstu, czekasz na odpowiedź klienta.",
      },
      { t: "action", text: "CISZA. Minimum 20 sekund. Nie wypełniaj jej niczym." },
      {
        t: "note",
        text: "Jeśli klient nie odezwie się sam po 6-8 sekundach: 'Jak to {FORMA} widzi?' To jedyna dopuszczalna interwencja w tej ciszy, nic więcej.",
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
      { t: "client", text: "[odpowiedź]" },
    ],
    expected: "Klient potwierdza że przy takim zwrocie decyzja ma sens.",
    transition: "Świetnie, to zamknijmy teraz temat.",
  },
  {
    id: "closing",
    nr: "5d",
    label: "CLOSING",
    tag: "ZAMKNIĘCIE",
    lines: [
      {
        t: "say",
        text: "Ryzyko po naszej stronie, gwarancja zwrotu, i już dziś wie {FORMA} że to się zwraca w [X] miesięcy — pytanie właściwie brzmi, co miałoby powstrzymać Pana przed startem?",
        cel: "Make people feel dumb saying no (Kacper Wierszewski) — podsumowanie asymetrii ryzyka tuż przed pytaniem o decyzję, żeby odmowa wymagała od klienta konkretnego kontrargumentu, nie ogólnego wahania",
      },
      { t: "say", text: "Co potrzebuje {FORMA} żeby podjąć decyzję dziś?" },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Jeśli brak obiekcji: 'Super. Prześlę umowę na maila. Mogę teraz?' Jeśli jest obiekcja — użyj sekcji Obiekcje.",
      },
      {
        t: "say",
        text: [
          "Świetnie.",
          "Prześlę umowę na [email] do podpisu.",
          "Po podpisaniu wystawiam fakturę, płatna w 2 dni.",
          "Kickoff umawiamy w ciągu 7 dni roboczych od zaksięgowania wpłaty — to jest moment od którego realnie zaczynamy.",
          "Pasuje?",
        ],
        cel: "Kolejność podpis → faktura → wpłata → Kickoff — praca zaczyna się dopiero po zaksięgowaniu wpłaty (SZKIC_UMOWA_AUTORISE.md §2 ust. 1-2), nie od samego podpisania",
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
        text: "Zanim wyślesz umowę, przejdź na głos przez tych 9 punktów z klientem — każdy osobno, nie jednym zdaniem. To ostatni moment żeby uniknąć niejasności przed podpisem, nie krok do przeklikania w ciszy.",
      },
      {
        t: "say",
        text: "18 tysięcy złotych, płatne jednorazowo w ciągu 2 dni od faktury.",
        cel: "Cena — potwierdzenie kwoty na głos, nie zakładanie że {FORMA} pamięta to z wcześniejszej części rozmowy. Jedna cena, bez mechanizmu rabatu za terminowość (usunięty z nowej wersji umowy)",
      },
      {
        t: "say",
        text: "Praca zaczyna się dopiero po zaksięgowaniu wpłaty, nie po samym podpisaniu — dlatego zależy mi żeby faktura poszła szybko po podpisie.",
        cel: "Kolejność płatność → praca — kluczowa różnica względem intuicji klienta ('podpisałem więc już zaczynacie'), musi być wypowiedziana wprost, nie domyślna",
      },
      {
        t: "say",
        text: "30-dniowa weryfikacja gwarancji liczy się od dnia gdy dostanę komplet dostępów, nie od dzisiejszego podpisu.",
        cel: "Start zegara — kluczowa różnica względem intuicji klienta ('podpisałem więc już się liczy'), musi być wypowiedziana wprost, nie domyślna",
      },
      {
        t: "say",
        text: "Jeśli po pierwszych 30 dniach wynik nie osiągnie progu, mamy 2 tygodnie na poprawki i sprawdzamy jeszcze raz — dopiero jeśli i to nie wyjdzie, przysługuje Panu zwrot.",
        cel: "Druga runda weryfikacji przed zwrotem — SZKIC_UMOWA_AUTORISE.md §4 ust. 7. Wypowiadane wprost, żeby klient znał realną procedurę, nie zakładał automatycznego zwrotu zaraz po pierwszym negatywnym wyniku",
      },
      {
        t: "say",
        text: "[poza zakresem]",
        cel: "Poza zakresem — wstawiane na żywo z mini-formularza 'Warunki umowy' (Kalkulator ROI / Warunki umowy w panelu obok). Jeśli puste, dopytaj teraz i zapisz zanim wyślesz umowę",
      },
      {
        t: "say",
        text: "4 tysiące miesięcznie przez minimum 12 miesięcy, niezależnie od wyniku gwarancji — to osobna rzecz od samego wdrożenia.",
        cel: "Retainer — oddzielić jednoznacznie od gwarancji zwrotu, najczęstszy punkt niejasności po podpisie",
      },
      {
        t: "say",
        text: "Jeśli Pana TMS nie ma jeszcze potwierdzonego dostępu do API, to nie jest ryzyko że wdrożenie stanie w miejscu — mamy na to sprawdzony sposób, zajmę się tym na Kickoff.",
        cel: "Wykonalność integracji TMS — proces oceny z KARTA_PRODUKTU_SYSTEM_OPERACYJNY.md pkt 8 (2026-07-19), tu w skróconej formie: pewność bez rozwlekania mechanizmu, którego klient na tym etapie nie potrzebuje. Simplicity > complexity (Kacper Wierszewski) — pełna metodologia w notatce niżej, dopiero jeśli klient dopyta",
      },
      {
        t: "note",
        text: "Jeśli klient dopyta jak dokładnie to działa: pierwszy krok to zawsze bezpośredni kontakt z dostawcą systemu na Kickoff. Jeśli się nie uda, są jeszcze trzy sprawdzone sposoby obejścia braku dostępu do API strony trzeciej (metodologia w bazie Notion Produkty) — dopiero na to pytanie warto rozwijać szczegóły, nie w głównym przepływie przed podpisem.",
      },
      {
        t: "say",
        text: "Po podpisaniu dostanie Pan konkretny rytm, nie ciszę: Kickoff w ciągu 7 dni roboczych od wpłaty, potem zbieramy dostępy, potem 4 tygodnie wdrożenia, na końcu weryfikacja efektywności — każdy etap z ustaloną datą, nie zawieszony w niepewności.",
        cel: "Zapowiedź całego cyklu, nie tylko momentu podpisu — żeby klient nie miał wrażenia że po podpisie 'coś się dzieje' bez konkretnego rytmu. Wypowiadane PRZED prośbą o podpis, jako ostatni punkt pewności zanim padnie pytanie o samą decyzję",
      },
      {
        t: "say",
        text: "Wysyłam teraz umowę do podpisu — proszę o podpis jeszcze dziś, żeby zegar dostępów mógł ruszyć jak najszybciej.",
        cel: "Podpis — moment wywołania Google Workspace eSignature / iLovePDF. W systemie nie ma jeszcze gotowej integracji/linku do tego kroku — to świadomie sam tekst przypominający, bez budowania nowej integracji teraz",
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
      "Nie każdy ma od razu pełną kwotę na taką inwestycję. Czy pomogłoby, gdybyśmy rozbili to na raty - na przykład 50 procent teraz, 25 procent po odbiorze systemu, 25 procent po weryfikacji efektywności?",
    note: "Followup zadawaj tylko jeśli klient nie widzi możliwości sfinansowania od razu.",
  },
  {
    id: "od1_partner",
    stage: "closing",
    label: "Zastanowienie: chce skonsultować z kimś",
    script:
      "Jak najbardziej rozumiem. Żeby wiedzieć jak najlepiej Panu pomóc - czy to jest wspólna decyzja pięćdziesiąt na pięćdziesiąt, czy bardziej Pan decyduje, a [osoba] jest informowana?",
    followup:
      "Czy pomogłoby, gdybyśmy to wspólnie omówili na krótkim spotkaniu, żeby nie robić głuchego telefonu?",
    note: "Followup, czyli propozycja krótkiego wspólnego spotkania, zadawaj po odpowiedzi klienta, zamiast przekazywania informacji z drugiej ręki.",
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
    note: "To najczęściej zamaskowana obiekcja od1, od3 lub od2. Słuchaj co pojawi się po 'ale'.",
  },
  {
    id: "od5",
    stage: "closing",
    label: "Mam teraz inne priorytety",
    script:
      "Rozumiem. Ile czasu zajmą te priorytety? A czy w tym czasie biuro nadal traci te [X] godzin tygodniowo?",
    note: "Cel: pokazać koszt zwlekania. Nie naciskaj — zaproponuj konkretną datę powrotu.",
  },
  {
    id: "od6",
    stage: "pitch",
    label: "Chcę najpierw zobaczyć demo / testować",
    script:
      "Nasze demo to realne wdrożenie z Pana danymi, dlatego mamy gwarancję 30-dniową ze 100% zwrotem. Nie pokazujemy sandboxa, wdrażamy i Pan ocenia na żywych danych. Zmienia to Pana perspektywę?",
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
    note: "Natychmiast przejdź do kolejnego pytania z innej kategorii, nie wracaj do tego samego wątku.",
  },
  {
    id: "od9",
    stage: "pitch",
    label: "Korzystam już z konkurencji",
    script: "Jasne. Co Pan od nich dostaje, co działa dobrze? A czego brakuje?",
    note: "Nie atakuj konkurencji. Szukaj luki — co nasze rozwiązanie robi czego tamto nie robi. Zaproponuj 30-dniowy test równoległy z gwarancją.",
  },
  {
    id: "konkurencja_m365_d",
    stage: "pitch",
    label: "Ma wszystko w Microsoft 365 / Power Automate",
    script:
      "To brzmi jak solidna konfiguracja. Ten flow faktycznie czyta dane z dokumentu, numer rejestracyjny, trasę, kwotę, czy tylko przenosi plik do folderu?",
    followup:
      "A co się dzieje przy nietypowym dokumencie? I kto to utrzymuje po aktualizacji Microsoftu?",
    note: "Ten sam scenariusz co konkurencja_m365 w kwalifikacji. Jeśli klient już o tym wspominał na kwalifikacji, brief powinien to flagować — sprawdź przed spotkaniem.",
  },
  {
    id: "od10",
    stage: "cena",
    label: "Muszę to przespać",
    script: "Jasne, oczywiście. Co musiałoby się stać żeby jutro rano powiedział Pan 'tak'?",
    followup: "Zadzwonię jutro o [godzina]. Pasuje Panu?",
    note: "Anchor konkretnego czasu. Jeśli nie chce jutro — zapisz w pipeline jako follow-up z datą.",
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
    note: "Do wypowiedzenia proaktywnie przy pierwszej wzmiance o retainerze, albo w odpowiedzi na wprost zadane pytanie o rezygnację. Podstawa: SZKIC_UMOWA_AUTORISE.md §5 ust. 7 (rozliczenie pozostałych miesięcy przy wcześniejszej rezygnacji bez winy Wykonawcy).",
  },
  {
    id: "od13",
    stage: "closing",
    label: "Czemu Pan podpisuje, nie właściciel firmy?",
    script:
      "Działam jako pełnomocnik właściciela na podstawie pisemnego pełnomocnictwa, art. 100 kodeksu cywilnego — mam pełne prawo podpisać tę umowę w jego imieniu.",
    note: "Krótko i pewnie, bez dalszego tłumaczenia się jeśli klient nie dopytuje dalej — to potwierdzenie faktu, nie negocjacja.",
  },
  {
    id: "od14",
    stage: "cena",
    label: "Co jeśli AI popełni błąd np. na fakturze?",
    script:
      "Dlatego w pierwszych 30 dniach obowiązuje wyrywkowa weryfikacja z Pana strony — sprawdzacie próbkę dokumentów zanim w pełni zaufacie automatyzacji. Jak coś nie zgadza się, poprawiamy to od razu, taki jest sens tego okresu.",
  },
  {
    id: "od15",
    stage: "closing",
    label: "Czemu zegar liczy się od dostępów, nie od podpisania?",
    script:
      "To uczciwe dla obu stron — nie płaci Pan za czas w którym fizycznie nie mogliśmy jeszcze pracować, bo nie mieliśmy dostępów. Zegar rusza dopiero gdy realnie zaczynamy.",
  },
  {
    id: "od17",
    stage: "cena",
    label: "A jeśli godziny oszczędności się nie potwierdzą bo się spóźniliście z integracją?",
    script:
      "Weryfikacja 30 dni liczy się od faktycznego startu, czyli od zebrania dostępów — jeśli to my się spóźnimy z integracją, zegar jeszcze się nie zaczął, więc to nie obciąża Pana. Obciąża Pana tylko jeśli to Państwa strona spóźni dostępy mimo ustalonego terminu.",
  },
  {
    id: "od18",
    stage: "closing",
    label: "Chcę zobaczyć demo/wizualizację działania przed podpisem",
    script:
      "Rozumiem tę potrzebę, ale robimy to celowo w innej kolejności: najpierw podpis, potem wizualizacja. Powód jest prosty — dopiero po podpisaniu i zebraniu dostępów mogę zbudować wizualizację na Pana realnych danych, z Pana TMS-em i Pana zleceniami, nie na generycznym przykładzie który niewiele powie o tym jak to będzie działać u Was. Gwarancja minimum 70% obliczonego czasu bazowego i zwrot 100% to jest Pana realne zabezpieczenie na wypadek gdyby coś nie zadziałało, dokładnie w tym samym celu co demo — tylko że dotyczy Pana firmy, nie cudzej.",
    note: "Technika 'podpis, potem wizualizacja' (rozmowa z Arkiem Burkowskim, 15 lipca) — nie budować jeszcze uniwersalnego demo-przykładu wielokrotnego użytku, to osobna decyzja produktowa do podjęcia z Michałem. Ta obiekcja pojawi się częściej przy większych klientach, odpowiedź musi być pewna, nie defensywna.",
  },
  {
    id: "od19",
    stage: "closing",
    label: "Musimy przesłać umowę do prawnika/działu prawnego",
    script:
      "Rozumiem, to standardowa procedura przy większych firmach. Wyślę umowę dziś/jutro na maila — czy mogę prosić o konkretny termin kiedy spodziewa się Pan odpowiedzi od prawnika, żebyśmy mogli zaplanować start? Jeśli po drodze pojawią się pytania techniczne czy dotyczące zakresu, chętnie odpowiem prawnikowi bezpośrednio albo Panu, żeby nie utknęło bez potrzeby.",
    note: "Realny, powtarzalny przypadek u większych klientów, nie to samo co generyczne 'muszę pomyśleć' (od1) — to legalna procedura korporacyjna, nie wymówka. Potwierdzone na Arku Burkowskim ('u nas czyta prawnie', 'on na pewno nie usiądzie do tego na CITO'). Cel: nie naciskać na podpis tego samego dnia w takiej sytuacji, tylko wyciągnąć konkretny termin follow-up zamiast otwartego 'jakoś się odezwę'.",
  },
  {
    id: "od20",
    stage: "closing",
    label: "Nie wie kiedy chce zacząć, zwleka bez konkretnego powodu",
    script:
      "Policzyliśmy razem że to kosztuje Pana firmę [kwota roczna] rocznie. Skoro wiemy ile to Pana kosztuje, czy warto dalej poświęcać na to czas i energię, czy się rozłączamy?",
    note: "Wskazówka Agency Leaders: nie naciskać dalej po tym pytaniu, dać klientowi samemu podjąć decyzję mając konkretną liczbę przed oczami — ta sama zasada ciszy co przy podaniu ceny. Zadawane gdy klient sam nie potrafi określić momentu decyzji, nie jako pierwsza reakcja na każde wahanie.",
  },
  {
    id: "od21",
    stage: "closing",
    label: "To temat na za miesiąc",
    script:
      "Rozumiem, ale zanim to zostawimy na później — co konkretnie sprawia że to akurat za miesiąc, nie teraz? Budżet, sezon, czy ktoś inny musi to jeszcze zaakceptować?",
    followup:
      "Skoro wiemy co konkretnie stoi na przeszkodzie, sprawdźmy razem czy da się to rozwiązać już teraz, zamiast czekać miesiąc z tym samym kosztem który dalej biegnie.",
    note: "Wskazówka Agency Leaders: nie akceptować 'za miesiąc' biernie — dobry sprzedawca doradza, nie tylko czeka na 'tak'. Po poznaniu realnego powodu, spróbuj pokazać koszt dalszego zwlekania i sprawdź czy przeszkoda da się usunąć teraz, zanim zaakceptujesz odłożenie w czasie.",
  },
  {
    id: "od22",
    stage: "cena",
    label: "Obiekcja ogólna (cokolwiek poza 'nie widzę wartości')",
    script:
      "Rozumiem, to normalne. Finanse na bok - czy to co Panu pokazałem mogłoby być odpowiedzią na to czego Pan szuka?",
    followup: "Czemu Pan tak uważa?",
    note: "Jeśli klient potwierdza, zadaj followup i czekaj na jego własne uzasadnienie, nie podpowiadaj.",
  },
  {
    id: "od1_pozniej",
    stage: "closing",
    label: "Muszę się zastanowić (finanse i osoba trzecia już wyjaśnione)",
    script:
      "Rozumiem. Zgodzi się Pan, że decyzje biznesowe podejmujemy w oparciu o dotychczasowe doświadczenie?",
    followup:
      "To co powinien Pan teraz zrobić, żeby zmaksymalizować szansę na to, że to zadziała? Podjąć decyzję. Jaką decyzję?",
    note: "Używać TYLKO gdy finanse i osoba trzecia decyzyjna są już wyjaśnione. Po pierwszym pytaniu czekaj na 'tak'. Po followup czekaj na odpowiedź klienta, nie podpowiadaj.",
  },
  {
    id: "od23",
    stage: "pitch",
    label: "Brak case studies / referencji",
    script:
      "Powiem wprost - jesteśmy na etapie budowania portfolio w tej gałęzi, pierwsze wdrożenie ruszamy teraz. Dlatego dajemy gwarancję zwrotu całości, nie opieramy się tylko na zaufaniu. Mogę pokazać dokładne wyliczenie oszczędności na Pana danych, to jest twardszy dowód niż cudze referencje.",
  },
  {
    id: "od24",
    stage: "cena",
    label: "Płatność z góry",
    script:
      "Rozumiem tę wątpliwość. Robimy tak, bo klient który się nie angażuje finansowo od początku, rzadziej angażuje się we współpracy po swojej stronie - a to jest kluczowe dla wyniku. Dlatego gwarancja zwrotu całej kwoty jest zapisana w umowie, nie na słowo.",
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
