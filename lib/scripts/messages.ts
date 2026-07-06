import type { MsgItem } from "./types";

export const MESSAGES_DATA: Record<"sms" | "telefon" | "fb", MsgItem[]> = {
  sms: [
    {
      id: "m1",
      group: "Kwalifikacja",
      label: "Brak odbioru — po 3 próbach",
      text: "Dzień dobry Panie {IMIĘ}, dzwoniłem 3 razy bo wypełnił Pan formularz w sprawie oszczędności czasu w firmie transportowej. Jeśli temat jest aktualny — proszę o SMS lub oddzwonienie. Jeśli nie — nie będę przeszkadzał.",
    },
    {
      id: "m2",
      group: "Przed Discovery",
      label: "Potwierdzenie spotkania Discovery",
      text: "Dzień dobry Panie {IMIĘ}, potwierdzam nasze spotkanie: [data] o [godzina] przez Google Meet. Link wyślę na Pana email. Proszę dołączyć z laptopa. Do zobaczenia — Michał Roth, Autorise",
    },
    {
      id: "m3",
      group: "Przed Discovery",
      label: "Reminder — dzień przed Discovery",
      text: "Dzień dobry Panie {IMIĘ}, jutro o [godzina] mamy spotkanie przez Google Meet. Link jest w zaproszeniu na Pana skrzynce. Proszę dołączyć z laptopa. Do zobaczenia — Michał Roth, Autorise",
    },
    {
      id: "m4",
      group: "Przed Discovery",
      label: "Reminder — rano w dniu Discovery",
      text: "Dzień dobry Panie {IMIĘ}, dzisiaj o [godzina] nasze spotkanie Google Meet. Link w zaproszeniu email. Do zobaczenia — Michał",
    },
    {
      id: "m5",
      group: "Przed Discovery",
      label: "Klient nie pojawił się na spotkaniu",
      text: "Dzień dobry Panie {IMIĘ}, widzę że nie mogło dojść do skutku nasze spotkanie. Czy możemy umówić się na inny termin? Michał Roth, Autorise",
    },
    {
      id: "m6",
      group: "Po Discovery",
      label: "Follow-up po Discovery — nie zamknął",
      text: "Dzień dobry Panie {IMIĘ}, jak ustaliliśmy — piszę żeby sprawdzić czy miał Pan czas przemyśleć naszą rozmowę. Są pytania na które mogę odpowiedzieć? Michał Roth, Autorise",
    },
    {
      id: "m7",
      group: "Po Discovery",
      label: "Follow-up po ustalonym terminie oddzwonienia",
      text: "Dzień dobry Panie {IMIĘ}, jak ustaliliśmy — dzwonię dzisiaj o [godzina] w sprawie [temat]. Michał Roth, Autorise",
    },
    {
      id: "m8",
      group: "Closing",
      label: "Zamknięcie — potwierdzenie startu współpracy",
      text: "Dzień dobry Panie {IMIĘ}, potwierdzam naszą decyzję o współpracy. W ciągu 24h skontaktuję się w sprawie umowy i szczegółów kickoffu. Michał Roth, Autorise",
    },
    {
      id: "m9",
      group: "Re-engagement",
      label: "Re-engagement po 90 dniach",
      text: "Dzień dobry Panie {IMIĘ}, jakiś czas temu rozmawialiśmy o optymalizacji procesów w Pana firmie. Chciałem sprawdzić czy sytuacja się zmieniła i czy nie warto wrócić do tematu. Michał Roth, Autorise",
    },
  ],
  telefon: [
    {
      id: "t1",
      group: "Przed Discovery",
      label: "Skrypt — telefon z przypomnieniem (dzień przed)",
      text: "Dzień dobry, Panie {IMIĘ}? Michał Roth z Autorise. Dzwonię żeby potwierdzić jutrzejsze spotkanie o [godzina]. Wszystko OK z dołączeniem przez Google Meet? Proszę pamiętać o laptopie — będę udostępniał ekran. Do zobaczenia jutro.",
    },
    {
      id: "t2",
      group: "Przed Discovery",
      label: "SMS jeśli nie odbiera (dzień przed)",
      text: "Dzień dobry Panie {IMIĘ}, próbowałem się dodzwonić żeby potwierdzić jutrzejsze spotkanie o [godzina]. Proszę odpisać lub zadzwonić jeśli coś się zmieniło. Michał Roth, Autorise",
    },
  ],
  fb: [
    {
      id: "fb1",
      group: "Pozyskanie",
      label: "Odpowiedź pod komentarzem (publiczna — krótka)",
      text: "Napisałem Panu wiadomość prywatną z odpowiedzią.",
    },
    {
      id: "fb2",
      group: "Pozyskanie",
      label: "Wiadomość prywatna po komentarzu",
      text: "Dzień dobry Panie {IMIĘ}, piszę ponieważ zostawił Pan komentarz pod naszą reklamą w sprawie oszczędności czasu dla firm transportowych. Zanim opowiem więcej — chciałbym zadać kilka pytań. Czy mógłbym prosić o numer telefonu?",
    },
    {
      id: "fb3",
      group: "Pozyskanie",
      label: "DM po kliknięciu reklamy (bez komentarza)",
      text: "Dzień dobry Panie {IMIĘ}, widzę że zainteresowała Pana nasza reklama. Zajmuję się firmami transportowymi — konkretnie tym, że biura tracą za dużo czasu na ręczną robotę. Czy to temat który dotyczy Pana firmy?",
    },
  ],
};

export const GROUP_COLORS: Record<string, string> = {
  Kwalifikacja: "var(--accent)",
  "Przed Discovery": "#f59e0b",
  "Po Discovery": "#8b5cf6",
  Closing: "var(--success-text)",
  "Re-engagement": "var(--text-tertiary)",
  Pozyskanie: "var(--accent)",
};
