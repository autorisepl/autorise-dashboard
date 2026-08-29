import { useEffect, useState } from "react";

// Polska odmiana liczebnikowa rzeczownika "godzina" — wydzielone 2026-08-29 z /sprzedaz (audyt
// treści skryptu Discovery) i podpięte tu też do /kwalifikacja, gdzie ten sam bug istniał
// równolegle: fill() zawsze wypisywał sztywne "godzin" niezależnie od liczby ("42 godzin
// miesięcznie" zamiast poprawnego "42 godziny miesięcznie"), czytane na głos klientowi. Reguła:
// 1 -> godzina, końcówka 2-4 poza wyjątkami 12-14 -> godziny, reszta -> godzin.
export function godzinyOdmiana(n: number): string {
  if (n === 1) return "godzina";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "godziny";
  return "godzin";
}

export function detectGender(firstName: string): "M" | "F" {
  const name = firstName.trim().toLowerCase();
  if (!name) return "M";
  const maleExceptions = ["kuba", "barnaba", "bonawentura", "kosma", "bogusza"];
  if (maleExceptions.includes(name)) return "M";
  return name.endsWith("a") ? "F" : "M";
}

export function useFormaGrzecznosciowa(
  firstName: string,
  resetKey: string | undefined,
): {
  forma: "Pan" | "Pani";
  formaOverride: "auto" | "Pan" | "Pani";
  setFormaOverride: (f: "auto" | "Pan" | "Pani") => void;
} {
  const [formaOverride, setFormaOverride] = useState<"auto" | "Pan" | "Pani">("auto");

  useEffect(() => {
    setFormaOverride("auto");
  }, [resetKey]);

  const detectedGender = detectGender(firstName);
  const forma =
    formaOverride === "auto" ? (detectedGender === "F" ? "Pani" : "Pan") : formaOverride;

  return { forma, formaOverride, setFormaOverride };
}
