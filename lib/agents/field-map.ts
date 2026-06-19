export interface AgentFieldInfo {
  agentNumber: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  model: string;
  extendedThinking: boolean;
  fieldsWritten: string[];
  requires?: string;
}

export const AGENT_FIELD_MAP: Record<number, AgentFieldInfo> = {
  0: {
    agentNumber: 0,
    name: "Rejestracja leada — KRS Enrich",
    model: "Sonnet 4.6",
    extendedThinking: false,
    fieldsWritten: [
      "Firma",
      "Kontakt",
      "Telefon",
      "Decydent",
      "Status → Nowy lead",
      "Notatki (KRS)",
    ],
  },
  1: {
    agentNumber: 1,
    name: "Kwalifikacja Telefoniczna",
    model: "Sonnet 4.6",
    extendedThinking: false,
    fieldsWritten: [
      "Firma",
      "Kontakt",
      "Telefon",
      "Flota",
      "Spedytorzy",
      "Decydent",
      "TMS",
      "Podejście TMS",
      "Ból główny",
      "Poprzednie próby",
      "Koszt problemu PLN/mc",
      "Koszt roczny PLN/rok",
      "Ocena ICP",
      "Status",
      "Data discovery",
      "Następny krok",
      "Uwagi Agenta 1",
    ],
  },
  2: {
    agentNumber: 2,
    name: "Pre-Discovery Brief",
    model: "Opus 4.8 + extended thinking",
    extendedThinking: true,
    fieldsWritten: [
      "Hipoteza ból główny",
      "Przewidywane obiekcje",
      "Ryzyka rozmowy",
      "Uwagi Agenta 2",
      "Pre-Discovery Brief (podstrona)",
      "Status → Discovery umówione",
    ],
    requires: "Output Agenta 1 (Status: Kwalifikacja lub wyżej)",
  },
  3: {
    agentNumber: 3,
    name: "Personalizacja Prezentacji",
    model: "Opus 4.8",
    extendedThinking: false,
    fieldsWritten: ["Personalizacja prezentacji"],
    requires: "Output Agenta 2 (Pre-Discovery Brief)",
  },
  4: {
    agentNumber: 4,
    name: "Analiza Discovery Call",
    model: "Sonnet 4.6",
    extendedThinking: false,
    fieldsWritten: [
      "Wynik Discovery",
      "Re-engagement",
      "Status (→ Finalizacja / Niekwalifikowany)",
      "Następny krok",
      "Analiza Discovery Call (podstrona)",
    ],
    requires: "Discovery Call odbyty (Status: Discovery umówione)",
  },
  5: {
    agentNumber: 5,
    name: "Szkolenia Agency Leaders",
    model: "Opus 4.8 + extended thinking",
    extendedThinking: true,
    fieldsWritten: ["Brak zapisu do Pipeline — raport do ręcznego review"],
  },
  6: {
    agentNumber: 6,
    name: "Analiza Narzędzia",
    model: "Opus 4.8",
    extendedThinking: false,
    fieldsWritten: ["Brak zapisu do Pipeline — raport analizy narzędzia"],
  },
};
