// Faza 2, Sekcja C: trzy najczęstsze obiekcje z briefu Agenta 02 nie miały gotowej odpowiedzi
// pod tekstem obiekcji mimo że interfejs `Agent2Output.przewidywane_obiekcje` ma pole
// `odpowiedz` — realny bug w `saveAgent2Output` (lib/notion/client.ts) zapisywał do Notion
// wyłącznie `objekcja`, `odpowiedz` była cicho odrzucana. Ten plik to fallback: gdy agent nie
// dostarczył własnej odpowiedzi dla rozpoznanego, standardowego wzorca obiekcji, setter i tak
// widzi gotowe zdanie do powiedzenia, zamiast pustego pola.
export interface CannedObjectionAnswer {
  match: RegExp;
  odpowiedz: string;
}

export const CANNED_OBJECTION_ANSWERS: CannedObjectionAnswer[] = [
  {
    match: /pr(ó|o)bowali|pr(ó|o)bowaliśmy|mieli(śmy)? już.*(program|system|narz(ę|e)dzie)/i,
    odpowiedz:
      "Dlatego to nie jest kwestia zaufania. Mamy gwarancję zwrotu całej kwoty, jeśli nie dowieziemy uzgodnionego wyniku.",
  },
  {
    match: /timocom|trans\.eu|webfleet|(już\s+)?(wszystko\s+)?zintegrowane/i,
    odpowiedz:
      "Nie wymieniamy tego co Pan już ma. Łączymy się z tymi samymi systemami, żeby działały razem, zamiast osobno.",
  },
  {
    match: /dodatkow.{0,10}koszt|zatrudni.{0,15}(osob|pracownik)|radzimy sobie zatrudniaj/i,
    odpowiedz:
      "Zatrudnienie kolejnej osoby to koszt co miesiąc bez końca. To rozwiązuje problem raz, z gwarancją zwrotu jeśli nie zadziała.",
  },
];

export function findCannedObjectionAnswer(objekcja: string): string | null {
  const hit = CANNED_OBJECTION_ANSWERS.find((c) => c.match.test(objekcja));
  return hit ? hit.odpowiedz : null;
}
