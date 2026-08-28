// Zasada: jeśli Agency Leaders nie dał gotowej instrukcji na konkretną sytuację,
// rozwiązanie buduje się z ich zasad ogólnych (personalizacja, konkret zamiast
// ogólnika, klient sam dochodzi do wniosku przez pytania), nie jako coś oderwanego
// od frameworku. Każda nowa linia dialogowa w tym pliku podlega tej zasadzie.
//
// Kolejność kroków 2-2k: ICP (flota, biuro, decydent) sprawdzane ZARAZ PO pierwszym
// pytaniu diagnostycznym, PRZED szczegółową diagnozą dokumentów (2c-2g). Powód:
// jeśli klient nie spełnia twardych progów ICP (min. 2 osoby w biurze, obecność
// decydenta), rozmowa kończy się od razu — bez inwestowania czasu w pięć pytań
// dokumentowych które i tak nie zostaną wykorzystane.
//
// Zasada gwarancji: obietnica dotyczy zawsze konkretnych, wspólnie policzonych i przez
// klienta potwierdzonych procesów manualnych, nigdy ogólnej wydajności zespołu czy
// przychodu firmy. Każda wzmianka o gwarancji w skrypcie musi to jasno zaznaczać,
// żeby uniknąć rozczarowania klienta przy odbiorze po 30 dniach.
//
// Zasada języka mówionego (przebudowa 2026-08-08): każda linia typu "say"/"script"/
// "sayAfter"/"followup" to tekst który setter WYPOWIADA na głos. Zero myślników i
// dwukropków wewnątrz takich zdań — to znaki pisane, nie mówione, rozbij na osobne
// zdania. Zero słowa "Kickoff" w rozmowie z klientem, zawsze "spotkanie wdrożeniowe".
// Zero pytań tłumaczących klientowi (właścicielowi firmy transportowej) branżowe
// pojęcia jak CMR czy potwierdzenie dostawy — pytaj wprost, po partnersku. Zero
// założeń o sytuacji klienta, których nie wypowiedział. Liczby w ustach settera
// zaokrąglone, dokładne zostają wyłącznie w kalkulatorze. Notatki (`note`) i cele
// (`cel`) są WYŁĄCZNIE dla settera, nie są czytane klientowi — mogą zawierać
// dwukropki i pełne instrukcje.

import type { IcpRule, Objection, Step } from "./types";

