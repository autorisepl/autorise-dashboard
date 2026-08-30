// Spotkanie 2 z dwóch (2026-08-30, Michał): sprzedaz.ts kończy się słowną zgodą na cenę i
// umówieniem tego spotkania. Finalizacja to już tylko pomiar realnego czasu na żywo,
// uzupełnienie Załącznika nr 1 i podpis — status Pipeline "Finalizacja" (między "Discovery
// umówione" a "Kickoff") istniał od dawna, ten plik po prostu daje mu własny skrypt zamiast
// dzielić jedną stronę /sprzedaz na dwa różne spotkania klienta.
//
// Zasada języka mówionego identyczna z kwalifikacyjna.ts i sprzedaz.ts: linie "say"/"script"/
// "followup" to tekst wypowiadany na głos, zero instrukcji procesowych w nich — te żyją w
// "note"/"cel"/"action".

import type { Objection, Step } from "./types";

// Reeksport zamiast duplikowania — DISCOVERY_STATUSES to jedyna lista statusów Pipeline
// współdzielona między obydwoma spotkaniami sprzedażowymi, ten plik jej nie definiuje od nowa.
export { DISCOVERY_STATUSES } from "./sprzedaz";

export const STEPS_F: Step[] = [
  {
    id: "prep_f",
    nr: "0",
    label: "PRZYGOTOWANIE",
    tag: "AKCJA",
    lines: [
      {
        t: "action",
        text: "Sprawdź brief z pierwszego spotkania, sprawdź czy klient potwierdził udostępnienie ekranu na dzisiejsze spotkanie, otwórz pusty formularz Załącznika nr 1.",
      },
    ],
  },
  {
    id: "otwarcie_f",
    nr: "1",
    label: "OTWARCIE",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Dzień dobry, dziękuję że mogliśmy się dziś spotkać. To nasze drugie, ostatnie spotkanie przed startem, Finalizacja. Dziś zmierzymy razem realny czas i uzupełnimy formalności, potem przechodzimy do podpisu.",
      },
    ],
    transition: "Zaczynajmy od pomiaru, żeby liczby w umowie były dokładne.",
  },
  {
    id: "pomiar_czasu",
    nr: "2",
    label: "POMIAR CZASU",
    tag: "AKCJA",
    lines: [
      {
        t: "say",
        text: "Żeby liczby w umowie były dokładne, a nie szacunkowe z telefonu, poproszę o udostępnienie ekranu. Proszę pokazać jak dziś wygląda wpisanie jednego, typowego zlecenia od początku do końca, ja to zmierzę na żywo.",
        cel: "Zmierzyć realny czas bazowy zamiast opierać umowę na przybliżeniu z kwalifikacji/Discovery.",
      },
      { t: "client", text: "[udostępnia ekran, pokazuje proces krok po kroku]" },
      {
        t: "action",
        text: "Włącz stoper, zmierz realny czas per moduł osobno, zapisz jako C.",
      },
    ],
    expected: "Klient udostępnia ekran i pokazuje realny proces bez większego oporu.",
    transition: "Dziękuję, mam już konkretne liczby. Przejdźmy do Załącznika nr 1.",
  },
  {
    id: "zalacznik",
    nr: "3",
    label: "ZAŁĄCZNIK NR 1",
    tag: "AKCJA",
    lines: [
      {
        t: "action",
        text: "Wpisz zmierzone wartości C do Załącznika nr 1 na żywo, klient widzi ekran.",
      },
      {
        t: "say",
        text: "To są liczby, które trafią do umowy jako podstawa naszej gwarancji. Zgadza się to z tym jak wygląda Pana codzienna praca?",
        cel: "Uzyskać jawne potwierdzenie liczb PRZED przejściem do warunków umowy, nie po.",
      },
      { t: "client", text: "[potwierdza lub koryguje]" },
    ],
    expected: "Klient potwierdza że zmierzone liczby odpowiadają jego realnej codziennej pracy.",
    transition: "Dobrze, to przejdźmy teraz przez warunki umowy, zanim wyślę wersję finalną.",
  },
  {
    id: "warunki_umowy_f",
    nr: "4",
    label: "WARUNKI UMOWY — POTWIERDŹ NA ŻYWO",
    tag: "POTWIERDZASZ",
    lines: [
      {
        t: "note",
        text: "Zanim wyślesz finalną wersję umowy, przejdź na głos przez tych 10 punktów z klientem — każdy osobno, nie jednym zdaniem. To ostatni moment żeby uniknąć niejasności przed podpisem, nie krok do przeklikania w ciszy.",
      },
      {
        t: "say",
        text: "30 tysięcy złotych za wdrożenie, płatne jednorazowo w ciągu 2 dni roboczych od faktury.",
        // Jedna cena, bez rat i bez rabatu za terminowość — UMOWA_SYSTEM_AUTORISE.pdf §8 ust. 1.
        cel: "Potwierdzić kwotę na głos, nie zakładać że klient ją pamięta.",
      },
      {
        t: "say",
        text: "Ważna rzecz. Jeśli pełna kwota nie wpłynie na nasze konto w ciągu 7 dni kalendarzowych od podpisania, umowa automatycznie się rozwiązuje. Dlatego zależy mi żeby faktura poszła szybko po podpisie, i żeby przelew poszedł zaraz po niej.",
        // Warunek rozwiązujący, twardy termin z UMOWA_SYSTEM_AUTORISE.pdf §2 ust. 2.
        cel: "Musi być wypowiedziany wprost, klient nie może się o tym dowiedzieć dopiero z dokumentu.",
      },
      {
        t: "say",
        text: "Prace zaczynają się dopiero po zaksięgowaniu pełnej wpłaty, nie po samym podpisaniu.",
        cel: "Musi być wypowiedziane wprost — klientowi intuicyjnie wydaje się, że podpis to już start.",
      },
      {
        t: "say",
        text: "30-dniowa weryfikacja efektywności liczy się od dnia odbioru systemu, czyli po zakończeniu wdrożenia, nie od dzisiejszego podpisu ani od momentu przekazania dostępów.",
        // UMOWA_SYSTEM_AUTORISE.pdf §5 ust. 2 liczy weryfikację od odbioru Systemu, nie od
        // przekazania dostępów na starcie wdrożenia.
        cel: "Musi być wypowiedziane wprost — klientowi intuicyjnie wydaje się, że podpis to już start zegara.",
      },
      {
        t: "say",
        text: "Jeśli po pierwszych 30 dniach wynik nie osiągnie progu, mam 14 dni roboczych na poprawki, i weryfikujemy jeszcze raz przez kolejne 30 dni. Dopiero jeśli druga weryfikacja też wypadnie negatywnie, ma Pan miesiąc na to żeby odstąpić od umowy i dostać zwrot tego, co Pan do tej pory zapłacił.",
        // UMOWA_SYSTEM_AUTORISE.pdf §5 ust. 7-8 — to prawo do odstąpienia z obowiązkiem zwrotu,
        // nie automatyczny zwrot po pierwszym negatywnym wyniku, klient musi z niego skorzystać
        // sam w terminie miesiąca.
        cel: "Klient musi znać realną procedurę drugiej rundy weryfikacji przed prawem do odstąpienia.",
      },
      {
        t: "say",
        text: "[poza zakresem]",
        cel: "Wstawiane na żywo z formularza 'Warunki umowy' niżej — jeśli puste, dopytaj teraz.",
      },
      {
        t: "say",
        text: "Tysiąc złotych miesięcznie przez minimum 12 miesięcy licząc od dnia odbioru systemu, niezależnie od wyniku weryfikacji. To osobna rzecz od samego wdrożenia.",
        // Kwota i start liczenia zgodne z UMOWA_SYSTEM_AUTORISE.pdf §7 ust. 1 i §8 ust. 2.
        cel: "Oddzielić retainer od gwarancji zwrotu — częsty punkt niejasności po podpisie.",
      },
      {
        t: "say",
        text: "Jeśli Pana TMS nie ma jeszcze potwierdzonego dostępu do API, zwykle nie jest to problem. Mamy na to sprawdzony sposób, zajmę się tym na pierwszym spotkaniu po podpisaniu.",
        // Proces oceny integracji z KARTA_PRODUKTU_SYSTEM_OPERACYJNY.md pkt 8. Celowo "zwykle
        // nie problem", nie "to nie jest ryzyko" — UMOWA_SYSTEM_AUTORISE.pdf §3 ust. 5 dopuszcza
        // odstąpienie obu stron w rzadkim przypadku braku alternatywy.
        cel: "Dać pewność bez rozwlekania mechanizmu, którego klient teraz nie potrzebuje.",
      },
      {
        t: "note",
        text: "Jeśli klient dopyta jak dokładnie to działa: pierwszy krok to zawsze bezpośredni kontakt z dostawcą systemu na Kickoff. Jeśli się nie uda, są jeszcze trzy sprawdzone sposoby obejścia braku dostępu do API strony trzeciej (metodologia w bazie Notion Produkty) — dopiero na to pytanie warto rozwijać szczegóły, nie w głównym przepływie przed podpisem.",
      },
      {
        t: "say",
        text: "Po podpisaniu dostanie Pan konkretny rytm, nie ciszę. Spotkanie startowe w ciągu 7 dni roboczych od pełnej wpłaty, potem zbieramy dostępy, potem do 4 tygodni wdrożenia, potem odbiór systemu, i od tego dnia liczy się 30-dniowa weryfikacja i pierwsza faktura retainera. Każdy etap ma ustaloną datę, nic nie zawiśnie w niepewności.",
        // Kolejność zgodna z UMOWA_SYSTEM_AUTORISE.pdf §3-5: wpłata → start → dostępy →
        // wdrożenie → odbiór → weryfikacja + start retainera.
        cel: "Zapowiedzieć cały cykl, nie tylko moment podpisu, żeby klient nie czekał w niepewności.",
      },
      {
        t: "say",
        text: "Wysyłam teraz finalną wersję umowy z uzupełnionym Załącznikiem nr 1 do podpisu.",
        // System nie ma jeszcze integracji e-podpisu — to świadomie sam tekst przypominający.
        cel: "Moment wywołania e-podpisu (Google Workspace eSignature / iLovePDF).",
      },
    ],
    transition: "Zanim to wyślę, jedno ostatnie pytanie o prawnika.",
  },
  {
    id: "podpis",
    nr: "5",
    label: "PODPIS",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Czy prawnik zdążył już przejrzeć umowę, którą wysłałem po naszym pierwszym spotkaniu?",
        cel: "Sprawdzić status przed wysłaniem finalnej wersji, nie zakładać że droga jest wolna.",
      },
      { t: "client", text: "[odpowiedź]" },
    ],
    decision: {
      question: "Co odpowiedział klient?",
      options: [
        {
          trigger: "Tak, wszystko OK",
          action:
            "Podpisujemy dziś, załącznik już mamy uzupełniony. Prześlij finalną wersję z załącznikiem do podpisu.",
          tone: "positive",
        },
        {
          trigger: "Jeszcze nie skończył",
          sayAfter: "Nie ma problemu, poczekamy na niego. Kiedy spodziewa się Pan odpowiedzi?",
          action: "Zapisz termin follow-up w Pipeline, nie naciskaj na podpis dziś.",
          tone: "neutral",
        },
      ],
    },
  },
];

