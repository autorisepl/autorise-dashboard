export const maxDuration = 300;
export const dynamic = "force-dynamic";

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const ALLOWED_EXTS = new Set(["mp3", "mp4", "m4a", "wav", "ogg", "webm", "flac"]);
const CHUNK_BYTES = 24 * 1024 * 1024; // 24 MB — pod limitem Groq 25 MB; mniej dzielenia = mniej błędów
const TRANSCRIBE_LANGUAGE = "pl"; // stały język: polski

interface GroqSegment {
  start: number;
  end: number;
  text: string;
}

interface GroqVerboseResponse {
  text: string;
  duration: number;
  language: string;
  segments?: GroqSegment[];
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

async function callGroqOnce(
  bytes: Uint8Array,
  fileName: string,
  mimeType: string,
  apiKey: string,
): Promise<Response> {
  const form = new FormData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form.append("file", new Blob([bytes.buffer as any], { type: mimeType }), fileName);
  form.append("model", "whisper-large-v3");
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");
  form.append("language", TRANSCRIBE_LANGUAGE); // wymuś polski

  return fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
}

const GATEWAY_STATUSES = new Set([429, 500, 502, 503, 504]);

async function transcribeBytes(
  bytes: Uint8Array,
  fileName: string,
  mimeType: string,
  apiKey: string,
): Promise<GroqVerboseResponse> {
  // Do 3 prób z narastającym backoffem na przejściowe błędy bramy Groq (429/5xx).
  let res = await callGroqOnce(bytes, fileName, mimeType, apiKey);
  for (let attempt = 1; attempt <= 2 && GATEWAY_STATUSES.has(res.status); attempt++) {
    await new Promise((r) => setTimeout(r, attempt * 1500));
    res = await callGroqOnce(bytes, fileName, mimeType, apiKey);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = "";
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      /* brak JSON */
    }
    if (GATEWAY_STATUSES.has(res.status)) {
      // 502/503/504/429 = chwilowy problem po stronie Groq, nie uszkodzony plik.
      throw new Error(
        `Serwer Groq chwilowo niedostępny (${res.status}). To przejściowy problem usługi — spróbuj ponownie za chwilę.`,
      );
    }
    throw new Error(detail || `Groq API błąd ${res.status}`);
  }

  return res.json() as Promise<GroqVerboseResponse>;
}

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Brak konfiguracji GROQ_API_KEY na serwerze." }, { status: 500 });
  }

  // Read file name and MIME type from custom headers (avoids multipart parsing limits)
  const rawName = req.headers.get("x-file-name") ?? "audio.mp3";
  let fileName: string;
  try {
    fileName = decodeURIComponent(rawName);
  } catch {
    fileName = rawName;
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTS.has(ext)) {
    return Response.json(
      { error: `Format .${ext} nie jest obsługiwany. Użyj: mp3, m4a, wav, flac, ogg.` },
      { status: 400 },
    );
  }

  const mimeType =
    req.headers.get("x-file-mime") ??
    req.headers.get("content-type")?.split(";")[0] ??
    "audio/mpeg";

  let bytes: Uint8Array;
  try {
    const buffer = await req.arrayBuffer();
    if (buffer.byteLength === 0) {
      return Response.json({ error: "Brak pliku audio (plik pusty)." }, { status: 400 });
    }
    bytes = new Uint8Array(buffer);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "nieznany błąd";
    return Response.json({ error: `Nie udało się odczytać pliku: ${detail}` }, { status: 400 });
  }

  const chunkCount = Math.ceil(bytes.length / CHUNK_BYTES);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: "start", chunks: chunkCount, fileName, fileSize: bytes.length });

        const allSegments: TranscriptSegment[] = [];
        let fullText = "";
        let totalDuration = 0;
        let detectedLanguage = "";

        for (let i = 0; i < chunkCount; i++) {
          const start = i * CHUNK_BYTES;
          const end = Math.min(start + CHUNK_BYTES, bytes.length);
          const chunk = bytes.slice(start, end);
          const chunkName = chunkCount > 1 ? `chunk_${i + 1}.${ext}` : fileName;

          let result: GroqVerboseResponse;
          try {
            result = await transcribeBytes(chunk, chunkName, mimeType, apiKey);
          } catch (err) {
            send({
              type: "error",
              message: `Błąd transkrypcji${chunkCount > 1 ? ` (fragment ${i + 1}/${chunkCount})` : ""}: ${
                err instanceof Error ? err.message : "nieznany błąd"
              }`,
            });
            controller.close();
            return;
          }

          for (const seg of result.segments ?? []) {
            allSegments.push({
              start: +(seg.start + totalDuration).toFixed(2),
              end: +(seg.end + totalDuration).toFixed(2),
              text: seg.text.trim(),
            });
          }

          const chunkText = result.text.trim();
          fullText += (i > 0 ? " " : "") + chunkText;
          totalDuration += result.duration ?? 0;
          detectedLanguage = detectedLanguage || result.language;

          send({
            type: "chunk",
            done: i + 1,
            total: chunkCount,
            partialText: chunkText,
            processedDuration: +totalDuration.toFixed(2),
          });
        }

        if (!fullText.trim()) {
          send({ type: "error", message: "Transkrypt jest pusty. Sprawdź czy plik zawiera mowę." });
          controller.close();
          return;
        }

        send({
          type: "done",
          transcript: fullText.trim(),
          segments: allSegments,
          duration: +totalDuration.toFixed(2),
          language: detectedLanguage || "pl",
          chunks: chunkCount,
        });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Nieznany błąd serwera.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
