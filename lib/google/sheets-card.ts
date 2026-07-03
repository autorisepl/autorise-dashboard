// "Kontakty" client-card model for the Autorise agency Google Sheet.
//
// This module is pure (no Google client) so it can be unit-tested and reused.
// The route layer reads/writes the sheet and delegates all column mapping,
// matching, decoding, and cell-range building here.

export type CardFieldType = "checkbox" | "text" | "link" | "name" | "phone";

export interface CardFieldDef {
  /** Header text matchers, tried in order (case-insensitive). */
  headerPatterns: RegExp[];
  type: CardFieldType;
}

/** All logical fields of the "Kontakty" card. Boolean for checkbox, string otherwise. */
export interface CardState {
  imieNazwisko: string;
  numer: string;
  email: string;
  data: string;
  rozmowaKwalifikacyjna: boolean;
  notatkiKwalifikacyjne: string;
  nagranieKwalifikacyjne: string;
  umowionaRozmowaSprzedazowa: boolean;
  telefonPrzypomnienie: boolean;
  odbytaRozmowaSprzedazowa: boolean;
  notatkiSprzedazowe: string;
  nagranieSprzedazowe: string;
  umowioneSpotkanieDecyzyjne: boolean;
  zaproszenieLinkedin: boolean;
  odbyteSpotkanieDecyzyjne: boolean;
  notatkiDecyzyjne: string;
  nagranieDecyzyjne: string;
  followUpDate: string;
  pozyskanyKlient: boolean;
  podpisanaUmowa: boolean;
  oplaconaFaktura: boolean;
  wartoscUmowy: string;
}

export type CardFieldKey = keyof CardState;

/**
 * Logical key → header matcher + type. Headers are matched by content so the
 * sheet's columns can be reordered without breaking the integration.
 */
export const KONTAKTY_FIELDS: Record<CardFieldKey, CardFieldDef> = {
  imieNazwisko: {
    headerPatterns: [/imi[eę]\s*i\s*nazwisko/i, /^nazwa$/i, /^osoba$/i],
    type: "name",
  },
  numer: { headerPatterns: [/^numer$/i, /telefon/i, /^phone$/i], type: "phone" },
  email: { headerPatterns: [/^e-?mail$/i, /^mail$/i], type: "text" },
  data: { headerPatterns: [/^data$/i], type: "text" },

  rozmowaKwalifikacyjna: {
    headerPatterns: [/rozmowa\s+telefoniczna.*kwalifik/i, /^rozmowa.*kwalifik/i],
    type: "checkbox",
  },
  notatkiKwalifikacyjne: {
    headerPatterns: [/notatki\s+po\s+rozmowie\s+telefonicznej/i],
    type: "text",
  },
  nagranieKwalifikacyjne: { headerPatterns: [/nagranie\s+rozmowy\s+telefonicznej/i], type: "link" },

  umowionaRozmowaSprzedazowa: {
    headerPatterns: [/um[oó]wiona\s+rozmowa\s+sprzeda/i],
    type: "checkbox",
  },
  telefonPrzypomnienie: { headerPatterns: [/telefon\s+z\s+przypomnieniem/i], type: "checkbox" },
  odbytaRozmowaSprzedazowa: { headerPatterns: [/odbyta\s+rozmowa\s+sprzeda/i], type: "checkbox" },
  notatkiSprzedazowe: { headerPatterns: [/notatki\s+po\s+rozmowie\s+sprzeda/i], type: "text" },
  nagranieSprzedazowe: { headerPatterns: [/nagranie\s+rozmowy\s+sprzeda/i], type: "link" },

  umowioneSpotkanieDecyzyjne: {
    headerPatterns: [/um[oó]wione\s+spotkanie\s+decyzyjne/i],
    type: "checkbox",
  },
  zaproszenieLinkedin: { headerPatterns: [/zaproszenie.*(linkedin|youtube)/i], type: "checkbox" },
  odbyteSpotkanieDecyzyjne: {
    headerPatterns: [/odbyte\s+spotkanie\s+decyzyjne/i],
    type: "checkbox",
  },
  notatkiDecyzyjne: { headerPatterns: [/notatki\s+po\s+rozmowie\s+decyzyjnej/i], type: "text" },
  nagranieDecyzyjne: { headerPatterns: [/nagranie\s+rozmowy\s+decyzyjnej/i], type: "link" },

  followUpDate: {
    headerPatterns: [/data\s+follow.?up/i, /follow.?up\s+data/i, /data\s+nast[eę]pnego/i],
    type: "text",
  },
  pozyskanyKlient: { headerPatterns: [/pozyskany\s+klient/i], type: "checkbox" },
  podpisanaUmowa: { headerPatterns: [/podpisana\s+umowa/i], type: "checkbox" },
  oplaconaFaktura: { headerPatterns: [/op[lł]acona\s+faktura/i], type: "checkbox" },
  wartoscUmowy: { headerPatterns: [/warto[sś][cć]\s+umowy/i], type: "text" },
};

