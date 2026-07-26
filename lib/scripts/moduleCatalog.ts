// Baza Notion Produkty (Blok "Arek" pkt 11) — 4 standardowe moduły wdrożeniowe, ten sam
// zestaw kodów co "Kod modułu" w Produkty i "Kategorie kalkulatora" w kwalifikacyjna.ts.
// Wydzielone z /pipeline (Batch 6, 2026-07-26), żeby /wdrozenie mogło używać tych samych
// etykiet zamiast duplikować listę drugi raz.
export interface ModuleCatalogEntry {
  code: string;
  label: string;
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  { code: "email-parser", label: "Wczytywanie zleceń z maila" },
  { code: "document-ocr", label: "Skan i odczyt dokumentów (CMR, faktury)" },
  { code: "payment-monitor", label: "Pilnowanie terminów płatności / KSeF" },
  { code: "whatsapp-alerts", label: "Status zleceń na WhatsApp" },
];

// Domyślna jednostka rozliczeniowa czasu bazowego per moduł (Załącznik 1 nowej umowy, tabela
// Moduł/Jednostka/Czas na jednostkę/Wolumen na miesiąc) — prefill w tabeli Kickoff w
// /wdrozenie, użytkownik może zmienić.
export const MODULE_DEFAULT_UNIT: Record<string, string> = {
  "email-parser": "zlecenie",
  "document-ocr": "dokument (CMR/POD/faktura)",
  "payment-monitor": "sprawdzenie statusu faktury",
  "whatsapp-alerts": "zdarzenie eskalacyjne",
};

// whatsapp-alerts jest jedynym modułem, który umowa traktuje jako opcjonalny wkład do progu
// gwarancji 70% (zdarzenie eskalacyjne nie jest podstawową jednostką pracy jak zlecenie czy
// dokument) — pozostałe trzy domyślnie wliczają się w całości, użytkownik może to zmienić per
// klient checkboxem "Wliczaj do progu gwarancji".
export const MODULE_DEFAULT_WLICZAJ_DO_PROGU: Record<string, boolean> = {
  "whatsapp-alerts": false,
};
