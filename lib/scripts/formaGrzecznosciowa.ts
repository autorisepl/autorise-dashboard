import { useEffect, useState } from "react";

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