export const STEPS_K: Step[] = [
  {
    id: "opener",
    nr: "1",
    label: "OPENING",
    tag: "MÓWISZ",
    lines: [
      { t: "say", text: "Dzień dobry, Pan {IMIĘ}?" },
      { t: "client", text: "Tak, słucham." },
      {
        t: "say",
        text: "Dzień dobry, z tej strony {IMIĘ_SPRZEDAWCY} z Autorise. Pomagamy firmom transportowym zdejmować z biura powtarzalną, ręczną robotę, i robimy to na tyle pewnie, że umówiony efekt zapisujemy w umowie. Jeśli go nie dowieziemy, zwracamy całą kwotę. Dzwonię, bo zostawił Pan u nas formularz o oszczędzaniu czasu w biurze i chcę sprawdzić, czy mamy jak Panu pomóc.",
        cel: "Klient najpierw wie kto dzwoni i co robicie, potem po co ten telefon, i że nie ryzykuje.",
      },
    ],
    nextStepId: "diagnoza_otwarcie",
  },
  {
    id: "diagnoza_otwarcie",
    nr: "2",
    label: "OTWARCIE DIAGNOZY",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Co spowodowało że akurat teraz zdecydował się Pan wypełnić ten formularz?",
        cel: "Znaleźć konkretny wyzwalacz i realny ból, zanim przejdziesz do reszty pytań.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    expected: "Klient nazywa konkretny powód, wyzwalacz albo bolączkę, choćby ogólnie.",
    transition:
      "Rozumiem, dziękuję. To już mi coś mówi. Zadam teraz kilka pytań o liczby, żeby dobrać skalę.",
  },
  {
    id: "diagnoza_icp_flota",
    nr: "2a",
    label: "ICP: FLOTA I BIURO",
    tag: "PYTASZ",
    captureField: "role",
    lines: [
      {
        t: "say",
        text: "Ile pojazdów ma Pan teraz aktywnie?",
        cel: "Zweryfikować orientacyjną skalę floty pod kątem ICP (10-150 pojazdów).",
      },
      {
        t: "say",
        text: "A tak z grubsza, roczne obroty firmy to bardziej okolice dwóch, trzech milionów, czy raczej powyżej pięciu? Pytam, żeby dobrać skalę tego co Panu pokażę. Jeśli woli Pan nie mówić, spokojnie idziemy dalej.",
        cel: "Orientacyjny drugi filtr ICP, widełki trzymaj nisko bo ICP zaczyna się od około miliona złotych rocznie na działania.",
      },
      {
        t: "note",
        text: "Pytanie opcjonalne. Jeśli klient nie chce odpowiedzieć, to nie jest blokada. Przechodzisz dalej bez naciskania.",
      },
      {
        t: "say",
        text: "Ile osób pracuje w biurze przy zleceniach, dokumentach i fakturach?",
        cel: "Twardy próg ICP, poniżej dwóch osób w biurze ból zwykle za mały żeby wdrożenie się zwróciło.",
      },
      {
        t: "say",
        text: "A jak to się rozkłada na role? Ilu jest spedytorów, ile osób od faktur i rozliczeń, czy jest ktoś od dyspozycji?",
        cel: "Rozbić biuro na role. Wpisujesz je od razu w tabelę niżej, każda rola osobno, bo mają różne stawki i różny czas pracy ręcznej.",
      },
      { t: "client", text: "[podział na role]" },
    ],
    expected:
      "Klient podaje liczbę pojazdów i rozkład osób w biurze, co najmniej dwie osoby przy zleceniach i dokumentach.",
    transition: "Jasne, notuję. Krótkie pytanie o to, kto u Was podejmuje decyzje.",
  },
  {
    id: "diagnoza_icp_decydent",
    nr: "2b",
    label: "ICP: DECYDENT",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Jest Pan właścicielem firmy?",
        cel: "Ustalić czy rozmawiasz z osobą decyzyjną, żeby nie umówić spotkania bez sensu.",
      },
    ],
    expected: "Klient jest właścicielem albo wspólnikiem firmy.",
    transition: "Dobrze. Przejdźmy do tego, jak dziś u Was wygląda praca z systemem i dokumentami.",
  },
  {
    id: "diagnoza_tms",
    nr: "2c",
    label: "TMS I PRACA MANUALNA",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Jakiego systemu używacie do zarządzania zleceniami i flotą? Trans.eu, Timocom, coś własnego?",
        cel: "Ustalić co klient już ma, żeby wiedzieć czego nie trzeba zastępować.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    expected:
      "Klient podaje nazwę systemu albo mówi, że pracuje na Excelu, WhatsAppie i telefonie.",
    transition:
      "Rozumiem, zapisuję. Rozłożymy teraz na części to, co przechodzi przez biuro ręcznie.",
  },
  {
    id: "diagnoza_dokumenty_zlecenie",
    nr: "2d",
    label: "ZLECENIE TRANSPORTOWE",
    tag: "MÓWISZ",
    calculatorFlag: "zlecenia",
    lines: [
      {
        t: "say",
        text: "Zlecenia od Waszych klientów, te którymi zamawiają u Was przewóz, jak do Was trafiają? Ktoś przepisuje je ręcznie z maila albo PDF-a do systemu, czy wpadają tam same?",
        cel: "Sprawdzić czy przyjęcie zlecenia od zleceniodawcy generuje pracę ręczną.",
      },
      { t: "client", text: "[opis]" },
    ],
    expected:
      "Klient potwierdza, że ktoś ręcznie przepisuje przychodzące zlecenia z maila albo PDF-a do systemu.",
    transition: "Rozumiem, czyli ktoś musi to za każdym razem przeklikać do systemu. Idźmy dalej.",
  },
  {
    id: "diagnoza_dokumenty_cmr",
    nr: "2e",
    label: "LIST PRZEWOZOWY I POTWIERDZENIE DOSTAWY",
    tag: "MÓWISZ",
    calculatorFlag: "cmr",
    lines: [
      {
        t: "say",
        text: "Jak to wygląda z CMR-ami? Po kursie, jak to do Was wraca?",
        cel: "Sprawdzić czy dokumenty po kursie wymagają ręcznego przepisywania.",
      },
      {
        t: "say",
        text: "Potwierdzenia dostawy wchodzą u Pana razem z CMR, czy osobno?",
        cel: "Sprawdzić czy u klienta potwierdzenie dostawy to osobny druk obok CMR.",
      },
      {
        t: "note",
        text: [
          "Papier fizyczny lub zdjęcie na WhatsApp/mailem: moduł Dokumenty i pliki, zaznacz niżej.",
          "Elektroniczne, np. eCMR: inny profil klienta, sprawdź czy dane i tak trzeba ręcznie przenieść do rozliczeń.",
        ],
      },
    ],
    expected:
      "Klient mówi, że CMR i potwierdzenia dostawy wracają papierem albo zdjęciem i ktoś przepisuje z nich dane.",
    transition: "Czyli to kolejne miejsce, gdzie ktoś ręcznie przepisuje z papieru. Lecę dalej.",
  },
  {
    id: "diagnoza_dokumenty_faktura",
    nr: "2f",
    label: "FAKTURY I ROZLICZENIA",
    tag: "MÓWISZ",
    calculatorFlag: "faktury_recznie",
    lines: [
      {
        t: "say",
        text: "A z fakturami jak to wygląda? Tymi które wystawiacie i tymi które dostajecie. Kto to ogarnia i wpisuje do księgowości?",
        cel: "Sprawdzić skalę pracy ręcznej przy fakturach.",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "say",
        text: "Ile mniej więcej faktur miesięcznie przez to przechodzi, licząc te wystawiane i te otrzymane?",
        cel: "Zebrać wolumen faktur, przyda się przy szacowaniu czasu ręcznej pracy.",
      },
    ],
    expected: "Klient mówi, że ktoś w firmie ręcznie wpisuje faktury do księgowości.",
    transition: "Dobrze, mam ten obszar. Jeszcze jedno pytanie z tej części.",
  },
  {
    id: "diagnoza_dokumenty_status",
    nr: "2g",
    label: "WIDOCZNOŚĆ STATUSU ZLECENIA",
    tag: "MÓWISZ",
    calculatorFlag: "komunikacja",
    lines: [
      {
        t: "say",
        text: "I ostatnia rzecz. Jak Pan sam sprawdza dziś status jakiegoś zlecenia? Trzeba zadzwonić do spedytora, czy widać to od razu w systemie?",
        cel: "Sprawdzić czy właściciel widzi status zlecenia bez dzwonienia do spedytora.",
      },
    ],
    expected:
      "Klient mówi, że żeby poznać status zlecenia trzeba dzwonić do spedytora albo dopytywać.",
    transition: "To osobny, ważny temat, niezależny od dokumentów. Przejdźmy do liczb.",
  },
  {
    id: "diagnoza_stawka",
    nr: "2h",
    label: "STAWKA GODZINOWA PER ROLA",
    tag: "PYTASZ",
    captureField: "stawka",
    lines: [
      {
        t: "say",
        text: "Ile mniej więcej kosztuje Was godzina pracy takiej osoby, razem z narzutami? Jeśli spedytor i księgowość mają inne stawki, powie mi Pan osobno.",
        cel: "Zebrać stawkę godzinową osobno dla każdej roli, bo do kalkulatora idą różne.",
      },
      { t: "client", text: "[stawki per rola lub niechęć do podania]" },
    ],
    expected:
      "Klient podaje orientacyjną stawkę godzinową, choćby w widełkach, dla każdej roli albo jedną wspólną.",
    transition: "Dziękuję. Zbiorę to teraz w całość i podam Panu konkretną liczbę.",
  },
  {
    id: "diagnoza_kalkulator",
    nr: "2i",
    label: "KALKULATOR ROI",
    tag: "KALKULATOR",
    hasCalculator: true,
    lines: [
      {
        t: "say",
        text: "Ostatnia rzecz zanim policzę. Ile z dnia takiej osoby schodzi realnie na tę powtarzalną, ręczną robotę, o której mówiliśmy? Godzina, dwie, a może więcej?",
        cel: "Bez godzin dziennie per rola cały wynik jest zgadywany, to jest liczba na której stoi reszta rozmowy.",
      },
      { t: "client", text: "[godziny dziennie per rola]" },
      {
        t: "say",
        text: "Dokładny rozkład na poszczególne zadania zmierzymy razem na spotkaniu wdrożeniowym. Teraz liczę orientacyjną całość.",
        cel: "Ustawić oczekiwanie że to pierwsze przybliżenie, dokładny pomiar jest dopiero na spotkaniu wdrożeniowym.",
      },
      {
        t: "note",
        text: "Uzupełnij godziny dziennie przy każdej roli w tabeli niżej. Bez tego wynik jest niepełny. Moduły do wdrożenia pojawiają się z przycisków w krokach 2d do 2g, nie zaznaczasz ich tutaj.",
      },
    ],
    nextStepId: "diagnoza_liczba",
  },
  {
    id: "diagnoza_liczba",
    nr: "2j",
    label: "PODANIE LICZBY KLIENTOWI",
    tag: "MÓWISZ",
    hasModuleRecommendation: true,
    lines: [
      {
        t: "note",
        text: "Odczytaj wynik z kalkulatora poniżej. W rozmowie mów liczbami zaokrąglonymi, dokładne wartości zostają w kalkulatorze dla Ciebie.",
      },
      {
        t: "say",
        text: [
          "Jak tak na to patrzę, przy tej skali robi się z tego całkiem sporo.",
          "Z moich wyliczeń na szybko wychodzi, że Wasz zespół traci miesięcznie około [WYNIK Z KALKULATORA] godzin. To koszt rzędu [WARTOŚĆ PLN] miesięcznie.",
        ],
      },
      {
        t: "say",
        text: "Nie każdą z tych godzin da się zautomatyzować w stu procentach, bo część to rozmowy z klientami i decyzje. Realistycznie mówimy o około 70 procentach tego czasu, czyli w okolicach [POTENCJAL_H] godzin miesięcznie wracających do biura.",
        cel: "Budować wiarygodność przez uczciwość, nie obiecywać więcej niż realnie możliwe.",
      },
      {
        t: "say",
        text: "Ta liczba dotyczy konkretnie tych zadań które przed chwilą razem policzyliśmy. Nie ogólnej wydajności zespołu, tylko tej powtarzalnej pracy którą Pan sam opisał.",
        cel: "Zapobiec nieporozumieniu przy zwrocie na umowie, bo dotyczy on policzonych procesów, nie ogólnej wydajności firmy.",
      },
    ],
    nextStepId: "diagnoza_czas",
  },
  {
    id: "diagnoza_czas",
    nr: "2k",
    label: "CO ZROBIŁBY Z TYMI GODZINAMI",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Gdyby te [POTENCJAL_H] godzin miesięcznie wróciły do biura, co by Pan z nimi zrobił?",
        cel: "Sprawić żeby klient sam nazwał korzyść, bo to przekonuje mocniej niż gdy powiesz to Ty.",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Zapamiętaj dokładne słowa klienta z tej odpowiedzi, przydadzą się żeby zacytować mu je dosłownie na rozmowie sprzedażowej. To działa bardzo mocno.",
      },
    ],
    expected: "Klient konkretnie nazywa, co zrobiłby z odzyskanym czasem.",
    transition:
      "Zapiszę dokładnie to, co Pan powiedział. Przejdźmy do tego, jak sprawdzić to u Pana na spotkaniu.",
  },
  {
    id: "spotkanie",
    nr: "3",
    label: "SPOTKANIE JAKO ROZWIĄZANIE",
    tag: "ZAMKNIĘCIE",
    lines: [
      {
        t: "note",
        text: "Jeśli rozmówca nie jest decydentem (pole „decydent: nie” w Pipeline), zamiast propozycji poniżej umów od razu 45 minut wspólnie z osobą decyzyjną. Jeśli sam jest decydentem, użyj propozycji poniżej.",
      },
      {
        t: "say",
        text: [
          "Na podstawie tego co Pan powiedział, myślę że możemy Pana firmie realnie pomóc.",
          "Mam propozycję. Spotkanie przez internet, 45 minut. Pokażę dokładnie jak wygląda nasz system dla firmy o tej skali, na Pana liczbach.",
        ],
      },
      {
        t: "say",
        text: "Czy bardziej pasowałby Panu termin w tym, czy w przyszłym tygodniu?",
      },
      { t: "client", text: "[wybiera tydzień]" },
      {
        t: "say",
        text: "A [WYBRANY TYDZIEŃ], bardziej rano czy po południu?",
      },
      { t: "client", text: "[proponuje porę albo nie chce ustalać teraz]" },
    ],
    expected: "Klient podaje konkretny dzień i porę spotkania.",
    transition: "Dobrze, rezerwuję ten termin od razu, potwierdzi mi go Pan za chwilę.",
  },
  {
    id: "spotkanie_rezerwacja",
    nr: "3b",
    label: "REZERWACJA TERMINU",
    tag: "ZAMKNIĘCIE",
    lines: [
      {
        t: "say",
        text: "To ja od razu zarezerwuję nam ten termin. [DZIEŃ] o [GODZINA], pasuje?",
      },
      { t: "client", text: "[potwierdza]" },
      {
        t: "action",
        text: "Zarezerwuj termin bezpośrednio w Calendly na podany dzień i godzinę, teraz, w trakcie rozmowy. Klient tylko potwierdza, nie wysyłasz mu linku do samodzielnego wyboru. Link zostaje jako wariant zapasowy wyłącznie gdy klient nie chce ustalić terminu na żywo (patrz obiekcja poniżej).",
      },
      {
        t: "say",
        text: "Jeszcze jedno. Całe wdrożenie, od tego spotkania aż po uruchomienie systemu u Pana w firmie, prowadzę osobiście. Nie przekazuję tego nikomu innemu. Będzie Pan miał jeden kontakt przez cały proces, nie różnych ludzi na różnych etapach.",
        textSetter:
          "Jeszcze jedno. Całe wdrożenie, od tego spotkania aż po uruchomienie systemu u Pana w firmie, prowadzi osobiście założyciel Autorise, Michał. Nie przekazuje tego nikomu innemu. Będzie Pan miał jeden kontakt przez cały proces, nie różnych ludzi na różnych etapach.",
        cel: "Budować autorytet i ciągłość, klient ma jeden kontakt przez cały proces zamiast przekazywania między działami.",
      },
      {
        t: "say",
        text: "Dostanie Pan potwierdzenie mailem, plus przypomnienie SMS dzień przed.",
      },
      {
        t: "action",
        text: "Zmień status w Pipeline na 'Discovery umówione'. Data Discovery: data wybranego slotu.",
      },
    ],
  },
];

