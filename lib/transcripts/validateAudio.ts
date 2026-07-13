// Wykrywanie rzeczywistego formatu pliku po nagłówku bajtowym (magic bytes),
// nie po rozszerzeniu nazwy ani MIME zgłoszonym przez przeglądarkę — oba da
// się łatwo pomylić (znany wcześniej przypadek: webm zapisany z rozszerzeniem
// .mp3). Walidacja idzie PRZED wysłaniem do transkrypcji, żeby uszkodzony
// albo niezgodny plik dał czytelny komunikat od razu, a nie dopiero z
// zewnętrznego API po długim uploadzie.

export type DetectedAudioFormat = "mp3" | "wav" | "ogg" | "webm" | "mp4" | "flac" | null;

function bytesStartWith(bytes: Uint8Array, offset: number, ...pattern: number[]): boolean {
  if (bytes.length < offset + pattern.length) return false;
  return pattern.every((b, i) => bytes[offset + i] === b);
}

function asciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i++) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

export function detectAudioFormat(bytes: Uint8Array): DetectedAudioFormat {
  if (bytesStartWith(bytes, 0, 0x49, 0x44, 0x33)) return "mp3"; // "ID3"
  // Ramka MPEG bez tagu ID3 (0xFF + sync bits 111).
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "mp3";
  if (asciiAt(bytes, 0, "RIFF") && asciiAt(bytes, 8, "WAVE")) return "wav";
  if (asciiAt(bytes, 0, "OggS")) return "ogg";
  if (bytesStartWith(bytes, 0, 0x1a, 0x45, 0xdf, 0xa3)) return "webm"; // EBML (webm/mkv)
  if (asciiAt(bytes, 4, "ftyp")) return "mp4"; // mp4/m4a
  if (asciiAt(bytes, 0, "fLaC")) return "flac";
  return null;
}

// Rozszerzenie jakiego oczekuje /api/tools/transcribe (ALLOWED_EXTS) dla
// danego wykrytego formatu — używane do samo-naprawy nazwy pliku, gdy
// rozszerzenie nie zgadza się z realną zawartością (dokładnie ten znany
// przypadek: nagrywarka zapisuje kontener WebM/Opus, a plik trafia do
// kolejki z rozszerzeniem .mp3). Format jest realnie odtwarzalny, więc
// naprawiamy nazwę zamiast blokować transkrypcję działającego nagrania.
const FORMAT_TO_EXT: Record<Exclude<DetectedAudioFormat, null>, string> = {
  mp3: "mp3",
  wav: "wav",
  ogg: "ogg",
  webm: "webm",
  mp4: "m4a",
  flac: "flac",
};

const FORMAT_TO_MIME: Record<Exclude<DetectedAudioFormat, null>, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "audio/webm",
  mp4: "audio/mp4",
  flac: "audio/flac",
};

export interface AudioValidationResult {
  ok: boolean;
  error?: string;
  /** Wykryty format, gdy różni się od zadeklarowanego rozszerzenia — użyj do poprawienia nazwy/MIME przed wysyłką. */
  correctedExt?: string;
  correctedMimeType?: string;
}

// Sprawdza pierwsze bajty pliku. Blokuje tylko to, czego rzeczywiście nie da
// się przesłać do transkrypcji: pusty plik albo nierozpoznany/uszkodzony
// nagłówek. Niezgodność rozszerzenia z rozpoznanym, obsługiwanym formatem
// audio NIE jest błędem — zwracamy poprawne rozszerzenie do samo-naprawy.
export async function validateAudioFile(file: File): Promise<AudioValidationResult> {
  if (file.size === 0) {
    return {
      ok: false,
      error: "Plik jest pusty (0 bajtów). Nagranie mogło się nie zapisać poprawnie.",
    };
  }

  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (head.length === 0) {
    return { ok: false, error: "Nie udało się odczytać pliku. Spróbuj wybrać go ponownie." };
  }

  const detected = detectAudioFormat(head);
  if (!detected) {
    return {
      ok: false,
      error:
        "Nie rozpoznajemy formatu tego pliku albo jest uszkodzony. Sprawdź czy nagranie się poprawnie zapisało i spróbuj ponownie.",
    };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const correctExt = FORMAT_TO_EXT[detected];
  // "mp4" i "m4a" to ten sam wykryty format (mp4) — oba rozszerzenia są
  // już akceptowane przez backend, więc to nie jest niezgodność do naprawy.
  const alreadyFine = ext === correctExt || (detected === "mp4" && ext === "mp4");
  if (!alreadyFine) {
    return { ok: true, correctedExt: correctExt, correctedMimeType: FORMAT_TO_MIME[detected] };
  }

  return { ok: true };
}
