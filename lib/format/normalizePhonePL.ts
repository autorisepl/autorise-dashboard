// Normalizuje polskie numery telefonu do jednego, spójnego formatu zapisu w Notion.
// Zwraca null zamiast zgadywać, jeśli liczba cyfr się nie zgadza (9 lub 48+9) -
// lepiej zostawić oryginalny, dziwny numer nietknięty niż wymusić zły format.
export function normalizePhonePL(input: string): string | null {
  if (!input) return null;

  const digitsOnly = input.replace(/\D/g, "");

  let national9: string | null = null;
  if (digitsOnly.startsWith("0048") && digitsOnly.length === 13) {
    national9 = digitsOnly.slice(4);
  } else if (digitsOnly.startsWith("48") && digitsOnly.length === 11) {
    national9 = digitsOnly.slice(2);
  } else if (digitsOnly.length === 9) {
    national9 = digitsOnly;
  }

  if (!national9 || national9.length !== 9) return null;

  return `+48 ${national9.slice(0, 3)} ${national9.slice(3, 6)} ${national9.slice(6, 9)}`;
}
