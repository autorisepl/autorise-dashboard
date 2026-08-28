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
        text: "Dzień dobry, mówi {IMIĘ_SPRZEDAWCY} z Autorise. Widziałem że wypełnił Pan formularz o oszczędności czasu w biurze dla firm transportowych. Pracujemy na gwarancji w umowie: efekt albo zwrot pełnej sumy.",
        cel: "Klient od razu wie po co dzwonisz i co oferujemy, zanim uzna to za nachalną sprzedaż. Gwarancja zwrotu zdejmuje z niego ryzyko już na starcie.",
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
        cel: "Znaleźć konkretny wyzwalacz i realny ból, zanim przejdziesz do reszty pytań",
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
          action:
            "Odpowiadasz i przechodzisz wprost do ICP. Jeśli klient mówi że kliknął z ciekawości, użyj tego przejścia zamiast standardowego pytania o liczbę pojazdów: „Jak najbardziej rozumiem że był Pan ciekawy naszej oferty. Żeby dobrze dopasować rozwiązanie, powie mi Pan ile osób teraz pracuje w biurze z Panem?”. Prosta kontynuacja wprost do pytania ICP, bez zbędnego pośredniego zdania.",
          sayAfter:
            "Rozumiem, aczkolwiek musiał być jakiś powód dla którego kliknął Pan akurat w tę reklamę. Co to było?",
          goToStepId: "diagnoza_icp_flota",
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
          openObjectionId: "ok_nie_kojarzy",
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
          "Zapytam o dwie konkretne sytuacje, bo to właśnie w takich momentach zwykle widać, czy proces jest naprawdę odporny.",
          "Jak to wygląda gdy nagle przychodzi dużo zleceń naraz, na przykład w szczycie sezonu?",
        ],
        cel: "Sprawdzić czy pod presją proces się sypie, bez zakładania z góry że u klienta jest źle. Zdanie ramujące pokazuje że pytanie ma sens biznesowy, nie sugerując że klient ma problem.",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "say",
        text: "A jak radzicie sobie gdy spedytor jest nieobecny, choroba, urlop? Firma wtedy staje, czy ktoś to przejmuje bez problemu?",
        cel: "Druga konkretna sytuacja, sprawdza czy istnieje pojedynczy punkt awarii w procesie",
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
        cel: "Pytanie otwarte prowadzące do własnego opisu klienta, bez podsuwania mu gotowych kategorii — łatwiej rozpoznać prawdziwy ból we własnych słowach niż wybrać z cudzej listy",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: [
          "Podpowiedź wyłącznie dla Ciebie, nie czytaj klientowi.",
          "Przepisywanie zleceń z maila, PDF-a albo WhatsAppa: sygnał modułu Automatyzacja TMS.",
          "Szukanie i segregowanie CMR, potwierdzeń dostawy albo faktur: sygnał modułu Dokumenty i pliki.",
          "Dzwonienie żeby sprawdzić status albo czekanie na informację: sygnał modułu Powiadomienia automatyczne.",
        ],
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
        cel: "Zweryfikować orientacyjną skalę floty pod kątem ICP (10-150 pojazdów)",
      },
      {
        t: "say",
        text: "Orientacyjnie, przychód roczny firmy to bliżej trzech do dziesięciu milionów, dziesięciu do trzydziestu, czy powyżej trzydziestu? To pytanie zadaję tylko po to, żeby dobrze dobrać skalę rozwiązania, nie z ciekawości.",
        cel: "Drugi, opcjonalny filtr ICP obok liczby pojazdów, do dopasowania skali rozwiązania",
      },
      {
        t: "note",
        text: "Pytanie opcjonalne. Odpowiedź zapisywana jako drugi filtr ICP obok liczby pojazdów. Jeśli klient nie chce odpowiedzieć, nie jest to blokada dalszej rozmowy — przechodzisz dalej bez naciskania.",
      },
      {
        t: "say",
        text: "Ile osób pracuje w biurze? Chodzi mi o zlecenia, dokumenty, faktury.",
        cel: "Sprawdzić twardy próg ICP, poniżej 2 osób ból zwykle zbyt mały żeby uzasadnić inwestycję, niezależnie od gwarancji (gwarancja jest procentowa, skaluje się z wielkością biura)",
      },
      {
        t: "say",
        text: "A kto się czym zajmuje? Spedytorzy, ktoś od faktur?",
        cel: "Zebrać realny podział ról w biurze — przyda się przy zakładaniu ról w kalkulatorze niżej, zamiast wpisywać je ręcznie od zera",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Ścieżka '1 osoba, plan zatrudnienia' nie ma osobnej logiki liczbowej. Liczysz ją nadal jako 1 osobę w kalkulatorze niżej — ROI wyjdzie niższy, to naturalne przy mniejszym zespole, nie błąd. Zaznacz w Pipeline 'plan zatrudnienia, potwierdzić na Discovery', żeby nie zgubić tej informacji.",
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
        cel: "Ustalić czy rozmawiasz z osobą decyzyjną, żeby nie umówić spotkania bez sensu",
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
        text: "Jakiego systemu używacie do zarządzania zleceniami i flotą? Trans.eu, Timocom, coś własnego?",
        cel: "Ustalić punkt odniesienia — co już mają, żeby wiedzieć czego NIE trzeba zastępować",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Klient wspomniał Microsoft 365 / Power Automate / Power Apps jako 'już mam to ogarnięte'.",
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
        cel: "Ogólne rozeznanie zamiast pytań pod klasyczną spedycję, które przy tym profilu klienta mogą nie pasować",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Pytania 2d do 2g są zbudowane pod klasycznego spedytora z CMR na giełdach transportowych. Przy tym kliencie oceń na słuch które z nich mają sens, pomijaj te które oczywiście nie pasują (np. pytanie o CMR przy kliencie kurierskim bez międzynarodowego frachtu), i wróć do standardowej ścieżki od kroku który faktycznie pasuje do jego odpowiedzi.",
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
        text: "Powie mi Pan, jak te zlecenia do Was trafiają? Ktoś to musi ręcznie przepisywać z maili czy PDF-ów do systemu?",
        cel: "Sprawdzić czy pierwszy etap (przyjęcie zlecenia) generuje pracę ręczną",
      },
      { t: "client", text: "[opis]" },
      {
        t: "note",
        text: "Jeśli klient nie rozumie pytania lub miesza je ze zleceniem dla kierowcy: „Chodzi mi o dokument od klienta który zamawia u Was transport, nie polecenie wyjazdu dla kierowcy.”",
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
        text: "Jak to wygląda z CMR-ami? Po kursie, jak to do Was wraca?",
        cel: "Sprawdzić czy dokumenty po kursie wymagają ręcznego przepisywania, automatyczne odczytywanie dokumentów wchodzi w moduł Dokumenty i pliki",
      },
      {
        t: "say",
        text: "Potwierdzenia dostawy wchodzą u Pana razem z CMR, czy osobno?",
        cel: "Sprawdzić czy klient rozróżnia CMR i osobne potwierdzenie dostawy — u większości nie, ale trafiają się wyjątki, np. druk z sieci handlowej",
      },
      {
        t: "note",
        text: [
          "Papier fizyczny lub zdjęcie na WhatsApp/mailem: moduł Dokumenty i pliki, zaznacz w kalkulatorze.",
          "Elektroniczne, np. eCMR: inny profil klienta, sprawdź czy dane i tak trzeba ręcznie przenieść do rozliczeń.",
        ],
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
        text: "A z fakturami jak to wygląda? Tymi które wystawiacie i tymi które dostajecie. Kto to ogarnia i wpisuje do księgowości?",
        cel: "Sprawdzić skalę pracy manualnej przy fakturach",
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
        text: "I ostatnia rzecz. Jak Pan sam sprawdza dziś status jakiegoś zlecenia? Trzeba zadzwonić do spedytora, czy widać to od razu w systemie?",
        cel: "Sprawdzić czy właściciel ma widoczność operacyjną bez dzwonienia, kandydat na moduł Powiadomienia automatyczne",
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
        text: "Orientacyjnie, ile kosztuje Pana godzina pracy osoby w biurze, razem ze wszystkimi narzutami?",
        cel: "Zebrać realną stawkę zamiast domyślnego szacunku — dokładniejsza liczba dla klienta",
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
        cel: "Ustawić oczekiwanie że to pierwsze przybliżenie, nie finalna liczba — dokładny pomiar per moduł następuje dopiero na spotkaniu wdrożeniowym (Załącznik 1 umowy). Zero słowa 'Kickoff' w rozmowie z klientem.",
      },
      {
        t: "note",
        text: "Kalkulator poniżej wypełnia się sam z tego co klient już powiedział: role z pytania o zespół (2a), moduły z checkboxów zaznaczonych automatycznie w krokach 2d do 2g. Dopytaj tylko o godziny dziennie per rola, jeśli jeszcze nie padły w rozmowie.",
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
        cel: "Budować wiarygodność przez uczciwość, nie obiecywać więcej niż realnie możliwe. 70 procent to ten sam wskaźnik co potencjał pokazany w kalkulatorze poniżej, nie osobna liczba",
      },
      {
        t: "say",
        text: "Ta liczba dotyczy konkretnie tych zadań które przed chwilą razem policzyliśmy. Nie ogólnej wydajności zespołu, tylko tej powtarzalnej pracy którą Pan sam opisał.",
        cel: "Zapobiec późniejszemu nieporozumieniu przy zobowiązaniu zwrotu na umowie — ono dotyczy konkretnych, potwierdzonych procesów, nie ogólnej produktywności czy zarobków firmy",
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
        cel: "Sprawić żeby klient sam nazwał korzyść — silniej przekonuje niż gdybyś to Ty powiedział",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Zapamiętaj dokładne słowa klienta z tej odpowiedzi, przydadzą się żeby zacytować mu je dosłownie na rozmowie sprzedażowej. To działa bardzo mocno.",
      },
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
      { t: "note", text: "Używaj po 2 nieudanych próbach ukazania bólu. Nie sprzedawaj na siłę." },
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
        text: [
          "Rozumiem. Na ten moment nie mamy dla Pana sensownej propozycji i nie chcę zabierać Panu czasu.",
          "Odezwę się za jakieś 3 miesiące, dobrze?",
        ],
      },
      {
        t: "note",
        text: "Jeśli zgadza się: status Nieaktywny (follow up), data re-engagement za 3 mc.",
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
        t: "note",
        text: "Jeśli rozmówca NIE jest decydentem (patrz obiekcja 'Rozmówca nie jest decydentem', pole 'decydent: nie' w Pipeline), zamiast poniższej propozycji użyj: „Zaproponuję najprościej. Umówmy od razu 45 minut wspólnie z osobą decyzyjną, żeby nie musiał Pan tego później tłumaczyć z drugiej ręki.” Jeśli rozmówca sam jest decydentem, pomiń tę frazę i użyj standardowej propozycji poniżej.",
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
        text: "Zarezerwuj termin bezpośrednio w Calendly na podany dzień i godzinę, teraz, w trakcie rozmowy. Klient tylko potwierdza, nie wysyłasz mu linku do samodzielnego wyboru — link zostaje jako wariant zapasowy wyłącznie gdy klient nie chce ustalić terminu na żywo (patrz obiekcja poniżej).",
      },
      {
        t: "say",
        text: "Jeszcze jedno. Całe wdrożenie, od tego spotkania aż po uruchomienie systemu u Pana w firmie, prowadzę osobiście. Nie przekazuję tego nikomu innemu. Będzie Pan miał jeden kontakt przez cały proces, nie różnych ludzi na różnych etapach.",
        textSetter:
          "Jeszcze jedno. Całe wdrożenie, od tego spotkania aż po uruchomienie systemu u Pana w firmie, prowadzi osobiście założyciel Autorise, Michał. Nie przekazuje tego nikomu innemu. Będzie Pan miał jeden kontakt przez cały proces, nie różnych ludzi na różnych etapach.",
        cel: "Budować autorytet i ciągłość — klient rozmawia z decydentem i wykonawcą w jednej osobie, nie trafia do korporacyjnego przekazywania sprawy między działami",
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
    label: "Nie kojarzy / nie wie o co chodzi / co Pan sprzedaje / to nie ja wypełniałem",
    stage: "opening",
    script:
      "Już tłumaczę. Autorise buduje firmom transportowym rozwiązania, które zdejmują z biura powtarzalną, ręczną robotę, każdą taką gdzie ktoś przepisuje albo przekleja dane z jednego miejsca w drugie. Nie wiem jeszcze co u Pana zajmuje najwięcej czasu, więc zamiast zgadywać, chciałbym zadać kilka krótkich pytań o to jak wygląda u Pana zwykły dzień w biurze. Od razu będzie wiadomo, czy jest tu w ogóle co usprawniać. Możemy tak zrobić?",
    followup:
      "W skrócie, pomagamy odzyskać czas, który biuro traci na ręcznych czynnościach, a efekt jest zapisany w umowie na gwarancję, więc Pan nie ryzykuje. Reszta zależy od tego co powie mi Pan o swojej firmie.",
    note: "Jedna odpowiedź na wszystkie warianty 'nie kojarzę / o co chodzi / co sprzedajecie / to nie ja / niech Pan opowie'. NIE zakładaj że klient ma akurat problem z przepisywaniem dokumentów, NIE zawężaj do jednego modułu. Otwierasz temat szeroko i przechodzisz do pytań. Jeśli mówi że wypełnił ktoś inny albo że musi to przemyśleć: „Rozumiem, to bez znaczenia, i tak najlepiej sprawdzić to na Pana liczbach.” i przechodzisz do pytań. Jeśli po pytaniach dalej chce się namyślić, ustaw follow-up w Pipeline z konkretną datą.",
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
    note: "Jeśli klient nadal odmawia rozmowy: „Rozumiem, wyślę ogólne informacje na [email z Pipeline], a jeśli po przeczytaniu będzie Pan chciał pogłębić temat, zapraszam do kontaktu.” Status: follow-up, nie zamknięta sprawa.",
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
    note: "Pierwsze „nie mam czasu” zbijasz raz (script). Jeśli klient dalej nie chce, NIE przekonuj więcej, przejdź do followup: umawiasz KONKRETNY termin (dzień + pora) i zapisujesz w Pipeline jako follow-up. To samo gdy klient mówi że „minęły już 2 minuty” w trakcie diagnozy, przyznaj wprost „Ma Pan rację” i daj wybór: dokończyć w skrócie teraz czy oddzwonić i zrobić to porządnie. Szczery brak czasu szanujesz, wymówki nie warto forsować.",
    nextStepId: "diagnoza_otwarcie",
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
    note: "Jeśli nie może dołączyć: 'Rozumiem. Co musiałoby się wydarzyć na spotkaniu żeby [osoba] powiedziała tak?'",
  },
  {
    id: "icp_ponizej_progu",
    label: "Poniżej progu ICP — 1 osoba w biurze, brak planu zatrudnienia",
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
    note: "Nawet z zewnętrzną księgowością ktoś wewnątrz firmy zbiera i wysyła dokumenty ręcznie — to wciąż ból do zmapowania w kalkulatorze (moduł Dokumenty i pliki).",
  },
  {
    id: "konkurencja_m365",
    label: "Ma wszystko w Microsoft 365 / Power Automate",
    stage: "diagnoza",
    script:
      "To brzmi jak solidna konfiguracja. Sprawdzam zwykle jedną rzecz, czy to faktycznie odczytuje dane z dokumentu i wypełnia je automatycznie, czy tylko przenosi plik do folderu, a ktoś nadal musi go otworzyć i przepisać ręcznie?",
    followup:
      "A co się dzieje gdy dokument wygląda inaczej niż zwykle? Flow ogarnia to sam, czy ktoś wtedy ręcznie interweniuje? I kto to utrzymuje, jak coś się zepsuje po aktualizacji?",
    note: "Większość konfiguracji Power Automate przenosi pliki, nie wyciąga z nich danych, i utrzymuje ją jedna osoba która to kiedyś skonfigurowała. Jeśli klient ma faktycznie zaawansowaną integrację z realnym OCR i utrzymaniem, przyznaj to uczciwie, nie naciskaj wbrew faktom.",
  },
  {
    id: "po_co_to_pytanie",
    label: "Pyta po co te pytania, podważa ich sens",
    stage: "diagnoza",
    script:
      "Pytam, bo od tego zależy czy w ogóle mam dla Pana sensowną propozycję. Wolę to sprawdzić w dwie minuty, niż zabierać Panu czas na spotkanie, które niczego by nie dało.",
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
    note: "ICP i kalkulator liczą się tak samo — pytaj o realną liczbę osób i godzin w szczycie, niezależnie od formy zatrudnienia. Forma zatrudnienia nie zmienia kwalifikacji, liczy się faktyczny czas pracy nad dokumentami.",
  },
  {
    id: "spotkanie_link_zapasowy",
    label: "Nie chce ustalać terminu teraz — wariant zapasowy z linkiem",
    stage: "closing",
    script:
      "Rozumiem, nie ma problemu. Wyślę Panu link do samodzielnej rezerwacji przez Calendly, wybierze Pan dogodny termin. Dostanie Pan też automatyczne przypomnienie SMS dzień przed.",
    note: "Użyj wyłącznie gdy klient wyraźnie nie chce ustalić terminu na żywo — domyślna ścieżka to rezerwacja terminu bezpośrednio na tej rozmowie (krok 3, opcja 'podaje dzień i porę'). Wyślij link Calendly natychmiast po rozmowie, nie 'zaraz', teraz. Zmień status w Pipeline na 'Discovery umówione' dopiero gdy klient faktycznie zarezerwuje termin w Calendly, nie w momencie wysłania linku.",
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
    val: "Opcjonalny filtr obok floty. Nie blokuje rozmowy jeśli klient nie odpowie.",
  },
  {
    ok: false,
    label: "Odrzuć",
    val: "Mniej niż 2 osoby w biurze albo łączny potencjał poniżej 80 godzin miesięcznie.",
  },
];

