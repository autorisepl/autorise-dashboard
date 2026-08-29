// Zasada: jeśli Agency Leaders nie dał gotowej instrukcji na konkretną sytuację,
// rozwiązanie buduje się z ich zasad ogólnych (personalizacja, konkret zamiast
// ogólnika, klient sam dochodzi do wniosku przez pytania), nie jako coś oderwanego
// od frameworku. Każda nowa linia dialogowa w tym pliku podlega tej zasadzie.
//
// Kolejność kroków 2-2k: ICP (flota, biuro, decydent) sprawdzane ZARAZ PO pierwszym
// pytaniu diagnostycznym, PRZED szczegółową diagnozą dokumentów (2c-2g). Powód:
// jeśli klient nie spełnia twardych progów ICP (min. 2 osoby w biurze, obecność
// decydenta), rozmowa kończy się od razu, bez inwestowania czasu w pięć pytań
// dokumentowych które i tak nie zostaną wykorzystane.
//
// Zasada gwarancji: obietnica dotyczy zawsze konkretnych, wspólnie policzonych i przez
// klienta potwierdzonych procesów manualnych, nigdy ogólnej wydajności zespołu czy
// przychodu firmy. Każda wzmianka o gwarancji w skrypcie musi to jasno zaznaczać.
//
// Zasada języka mówionego: każda linia "say"/"script"/"followup"/"transition" to
// tekst który setter WYPOWIADA na głos. Zero myślników i dwukropków wewnątrz zdań,
// zero instrukcji procesowych ("zaznacz w Pipeline", "przejdź do kroku X"), zero
// słowa "Kickoff", zero obiecywania klientowi konkretnej nazwy kolejnego etapu
// (mów ogólnie "kolejny etap" albo "spotkanie"). Zero pytań tłumaczących klientowi
// branżowe pojęcia jak CMR, pytaj wprost i po partnersku. Zero założeń o sytuacji
// klienta, których nie wypowiedział. Liczby w ustach settera zaokrąglone.
//
// `cel` to jednozdaniowa notka WYŁĄCZNIE dla settera, nigdy czytana klientowi.
// Reakcje niepozytywne klienta NIE są opisywane w skrypcie, są obiekcjami
// (STEP_OBJECTIONS w kwalifikacja/page.tsx), z gotową odpowiedzią w miejscu.

import type { IcpRule, Objection, Step } from "./types";

