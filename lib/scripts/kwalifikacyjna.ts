import type { IcpRule, Objection, Step } from "./types";

export const STEPS_K: Step[] = [
  {
    id: "prep",
    nr: "0",
    label: "PRZYGOTOWANIE",
    tag: "AKCJA",
    lines: [
      { t: "action", text: "Włącz Fathom zanim zaczniesz dzwonić." },
      { t: "action", text: "Wejdź na stronę firmy — 30 sekund. Flota? TMS widoczny? Decydent?" },
      { t: "action", text: "Sprawdź formularz: co napisał, skąd pochodzi, jaką firmę prowadzi." },
      { t: "action", text: "Masz pod ręką: imię (nominatyw), nazwę firmy, numer telefonu." },
    ],
  },
  {
    id: "opener",
    nr: "1",
    label: "OTWARCIE",
    tag: "MÓWISZ",
    lines: [
      { t: "say", text: "Dzień dobry, Pan {IMIĘ}?" },
      { t: "client", text: "Tak, słucham." },
      {
        t: "say",
        text: "Dzień dobry, mówi [imię] z Autorise. Dzwonię bo przed chwilą wypełnił Pan formularz na naszej stronie dotyczący oszczędzania czasu w firmie transportowej. Mam dla Pana dosłownie 2 minuty — czy to dobry moment?",
      },
    ],
  },
  {
    id: "opener_branch",
    nr: "1b",
    label: "REAKCJA NA OTWARCIE",
    tag: "GAŁĘZIE",
    lines: [
      { t: "branch", text: "Nie pamiętam żadnego formularza" },
      {
        t: "say",
        text: "Rozumiem. Pewnie wypełnił Pan wiele rzeczy. Formularz pojawił się na Facebooku — dotyczył oszczędzania czasu w logistyce. To może 30 sekund?",
      },
      { t: "branch", text: "O co chodzi? Co Pan sprzedaje?" },
      {
        t: "say",
        text: "Automatyzujemy pracę biura spedycji — zlecenia, CMR, faktury. Jedna firma u nas odzyskała 80 godzin miesięcznie. Chciałem się dowiedzieć czy to temat dla Pana firmy.",
      },
      { t: "branch", text: "Od razu chce spotkanie" },
      {
        t: "say",
        text: "Chętnie. Zanim zaproponuję termin — 2 pytania żeby spotkanie miało sens dla obu stron. Jak wygląda teraz zleceniowanie w Pana firmie?",
      },
      { t: "branch", text: "Od razu pyta o cenę" },
      {
        t: "say",
        text: "Zależy od skali i modułów. Powiem Panu wprost — najpierw chcę sprawdzić czy mamy rozwiązanie dla Pana firmy. Jeśli tak — cena jest na stronie i na spotkaniu. Ile pojazdów ma Pan teraz?",
      },
      { t: "branch", text: "Wyślij na maila" },
      {
        t: "say",
        text: "Oczywiście. Żeby wysłać coś trafnego, jedna kwestia: ile osób zajmuje się zleceniami w biurze?",
      },
      {
        t: "note",
        text: "Jeśli nadal blokuje: 'Rozumiem. Wyślę. Na jaki adres?' — zapisz mail i zaplanuj follow-up.",
      },
    ],
  },
  {
    id: "diagnoza",
    nr: "2",
    label: "DIAGNOZA",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Co spowodowało że właśnie teraz wypełnił Pan ten formularz?" },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "say",
        text: "Jak wygląda teraz proces: od momentu gdy dostajecie zlecenie do wystawienia faktury — ile kroków, ile osób, ile czasu?",
      },
      { t: "client", text: "[odpowiedź]" },
      { t: "say", text: "Ile godzin dziennie spędza biuro na ręcznym przepisywaniu?" },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Jeśli mówi 'nie wiem' — doprecyzuj: 'CMR, POD, faktury, wpisywanie do Excela — łącznie?'",
      },
      { t: "say", text: "Co byś zrobił z tymi godzinami gdybyś je odzyskał?" },
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
    id: "icp",
    nr: "3",
    label: "WERYFIKACJA ICP",
    tag: "PYTASZ",
    lines: [
      { t: "say", text: "Ile pojazdów ma teraz Pan flota?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "say", text: "Czy korzystacie z TMS — programu do zarządzania flotą?" },
      { t: "client", text: "[odpowiedź]" },
      { t: "note", text: "TMS: nie wyklucza. Dopytaj jaki i co robi manualnie mimo TMS." },
      { t: "say", text: "Jest Pan właścicielem firmy czy decyduje Pan o zakupach oprogramowania?" },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Jeśli nie jest decydentem: 'Czy byłoby możliwe żebyśmy porozmawiali razem? Mam 45 minut spotkanie online — mogę dołączyć też właściciela.'",
      },
    ],
  },
  {
    id: "roi",
    nr: "4",
    label: "ROI — ZAPROSZENIE",
    tag: "MÓWISZ",
    lines: [
      {
        t: "say",
        text: "Firmy transportowe podobne do Pana odzyskują średnio 80 godzin miesięcznie. Przy 2 osobach w biurze to około 2 etatów w skali roku.",
      },
      {
        t: "say",
        text: "Na 45-minutowym spotkaniu online pokażę Panu dokładnie jak to wygląda dla Pana firmy z prawdziwymi liczbami.",
      },
    ],
  },
  {
    id: "precommit",
    nr: "5",
    label: "PRE-COMMITMENT",
    tag: "PYTASZ",
    lines: [
      {
        t: "say",
        text: "Zanim umówimy termin — jedno pytanie. Jeśli to co Pan zobaczy na spotkaniu ma sens dla Pana firmy, czy jest Pan gotowy podjąć decyzję w ciągu tygodnia od spotkania?",
      },
      { t: "client", text: "[odpowiedź]" },
      {
        t: "note",
        text: "Jeśli 'nie' lub 'muszę z kimś' — dowiedz się z kim i zaproś tę osobę. Nie umawiaj bez decydenta.",
      },
    ],
  },
  {
    id: "spotkanie",
    nr: "6",
    label: "UMAWIANIE SPOTKANIA",
    tag: "ZAMKNIĘCIE",
    lines: [
      {
        t: "say",
        text: "Kiedy ma Pan wolne 45 minut w tym lub przyszłym tygodniu — rano czy po południu?",
      },
      { t: "client", text: "[proponuje termin]" },
      {
        t: "say",
        text: "Świetnie. Zarezerwuję [dzień] o [godzina]. Wyślę zaproszenie Google Meet na tego maila co podał Pan w formularzu — zgadza się?",
      },
      {
        t: "action",
        text: "Wyślij zaproszenie Google Meet natychmiast po rozmowie. Nie 'zaraz' — teraz.",
      },
      { t: "say", text: "Dzień przed wyślę SMS z przypomnieniem." },
      {
        t: "action",
        text: "Zmień status w Pipeline na 'Discovery umówione'. Data Discovery: [data spotkania].",
      },
    ],
  },
];

