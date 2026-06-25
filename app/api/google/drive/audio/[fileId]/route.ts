import type { Readable } from "node:stream";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDriveClient, getRefreshToken } from "@/lib/google/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pobiera plik audio z Google Drive jako binarny strumień (do transkrypcji).
// Używa responseType: "stream" + Buffer.concat — to JEDYNY pewny sposób na
// nienaruszone bajty binarne z googleapis (arraybuffer bywa dekodowany jako
// string i psuje MP3, przez co Groq zwraca 500).
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
    const drive = getDriveClient(refreshToken);

    const meta = await drive.files.get({ fileId, fields: "name,mimeType,size" });
    const name = meta.data.name ?? "audio.mp3";
    const mimeType = meta.data.mimeType ?? "audio/mpeg";

    const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

    const stream = res.data as unknown as Readable;
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
      stream.on("end", () => resolve());
      stream.on("error", (err: Error) => reject(err));
    });
    const bytes = Buffer.concat(chunks);

    if (bytes.length === 0) {
      return NextResponse.json(
        { success: false, error: "Plik z Dysku jest pusty." },
        { status: 422 },
      );
    }

    return new Response(bytes, {
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
