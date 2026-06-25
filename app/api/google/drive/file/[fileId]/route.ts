import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDriveClient, getRefreshToken } from "@/lib/google/auth";

export const dynamic = "force-dynamic";

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

    const metaRes = await drive.files.get({ fileId, fields: "name,mimeType" });
    const mimeType = metaRes.data.mimeType ?? "";

    // For Google Docs export as plain text
    if (mimeType === "application/vnd.google-apps.document") {
      const exportRes = await drive.files.export(
        { fileId, mimeType: "text/plain" },
        { responseType: "text" },
      );
      return new Response(exportRes.data as string, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // For plain text files download directly
    const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "text" });

    return new Response(res.data as string, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Google Drive";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
