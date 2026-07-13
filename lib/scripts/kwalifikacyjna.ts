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
          trigger: "Zaciekawiła go reklama, nic więcej nie mówi",
          action: "Krótka ciekawość bez konkretnego bólu — dopytaj delikatnie",
          goToStepId: "diagnoza_scenariusze_konkretne",
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
    captureField: "osoby",
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
      question: "Jak zlecenie trafia do Was i co się z nim dzieje dalej?",
      options: [
        {
          trigger: "Ktoś ręcznie przepisuje z maila/PDF-a/zdjęcia",
          action: "Zaznacz w kalkulatorze (zlecenia)",
          sayAfter: "Rozumiem, czyli ktoś musi to za każdym razem ręcznie przepisać do systemu.",
          goToStepId: "diagnoza_dokumenty_cmr",
          tone: "positive",
          calculatorFlag: "zlecenia",
        },
        {
          trigger: "To już wpada do systemu automatycznie",
          action: "Nie zaznaczaj, kontynuuj",
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
        text: [
          "Druga rzecz: list przewozowy CMR, dokument potwierdzający że towar został przyjęty i dostarczony.",
          "Po kursie, jak CMR wraca do Was?",
        ],
        cel: "Sprawdzić czy dokumenty po kursie wymagają ręcznego przepisywania — automatyczne odczytywanie dokumentów (CMR, faktury)",
      },
      {
        t: "say",
        text: "A potwierdzenie dostawy, czyli podpis odbiorcy że towar dotarł w porządku — to ten sam dokument co CMR, czy osobny formularz, na przykład od dużej sieci handlowej?",
        cel: "Sprawdzić czy klient rozróżnia CMR i osobne potwierdzenie dostawy — u większości nie, ale trafiają się wyjątki",
      },
      {
        t: "note",
        text: "Papier fizyczny lub zdjęcie na WhatsApp/mailem: to automatyczne odczytywanie dokumentów (CMR, faktury), zaznacz w kalkulatorze. Elektroniczne, np. eCMR: inny profil klienta, sprawdź czy dane i tak trzeba ręcznie przenieść do rozliczeń.",
      },
    ],
    decision: {
      question: "Jak CMR i potwierdzenie dostawy wracają do biura?",
      options: [
        {
          trigger: "Papier lub zdjęcie, ktoś ręcznie przepisuje",
          action: "Zaznacz w kalkulatorze (CMR/POD)",
          sayAfter: "Czyli to kolejny etap gdzie ktoś ręcznie przepisuje dane z papieru.",
          goToStepId: "diagnoza_dokumenty_faktura",
          tone: "positive",
          calculatorFlag: "cmr",
        },
        {
          trigger: "Elektronicznie, już zautomatyzowane",
          action: "Nie zaznaczaj, kontynuuj",
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
        text: "Czwarta rzecz: faktury, te które wystawiacie i te które dostajecie. Kto to sprawdza i wpisuje do księgowości?",
        cel: "Sprawdzić skalę pracy manualnej przy fakturach",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Kto sprawdza i wpisuje faktury do księgowości?",
      options: [
        {
          trigger: "Jedna osoba ręcznie wpisuje",
          action: "Dopytaj o liczbę faktur miesięcznie",
          sayAfter:
            "Ile mniej więcej faktur miesięcznie to jest, licząc te które wystawiacie i te które dostajecie?",
          goToStepId: "diagnoza_dokumenty_faktura_platnosci",
          tone: "positive",
          calculatorFlag: "faktury_recznie",
        },
        {
          trigger: "Zewnętrzne biuro rachunkowe",
          action: "Pogłęb wątek dostarczania dokumentów",
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
      question: "Czy ktoś systematycznie pilnuje które faktury są opłacone?",
      options: [
        {
          trigger: "Nie, sprawdzają od czasu do czasu",
          action: "Zaznacz w kalkulatorze (faktury)",
          sayAfter: "Czyli to też chwilę zajmuje zanim ktoś to sprawdzi ręcznie w banku.",
          goToStepId: "diagnoza_dokumenty_status",
          tone: "positive",
          calculatorFlag: "faktury_recznie",
        },
        {
          trigger: "Tak, ktoś to systematycznie robi",
          action: "Nie zaznaczaj",
          sayAfter: "Dobrze, to macie pod kontrolą.",
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
        text: "Piąta rzecz, ostatnia: jak Pan sam, jako właściciel, sprawdza dziś status konkretnego zlecenia — trzeba zadzwonić do spedytora, czy widać to w systemie?",
        cel: "Sprawdzić czy właściciel ma widoczność operacyjną bez dzwonienia — kandydat na alerty i widoczność statusu na WhatsApp",
      },
    ],
    decision: {
      question: "Czy właściciel widzi status zlecenia bez dzwonienia do spedytora?",
      options: [
        {
          trigger: "Nie, musi dzwonić lub pytać",
          action: "Zaznacz w kalkulatorze (komunikacja)",
          sayAfter: "To osobny, ważny problem, niezależny od dokumentów.",
          goToStepId: "diagnoza_podsumowanie_dokumentow",
          tone: "positive",
          calculatorFlag: "komunikacja",
        },
        {
          trigger: "Tak, widzi na bieżąco w systemie",
          action: "Nie zaznaczaj",
          sayAfter: "Dobrze, ten obszar macie ogarnięty.",
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
    nextStepId: "diagnoza_stawka",
  },
  {
    id: "diagnoza_stawka",
    nr: "2h2",
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
          trigger: "Podał konkretną kwotę",
          action: "Wpisz do kalkulatora, przejdź dalej",
          goToStepId: "diagnoza_kalkulator",
          tone: "positive",
        },
        {
          trigger: "Nie chce podawać dokładnej kwoty",
          action: "Pokaż jak zaproponować szacunek",
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
    hasModuleRecommendation: true,
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
          "Odezwę się do Pana za około 3 miesiące, gdyby coś się zmieniło — dobrze?",
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
        textSetter:
          "Jeszcze jedno — całe wdrożenie, od tego spotkania aż po uruchomienie systemu u Pana w firmie, prowadzi osobiście założyciel Autorise, Michał, nie przekazuje tego nikomu innemu. Będzie Pan miał jeden kontakt przez cały proces, nie różnych ludzi na różnych etapach.",
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
      "Jasne, tych reklam jest sporo, rozumiem. Zajmuję się automatyzacją dokumentów transportowych: zlecenia, CMR, faktury, to co dziś ktoś u Pana przepisuje ręcznie. Tego dotyczył formularz który Pan zostawił na Facebooku. Mam dwa pytania zanim opowiem więcej, ma Pan chwilę?",
    note: "Po 'tak': przejdź do 2 Otwarcie diagnozy. Kluczowa zmiana: zamiast ogólnego 'oszczędność czasu' teraz od razu pada konkret (zlecenia, CMR, faktury) i wyłączność branżowa (wyłącznie transport), co różnicuje od ogólnych firm marketingowych czy IT.",
  },
  {
    id: "ok_cc",
    label: "Co Pan sprzedaje? O co chodzi?",
    stage: "opening",
    script:
      "Automatyzujemy pracę biura spedycji: zlecenia, CMR, faktury. Zanim cokolwiek zaproponuję, chcę wiedzieć jak to u Pana wygląda. Zajmie dosłownie dwie minuty. Dobrze?",
    note: "Po 'tak': przejdź do 2 Otwarcie diagnozy.",
  },
  {
    id: "ok_ms",
    label: "Od razu chce umówić spotkanie",
    stage: "opening",
    script:
      "Chętnie. Żeby spotkanie miało sens dla nas obu, muszę zadać trzy krótkie pytania o firmę. Dwie minuty. Dobrze?",
    note: "Po 'tak': przejdź do 2 Otwarcie diagnozy.",
  },
  {
    id: "ok_cp",
    label: "Od razu pyta o cenę",
    stage: "opening",
    script:
      "Cena zależy od skali i konfiguracji, dlatego najpierw sprawdzam czy to w ogóle ma sens dla Pana firmy. Jeśli tak, podam ją wprost na spotkaniu, bez owijania w bawełnę. Mam dwa pytania, dobrze?",
    note: "Po 'tak': przejdź do 2 Otwarcie diagnozy.",
  },
  {
    id: "ok_em",
    label: "Wyślij na maila",
    stage: "opening",
    script:
      "Mogę wysłać materiały, ale wolałbym zadać dwa krótkie pytania, zajmie to góra minutę, żeby nie były to ogólne informacje tylko coś dopasowane pod Pana firmę.",
    note: "Po zgodzie: przejdź do 2 Otwarcie diagnozy. Jeśli klient nadal odmawia rozmowy: 'Rozumiem, wyślę ogólne informacje na [email z Pipeline], a jeśli po przeczytaniu będzie Pan chciał pogłębić temat, zapraszam do kontaktu.' Status: follow-up, nie zamknięta sprawa.",
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
    script: "Jasne. Kiedy jest Pan bardziej dostępny — jutro rano czy po południu?",
    note: "Zapisz dzień i godzinę. Ustaw follow-up w Pipeline.",
  },
  {
    id: "ok3",
    label: "Mam już program do zarządzania",
    stage: "opening",
    script:
      "To dobrze, większość naszych klientów ma TMS. My nie zastępujemy systemu, zdejmujemy z biura ręczną robotę wokół niego. Mam kilka pytań jak to dziś wygląda u Pana, dobrze?",
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
      "A mogliby Państwo dołączyć we dwoje na spotkanie przez internet? Trwa 45 minut, mam przygotowane liczby konkretnie dla Pana firmy. Wtedy oboje macie pełen obraz i decydujecie razem.",
    note: "Jeśli nie może dołączyć: 'Rozumiem. Co musiałoby się wydarzyć na spotkaniu żeby [osoba] powiedziała tak?'",
  },
  {
    id: "ok1_szczere",
    label: "Nie mam czasu (naprawdę zajęty)",
    stage: "opening",
    script: "Jasne, widzę że jest Pan zajęty. Kiedy wygodniej, jutro rano czy popołudniu?",
    note: "Nie przekonuj, nie próbuj wcisnąć rozmowy na siłę. Szczery brak czasu szanujesz i umawiasz konkretny termin, nie 'kiedyś'.",
  },
  {
    id: "ok1_wymowka",
    label: "Nie mam czasu (brzmi jak wymówka)",
    stage: "opening",
    script:
      "Jasne, rozumiem. Powiem krótko o co chodzi, a Pan sam oceni czy warto dać mi te dwie minuty: sprawdzam czy Pana biuro traci więcej niż kilkadziesiąt godzin miesięcznie na ręczne wpisywanie zleceń i dokumentów. Jeśli tak, to są realne pieniądze. Ma Pan te dwie minuty?",
    note: "Rozpoznajesz wymówkę po tonie — szybkie 'nie mam czasu' zaraz po przedstawieniu się, bez pytania o co chodzi, zanim jeszcze wiedział czego dotyczy telefon. Jeśli po tej odpowiedzi nadal odmawia: przejdź do ok2 (drugie NIE).",
  },
  {
    id: "ok_czas_minal",
    label: "Klient mówi że minęły już 2 minuty",
    stage: "opening",
    script:
      "Ma Pan rację, przepraszam. Zapytam wprost: dokończyć w skrócie teraz, czy woli Pan żebym oddzwonił i zrobił to porządnie?",
    note: "To się zdarza gdy diagnoza faktycznie trwa dłużej niż deklarowane 2 minuty. Nie ignoruj tego, przyznaj wprost i daj klientowi wybór. Większość zostaje jeśli dasz im kontrolę nad decyzją.",
  },
  {
    id: "icp_ponizej_progu",
    label: "Poniżej progu ICP — 1 osoba w biurze, brak planu zatrudnienia",
    stage: "icp",
    script:
      "Dziękuję za szczerość. Przy tej wielkości biura pewnie nie poczułby Pan jeszcze realnej różnicy, więc szczerze: nie namawiam na coś co się nie zwróci. Mogę zapisać kontakt i wrócić za jakieś 3 miesiące, jak zespół się powiększy, dobrze?",
    note: "Status: Niekwalifikowany. Jeśli zgoda: data re-engagement +90 dni w Pipeline. Koniec rozmowy, nie wracaj do diagnozy.",
  },
  {
    id: "icp_nie_decydent",
    label: "Rozmówca nie jest decydentem",
    stage: "icp",
    script:
      "Rozumiem. Żeby nie tracić czasu, ani Pana, ani osoby decyzyjnej: mógłby Pan zapytać czy dołączyłaby do 45-minutowego spotkania razem z Panem? Wtedy oboje macie od razu pełen obraz, zamiast Pan tłumaczył to później z drugiej ręki.",
    note: "Jeśli osoba decyzyjna nie może dołączyć na Discovery: umów spotkanie z rozmówcą i zaznacz w Pipeline 'decydent nieobecny — do potwierdzenia przed ceną', Agent 2 musi to uwzględnić w brief.",
  },
  {
    id: "zewnetrzne_biuro_ksiegowe",
    label: "Faktury: zewnętrzne biuro rachunkowe",
    stage: "diagnoza",
    script:
      "Jasne, biuro rachunkowe zajmuje się rozliczeniami. A kto u Was przygotowuje i wysyła im dokumenty, faktury, potwierdzenia dostaw? To zwykle ta sama osoba co reszta administracji, zgadza się?",
    note: "Nawet z zewnętrzną księgowością ktoś wewnątrz firmy zbiera i wysyła dokumenty ręcznie — to wciąż ból do zmapowania w kalkulatorze (faktury).",
  },
  {
    id: "konkurencja_m365",
    label: "Ma wszystko w Microsoft 365 / Power Automate",
    stage: "diagnoza",
    script:
      "To brzmi jak solidna konfiguracja. Sprawdzam zwykle jedną rzecz: czy to faktycznie odczytuje dane z dokumentu i wypełnia je automatycznie, czy tylko przenosi plik do folderu, a ktoś nadal musi go otworzyć i przepisać ręcznie?",
    followup:
      "A co się dzieje gdy dokument wygląda inaczej niż zwykle? Flow ogarnia to sam, czy ktoś wtedy ręcznie interweniuje? I kto to utrzymuje, jak coś się zepsuje po aktualizacji?",
    note: "Większość konfiguracji Power Automate przenosi pliki, nie wyciąga z nich danych, i utrzymuje ją jedna osoba która to kiedyś skonfigurowała. Jeśli klient ma faktycznie zaawansowaną integrację z realnym OCR i utrzymaniem, przyznaj to uczciwie, nie naciskaj wbrew faktom.",
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
      "Rozumiem, to szczegół księgowy. Wystarczy orientacyjnie: to bliżej 40, 55, czy 70 złotych za godzinę z narzutami?",
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
