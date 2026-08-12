interface ModuleFlagMapping {
  flag: string;
  module: string;
  /** Klucz zgodny z polem "Kod modułu" bazy Notion Produkty — nie zmieniaj bez zmiany też w Notion. */
  code: string;
  stepIds: string[];
}

// Powiazanie checkboxow kalkulatora (kroki 2d-2g) z modulami PR-0 opisanymi w
// context/PRODUKT_ZRODLO_PRAWDY.md, zeby przy podawaniu liczby klientowi (krok 2j)
// mowic konkretnie co oferujemy i dlaczego, na podstawie tego co klient faktycznie
// powiedzial na zywo, nie ogolnikowo. `flag` odpowiada wartosciom "Kategorie
// kalkulatora" w bazie Notion Produkty, `code` odpowiada polu "Kod modulu". Moduly
// "cmr" i "faktury_recznie" to dwa osobne pytania diagnostyczne, ale oba naleza do
// TEGO SAMEGO modulu produktowego "Dokumenty i pliki" (document-ocr) — laczone w
// jedna rekomendacje w getRecommendedModules, zeby nie pokazywac dwoch niemal
// identycznych wpisow. Modul "payment-monitor" (pilnowanie platnosci) zostal
// usuniety z produktu 08.08.2026, nie ma tu odpowiednika.
const MODULE_FLAG_MAP: ModuleFlagMapping[] = [
  {
    flag: "zlecenia",
    module: "Automatyzacja TMS",
    code: "email-parser",
    stepIds: ["diagnoza_dokumenty_zlecenie"],
  },
  {
    flag: "cmr",
    module: "Dokumenty i pliki",
    code: "document-ocr",
    stepIds: ["diagnoza_dokumenty_cmr"],
  },
  {
    flag: "faktury_recznie",
    module: "Dokumenty i pliki",
    code: "document-ocr",
    stepIds: ["diagnoza_dokumenty_faktura"],
  },
  {
    flag: "komunikacja",
    module: "Powiadomienia automatyczne",
    code: "whatsapp-alerts",
    stepIds: ["diagnoza_dokumenty_status"],
  },
];

export interface RecommendedModule {
  module: string;
  reason: string;
  /** Klucz "Kod modułu" bazy Notion Produkty — pozwala połączyć rekomendację z konkretnym rekordem. */
  code: string;
}

export function getRecommendedModules(
  calculatorFlags: Record<string, boolean>,
  selectedOptions: Record<string, string>,
): RecommendedModule[] {
  const byCode = new Map<string, RecommendedModule>();
  for (const m of MODULE_FLAG_MAP) {
    if (!calculatorFlags[m.flag]) continue;
    const trigger = m.stepIds.map((id) => selectedOptions[id]).find(Boolean);
    const reason = trigger ? `bo Pan powiedział: „${trigger}"` : "bo potwierdzone w diagnozie";
    const existing = byCode.get(m.code);
    if (existing) {
      existing.reason = `${existing.reason}; ${reason}`;
    } else {
      byCode.set(m.code, { module: m.module, code: m.code, reason });
    }
  }
  return Array.from(byCode.values());
}