export const OBJECTIONS_K: Objection[] = [
  // Obiekcje otwierające — każda kończy się przejściem do kroku 2
  {
    id: "ok_nie_kojarzy",
    label: "Nie kojarzy, nie wie o co chodzi, co sprzedajecie, to nie ja wypełniałem",
    stage: "opening",
    script:
      "Już tłumaczę. Autorise buduje firmom transportowym rozwiązania, które zdejmują z biura powtarzalną, ręczną robotę, każdą taką gdzie ktoś przepisuje albo przekleja dane z jednego miejsca w drugie. Nie wiem jeszcze co u Pana zajmuje najwięcej czasu, więc zamiast zgadywać, chciałbym zadać kilka krótkich pytań o to jak wygląda u Pana zwykły dzień w biurze. Od razu będzie wiadomo, czy jest tu w ogóle co usprawniać. Możemy tak zrobić?",
    followup:
      "Jeśli mówi, że formularz wypełnił ktoś inny, albo że musi to przemyśleć. Rozumiem, to bez znaczenia. I tak najlepiej sprawdzić to na Pana liczbach, więc zadam te kilka pytań i będzie Pan miał obraz sytuacji.",
    nextStepId: "diagnoza_otwarcie",
  },
  {
    id: "ok_ms",
    label: "Od razu chce umówić spotkanie",
    stage: "opening",
    script:
      "Chętnie. Żeby spotkanie miało sens dla nas obu, chciałbym najpierw zadać kilka krótkich pytań o firmę. To dosłownie chwila. Dobrze?",
    nextStepId: "diagnoza_otwarcie",
  },
  {
    id: "ok_em",
    label: "Wyślij na maila",
    stage: "opening",
    script:
      "Mogę wysłać materiały, ale wolałbym zadać kilka krótkich pytań, to naprawdę chwila, żeby nie były to ogólne informacje tylko coś dopasowanego pod Pana firmę.",
    followup:
      "Rozumiem. W takim razie wyślę Panu ogólne informacje na maila, a gdyby po przeczytaniu chciał Pan wrócić do tematu, chętnie się odezwę.",
    note: "Po followup status w Pipeline to follow-up, nie sprawa zamknięta.",
    nextStepId: "diagnoza_otwarcie",
  },
  // Standardowe obiekcje
  {
    id: "ok_nie_czasu",
    label: "Nie ma czasu / spieszy się / minęły już 2 minuty",
    stage: "opening",
    script:
      "Rozumiem. Zajmę Panu naprawdę chwilę, bo chodzi o czas i pieniądze które biuro traci co miesiąc na powtarzalnej, ręcznej robocie. Da rady teraz, czy woli Pan żebym oddzwonił o konkretnej porze?",
    followup:
      "Jasne, nie będę naciskać. Kiedy jest Panu wygodniej, jutro rano czy raczej po południu? Zapiszę konkretny termin i wtedy zadzwonię.",
    note: "Zbijasz raz. Jeśli klient dalej nie chce, umawiasz konkretny termin, dzień i porę, zapisujesz w Pipeline jako follow-up i nie przekonujesz dalej. Szczery brak czasu szanujesz, wymówki nie forsujesz.",
    nextStepId: "diagnoza_otwarcie",
  },
  {
    id: "brak_konkretu",
    label: "Nie potrafi nazwać powodu, „trudno powiedzieć”, „z ciekawości”",
    stage: "opening",
    script:
      "Rozumiem, czasem trudno to od razu ująć w słowa. Niech Pan opowie po prostu, jak wygląda u Pana zwykły dzień w biurze. Od momentu gdy wchodzi zlecenie, aż po to jak się z niego rozliczacie.",
    followup:
      "A gdy przychodzi dużo zleceń naraz albo spedytora nie ma przez chorobę czy urlop, to biuro wtedy przystaje, czy ktoś przejmuje to płynnie?",
    note: "Najpierw otwarty opis dnia. Dopiero gdy to za mało, dopytujesz o konkretną sytuację pod obciążeniem. Jeśli po obu klient dalej mówi, że wszystko działa bez zarzutu, przejdź do obiekcji „W sumie nie mam żadnych problemów”. Jeśli pojawił się realny ból, wracasz do pytania o zespół i flotę.",
    nextStepId: "diagnoza_icp_flota",
  },
  {
    id: "brak_bolu",
    label: "„W sumie nie mam żadnych problemów”, wszystko mamy ogarnięte",
    stage: "opening",
    script:
      "Zanim odpuszczę, jedno pytanie. Czy jest w biurze jakaś czynność, którą robicie w kółko ręcznie i która najbardziej Pana uwiera, nawet jeśli dziś jakoś się to spina? Jeśli nie, to spokojnie. Zapiszę Wasz kontakt i odezwę się za jakiś czas, bo firmy tej wielkości zwykle po kilku miesiącach dochodzą do punktu, w którym tej roboty robi się za dużo.",
    note: "Używasz po dwóch nieudanych próbach pokazania bólu, nie sprzedajesz na siłę. Jeśli klient wskaże jakąś uciążliwość, wróć do diagnozy od pytania o zespół i flotę. Jeśli nie, status w Pipeline to Nieaktywny follow-up, data re-engagement za 3 miesiące.",
  },
  {
    id: "ok3",
    label: "Mam już program do zarządzania",
    stage: "opening",
    script:
      "To dobrze, większość naszych klientów ma TMS. My nie zastępujemy systemu, zdejmujemy z biura ręczną robotę wokół niego. Mam kilka pytań jak to dziś wygląda u Pana, dobrze?",
    nextStepId: "diagnoza_otwarcie",
  },
  {
    id: "ok4",
    label: "Jadę na urlop / wracam za X tygodni",
    stage: "wszedzie",
    script: "Rozumiem. Kiedy Pan wraca?",
    followup: "Zapisuję. Zadzwonię do Pana [data po powrocie]. Życzę udanego urlopu.",
    note: "Status: Nieaktywny (follow up). Data re-engagement: dzień po powrocie.",
  },
  {
    id: "ok5",
    label: "Muszę porozmawiać ze wspólnikiem / synem / żoną",
    stage: "wszedzie",
    script:
      "A mogliby Państwo dołączyć we dwoje na spotkanie przez internet? Trwa 45 minut, mam przygotowane liczby konkretnie dla Pana firmy. Wtedy oboje macie pełen obraz i decydujecie razem.",
    followup:
      "Rozumiem, że teraz nie da rady we dwoje. To powie mi Pan, co musiałoby się na tym spotkaniu wydarzyć, żeby druga osoba powiedziała tak?",
  },
  {
    id: "icp_ponizej_progu",
    label: "Poniżej progu ICP, jedna osoba w biurze",
    stage: "icp",
    script:
      "Dziękuję za szczerość. Przy tej wielkości biura pewnie nie poczułby Pan jeszcze realnej różnicy, więc szczerze, nie namawiam na coś co się nie zwróci. Mogę zapisać kontakt i wrócić za jakieś 3 miesiące, jak zespół się powiększy, dobrze?",
    note: "Status: Niekwalifikowany. Jeśli zgoda: data re-engagement +90 dni w Pipeline. Koniec rozmowy, nie wracaj do diagnozy.",
  },
  {
    id: "icp_nie_decydent",
    label: "Rozmówca nie jest decydentem",
    stage: "icp",
    script:
      "Rozumiem. Czym się Pan zajmuje w firmie, i zgłosił się Pan z własnej inicjatywy, czy na prośbę właściciela?",
    followup:
      "Dobrze, to zbierzmy teraz wszystkie informacje, a na końcu ustalimy jak najlepiej zorganizować kolejny krok, tak żeby właściciel też miał pełen obraz.",
    note: "Zaznacz w Pipeline (pole 'decydent: nie'), żeby w kroku 3 zaproponować 45 minut wspólnie z osobą decyzyjną zamiast standardowego terminu. Poczekaj na odpowiedź rozmówcy, potem followup. Kontynuujesz pełną diagnozę z tą osobą, nie skracasz rozmowy i nie umawiasz spotkania na tym etapie.",
    nextStepId: "diagnoza_tms",
  },
  {
    id: "zewnetrzne_biuro_ksiegowe",
    label: "Faktury: zewnętrzne biuro rachunkowe",
    stage: "diagnoza",
    script:
      "Jasne, biuro rachunkowe zajmuje się rozliczeniami. A kto u Was przygotowuje i wysyła im dokumenty, faktury, potwierdzenia dostaw? To zwykle ta sama osoba co reszta administracji, zgadza się?",
    note: "Nawet z zewnętrzną księgowością ktoś wewnątrz firmy zbiera i wysyła dokumenty ręcznie. To wciąż ból do zmapowania w kalkulatorze (moduł Dokumenty i pliki).",
  },
  {
    id: "tms_panel_zewnetrzny",
    label:
      "Pracuje tylko przez zewnętrzny panel (Amazon Relay, panel kurierski, giełda z własnym rozliczeniem)",
    stage: "diagnoza",
    script:
      "Rozumiem, czyli większość obiegu macie w tym panelu. Powie mi Pan, co przy tym robicie jeszcze ręcznie obok samego panelu? Wystawianie faktur, zbieranie potwierdzeń, pilnowanie płatności?",
    note: "Ten profil nie pasuje do pytań o CMR na giełdach transportowych. Zamiast lecieć krokami 2d do 2g po kolei, dopytaj ogólnie o ręczną robotę wokół panelu i wróć do kroku, który realnie pasuje do jego odpowiedzi.",
  },
  {
    id: "konkurencja_m365",
    label: "Ma wszystko w Microsoft 365 / Power Automate",
    stage: "diagnoza",
    script:
      "To brzmi jak solidna konfiguracja. Sprawdzam zwykle jedną rzecz, czy to faktycznie odczytuje dane z dokumentu i wpisuje je samo, czy tylko przenosi plik do folderu, a ktoś i tak musi go otworzyć i przepisać ręcznie?",
    followup:
      "A co się dzieje, gdy dokument wygląda inaczej niż zwykle? System radzi sobie z tym sam, czy ktoś musi wtedy ręcznie poprawić? I kto to wszystko utrzymuje, gdy przestaje działać po aktualizacji?",
    note: "Większość konfiguracji Power Automate przenosi pliki, nie wyciąga z nich danych, i utrzymuje ją jedna osoba która to kiedyś ustawiła. Jeśli klient ma naprawdę zaawansowaną integrację z prawdziwym odczytem dokumentów i utrzymaniem, przyznaj to uczciwie, nie naciskaj wbrew faktom.",
  },
  {
    id: "po_co_to_pytanie",
    label: "Pyta po co te pytania, podważa ich sens",
    stage: "diagnoza",
    script:
      "Pytam, bo od tego zależy czy w ogóle mam dla Pana sensowną propozycję. Wolę sprawdzić to teraz, w kilku zdaniach, niż umawiać spotkanie które niczego by nie wniosło.",
    note: "Krótkie, szczere uzasadnienie, bez tłumaczenia się i bez przedłużania wątku. Po odpowiedzi wracaj natychmiast do pytania diagnostycznego które przerwał.",
  },
  {
    id: "czas_milczy",
    label: "Milczy po pytaniu co zrobiłby z czasem",
    stage: "kalkulator",
    script:
      "To może być na przykład więcej zleceń przy tej samej ekipie, mniej błędów w dokumentach, szybsza obsługa klientów, mniej nadgodzin dla zespołu. Który z tych kierunków jest dla Pana teraz ważny?",
  },
  {
    id: "czas_obronny",
    label: "Obawia się zwolnień pracowników",
    stage: "kalkulator",
    script:
      "Jasne, nie chodzi o zwalnianie nikogo. Chodzi o to, żeby ten sam zespół miał więcej przestrzeni na klientów zamiast tonąć w papierach. Ma to dla Pana znaczenie?",
  },
  {
    id: "czas_przeskakuje",
    label: "Przeskakuje od razu do pytania o cenę",
    stage: "kalkulator",
    script: "Do ceny zaraz dojdziemy, chcę tylko dokończyć ten wątek.",
    note: "Jeśli mimo to nalega: nie walcz, przejdź dalej normalnie, zanotuj w Pipeline że pytanie o korzyść czasu nie zostało w pełni odpowiedziane.",
  },
  {
    id: "stawka_niechec",
    label: "Nie chce podać dokładnej stawki godzinowej",
    stage: "kalkulator",
    script:
      "Rozumiem, to szczegół księgowy. Wystarczy orientacyjnie, to bliżej 40, 55, czy 70 złotych za godzinę z narzutami?",
    note: "Wpisz podaną wartość orientacyjną do kalkulatora, nie zostawiaj pustego pola.",
  },
  {
    id: "spedytorzy_dorazni",
    label: "Spedytorzy nie są zatrudnieni na stałe",
    stage: "diagnoza",
    script:
      "Rozumiem, czyli pracują doraźnie, na wezwanie. A gdy jest dużo zleceń naraz, ile osób realnie wtedy przy tym siedzi i ile godzin to zajmuje?",
    note: "ICP i kalkulator liczą się tak samo. Pytaj o realną liczbę osób i godzin w szczycie, niezależnie od formy zatrudnienia. Forma zatrudnienia nie zmienia kwalifikacji, liczy się faktyczny czas pracy nad dokumentami.",
  },
  {
    id: "spotkanie_link_zapasowy",
    label: "Nie chce ustalać terminu teraz, wariant zapasowy z linkiem",
    stage: "closing",
    script:
      "Rozumiem, nie ma problemu. Wyślę Panu link do samodzielnej rezerwacji przez Calendly, wybierze Pan dogodny termin. Dostanie Pan też automatyczne przypomnienie SMS dzień przed.",
    note: "Użyj wyłącznie gdy klient wyraźnie nie chce ustalić terminu na żywo. Domyślna ścieżka to rezerwacja terminu bezpośrednio na tej rozmowie (krok 3, opcja 'podaje dzień i porę'). Wyślij link Calendly natychmiast po rozmowie, nie 'zaraz', teraz. Zmień status w Pipeline na 'Discovery umówione' dopiero gdy klient faktycznie zarezerwuje termin w Calendly, nie w momencie wysłania linku.",
  },
];

