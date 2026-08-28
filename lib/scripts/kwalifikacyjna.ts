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
        text: "Dzień dobry, z tej strony {IMIĘ_SPRZEDAWCY} z Autorise. Zostawił Pan u nas formularz w sprawie oszczędzania czasu w biurze, więc się odzywam. Krótko mówiąc, pomagamy firmom transportowym zdejmować z biura powtarzalną, ręczną robotę. Bierzemy to na siebie na tyle mocno, że umówiony efekt zapisujemy w umowie, a jeśli go nie dowieziemy, zwracamy całą kwotę.",
        cel: "Klient od razu wie po co dzwonisz i co oferujecie, zanim uzna to za nachalną sprzedaż. Zdanie o gwarancji wynika wprost z tego co robicie, nie jest doklejone z boku, i od razu zdejmuje z klienta ryzyko.",
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
          trigger: "Podaje konkretny ból albo wyzwalacz",
          action: "Masz czego szukałeś. Krótko potwierdź i przejdź do pytania o zespół i flotę.",
          tone: "positive",
        },
        {
          trigger: "Nie potrafi nazwać, „trudno powiedzieć”, „z ciekawości”",
          action:
            "Rozwiń obiekcję „Nie potrafi nazwać powodu” poniżej i przeprowadź klienta przez opis zwykłego dnia w biurze.",
          tone: "warning",
        },
        {
          trigger: "„W sumie nie mam żadnych problemów”",
          action:
            "Rozwiń obiekcję „W sumie nie mam żadnych problemów” poniżej. Jedna próba pokazania bólu, bez naciskania.",
          tone: "warning",
        },
        {
          trigger: "„Niech Pan najpierw opowie, czym się zajmujecie”",
          action:
            "Rozwiń obiekcję „Nie kojarzy, nie wie o co chodzi” poniżej. Otwierasz temat szeroko i wracasz do pytań.",
          tone: "neutral",
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
        text: "A tak z grubsza, roczne obroty firmy to bardziej okolice dwóch, trzech milionów, czy raczej powyżej pięciu? Pytam, żeby dobrać skalę tego co Panu pokażę. Jeśli woli Pan nie mówić, spokojnie idziemy dalej.",
        cel: "Orientacyjny drugi filtr ICP obok floty. Nasze ICP zaczyna się od około miliona złotych rocznie na działania, więc widełki trzymaj nisko. Nie blokuje rozmowy jeśli klient nie odpowie.",
      },
      {
        t: "note",
        text: "Pytanie opcjonalne. Jeśli klient nie chce odpowiedzieć, to nie jest blokada. Przechodzisz dalej bez naciskania.",
      },
      {
        t: "say",
        text: "Ile osób pracuje w biurze? Chodzi mi o zlecenia, dokumenty, faktury.",
        cel: "Twardy próg ICP. Poniżej dwóch osób ból zwykle za mały, żeby wdrożenie się zwróciło.",
      },
      {
        t: "say",
        text: "A kto się czym zajmuje? Spedytorzy, ktoś od faktur, ktoś od dyspozycji?",
        cel: "Zebrać realny podział ról. Każdą z tych ról przeniesiesz do kalkulatora niżej jako osobny wiersz, z własną liczbą osób, godzinami i stawką, bo spedytor i księgowość liczą się inaczej.",
      },
    ],
    decision: {
      question: "Czy biuro spełnia próg ICP?",
      options: [
        {
          trigger: "Dwie osoby w biurze albo więcej",
          action: "Próg spełniony. Przejdź do pytania o decydenta.",
          tone: "positive",
        },
        {
          trigger: "Jedna osoba, brak realnego planu zatrudnienia w kilka miesięcy",
          action:
            "Poniżej progu. Rozwiń obiekcję „Poniżej progu ICP” poniżej i zakończ rozmowę bez naciskania.",
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
        text: "Zarezerwuj termin bezpośrednio w Calendly na podany dzień i godzinę, teraz, w trakcie rozmowy. Klient tylko potwierdza, nie wysyłasz mu linku do samodzielnego wyboru. Link zostaje jako wariant zapasowy wyłącznie gdy klient nie chce ustalić terminu na żywo (patrz obiekcja poniżej).",
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
