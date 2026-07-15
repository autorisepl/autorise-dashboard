interface ModuleFlagMapping {
  flag: string;
  module: string;
  /** Klucz zgodny z polem "Kod modułu" bazy Notion Produkty (Blok Arek pkt 11/2026-07-15) — nie zmieniaj bez zmiany też w Notion. */
  code: string;
  stepIds: string[];
}

// Powiazanie checkboxow kalkulatora (kroki 2d-2g) z modulami PR-0, zeby przy podawaniu
// liczby klientowi (krok 2j) mowic konkretnie co oferujemy i dlaczego, na podstawie tego
// co klient faktycznie powiedzial na zywo, nie ogolnikowo. `flag` odpowiada wartosciom
// "Kategorie kalkulatora" w bazie Notion Produkty, `code` odpowiada polu "Kod modulu" —
// kazdy rekord kalkulatora ma wiec dokladny odpowiednik w Notion, nie jest samym tekstem.
const MODULE_FLAG_MAP: ModuleFlagMapping[] = [
  {
    flag: "zlecenia",
    module: "Automatyczne wczytywanie zleceń z maila",
    code: "email-parser",
    stepIds: ["diagnoza_dokumenty_zlecenie"],
  },
  {
    flag: "cmr",
    module: "Skan i odczyt dokumentów transportowych (CMR, potwierdzenia dostawy)",
    code: "document-ocr",
    stepIds: ["diagnoza_dokumenty_cmr"],
  },
  {
    flag: "faktury_recznie",
    module: "Odczyt faktur i pilnowanie terminów płatności",
    code: "document-ocr",
    stepIds: ["diagnoza_dokumenty_faktura", "diagnoza_dokumenty_faktura_platnosci"],
  },
  {
    flag: "komunikacja",
    module: "Status zleceń na WhatsApp bez dzwonienia do spedytora",
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
  return MODULE_FLAG_MAP.filter((m) => calculatorFlags[m.flag]).map((m) => {
    const trigger = m.stepIds.map((id) => selectedOptions[id]).find(Boolean);
    return {
      module: m.module,
      code: m.code,
      reason: trigger ? `bo Pan powiedział: „${trigger}"` : "bo potwierdzone w diagnozie",
    };
  });
}
