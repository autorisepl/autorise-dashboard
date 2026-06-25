import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDriveClient, getRefreshToken } from "@/lib/google/auth";

export const dynamic = "force-dynamic";

export interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
  modifiedTime: string;
  size: number;
  mimeType: string;
}

const MP3_FOLDER_ID = process.env.GOOGLE_DRIVE_TRANSCRIPTS_MP3_FOLDER_ID ?? "";
const TXT_FOLDER_ID = process.env.GOOGLE_DRIVE_TRANSCRIPTS_TXT_FOLDER_ID ?? "";

async function listFolder(
  drive: ReturnType<typeof getDriveClient>,
  folderId: string,
): Promise<DriveFile[]> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name,webViewLink,modifiedTime,size,mimeType)",
    orderBy: "modifiedTime desc",
    pageSize: 50,
  });
  return (res.data.files ?? [])
    .filter((f) => f.id && f.name)
    .map((f) => ({
      id: f.id!,
      name: f.name!,
      webViewLink: f.webViewLink ?? "",
      modifiedTime: f.modifiedTime ?? "",
      size: parseInt(f.size ?? "0", 10),
      mimeType: f.mimeType ?? "",
    }));
}

export async function GET() {
  const cookieStore = await cookies();
  const refreshToken = getRefreshToken({
    get: (name) => {
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

  try {
    const drive = getDriveClient(refreshToken);
    const [mp3, txt] = await Promise.all([
      MP3_FOLDER_ID ? listFolder(drive, MP3_FOLDER_ID) : Promise.resolve([]),
      TXT_FOLDER_ID ? listFolder(drive, TXT_FOLDER_ID) : Promise.resolve([]),
    ]);

    return NextResponse.json({ success: true, mp3, txt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Google Drive";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
