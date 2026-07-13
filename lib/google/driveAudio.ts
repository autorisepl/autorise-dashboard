import type { Readable } from "node:stream";
import { getDriveClient } from "@/lib/google/auth";

export interface DriveAudioBytes {
  bytes: Buffer;
  name: string;
  mimeType: string;
}

// Pobiera plik audio z Google Drive jako binarny strumień. Używa
// responseType: "stream" + Buffer.concat — to jedyny pewny sposób na
// nienaruszone bajty binarne z googleapis (arraybuffer bywa dekodowany jako
// string i psuje MP3, przez co Groq zwraca 500). Współdzielone przez
// GET /api/google/drive/audio/[fileId] oraz POST /api/tools/transcribe
// (ścieżka driveFileId, dla plików które trafiły na Dysk przez resumable
// upload zamiast surowego body żądania).
export async function downloadDriveAudio(
  refreshToken: string,
  fileId: string,
): Promise<DriveAudioBytes> {
  const drive = getDriveClient(refreshToken);

  const meta = await drive.files.get({ fileId, fields: "name,mimeType" });
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

  return { bytes: Buffer.concat(chunks), name, mimeType };
}
