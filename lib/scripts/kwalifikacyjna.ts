// Zasada: jeśli Agency Leaders nie dał gotowej instrukcji na konkretną sytuację,
// rozwiązanie buduje się z ich zasad ogólnych (personalizacja, konkret zamiast
// ogólnika, klient sam dochodzi do wniosku przez pytania), nie jako coś oderwanego
// od frameworku. Każda nowa linia dialogowa w tym pliku podlega tej zasadzie.
//
// Struktura (framework Kimury, trzy etapy): OPENING (kroki 0-1) → DIAGNOZA (kroki
// 2-2g) → SPOTKANIE JAKO ROZWIĄZANIE (kroki 3-3c). Opening to powitanie z pauzą
// i jednozdaniowy kontekst, nie monolog. Diagnoza najpierw pyta o wyzwanie,
// wyzwalacz i dotychczasowe próby, potem sprawdza ICP (flota, biuro, decydent),
// jedno otwarte pytanie o proces i jedną surową liczbę godzin dziennie.
//
// PREMORTEM (rozmowa telefoniczna ma być krótka, 5-15 minut): pełny audyt modułowy
// (TMS, zlecenia, CMR, faktury, wgląd) ORAZ wyliczenie ROI (stawka, godziny per
// rola, PLN, procenty odzysku) należą do spotkania, nie do telefonu. Telefon zbiera
// tylko surową liczbę godzin, dokładny pomiar i przeliczenie idą na Discovery Call,
// na prawdziwych danych. Twarde progi ICP (min. 2 osoby w biurze, obecność
// decydenta) sprawdzane w trakcie diagnozy, nie jako osobny etap przed nią.
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
// Rozgałęzienia po odpowiedzi klienta idą przez `decision.options` (goToStepId /
// openObjectionId), renderowane przez DecisionDiagram.

import type { IcpRule, Objection, Step } from "./types";

