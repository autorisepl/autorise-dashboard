import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRefreshToken } from "@/lib/google/auth";
import { downloadDriveAudio } from "@/lib/google/driveAudio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pobiera plik audio z Google Drive jako binarny strumień (do transkrypcji).
export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;

  const cookieStore = await cookies();
  const refreshToken = getRefreshToken({
    get: (name) => {
      const val = cookieStore.get(name);
      return val ? { value: val.value } : undefined;
    },
  });

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: "Brak autoryzacji Google." },
      { status: 401 },
    );
  }

  try {
    const { bytes, name, mimeType } = await downloadDriveAudio(refreshToken, fileId);

    if (bytes.length === 0) {
      return NextResponse.json(
        { success: false, error: "Plik z Dysku jest pusty." },
        { status: 422 },
      );
    }

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
        "Content-Length": String(bytes.length),
        "X-File-Name": encodeURIComponent(name),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Google Drive";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
