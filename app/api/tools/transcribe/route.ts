export const maxDuration = 300
export const dynamic = 'force-dynamic'

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const ALLOWED_EXTS = new Set(['mp3', 'mp4', 'm4a', 'wav', 'ogg', 'webm', 'flac'])
const CHUNK_BYTES = 22 * 1024 * 1024 // 22 MB — safely under Groq's 25 MB limit

interface GroqSegment {
  start: number
  end: number
  text: string
}

interface GroqVerboseResponse {
  text: string
  duration: number
  language: string
  segments?: GroqSegment[]
}

interface TranscriptSegment {
  start: number
  end: number
  text: string
}

async function transcribeBytes(
  bytes: Uint8Array,
  fileName: string,
  mimeType: string,
  apiKey: string,
): Promise<GroqVerboseResponse> {
  const form = new FormData()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form.append('file', new Blob([bytes.buffer as any], { type: mimeType }), fileName)
  form.append('model', 'whisper-large-v3')
  form.append('response_format', 'verbose_json')
  form.append('temperature', '0')

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    let msg = `Groq API błąd ${res.status}`
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } }
      if (parsed.error?.message) msg = parsed.error.message
    } catch { /* use raw msg */ }
    throw new Error(msg)
  }

  return res.json() as Promise<GroqVerboseResponse>
}

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Brak konfiguracji GROQ_API_KEY na serwerze.' }, { status: 500 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: 'Nie udało się odczytać pliku.' }, { status: 400 })
  }

  const file = formData.get('audio') as File | null
  if (!file || file.size === 0) {
    return Response.json({ error: 'Brak pliku audio.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTS.has(ext)) {
    return Response.json(
      { error: `Format .${ext} nie jest obsługiwany. Użyj: mp3, m4a, wav, flac, ogg.` },
      { status: 400 },
    )
  }

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunkCount = Math.ceil(bytes.length / CHUNK_BYTES)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send({ type: 'start', chunks: chunkCount, fileName: file.name, fileSize: file.size })

        const allSegments: TranscriptSegment[] = []
        let fullText = ''
        let totalDuration = 0
        let detectedLanguage = ''

        for (let i = 0; i < chunkCount; i++) {
          const start = i * CHUNK_BYTES
          const end = Math.min(start + CHUNK_BYTES, bytes.length)
          const chunk = bytes.slice(start, end)
          const chunkName = chunkCount > 1 ? `chunk_${i + 1}.${ext}` : file.name

          let result: GroqVerboseResponse
          try {
            result = await transcribeBytes(chunk, chunkName, file.type, apiKey)
          } catch (err) {
            send({
              type: 'error',
              message: `Błąd transkrypcji${chunkCount > 1 ? ` (fragment ${i + 1}/${chunkCount})` : ''}: ${
                err instanceof Error ? err.message : 'nieznany błąd'
              }`,
            })
            controller.close()
            return
          }

          for (const seg of result.segments ?? []) {
            allSegments.push({
              start: +(seg.start + totalDuration).toFixed(2),
              end: +(seg.end + totalDuration).toFixed(2),
              text: seg.text.trim(),
            })
          }

          const chunkText = result.text.trim()
          fullText += (i > 0 ? ' ' : '') + chunkText
          totalDuration += result.duration ?? 0
          detectedLanguage = detectedLanguage || result.language

          send({
            type: 'chunk',
            done: i + 1,
            total: chunkCount,
            partialText: chunkText,
            processedDuration: +totalDuration.toFixed(2),
          })
        }

        if (!fullText.trim()) {
          send({ type: 'error', message: 'Transkrypt jest pusty. Sprawdź czy plik zawiera mowę.' })
          controller.close()
          return
        }

        send({
          type: 'done',
          transcript: fullText.trim(),
          segments: allSegments,
          duration: +totalDuration.toFixed(2),
          language: detectedLanguage || 'pl',
          chunks: chunkCount,
        })
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Nieznany błąd serwera.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
