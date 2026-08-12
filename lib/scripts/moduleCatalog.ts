// Baza Notion Produkty ("Moduły (komponenty PR-0)") — moduły wdrożeniowe zgodne z
// public/prezentacja.html (slajd 3), jedyne źródło prawdy: context/PRODUKT_ZRODLO_PRAWDY.md.
// Migracja 2026-08-08 (Cel A): nazwy i granice dopasowane 1:1 do prezentacji, kody
// zachowane bez zmian dla ciągłości referencji w Notion/promptach.
export interface ModuleCatalogEntry {
  code: string;
  label: string;
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  { code: "email-parser", label: "Automatyzacja TMS" },
  { code: "document-ocr", label: "Dokumenty i pliki" },
  { code: "whatsapp-alerts", label: "Powiadomienia automatyczne" },
];

// "Dashboard zarządczy" jest częścią KAŻDEGO wdrożenia (PR-0), nie osobnym, wybieranym ani
// wycenianym modułem — nie ma tu odpowiednika w MODULE_CATALOG i celowo NIE wchodzi do
// kalkulatora ROI (kroki 2d-2g kwalifikacji, moduleRecommendation.ts). Trzymane wyłącznie
// jako stała informacyjna, do użycia w miejscach opisujących pełny zakres wdrożenia.
export const DASHBOARD_ZARZADCZY_LABEL = "Dashboard zarządczy";

// "payment-monitor" (dawniej "Pilnowanie terminów płatności / KSeF") USUNIĘTY 2026-08-08 —
// nie istnieje jako moduł w obecnym produkcie (prezentacja.html ma tylko 4 karty na slajdzie
// 3, żadna nie dotyczy monitoringu płatności/KSeF). Audyt Notion Pipeline (46 kart, pole
// "Moduły wdrażane") potwierdził 0 kart z tym kodem — bezpieczne usunięcie bez ryzyka dla
// żywych danych klientów. System NIE generuje faktur, NIE dzwoni do kierowców/kontrahentów,
// NIE monitoruje terminów płatności ani KSeF — faktury są wyłącznie odczytywane i przypisywane
// do zlecenia w ramach modułu "document-ocr" (Dokumenty i pliki), nie rozliczane.

// Domyślny opis jednej operacji per moduł (Załącznik 1 umowy: Moduł/Operacja/Czas manualny na
// jedną operację) — prefill w tabeli Kickoff w /wdrozenie, użytkownik może zmienić. Wolumen NIE
// jest tu zbierany — to pole istnieje wyłącznie na Weryfikacji Dnia 30 (liczba operacji
// wykonanych przez System w okresie).
export const MODULE_DEFAULT_UNIT: Record<string, string> = {
  "email-parser": "zlecenie",
  "document-ocr": "dokument (CMR/POD/faktura)",
  "whatsapp-alerts": "zdarzenie eskalacyjne",
};

// whatsapp-alerts jest jedynym modułem, który umowa traktuje jako opcjonalny wkład do celu
// efektywności (zdarzenie eskalacyjne nie jest podstawową jednostką pracy jak zlecenie czy
// dokument) — pozostałe dwa domyślnie wliczają się w całości, użytkownik może to zmienić per
// klient checkboxem "Wliczaj do celu efektywności".
export const MODULE_DEFAULT_WLICZAJ_DO_CELU: Record<string, boolean> = {
  "whatsapp-alerts": false,
};
