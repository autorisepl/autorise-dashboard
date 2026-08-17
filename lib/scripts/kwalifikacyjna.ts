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
// zaokrąglone, dokładne zostają wyłącznie w kalkulatorze. `setterNote` i `cel` są
// WYŁĄCZNIE dla settera, fizycznie oddzielone od `text` w typie ScriptLine (patrz
// types.ts) — nie są czytane klientowi. `setterNote` jedno zdanie, limit 120/150 znaków.

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
        text: [
          "Dzień dobry, mówi {IMIĘ_SPRZEDAWCY} z Autorise.",
          "Widziałem w systemie że wypełnił Pan nasz formularz o oszczędności czasu w biurze.",
          "Chciałem zapytać, czy ten temat jest u Was jeszcze aktualny?",
        ],
        cel: "Klient od razu wie po co dzwonisz, zanim pomyśli że to nachalna sprzedaż.",
      },
      {
        t: "say",
        text: "Chciałbym zadać dwa, trzy pytania żeby sprawdzić czy to w ogóle ma sens dla Pana firmy. Zajęłoby mi to z dwie minuty, dobrze?",
        cel: "Klient wie po co te 2 minuty, zanim pomyśli że to sprzedaż.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Co odpowiedział klient?",
      options: [
        {
          trigger: "„Tak, mam te dwie minuty”",
          action: "Przechodzisz do diagnozy.",
          goToStepId: "diagnoza_otwarcie",
          tone: "positive",
        },
        {
          trigger: "„Nie mam czasu” i podaje konkretny powód",
          action: "Szanujesz to i umawiasz konkretny termin oddzwonienia.",
          openObjectionId: "ok1_szczere",
          tone: "warning",
        },
        {
          trigger: "„Nie mam czasu”, zbywa bez powodu",
          action: "Dajesz jedno zdanie o konkretnej korzyści i pytasz ponownie.",
          openObjectionId: "ok1_wymowka",
          tone: "warning",
        },
        {
          trigger: "„Niech Pan mi najpierw opowie czym się zajmujecie”",
          action: "Prosisz o dwa pytania zanim opowiesz, potem wracasz do diagnozy.",
          openObjectionId: "ok_najpierw_opowiedz",
          tone: "neutral",
        },
      ],
    },
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
        cel: "Znaleźć konkretny wyzwalacz i realny ból.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Czy klient podał konkretny powód?",
      options: [
        {
          trigger: "Podaje konkretny ból lub wyzwalacz",
          action: "Kontynuujesz do pytania o zespół i flotę.",
          goToStepId: "diagnoza_icp_flota",
          tone: "positive",
        },
        {
          trigger: "„Trudno powiedzieć”, nie potrafi nazwać",
          action: "Dopytujesz raz jeszcze, zanim uznasz że nie ma bólu.",
          goToStepId: "diagnoza_doprecyzowanie_bolu",
          tone: "warning",
        },
        {
          trigger: "Zaciekawiła go reklama, nic więcej nie mówi",
          action: "Dopytujesz o dwie konkretne sytuacje z codziennej pracy.",
          goToStepId: "diagnoza_scenariusze_konkretne",
          tone: "neutral",
        },
        {
          trigger: "„W sumie nie mam żadnych problemów”",
          action: "Odpowiadasz i dopytujesz raz jeszcze, zanim uznasz że nie ma bólu.",
          sayAfter:
            "To częsta odpowiedź na start. Zapytam inaczej. Gdzie dziś najwięcej czasu ucieka w biurze, nawet jeśli Pan by tego nie nazwał problemem, tylko czymś co po prostu tak już jest?",
          goToStepId: "diagnoza_doprecyzowanie_bolu",
          tone: "warning",
        },
        {
          trigger: "„Chcę robić więcej tym samym składem”",
          action: "Odpowiadasz pytaniem o konsekwencje braku zmiany, potem kontynuujesz do ICP.",
          sayAfter: "A co się stanie, jeśli za pół roku nadal będziecie w tym samym miejscu?",
          goToStepId: "diagnoza_icp_flota",
          tone: "positive",
        },
        {
          trigger: "„Niech Pan mi najpierw opowie czym się zajmujecie”",
          action: "Prosisz o dwa pytania zanim opowiesz, potem wracasz do diagnozy.",
          openObjectionId: "ok_najpierw_opowiedz",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "diagnoza_scenariusze_konkretne",
    nr: "2y",
    label: "SCENARIUSZE KONKRETNE",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Zapytam o dwie konkretne sytuacje, bo to właśnie w takich momentach większość firm traci klientów albo popełnia kosztowne pomyłki.",
          "Jak to wygląda gdy nagle przychodzi dużo zleceń naraz, na przykład w szczycie sezonu?",
        ],
        cel: "Sprawdzić czy pod presją proces się sypie.",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "say",
        text: "A jak radzicie sobie gdy spedytor jest nieobecny, choroba, urlop? Firma wtedy staje, czy ktoś to przejmuje bez problemu?",
        cel: "Sprawdzić czy istnieje pojedynczy punkt awarii w procesie.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Czy w którejś z tych sytuacji pojawił się realny problem?",
      options: [
        {
          trigger: "Tak, w szczycie lub przy nieobecności coś szwankuje",
          action: "To realny ból. Kontynuujesz do pytania o zespół i flotę.",
          goToStepId: "diagnoza_icp_flota",
          tone: "positive",
        },
        {
          trigger: "Nie, oba scenariusze też ogarnięte",
          action: "Kończysz rozmowę scenariuszem braku bólu.",
          goToStepId: "brak_bolu",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "diagnoza_doprecyzowanie_bolu",
    nr: "2z",
    label: "DOPRECYZOWANIE BÓLU",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Rozumiem, czasem trudno to od razu nazwać.",
      },
      {
        t: "say",
        text: "Niech Pan opowie, jak wygląda zwykły dzień w biurze. Od tego jak wchodzi zlecenie, aż po to jak się rozliczacie.",
        cel: "Klient opisuje ból własnymi słowami, bez podsuwania mu gotowych kategorii.",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        // Mapowanie sygnałów na moduły kalkulatora, do wykorzystania przy słuchaniu
        // odpowiedzi klienta: przepisywanie zleceń = TMS, szukanie CMR/faktur = Dokumenty
        // i pliki, dzwonienie po status = Powiadomienia automatyczne.
        t: "note",
        setterNote: "Słuchaj, który moduł kalkulatora pasuje do opisu: TMS, Dokumenty i pliki, czy Powiadomienia.",
      },
    ],
    decision: {
      question: "Czy teraz podał konkretny kierunek?",
      options: [
        {
          trigger: "Tak, opisuje konkretną sytuację",
          action: "Kontynuujesz do pytania o zespół i flotę.",
          goToStepId: "diagnoza_icp_flota",
          tone: "positive",
        },
        {
          trigger: "Nadal nic konkretnego, „wszystko w porządku”",
          action: "Kończysz rozmowę scenariuszem braku bólu.",
          goToStepId: "brak_bolu",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "diagnoza_icp_flota",
    nr: "2a",
    label: "ICP: FLOTA I BIURO",
    tag: "PYTASZ",
    captureField: "osoby",
    lines: [
      {
        t: "say",
        text: "Ile pojazdów ma Pan teraz aktywnie?",
        cel: "Zweryfikować orientacyjną skalę floty pod kątem ICP.",
      },
      {
        t: "say",
        text: "Orientacyjnie, w jakim przedziale rocznego przychodu firma się dziś mieści - to pytanie zadaję tylko po to, żeby dobrze dobrać skalę rozwiązania, nie z ciekawości.",
        cel: "Drugi, opcjonalny filtr ICP obok liczby pojazdów.",
      },
      {
        // Odpowiedź zapisywana jako drugi filtr ICP obok liczby pojazdów.
        t: "note",
        setterNote: "Pytanie opcjonalne, brak odpowiedzi nie blokuje dalszej rozmowy.",
      },
      {
        t: "say",
        text: "Ile osób pracuje w biurze? Chodzi mi o zlecenia, dokumenty, faktury.",
        cel: "Sprawdzić twardy próg ICP, minimum 2 osoby w biurze.",
      },
      {
        t: "say",
        text: "A kto się czym zajmuje? Spedytorzy, ktoś od faktur?",
        cel: "Zebrać realny podział ról w biurze, przyda się przy zakładaniu ról w kalkulatorze.",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        // Ścieżka "1 osoba, plan zatrudnienia" nie ma osobnej logiki liczbowej: niższe
        // ROI przy mniejszym zespole jest naturalne, nie błędem.
        t: "note",
        setterNote: "Licz jako 1 osobę w kalkulatorze; zaznacz w Pipeline do potwierdzenia na Discovery.",
      },
    ],
    decision: {
      question: "Ile osób w biurze?",
      options: [
        {
          trigger: "2 lub więcej osób w biurze",
          action: "ICP spełnione, kontynuujesz do pytania o decydenta.",
          goToStepId: "diagnoza_icp_decydent",
          tone: "positive",
        },
        {
          trigger: "1 osoba, konkretny plan zatrudnienia w 3 miesiące",
          action: "Kontynuujesz ostrożnie, zaznacz plan w notatce Pipeline.",
          goToStepId: "diagnoza_icp_decydent",
          tone: "warning",
        },
        {
          trigger: "1 osoba, brak konkretnego planu zatrudnienia",
          action: "Kończysz rozmowę, klient poniżej progu.",
          openObjectionId: "icp_ponizej_progu",
          tone: "warning",
        },
      ],
    },
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
        cel: "Ustalić czy rozmawiasz z osobą decyzyjną.",
      },
    ],
    decision: {
      question: "Czy jest właścicielem?",
      options: [
        {
          trigger: "Tak, jest właścicielem",
          action: "Decydent obecny, kontynuujesz do systemu i pracy manualnej.",
          goToStepId: "diagnoza_tms",
          tone: "positive",
        },
        {
          trigger: "Nie, decyduje ktoś inny",
          action: "Proponujesz wspólne spotkanie z decydentem.",
          openObjectionId: "icp_nie_decydent",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "diagnoza_tms",
    nr: "2c",
    label: "TMS I PRACA MANUALNA",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Rozumiem.",
          "Jakiego systemu używacie do zarządzania zleceniami i flotą? Trans.eu, Timocom, coś własnego?",
        ],
        cel: "Ustalić punkt odniesienia, co klient już ma, żeby wiedzieć czego nie zastępować.",
        setterNote: "Krótkie potwierdzenie przed pytaniem, żeby rozmowa nie brzmiała jak przesłuchanie.",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        setterNote: "Klient wspomniał M365/Power Automate/Power Apps jako 'już mam to ogarnięte'.",
        linkObjectionId: "konkurencja_m365",
      },
    ],
    decision: {
      question: "Co odpowiedział klient?",
      options: [
        {
          trigger: "Ma TMS, podaje nazwę",
          action: "Zapisujesz nazwę dosłownie w Pipeline.",
          goToStepId: "diagnoza_dokumenty_zlecenie",
          tone: "positive",
        },
        {
          trigger: "Brak programu, Excel, WhatsApp, telefon",
          action: "Zapisujesz jako brak TMS, to też ważna informacja.",
          goToStepId: "diagnoza_dokumenty_zlecenie",
          tone: "neutral",
        },
        {
          trigger:
            "Działa przez panel/platformę zewnętrzną (np. Amazon Relay, panel kurierski InPost/DPD, giełda z własnym systemem rozliczeń)",
          action: "Dopytujesz ogólnie o obieg dokumentów w tym systemie.",
          goToStepId: "diagnoza_profil_inny",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "diagnoza_profil_inny",
    nr: "2c2",
    label: "PROFIL INNY NIŻ KLASYCZNA SPEDYCJA",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Jak wygląda u Was obieg dokumentów w tym systemie? Co jeszcze robicie ręcznie obok tego panelu?",
        cel: "Ogólne rozeznanie, bez pytań pod klasyczną spedycję które mogą tu nie pasować.",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        // Pytania 2d-2g są zbudowane pod klasycznego spedytora z CMR na giełdach
        // transportowych, np. pytanie o CMR nie pasuje do klienta kurierskiego bez frachtu.
        t: "note",
        setterNote: "Pytania 2d-2g pod spedytora z CMR; pomijaj te co nie pasują do klienta.",
      },
    ],
    nextStepId: "diagnoza_dokumenty_zlecenie",
  },
  {
    id: "diagnoza_dokumenty_zlecenie",
    nr: "2d",
    label: "ZLECENIE TRANSPORTOWE",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Jasne, dzięki.",
          "Jak u Państwa zlecenia trafiają do biura? Ktoś to musi ręcznie przepisywać z maili czy PDF-ów do systemu?",
        ],
        cel: "Sprawdzić czy pierwszy etap, przyjęcie zlecenia, generuje pracę ręczną.",
      },
      { t: "client", text: "[opis]" },
      {
        t: "note",
        setterNote: "Jeśli klient miesza to ze zleceniem dla kierowcy, doprecyzuj: chodzi o dokument od klienta.",
      },
    ],
    decision: {
      question: "Jak zlecenie trafia do Was i co się z nim dzieje dalej?",
      options: [
        {
          trigger: "Ktoś ręcznie przepisuje z maila, PDF-a albo zdjęcia",
          action: "Zaznaczasz w kalkulatorze moduł Automatyzacja TMS.",
          sayAfter: "Rozumiem, czyli ktoś musi to za każdym razem ręcznie przepisać do systemu.",
          goToStepId: "diagnoza_dokumenty_cmr",
          tone: "positive",
          calculatorFlag: "zlecenia",
        },
        {
          trigger: "To już wpada do systemu automatycznie",
          action: "Nie zaznaczasz, ten etap mają ogarnięty.",
          sayAfter: "To dobrze, ten etap już macie ogarnięty.",
          goToStepId: "diagnoza_dokumenty_cmr",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "diagnoza_dokumenty_cmr",
    nr: "2e",
    label: "LIST PRZEWOZOWY I POTWIERDZENIE DOSTAWY",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: ["OK, to się przyda.", "Jak to wygląda z CMR-ami? Po kursie, jak to do Was wraca?"],
        cel: "Sprawdzić czy dokumenty po kursie wymagają ręcznego przepisywania.",
      },
      {
        t: "say",
        text: "Potwierdzenia dostawy wchodzą u Pana razem z CMR, czy osobno?",
        cel: "Sprawdzić czy klient rozróżnia CMR i osobne potwierdzenie dostawy.",
      },
      {
        t: "note",
        setterNote: "Papier/zdjęcie: moduł Dokumenty i pliki. eCMR: sprawdź czy dane i tak trzeba przepisać ręcznie.",
      },
    ],
    decision: {
      question: "Jak CMR i potwierdzenie dostawy wracają do biura?",
      options: [
        {
          trigger: "Papier albo zdjęcie, ktoś ręcznie przepisuje",
          action: "Zaznaczasz w kalkulatorze moduł Dokumenty i pliki.",
          sayAfter: "Czyli to kolejny etap gdzie ktoś ręcznie przepisuje dane z papieru.",
          goToStepId: "diagnoza_dokumenty_faktura",
          tone: "positive",
          calculatorFlag: "cmr",
        },
        {
          trigger: "Elektronicznie, już zautomatyzowane",
          action: "Nie zaznaczasz, to mają już rozwiązane.",
          sayAfter: "Dobrze, to macie już rozwiązane.",
          goToStepId: "diagnoza_dokumenty_faktura",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "diagnoza_dokumenty_faktura",
    nr: "2f",
    label: "FAKTURY I ROZLICZENIA",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Rozumiem.",
          "A z fakturami jak to wygląda? Tymi które wystawiacie i tymi które dostajecie. Kto to ogarnia i wpisuje do księgowości?",
        ],
        cel: "Sprawdzić skalę pracy manualnej przy fakturach.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Kto sprawdza i wpisuje faktury do księgowości?",
      options: [
        {
          trigger: "Jedna osoba ręcznie wpisuje",
          action: "Dopytujesz o liczbę faktur miesięcznie, zaznaczasz moduł Dokumenty i pliki.",
          sayAfter:
            "Ile mniej więcej faktur miesięcznie to jest, licząc te które wystawiacie i te które dostajecie?",
          goToStepId: "diagnoza_dokumenty_status",
          tone: "positive",
          calculatorFlag: "faktury_recznie",
        },
        {
          trigger: "Zewnętrzne biuro rachunkowe",
          action: "Pogłębiasz wątek kto u nich przygotowuje dokumenty.",
          openObjectionId: "zewnetrzne_biuro_ksiegowe",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "diagnoza_dokumenty_status",
    nr: "2g",
    label: "WIDOCZNOŚĆ STATUSU ZLECENIA",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: [
          "Jasne, dzięki.",
          "I ostatnia rzecz. Jak Pan sam sprawdza dziś status jakiegoś zlecenia? Trzeba zadzwonić do spedytora, czy widać to od razu w systemie?",
        ],
        cel: "Sprawdzić czy właściciel ma widoczność operacyjną bez dzwonienia.",
      },
    ],
    decision: {
      question: "Czy właściciel widzi status zlecenia bez dzwonienia do spedytora?",
      options: [
        {
          trigger: "Nie, musi dzwonić albo pytać",
          action: "Zaznaczasz w kalkulatorze moduł Powiadomienia automatyczne.",
          sayAfter: "To osobny, ważny problem, niezależny od dokumentów.",
          goToStepId: "diagnoza_stawka",
          tone: "positive",
          calculatorFlag: "komunikacja",
        },
        {
          trigger: "Tak, widzi na bieżąco w systemie",
          action: "Nie zaznaczasz, ten obszar mają ogarnięty.",
          sayAfter: "Dobrze, ten obszar macie ogarnięty.",
          goToStepId: "diagnoza_stawka",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "diagnoza_stawka",
    nr: "2h",
    label: "STAWKA GODZINOWA W BIURZE",
    tag: "PYTASZ",
    captureField: "stawka",
    lines: [
      {
        t: "say",
        text: [
          "Rozumiem.",
          "Orientacyjnie, ile kosztuje Pana godzina pracy osoby w biurze, razem ze wszystkimi narzutami?",
        ],
        cel: "Zebrać realną stawkę zamiast domyślnego szacunku.",
      },
      { t: "client", text: "[odpowiedź lub niechęć do podania]" },
    ],
    decision: {
      question: "Czy klient podał stawkę?",
      options: [
        {
          trigger: "Podaje konkretną kwotę",
          action: "Wpisujesz do kalkulatora, przechodzisz dalej.",
          goToStepId: "diagnoza_kalkulator",
          tone: "positive",
        },
        {
          trigger: "Nie chce podawać dokładnej kwoty",
          action: "Proponujesz szacunek widełkami.",
          openObjectionId: "stawka_niechec",
          tone: "warning",
        },
      ],
    },
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
        text: "Dokładny podział na poszczególne zadania zmierzymy razem na spotkaniu wdrożeniowym. Teraz potrzebuję orientacyjnej całości.",
        cel: "Ustawić oczekiwanie że to pierwsze przybliżenie, nie finalna liczba.",
        setterNote: "Dokładny pomiar per moduł dopiero na Kickoffie. Zero słowa 'Kickoff' w rozmowie z klientem.",
      },
      {
        // Kalkulator wypełnia się sam: role z pytania o zespół (2a), moduły z checkboxów
        // zaznaczonych automatycznie w krokach 2d-2g.
        t: "note",
        setterNote: "Dopytaj tylko o godziny dziennie per rola, jeśli jeszcze nie padły w rozmowie.",
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
        t: "note",
        setterNote: "Odczytaj wynik z kalkulatora, w rozmowie mów liczbami zaokrąglonymi.",
      },
      {
        t: "say",
        text: [
          "To przy tej skali robi się z tego naprawdę sporo godzin.",
          "Z moich wyliczeń na szybko wychodzi, że Wasz zespół traci miesięcznie około [WYNIK Z KALKULATORA] godzin. To koszt rzędu [WARTOŚĆ PLN] miesięcznie.",
        ],
      },
      {
        t: "say",
        text: "Nie każdą z tych godzin da się zautomatyzować w stu procentach, bo część to rozmowy z klientami i decyzje. Realistycznie mówimy o około 70 procentach tego czasu, czyli w okolicach [POTENCJAL_H] godzin miesięcznie wracających do biura.",
        cel: "Budować wiarygodność przez uczciwość, nie obiecywać więcej niż realnie możliwe.",
        setterNote: "70% to ten sam wskaźnik co potencjał w kalkulatorze poniżej, nie osobna liczba.",
      },
      {
        t: "say",
        text: "Ta liczba dotyczy konkretnie tych zadań które przed chwilą razem policzyliśmy. Nie ogólnej wydajności zespołu, tylko tej powtarzalnej pracy którą Pan sam opisał.",
        cel: "Zapobiec późniejszemu nieporozumieniu przy zobowiązaniu zwrotu na umowie.",
        setterNote: "Zobowiązanie dotyczy konkretnych, potwierdzonych procesów, nie ogólnej produktywności firmy.",
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
        cel: "Sprawić żeby klient sam nazwał korzyść.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Jak zareagował klient?",
      options: [
        {
          trigger: "Odpowiada konkretnie",
          action: "Potwierdzasz i przechodzisz dalej, to gotowy materiał do kroku 3.",
          goToStepId: "spotkanie",
          tone: "positive",
        },
        {
          trigger: "Milczy, „nie wiem, nie myślałem”",
          action: "Podsuwasz kilka kierunków do wyboru.",
          openObjectionId: "czas_milczy",
          tone: "warning",
        },
        {
          trigger: "Reaguje obronnie, boi się zwolnień",
          action: "Uspokajasz, chodzi o ludzi, nie o cięcia.",
          openObjectionId: "czas_obronny",
          tone: "warning",
        },
        {
          trigger: "Przeskakuje od razu do pytania o cenę",
          action: "Kończysz wątek jednym zdaniem i wracasz do niego.",
          openObjectionId: "czas_przeskakuje",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "brak_bolu",
    nr: "2x",
    label: "BRAK BÓLU: WYJŚCIE",
    tag: "UWAGA",
    lines: [
      { t: "note", setterNote: "Używaj po 2 nieudanych próbach ukazania bólu. Nie sprzedawaj na siłę." },
      {
        t: "say",
        text: [
          "Słyszę że u Pana to działa sprawnie. Nie chcę zajmować Pana czasu.",
          "Czy jest jakiś aspekt logistyki gdzie czujecie że traci się czas albo robi się za dużo ręcznie?",
        ],
      },
      { t: "client", text: "Nie, wszystko gra." },
      {
        t: "say",
        text: "Zanim zakończymy, jeszcze jedno pytanie. W jakim celu zostawił Pan ten formularz, jeśli mogę zapytać?",
        cel: "Ostatnia próba diagnozy przed zamknięciem rozmowy.",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "say",
        text: [
          "Rozumiem. Na ten moment nie mamy dla Pana sensownej propozycji i nie chcę zabierać Panu czasu.",
          "Odezwę się za jakieś 3 miesiące, dobrze?",
        ],
      },
      {
        t: "note",
        setterNote: "Jeśli zgadza się: status Nieaktywny (follow up), re-engagement za 3 mc.",
      },
    ],
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
          "Na podstawie tego co Pan powiedział, myślę że możemy Pana firmie realnie pomóc.",
          "Mam propozycję. Spotkanie przez internet, 45 minut. Pokażę dokładnie jak wygląda automatyzacja dla firmy o tej skali, na Pana liczbach.",
        ],
      },
      {
        t: "say",
        text: "Gdyby rozwiązanie się spodobało, mam jeszcze pytanie techniczne. Czy obecny rytm pracy pozwoliłby zacząć od razu, czy trzeba najpierw pozamykać jakieś sprawy po Pana stronie?",
        cel: "Sprawdzić gotowość operacyjną do startu przed rezerwacją terminu.",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "say",
        text: "Kiedy pasowałby Panu taki termin, w tym czy w przyszłym tygodniu, rano czy po południu?",
      },
      { t: "client", text: "[proponuje termin albo nie chce ustalać teraz]" },
    ],
    decision: {
      question: "Czy klient podał konkretny dzień i porę?",
      options: [
        {
          trigger: "Tak, podaje dzień i porę",
          action: "Rezerwujesz termin od razu na tej rozmowie, klient tylko potwierdza.",
          goToStepId: "spotkanie_rezerwacja",
          tone: "positive",
        },
        {
          trigger: "Nie chce ustalać terminu teraz",
          action: "Wysyłasz link do samodzielnej rezerwacji jako wariant zapasowy.",
          openObjectionId: "spotkanie_link_zapasowy",
          tone: "neutral",
        },
      ],
    },
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
        cel: "Budować autorytet i ciągłość, klient rozmawia z decydentem i wykonawcą w jednej osobie.",
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
    id: "ok_nb",
    label: "Nie pamiętam żadnego formularza",
    stage: "opening",
    script:
      "To nic, ludzie wypełniają dużo takich formularzy. Powiem w dwóch zdaniach. Dotyczy to automatyzacji dokumentów i zleceń w firmie transportowej. Mogę zadać dwa pytania, żeby sprawdzić czy to w ogóle ma sens dla Pana firmy?",
    nextStepId: "diagnoza_otwarcie",
  },
  {
    id: "ok_cc",
    label: "Co Pan sprzedaje? O co chodzi?",
    stage: "opening",
    script:
      "Automatyzujemy pracę biura spedycji, na przykład zlecenia, CMR i faktury. Zanim cokolwiek zaproponuję, chcę wiedzieć jak to u Pana wygląda. Zajmie dosłownie dwie minuty. Dobrze?",
    nextStepId: "diagnoza_otwarcie",
  },
  {
    id: "ok_ms",
    label: "Od razu chce umówić spotkanie",
    stage: "opening",
    script:
      "Chętnie. Żeby spotkanie miało sens dla nas obu, muszę zadać trzy krótkie pytania o firmę. Dwie minuty. Dobrze?",
    nextStepId: "diagnoza_otwarcie",
  },
  {
    id: "ok_cp",
    label: "Od razu pyta o cenę",
    stage: "opening",
    script:
      "Cena zależy od skali i konfiguracji, dlatego najpierw sprawdzam czy to w ogóle ma sens dla Pana firmy. Jeśli tak, podam ją wprost na spotkaniu, bez owijania w bawełnę. Mam dwa pytania, dobrze?",
    nextStepId: "diagnoza_otwarcie",
  },
  {
    id: "ok_najpierw_opowiedz",
    label: "Niech Pan mi najpierw opowie czym się zajmujecie",
    stage: "opening",
    script:
      "Jasne, powiem w dwóch zdaniach. Wcześniej chciałbym tylko zapytać o dwie rzeczy, żeby to co powiem miało sens dla Pana konkretnie, nie ogólnie. Można?",
    followup:
      "Pomagamy firmom transportowym ograniczyć ręczne wpisywanie zleceń i dokumentów, z gwarancją efektu zapisaną w umowie.",
    setterNote: "Followup wyłącznie jeśli klient nadal nalega przed odpowiedzią na pytania. To jedno zdanie z wynikiem, nie opis usługi.",
    nextStepId: "diagnoza_otwarcie",
  },
  {
    id: "ok_em",
    label: "Wyślij na maila",
    stage: "opening",
    script:
      "Mogę wysłać materiały, ale wolałbym zadać dwa krótkie pytania, zajmie to góra minutę, żeby nie były to ogólne informacje tylko coś dopasowane pod Pana firmę.",
    setterNote: "Jeśli nadal odmawia: zaproponuj wysyłkę informacji mailem. Status: follow-up, nie zamknięta sprawa.",
    nextStepId: "diagnoza_otwarcie",
  },
  // Standardowe obiekcje
  {
    id: "ok1",
    label: "Nie mam teraz czasu (pierwsze NIE)",
    stage: "opening",
    script:
      "Rozumiem. Biura spedycji z którymi pracuję tracą miesięcznie kilkadziesiąt godzin na ręczne przepisywanie dokumentów, to zwykle kilka tysięcy złotych. Te dwie minuty mogą to zmienić. Ma Pan je?",
  },
  {
    id: "ok2",
    label: "Nadal nie mam czasu (drugie NIE)",
    stage: "opening",
    script: "Jasne. Kiedy jest Pan bardziej dostępny, jutro rano czy po południu?",
    setterNote: "Zapisz dzień i godzinę. Ustaw follow-up w Pipeline.",
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
    setterNote: "Status: Nieaktywny (follow up). Data re-engagement: dzień po powrocie.",
  },
  {
    id: "ok5",
    label: "Muszę porozmawiać ze wspólnikiem / synem / żoną",
    stage: "wszedzie",
    script:
      "A mogliby Państwo dołączyć we dwoje na spotkanie przez internet? Trwa 45 minut, mam przygotowane liczby konkretnie dla Pana firmy. Wtedy oboje macie pełen obraz i decydujecie razem.",
    setterNote: "Jeśli nie może dołączyć: 'Rozumiem. Co musiałoby się wydarzyć na spotkaniu żeby [osoba] powiedziała tak?'",
  },
  {
    id: "ok1_szczere",
    label: "Nie mam czasu, naprawdę zajęty",
    stage: "opening",
    script: "Jasne, rozumiem. Kiedy byłoby Panu wygodniej, jutro rano czy po południu?",
    setterNote: "Nie przekonuj, nie próbuj wcisnąć rozmowy na siłę. Szczery brak czasu szanujesz i umawiasz konkretny termin, nie 'kiedyś'.",
  },
  {
    id: "ok1_wymowka",
    label: "Nie mam czasu, brzmi jak wymówka",
    stage: "opening",
    script:
      "Jasne, rozumiem. Powiem krótko o co chodzi, a Pan sam oceni czy warto dać mi te dwie minuty. Sprawdzam czy Pana biuro traci więcej niż kilkadziesiąt godzin miesięcznie na ręczne wpisywanie zleceń i dokumentów. Jeśli tak, to są realne pieniądze. Ma Pan te dwie minuty?",
    setterNote: "Poznaj po tonie: szybkie 'nie mam czasu' zaraz po przedstawieniu się, bez pytania o co chodzi.",
    nextStepId: "diagnoza_otwarcie",
  },
  {
    id: "ok_czas_minal",
    label: "Klient mówi że minęły już 2 minuty",
    stage: "opening",
    script:
      "Ma Pan rację, przepraszam. Zapytam wprost, dokończyć w skrócie teraz, czy woli Pan żebym oddzwonił i zrobił to porządnie?",
    setterNote: "Gdy diagnoza trwa dłużej niż deklarowane 2 minuty, przyznaj to wprost i daj klientowi wybór.",
  },
  {
    id: "icp_ponizej_progu",
    label: "Poniżej progu ICP — 1 osoba w biurze, brak planu zatrudnienia",
    stage: "icp",
    script:
      "Dziękuję za szczerość. Przy tej wielkości biura pewnie nie poczułby Pan jeszcze realnej różnicy, więc szczerze, nie namawiam na coś co się nie zwróci. Mogę zapisać kontakt i wrócić za jakieś 3 miesiące, jak zespół się powiększy, dobrze?",
    setterNote: "Status: Niekwalifikowany. Jeśli zgoda: data re-engagement +90 dni w Pipeline. Koniec rozmowy, nie wracaj do diagnozy.",
  },
  {
    id: "icp_nie_decydent",
    label: "Rozmówca nie jest decydentem",
    stage: "icp",
    script:
      "Rozumiem. Zaproponuję najprościej. Umówmy od razu 45 minut wspólnie z osobą decyzyjną, żeby nie musiał Pan tego później tłumaczyć z drugiej ręki. Kiedy mogliby Państwo razem, w tym czy w przyszłym tygodniu?",
    followup:
      "Świetnie, rezerwuję ten termin już teraz. Wyślę zaproszenie na Państwa oboje maile, dobrze?",
    // Jeśli druga osoba mimo to nie może dołączyć: umów spotkanie z rozmówcą, zaznacz w
    // Pipeline "decydent nieobecny, do potwierdzenia przed ceną", Agent 2 musi to uwzględnić.
    setterNote: "Zarezerwuj Calendly i zapisz obie osoby w Pipeline, nie kończ rozmowy bez daty i godziny.",
    nextStepId: "spotkanie",
  },
  {
    id: "zewnetrzne_biuro_ksiegowe",
    label: "Faktury: zewnętrzne biuro rachunkowe",
    stage: "diagnoza",
    script:
      "Jasne, biuro rachunkowe zajmuje się rozliczeniami. A kto u Was przygotowuje i wysyła im dokumenty, faktury, potwierdzenia dostaw? To zwykle ta sama osoba co reszta administracji, zgadza się?",
    setterNote: "Nawet z zewnętrzną księgowością ktoś w firmie zbiera dokumenty ręcznie, to nadal ból do zmapowania.",
  },
  {
    id: "konkurencja_m365",
    label: "Ma wszystko w Microsoft 365 / Power Automate",
    stage: "diagnoza",
    script:
      "To brzmi jak solidna konfiguracja. Sprawdzam zwykle jedną rzecz: czy to faktycznie odczytuje dane z dokumentu i wypełnia je automatycznie, czy tylko przenosi plik do folderu, a ktoś nadal musi go otworzyć i przepisać ręcznie?",
    followup:
      "A co się dzieje gdy dokument wygląda inaczej niż zwykle? Flow ogarnia to sam, czy ktoś wtedy ręcznie interweniuje? I kto to utrzymuje, jak coś się zepsuje po aktualizacji?",
    setterNote: "Większość Power Automate tylko przenosi pliki, nie czyta danych. Jeśli klient ma realny OCR, przyznaj to uczciwie.",
  },
  {
    id: "po_co_to_pytanie",
    label: "Pyta po co te pytania, podważa ich sens",
    stage: "diagnoza",
    script:
      "Pytam, bo od tego zależy czy w ogóle mam dla Pana sensowną propozycję. Wolę to sprawdzić w dwie minuty, niż zabierać Panu czas na spotkanie, które niczego by nie dało.",
    setterNote: "Krótkie, szczere uzasadnienie. Po odpowiedzi wracaj natychmiast do przerwanego pytania.",
  },
  {
    id: "cena_nacisk_diagnoza",
    label: "Naciska na cenę już podczas kwalifikacji",
    stage: "diagnoza",
    script:
      "Rozumiem, że cena jest ważna, i to będzie jedna z pierwszych rzeczy które omówimy na najbliższym spotkaniu, razem z dokładnym wyliczeniem pod Pana firmę. Teraz chcę się tylko upewnić, że to w ogóle ma sens, dobrze?",
    setterNote: "Odróżnij od ok_cp (pytanie o cenę w opening). Ta dotyczy nacisku w trakcie diagnozy.",
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
    setterNote: "Jeśli mimo to nalega: nie walcz, przejdź dalej normalnie, zanotuj w Pipeline że pytanie o korzyść czasu nie zostało w pełni odpowiedziane.",
  },
  {
    id: "stawka_niechec",
    label: "Nie chce podać dokładnej stawki godzinowej",
    stage: "kalkulator",
    script:
      "Rozumiem, to szczegół księgowy. Wystarczy orientacyjnie: to bliżej 40, 55, czy 70 złotych za godzinę z narzutami?",
    setterNote: "Wpisz podaną wartość orientacyjną do kalkulatora, nie zostawiaj pustego pola.",
  },
  {
    id: "spedytorzy_dorazni",
    label: "Spedytorzy nie są zatrudnieni na stałe",
    stage: "diagnoza",
    script:
      "Rozumiem, czyli pracują doraźnie, na wezwanie. A gdy jest dużo zleceń naraz, ile osób realnie wtedy przy tym siedzi i ile godzin to zajmuje?",
    setterNote: "Forma zatrudnienia nie zmienia kwalifikacji, liczy się faktyczny czas pracy nad dokumentami.",
  },
  {
    id: "spotkanie_link_zapasowy",
    label: "Nie chce ustalać terminu teraz — wariant zapasowy z linkiem",
    stage: "closing",
    script:
      "Rozumiem, nie ma problemu. Wyślę Panu link do samodzielnej rezerwacji przez Calendly, wybierze Pan dogodny termin. Dostanie Pan też automatyczne przypomnienie SMS dzień przed.",
    // Domyślna ścieżka to rezerwacja terminu bezpośrednio na tej rozmowie (krok 3). Status
    // "Discovery umówione" dopiero gdy klient faktycznie zarezerwuje termin w Calendly.
    setterNote: "Użyj tylko gdy klient nie chce ustalić terminu na żywo. Wyślij link Calendly od razu.",
  },
];

export const ICP_RULES: IcpRule[] = [
  { ok: true, label: "Biuro", val: "Min. 2 osoby przy zleceniach (twardy disqualifier)" },
  { ok: true, label: "Decydent", val: "Właściciel lub wspólnik — weryfikuj na kwalifikacji" },
  { ok: true, label: "Ból", val: "Ręczna praca potwierdzona kalkulatorem ROI ≥ 80h/mc" },
  { ok: true, label: "Flota", val: "Orientacyjnie 10–150 pojazdów — sprawdź kalkulator" },
  {
    ok: true,
    label: "Przychód roczny",
    val: "Drugi, opcjonalny filtr ICP obok floty — nie blokuje rozmowy jeśli klient nie odpowie",
  },
  { ok: false, label: "Odrzuć", val: "< 2 osoby w biurze LUB potencjał ROI < 80h/mc łącznie" },
];

export const ACKNOWLEDGMENT_PHRASES = [
  "Rozumiem, to sporo.",
  "Jasne, widzę o co chodzi.",
  "To ma sens, dziękuję że Pan to wyjaśnił.",
  "Dobrze, zanotowałem.",
  "Rozumiem, czyli tak to u Pana wygląda.",
  "To pomaga mi zrozumieć sytuację.",
];
