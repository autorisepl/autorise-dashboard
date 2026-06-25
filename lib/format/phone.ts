// Jednolite formatowanie polskich numerów telefonu → "+48 XXX XXX XXX".
// Obsługuje wejścia typu: "48600061111", "+48 600 061 111", "884-626-963",
// "533 334 212", "0048600061111".

export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return String(raw).trim();

  // Usuń prefiks kraju (00 + kod, lub sam kod 48 przy 11 cyfrach).
  if (digits.startsWith("0048")) digits = digits.slice(4);
  else if (digits.startsWith("48") && digits.length === 11) digits = digits.slice(2);

  const group = (n: string) => `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 9)}`;

  if (digits.length === 9) return `+48 ${group(digits)}`;

  // Inny kraj / dłuższy numer — ostatnie 9 cyfr jako numer krajowy.
  if (digits.length > 9) {
    const national = digits.slice(-9);
    const cc = digits.slice(0, digits.length - 9);
    return `+${cc} ${group(national)}`;
  }

  // Krótszy/nietypowy — pogrupuj po 3 dla czytelności.
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}
