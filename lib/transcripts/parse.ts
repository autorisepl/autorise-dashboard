// Shared transcript filename parsing.
// Filenames look like: "transkrypt-michal-gierka-kwalifikacja.mp3" / "transkrypt-jan-nowak-sprzedaz.txt"
// We extract a human display name, a stage tag, and a normalized base key
// (used to pair an MP3 recording with its TXT transcript).

export const TRANSCRIPT_QUALIFIERS = [
  "kwalifikacja",
  "sprzedaz",
  "diagnoza", // legacy — kept for backward compat with existing Drive files
  "discovery",
  "analiza",
  "spotkanie",
  "rozmowa",
] as const;

export interface ParsedTranscriptName {
  /** Capitalized display name, e.g. "Michal Gierka". */
  displayName: string;
  /** Stage tag, e.g. "Kwalifikacja" (empty if none detected). */
  tag: string;
  /**
   * Normalized base key without extension, "transkrypt-" prefix, or any
   * trailing date/duplicate suffix Drive may append. Used to pair MP3↔TXT.
   * e.g. "michal-gierka-kwalifikacja".
   */
  baseKey: string;
}

/** Strip extension, "transkrypt-" prefix, and Google Drive "_2026-06-24" / " (1)" suffixes. */
function stripFileName(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "") // extension
    .replace(/^transkrypt-?/i, "") // prefix
    .replace(/_\d{4}-\d{2}-\d{2}.*$/, "") // _YYYY-MM-DD date suffix from upload
    .replace(/\s*\(\d+\)\s*$/, "") // " (1)" duplicate suffix
    .trim();
}

export function parseClientFileName(filename: string): ParsedTranscriptName {
  const base = stripFileName(filename);
  const parts = base.split("-").filter(Boolean);

  let nameEnd = parts.length;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (TRANSCRIPT_QUALIFIERS.some((q) => parts[i].toLowerCase().startsWith(q))) {
      nameEnd = i;
    }
  }

  const nameParts = parts.slice(0, nameEnd || parts.length);
  const tagPart = parts[nameEnd] ?? "";

  const displayName =
    nameParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") || filename;
  const tag = tagPart ? tagPart.charAt(0).toUpperCase() + tagPart.slice(1) : "";
  const baseKey = base.toLowerCase();

  return { displayName, tag, baseKey };
}

/** Normalized person key (name without stage tag) for grouping recordings per client. */
export function personKey(filename: string): string {
  const { baseKey, tag } = parseClientFileName(filename);
  if (!tag) return baseKey;
  // Drop the trailing stage tag segment to get a stable per-person key.
  const parts = baseKey.split("-").filter(Boolean);
  return parts.slice(0, Math.max(1, parts.length - 1)).join("-");
}

/**
 * Does an MP3 recording already have a matching TXT transcript?
 * Pairs on the normalized base key (same person + stage), with a person-level fallback.
 */
export function hasMatchingTranscript(mp3Name: string, txtNames: string[]): boolean {
  const key = parseClientFileName(mp3Name).baseKey;
  if (txtNames.some((t) => parseClientFileName(t).baseKey === key)) return true;
  // Fallback: same person, any stage (recording named slightly differently than its TXT).
  const pk = personKey(mp3Name);
  return txtNames.some((t) => personKey(t) === pk);
}