const CHECKBOX_KEYS = (Object.keys(KONTAKTY_FIELDS) as CardFieldKey[]).filter(
  (k) => KONTAKTY_FIELDS[k].type === "checkbox",
);

const DIACRITICS: Record<string, string> = {
  ł: "l",
  ż: "z",
  ź: "z",
  ą: "a",
  ć: "c",
  ę: "e",
  ń: "n",
  ó: "o",
  ś: "s",
};

/** Lowercase, strip Polish diacritics, collapse separators — for fuzzy name matching. */
export function normalizePersonName(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[łżźąćęńóś]/g, (c) => DIACRITICS[c] ?? c)
    .replace(/[\s\-_]+/g, " ")
    .trim();
}

/** 0 → "A", 25 → "Z", 26 → "AA". */
export function colIndexToLetter(index: number): string {
  let i = index;
  let letter = "";
  do {
    letter = String.fromCharCode(65 + (i % 26)) + letter;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return letter;
}

export type ColumnMap = Partial<Record<CardFieldKey, number>>;

/** Build logical-field → 0-based column index from the header row. */
export function buildColumnMap(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  for (const key of Object.keys(KONTAKTY_FIELDS) as CardFieldKey[]) {
    const { headerPatterns } = KONTAKTY_FIELDS[key];
    const idx = headers.findIndex((h) => headerPatterns.some((p) => p.test(h)));
    if (idx >= 0) map[key] = idx;
  }
  return map;
}

const isTruthyCell = (v: string): boolean => {
  const t = (v ?? "").toString().trim().toLowerCase();
  return t === "true" || t === "tak" || t === "✓" || t === "x" || t === "1";
};

/** Decode a raw sheet row into a typed CardState using the column map. */
export function decodeCard(rowValues: string[], colMap: ColumnMap): CardState {
  const get = (key: CardFieldKey): string => {
    const idx = colMap[key];
    if (idx === undefined) return "";
    return (rowValues[idx] ?? "").toString();
  };
  const card = {} as CardState;
  for (const key of Object.keys(KONTAKTY_FIELDS) as CardFieldKey[]) {
    if (KONTAKTY_FIELDS[key].type === "checkbox") {
      (card[key] as boolean) = isTruthyCell(get(key));
    } else {
      (card[key] as string) = get(key);
    }
  }
  return card;
}

export interface FoundRow {
  /** 1-based sheet row number (header is row 1). */
  rowNumber: number;
  rowValues: string[];
}

/**
 * Find the data row whose "Imię i nazwisko" matches clientName (diacritic-insensitive).
 * `dataRows` excludes the header. `headerRowOffset` is the row number of the header (1).
 */
export function findCardRow(
  dataRows: string[][],
  colMap: ColumnMap,
  clientName: string,
): FoundRow | null {
  const nameIdx = colMap.imieNazwisko;
  if (nameIdx === undefined) return null;
  const target = normalizePersonName(clientName);
  if (!target) return null;

  for (let i = 0; i < dataRows.length; i++) {
    const cell = (dataRows[i][nameIdx] ?? "").toString();
    if (normalizePersonName(cell) === target) {
      return { rowNumber: i + 2, rowValues: dataRows[i] };
    }
  }
  return null;
}

/** Serialize a single field value to the string written into the cell. */
export function cellValueFor(key: CardFieldKey, value: boolean | string): string {
  if (KONTAKTY_FIELDS[key].type === "checkbox") {
    return value ? "TRUE" : "FALSE";
  }
  return value == null ? "" : String(value);
}

export interface CellUpdate {
  /** A1 range, e.g. "Kontakty!F20". */
  range: string;
  values: string[][];
}

/**
 * Convert a partial card update into per-cell batchUpdate entries.
 * Only provided keys that exist in the column map are emitted.
 */
export function cardUpdatesToCells(
  sheetTitle: string,
  rowNumber: number,
  colMap: ColumnMap,
  updates: Partial<CardState>,
): CellUpdate[] {
  const cells: CellUpdate[] = [];
  for (const key of Object.keys(updates) as CardFieldKey[]) {
    const idx = colMap[key];
    if (idx === undefined) continue;
    const raw = updates[key];
    if (raw === undefined) continue;
    const letter = colIndexToLetter(idx);
    cells.push({
      range: `${sheetTitle}!${letter}${rowNumber}`,
      values: [[cellValueFor(key, raw as boolean | string)]],
    });
  }
  return cells;
}

export { CHECKBOX_KEYS };
