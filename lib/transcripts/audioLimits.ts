// Jedno źródło prawdy dla limitów uploadu audio — czytane zarówno przez
// panel informacyjny przy nagrywarce, jak i komunikaty błędów w kolejce.
//
// RAW_UPLOAD_MAX_BYTES: próg poniżej którego plik idzie prosto w body żądania
// POST do /api/tools/transcribe. Vercel Route Handlery (nie Server Actions —
// "bodySizeLimit" w next.config.ts na nie NIE działa) mają twardy limit ok.
// 4.5 MB na request body, egzekwowany przez platformę przed dotarciem do
// handlera (stąd błąd 413, którego nie da się złapać w kodzie aplikacji).
// Zostawiamy zapas bezpieczeństwa poniżej realnego limitu platformy.
export const RAW_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

// Całkowity limit pliku audio przyjmowanego do kolejki (dopasowany do
// "do 100 MB" pokazywanego dziś w strefie drop + limitu Server Actions).
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

export const ALLOWED_AUDIO_EXTS = ["mp3", "m4a", "wav", "ogg", "webm", "flac", "mp4"] as const;

// Przybliżony bitrate typowego nagrania mowy (128 kbps mono) — do wyliczenia
// orientacyjnego czasu nagrania przy limicie RAW_UPLOAD_MAX_BYTES.
const TYPICAL_BITRATE_BPS = 128_000 / 8;

export function fmtMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function approxMinutesForBytes(bytes: number): number {
  return Math.round(bytes / TYPICAL_BITRATE_BPS / 60);
}
