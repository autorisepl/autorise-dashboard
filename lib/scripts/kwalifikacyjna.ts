// Zasada: jeśli Agency Leaders nie dał gotowej instrukcji na konkretną sytuację,
// rozwiązanie buduje się z ich zasad ogólnych (personalizacja, konkret zamiast
// ogólnika, klient sam dochodzi do wniosku przez pytania), nie jako coś oderwanego
// od frameworku. Każda nowa linia dialogowa w tym pliku podlega tej zasadzie.

import type { IcpRule, Objection, Step } from "./types";

export const STEPS_K: Step[] = [
  {
    id: "prep",
    nr: "0",
    label: "PRZYGOTOWANIE",
    tag: "AKCJA",
    lines: [
      {
        t: "action",
        text: "Sprawdź w Pipeline: imię i nazwisko, numer telefonu, email, firma lub NIP.",
      },
      {
        t: "action",
        text: "Opcjonalnie: 15 sekund — wyszukaj NIP w CEIDG lub wyszukiwarce GUS. Sprawdź pełną nazwę firmy i aktywność.",
      },
      { t: "action", text: "Włącz nagrywarkę na komputerze." },
      {
        t: "action",
        text: "Miej pod ręką: imię klienta w nominatywie (Pan Jacek, nie Panie Jacku) i numer telefonu.",
      },
    ],
  },
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
        text: "Dzień dobry, mówi Michał z Autorise. Dzwonię bo kilka dni temu wypełnił Pan formularz na Facebooku — dotyczył oszczędności czasu w firmie transportowej.",
      },
      { t: "say", text: "Mam dla Pana dosłownie 2 minuty — czy to dobry moment?" },
      { t: "branch", text: "Tak: przejdź do kroku 2.1" },
      { t: "branch-bad", text: "Nie mam teraz czasu: obiekcja OK1 z panelu po prawej" },
      {
        t: "note",
        text: "Jeśli brak odbioru: zadzwoń trzy razy o różnych porach. Po trzecim braku wyślij SMS z szablonu 'Brak odbioru po 3 próbach'.",
      },
    ],
  },
  {
    id: "diagnoza_otwarcie",
    nr: "2.1",
    label: "OTWARCIE DIAGNOZY",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Żeby sprawdzić czy możemy w ogóle pomóc Pana firmie, muszę zadać kilka pytań o to jak teraz wygląda praca biura. Dobrze?",
      },
      { t: "client", text: "Tak, proszę." },
    ],
  },
  {
    id: "diagnoza_tms",
    nr: "2.2",
    label: "TMS I PRACA MANUALNA",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Czy korzystacie z TMS-u, czyli programu do zarządzania flotą i zleceniami, na przykład coś w rodzaju Trans.eu, TIMOCOM, Sky-Pol, WEB-TRANS albo podobnego systemu?",
      },
      {
        t: "note",
        text: "Jeśli klient poda inną nazwę programu, zaakceptuj ją, nie poprawiaj, zanotuj nazwę dosłownie. Jeśli mówi że nie ma żadnego programu i wszystko idzie przez Excela, WhatsApp albo telefon, to też jest ważna informacja, zapisz to jako 'brak TMS'.",
      },
      {
        t: "say",
        text: "Rozumiem że macie [nazwa TMS]. Teraz zapytam o konkretne rzeczy, jedna po drugiej, żeby dokładnie zobaczyć gdzie mimo tego programu ktoś nadal robi coś ręcznie.",
      },
      { t: "branch", text: "Klient odpowiedział: przejdź do kroku 2.3a Zlecenie transportowe" },
    ],
  },
  {
    id: "diagnoza_dokumenty_zlecenie",
    nr: "2.3a",
    label: "ZLECENIE TRANSPORTOWE",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Pierwsza rzecz: zlecenie transportowe, czyli dokument w którym zleceniodawca zamawia u Was przewóz i podaje trasę, towar, terminy. Jak takie zlecenie do Was trafia, mailem, przez program, telefonicznie?",
      },
      {
        t: "note",
        text: "Wariant A, klient mówi że zlecenie przychodzi mailem w PDF lub jako zdjęcie: to jest typowy przypadek dla email-parser i document-ocr, klient ręcznie przepisuje dane z tego pliku do swojego systemu lub Excela.",
      },
      {
        t: "note",
        text: "Wariant B, klient mówi że zlecenie wchodzi bezpośrednio do TMS przez integrację z giełdą transportową: to znaczy że ten konkretny etap jest już zautomatyzowany, nie licz go do kalkulatora, ale dopytaj czy dane z tego zlecenia i tak trzeba gdzieś ręcznie przepisać, np. do systemu księgowego.",
      },
      {
        t: "note",
        text: "Wariant C, klient nie rozumie pytania lub miesza to ze zleceniem na kierowcę: doprecyzuj, 'mam na myśli dokument od klienta zamawiającego transport, nie polecenie wyjazdu dla kierowcy'.",
      },
      { t: "client", text: "[opisuje]" },
      { t: "branch", text: "Zanotowane: przejdź do kroku 2.3b List przewozowy CMR" },
    ],
  },
  {
    id: "diagnoza_dokumenty_cmr",
    nr: "2.3b",
    label: "LIST PRZEWOZOWY CMR",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Druga rzecz: list przewozowy, czyli CMR, to dokument który kierowca ma przy sobie podczas kursu i który potwierdza że towar został przyjęty do przewozu i dostarczony. Po zakończonym kursie, jak taki CMR trafia do Was z powrotem, kierowca przywozi papier, robi zdjęcie, skanuje?",
      },
      {
        t: "note",
        text: "Wariant A, papier fizyczny który ktoś w biurze musi przepisać do systemu lub podpiąć do faktury ręcznie: to jest document-ocr, klasyczny przypadek.",
      },
      {
        t: "note",
        text: "Wariant B, zdjęcie na WhatsApp lub mailem, ktoś je odbiera i zapisuje ręcznie w odpowiednim miejscu: też document-ocr, tylko inny kanał wejścia, zapytaj czy chcą to zautomatyzować z poziomu zdjęcia z telefonu kierowcy.",
      },
      {
        t: "note",
        text: "Wariant C, klient mówi że nie używa fizycznych CMR bo wszystko jest elektroniczne, np. eCMR: zanotuj to, to inny profil klienta, mniej papieru, ale sprawdź czy dane z eCMR i tak trzeba ręcznie przenieść do rozliczeń.",
      },
      { t: "client", text: "[opisuje]" },
      { t: "branch", text: "Zanotowane: przejdź do kroku 2.3c Potwierdzenie dostawy" },
    ],
  },
  {
    id: "diagnoza_dokumenty_pod",
    nr: "2.3c",
    label: "POTWIERDZENIE DOSTAWY",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Trzecia rzecz: potwierdzenie dostawy, czyli podpis lub pieczątka odbiorcy na dokumencie, że towar dotarł w całości. Jak to u Was wygląda, kierowca przywozi podpisany papier, czy zostaje to tylko w formie zdjęcia?",
      },
      {
        t: "note",
        text: "To jest zwykle ten sam dokument co CMR, podpisany przez odbiorcę na miejscu rozładunku, w Polsce rzadko traktowany jako osobny formularz. Jeśli klient rozróżnia CMR i osobne potwierdzenie dostawy (zdarza się przy niektórych zleceniodawcach, np. sieciach handlowych z własnym drukiem), zapytaj o to jako osobną rzecz i zanotuj osobno.",
      },
      { t: "client", text: "[opisuje]" },
      { t: "branch", text: "Zanotowane: przejdź do kroku 2.3d Faktury i rozliczenia" },
    ],
  },
  {
    id: "diagnoza_dokumenty_faktura",
    nr: "2.3d",
    label: "FAKTURY I ROZLICZENIA",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Czwarta rzecz: faktury, zarówno te które Wy wystawiacie zleceniodawcom za przewóz, jak i te które dostajecie od podwykonawców lub przewoźników zewnętrznych. Kto to sprawdza i wpisuje do systemu księgowego?",
      },
      {
        t: "note",
        text: "Wariant A, jedna osoba ręcznie sprawdza faktury i wpisuje dane do księgowości lub arkusza: payment-monitor plus document-ocr, sprawdź ile miesięcznie takich faktur jest po obu stronach (wystawione i otrzymane).",
      },
      {
        t: "note",
        text: "Wariant B, mają księgową zewnętrzną lub biuro rachunkowe które się tym zajmuje: to nie znaczy że nie ma pracy manualnej po stronie klienta, dopytaj kto w firmie przygotowuje dane i dokumenty dla księgowej, to zwykle ta sama osoba co reszta administracji.",
      },
      { t: "client", text: "[opisuje]" },
      {
        t: "say",
        text: "A czy pilnujecie ręcznie, które faktury od klientów są już opłacone a które nie, czy to ktoś sprawdza w systemie bankowym co jakiś czas?",
      },
      {
        t: "note",
        text: "To jest bezpośrednie pytanie o payment-monitor. Jeśli klient mówi że nikt tego nie pilnuje systematycznie tylko 'jakoś to ogarniamy', to jest mocny sygnał bólu, zanotuj to wprost.",
      },
      { t: "client", text: "[opisuje]" },
      { t: "branch", text: "Zanotowane: przejdź do kroku 2.3e Widoczność statusu zlecenia" },
    ],
  },
  {
    id: "diagnoza_dokumenty_status",
    nr: "2.3e",
    label: "WIDOCZNOŚĆ STATUSU ZLECENIA",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Piąta rzecz, ostatnia: jak Pan sam, jako właściciel, sprawdza dziś status konkretnego zlecenia, czy trzeba zadzwonić do spedytora, czy widać to w systemie?",
      },
      {
        t: "note",
        text: "To jest pytanie o whatsapp-alerts i widoczność operacyjną. Jeśli właściciel musi dzwonić lub pytać osobiście żeby wiedzieć co się dzieje, to jest osobny, ważny ból, niezależny od dokumentów, zanotuj osobno.",
      },
      { t: "client", text: "[opisuje]" },
      { t: "branch", text: "Zanotowane: przejdź do kroku 2.3f Podsumowanie do kalkulatora" },
    ],
  },
  {
    id: "diagnoza_podsumowanie_dokumentow",
    nr: "2.3f",
    label: "PODSUMOWANIE DO KALKULATORA",
    tag: "AKCJA",
    lines: [
      {
        t: "action",
        text: "W kalkulatorze zaznacz checkboxy dokładnie na podstawie odpowiedzi z 2.3a-2.3e: zlecenie transportowe ręcznie (jeśli wariant A), CMR/dokumenty po kursie ręcznie (jeśli wariant A lub B), faktury i płatności ręcznie (jeśli wariant A lub B), brak widoczności statusu (jeśli właściciel musi dzwonić). Nie zaznaczaj niczego czego klient wprost nie potwierdził.",
      },
      { t: "branch", text: "Zaznaczone: przejdź do kroku 2.4 ICP: flota i biuro" },
    ],
  },
  {
    id: "diagnoza_icp_flota",
    nr: "2.4",
    label: "ICP: FLOTA I BIURO",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Ile pojazdów ma Pan teraz aktywnie?" },
      { t: "client", text: "[liczba]" },
      {
        t: "say",
        text: "Ile osób pracuje w biurze — mam na myśli osoby które zajmują się zleceniami, dokumentami, fakturami?",
      },
      { t: "client", text: "[liczba]" },
      {
        t: "note",
        text: "ICP minimum: 2 osoby w biurze. Jeśli 1 osoba: zapytaj czy jest sezonowość lub plan zatrudnienia. Poniżej progu po weryfikacji: uprzejmie zakończ rozmowę.",
      },
      {
        t: "branch",
        text: "ICP biura spełnione lub do dalszej weryfikacji: przejdź do kroku 2.5 ICP: decydent",
      },
      {
        t: "branch-bad",
        text: "Poniżej progu (1 osoba w biurze, brak planu zatrudnienia w najbliższych miesiącach): przejdź do zakończenia poniżej.",
      },
    ],
  },
  {
    id: "zakonczenie_ponizej_progu",
    nr: "2.4x",
    label: "ZAKOŃCZENIE: KLIENT PONIŻEJ PROGU",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Panie [Imię], dziękuję za szczerą rozmowę. Powiem wprost: nasze rozwiązanie sprawdza się najlepiej przy biurach które mają co najmniej dwie osoby zajmujące się administracją, bo dopiero wtedy realnie da się odzyskać wystarczająco dużo czasu żeby to się opłacało. U Pana na ten moment tej skali jeszcze nie ma.",
      },
      {
        t: "say",
        text: "Nie chcę Panu sprzedawać czegoś co się nie zwróci. Jeśli firma urośnie i dojdzie druga osoba do biura, chętnie wrócę do rozmowy.",
      },
      {
        t: "say",
        text: "Czy mogę zapisać Pana kontakt i odezwać się za około 3 miesiące, sprawdzić czy coś się zmieniło?",
      },
      { t: "client", text: "[zgoda lub odmowa]" },
      {
        t: "action",
        text: "Status: Niekwalifikowany. Jeśli klient zgodził się na kontakt za 3 miesiące: dodatkowo ustaw pole re-engagement +90 dni i zanotuj w Pipeline 'zgoda na ponowny kontakt'. Jeśli klient nie chce dalszego kontaktu: zapisz tylko Niekwalifikowany, bez daty re-engagement.",
      },
    ],
  },
  {
    id: "diagnoza_icp_decydent",
    nr: "2.5",
    label: "ICP: DECYDENT",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Jest Pan właścicielem firmy?" },
      { t: "client", text: "[Tak / Nie]" },
      {
        t: "note",
        text: "Jeśli nie jest właścicielem: 'Kto u Pana podejmuje decyzję o zakupie oprogramowania? Czy byłoby możliwe żebyśmy porozmawiali razem na spotkaniu?'",
      },
      {
        t: "branch",
        text: "Decydent obecny lub zgoda na wspólne spotkanie: przejdź do kroku 2.6 Kalkulator ROI",
      },
    ],
  },
  {
    id: "diagnoza_kalkulator",
    nr: "2.6",
    label: "KALKULATOR ROI",
    tag: "KALKULATOR",
    hasCalculator: true,
    lines: [
      {
        t: "say",
        text: "Ile czasu dziennie biuro poświęca łącznie na tę ręczną robotę — wpisywanie, przepisywanie dokumentów, pilnowanie CMR?",
      },
      { t: "client", text: "[podaje godziny]" },
      {
        t: "note",
        text: "Jeśli mówi 'nie wiem': 'Może pół godziny, może godzinę na osobę? Jak to wygląda przy X osobach w biurze?'",
      },
      {
        t: "action",
        text: "Wpisz w kalkulator poniżej: liczbę osób z kroku 2.4 i godziny dziennie. Zaznacz rodzaje pracy z kroków 2.2 i 2.3.",
      },
    ],
  },
  {
    id: "diagnoza_liczba",
    nr: "2.7",
    label: "PODANIE LICZBY KLIENTOWI",
    tag: "MÓWISZ",
    lines: [
      {
        t: "note",
        text: "Odczytaj wyniki z kalkulatora poniżej. Nie zaokrąglaj, nie uśredniaj — liczba jest personalizowana dla tej firmy.",
      },
      {
        t: "say",
        text: "Na podstawie tego co Pan powiedział — Pana biuro traci [WYNIK Z KALKULATORA] godzin miesięcznie na ręcznej pracy. To wartość [WARTOŚĆ PLN] złotych miesięcznie.",
      },
      { t: "branch", text: "Liczba przekazana: przejdź do kroku 2.8 Co zrobiłby z tymi godzinami" },
    ],
  },
  {
    id: "diagnoza_czas",
    nr: "2.8",
    label: "CO ZROBIŁBY Z TYMI GODZINAMI",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Gdyby te [LICZBA Z KALKULATORA] godzin miesięcznie wróciły do biura — co by Pan z nimi zrobił?",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Wariant A, klient odpowiada konkretnie (więcej zleceń, mniej błędów, szybsza obsługa): potwierdź i przejdź dalej, to jest gotowy materiał do Kroku 3.",
      },
      {
        t: "note",
        text: "Wariant B, klient milczy lub mówi 'nie wiem, nie myślałem o tym': 'Rozumiem, chodzi o inne rzeczy niż redukcja etatów. Na przykład: więcej zleceń przy tej samej ekipie, mniej błędów w dokumentach, szybsza obsługa klientów, mniej nadgodzin dla zespołu. Który z tych kierunków jest dla Pana teraz ważny?'",
      },
      {
        t: "note",
        text: "Wariant C, klient reaguje obronnie ('i tak nie zwolnię pracowników', boi się że pytanie zmierza do redukcji etatów): 'Jasne, nie chodzi o zwalnianie nikogo. Chodzi o to, żeby ten sam zespół miał więcej przestrzeni na obsługę klientów zamiast tonąć w papierach. Czy to jest coś co miałoby dla Pana znaczenie?'",
      },
      {
        t: "note",
        text: "Wariant D, klient przeskakuje od razu do pytania o cenę żeby uciec od tematu: nie walcz z tym, przejdź do Kroku 3 normalnie, ale zanotuj w Pipeline że pytanie o korzyść czasu nie padło, może się przydać na Discovery.",
      },
      { t: "branch", text: "Odpowiedź uzyskana: przejdź do kroku 3 Spotkanie jako rozwiązanie" },
    ],
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
        text: "Słyszę że u Pana to działa sprawnie. Nie chcę zajmować Pana czasu. Czy jest jakiś aspekt logistyki gdzie czujecie że traci się czas lub robi się za dużo ręcznie?",
      },
      { t: "client", text: "Nie, wszystko gra." },
      {
        t: "say",
        text: "Rozumiem. W takim razie prawdopodobnie nie jesteśmy teraz dla siebie. Mogę zadzwonić za kilka miesięcy gdy się coś zmieni — czy to ma sens?",
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
        text: "Na podstawie tego co Pan powiedział — myślę że możemy Pana firmie realnie pomóc. Mam propozycję: 45-minutowe spotkanie przez internet — pokażę jak dokładnie wygląda automatyzacja dla firmy o tej skali, z Pana liczbami.",
      },
      {
        t: "say",
        text: "Kiedy ma Pan wolne 45 minut w tym lub przyszłym tygodniu — rano czy po południu?",
      },
      { t: "client", text: "[proponuje termin]" },
      {
        t: "say",
        text: "Świetnie. Wyślę Panu link do rezerwacji przez Calendly — proszę wybrać dokładny termin który Panu odpowiada. Dostanie Pan też automatyczne przypomnienie SMS dzień przed.",
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
  // Obiekcje otwierające — każda kończy się przejściem do kroku 2.1
  {
    id: "ok_nb",
    label: "Nie pamiętam żadnego formularza",
    script:
      "Rozumiem, pewnie wiele rzeczy się przewija. Formularz pojawił się na Facebooku kilka dni temu — dotyczył oszczędności czasu w firmie transportowej. Mam dla Pana 2 pytania zanim opowiem więcej — czy ma Pan chwilę?",
    note: "Po 'tak': przejdź do 2.1 Otwarcie diagnozy.",
  },
  {
    id: "ok_cc",
    label: "Co Pan sprzedaje? O co chodzi?",
    script:
      "Automatyzujemy pracę biura spedycji — zlecenia, CMR, faktury. Zanim cokolwiek zaproponuję, chciałem się dowiedzieć jak wygląda ta praca u Pana. Zajmie mi to dosłownie 2 minuty. Dobrze?",
    note: "Po 'tak': przejdź do 2.1 Otwarcie diagnozy.",
  },
  {
    id: "ok_ms",
    label: "Od razu chce umówić spotkanie",
    script:
      "Chętnie. Żeby spotkanie miało sens dla obu stron — muszę zadać 3 krótkie pytania o firmę. Zajmie mi to 2 minuty. Dobrze?",
    note: "Po 'tak': przejdź do 2.1 Otwarcie diagnozy.",
  },
  {
    id: "ok_cp",
    label: "Od razu pyta o cenę",
    script:
      "Cena zależy od skali i konfiguracji — dlatego najpierw chcę sprawdzić czy to w ogóle ma sens dla Pana firmy. Jeśli tak — podam cenę wprost na spotkaniu, bez owijania w bawełnę. Mam 2 pytania — dobrze?",
    note: "Po 'tak': przejdź do 2.1 Otwarcie diagnozy.",
  },
  {
    id: "ok_em",
    label: "Wyślij na maila",
    script:
      "Mogę wysłać materiały, ale żeby to nie były ogólne informacje tylko coś dopasowanego do Pana firmy — wolałbym zadać dwa krótkie pytania, zajmie to góra minutę.",
    note: "Po zgodzie: przejdź do 2.1 Otwarcie diagnozy. Jeśli klient nadal odmawia rozmowy: 'Rozumiem, wyślę ogólne informacje na [email z Pipeline], a jeśli po przeczytaniu będzie Pan chciał pogłębić temat, zapraszam do kontaktu.' Status: follow-up, nie zamknięta sprawa.",
  },
  // Standardowe obiekcje
  {
    id: "ok1",
    label: "Nie mam teraz czasu (pierwsze NIE)",
    script:
      "Rozumiem. Biura spedycji z którymi pracuję tracą kilkadziesiąt godzin miesięcznie na ręczne przepisywanie i pilnowanie dokumentów — liczone konkretnie dla każdej firmy, nie uśredniane. Jeśli to brzmi jak coś dla Pana — 2 minuty teraz mogą zmienić kilka tysięcy złotych miesięcznie. Ma Pan te 2 minuty?",
  },
  {
    id: "ok2",
    label: "Nadal nie mam czasu (drugie NIE)",
    script: "Jasne. Kiedy jest Pan bardziej dostępny — jutro rano czy po południu?",
    note: "Zapisz dzień i godzinę. Ustaw follow-up w Pipeline.",
  },
  {
    id: "ok3",
    label: "Mam już program do zarządzania",
    script:
      "Większość firm z którymi pracuję ma TMS. My nie zastępujemy systemu, tylko zdejmujemy z Pana biura ręczną robotę wokół niego: wpisywanie zleceń, przepisywanie CMR i potwierdzeń dostawy, pilnowanie faktur i płatności, informowanie Pana o statusie zleceń bez dzwonienia do spedytora. Mam kilka pytań o to jak dziś wygląda ta praca u Pana, mimo TMS-u. Dobrze?",
    note: "Po 'tak': przejdź do 2.1 Otwarcie diagnozy.",
  },
  {
    id: "ok4",
    label: "Jadę na urlop / wracam za X tygodni",
    script: "Rozumiem. Kiedy Pan wraca?",
    followup: "Zapisuję. Zadzwonię do Pana [data po powrocie]. Życzę udanego urlopu.",
    note: "Status: Nieaktywny (follow up). Data re-engagement: dzień po powrocie.",
  },
  {
    id: "ok5",
    label: "Muszę porozmawiać ze wspólnikiem / synem / żoną",
    script:
      "Czy mogliby Państwo dołączyć we dwoje na spotkanie przez internet? Trwa 45 minut i mam przygotowane liczby konkretnie dla Pana firmy. Wtedy oboje macie pełen obraz i możecie zdecydować razem.",
    note: "Jeśli nie może dołączyć: 'Rozumiem. Co musiałoby się wydarzyć na spotkaniu żeby [osoba] powiedziała tak?'",
  },
  {
    id: "ok6",
    label: "Brak odbioru po 3 próbach",
    type: "sms",
    sms: "Dzień dobry Panie {IMIĘ}, dzwoniłem 3 razy bo wypełnił Pan formularz w sprawie oszczędności czasu w firmie transportowej. Jeśli temat jest aktualny — proszę o SMS lub oddzwonienie. Jeśli nie — nie będę przeszkadzał.",
  },
  {
    id: "ok7",
    label: "Komentarz pod reklamą FB",
    type: "fb",
    script: "Pod komentarzem: 'Napisałem Panu wiadomość prywatną.'",
    extra:
      "Dzień dobry Panie {IMIĘ}, piszę ponieważ zostawił Pan komentarz pod naszą reklamą dotyczącą oszczędności czasu w firmie transportowej. Czy mógłbym prosić o numer telefonu? Chciałbym zadać kilka pytań i sprawdzić czy to w ogóle ma sens dla Pana firmy, zanim opowiem więcej.",
  },
];

export const ICP_RULES: IcpRule[] = [
  { ok: true, label: "Biuro", val: "Min. 2 osoby przy zleceniach (twardy disqualifier)" },
  { ok: true, label: "Decydent", val: "Właściciel lub wspólnik — weryfikuj na kwalifikacji" },
  { ok: true, label: "Ból", val: "Ręczna praca potwierdzona kalkulatorem ROI ≥ 80h/mc" },
  { ok: true, label: "Flota", val: "Orientacyjnie 10–150 pojazdów — sprawdź kalkulator" },
  { ok: false, label: "Odrzuć", val: "< 2 osoby w biurze LUB potencjał ROI < 80h/mc łącznie" },
];