export const OBJECTIONS_F: Objection[] = [
  {
    id: "od12_f",
    stage: "przedkontraktowa",
    label: "Chcę móc zrezygnować z retainera w każdej chwili",
    script:
      "Rozumiem, że chce Pan wiedzieć na czym stoi, zanim podpiszemy. To proste: retainer to minimum 12 miesięcy od dnia odbioru systemu, bo tyle czasu potrzeba żeby system naprawdę wszedł w krew firmy i przynosił efekt, nie na to żeby Pana związać. W tym czasie umowę może wcześniej zakończyć tylko strona, która doznała rażącego naruszenia, na przykład jeśli przestalibyśmy naprawiać usterki albo Pan przestałby płacić mimo wezwania. Poza tym, po 12 miesiącach umowa przechodzi na czas nieokreślony, z 3-miesięcznym okresem wypowiedzenia, więc od tego momentu ma Pan pełną elastyczność. Wolę powiedzieć to teraz wprost, niż żeby to było niespodzianką za pół roku.",
    note: "Do wypowiedzenia proaktywnie przy pierwszej wzmiance o retainerze, albo w odpowiedzi na wprost zadane pytanie o rezygnację. Podstawa: UMOWA_SYSTEM_AUTORISE.pdf §7 — retainer minimum 12 miesięcy od odbioru, wcześniejsze zakończenie możliwe tylko przy rażącym naruszeniu (§7 ust. 3-4), po 12 miesiącach automatyczne przedłużenie z 3-miesięcznym wypowiedzeniem (§7 ust. 2). Nie obiecuj klientowi wykupienia się z pozostałych miesięcy — tej opcji nie ma.",
  },
  {
    id: "od13_f",
    stage: "przedkontraktowa",
    label: "Czemu Pan podpisuje, nie właściciel firmy?",
    script:
      "Działam jako pełnomocnik właściciela na podstawie pisemnego pełnomocnictwa, art. 100 kodeksu cywilnego. Mam pełne prawo podpisać tę umowę w jego imieniu.",
    note: "Krótko i pewnie, bez dalszego tłumaczenia się jeśli klient nie dopytuje dalej — to potwierdzenie faktu, nie negocjacja.",
  },
  {
    id: "od18_f",
    stage: "przedkontraktowa",
    label: "Jeszcze chce zobaczyć demo przed podpisem",
    script:
      "To co Pan widział na poprzednim spotkaniu, konkretne liczby i mechanizm, było już oparte na danych Pana firmy, nie na generycznym przykładzie. Sam panel i automatyzacje budujemy dopiero po podpisaniu, bo dopiero wtedy mamy dostęp do Pana systemu i realnych zleceń, pokazanie czegoś wcześniej byłoby pokazaniem cudzych danych, nie Pana. Gwarancja minimum 70% z prawem do zwrotu to zabezpieczenie na wypadek gdyby mimo wszystko coś nie zadziałało.",
  },
  {
    id: "od19_f",
    stage: "przedkontraktowa",
    label: "Musimy przesłać umowę do prawnika/działu prawnego",
    // Przeformułowana 2026-08-30 (Michał: "na tym etapie to normalny krok procesu, nie
    // obiekcja do zbijania") — kontrast z od19 w sprzedaz.ts, gdzie ten sam temat pada od razu
    // po podaniu ceny i wciąż wymaga wyciągnięcia konkretnego terminu follow-up. Tutaj umowa
    // już od dawna jest w rękach prawnika, więc odpowiedź tylko potwierdza ustalony wcześniej
    // proces, nie neguje żadnej wątpliwości. Użyj tej wersji tylko jeśli temat wraca poza
    // pytaniem w kroku PODPIS — tamta decyzja ma już własne "Jeszcze nie skończył".
    script:
      "Rozumiem, to normalne przy tego typu umowach, dlatego wysłałem ją zaraz po pierwszym spotkaniu, żeby był czas. Jak wspomniałem, poczekamy na niego, bez pośpiechu.",
  },
];
