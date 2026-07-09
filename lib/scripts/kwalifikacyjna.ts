// Zasada: jeśli Agency Leaders nie dał gotowej instrukcji na konkretną sytuację,
// rozwiązanie buduje się z ich zasad ogólnych (personalizacja, konkret zamiast
// ogólnika, klient sam dochodzi do wniosku przez pytania), nie jako coś oderwanego
// od frameworku. Każda nowa linia dialogowa w tym pliku podlega tej zasadzie.
//
// Kolejność kroków 2-2k: ICP (flota, biuro, decydent) sprawdzane ZARAZ PO pierwszym
// pytaniu diagnostycznym, PRZED szczegółową diagnozą dokumentów (2c-2h). Powód:
// jeśli klient nie spełnia twardych progów ICP (min. 2 osoby w biurze, obecność
// decydenta), rozmowa kończy się od razu — bez inwestowania czasu w pięć pytań
// dokumentowych które i tak nie zostaną wykorzystane.
//
// Zasada gwarancji: obietnica dotyczy zawsze konkretnych, wspólnie policzonych i przez
// klienta potwierdzonych procesów manualnych, nigdy ogólnej wydajności zespołu czy
// przychodu firmy. Każda wzmianka o gwarancji w skrypcie musi to jasno zaznaczać,
// żeby uniknąć rozczarowania klienta przy odbiorze po 30 dniach.

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
          "Zostawił Pan kontakt w sprawie odzyskania czasu jaki biuro traci na ręczne wpisywanie zleceń i pilnowanie dokumentów.",
        ],
      },
      {
        t: "say",
        text: "Chciałbym zadać dwa, trzy pytania żeby sprawdzić czy to w ogóle ma sens dla Pana firmy — zajmie dosłownie dwie minuty, dobrze?",
        cel: "Uzasadnienie prośby o czas wbudowane w samo zdanie, nie osobna adnotacja — klient wie po co te 2 minuty, zanim zdąży pomyśleć że to sprzedaż",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Jeśli klient nie odbiera w ogóle (dzwonisz, nikt nie podnosi): to nie jest ten ekran. Po 3 próbach przejdź do zakładki Wiadomości i wyślij SMS z szablonu 'Brak odbioru po 3 próbach'.",
      },
    ],
    decision: {
      question: "Co odpowiedział klient?",
      options: [
        {
          trigger: "Tak, ma 2 minuty",
          action: "Przejdź do diagnozy",
          goToStepId: "diagnoza_otwarcie",
          tone: "positive",
        },
        {
          trigger: "Nie ma czasu — brzmi na szczere",
          action: "Pokaż reakcję na szczery brak czasu",
          openObjectionId: "ok1_szczere",
          tone: "warning",
        },
        {
          trigger: "Nie ma czasu — brzmi na wymówkę",
          action: "Pokaż reakcję na wymówkę",
          openObjectionId: "ok1_wymowka",
          tone: "warning",
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
        cel: "Znaleźć konkretny wyzwalacz i realny ból, zanim przejdziesz do reszty pytań",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Czy klient podał konkretny powód?",
      options: [
        {
          trigger: "Tak, konkretny ból lub wyzwalacz",
          action: "Kontynuuj do ICP",
          goToStepId: "diagnoza_icp_flota",
          tone: "positive",
        },
        {
          trigger: "Nie potrafi nazwać, 'trudno powiedzieć'",
          action: "Dopytaj raz jeszcze zanim uznasz brak bólu",
          goToStepId: "diagnoza_doprecyzowanie_bolu",
          tone: "warning",
        },
        {
          trigger: "Zaciekawiła reklama, twierdzi że wszystko sprawnie",
          action: "To co innego niż brak umiejętności nazwania bólu — użyj konkretnych scenariuszy",
          goToStepId: "diagnoza_scenariusze_konkretne",
          tone: "warning",
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
        text: "Rozumiem, dobrze że sprawnie działa na co dzień. Zapytam o dwie konkretne sytuacje, bo to właśnie w takich momentach większość firm traci klientów albo popełnia kosztowne pomyłki. Jak to wygląda gdy nagle przychodzi dużo zleceń naraz, na przykład w szczycie sezonu?",
        cel: "Sprawdzić czy pod presją proces się sypie mimo że na co dzień wygląda sprawnie — dodane zdanie o skali konsekwencji zwiększa szansę że klient szczerze opowie, bo widzi że pytanie ma realny sens biznesowy, nie jest przypadkowe",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "say",
        text: "A jak radzicie sobie gdy spedytor jest nieobecny, choroba, urlop — firma wtedy staje, czy ktoś to przejmuje bez problemu?",
        cel: "Druga konkretna sytuacja, sprawdza czy istnieje pojedynczy punkt awarii w procesie",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Czy w którejś z tych sytuacji pojawił się realny problem?",
      options: [
        {
          trigger: "Tak, w szczycie lub przy nieobecności coś szwankuje",
          action: "To jest realny ból, kontynuuj do ICP",
          goToStepId: "diagnoza_icp_flota",
          tone: "positive",
        },
        {
          trigger: "Nie, oba scenariusze też ogarnięte",
          action: "Użyj scenariusza braku bólu — teraz naprawdę kończ",
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
        text: "Rozumiem, czasem trudno to od razu nazwać. Powiem inaczej — co najbardziej Panu przeszkadza w codziennej pracy biura: dokumenty, czyli papiery które się gubią albo trzeba ich szukać, czas, czyli nadgodziny i zaległości, czy raczej kontrola, czyli musi Pan dopytywać ludzi zamiast po prostu wiedzieć co się dzieje?",
        cel: "Trzy kierunki z konkretnym przykładem przy każdym — łatwiej rozpoznać własną sytuację w przykładzie niż w abstrakcyjnym słowie",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Czy teraz podał konkretny kierunek?",
      options: [
        {
          trigger: "Tak, wskazał kierunek",
          action: "Kontynuuj do ICP",
          goToStepId: "diagnoza_icp_flota",
          tone: "positive",
        },
        {
          trigger: "Nadal nic konkretnego, 'wszystko w porządku'",
          action: "Użyj scenariusza braku bólu — teraz naprawdę kończ",
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
    lines: [
      {
        t: "say",
        text: "Ile pojazdów ma Pan teraz aktywnie?",
        cel: "Zweryfikować orientacyjną skalę floty pod kątem ICP (10-150 pojazdów)",
      },
      {
        t: "say",
        text: "Ile osób pracuje w biurze — mam na myśli osoby które zajmują się zleceniami, dokumentami, fakturami?",
        cel: "Sprawdzić twardy próg ICP — poniżej 2 osób matematycznie nie osiągniemy 80h gwarancji",
      },
    ],
    decision: {
      question: "Ile osób w biurze?",
      options: [
        {
          trigger: "2 lub więcej osób",
          action: "ICP spełnione",
          goToStepId: "diagnoza_icp_decydent",
          tone: "positive",
        },
        {
          trigger: "1 osoba, plan zatrudnienia w najbliższych 3 miesiącach",
          action: "Kontynuuj ostrożnie",
          goToStepId: "diagnoza_icp_decydent",
          tone: "warning",
        },
        {
          trigger:
            "1 osoba w biurze, brak konkretnego planu zatrudnienia w najbliższych 3 miesiącach",
          action: "Pokaż zakończenie rozmowy poniżej progu",
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
          trigger: "Tak, właściciel",
          action: "Decydent obecny",
          goToStepId: "diagnoza_tms",
          tone: "positive",
        },
        {
          trigger: "Nie, ktoś inny decyduje",
          action: "Pokaż propozycję wspólnego spotkania",
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
        text: "Czy korzystacie z TMS-u, czyli programu do zarządzania flotą i zleceniami, na przykład coś w rodzaju Trans.eu, TIMOCOM, Sky-Pol, WEB-TRANS albo podobnego systemu?",
        cel: "Ustalić punkt odniesienia — co już mają, żeby wiedzieć czego NIE trzeba zastępować",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Jeśli klient wspomni Microsoft 365, Power Automate, Power Apps lub podobne narzędzie ogólnobiurowe jako 'już mam to ogarnięte': przejdź do obiekcji 'konkurencja_m365' w prawym panelu zamiast kontynuować standardową diagnozę, zanim ustalisz co realnie robi ta konfiguracja.",
      },
    ],
    decision: {
      question: "Co odpowiedział klient?",
      options: [
        {
          trigger: "Ma TMS, podał nazwę",
          action: "Zanotuj nazwę dosłownie w Pipeline",
          goToStepId: "diagnoza_dokumenty_zlecenie",
          tone: "positive",
        },
        {
          trigger: "Brak programu, Excel/WhatsApp/telefon",
          action: "Zapisz jako 'brak TMS' — to też ważna informacja",
          goToStepId: "diagnoza_dokumenty_zlecenie",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "diagnoza_dokumenty_zlecenie",
    nr: "2d",
    label: "ZLECENIE TRANSPORTOWE",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Pierwsza rzecz: zlecenie transportowe, dokument w którym zleceniodawca zamawia przewóz. Jak dokładnie takie zlecenie do Was trafia, i co się z nim dzieje zanim trafi do systemu lub kalendarza kierowców?",
        cel: "Sprawdzić czy pierwszy etap (przyjęcie zlecenia) generuje pracę ręczną",
      },
      { t: "client", text: "[opis]" },
      {
        t: "note",
        text: "Jeśli klient nie rozumie pytania lub miesza je ze zleceniem dla kierowcy: 'Mam na myśli dokument od klienta który zamawia u Was transport, nie polecenie wyjazdu dla kierowcy.'",
      },
    ],
    decision: {
      question: "Potwierdzone przez klienta?",
      options: [
        {
          trigger: "Tak, robi to ręcznie (mail/PDF/zdjęcie)",
          action: "Zaznacz w kalkulatorze",
          goToStepId: "diagnoza_dokumenty_cmr",
          tone: "positive",
          calculatorFlag: "zlecenia",
        },
        {
          trigger: "Nie, to już zautomatyzowane inaczej",
          action: "Nie zaznaczaj, kontynuuj",
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
        text: [
          "Druga rzecz: list przewozowy CMR, dokument potwierdzający że towar został przyjęty i dostarczony.",
          "Po kursie, jak CMR wraca do Was?",
        ],
        cel: "Sprawdzić czy dokumenty po kursie wymagają ręcznego przepisywania — automatyczne odczytywanie dokumentów (CMR, faktury)",
      },
      {
        t: "say",
        text: "Ten sam dokument, po dostarczeniu towaru, podpisuje odbiorca jako potwierdzenie że wszystko dotarło w porządku. U większości firm to jest ten sam papier, ale jeśli u Pana to jest osobny formularz, na przykład od dużej sieci handlowej, proszę mi o tym powiedzieć.",
        cel: "Sprawdzić czy klient rozróżnia CMR i osobne potwierdzenie dostawy — u większości nie, ale trafiają się wyjątki",
      },
      {
        t: "note",
        text: "Papier fizyczny lub zdjęcie na WhatsApp/mailem: to automatyczne odczytywanie dokumentów (CMR, faktury), zaznacz w kalkulatorze. Elektroniczne, np. eCMR: inny profil klienta, sprawdź czy dane i tak trzeba ręcznie przenieść do rozliczeń.",
      },
    ],
    decision: {
      question: "Potwierdzone przez klienta?",
      options: [
        {
          trigger: "Tak, ręczne przepisywanie CMR/potwierdzeń",
          action: "Zaznacz w kalkulatorze",
          goToStepId: "diagnoza_dokumenty_faktura",
          tone: "positive",
          calculatorFlag: "cmr",
        },
        {
          trigger: "Nie, to już zautomatyzowane inaczej",
          action: "Nie zaznaczaj, kontynuuj",
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
        text: "Czwarta rzecz: faktury, te które wystawiacie i te które dostajecie. Kto to sprawdza i wpisuje do księgowości?",
        cel: "Sprawdzić skalę pracy manualnej przy fakturach",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Kto obsługuje faktury?",
      options: [
        {
          trigger: "Jedna osoba ręcznie wpisuje",
          action:
            "Ile mniej więcej faktur miesięcznie to jest, licząc te które wystawiacie i te które dostajecie?",
          goToStepId: "diagnoza_dokumenty_faktura_platnosci",
          tone: "positive",
          calculatorFlag: "faktury_recznie",
        },
        {
          trigger: "Zewnętrzne biuro rachunkowe",
          action: "Pokaż jak pogłębić ten wątek",
          openObjectionId: "zewnetrzne_biuro_ksiegowe",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "diagnoza_dokumenty_faktura_platnosci",
    nr: "2f2",
    label: "PILNOWANIE PŁATNOŚCI",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "A czy ktoś systematycznie pilnuje które faktury od klientów są opłacone, czy to sprawdzanie od czasu do czasu w systemie bankowym?",
        cel: "Sprawdzić czy istnieje systematyczna kontrola płatności",
      },
    ],
    decision: {
      question: "Czy ktoś systematycznie pilnuje płatności?",
      options: [
        {
          trigger: "Nie, sprawdzają od czasu do czasu",
          action: "Zaznacz w kalkulatorze (faktury)",
          goToStepId: "diagnoza_dokumenty_status",
          tone: "positive",
          calculatorFlag: "faktury_recznie",
        },
        {
          trigger: "Tak, ktoś to systematycznie robi",
          action: "Nie zaznaczaj",
          goToStepId: "diagnoza_dokumenty_status",
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
        text: "Piąta rzecz, ostatnia: jak Pan sam, jako właściciel, sprawdza dziś status konkretnego zlecenia, czy trzeba zadzwonić do spedytora, czy widać to w systemie?",
        cel: "Sprawdzić czy właściciel ma widoczność operacyjną bez dzwonienia — kandydat na alerty i widoczność statusu na WhatsApp",
      },
      {
        t: "note",
        text: "To jest pytanie o alerty i widoczność statusu na WhatsApp oraz o widoczność operacyjną. Jeśli właściciel musi dzwonić lub pytać osobiście żeby wiedzieć co się dzieje, to jest osobny, ważny ból, niezależny od dokumentów, zanotuj osobno.",
      },
    ],
    decision: {
      question: "Czy właściciel ma widoczność bez dzwonienia?",
      options: [
        {
          trigger: "Nie, musi dzwonić do spedytora",
          action: "Zaznacz w kalkulatorze (komunikacja)",
          goToStepId: "diagnoza_podsumowanie_dokumentow",
          tone: "positive",
          calculatorFlag: "komunikacja",
        },
        {
          trigger: "Tak, ma to na bieżąco",
          action: "Nie zaznaczaj",
          goToStepId: "diagnoza_podsumowanie_dokumentow",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "diagnoza_podsumowanie_dokumentow",
    nr: "2h",
    label: "PODSUMOWANIE DO KALKULATORA",
    tag: "AKCJA",
    lines: [
      {
        t: "action",
        text: "To jest checkpoint, nie pytanie do klienta. Spójrz na pasek kalkulatora nad skryptem — powinny tam świecić się checkboxy za każdą rzecz którą klient przed chwilą potwierdził jako ręczną (zlecenia, dokumenty, płatności, widoczność). Jeśli czegoś brakuje mimo że klient to powiedział, zaznacz ręcznie teraz, zanim przejdziesz do podania mu liczby — to od tych zaznaczeń zależy dokładność kwoty którą za chwilę usłyszy.",
      },
    ],
    nextStepId: "diagnoza_kalkulator",
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
        text: "Podsumowując to o czym rozmawialiśmy, ile czasu dziennie to wszystko zajmuje, licząc wszystkie osoby razem?",
        cel: "Zebrać dane do konkretnego wyliczenia straty czasu",
      },
      { t: "client", text: "[odpowiedź lub 'nie wiem']" },
    ],
    decision: {
      question: "Klient podał liczbę czy się waha?",
      options: [
        {
          trigger: "Podał konkretną liczbę godzin",
          action: "Wpisz do kalkulatora, przejdź dalej",
          goToStepId: "diagnoza_liczba",
          tone: "positive",
        },
        {
          trigger: "Mówi 'nie wiem' / 'trudno powiedzieć'",
          action:
            "Powiedz: 'Rozumiem, trudno to na pierwszy rzut oka ocenić. Wróćmy do tego co Pan powiedział — [wymień konkretnie potwierdzone rzeczy z kroków dokumentowych]. Gdyby Pan miał zgadywać, to bliżej pół godziny dziennie na osobę, godziny, czy więcej?' Poczekaj na odpowiedź, dopiero wtedy wpisz do kalkulatora.",
          goToStepId: "diagnoza_liczba",
          tone: "warning",
        },
      ],
    },
  },
  {
    id: "diagnoza_liczba",
    nr: "2j",
    label: "PODANIE LICZBY KLIENTOWI",
    tag: "MÓWISZ",
    lines: [
      {
        t: "note",
        text: "Odczytaj wyniki z kalkulatora poniżej. Nie zaokrąglaj, nie uśredniaj — liczba jest personalizowana dla tej firmy.",
      },
      {
        t: "say",
        text: [
          "Na podstawie tego co Pan powiedział — Pana biuro traci [WYNIK Z KALKULATORA] godzin miesięcznie na ręcznej pracy.",
          "To wartość [WARTOŚĆ PLN] złotych miesięcznie.",
        ],
      },
      {
        t: "say",
        text: "Nie każdą z tych godzin da się zautomatyzować w stu procentach, bo część to rozmowy z klientami i decyzje. Realistycznie mówimy o 75 do 85 procentach tego czasu, czyli [WYNIK × 0.8] godzin miesięcznie wracających do biura.",
        cel: "Budować wiarygodność przez uczciwość — nie obiecywać więcej niż realnie możliwe",
      },
      {
        t: "say",
        text: "Ta liczba dotyczy konkretnie tych zadań które przed chwilą razem policzyliśmy — nie ogólnej wydajności zespołu, tylko tej powtarzalnej pracy którą Pan sam opisał.",
        cel: "Zapobiec późniejszemu nieporozumieniu przy gwarancji na umowie — gwarancja dotyczy konkretnych, potwierdzonych procesów, nie ogólnej produktywności czy zarobków firmy",
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
        text: "Gdyby te [LICZBA Z KALKULATORA] godzin miesięcznie wróciły do biura, co by Pan z nimi zrobił?",
        cel: "Sprawić żeby klient sam nazwał korzyść — silniej przekonuje niż gdybyś to Ty powiedział",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Jak zareagował klient?",
      options: [
        {
          trigger: "Odpowiada konkretnie",
          action: "Potwierdź i przejdź dalej — to gotowy materiał do Kroku 3",
          goToStepId: "spotkanie",
          tone: "positive",
        },
        {
          trigger: "Milczy, 'nie wiem, nie myślałem'",
          action: "Pokaż podpowiedź",
          openObjectionId: "czas_milczy",
          tone: "warning",
        },
        {
          trigger: "Reaguje obronnie",
          action: "Pokaż uspokojenie",
          openObjectionId: "czas_obronny",
          tone: "warning",
        },
        {
          trigger: "Przeskakuje do ceny",
          action: "Pokaż jak zareagować",
          openObjectionId: "czas_przeskakuje",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "brak_bolu",
    nr: "2x",
    label: "BRAK BÓLU — wyjście",
    tag: "UWAGA",
    lines: [
      { t: "note", text: "Używaj po 2 nieudanych próbach ukazania bólu. Nie sprzedawaj na siłę." },
      {
        t: "say",
        text: [
          "Słyszę że u Pana to działa sprawnie. Nie chcę zajmować Pana czasu.",
          "Czy jest jakiś aspekt logistyki gdzie czujecie że traci się czas lub robi się za dużo ręcznie?",
        ],
      },
      { t: "client", text: "Nie, wszystko gra." },
      {
        t: "say",
        text: [
          "Rozumiem. W takim razie prawdopodobnie nie jesteśmy teraz dla siebie.",
          "Mogę zadzwonić za kilka miesięcy gdy się coś zmieni — czy to ma sens?",
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
        t: "say",
        text: [
          "Na podstawie tego co Pan powiedział — myślę że możemy Pana firmie realnie pomóc.",
          "Mam propozycję: 45-minutowe spotkanie przez internet — pokażę jak dokładnie wygląda automatyzacja dla firmy o tej skali, z Pana liczbami.",
        ],
      },
      {
        t: "say",
        text: "Kiedy ma Pan wolne 45 minut w tym lub przyszłym tygodniu — rano czy po południu?",
      },
      { t: "client", text: "[proponuje termin]" },
      {
        t: "say",
        text: "Jeszcze jedno — całe wdrożenie, od tego spotkania aż po uruchomienie systemu u Pana w firmie, prowadzę osobiście, nie przekazuję tego nikomu innemu. Będzie Pan miał jeden kontakt przez cały proces, nie różnych ludzi na różnych etapach.",
        cel: "Budować autorytet i ciągłość — klient rozmawia z decydentem i wykonawcą w jednej osobie, nie trafia do korporacyjnego przekazywania sprawy między działami",
      },
      {
        t: "say",
        text: [
          "Świetnie. Wyślę Panu link do rezerwacji przez Calendly — proszę wybrać dokładny termin który Panu odpowiada.",
          "Dostanie Pan też automatyczne przypomnienie SMS dzień przed.",
        ],
      },
      { t: "action", text: "Wyślij link Calendly natychmiast po rozmowie. Nie 'zaraz' — teraz." },
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
      "Rozumiem, tych reklam jest sporo. Zajmuję się wyłącznie automatyzacją dokumentów transportowych — zlecenia, CMR, faktury, które dziś ktoś u Pana przepisuje ręcznie. To akurat ten temat dotyczył formularza który Pan zostawił na Facebooku. Mam 2 pytania zanim opowiem więcej — ma Pan chwilę?",
    note: "Po 'tak': przejdź do 2 Otwarcie diagnozy. Kluczowa zmiana: zamiast ogólnego 'oszczędność czasu' teraz od razu pada konkret (zlecenia, CMR, faktury) i wyłączność branżowa (wyłącznie transport), co różnicuje od ogólnych firm marketingowych czy IT.",
  },
  {
    id: "ok_cc",
    label: "Co Pan sprzedaje? O co chodzi?",
    stage: "opening",
    script:
      "Automatyzujemy pracę biura spedycji — zlecenia, CMR, faktury. Zanim cokolwiek zaproponuję, chciałem się dowiedzieć jak wygląda ta praca u Pana. Zajmie mi to dosłownie 2 minuty. Dobrze?",
    note: "Po 'tak': przejdź do 2 Otwarcie diagnozy.",
  },
  {
    id: "ok_ms",
    label: "Od razu chce umówić spotkanie",
    stage: "opening",
    script:
      "Chętnie. Żeby spotkanie miało sens dla obu stron — muszę zadać 3 krótkie pytania o firmę. Zajmie mi to 2 minuty. Dobrze?",
    note: "Po 'tak': przejdź do 2 Otwarcie diagnozy.",
  },
  {
    id: "ok_cp",
    label: "Od razu pyta o cenę",
    stage: "opening",
    script:
      "Cena zależy od skali i konfiguracji — dlatego najpierw chcę sprawdzić czy to w ogóle ma sens dla Pana firmy. Jeśli tak — podam cenę wprost na spotkaniu, bez owijania w bawełnę. Mam 2 pytania — dobrze?",
    note: "Po 'tak': przejdź do 2 Otwarcie diagnozy.",
  },
  {
    id: "ok_em",
    label: "Wyślij na maila",
    stage: "opening",
    script:
      "Mogę wysłać materiały, ale żeby to nie były ogólne informacje tylko coś dopasowanego do Pana firmy — wolałbym zadać dwa krótkie pytania, zajmie to góra minutę.",
    note: "Po zgodzie: przejdź do 2 Otwarcie diagnozy. Jeśli klient nadal odmawia rozmowy: 'Rozumiem, wyślę ogólne informacje na [email z Pipeline], a jeśli po przeczytaniu będzie Pan chciał pogłębić temat, zapraszam do kontaktu.' Status: follow-up, nie zamknięta sprawa.",
  },
  // Standardowe obiekcje
  {
    id: "ok1",
    label: "Nie mam teraz czasu (pierwsze NIE)",
    stage: "opening",
    script:
      "Rozumiem. Biura spedycji z którymi pracuję tracą kilkadziesiąt godzin miesięcznie na ręczne przepisywanie i pilnowanie dokumentów — liczone konkretnie dla każdej firmy, nie uśredniane. Jeśli to brzmi jak coś dla Pana — 2 minuty teraz mogą zmienić kilka tysięcy złotych miesięcznie. Ma Pan te 2 minuty?",
  },
  {
    id: "ok2",
    label: "Nadal nie mam czasu (drugie NIE)",
    stage: "opening",
    script: "Jasne. Kiedy jest Pan bardziej dostępny — jutro rano czy po południu?",
    note: "Zapisz dzień i godzinę. Ustaw follow-up w Pipeline.",
  },
  {
    id: "ok3",
    label: "Mam już program do zarządzania",
    stage: "opening",
    script:
      "Większość firm z którymi pracuję ma TMS. My nie zastępujemy systemu, tylko zdejmujemy z Pana biura ręczną robotę wokół niego: wpisywanie zleceń, przepisywanie CMR i potwierdzeń dostawy, pilnowanie faktur i płatności, informowanie Pana o statusie zleceń bez dzwonienia do spedytora. Mam kilka pytań o to jak dziś wygląda ta praca u Pana, mimo TMS-u. Dobrze?",
    note: "Po 'tak': przejdź do 2 Otwarcie diagnozy.",
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
      "Czy mogliby Państwo dołączyć we dwoje na spotkanie przez internet? Trwa 45 minut i mam przygotowane liczby konkretnie dla Pana firmy. Wtedy oboje macie pełen obraz i możecie zdecydować razem.",
    note: "Jeśli nie może dołączyć: 'Rozumiem. Co musiałoby się wydarzyć na spotkaniu żeby [osoba] powiedziała tak?'",
  },
  {
    id: "ok1_szczere",
    label: "Nie mam czasu (naprawdę zajęty)",
    stage: "opening",
    script:
      "Rozumiem, widzę że jest Pan zajęty. Kiedy będzie Panu wygodniej — jutro rano czy popołudniu?",
    note: "Nie przekonuj, nie próbuj wcisnąć rozmowy na siłę. Szczery brak czasu szanujesz i umawiasz konkretny termin, nie 'kiedyś'.",
  },
  {
    id: "ok1_wymowka",
    label: "Nie mam czasu (brzmi jak wymówka)",
    stage: "opening",
    script:
      "Rozumiem. Powiem jednym zdaniem po co dzwonię, a Pan zdecyduje czy warto poświęcić dwie minuty: sprawdzam czy Pana biuro traci więcej niż kilkadziesiąt godzin miesięcznie na ręczne wpisywanie zleceń i dokumentów. Jeśli tak — to są realne pieniądze. Ma Pan te dwie minuty?",
    note: "Rozpoznajesz wymówkę po tonie — szybkie 'nie mam czasu' zaraz po przedstawieniu się, bez pytania o co chodzi, zanim jeszcze wiedział czego dotyczy telefon. Jeśli po tej odpowiedzi nadal odmawia: przejdź do ok2 (drugie NIE).",
  },
  {
    id: "ok_czas_minal",
    label: "Klient mówi że minęły już 2 minuty",
    stage: "opening",
    script:
      "Ma Pan rację, przepraszam — zapytam Pana wprost: chce Pan żebym dokończył w skrócie teraz, czy wolałby Pan żebym oddzwonił i zrobił to porządnie?",
    note: "To się zdarza gdy diagnoza faktycznie trwa dłużej niż deklarowane 2 minuty. Nie ignoruj tego, przyznaj wprost i daj klientowi wybór. Większość zostaje jeśli dasz im kontrolę nad decyzją.",
  },
  {
    id: "icp_ponizej_progu",
    label: "Poniżej progu ICP — 1 osoba w biurze, brak planu zatrudnienia",
    stage: "icp",
    script:
      "Doceniam że Pan ze mną szczerze porozmawiał. Przy tej wielkości biura myślę że jeszcze nie odczułby Pan realnej różnicy, a wolę być z Panem szczery niż namawiać na coś co się nie zwróci. Mogę zapisać kontakt i wrócić za jakiś czas, gdy zespół się powiększy?",
    note: "Status: Niekwalifikowany. Jeśli zgoda na kontakt: dodaj datę re-engagement +90 dni w Pipeline. To jest koniec rozmowy, nie wracaj do diagnozy. Ton ma być ciepły, nie odprawiający — to nie jest kara za małą firmę, to szczera ocena dopasowania.",
  },
  {
    id: "icp_nie_decydent",
    label: "Rozmówca nie jest decydentem",
    stage: "icp",
    script:
      "Rozumiem. Żeby nie tracić czasu ani Pana, ani osoby decyzyjnej — czy mógłby Pan zapytać czy ta osoba dołączyłaby do 45-minutowego spotkania razem z Panem? Wtedy oboje macie pełen obraz od razu, zamiast Pan tłumaczył to później z drugiej ręki.",
    note: "Jeśli osoba decyzyjna nie może dołączyć na Discovery: umów spotkanie z rozmówcą i zaznacz w Pipeline 'decydent nieobecny — do potwierdzenia przed ceną', Agent 2 musi to uwzględnić w brief.",
  },
  {
    id: "zewnetrzne_biuro_ksiegowe",
    label: "Faktury: zewnętrzne biuro rachunkowe",
    stage: "diagnoza",
    script:
      "Rozumiem, biuro rachunkowe zajmuje się rozliczeniami. A kto u Was przygotowuje i wysyła im dane — faktury, potwierdzenia dostaw? To zwykle ta sama osoba co reszta administracji, zgadza się?",
    note: "Cel: nawet z zewnętrzną księgowością, ktoś wewnątrz firmy zbiera i wysyła dokumenty ręcznie. To wciąż ból do zmapowania. Po tej wymianie wróć do skryptu i przejdź do kroku 2f2 (Pilnowanie płatności).",
  },
  {
    id: "konkurencja_m365",
    label: "Ma wszystko w Microsoft 365 / Power Automate",
    stage: "diagnoza",
    script:
      "To brzmi jak solidna konfiguracja. Powiem Panu co zwykle sprawdzam w takich przypadkach: czy ten flow faktycznie czyta dane z dokumentu, na przykład numer rejestracyjny, trasę, kwotę z faktury — czy tylko przenosi sam plik do folderu i ktoś nadal musi go otworzyć i przepisać?",
    followup:
      "A co się dzieje gdy dokument wygląda inaczej niż zwykle, na przykład nowy klient przysyła w innym układzie — flow to obsługuje automatycznie, czy wtedy ktoś ręcznie interweniuje? I kto to utrzymuje jeśli coś się zepsuje po aktualizacji Microsoftu?",
    note: "Cel: nie podważaj że M365 coś robi, dopytaj konkretnie o rozpoznawanie danych (nie tylko przenoszenie plików), obsługę wyjątków, i utrzymanie. W praktyce większość konfiguracji Power Automate przenosi pliki, nie wyciąga z nich danych specyficznych dla transportu, i nikt ich nie utrzymuje poza jedną osobą która to kiedyś skonfigurowała. Jeśli klient faktycznie ma zaawansowaną integrację z prawdziwym OCR i utrzymaniem — to rzadkość, ale uczciwie przyznaj że w takim przypadku może już nie być miejsca na nas, nie naciskaj wbrew faktom.",
  },
  {
    id: "czas_milczy",
    label: "Milczy po pytaniu co zrobiłby z czasem",
    stage: "kalkulator",
    script:
      "Rozumiem, chodzi o inne rzeczy niż redukcja etatów. Na przykład więcej zleceń przy tej samej ekipie, mniej błędów w dokumentach, szybsza obsługa klientów, mniej nadgodzin dla zespołu. Który z tych kierunków jest dla Pana teraz ważny?",
  },
  {
    id: "czas_obronny",
    label: "Reaguje obronnie — 'i tak nie zwolnię pracowników'",
    stage: "kalkulator",
    script:
      "Jasne, nie chodzi o zwalnianie nikogo. Chodzi o to, żeby ten sam zespół miał więcej przestrzeni na obsługę klientów zamiast tonąć w papierach. Czy to jest coś co miałoby dla Pana znaczenie?",
  },
  {
    id: "czas_przeskakuje",
    label: "Przeskakuje od razu do pytania o cenę",
    stage: "kalkulator",
    script: "Do ceny dojdziemy za moment, chcę tylko dokończyć ten wątek.",
    note: "Jeśli mimo to nalega: nie walcz, przejdź dalej normalnie, zanotuj w Pipeline że pytanie o korzyść czasu nie zostało w pełni odpowiedziane.",
  },
];

export const ICP_RULES: IcpRule[] = [
  { ok: true, label: "Biuro", val: "Min. 2 osoby przy zleceniach (twardy disqualifier)" },
  { ok: true, label: "Decydent", val: "Właściciel lub wspólnik — weryfikuj na kwalifikacji" },
  { ok: true, label: "Ból", val: "Ręczna praca potwierdzona kalkulatorem ROI ≥ 80h/mc" },
  { ok: true, label: "Flota", val: "Orientacyjnie 10–150 pojazdów — sprawdź kalkulator" },
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