export const ICP_RULES: IcpRule[] = [
  { ok: true, label: "Biuro", val: "Minimum 2 osoby przy zleceniach. To twardy próg." },
  { ok: true, label: "Decydent", val: "Właściciel lub wspólnik, weryfikowany na kwalifikacji." },
  {
    ok: true,
    label: "Ból",
    val: "Ręczna praca potwierdzona kalkulatorem, od 80 godzin miesięcznie.",
  },
  { ok: true, label: "Flota", val: "Orientacyjnie 10 do 150 pojazdów." },
  {
    ok: true,
    label: "Przychód roczny",
    val: "Orientacyjny filtr obok floty. ICP zaczyna się od około miliona złotych rocznie na działania. Nie blokuje rozmowy jeśli klient nie odpowie.",
  },
  {
    ok: false,
    label: "Odrzuć",
    val: "Mniej niż 2 osoby w biurze albo łączny potencjał poniżej 80 godzin miesięcznie.",
  },
];

// Frazy potwierdzające, przypięte do etapu rozmowy. Każda jest tak zbudowana,
// żeby pasowała niezależnie od tego co klient powie, także tuż po obiekcji:
// najpierw krótkie potwierdzenie że słuchasz, potem naturalny mostek do tego co
// dzieje się na tym etapie dalej. Setter czyta etykietę etapu i bierze frazę
// z tej grupy.
export interface AckPhrase {
  stage: string;
  text: string;
}

