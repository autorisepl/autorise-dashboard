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
            "Dopytaj: 'Skoro trasy są stałe, gdzie mimo to traci się czas — dokumenty, faktury, rozliczenia?' — kandydat na document-ocr i payment-monitor, nie email-parser",
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
        text: "Ile szacuje {FORMA} że kosztuje firma ta ręczna praca miesięcznie — w godzinach, błędach, stresie?",
        cel: "Sprawić żeby klient sam wyliczył koszt bezczynności — mocniejsze niż podanie liczby przez Ciebie",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Pomóż klientowi policzyć: godziny × stawka + błędy + opóźnienia w fakturach.",
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
        text: "Zanim przejdziemy dalej — czy macie Państwo już zarezerwowany budżet na tego typu rozwiązanie w tym roku, czy to byłaby zupełnie nowa decyzja inwestycyjna?",
        cel: "Sprawdzić realne zasoby finansowe zanim zainwestujesz czas w pełny pitch — uniknąć 20 minut prezentacji komuś bez fizycznej możliwości zapłaty",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
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
          "Odzyskuje {FORMA} minimum 80 godzin miesięcznie, albo zwracamy 100% inwestycji. Bez wyjątków.",
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
        text: "I jeszcze jedno, zanim przejdziemy dalej: ryzyko finansowe jest po naszej stronie, nie po Waszej. Jeśli po 30 dniach nie odzyskacie minimum 80 godzin miesięcznie, oddajemy 100% pieniędzy. Bez pytań, bez wyjątków.",
        cel: "Stały, mocny wyróżnik różnicujący (Blok 'Arek' pkt 4, 2026-07-15) — nie wzmianka o gwarancji przy okazji, tylko jawne nazwanie kto ponosi ryzyko finansowe. Zbija najczęstszą niewypowiedzianą obiekcję 'a jeśli to nie zadziała' zanim padnie",
      },
      {
        t: "action",
        text: "SLAJD 3: System. Pokaż TYLKO moduły rekomendowane dla tego klienta z briefu.",
      },
      {
        t: "say",
        text: [
          "System transformacji wygląda tak: krok pierwszy, [moduł 1 opisany korzyścią].",
          "Krok drugi, [moduł 2 opisany korzyścią].",
          "Krok trzeci, [moduł 3 opisany korzyścią].",
          "Od tego co ma {FORMA} dziś, do stanu w którym te godziny wracają do biura.",
        ],
        cel: "System Transformacji A do B w 3 krokach — USP, konkretne kroki nie abstrakcyjna obietnica",
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
        text: "SLAJD 7: Gwarancja 80h. Ten slajd zamyka pitch, nie przewijaj dalej.",
      },
      {
        t: "say",
        text: ["To jest to co przygotowałem dla tej firmy.", "Jak {FORMA} to widzi?"],
      },
    ],
  },
  {
    id: "temperatura",
    nr: "5",
    label: "TEMPERATURA",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Jak to wygląda po tym co pokazałem — widzi {FORMA} w tym coś co faktycznie rozwiązuje problem, czy zostało coś co nie przekonuje?",
        cel: "Sprawdzić temperaturę bez sztywnej skali liczbowej, naturalniej niż 'gdzie jesteśmy 1-10'",
      },
    ],
    decision: {
      question: "Jaka odpowiedź?",
      options: [
        {
          trigger: "Wyraźnie pozytywna reakcja",
          action: "Gotowy na commitment",
          goToStepId: "commitment",
          tone: "positive",
        },
        {
          trigger: "Niepewna, wymaga dopytania",
          action: "Powiedz: 'Co konkretnie budzi wątpliwość, zanim przejdziemy dalej?'",
          goToStepId: "commitment",
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
    nr: "5a",
    label: "COMMITMENT — DECYDENT",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Czy {FORMA} jest osobą która podejmuje tę decyzję, czy potrzebujemy kogoś jeszcze?",
        cel: "Ustalić decyzyjność przed przejściem do Commitment Question — uniknąć pustego pitchu bez decydenta",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Jeśli 'muszę z żoną / wspólnikiem' — użyj obiekcji od2 lub od2b. Nie przechodź dalej bez decydenta.",
      },
      {
        t: "say",
        text: "Zanim przejdę do ceny, chcę zadać jedno pytanie. Jeżeli finanse okażą się akceptowalne, czy ten model współpracy rezonuje i widzi {FORMA} siebie w tym rozwiązaniu?",
        cel: "To jest właściwe Commitment Question, obowiązkowe przed każdą ceną — klient sam sobie sprzedaje odpowiedzią na kolejne pytanie",
      },
      { t: "client", text: "[TAK / niepewny / NIE]" },
    ],
    decision: {
      question: "Jak odpowiedział klient?",
      options: [
        {
          trigger: "TAK",
          action:
            "Zapytaj: 'A co spowodowało że Pan to powiedział?' Potem CISZA, czekasz, klient mówi sam. To najważniejszy moment całej rozmowy.",
          goToStepId: "cena",
          tone: "positive",
        },
        {
          trigger: "Niepewny, waha się",
          action:
            "Zapytaj: 'Co konkretnie budzi wątpliwość?' Wróć do wartości z pitchu zanim pójdziesz dalej, nie przechodź do ceny z niepewnym klientem.",
          goToStepId: "pitch",
          tone: "warning",
        },
        {
          trigger: "NIE",
          action:
            "Zapytaj wprost co musiałoby być inne. Jeśli odpowiedź wskazuje na brak dopasowania produktu, nie naciskaj na cenę, umów follow-up.",
          goToStepId: "pitch",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "cena",
    nr: "5b",
    label: "CENA",
    tag: "MÓWISZ",
    lines: [
      {
        t: "note",
        text: "PRZED wypowiedzeniem ceny, ustal na żywo (nie zakładaj uniwersalnej liczby): (a) konkretny termin zebrania dostępów w dniach — wpisz go w mini-formularzu obok kalkulatora, trafi do Notion i Załącznika nr 1; (b) potwierdź że {FORMA} rozumie mechanizm 18000/15000 — cena spada tylko przy obu warunkach naraz: płatność w 14 dni ORAZ dostępy w ustalonym terminie.",
      },
      {
        t: "say",
        text: [
          "Inwestycja to 18 000 zł, cena regularna, jednorazowo.",
          "Plus 4 000 zł miesięcznie opieki.",
          "Gwarancja: jeśli w 30 dni nie odzyska {FORMA} 80 godzin — zwrot 100% bez pytań.",
        ],
        cel: "Podać konkretną liczbę i przetrzymać ciszę — pierwsza osoba która przerwie milczenie zwykle przegrywa negocjację",
      },
      { t: "action", text: "CISZA. Minimum 20 sekund. Nie wypełniaj jej niczym." },
      {
        t: "note",
        text: "Jeśli klient nie odezwie się sam po 6-8 sekundach: 'Jak to {FORMA} widzi?' To jedyna dopuszczalna interwencja w tej ciszy, nic więcej.",
      },
      {
        t: "say",
        text: "Cena regularna to 18 tysięcy. Jeśli podpiszemy dziś i dostaniemy dostępy w ustalonym terminie, cena spada do 15 tysięcy — to nie kara za spóźnienie, to nagroda za sprawny start razem.",
        cel: "Gotowa fraza do wypowiedzenia po ciszy, jeśli {FORMA} pyta o rabat albo zwleka — mechanizm rabatu za terminowość, §5 ust. 1 umowy",
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
      { t: "say", text: "Co potrzebuje {FORMA} żeby podjąć decyzję dziś?" },
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
  {
    id: "warunki_umowy",
    nr: "5e",
    label: "WARUNKI UMOWY — POTWIERDŹ NA ŻYWO",
    tag: "POTWIERDZASZ",
    lines: [
      {
        t: "note",
        text: "Zanim wyślesz umowę, przejdź na głos przez te 5 punktów z klientem — każdy osobno, nie jednym zdaniem. To ostatni moment żeby uniknąć niejasności przed podpisem, nie krok do przeklikania w ciszy.",
      },
      {
        t: "say",
        text: "18 tysięcy regularnie, 15 tysięcy jeśli podpiszemy dziś i dostępy przyjdą w ustalonym terminie.",
        cel: "Cena — potwierdzenie mechanizmu 18000/15000 na głos, nie zakładanie że {FORMA} pamięta to z wcześniejszej części rozmowy",
      },
      {
        t: "say",
        text: "30-dniowa weryfikacja gwarancji liczy się od dnia gdy dostanę komplet dostępów, nie od dzisiejszego podpisu.",
        cel: "Start zegara — kluczowa różnica względem intuicji klienta ('podpisałem więc już się liczy'), musi być wypowiedziana wprost, nie domyślna",
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
    script:
      "To częste, rozumiem. Mamy opcję rat, dwa razy 9000 zł zamiast 18000 zł jednorazowo — rata nie kwalifikuje się do rabatu za terminowość, bo ten wymaga pełnej płatności w 14 dni. Zmienia to sytuację?",
  },
  {
    id: "od1_partner",
    stage: "closing",
    label: "Zastanowienie: chce skonsultować z kimś",
    script:
      "Jasne. Z kim chciałby Pan to skonsultować, to pomoże mi zrozumieć jak najlepiej pomóc.",
    note: "Po odpowiedzi: przejdź do od2 (żona) lub od2b (wspólnik) zależnie od tego kogo klient wskazał.",
  },
  {
    id: "od2",
    stage: "closing",
    label: "Muszę porozmawiać z żoną",
    script:
      "Gdyby Pana żona była dziś na tym spotkaniu i miała pełen kontekst tak jak Pan, co myśli Pan że by powiedziała?",
    followup:
      "A gdyby mimo pełnego kontekstu z jakiegoś powodu powiedziała nie, co Pan wtedy robi?",
    note: "Anchor decision przed rozłączeniem: 'Kiedy rozmawia Pan z żoną — dziś wieczór czy jutro?' Zapisz konkretną datę follow-up.",
  },
  {
    id: "od2b",
    stage: "closing",
    label: "Muszę porozmawiać ze wspólnikiem / partnerem biznesowym",
    script:
      "Rozumiem. Możemy umówić drugie spotkanie razem ze wspólnikiem, żeby miał ten sam kontekst co Pan?",
    note: "Opcja A: umów 2. spotkanie z decydentem. Opcja B: reframing — 'Co musiałoby się wydarzyć żeby Pan mógł podjąć tę decyzję samodzielnie?'",
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
      "Rozumiem, to nie jest mała kwota jednorazowo. Mamy raty: dwa razy 9000 zł (cena regularna 18000, rata nie kwalifikuje się do rabatu za terminowość). Retainer zostaje 4000 zł miesięcznie. Ułatwia to decyzję?",
  },
  {
    id: "od3_wartosc",
    stage: "cena",
    label: "Za drogo: wątpliwość czy się zwróci",
    script:
      "Dobre pytanie. Sam Pan policzył ze mną że to [kwota] miesięcznie, prawda? 15000 zł zwraca się w [X] miesięcy, a retainer jest mniejszy niż jedna trzecia tego co teraz tracicie. Widzi Pan to inaczej po tych liczbach?",
  },
  {
    id: "od3_konkurencja",
    stage: "cena",
    label: "Za drogo: porównuje z inną ofertą",
    script:
      "Jasne. Kto i co dokładnie oferuje za tę cenę? Dają gwarancję konkretnego efektu na umowie, tak jak my dajemy 80 godzin albo zwrot całości?",
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
      "Tak, mamy opcję 2 × 9 000 zł zamiast 18 000 zł jednorazowo — to cena regularna, rata nie kwalifikuje się do rabatu za terminowość (ten wymaga pełnej płatności w 14 dni). Retainer zostaje 4 000 zł/mc. Przy ratach wdrożenie startuje po pierwszej wpłacie. Pasuje Panu?",
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
    id: "od16",
    stage: "cena",
    label: "Co jeśli nie zapłacę w 14 dni i stracę rabat?",
    script:
      "To nie jest pułapka, to nagroda za sprawny start — po prostu wracamy wtedy do ceny regularnej, 18 tysięcy zamiast 15. Nic więcej się nie zmienia.",
  },
  {
    id: "od17",
    stage: "cena",
    label: "A jeśli godziny oszczędności się nie potwierdzą bo się spóźniliście z integracją?",
    script:
      "Weryfikacja 30 dni liczy się od faktycznego startu, czyli od zebrania dostępów — jeśli to my się spóźnimy z integracją, zegar jeszcze się nie zaczął, więc to nie obciąża Pana. Obciąża Pana tylko jeśli to Państwa strona spóźni dostępy mimo ustalonego terminu.",
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
