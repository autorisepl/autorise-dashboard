// Jedno źródło prawdy dla kolumn Kanbanu /pipeline — importowane zarówno przez UI
// (app/(dashboard)/pipeline/page.tsx) jak i przez server-side regułę blokady
// (app/api/pipeline/[id]/kanban-status/route.ts), żeby lista statusów i reguła "co jest
// zablokowane do przeciągania" nigdy się nie rozjechały.

// 9 statusów widocznych na Kanbanie, w tej kolejności kolumn. Upsell i Zakończona współpraca
// świadomie pominięte (decyzja z treści zadania redesignu) — karty z tymi statusami nie
// znikają z systemu, po prostu nie mają tu kolumny.
export const KANBAN_VISIBLE_STATUSES = [
  "Nowy lead",
  "Kwalifikacja",
  "Discovery umówione",
  "Niekwalifikowany",
  "Nieaktywny (follow up)",
  "Finalizacja",
  "Kickoff",
  "Wdrożenie",
  "Retainer",
] as const;

// Etapy ustawiane rozmową kwalifikacyjną/sprzedażową (agent/skrypt po transkrypcie) —
// zablokowane do ręcznego przeciągnięcia, jako punkt startowy LUB docelowy. Ręczne
// przesunięcie tutaj fałszowałoby dane, które mają pochodzić wyłącznie z rozmowy.
export const KANBAN_LOCKED_STATUSES: string[] = [
  "Nowy lead",
  "Kwalifikacja",
  "Discovery umówione",
  "Niekwalifikowany",
  "Nieaktywny (follow up)",
];

// Etapy w pełni przeciągalne między sobą (Finalizacja do Retainer) — decyzje operacyjne
// zespołu, nie wynik rozmowy.
export const KANBAN_DRAGGABLE_STATUSES: string[] = [
  "Finalizacja",
  "Kickoff",
  "Wdrożenie",
  "Retainer",
];

export interface KanbanGroup {
  key: string;
  label: string;
  statuses: string[];
}

// Kanban 2026-08-24: kolumny statusu pogrupowane w poziome sekcje wg makro-etapu procesu,
// sekcje ułożone pionowo jedna pod drugą, posortowane w UI wg liczby kart malejąco (najwięcej
// kart na górze) — nie sztywna kolejność, przeliczana na żywo z danych. Suma zbiorów statusów
// w KANBAN_GROUPS musi pokrywać się 1:1 z KANBAN_VISIBLE_STATUSES (żaden status nie zostaje
// bez grupy, żaden nie duplikuje się w dwóch grupach).
export const KANBAN_GROUPS: KanbanGroup[] = [
  {
    key: "sprzedaz",
    label: "Kwalifikacja i sprzedaż",
    statuses: ["Nowy lead", "Kwalifikacja", "Discovery umówione", "Finalizacja"],
  },
  {
    key: "wdrozenie",
    label: "Wdrożenie",
    statuses: ["Kickoff", "Wdrożenie"],
  },
  {
    key: "retainer",
    label: "Retainer",
    statuses: ["Retainer"],
  },
  {
    key: "nieaktywne",
    label: "Nieaktywne",
    statuses: ["Niekwalifikowany", "Nieaktywny (follow up)"],
  },
];
