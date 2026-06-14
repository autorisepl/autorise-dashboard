import { NextResponse } from 'next/server'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const ALLOWED_EXTS = new Set(['mp3', 'mp4', 'm4a', 'wav', 'ogg', 'webm'])

const MIME_MAP: Record<string, string> = {
  mp3: 'audio/mp3',
  mp4: 'audio/mp4',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
}

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB — Gemini inline data limit

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Brak konfiguracji GEMINI_API_KEY na serwerze.' },
      { status: 500 }
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { error: 'Nie udało się odczytać danych formularza. Plik może być za duży.' },
      { status: 400 }
    )
  }

  const file = formData.get('audio') as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Brak pliku audio.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTS.has(ext)) {
    return NextResponse.json(
      { error: `Nieobsługiwany format: .${ext}. Użyj mp3, m4a, wav lub wav.` },
      { status: 400 }
    )
  }

  if (file.size > MAX_BYTES) {
    const mb = Math.round(file.size / 1024 / 1024)
    return NextResponse.json(
      { error: `Plik jest za duży (${mb} MB). Limit dla tej metody to 20 MB.` },
      { status: 400 }
    )
  }

  const mimeType = MIME_MAP[ext] ?? 'audio/mp3'

  let base64: string
  try {
    const buffer = await file.arrayBuffer()
    base64 = Buffer.from(buffer).toString('base64')
  } catch {
    return NextResponse.json({ error: 'Błąd odczytu pliku.' }, { status: 500 })
  }

  const geminiBody = {
    contents: [
      {
        parts: [
          {
            inline_data: { mime_type: mimeType, data: base64 },
          },
          {
            text: 'Transkrybuj dokładnie całą rozmowę słowo w słowo. Zachowaj oryginalny język. Jeśli jest więcej niż jeden rozmówca, oznaczaj ich jako "Rozmówca 1:", "Rozmówca 2:" itp. Nie dodawaj podsumowań ani komentarzy — tylko czysty transkrypt rozmowy.',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 65536,
    },
  }

  let geminiRes: Response
  try {
    geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Błąd połączenia z Gemini API: ${err instanceof Error ? err.message : 'nieznany błąd'}` },
      { status: 500 }
    )
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => 'brak szczegółów')
    return NextResponse.json(
      { error: `Gemini API zwrócił błąd ${geminiRes.status}: ${errText.slice(0, 300)}` },
      { status: 500 }
    )
  }

  let geminiJson: unknown
  try {
    geminiJson = await geminiRes.json()
  } catch {
    return NextResponse.json({ error: 'Nieprawidłowa odpowiedź z Gemini API.' }, { status: 500 })
  }

  const transcript =
    (geminiJson as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
      ?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!transcript) {
    return NextResponse.json(
      { error: 'Gemini nie zwrócił transkryptu. Sprawdź czy plik audio zawiera mowę.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ transcript })
}
