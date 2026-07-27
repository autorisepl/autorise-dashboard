// Załącznik 1 umowy (finalna wersja 26.07.2026) — dwuetapowy pomiar efektywności per moduł.
// Kickoff zbiera WYŁĄCZNIE czas manualny na jedną operację (C), zero wolumenu. Weryfikacja
// Dnia 30 dopiero wtedy zbiera dwie nowe liczby z logów/obserwacji: liczbę operacji wykonanych
// przez System w okresie (D) i rzeczywisty czas jaki zajęła obsługa tych operacji człowiekowi
// przy systemie (F, mierzone, nie zakładane jako zero). E (teoretyczny czas manualny) = C × D,
// per moduł, sumowane do ΣE i ΣF po modułach objętych celem efektywności. Wynik: (ΣE − ΣF) /
// ΣE × 100 = osiągnięty procent efektywności, porównywany z celem % ustalonym na Kickoffie.

export interface KickoffModuleRow {
  moduleId: string;
  operacja: string;
  czasGodziny: number; // C
  wliczajDoCelu: boolean;
}

export interface WeryfikacjaModuleRow extends KickoffModuleRow {
  liczbaOperacji: number; // D
  czasSystemGodziny: number; // F
}

export interface WynikEfektywnosci {
  sumaE: number;
  sumaF: number;
  procentOsiagniety: number;
}

export function obliczE(row: Pick<WeryfikacjaModuleRow, "czasGodziny" | "liczbaOperacji">): number {
  return row.czasGodziny * row.liczbaOperacji;
}

export function obliczEfektywnosc(rows: WeryfikacjaModuleRow[]): WynikEfektywnosci {
  const objete = rows.filter((r) => r.wliczajDoCelu);
  const sumaE = objete.reduce((sum, r) => sum + obliczE(r), 0);
  const sumaF = objete.reduce((sum, r) => sum + r.czasSystemGodziny, 0);
  const procentOsiagniety = sumaE > 0 ? ((sumaE - sumaF) / sumaE) * 100 : 0;
  return { sumaE, sumaF, procentOsiagniety };
}