export const STEPS_K: Step[] = [
  // ── ETAP 1 — OPENING ────────────────────────────────────────────────
  {
    id: "ok_pauza",
    nr: "0",
    label: "OPENING",
    tag: "MÓWISZ",
    lines: [
      { t: "say", text: "Dzień dobry, Panie {IMIĘ}." },
      {
        t: "note",
        text: "Stop. Czekaj aż klient sam się odezwie.",
      },
      { t: "client", text: "[Dzień dobry, kto dzwoni?]" },
    ],
    expected: "Klient sam się odzywa, pyta kto dzwoni albo odpowiada na powitanie.",
    nextStepId: "ok_kontekst",
  },
  {
    id: "ok_kontekst",
    nr: "1",
    label: "OPENING",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "{IMIĘ_SPRZEDAWCY} z Autorise. Dzwonię, ponieważ zgłosił się Pan do nas z naszej reklamy, wypełnił Pan formularz w sprawie oszczędności czasu w biurze dla firm transportowych, z gwarancją efektu zapisaną w umowie. Czy mamy teraz dwie minuty?",
        cel: "Klient w jednym zdaniu wie kto dzwoni, skąd jest jego numer i po co ten telefon. Pytanie o dwie minuty oddaje mu kontrolę.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Czy klient ma teraz dwie minuty?",
      options: [
        {
          trigger: "Tak, mamy dwie minuty",
          goToStepId: "diagnoza_wyzwania",
          tone: "positive",
        },
        {
          trigger: "Nie mam czasu, nie teraz, kiedy indziej",
          openObjectionId: "brak_czasu_1",
          tone: "warning",
        },
      ],
    },
  },

  // ── ETAP 2 — DIAGNOZA ───────────────────────────────────────────────
  {
    id: "diagnoza_wyzwania",
    nr: "2",
    label: "DIAGNOZA WYZWANIA",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Żeby lepiej zrozumieć Pana obecną sytuację, jakie widzi Pan dziś wyzwania albo trudności w codziennej pracy biura?",
        cel: "Otwarte pytanie. Słowo wyzwania, nie problemy, bo każdy ma wyzwania, nie każdy przyzna się do problemów. Nazwanie bólu jest warunkiem, żeby spotkanie miało sens.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Jak odpowiedział klient?",
      options: [
        {
          trigger: "Nazywa konkretne wyzwanie albo trudność",
          action: "Sparafrazuj jednym zdaniem to co powiedział, dopiero potem przejdź dalej.",
          goToStepId: "diagnoza_powod",
          tone: "positive",
        },
        {
          trigger: "W sumie nie mam żadnych problemów",
          openObjectionId: "brak_bolu",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "diagnoza_powod",
    nr: "2a",
    label: "WYZWALACZ DECYZJI",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Co spowodowało, że akurat teraz zgłosił się Pan do nas?",
        cel: "Wyzwalacz decyzji, przydatny później w pitchu i w podsumowaniu. Zanim zadasz to pytanie, sparafrazuj jednym zdaniem to co klient przed chwilą powiedział.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    expected:
      "Klient nazywa konkretny wyzwalacz, moment albo wydarzenie, które go do tego pchnęło.",
    transition:
      "Rozumiem, to sensowny moment żeby się tym zająć. Wrócę jeszcze do tego, co było przed naszą rozmową.",
    nextStepId: "diagnoza_proby",
  },
  {
    id: "diagnoza_proby",
    nr: "2b",
    label: "DOTYCHCZASOWE PRÓBY",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Co do tej pory próbował Pan zrobić samodzielnie, żeby to rozwiązać?",
        cel: "Amunicja na później. Jeśli klient próbował czegoś, co nie zadziałało, użyjesz tego w pitchu, żeby pokazać czym się różnicie. Klient też mocniej utożsamia się z problemem, widząc że sam nie dał rady.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    expected: "Klient opisuje konkretną próbę albo mówi wprost, że nic jeszcze nie próbował.",
    transition:
      "Rozumiem, to częsty obraz, na porządne poukładanie tego zwykle nie ma czasu przy bieżącej robocie. Teraz zapytam o wielkość firmy, żeby liczby, które za chwilę policzymy, były Wasze, a nie branżowa średnia.",
    nextStepId: "diagnoza_icp_flota",
  },
  {
    id: "diagnoza_icp_flota",
    nr: "2c",
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
    transition:
      "Jasne, zapisuję. Zanim wejdziemy w dokumenty, jedno krótkie pytanie o strukturę firmy.",
  },
  {
    id: "diagnoza_icp_decydent",
    nr: "2d",
    label: "ICP: DECYDENT",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "To Pana firma?",
        // Celowo bez słowa "właściciel/właścicielka", żeby zdanie brzmiało tak samo naturalnie
        // w wersji dla Pana i dla Pani.
        cel: "Ustalić czy rozmawiasz z osobą decyzyjną, żeby nie umówić spotkania bez sensu.",
      },
    ],
    expected: "Klient jest właścicielem albo wspólnikiem firmy.",
    transition:
      "Dobrze. Teraz przejdźmy do tego, na czym pracujecie na co dzień, żebym wiedział czego nie ma sensu ruszać.",
  },
  {
    // Premortem: pełny audyt modułowy (TMS, zlecenia, CMR, faktury, wgląd) i
    // wyliczenie ROI (stawka, godziny per rola, PLN, procenty) należą do spotkania,
    // nie do rozmowy telefonicznej. Telefon ma być krótki, 5-15 minut. Zostaje jedno
    // otwarte pytanie sytuacyjne plus jedna surowa liczba godzin.
    id: "diagnoza_proces",
    nr: "2e",
    label: "OBSŁUGA ZLECEŃ I DOKUMENTÓW",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Jak dziś u Was wygląda obsługa zleceń i dokumentów, robicie to ręcznie, czy macie już coś zautomatyzowane?",
        cel: "Jedno otwarte pytanie sytuacyjne, nie audyt modułowy. Klient sam nazwie co go najbardziej uwiera, to wystarczy do umówienia spotkania. Pełny rozkład procesu robicie na spotkaniu, nie przez telefon.",
      },
      { t: "client", text: "[opis]" },
    ],
    expected:
      "Klient opisuje własnymi słowami gdzie w obsłudze zleceń i dokumentów schodzi mu najwięcej ręcznej pracy.",
    transition: "Rozumiem. Jeszcze tylko jedna liczba i mam obraz sytuacji.",
    nextStepId: "diagnoza_godziny",
  },
  {
    id: "diagnoza_godziny",
    nr: "2f",
    label: "ILE GODZIN DZIENNIE",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Orientacyjnie, ile godzin dziennie to zajmuje w biurze?",
        cel: "Tylko surowa, przybliżona liczba. Bez przeliczania na procenty ani złotówki teraz, to zrobimy dokładnie na spotkaniu, na prawdziwych danych.",
      },
      { t: "client", text: "[przybliżona liczba godzin]" },
    ],
    expected: "Klient podaje przybliżoną liczbę godzin dziennie, choćby w widełkach.",
    transition: "Dziękuję. To mi wystarczy, żeby ocenić czy spotkanie ma sens.",
    nextStepId: "diagnoza_czas",
  },
  {
    id: "diagnoza_czas",
    nr: "2g",
    label: "CO ZROBIŁBY Z TYM CZASEM",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Gdyby ten czas wrócił do biura, co by Pan z nim zrobił?",
        cel: "Klient sam nazywa korzyść, zapamiętaj jego dokładne słowa na rozmowę sprzedażową. Odwołujesz się do surowej liczby godzin z poprzedniego kroku, nie do wyliczonego potencjału.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    expected: "Klient konkretnie nazywa, co zrobiłby z odzyskanym czasem.",
    transition:
      "Zapiszę to dokładnie tak, jak Pan mówi. Na tej podstawie mam propozycję kolejnego kroku.",
    nextStepId: "spot_propozycja",
  },

  // ── ETAP 3 — SPOTKANIE JAKO ROZWIĄZANIE PROBLEMU ───────────────────
  {
    id: "spot_propozycja",
    nr: "3",
    label: "SPOTKANIE JAKO ROZWIĄZANIE",
    tag: "ZAMKNIĘCIE",
    lines: [
      {
        t: "say",
        text: "Z tego co Pan mówi, biuro traci najwięcej czasu na powtarzalnej ręcznej robocie wokół zleceń i dokumentów, i chce Pan to z głowy.",
        cel: "Podsumuj wyzwanie i przyczynę własnymi słowami klienta, nie ogólnikiem. To zdanie ma brzmieć jak jego sytuacja, nie jak formułka.",
      },
      {
        t: "say",
        text: "Wie Pan co, w Pana przypadku najlepiej żebyśmy umówili spotkanie online. Udostępnię ekran, pokażę dokładnie jak to działa i dobiorę zindywidualizowaną ofertę cenową. Będzie Pan w pełni doinformowany, żeby podjąć decyzję we własnym zakresie.",
        cel: "Big promise plus spotkanie jako jedyne miejsce, gdzie klient dostaje pełną informację. Nie sprzedajemy przez telefon.",
      },
      { t: "say", text: "Bardziej pasuje Panu jutro czy pojutrze?" },
      { t: "client", text: "[wybiera dzień albo zgłasza obiekcję]" },
    ],
    expected: "Klient wybiera jutro albo pojutrze, albo proponuje inny konkretny dzień.",
    transition: "Dobrze. To dopnijmy porę.",
    nextStepId: "spot_dzien",
  },
  {
    id: "spot_dzien",
    nr: "3a",
    label: "SPOTKANIE: DZIEŃ",
    tag: "MÓWISZ",
    lines: [
      { t: "client", text: "[wybrany dzień]" },
      { t: "say", text: "Bardziej rano czy popołudniu?" },
      { t: "client", text: "[rano albo popołudniu]" },
    ],
    nextStepId: "spot_pora",
  },
  {
    id: "spot_pora",
    nr: "3b",
    label: "SPOTKANIE: PORA",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Wcześniej czy później w tym przedziale? Jaka konkretnie godzina Panu pasuje?",
      },
      { t: "client", text: "[konkretna godzina]" },
    ],
    nextStepId: "spot_potwierdzenie",
  },
  {
    id: "spot_potwierdzenie",
    nr: "3c",
    label: "SPOTKANIE: POTWIERDZENIE",
    tag: "ZAMKNIĘCIE",
    lines: [
      {
        t: "say",
        text: "Zapisuję, [DZIEŃ] o [GODZINA]. Dzień przed przyjdzie przypomnienie.",
      },
      {
        t: "say",
        text: "Jedna prośba, proszę połączyć się z laptopa, nie z telefonu, żeby dokładnie widział Pan wszystko co będę pokazywał na ekranie. Na jakiej platformie wygodnie się Panu połączyć?",
      },
      { t: "client", text: "[platforma]" },
      {
        t: "action",
        text: "Zarezerwuj slot w Calendly na ten dzień i godzinę teraz, w trakcie rozmowy. Link do samodzielnego wyboru wysyłasz tylko wtedy, gdy klient nie chce ustalać na żywo.",
      },
      {
        t: "action",
        text: "Zmień status w Pipeline na 'Discovery umówione', data Discovery to data wybranego slotu.",
      },
    ],
  },
];