export const STEPS_K: Step[] = [
  {
    id: "opener",
    nr: "1",
    label: "OPENING",
    tag: "MÓWISZ",
    lines: [
      { t: "say", text: "Dzień dobry, Pan {IMIĘ_NOM}?" },
      { t: "client", text: "Tak, słucham." },
      {
        t: "say",
        text: "Dzień dobry, z tej strony {IMIĘ_SPRZEDAWCY} z Autorise. Pomagamy firmom transportowym zdejmować z biura powtarzalną, ręczną robotę, z gwarancją efektu wpisaną w umowę. Dzwonię, bo zostawił Pan u nas formularz o oszczędzaniu czasu w biurze i chcę sprawdzić, czy mamy jak Panu pomóc.",
        cel: "Klient najpierw wie kto dzwoni i co robicie, potem po co ten telefon, i że nie ryzykuje.",
      },
    ],
    expected: "Klient potwierdza że to on i słucha dalej, bez odmowy rozmowy.",
    transition: "Dziękuję. Zaraz przejdę do konkretów, mam do Pana kilka pytań.",
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
        text: "Co spowodowało, że akurat teraz zdecydował się Pan wypełnić ten formularz?",
        cel: "Znaleźć konkretny wyzwalacz i realny ból, zanim przejdziesz do reszty pytań.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    expected: "Klient nazywa konkretny powód, wyzwalacz albo bolączkę, choćby ogólnie.",
    transition: "Rozumiem, dziękuję. Zanim wejdę głębiej, kilka pytań o skalę firmy.",
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
        text: "Ile pojazdów ma Pan teraz aktywnie w firmie?",
        cel: "Zweryfikować orientacyjną skalę floty pod kątem ICP (10-150 pojazdów).",
      },
      {
        t: "say",
        text: "A tak z grubsza, roczne obroty firmy to bardziej okolice dwóch, trzech milionów, czy powyżej pięciu? Pytam, żeby dobrać skalę rozwiązania. Jeśli woli Pan tego nie podawać, bez problemu, idziemy dalej.",
        cel: "Orientacyjny drugi filtr ICP, widełki trzymaj nisko bo ICP zaczyna się od około miliona złotych rocznie na działania.",
      },
      {
        t: "note",
        text: "Pytanie opcjonalne. Jeśli klient nie chce podać, przechodzisz dalej bez naciskania.",
      },
      {
        t: "say",
        text: "Ile osób pracuje u Was w biurze przy zleceniach, dokumentach i fakturach?",
        cel: "Twardy próg ICP, poniżej dwóch osób w biurze ból zwykle za mały żeby wdrożenie się zwróciło.",
      },
      {
        t: "say",
        text: "A jak to się rozkłada? Ilu jest spedytorów, ile osób siedzi w fakturach i rozliczeniach, jest ktoś osobno od dyspozycji?",
        cel: "Rozbić biuro na role, wpisujesz je od razu w tabelę niżej, każda osobno bo mają różne stawki i czas pracy ręcznej.",
      },
      { t: "client", text: "[podział na role]" },
    ],
    expected:
      "Klient podaje liczbę pojazdów i rozkład osób w biurze, co najmniej dwie przy zleceniach i dokumentach.",
    transition: "Jasne, zapisuję. Jeszcze jedno krótkie pytanie, o to kto u Was podejmuje decyzje.",
  },
  {
    id: "diagnoza_icp_decydent",
    nr: "2b",
    label: "ICP: DECYDENT",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "To Pana firma?",
        cel: "Ustalić czy rozmawiasz z osobą decyzyjną, żeby nie umówić spotkania bez sensu. Celowo bez słowa 'właściciel/właścicielka', żeby zdanie brzmiało tak samo naturalnie w wersji dla Pana i dla Pani.",
      },
    ],
    expected: "Klient jest właścicielem albo wspólnikiem firmy.",
    transition:
      "Dobrze. To przejdźmy do tego, jak dziś u Was wygląda praca z systemem i dokumentami.",
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
      "Rozumiem. To rozłóżmy teraz krok po kroku to, co przechodzi przez biuro ręcznie. Zacznę od samych zleceń.",
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
        text: "Zlecenia od Waszych zleceniodawców, jak do Was trafiają? Ktoś przepisuje je ręcznie z maila albo PDF-a do systemu, czy wpadają tam automatycznie?",
        cel: "Sprawdzić czy przyjęcie zlecenia od zleceniodawcy generuje pracę ręczną.",
      },
      { t: "client", text: "[opis]" },
    ],
    expected:
      "Klient potwierdza, że ktoś ręcznie przepisuje przychodzące zlecenia z maila albo PDF-a do systemu.",
    transition:
      "Rozumiem, czyli za każdym razem ktoś musi to przeklikać do systemu. Idę dalej, do dokumentów z trasy.",
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
        text: "A CMR-y i potwierdzenia dostawy, jak wracają do Was po kursie? Papierem, zdjęciem na WhatsApp, mailem? I czy ktoś potem ręcznie przepisuje z nich dane do rozliczeń albo do systemu?",
        cel: "Sprawdzić czy dokumenty po kursie wymagają ręcznego przepisywania.",
      },
      {
        t: "say",
        text: "Potwierdzenie dostawy to u Was osobny druk, czy to samo co CMR?",
        cel: "Sprawdzić czy u klienta potwierdzenie dostawy to osobny druk obok CMR.",
      },
    ],
    expected:
      "Klient mówi, że CMR i potwierdzenia wracają papierem albo zdjęciem i ktoś ręcznie przepisuje z nich dane.",
    transition: "Jasne. Zostają jeszcze faktury i rozliczenia.",
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
        text: "A faktury, te które wystawiacie i te które dostajecie? Kto je u Was ręcznie wprowadza do księgowości i ile mniej więcej tego przechodzi w miesiącu?",
        cel: "Sprawdzić skalę pracy ręcznej przy fakturach i orientacyjny wolumen.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    expected:
      "Klient mówi, że ktoś w firmie ręcznie wprowadza faktury do księgowości, i podaje mniej więcej ile ich jest.",
    transition: "Dobrze, mam ten obszar. Zostało mi jedno.",
  },
  {
    id: "diagnoza_dokumenty_status",
    nr: "2g",
    label: "WGLĄD W FIRMĘ NA BIEŻĄCO",
    tag: "MÓWISZ",
    calculatorFlag: "komunikacja",
    lines: [
      {
        t: "say",
        text: "Jak wygląda Pana wgląd w to, co dzieje się w firmie na bieżąco? Widzi Pan status zleceń i pracę biura od razu w systemie, czy trzeba o to dopytywać i dzwonić do spedytorów?",
        cel: "Sprawdzić czy właściciel ma bieżącą widoczność bez dzwonienia i dopytywania.",
      },
    ],
    expected:
      "Klient mówi, że żeby wiedzieć co się dzieje musi dopytywać albo dzwonić, nie ma tego od razu przed oczami.",
    transition:
      "Rozumiem. To zbierzmy teraz to wszystko w liczby. Potrzebuję od Pana jeszcze dwóch.",
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
        text: "Ile mniej więcej kosztuje Was godzina pracy osoby w biurze, z narzutami? Jeśli to się różni między rolami, weźmiemy każdą osobno.",
        cel: "Zebrać stawkę godzinową osobno dla każdej roli, bo do szacunku idą różne.",
      },
      { t: "client", text: "[stawki per rola lub niechęć do podania]" },
    ],
    expected:
      "Klient podaje orientacyjną stawkę godzinową, choćby w widełkach, wspólną albo osobno dla ról.",
    transition: "Dziękuję. I ostatnia liczba.",
  },
  {
    id: "diagnoza_kalkulator",
    nr: "2i",
    label: "SZACUNEK CZASU I KOSZTU",
    tag: "PYTASZ",
    hasCalculator: true,
    lines: [
      {
        t: "say",
        text: "Ile z dnia takiej osoby schodzi realnie na tę powtarzalną, ręczną robotę, o której mówiliśmy? Godzina, dwie, więcej?",
        cel: "Bez godzin dziennie per rola cały wynik jest zgadywany, to liczba na której stoi reszta rozmowy.",
      },
      { t: "client", text: "[godziny dziennie per rola]" },
      {
        t: "say",
        text: "Dokładnie rozpiszemy to razem na kolejnym etapie. Teraz zależy mi na orientacyjnej całości.",
        cel: "Ustawić oczekiwanie, że to pierwsze przybliżenie, dokładny pomiar jest później.",
      },
    ],
    nextStepId: "diagnoza_liczba",
  },
  {
    id: "diagnoza_liczba",
    nr: "2j",
    label: "PODANIE LICZBY KLIENTOWI",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Dobrze, mam komplet.",
          "Z tego co Pan opisał wychodzi, że biuro traci na tej ręcznej robocie około [WYNIK Z KALKULATORA] miesięcznie. W przeliczeniu na koszt pracy to jakieś [WARTOŚĆ PLN] miesięcznie.",
        ],
      },
      {
        t: "say",
        text: "Nie wszystko da się zdjąć w stu procentach, część to rozmowy i decyzje. Realnie mówimy o jakichś 70 procentach tego czasu, czyli około [POTENCJAL_H] miesięcznie wracających do biura.",
        cel: "Budować wiarygodność przez uczciwość, nie obiecywać więcej niż realnie możliwe.",
      },
      {
        t: "say",
        text: "To dotyczy dokładnie tych zadań, które przed chwilą wspólnie policzyliśmy. Nie ogólnej wydajności zespołu, tylko tej powtarzalnej pracy, którą Pan opisał.",
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
        text: "Gdyby te [POTENCJAL_H] miesięcznie wróciły do biura, co by Pan z nimi zrobił?",
        cel: "Klient sam nazywa korzyść, zapamiętaj jego dokładne słowa na rozmowę sprzedażową.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    expected: "Klient konkretnie nazywa, co zrobiłby z odzyskanym czasem.",
    transition:
      "Zapiszę to dokładnie tak, jak Pan mówi. Na tej podstawie mam propozycję kolejnego kroku.",
  },
  {
    id: "spotkanie",
    nr: "3",
    label: "SPOTKANIE JAKO ROZWIĄZANIE",
    tag: "ZAMKNIĘCIE",
    lines: [
      {
        t: "say",
        text: [
          "Myślę, że Waszej firmie realnie pomożemy.",
          "Proponuję tak. Spotkanie przez internet, 45 minut. Pokażę dokładnie, jak nasz system wygląda dla firmy o Waszej skali, na Waszych liczbach.",
        ],
      },
      {
        t: "say",
        text: "Bardziej pasuje Panu termin w tym tygodniu, czy w przyszłym?",
      },
      { t: "client", text: "[wybiera tydzień]" },
      {
        t: "say",
        text: "A [WYBRANY TYDZIEŃ] bardziej rano, czy po południu?",
      },
      { t: "client", text: "[proponuje porę albo nie chce ustalać teraz]" },
    ],
    expected: "Klient podaje konkretny dzień i porę spotkania.",
    transition: "Dobrze, w takim razie rezerwuję ten termin od razu.",
  },
  {
    id: "spotkanie_rezerwacja",
    nr: "3b",
    label: "REZERWACJA TERMINU",
    tag: "ZAMKNIĘCIE",
    lines: [
      {
        t: "say",
        text: "[DZIEŃ] o [GODZINA], pasuje?",
      },
      { t: "client", text: "[potwierdza]" },
      {
        t: "action",
        text: "Zarezerwuj slot w Calendly na ten dzień i godzinę teraz, w trakcie rozmowy. Link do samodzielnego wyboru wysyłasz tylko wtedy, gdy klient nie chce ustalać na żywo.",
      },
      {
        t: "say",
        text: "Jeszcze jedno. Całe wdrożenie, od tego spotkania aż po uruchomienie systemu u Was w firmie, prowadzę osobiście. Nie przekazuję tego nikomu. Będzie Pan miał jeden kontakt przez cały proces, a nie różnych ludzi na różnych etapach.",
        textSetter:
          "Jeszcze jedno. Całe wdrożenie, od tego spotkania aż po uruchomienie systemu u Was w firmie, prowadzi osobiście założyciel Autorise, Michał. Nie przekazuje tego nikomu. Będzie Pan miał jeden kontakt przez cały proces, a nie różnych ludzi na różnych etapach.",
        cel: "Budować autorytet i ciągłość, klient ma jeden kontakt przez cały proces.",
      },
      {
        t: "say",
        text: "Potwierdzenie dostanie Pan mailem, a dzień przed przypomnienie SMS.",
      },
      {
        t: "action",
        text: "Zmień status w Pipeline na 'Discovery umówione', data Discovery to data wybranego slotu.",
      },
    ],
  },
];