export const ACKNOWLEDGMENT_PHRASES: AckPhrase[] = [
  {
    stage: "Opening",
    text: "Rozumiem. To akurat dobrze, że Pan o tym mówi, bo od tego zacznę.",
  },
  {
    stage: "Opening",
    text: "Jasne, nie chcę nic Panu wciskać przez telefon. Zadam kilka pytań i sam Pan oceni, czy to ma sens.",
  },
  {
    stage: "Opening",
    text: "Dobrze, to zajmie chwilę. Jak coś nie będzie dla Pana pasować, mówi Pan wprost i kończymy.",
  },
  {
    stage: "Otwarcie diagnozy",
    text: "Rozumiem, dziękuję. To mi już dużo mówi, pozwoli Pan że dopytam o jedną rzecz.",
  },
  {
    stage: "Otwarcie diagnozy",
    text: "Jasne, widzę o czym Pan mówi. Żeby to dobrze zrozumieć, cofnę się o krok.",
  },
  {
    stage: "Otwarcie diagnozy",
    text: "Dobrze, czyli tak to u Pana teraz wygląda. Sprawdźmy więc gdzie dokładnie schodzi na to czas.",
  },
  {
    stage: "Diagnoza dokumentów",
    text: "Rozumiem, zanotowałem. Przejdźmy do kolejnego etapu obiegu dokumentów.",
  },
  {
    stage: "Diagnoza dokumentów",
    text: "Jasne. Wiele firm z którymi rozmawiam ma to podobnie, dlatego pytam po kolei.",
  },
  {
    stage: "Diagnoza dokumentów",
    text: "Dobrze, to mam ten obszar. Została mi jeszcze jedna rzecz do sprawdzenia.",
  },
  {
    stage: "Liczby i kalkulator",
    text: "Rozumiem. Żeby policzyć to rzetelnie, potrzebuję jeszcze jednej liczby od Pana.",
  },
  {
    stage: "Liczby i kalkulator",
    text: "Dobrze, to mam komplet. Podam Panu teraz orientacyjnie ile z tego wychodzi.",
  },
  {
    stage: "Liczby i kalkulator",
    text: "Spokojnie, to na razie tylko przybliżenie. Dokładnie liczymy dopiero na spotkaniu.",
  },
  {
    stage: "Spotkanie",
    text: "Rozumiem. To wszystko układa się w całość, więc powiem od razu jak widzę kolejny krok.",
  },
  {
    stage: "Spotkanie",
    text: "Dobrze, mam już wystarczająco żeby pokazać Panu konkrety na spotkaniu.",
  },
  {
    stage: "Po obiekcji",
    text: "Rozumiem Pana i to uczciwa uwaga. Właśnie po to chcę zadać te pytania, żeby nie strzelać na oślep.",
  },
  {
    stage: "Po obiekcji",
    text: "Jasne, nie naciskam. Wrócę do tego za moment, najpierw dokończę to o co pytałem.",
  },
  {
    stage: "Po obiekcji",
    text: "Dobrze, przyjmuję to. Sprawdźmy więc na Pana liczbach, czy w ogóle jest o czym rozmawiać.",
  },
];
