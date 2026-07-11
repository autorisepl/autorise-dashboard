import type { UpdatePageParameters } from "@notionhq/client/build/src/api-endpoints";

// Klienci płacący lub zakończeni — reset wymaga ręcznego potwierdzenia, nigdy automatycznego.
// Współdzielone między app/api/notion/reset-lead (pojedynczy klient) i
// app/api/notion/reset-all-leads (bulk) — jedna definicja, zero ryzyka rozjazdu.
export const BLOCKED_RESET_STATUSES = [
  "Kickoff",
  "Wdrożenie",
  "Retainer",
  "Upsell",
  "Zakończona współpraca",
];

const emptyRichText = { rich_text: [] };

export const LEAD_RESET_PROPERTIES = {
  "Hipoteza ból główny": emptyRichText,
  "Przewidywane obiekcje": emptyRichText,
  "Ryzyka rozmowy": emptyRichText,
  "Uwagi Agenta 2": emptyRichText,
  "Poprzednie próby": emptyRichText,
  "Koszt problemu PLN/mc": { number: null },
  "Koszt roczny PLN/rok": { number: null },
  "Uwagi Agenta 1": emptyRichText,
  "Uwagi Agenta 4": emptyRichText,
  "Maile ze zleceniami / dzień": { number: null },
  "Godziny wpisywania / spedytor": { number: null },
  "Faktury po terminie / mc": { number: null },
  "Średnia wartość faktury PLN": { number: null },
  "Ból główny": emptyRichText,
  "Podejście TMS": emptyRichText,
  Obiekcje: emptyRichText,
  Notatki: emptyRichText,
  "Następny krok": emptyRichText,
  "Pitch Recipe": emptyRichText,
  "Cytaty klienta": emptyRichText,
  "Personalizacja prezentacji": emptyRichText,
  "Ocena ICP": { select: null },
  "Data discovery": { date: null },
  "Data następnego kroku": { date: null },
  "Liczba prób kontaktu": { number: 0 },
  Status: { select: { name: "Nowy lead" } },
} as Record<string, unknown> as UpdatePageParameters["properties"];
