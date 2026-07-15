"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  FileAudio,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioRecorder } from "@/components/transcripts/AudioRecorder";
import { ClientFileCard } from "@/components/transcripts/ClientFileCard";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { fmtMb, MAX_FILE_BYTES, RAW_UPLOAD_MAX_BYTES } from "@/lib/transcripts/audioLimits";
import { uploadFileToDriveResumable } from "@/lib/transcripts/driveResumableUpload";
import { hasMatchingTranscript } from "@/lib/transcripts/parse";
import { validateAudioFile } from "@/lib/transcripts/validateAudio";

// ── Types ────────────────────────────────────────────────────────────

type QueueStatus = "pending" | "processing" | "done" | "error";

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptResult {
  transcript: string;
  segments: Segment[];
  duration: number;
  language: string;
  chunks: number;
}

interface ChunkProgress {
  total: number;
  done: number;
  processedDuration: number;
  partialTexts: string[];
}

type DriveUploadStatus = "uploading" | "saved" | "error";

interface DriveAudioFile {
  id: string;
  name: string;
  webViewLink: string;
  size: number;
  mimeType: string;
}

interface QueueItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  /** Bajty leżą w przeglądarce (lokalny plik) — brak dla pozycji z driveFileId. */
  file?: File;
  /** Plik już jest na Dysku (wybrany z listy albo wysłany resumable uploadem) — transkrypcja dostaje referencję, nie bajty. */
  driveFileId?: string;
  status: QueueStatus;
  result?: TranscriptResult;
  error?: string;
  driveLink?: string;
  driveName?: string;
  driveStatus?: DriveUploadStatus;
  driveError?: string;
  elapsed?: number;
}

