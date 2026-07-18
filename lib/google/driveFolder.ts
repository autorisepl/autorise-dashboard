import type { drive_v3 } from "googleapis";

/**
 * Pełna, paginowana lista nazw plików w folderze Drive (bez limitu 50 jak w
 * /api/google/drive/transcripts, który celowo ogranicza się do ostatnich plików
 * pod przeglądarkę /pliki). Używane tam gdzie liczy się kompletność, nie tylko
 * podgląd — np. statystyki "Odbyte, nieprzetworzone" (A6, 2026-07-18).
 */
export async function listAllFileNames(drive: drive_v3.Drive, folderId: string): Promise<string[]> {
  const names: string[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "nextPageToken, files(name)",
      pageSize: 1000,
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      if (f.name) names.push(f.name);
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return names;
}