export const OBJECTIONS_K: Objection[] = [
  {
    id: "ok_nie_kojarzy",
    label: "Nie kojarzy, nie wie o co chodzi, co sprzedajecie, to nie ja wypełniałem",
    stage: "opening",
    script:
      "Już tłumaczę. Autorise buduje firmom transportowym rozwiązania, które zdejmują z biura powtarzalną, ręczną robotę, każdą taką gdzie ktoś przepisuje albo przekleja dane z jednego miejsca w drugie. Nie wiem jeszcze co u Pana zajmuje najwięcej czasu, więc zamiast zgadywać, chciałbym zadać kilka krótkich pytań o to jak wygląda u Pana zwykły dzień w biurze. Od razu będzie wiadomo, czy jest tu w ogóle co usprawniać. Możemy tak zrobić?",
    followup:
      "To bez znaczenia, kto dokładnie wypełnił formularz. Liczy się to, co dzieje się u Was w biurze na co dzień. Dosłownie kilka pytań i od razu Pan zobaczy, czy jest o czym rozmawiać.",
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
    nextStepId: "diagnoza_otwarcie",
  },
  {
    id: "ok_nie_czasu",
    label: "Nie ma czasu, spieszy się, minęły już 2 minuty",
    stage: "opening",
    script:
      "Rozumiem. Zajmę Panu naprawdę chwilę, bo chodzi o czas i pieniądze które biuro traci co miesiąc na powtarzalnej, ręcznej robocie. Da rady teraz, czy woli Pan żebym oddzwonił o konkretnej porze?",
    followup:
      "Jasne, nie będę naciskać. Kiedy jest Panu wygodniej, jutro rano czy raczej po południu? Zapiszę konkretny termin i wtedy zadzwonię.",
    nextStepId: "diagnoza_otwarcie",
  },
  {
    id: "brak_konkretu",
    label: "Nie potrafi nazwać powodu, trudno powiedzieć, z ciekawości",
    stage: "opening",
    script:
      "Rozumiem, czasem trudno to od razu ująć w słowa. Niech Pan opowie po prostu, jak wygląda u Pana zwykły dzień w biurze. Od momentu gdy wchodzi zlecenie, aż po to jak się z niego rozliczacie.",
    followup:
      "A gdy przychodzi dużo zleceń naraz albo spedytora nie ma przez chorobę czy urlop, to biuro wtedy przystaje, czy ktoś przejmuje to płynnie?",
    nextStepId: "diagnoza_icp_flota",
  },
  {
    id: "brak_bolu",
    label: "W sumie nie mam żadnych problemów, wszystko mamy ogarnięte",
    stage: "opening",
    script:
      "Zanim odpuszczę, jedno pytanie. Czy jest w biurze jakaś czynność, którą robicie w kółko ręcznie i która najbardziej Pana uwiera, nawet jeśli dziś jakoś się to spina? Jeśli nie, to spokojnie. Zapiszę Wasz kontakt i odezwę się za jakiś czas, bo firmy tej wielkości zwykle po kilku miesiącach dochodzą do punktu, w którym tej roboty robi się za dużo.",
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
    label: "Jadę na urlop, wracam za jakiś czas",
    stage: "wszedzie",
    script: "Rozumiem. Kiedy Pan wraca?",
    followup: "Zapisuję. Zadzwonię do Pana [data po powrocie]. Życzę udanego urlopu.",
  },
  {
    id: "ok5",
    label: "Muszę porozmawiać ze wspólnikiem, synem, żoną",
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
      "Dziękuję za szczerość. Przy tej wielkości biura pewnie nie poczułby Pan jeszcze realnej różnicy, więc szczerze, nie namawiam na coś co się nie zwróci. Mogę zapisać kontakt i wrócić za jakieś trzy miesiące, jak zespół się powiększy, dobrze?",
  },
  {
    id: "icp_nie_decydent",
    label: "Rozmówca nie jest decydentem",
    stage: "icp",
    script:
      "Rozumiem. Czym się Pan zajmuje w firmie, i zgłosił się Pan z własnej inicjatywy, czy na prośbę właściciela?",
    followup:
      "Dobrze, to zbierzmy teraz wszystkie informacje, a na końcu ustalimy jak najlepiej zorganizować kolejny krok, tak żeby właściciel też miał pełen obraz. Najlepiej od razu 45 minut we dwoje, żeby nie musiał Pan tego później tłumaczyć z drugiej ręki.",
    nextStepId: "diagnoza_tms",
  },
  {
    id: "zewnetrzne_biuro_ksiegowe",
    label: "Faktury, zewnętrzne biuro rachunkowe",
    stage: "diagnoza",
    script:
      "Jasne, biuro rachunkowe zajmuje się rozliczeniami. A kto u Was przygotowuje i wysyła im dokumenty, faktury, potwierdzenia dostaw? To zwykle ta sama osoba co reszta administracji, zgadza się?",
  },
  {
    id: "tms_panel_zewnetrzny",
    label:
      "Pracuje tylko przez zewnętrzny panel (Amazon Relay, panel kurierski, giełda z własnym rozliczeniem)",
    stage: "diagnoza",
    script:
      "Rozumiem, czyli większość obiegu macie w tym panelu. Powie mi Pan, co przy tym robicie jeszcze ręcznie obok samego panelu? Wystawianie faktur, zbieranie potwierdzeń, pilnowanie płatności?",
  },
  {
    id: "konkurencja_m365",
    label: "Ma wszystko w Microsoft 365, Power Automate",
    stage: "diagnoza",
    script:
      "To brzmi jak solidna konfiguracja. Sprawdzam zwykle jedną rzecz, czy to faktycznie odczytuje dane z dokumentu i wpisuje je samo, czy tylko przenosi plik do folderu, a ktoś i tak musi go otworzyć i przepisać ręcznie?",
    followup:
      "A co się dzieje, gdy dokument wygląda inaczej niż zwykle? System radzi sobie z tym sam, czy ktoś musi wtedy ręcznie poprawić? I kto to wszystko utrzymuje, gdy przestaje działać po aktualizacji?",
  },
  {
    id: "po_co_to_pytanie",
    label: "Pyta po co te pytania, podważa ich sens",
    stage: "diagnoza",
    script:
      "Pytam, bo od tego zależy czy w ogóle mam dla Pana sensowną propozycję. Wolę sprawdzić to teraz, w kilku zdaniach, niż umawiać spotkanie które niczego by nie wniosło.",
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
  },
  {
    id: "stawka_niechec",
    label: "Nie chce podać dokładnej stawki godzinowej",
    stage: "kalkulator",
    script:
      "Rozumiem, to szczegół księgowy. Wystarczy orientacyjnie, to bliżej 40, 55, czy 70 złotych za godzinę z narzutami?",
  },
  {
    id: "spedytorzy_dorazni",
    label: "Spedytorzy nie są zatrudnieni na stałe",
    stage: "diagnoza",
    script:
      "Rozumiem, czyli pracują doraźnie, na wezwanie. A gdy jest dużo zleceń naraz, ile osób realnie wtedy przy tym siedzi i ile godzin to zajmuje?",
  },
  {
    id: "spotkanie_link_zapasowy",
    label: "Nie chce ustalać terminu teraz, wariant zapasowy z linkiem",
    stage: "closing",
    script:
      "Rozumiem, nie ma problemu. Wyślę Panu link do samodzielnej rezerwacji przez Calendly, wybierze Pan dogodny termin. Dostanie Pan też automatyczne przypomnienie SMS dzień przed.",
  },
];

export const ICP_RULES: IcpRule[] = [
  { ok: true, label: "Biuro", val: "Minimum 2 osoby przy zleceniach. To twardy próg." },
  { ok: true, label: "Decydent", val: "Właściciel lub wspólnik, weryfikowany na kwalifikacji." },
  {
    ok: true,
    label: "Ból",
    val: "Ręczna praca potwierdzona szacunkiem, od 80 godzin miesięcznie.",
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
// najpierw krótkie potwierdzenie że słuchasz, potem naturalny mostek dalej.
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
    stage: "Liczby",
    text: "Rozumiem. Żeby policzyć to rzetelnie, potrzebuję jeszcze jednej liczby od Pana.",
  },
  {
    stage: "Liczby",
    text: "Dobrze, to mam komplet. Podam Panu teraz orientacyjnie ile z tego wychodzi.",
  },
  {
    stage: "Liczby",
    text: "Spokojnie, to na razie tylko przybliżenie. Dokładnie rozpiszemy to na kolejnym etapie.",
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