interface SSEEvent {
  type: string;
  chunks?: number;
  done?: number;
  total?: number;
  partialText?: string;
  processedDuration?: number;
  transcript?: string;
  segments?: Segment[];
  duration?: number;
  language?: string;
  message?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function fmtElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function bytesLabel(b: number): string {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function statusMsg(info: ChunkProgress, elapsed: number): string {
  if (info.total > 1) {
    if (info.done === 0) return "Przygotowuję plik...";
    return `Przetwarzam fragment ${info.done} z ${info.total}...`;
  }
  if (elapsed < 5) return "Łączę z Groq Whisper...";
  if (elapsed < 20) return "Analizuję mowę...";
  if (elapsed < 45) return "Wyciągam słowa...";
  return "Finalizuję transkrypt...";
}

// Mapuje kod HTTP na czytelny komunikat po polsku — używane jako fallback,
// gdy serwer nie zwrócił własnego pola `error` w body odpowiedzi.
function friendlyHttpError(status: number): string {
  if (status === 413) {
    return `Nagranie jest za duże (limit: ${fmtMb(RAW_UPLOAD_MAX_BYTES)} dla bezpośredniego wysyłania). Spróbuj ponownie — duże pliki powinny automatycznie iść przez Dysk.`;
  }
  if (status === 401) {
    return "Brak autoryzacji Google. Połącz konto w ustawieniach profilu.";
  }
  if (status === 408 || status === 504) {
    return "Transkrypcja trwa zbyt długo albo połączenie się urwało. Spróbuj ponownie za chwilę.";
  }
  if (status === 502 || status === 503) {
    return "Usługa transkrypcji jest chwilowo niedostępna (błąd zewnętrznego dostawcy, nie Autorise). Spróbuj ponownie za chwilę.";
  }
  return `Błąd serwera (${status}). Spróbuj ponownie.`;
}

const LANG_MAP: Record<string, string> = {
  pl: "Polski",
  en: "Angielski",
  de: "Niemiecki",
  uk: "Ukraiński",
};
const langLabel = (c: string) => LANG_MAP[c] ?? c.toUpperCase();

function timestampText(segments: Segment[]): string {
  return segments.map((s) => `[${fmtTime(s.start)}]  ${s.text}`).join("\n");
}

// Grupuje segmenty w naturalne akapity (~320 znaków) do czytelnego widoku „prozy".
function toParagraphs(segments: Segment[]): string[] {
  const paras: string[] = [];
  let buf = "";
  for (const seg of segments) {
    const t = seg.text.trim();
    if (!t) continue;
    buf = buf ? `${buf} ${t}` : t;
    if (buf.length >= 320 && /[.!?…]$/.test(t)) {
      paras.push(buf);
      buf = "";
    }
  }
  if (buf) paras.push(buf);
  return paras;
}

// ── Main ─────────────────────────────────────────────────────────────

export default function NarzedziaPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ChunkProgress>({
    total: 1,
    done: 0,
    processedDuration: 0,
    partialTexts: [],
  });
  const [elapsed, setElapsed] = useState(0);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"timestamps" | "clean">("timestamps");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Drive MP3 picker + transcript status
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveAudioFile[]>([]);
  const [driveTxtNames, setDriveTxtNames] = useState<string[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const startTimer = () => {
    elapsedRef.current = 0;
    setElapsed(0);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed((e) => e + 1);
    }, 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  useEffect(() => () => stopTimer(), []);

  const addFiles = (files: FileList | File[]) => {
    const newItems: QueueItem[] = Array.from(files).map((file) => {
      const id = `${Date.now()}-${Math.random()}`;
      if (file.size > MAX_FILE_BYTES) {
        return {
          id,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          status: "error",
          error: `Plik jest za duży (${fmtMb(file.size)}, limit: ${fmtMb(MAX_FILE_BYTES)}). Skompresuj nagranie albo podziel rozmowę na krótsze fragmenty.`,
        };
      }
      return {
        id,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        file,
        status: "pending",
      };
    });
    setQueue((prev) => {
      const updated = [...prev, ...newItems];
      if (!selectedId && updated.length > 0) setSelectedId(updated[updated.length - 1].id);
      return updated;
    });
  };

  // ── Załączanie MP3 z Dysku + status transkryptów ──
  // silent=true → odświeżenie w tle (bez spinnera/migotania, nie czyści listy przy błędzie).
  const loadDriveFiles = useCallback(async (silent = false) => {
    if (!silent) setDriveLoading(true);
    if (!silent) setDriveError(null);
    try {
      const res = await fetch("/api/google/drive/transcripts", { cache: "no-store" });
      const data = (await res.json()) as {
        success?: boolean;
        mp3?: DriveAudioFile[];
        txt?: { name: string }[];
        error?: string;
      };
      if (res.ok && data.success) {
        setDriveFiles(data.mp3 ?? []);
        setDriveTxtNames((data.txt ?? []).map((t) => t.name));
        setDriveError(null);
      } else if (!silent) {
        setDriveError(data.error ?? "Nie udało się pobrać listy z Dysku.");
        setDriveFiles([]);
        setDriveTxtNames([]);
      }
    } catch (err) {
      if (!silent) {
        setDriveError(err instanceof Error ? err.message : "Błąd połączenia z Dyskiem.");
        setDriveFiles([]);
        setDriveTxtNames([]);
      }
    } finally {
      if (!silent) setDriveLoading(false);
    }
  }, []);

  // Załaduj listę z Dysku przy wejściu + auto-odświeżanie w tle (real-time):
  // co 20 s oraz przy powrocie do karty — żeby nowo wrzucone nagrania pojawiały
  // się same, bez przeładowania strony.
  useEffect(() => {
    void loadDriveFiles();
    const id = setInterval(() => void loadDriveFiles(true), 20_000);
    const onFocus = () => void loadDriveFiles(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadDriveFiles]);

  const toggleDrivePicker = () => {
    setDrivePickerOpen((open) => {
      const next = !open;
      if (next) void loadDriveFiles();
      return next;
    });
  };

  // Nagrania bez transkryptu (do zrobienia) — liczba na badge'u przycisku.
  const pendingTranscripts = driveFiles.filter(
    (f) => !hasMatchingTranscript(f.name, driveTxtNames),
  ).length;

  // Plik już leży na Dysku — bez pobierania go do przeglądarki i ponownego
  // wysyłania (to właśnie dublowało transfer i biło w limit body Vercela dla
  // większych nagrań). Kolejka dostaje samą referencję driveFileId, backend
  // pobiera bajty bezpośrednio z Dysku.
  const pickDriveFile = useCallback(
    (f: DriveAudioFile) => {
      const id = `${Date.now()}-${Math.random()}`;
      setQueue((prev) => {
        const updated: QueueItem[] = [
          ...prev,
          {
            id,
            name: f.name,
            size: f.size,
            mimeType: f.mimeType || "audio/mpeg",
            driveFileId: f.id,
            status: "pending",
          },
        ];
        if (!selectedId) setSelectedId(id);
        return updated;
      });
      setDrivePickerOpen(false);
    },
    [selectedId],
  );

  const uploadToDrive = useCallback(async (text: string, srcFileName: string, id: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, driveStatus: "uploading" as DriveUploadStatus } : item,
      ),
    );
    try {
      const baseName = srcFileName.replace(/\.[^.]+$/, "");
      const driveFileName = `${baseName}.txt`;
      const res = await fetch("/api/google/drive/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: driveFileName, content: text }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        webViewLink?: string;
        fileName?: string;
        error?: string;
      };
      if (res.ok && data.success) {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  driveLink: data.webViewLink ?? undefined,
                  driveName: data.fileName,
                  driveStatus: "saved" as DriveUploadStatus,
                }
              : item,
          ),
        );
      } else {
        const msg = data.error ?? `Błąd serwera (${res.status})`;
        setQueue((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, driveStatus: "error" as DriveUploadStatus, driveError: msg }
              : item,
          ),
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Błąd połączenia z Drive";
      setQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, driveStatus: "error" as DriveUploadStatus, driveError: msg }
            : item,
        ),
      );
    }
  }, []);

  const processItem = useCallback(
    async (item: QueueItem) => {
      setActiveId(item.id);
      setProgress({ total: 1, done: 0, processedDuration: 0, partialTexts: [] });
      setUploadPct(null);
      setSelectedId(item.id);
      startTimer();

      setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "processing" } : q)));

      const fail = (error: string) => {
        stopTimer();
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "error", error } : q)),
        );
        setActiveId(null);
      };

      // Walidacja rzeczywistego formatu pliku (magic bytes) PRZED wysyłką —
      // tylko dla plików lokalnych, pliki już na Dysku zostały tam wgrane
      // wcześniej i przeszły tę samą walidację przy dodaniu. Gdy rzeczywista
      // zawartość nie zgadza się z rozszerzeniem (np. WebM zapisany jako
      // .mp3 — znany wcześniej przypadek), samo-naprawiamy nazwę/MIME
      // zamiast blokować działające nagranie.
      let effectiveName = item.name;
      let effectiveMimeType = item.mimeType;
      if (item.file) {
        const validation = await validateAudioFile(item.file);
        if (!validation.ok) {
          fail(validation.error ?? "Plik nie przeszedł walidacji.");
          return;
        }
        if (validation.correctedExt) {
          effectiveName = `${item.name.replace(/\.[^.]+$/, "")}.${validation.correctedExt}`;
          effectiveMimeType = validation.correctedMimeType ?? item.mimeType;
        }
      }

      let driveFileId = item.driveFileId ?? null;

      // Duży plik lokalny: najpierw resumable upload bezpośrednio do Google
      // Drive z przeglądarki (omija limit body ~4.5 MB Route Handlerów na
      // Vercelu), dopiero potem transkrypcja dostaje samą referencję.
      if (!driveFileId && item.file && item.size > RAW_UPLOAD_MAX_BYTES) {
        try {
          driveFileId = await uploadFileToDriveResumable(
            item.file,
            (pct) => setUploadPct(pct),
            effectiveName,
            effectiveMimeType,
          );
        } catch (err) {
          fail(
            err instanceof Error
              ? `Nie udało się wysłać pliku na Dysk: ${err.message}`
              : "Nie udało się wysłać pliku na Dysk.",
          );
          return;
        }
        setUploadPct(null);
      }

      let res: Response;
      try {
        if (driveFileId) {
          res = await fetch("/api/tools/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              driveFileId,
              fileName: effectiveName,
              mimeType: effectiveMimeType,
            }),
          });
        } else if (item.file) {
          const fileBuffer = await item.file.arrayBuffer();
          res = await fetch("/api/tools/transcribe", {
            method: "POST",
            headers: {
              "Content-Type": effectiveMimeType || "audio/mpeg",
              "X-File-Name": encodeURIComponent(effectiveName),
              "X-File-Mime": effectiveMimeType || "audio/mpeg",
            },
            body: fileBuffer,
          });
        } else {
          fail("Brak danych pliku do transkrypcji.");
          return;
        }
      } catch {
        fail("Błąd połączenia z serwerem. Sprawdź internet i spróbuj ponownie.");
        return;
      }

      if (!res.ok) {
        let errMsg = friendlyHttpError(res.status);
        try {
          const errBody = (await res.json()) as { error?: string };
          if (errBody.error) errMsg = errBody.error;
        } catch {
          /* body not JSON */
        }
        fail(errMsg);
        return;
      }

      if (!res.body) {
        stopTimer();
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "error", error: "Serwer nie zwrócił streamu." } : q,
          ),
        );
        setActiveId(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let gotResult = false;

      const handleSSEEvent = (event: SSEEvent) => {
        if (event.type === "start") {
          setProgress((prev) => ({ ...prev, total: event.chunks ?? 1 }));
        } else if (event.type === "chunk") {
          setProgress((prev) => ({
            total: event.total ?? prev.total,
            done: event.done ?? prev.done,
            processedDuration: event.processedDuration ?? prev.processedDuration,
            partialTexts: [...prev.partialTexts, event.partialText ?? ""],
          }));
        } else if (event.type === "done") {
          const result: TranscriptResult = {
            transcript: event.transcript ?? "",
            segments: event.segments ?? [],
            duration: event.duration ?? 0,
            language: event.language ?? "pl",
            chunks: event.chunks ?? 1,
          };
          gotResult = true;
          const currentElapsed = elapsedRef.current;
          stopTimer();
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: "done", result, elapsed: currentElapsed } : q,
            ),
          );
          // Blok 3, punkt 3.1 (2026-07-15/16, KRYTYCZNE) — zapis na Dysk musi zawierać
          // timestampy per segment, nie zlany blok tekstu. Wcześniej wysyłano
          // `result.transcript` (fullText) — dokładnie ten sam format który uczynił
          // przeładowane leady bezużytecznymi po resecie, opisany jako blocker w
          // AUTORISE_MASTER_PLAN.md. `timestampText()` już istniał i był używany w
          // podglądzie w aplikacji, ale nigdy nie trafiał do pliku faktycznie
          // zapisywanego na Dysku.
          void uploadToDrive(timestampText(result.segments), item.name, item.id);
        } else if (event.type === "error") {
          stopTimer();
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: "error", error: event.message ?? "Nieznany błąd." }
                : q,
            ),
          );
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            let event: SSEEvent;
            try {
              event = JSON.parse(line.slice(6)) as SSEEvent;
            } catch {
              continue;
            }
            handleSSEEvent(event);
          }
        }

        // Flush remaining buffer — last line that arrived without trailing \n
        if (buffer.trim() && buffer.trim().startsWith("data: ")) {
          try {
            const event = JSON.parse(buffer.trim().slice(6)) as SSEEvent;
            handleSSEEvent(event);
          } catch {
            /* malformed last frame */
          }
        }
      } catch {
        stopTimer();
        if (!gotResult) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: "error", error: "Przerwano połączenie." } : q,
            ),
          );
        }
      }
      setActiveId(null);
    },
    [uploadToDrive],
  );

  const runQueue = useCallback(async () => {
    const pending = queue.filter((q) => q.status === "pending");
    for (const item of pending) {
      await processItem(item);
    }
  }, [queue, processItem]);

  const removeItem = (id: string) => {
    setQueue((prev) => {
      const next = prev.filter((q) => q.id !== id);
      if (selectedId === id) setSelectedId(next.length > 0 ? next[next.length - 1].id : null);
      return next;
    });
  };

  const copyTranscript = async (item: QueueItem) => {
    if (!item.result) return;
    const text =
      viewMode === "timestamps" ? timestampText(item.result.segments) : item.result.transcript;
    await navigator.clipboard.writeText(text).catch(() => null);
    setCopied(item.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadItem = (item: QueueItem) => {
    if (!item.result) return;
    const base = item.name.replace(/\.[^.]+$/, "") || "transkrypt";
    const text =
      viewMode === "timestamps" ? timestampText(item.result.segments) : item.result.transcript;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBulkZip = async () => {
    const done = queue.filter((q) => q.status === "done" && q.result);
    if (done.length < 2) return;

    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const item of done) {
      if (!item.result) continue;
      const base = item.name.replace(/\.[^.]+$/, "");
      const text = timestampText(item.result.segments);
      zip.file(`${base}.txt`, text);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transkrypty_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const selectedItem = queue.find((q) => q.id === selectedId) ?? null;
  const activeItem = queue.find((q) => q.id === activeId) ?? null;
  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const doneCount = queue.filter((q) => q.status === "done").length;
  const isRunning = !!activeId;

  return (
    <div
      className="responsive-split"
      style={{
        display: "flex",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
      `}</style>

      {/* ── Lewa kolumna 2/5 ── */}
      <div
        style={{
          flex: "0 0 38%",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
            Transkrypcja
          </span>
        </div>

        <AudioRecorder />

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 20px" }}>
          {/* Queue */}
          {queue.length > 0 && (
            <Panel style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--border)" }}>
                <SectionLabel paddingX={0}>
                  Kolejka ({queue.length} {queue.length === 1 ? "plik" : "pliki"})
                </SectionLabel>
              </div>
              <div>
                {queue.map((item, i) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 14px",
                      borderBottom: i < queue.length - 1 ? "1px solid var(--border)" : "none",
                      cursor: "pointer",
                      background: selectedId === item.id ? "var(--bg-active)" : "transparent",
                      transition: "background 0.1s",
                    }}
                  >
                    <StatusIcon status={item.status} isActive={item.id === activeId} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>
                        {bytesLabel(item.size)}
                        {item.status === "processing" && activeId === item.id && (
                          <span> · {fmtElapsed(elapsed)}</span>
                        )}
                        {item.status === "done" && item.result && (
                          <span>
                            {" "}
                            · {fmtTime(item.result.duration)} · {langLabel(item.result.language)}
                          </span>
                        )}
                        {item.status === "done" && item.driveStatus === "uploading" && (
                          <span style={{ color: "var(--text-tertiary)" }}> · Drive...</span>
                        )}
                        {item.status === "done" && item.driveStatus === "saved" && (
                          <span style={{ color: "var(--success-text)", fontWeight: 600 }}>
                            {" "}
                            · Drive ✓
                          </span>
                        )}
                        {item.status === "done" && item.driveStatus === "error" && (
                          <span style={{ color: "var(--error)" }} title={item.driveError}>
                            {" "}
                            · Błąd Drive
                          </span>
                        )}
                        {item.status === "error" && (
                          <span style={{ color: "var(--error)" }}> · Błąd</span>
                        )}
                      </div>
                    </div>
                    {item.status !== "processing" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-tertiary)",
                          padding: 2,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Bottom actions */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              style={{ flex: 1 }}
            >
              <Upload size={13} style={{ marginRight: 6 }} />
              Dodaj pliki
            </Button>
            <div style={{ position: "relative", flex: 1 }}>
              <Button variant="secondary" onClick={toggleDrivePicker} style={{ width: "100%" }}>
                <Cloud size={13} style={{ marginRight: 6 }} />
                Wybierz z Dysku
                {pendingTranscripts > 0 && (
                  <span
                    style={{
                      marginLeft: 6,
                      padding: "1px 7px",
                      borderRadius: 99,
                      background: "var(--warning-bg)",
                      border: "1px solid var(--warning-border)",
                      color: "var(--warning)",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {pendingTranscripts}
                  </span>
                )}
                <ChevronDown
                  size={12}
                  style={{
                    marginLeft: 4,
                    transform: drivePickerOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
              </Button>
              {drivePickerOpen && (
                <DrivePicker
                  files={driveFiles}
                  txtNames={driveTxtNames}
                  loading={driveLoading}
                  error={driveError}
                  downloadingId={null}
                  onPick={pickDriveFile}
                  onClose={() => setDrivePickerOpen(false)}
                  onRefresh={() => void loadDriveFiles()}
                />
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.m4a,.wav,.ogg,.webm,.flac"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {pendingCount > 0 && (
            <Button
              variant="primary"
              onClick={runQueue}
              loading={isRunning}
              style={{ width: "100%" }}
            >
              {isRunning
                ? "Przetwarzam..."
                : `Transkrybuj ${pendingCount === 1 ? "1 plik" : `${pendingCount} pliki`}`}
            </Button>
          )}
          {doneCount >= 2 && (
            <Button
              variant="ghost"
              onClick={downloadBulkZip}
              style={{ width: "100%", fontSize: 12 }}
            >
              <Download size={12} style={{ marginRight: 6 }} />
              Pobierz wszystkie jako ZIP ({doneCount})
            </Button>
          )}
        </div>
      </div>

      {/* ── Prawa kolumna 3/5 ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {selectedItem
              ? selectedItem.name
              : queue.length === 0
                ? "Brak plików w kolejce"
                : "Wybierz plik z kolejki"}
          </span>
          {selectedItem?.status === "done" && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {selectedItem.driveLink && (
                <a
                  href={selectedItem.driveLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    borderRadius: 6,
                    textDecoration: "none",
                    background: "var(--success-bg)",
                    border: "1px solid var(--success-border)",
                    fontSize: 11,
                    color: "var(--success-text)",
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={10} />
                  Drive
                </a>
              )}
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                  padding: 3,
                }}
              >
                {(["timestamps", "clean"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 5,
                      border: "none",
                      background: viewMode === mode ? "var(--accent)" : "transparent",
                      color: viewMode === mode ? "#fff" : "var(--text-secondary)",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.1s",
                    }}
                  >
                    {mode === "timestamps" ? "⏱" : "☰"}
                  </button>
                ))}
              </div>
              <Button variant="secondary" size="sm" onClick={() => copyTranscript(selectedItem)}>
                {copied === selectedItem.id ? <Check size={12} /> : <Copy size={12} />}
                {copied === selectedItem.id ? "Skopiowano" : "Kopiuj"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => downloadItem(selectedItem)}>
                <Download size={12} />
                .txt
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Empty — drop zone */}
          {queue.length === 0 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                margin: 20,
                border: `2px dashed ${isDragOver ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "var(--radius-lg)",
                cursor: "pointer",
                background: isDragOver ? "var(--bg-active)" : "transparent",
                transition: "all 0.15s",
                userSelect: "none",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: isDragOver ? "var(--accent-muted)" : "var(--bg-hover)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                <Upload
                  size={24}
                  color={isDragOver ? "var(--accent)" : "var(--text-tertiary)"}
                  strokeWidth={1.5}
                />
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: isDragOver ? "var(--accent)" : "var(--text-primary)",
                    marginBottom: 6,
                  }}
                >
                  {isDragOver
                    ? "Upuść pliki, aby dodać do kolejki"
                    : "Przeciągnij nagrania lub kliknij"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  MP3 · M4A · WAV · FLAC · do 100 MB · wiele plików naraz
                </div>
              </div>
            </div>
          )}

          {/* Drop overlay when queue exists */}
          {queue.length > 0 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
              style={{
                position: "relative",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {isDragOver && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 10,
                    background: "var(--bg-active)",
                    border: "2px dashed var(--accent)",
                    borderRadius: "var(--radius-md)",
                    margin: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
                    Dodaj do kolejki
                  </span>
                </div>
              )}

              {/* Processing state */}
              {selectedItem?.status === "processing" && activeItem?.id === selectedItem.id && (
                <div style={{ padding: "24px 20px", flexShrink: 0 }}>
                  <Panel style={{ padding: 16 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: "var(--accent)",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Loader2
                          size={18}
                          color="#fff"
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            marginBottom: 3,
                          }}
                        >
                          {uploadPct !== null
                            ? `Wysyłam na Dysk: ${uploadPct}%`
                            : statusMsg(progress, elapsed)}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <FileAudio size={10} />
                          <span>{selectedItem.name}</span>
                          <span>· {bytesLabel(selectedItem.size)}</span>
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 20,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {fmtElapsed(elapsed)}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div
                      style={{
                        height: 4,
                        background: "var(--border)",
                        borderRadius: 2,
                        overflow: "hidden",
                        marginBottom: 8,
                      }}
                    >
                      {uploadPct !== null ? (
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 2,
                            background: "var(--accent)",
                            width: `${uploadPct}%`,
                            transition: "width 0.2s ease",
                          }}
                        />
                      ) : progress.total > 1 ? (
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 2,
                            background: "var(--accent)",
                            width: `${Math.round((progress.done / progress.total) * 100)}%`,
                            transition: "width 0.4s ease",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 2,
                            background: `linear-gradient(90deg, transparent, var(--accent), transparent)`,
                            width: "30%",
                            animation: "pulse 1.4s ease-in-out infinite",
                          }}
                        />
                      )}
                    </div>

                    {progress.total > 1 && (
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        Fragment {progress.done}/{progress.total}
                        {progress.processedDuration > 0 &&
                          ` · ${fmtTime(progress.processedDuration)} przetworzone`}
                      </div>
                    )}

                    {/* Live preview */}
                    {progress.partialTexts.length > 0 && (
                      <div
                        style={{
                          marginTop: 14,
                          padding: "12px 14px",
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "var(--text-tertiary)",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            marginBottom: 8,
                          }}
                        >
                          Podgląd na żywo
                        </div>
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--text-primary)",
                            lineHeight: 1.7,
                            margin: 0,
                          }}
                        >
                          {progress.partialTexts.join(" ")}
                          <span
                            style={{
                              display: "inline-block",
                              width: 2,
                              height: 12,
                              background: "var(--accent)",
                              marginLeft: 3,
                              verticalAlign: "middle",
                              animation: "blink 1s step-end infinite",
                            }}
                          />
                        </p>
                      </div>
                    )}
                  </Panel>
                </div>
              )}

              {/* Done — transcript */}
              {selectedItem?.status === "done" && selectedItem.result && (
                <div
                  style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}
                >
                  {/* Stats strip */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "10px 20px",
                      borderBottom: "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                  >
                    {[
                      { value: fmtTime(selectedItem.result.duration), label: "Czas" },
                      { value: selectedItem.result.segments.length.toString(), label: "Segmenty" },
                      { value: langLabel(selectedItem.result.language), label: "Język" },
                      ...(selectedItem.result.chunks > 1
                        ? [{ value: `${selectedItem.result.chunks}×`, label: "Fragmenty" }]
                        : []),
                    ].map((s) => (
                      <div key={s.label} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        <span
                          style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}
                        >
                          {s.value}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          {s.label}
                        </span>
                      </div>
                    ))}
                    <div
                      style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}
                    >
                      {/* Drive upload status */}
                      {selectedItem.driveStatus === "uploading" && (
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 5 }}
                          title="Zapisuję na Google Drive..."
                        >
                          <Loader2
                            size={11}
                            color="var(--text-tertiary)"
                            style={{ animation: "spin 1s linear infinite" }}
                          />
                          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                            Drive...
                          </span>
                        </div>
                      )}
                      {selectedItem.driveStatus === "saved" && (
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 5 }}
                          title={`Zapisano: ${selectedItem.driveName ?? ""}`}
                        >
                          <CheckCircle2 size={11} color="var(--success-text)" />
                          <span
                            style={{ fontSize: 11, color: "var(--success-text)", fontWeight: 600 }}
                          >
                            Drive ✓
                          </span>
                        </div>
                      )}
                      {selectedItem.driveStatus === "error" && (
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 5 }}
                          title={selectedItem.driveError ?? "Błąd zapisu na Drive"}
                        >
                          <AlertCircle size={11} color="var(--error)" />
                          <span style={{ fontSize: 11, color: "var(--error)", fontWeight: 500 }}>
                            Błąd Drive
                          </span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <CheckCircle2 size={12} color="var(--success-text)" />
                        <span
                          style={{ fontSize: 11, color: "var(--success-text)", fontWeight: 600 }}
                        >
                          Gotowe
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Drive error notice (non-blocking) */}
                  {selectedItem.driveStatus === "error" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 20px",
                        flexShrink: 0,
                        background: "var(--error-bg)",
                        borderBottom: "1px solid rgba(255,69,58,0.15)",
                      }}
                    >
                      <AlertCircle size={12} color="var(--error)" />
                      <span style={{ fontSize: 11, color: "var(--error)", flex: 1 }}>
                        Zapis na Google Drive nie powiódł się:{" "}
                        {selectedItem.driveError ?? "nieznany błąd"}
                      </span>
                    </div>
                  )}

                  {/* Transcript body */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 28px" }}>
                    {viewMode === "timestamps" ? (
                      <div style={{ maxWidth: 780, margin: "0 auto", paddingTop: 14 }}>
                        {selectedItem.result.segments.map((seg, i) => (
                          <SegmentRow key={i} time={fmtTime(seg.start)} text={seg.text} />
                        ))}
                      </div>
                    ) : (
                      <article
                        style={{
                          maxWidth: 720,
                          margin: "0 auto",
                          paddingTop: 22,
                          fontFamily: "var(--font-sans)",
                          fontSize: 15.5,
                          lineHeight: 1.85,
                          color: "var(--text-primary)",
                          letterSpacing: "-0.003em",
                        }}
                      >
                        {toParagraphs(selectedItem.result.segments).map((p, i) => (
                          <p key={i} style={{ margin: "0 0 18px" }}>
                            {p}
                          </p>
                        ))}
                      </article>
                    )}
                  </div>
                </div>
              )}

              {/* Error state */}
              {selectedItem?.status === "error" && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 14,
                    padding: 20,
                  }}
                >
                  <AlertCircle size={32} color="var(--error)" />
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginBottom: 8,
                      }}
                    >
                      Transkrypcja nie powiodła się
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--error)",
                        fontFamily: "var(--font-mono)",
                        padding: "8px 14px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--error-bg)",
                        border: "1px solid rgba(255,69,58,0.2)",
                      }}
                    >
                      {selectedItem.error}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQueue((prev) =>
                        prev.map((q) =>
                          q.id === selectedItem.id
                            ? { ...q, status: "pending", error: undefined }
                            : q,
                        ),
                      );
                    }}
                  >
                    Spróbuj ponownie
                  </Button>
                </div>
              )}

              {/* Pending — waiting */}
              {selectedItem?.status === "pending" && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    padding: 20,
                  }}
                >
                  <Clock size={32} color="var(--text-tertiary)" />
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text-secondary)",
                        marginBottom: 4,
                      }}
                    >
                      {selectedItem.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                      Oczekuje na transkrypcję · {bytesLabel(selectedItem.size)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Drive MP3 picker dropdown ──────────────────────────────────────────

function DrivePicker({
  files,
  txtNames,
  loading,
  error,
  downloadingId,
  onPick,
  onClose,
  onRefresh,
}: {
  files: DriveAudioFile[];
  txtNames: string[];
  loading: boolean;
  error: string | null;
  downloadingId: string | null;
  onPick: (f: DriveAudioFile) => void;
  onClose: () => void;
  onRefresh: () => void;
}) {
  // Status per nagranie + sortowanie: najpierw bez transkryptu (do zrobienia).
  const withStatus = files
    .map((f) => ({ file: f, done: hasMatchingTranscript(f.name, txtNames) }))
    .sort((a, b) => Number(a.done) - Number(b.done));
  const todoCount = withStatus.filter((x) => !x.done).length;

  return (
    <>
      {/* click-outside */}
      <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={onClose} />
      <div
        style={{
          position: "absolute",
          bottom: "calc(100% + 6px)",
          right: 0,
          zIndex: 41,
          width: 340,
          maxWidth: "calc(100vw - 48px)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-menu)",
          overflow: "hidden",
          maxHeight: 420,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "9px 12px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Cloud size={12} color="var(--text-tertiary)" />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Nagrania MP3 z Dysku
          </span>
          <div style={{ flex: 1 }} />
          {!loading && !error && files.length > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
                padding: "2px 8px",
                borderRadius: 99,
                background: todoCount > 0 ? "var(--warning-bg)" : "var(--success-bg)",
                border: `1px solid ${todoCount > 0 ? "var(--warning-border)" : "var(--success-border)"}`,
                color: todoCount > 0 ? "var(--warning)" : "var(--success-text)",
              }}
            >
              {todoCount > 0 ? `${todoCount} do transkrypcji` : "wszystko gotowe"}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            title="Odśwież listę z Dysku"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: 6,
              flexShrink: 0,
              background: "none",
              border: "1px solid var(--border)",
              cursor: "pointer",
              color: "var(--text-tertiary)",
            }}
          >
            <RefreshCw
              size={11}
              style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}
            />
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: 2 }}>
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 12px",
                color: "var(--text-tertiary)",
              }}
            >
              <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 12, fontFamily: "var(--font-sans)" }}>
                Ładowanie z Dysku…
              </span>
            </div>
          ) : error ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "12px",
                color: "var(--error)",
              }}
            >
              <AlertCircle size={13} />
              <span style={{ fontSize: 12, fontFamily: "var(--font-sans)" }}>{error}</span>
            </div>
          ) : files.length === 0 ? (
            <div
              style={{
                padding: "14px 12px",
                textAlign: "center",
                fontSize: 12,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Brak plików MP3 w folderze Dysku
            </div>
          ) : (
            withStatus.map(({ file, done }) => (
              <ClientFileCard
                key={file.id}
                fileName={file.name}
                modifiedTime={undefined}
                size={file.size}
                status={done ? "done" : "todo"}
                busy={downloadingId === file.id}
                disabled={downloadingId !== null}
                onClick={() => onPick(file)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ── Segment row (timestamps view) ──────────────────────────────────────

function SegmentRow({ time, text }: { time: string; text: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        padding: "9px 12px",
        borderRadius: "var(--radius-sm)",
        background: hovered ? "var(--bg-hover)" : "transparent",
        transition: "background 120ms",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          marginTop: 2,
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          fontWeight: 600,
          color: "var(--accent)",
          background: "var(--accent-muted)",
          padding: "2px 8px",
          borderRadius: 99,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
        }}
      >
        {time}
      </span>
      <span
        style={{
          fontSize: 14.5,
          lineHeight: 1.72,
          color: "var(--text-primary)",
          letterSpacing: "-0.003em",
        }}
      >
        {text}
      </span>
    </div>
  );
}

// ── Status icon ───────────────────────────────────────────────────────

function StatusIcon({ status, isActive }: { status: QueueStatus; isActive: boolean }) {
  if (status === "processing" && isActive) {
    return (
      <Loader2
        size={14}
        color="var(--accent)"
        style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
      />
    );
  }
  if (status === "done") {
    return <CheckCircle2 size={14} color="var(--success-text)" style={{ flexShrink: 0 }} />;
  }
  if (status === "error") {
    return <AlertCircle size={14} color="var(--error)" style={{ flexShrink: 0 }} />;
  }
  return (
    <div
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "1.5px solid var(--border)",
        flexShrink: 0,
      }}
    />
  );
}