export const OBJECTIONS_K: Objection[] = [
  {
    id: "ok1",
    label: "Nie mam teraz czasu (pierwsze NIE)",
    script:
      "Rozumiem. Firmy transportowe z którymi pracuję odzyskują od 80 godzin miesięcznie na samym zleceniowaniu. Jeśli to brzmi jak coś dla Pana — 2 minuty teraz mogą zaoszczędzić Panu kilka tysięcy złotych miesięcznie. Ma Pan te 2 minuty?",
  },
  {
    id: "ok2",
    label: "Nadal nie mam czasu (drugie NIE)",
    script: "Jasne. Jutro rano czy po południu jest Pan bardziej dostępny?",
    note: "Zapisz dzień i godzinę. Follow-up w Pipeline.",
  },
  {
    id: "ok3",
    label: "Mam już program do zarządzania",
    script:
      "Większość firm z którymi pracuję ma program. My nie zastępujemy TMS — uzupełniamy go o automatyzację biurową: CMR, POD, faktury, komunikacja z klientem. Czy Pana TMS robi to automatycznie?",
    note: "Jeśli tak: wróć do diagnozy i pytaj co robi ręcznie mimo TMS. Jeśli nie: 'To dobrze, w takim razie może nie będę marnował Pana czasu' — i zakończ uprzejmie.",
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
    sms: "Dzień dobry Panie {IMIĘ}, dzwoniłem 3× bo wypełnił Pan formularz w sprawie oszczędności czasu w firmie transportowej. Jeśli temat jest aktualny — proszę o SMS lub oddzwonienie. Jeśli nie — nie będę przeszkadzał.",
  },
  {
    id: "ok7",
    label: "Komentarz pod reklamą FB",
    type: "fb",
    script: "Pod komentarzem: 'Napisałem Panu wiadomość prywatną.'",
    extra:
      "Dzień dobry Panie {IMIĘ}, piszę ponieważ zostawił Pan komentarz pod naszą reklamą dotyczącą oszczędności czasu w firmie transportowej. Zanim opowiem więcej — mam 2 pytania. Ile pojazdów ma Pan teraz i ile osób w biurze zajmuje się zleceniami?",
  },
];

export const ICP_RULES: IcpRule[] = [
  { ok: true, label: "Biuro", val: "Min. 2 osoby przy zleceniach (twardy disqualifier)" },
  { ok: true, label: "Decydent", val: "Właściciel lub wspólnik — weryfikuj na kwalifikacji" },
  { ok: true, label: "Ból", val: "Ręczna praca potwierdzona kalkulatorem ROI ≥ 80h/mc" },
  { ok: true, label: "Flota", val: "Orientacyjnie 10–150 pojazdów — sprawdź kalkulator" },
  { ok: false, label: "Odrzuć", val: "< 2 osoby w biurze LUB potencjał ROI < 80h/mc łącznie" },
];
