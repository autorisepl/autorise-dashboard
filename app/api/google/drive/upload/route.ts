import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getRefreshToken } from "@/lib/google/auth";

const TRANSCRIPT_FOLDER_ID =
  process.env.GOOGLE_DRIVE_TRANSCRIPTS_TXT_FOLDER_ID ?? "1wk2yKYnC_7kvk8-P0Na8lBYrWO8DqHox";

export async function POST(req: NextRequest) {
  const token = getRefreshToken({
    get: (name: string) => {
      const val = req.cookies.get(name);
      return val ? { value: val.value } : undefined;
    },
  });

  if (!token) {
    return NextResponse.json({ error: "Not connected to Google" }, { status: 401 });
  }

  let body: { fileName?: string; content?: string; folderId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fileName, content, folderId = TRANSCRIPT_FOLDER_ID } = body;

  if (!fileName || typeof content !== "string") {
    return NextResponse.json({ error: "fileName and content are required" }, { status: 400 });
  }

  try {
    const auth = getAuthenticatedClient(token);
    const { token: accessToken } = await auth.getAccessToken();

    if (!accessToken) {
      return NextResponse.json({ error: "Could not get Google access token" }, { status: 401 });
    }

    // Multipart upload — avoids Node.js stream dependency, works on CF Pages
    const boundary = `autorise_${Date.now()}`;
    const metadata = JSON.stringify({
      name: fileName,
      mimeType: "text/plain",
      parents: [folderId],
    });

    const bodyParts = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      metadata,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      content,
      "",
      `--${boundary}--`,
    ].join("\r\n");

    const driveRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary="${boundary}"`,
        },
        body: bodyParts,
      },
    );

    if (!driveRes.ok) {
      const errText = await driveRes.text().catch(() => "");
      if (driveRes.status === 403) {
        return NextResponse.json({ error: "scope_required", detail: errText }, { status: 403 });
      }
      return NextResponse.json({ error: "Drive upload failed", detail: errText }, { status: 500 });
    }

    const driveData = (await driveRes.json()) as {
      id?: string;
      name?: string;
      webViewLink?: string;
    };

    return NextResponse.json({
      success: true,
      fileId: driveData.id,
      fileName: driveData.name ?? fileName,
      webViewLink: driveData.webViewLink,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Drive upload failed", detail: msg }, { status: 500 });
  }
}
