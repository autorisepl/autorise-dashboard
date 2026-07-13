interface ModuleFlagMapping {
  flag: string;
  module: string;
  stepIds: string[];
}

// Powiazanie checkboxow kalkulatora (kroki 2d-2g) z modulami PR-0, zeby przy podawaniu
// liczby klientowi (krok 2j) mowic konkretnie co oferujemy i dlaczego, na podstawie tego
// co klient faktycznie powiedzial na zywo, nie ogolnikowo.
const MODULE_FLAG_MAP: ModuleFlagMapping[] = [
  {
    flag: "zlecenia",
    module: "Automatyczne wczytywanie zleceń z maila",
    stepIds: ["diagnoza_dokumenty_zlecenie"],
  },
  {
    flag: "cmr",
    module: "Skan i odczyt dokumentów transportowych (CMR, potwierdzenia dostawy)",
    stepIds: ["diagnoza_dokumenty_cmr"],
  },
  {
    flag: "faktury_recznie",
    module: "Odczyt faktur i pilnowanie terminów płatności",
    stepIds: ["diagnoza_dokumenty_faktura", "diagnoza_dokumenty_faktura_platnosci"],
  },
  {
    flag: "komunikacja",
    module: "Status zleceń na WhatsApp bez dzwonienia do spedytora",
    stepIds: ["diagnoza_dokumenty_status"],
  },
];

export interface RecommendedModule {
  module: string;
  reason: string;
}

export function getRecommendedModules(
  calculatorFlags: Record<string, boolean>,
  selectedOptions: Record<string, string>,
): RecommendedModule[] {
  return MODULE_FLAG_MAP.filter((m) => calculatorFlags[m.flag]).map((m) => {
    const trigger = m.stepIds.map((id) => selectedOptions[id]).find(Boolean);
    return {
      module: m.module,
      reason: trigger ? `bo Pan powiedział: „${trigger}"` : "bo potwierdzone w diagnozie",
    };
  });
}
