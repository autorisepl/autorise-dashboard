import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedClient, getRefreshToken } from "@/lib/google/auth";

export const dynamic = "force-dynamic";

const MP3_FOLDER_ID = process.env.GOOGLE_DRIVE_TRANSCRIPTS_MP3_FOLDER_ID ?? "";

// Inicjuje sesję resumable upload w Google Drive i zwraca przeglądarce sam
// URL sesji (Google osadza autoryzację w tokenie sesji — dalsze PUT-y z
// bajtami idą już bezpośrednio z przeglądarki do Google, z pominięciem
// naszego Route Handlera i jego limitu body ~4.5 MB na Vercelu). Sekrety
// (refresh token, client secret) zostają po stronie serwera, do przeglądarki
// trafia wyłącznie jednorazowy URL sesji.
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const refreshToken = getRefreshToken({
    get: (name: string) => {
      const val = cookieStore.get(name);
      return val ? { value: val.value } : undefined;
    },
  });

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: "Brak autoryzacji Google. Połącz konto w ustawieniach profilu." },
      { status: 401 },
    );
  }

  let body: { fileName?: string; mimeType?: string; size?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "Nieprawidłowe żądanie." }, { status: 400 });
  }

  const { fileName, mimeType, size } = body;
  if (!fileName || !mimeType) {
    return NextResponse.json(
      { success: false, error: "Brak nazwy pliku lub typu MIME." },
      { status: 400 },
    );
  }

  try {
    const auth = getAuthenticatedClient(refreshToken);
    const { token: accessToken } = await auth.getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Nie udało się uzyskać tokenu dostępu Google." },
        { status: 401 },
      );
    }

    const initHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mimeType,
    };
    if (typeof size === "number" && size > 0) {
      initHeaders["X-Upload-Content-Length"] = String(size);
    }

    const initRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
      {
        method: "POST",
        headers: initHeaders,
        body: JSON.stringify({
          name: fileName,
          mimeType,
          parents: MP3_FOLDER_ID ? [MP3_FOLDER_ID] : undefined,
        }),
      },
    );

    if (!initRes.ok || !initRes.headers.get("location")) {
      const detail = await initRes.text().catch(() => "");
      return NextResponse.json(
        { success: false, error: "Nie udało się otworzyć sesji uploadu na Dysku.", detail },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, uploadUrl: initRes.headers.get("location") });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Google Drive";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