// Krótkie potwierdzenia + mostki do kolejnego pytania. Potwierdzenie utrzymuje
// kontakt i pokazuje że słuchasz, mostek płynnie prowadzi do następnego etapu bez
// urwania rozmowy. Grupowane po funkcji, żeby setter szybko znalazł właściwą frazę.
export const ACKNOWLEDGMENT_PHRASES = [
  // Potwierdzenie, że słyszysz i rozumiesz
  "Rozumiem, to sporo.",
  "Jasne, widzę dokładnie o czym Pan mówi.",
  "To ma sens, dziękuję że Pan to wyjaśnił.",
  "Rozumiem, czyli tak to u Pana teraz wygląda.",
  "Dobrze, zanotowałem, to jest dla mnie ważne.",
  "Wiele firm z którymi rozmawiam ma podobnie.",
  // Mostek do kolejnego pytania
  "Skoro tak, to pozwoli Pan że dopytam o jedną rzecz.",
  "To mi dużo mówi, chciałbym jeszcze zrozumieć drugą stronę.",
  "Żeby to policzyć rzetelnie, potrzebuję jeszcze jednej liczby.",
  "Dobrze, a teraz najważniejsze pytanie z mojej strony.",
  // Zbicie napięcia / gdy klient się spina
  "Spokojnie, na razie tylko zbieram obraz sytuacji, nic Pana nie zobowiązuje.",
  "Nie sprzedaję Panu niczego przez telefon, po prostu sprawdzam czy to ma sens.",
  // Domknięcie wątku przed przejściem dalej
  "Dobrze, to mam już wystarczająco żeby przejść do konkretów.",
  "To wszystko układa się w całość, przejdźmy do tego co z tego wynika.",
];