export const OBJECTIONS_K: Objection[] = [
  // ── OPENING ────────────────────────────────────────────────────────
  {
    id: "brak_czasu_1",
    label: "Nie mam teraz czasu (pierwsze wystąpienie)",
    stage: "opening",
    script:
      "Rozumiem. To będzie konkret. W dwie minuty sprawdzimy czy i jak jesteśmy w stanie pomóc Pana firmie zaoszczędzić realny czas. Jeśli się okaże że nie, rozłączymy się bez problemu.",
    note: "Pierwsze wystąpienie traktuj jako zasłonę dymną, nie dosłownie. Dopiero drugie to prawdziwa obiekcja czasowa.",
    decision: {
      question: "Co odpowiedział klient?",
      options: [
        { trigger: "Dobrze, to mówmy", goToStepId: "diagnoza_wyzwania", tone: "positive" },
        {
          trigger: "Naprawdę nie mam teraz czasu",
          openObjectionId: "brak_czasu_2",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "brak_czasu_2",
    label: "Naprawdę nie mam teraz czasu (drugie wystąpienie)",
    stage: "opening",
    script:
      "Nie ma problemu, rozumiem że jest Pan zabiegany. Kiedy mogę zadzwonić, jutro czy pojutrze?",
    followup: "A rano czy popołudniu?",
    note: "Drugie wystąpienie to prawdziwa obiekcja, uszanuj ją. Zapisz konkretny dzień i porę w Pipeline jako termin ponownego kontaktu, nie zostawiaj ogólnikowo.",
  },
  {
    id: "ok_nie_kojarzy",
    label: "Nie kojarzy, nie wie o co chodzi, co sprzedajecie, to nie ja wypełniałem",
    stage: "opening",
    script:
      "Już tłumaczę. Autorise buduje firmom transportowym rozwiązania, które zdejmują z biura powtarzalną, ręczną robotę, każdą taką gdzie ktoś przepisuje albo przekleja dane z jednego miejsca w drugie. Nie wiem jeszcze co u Pana zajmuje najwięcej czasu, więc zamiast zgadywać, chciałbym zadać kilka krótkich pytań o to jak wygląda u Pana zwykły dzień w biurze. Od razu będzie wiadomo, czy jest tu w ogóle co usprawniać. Możemy tak zrobić?",
    followup:
      "To bez znaczenia, kto dokładnie wypełnił formularz. Liczy się to, co dzieje się u Was w biurze na co dzień. Dosłownie kilka pytań i od razu Pan zobaczy, czy jest o czym rozmawiać.",
    nextStepId: "diagnoza_wyzwania",
  },
  {
    id: "ok3",
    label: "Mam już program do zarządzania",
    stage: "opening",
    script:
      "To dobrze, większość naszych klientów ma TMS. My nie zastępujemy systemu, zdejmujemy z biura ręczną robotę wokół niego. Mam kilka pytań jak to dziś wygląda u Pana, dobrze?",
    nextStepId: "diagnoza_wyzwania",
  },
  {
    // Pytanie o dowód społeczny zanim klient odpowie na pytania diagnostyczne, realny
    // scenariusz w cold-leadowej rozmowie kwalifikacyjnej.
    id: "referencje_branzowe",
    label: "Macie jakieś referencje z mojej branży?",
    stage: "opening",
    script:
      "Rozumiem, że chce Pan to zweryfikować zanim zajmiemy Panu czas. Pracujemy wyłącznie z firmami transportowymi, więc dokładnie tę branżę rozumiemy. Na spotkaniu pokażę realny przykład podobnego wdrożenia i policzymy konkretną liczbę dla Pana firmy, nie ogólnikami.",
    nextStepId: "diagnoza_wyzwania",
  },
  {
    id: "wyslij_mailem",
    label: "Wyślij to na maila",
    stage: "closing",
    script:
      "Fajnie że Pan o tym wspomniał. Chciałbym, ale to byłoby dla Pana totalnie czasochłonne. Mailowo nie ma jak pokazać tego wizualnie ani dobrać indywidualnej oferty, więc musiałby Pan zadawać mnóstwo pytań i straciłby Pan więcej czasu niż na samym spotkaniu. Żeby nie zabierać teraz więcej czasu, bardziej pasuje Panu jutro czy pojutrze?",
    note: "Emocja, czyli nie chcę tracić Pana czasu, plus logika, czyli mailowo i tak trzeba dopytywać, połączone w jedną odpowiedź. Potem od razu wróć do pytania o termin, nie czekaj na kolejną reakcję klienta.",
  },

  // ── DIAGNOZA ───────────────────────────────────────────────────────
  {
    id: "brak_bolu",
    label: "W sumie nie mam żadnych problemów, wszystko mamy ogarnięte",
    stage: "diagnoza",
    script:
      "Rozumiem, wielu ludzi z którymi rozmawiam mówi podobnie na początku, a potem okazuje się że jest jedno konkretne miejsce, gdzie coś nie gra tak jak by chcieli. Jak to u Pana wygląda?",
    followup:
      "Zanim odpuszczę, jedno pytanie. Czy jest w biurze jakaś czynność, którą robicie w kółko ręcznie i która najbardziej Pana uwiera, nawet jeśli dziś jakoś się to spina? Jeśli nie, to spokojnie. Zapiszę Wasz kontakt i odezwę się za jakiś czas.",
    note: "Nie pytaj wprost o konkretne bóle, które rozwiązujecie, to zamyka klienta jeszcze bardziej. Normalizuj i czekaj na jego własną odpowiedź.",
  },
  {
    id: "co_robicie",
    label: "A co wy właściwie robicie? Powiedzcie najpierw co oferujecie",
    stage: "diagnoza",
    script:
      "Za chwilę dokładnie to pokażę, ale żeby to miało sens dla Pana konkretnej sytuacji, chciałbym najpierw zrozumieć jak to dziś u Was wygląda. Mogę dokończyć te dwa pytania?",
    note: "Nie odpowiadaj opisem usługi w tym momencie, przekieruj z powrotem do pytań. Jeśli klient nadal nalega, daj jedno krótkie zdanie z wynikiem, nie z opisem usługi, i wróć do pytań.",
  },
  {
    id: "po_co_to_pytanie",
    label: "Pyta po co te pytania, podważa ich sens",
    stage: "diagnoza",
    script:
      "Pytam, bo od tego zależy czy w ogóle mam dla Pana sensowną propozycję. Wolę sprawdzić to teraz, w kilku zdaniach, niż umawiać spotkanie które niczego by nie wniosło.",
  },
  {
    id: "icp_ponizej_progu",
    label: "Poniżej progu ICP, jedna osoba w biurze",
    stage: "icp",
    script:
      "Dziękuję za szczerość. Przy tej wielkości biura pewnie nie poczułby Pan jeszcze realnej różnicy, więc szczerze, nie namawiam na coś co się nie zwróci. Mogę zapisać kontakt i wrócić za jakieś trzy miesiące, jak zespół się powiększy, dobrze?",
  },
  {
    id: "icp_powyzej_progu",
    label: "Flota za duża, mamy własny dział IT / potrzebujemy czegoś enterprise",
    stage: "icp",
    script:
      "To akurat dobra wiadomość, bo im większa flota tym większa oszczędność z automatyzacji. Nie zastępujemy Waszego działu IT, tylko zdejmujemy konkretną, powtarzalną robotę ręczną z biura, więc to się dobrze uzupełnia niezależnie od wielkości zespołu IT. Sprawdźmy razem gdzie dokładnie ta ręczna praca u Was siedzi.",
  },
  {
    id: "icp_nie_decydent",
    label: "Rozmówca nie jest decydentem",
    stage: "icp",
    script:
      "Rozumiem. Czym się Pan zajmuje w firmie, i zgłosił się Pan z własnej inicjatywy, czy na prośbę właściciela?",
    note: "Po odpowiedzi: zbierz do końca wszystkie informacje, a kolejny krok zaproponuj od razu we dwoje z właścicielem, żeby klient nie przekazywał tego z drugiej ręki.",
    nextStepId: "diagnoza_proces",
  },
  {
    id: "spedytorzy_dorazni",
    label: "Spedytorzy nie są zatrudnieni na stałe",
    stage: "diagnoza",
    script:
      "Rozumiem, czyli pracują doraźnie, na wezwanie. A gdy jest dużo zleceń naraz, ile osób realnie wtedy przy tym siedzi i ile godzin to zajmuje?",
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
    id: "tms_panel_zewnetrzny",
    label:
      "Pracuje tylko przez zewnętrzny panel (Amazon Relay, panel kurierski, giełda z własnym rozliczeniem)",
    stage: "diagnoza",
    script:
      "Rozumiem, czyli większość obiegu macie w tym panelu. Powie mi Pan, co przy tym robicie jeszcze ręcznie obok samego panelu? Wystawianie faktur, zbieranie potwierdzeń, pilnowanie płatności?",
  },
  {
    id: "zewnetrzne_biuro_ksiegowe",
    label: "Faktury, zewnętrzne biuro rachunkowe",
    stage: "diagnoza",
    script:
      "Jasne, biuro rachunkowe zajmuje się rozliczeniami. A kto u Was przygotowuje i wysyła im dokumenty, faktury, potwierdzenia dostaw? To zwykle ta sama osoba co reszta administracji, zgadza się?",
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

  // ── SPOTKANIE / WSZĘDZIE ───────────────────────────────────────────
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
      "A mogliby Państwo dołączyć we dwoje na spotkanie przez internet? Mam przygotowane liczby konkretnie dla Pana firmy. Wtedy oboje macie pełen obraz i decydujecie razem.",
    followup:
      "Rozumiem, że teraz nie da rady we dwoje. To powie mi Pan, co musiałoby się na tym spotkaniu wydarzyć, żeby druga osoba powiedziała tak?",
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
    stage: "Diagnoza wyzwania",
    text: "Rozumiem, dziękuję. To mi już dużo mówi, pozwoli Pan że dopytam o jedną rzecz.",
  },
  {
    stage: "Diagnoza wyzwania",
    text: "Jasne, widzę o czym Pan mówi. Żeby to dobrze zrozumieć, cofnę się o krok.",
  },
  {
    stage: "Diagnoza wyzwania",
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
    stage: "Godziny",
    text: "Rozumiem. Została mi jeszcze jedna, przybliżona liczba i mam obraz sytuacji.",
  },
  {
    stage: "Godziny",
    text: "Spokojnie, wystarczy na oko. Dokładnie zmierzymy to razem na spotkaniu, na prawdziwych danych.",
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
