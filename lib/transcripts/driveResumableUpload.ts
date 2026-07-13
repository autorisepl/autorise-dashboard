// Upload dużych plików audio bezpośrednio z przeglądarki do Google Drive,
// z pominięciem Route Handlera i jego limitu body ~4.5 MB na Vercelu.
// Używane gdy plik przekracza RAW_UPLOAD_MAX_BYTES — wtedy zamiast wysyłać
// bajty w body POST /api/tools/transcribe, najpierw trafiają na Dysk, a
// transkrypcja dostaje tylko driveFileId (mały JSON, bez limitu).

export class DriveUploadError extends Error {}

interface SessionResponse {
  success?: boolean;
  uploadUrl?: string;
  error?: string;
}

async function openUploadSession(
  fileName: string,
  mimeType: string,
  size: number,
): Promise<string> {
  const res = await fetch("/api/google/drive/upload-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, mimeType, size }),
  });
  const data = (await res.json().catch(() => ({}))) as SessionResponse;
  if (!res.ok || !data.success || !data.uploadUrl) {
    throw new DriveUploadError(
      data.error ?? `Nie udało się otworzyć sesji uploadu (${res.status}).`,
    );
  }
  return data.uploadUrl;
}

// PUT bajtów bezpośrednio do sesji Google, z callbackiem postępu przez XHR
// (fetch() nie eksponuje postępu wysyłki).
function putToDrive(
  uploadUrl: string,
  file: File,
  mimeType: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", mimeType || "application/octet-stream");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as { id?: string };
          if (parsed.id) {
            resolve(parsed.id);
            return;
          }
        } catch {
          /* brak JSON w odpowiedzi */
        }
        reject(new DriveUploadError("Dysk nie zwrócił identyfikatora pliku."));
      } else {
        reject(new DriveUploadError(`Upload na Dysk nie powiódł się (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new DriveUploadError("Błąd połączenia podczas uploadu na Dysk."));
    xhr.onabort = () => reject(new DriveUploadError("Upload przerwany."));

    xhr.send(file);
  });
}

// Zwraca fileId nowo utworzonego pliku na Dysku. fileName/mimeType można
// nadpisać (np. po samo-naprawie rozszerzenia z validateAudioFile), żeby na
// Dysk trafiła nazwa zgodna z rzeczywistą zawartością pliku.
export async function uploadFileToDriveResumable(
  file: File,
  onProgress?: (pct: number) => void,
  fileName: string = file.name,
  mimeType: string = file.type || "audio/mpeg",
): Promise<string> {
  const uploadUrl = await openUploadSession(fileName, mimeType, file.size);
  return putToDrive(uploadUrl, file, mimeType, onProgress);
}
