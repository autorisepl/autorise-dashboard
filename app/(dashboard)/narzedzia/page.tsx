"use client";

import {
  AlertCircle,
  Check,
  CheckCircle,
  Cloud,
  CloudOff,
  Copy,
  Download,
  ExternalLink,
  FileAudio,
  Loader2,
  Mic,
  RotateCcw,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────
type PageState = "idle" | "processing" | "done" | "error";
type ViewMode = "timestamps" | "clean";
type DriveState = "idle" | "uploading" | "saved" | "skip" | "error" | "scope";

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
  fileName?: string;
  fileSize?: number;
}

// ── Token shortcuts ────────────────────────────────────────────────────
const f = { system: "var(--font-system)", mono: "var(--font-mono)" };
const ACCENT = "#1a56ff";

// ── Helpers ────────────────────────────────────────────────────────────
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

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function bytesLabel(b: number): string {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const LANG_MAP: Record<string, string> = {
  pl: "Polski",
  en: "Angielski",
  de: "Niemiecki",
  fr: "Francuski",
  uk: "Ukraiński",
  ru: "Rosyjski",
};
const langLabel = (c: string) => LANG_MAP[c] ?? c.toUpperCase();

function timestampText(segments: Segment[]): string {
  return segments.map((s) => `[${fmtTime(s.start)}]  ${s.text}`).join("\n");
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

// ── Main ──────────────────────────────────────────────────────────────
export default function NarzedziaPage() {
  const [state, setState] = useState<PageState>("idle");
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("timestamps");
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState<ChunkProgress>({
    total: 1,
    done: 0,
    processedDuration: 0,
    partialTexts: [],
  });
  const [driveStatus, setDriveStatus] = useState<DriveState>("idle");
  const [driveLink, setDriveLink] = useState<string | null>(null);
  const [driveName, setDriveName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gotResultRef = useRef(false);

  const startTimer = () => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  useEffect(() => () => stopTimer(), []);

  const uploadToDrive = useCallback(async (text: string, srcFileName: string) => {
    setDriveStatus("uploading");
    try {
      const baseName = srcFileName.replace(/\.[^.]+$/, "");
      const today = new Date().toISOString().slice(0, 10);
      const driveFileName = `${baseName}_${today}.txt`;

      const res = await fetch("/api/google/drive/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: driveFileName, content: text }),
      });

      if (res.status === 401) {
        setDriveStatus("skip");
        return;
      }
      if (res.status === 403) {
        setDriveStatus("scope");
        return;
      }

      const data = (await res.json()) as {
        success?: boolean;
        fileName?: string;
        webViewLink?: string;
      };
      if (res.ok && data.success) {
        setDriveStatus("saved");
        setDriveLink(data.webViewLink ?? null);
        setDriveName(data.fileName ?? driveFileName);
      } else {
        setDriveStatus("error");
      }
    } catch {
      setDriveStatus("error");
    }
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setFileSize(file.size);
      setState("processing");
      setResult(null);
      setError("");
      setProgress({ total: 1, done: 0, processedDuration: 0, partialTexts: [] });
      setDriveStatus("idle");
      setDriveLink(null);
      setDriveName(null);
      gotResultRef.current = false;
      startTimer();

      const form = new FormData();
      form.append("audio", file);

      let res: Response;
      try {
        res = await fetch("/api/tools/transcribe", { method: "POST", body: form });
      } catch {
        stopTimer();
        setError("Błąd połączenia z serwerem.");
        setState("error");
        return;
      }

      if (!res.body) {
        stopTimer();
        setError("Serwer nie zwrócił streamu.");
        setState("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              const resultData: TranscriptResult = {
                transcript: event.transcript ?? "",
                segments: event.segments ?? [],
                duration: event.duration ?? 0,
                language: event.language ?? "pl",
                chunks: event.chunks ?? 1,
              };
              gotResultRef.current = true;
              stopTimer();
              setResult(resultData);
              setState("done");
              void uploadToDrive(resultData.transcript, file.name);
            } else if (event.type === "error") {
              stopTimer();
              setError(event.message ?? "Nieznany błąd.");
              setState("error");
            }
          }
        }
      } catch {
        stopTimer();
        if (!gotResultRef.current) {
          setError("Przerwano połączenie z serwerem.");
          setState("error");
        }
      }
    },
    [uploadToDrive],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const copy = async () => {
    if (!result) return;
    const text = viewMode === "timestamps" ? timestampText(result.segments) : result.transcript;
    await navigator.clipboard.writeText(text).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    if (!result) return;
    const base = fileName.replace(/\.[^.]+$/, "") || "transkrypt";
    const text = viewMode === "timestamps" ? timestampText(result.segments) : result.transcript;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}${viewMode === "timestamps" ? "_timestamps" : ""}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    stopTimer();
    setState("idle");
    setResult(null);
    setError("");
    setFileName("");
    setFileSize(0);
    setElapsed(0);
    setProgress({ total: 1, done: 0, processedDuration: 0, partialTexts: [] });
    setDriveStatus("idle");
    setDriveLink(null);
    setDriveName(null);
    gotResultRef.current = false;
  };

  const pct = progress.total > 1 ? Math.round((progress.done / progress.total) * 100) : null;
  const previewText = progress.partialTexts.join(" ");

  return (
    <div
      style={{
        padding: "28px 36px 56px",
        maxWidth: 920,
        margin: "0 auto",
        boxSizing: "border-box",
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes slide { 0% { transform: translateX(-200%); } 100% { transform: translateX(400%); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontFamily: f.mono,
            fontSize: 10,
            color: "var(--text-tertiary)",
            letterSpacing: "0.08em",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>Narzędzia</span>
          <span style={{ opacity: 0.35 }}>/</span>
          <span>Transkrypcja</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                flexShrink: 0,
                background: "linear-gradient(135deg, #1a56ff 0%, #4b7bff 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 22px rgba(26,86,255,0.28)",
              }}
            >
              <Mic size={21} color="#fff" strokeWidth={1.8} />
            </div>
            <div>
              <h1
                style={{
                  fontFamily: f.system,
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.04em",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                Transkrypcja Nagrań
              </h1>
              <p
                style={{
                  fontFamily: f.system,
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                  margin: "5px 0 0",
                  lineHeight: 1.4,
                }}
              >
                Nagranie rozmowy sprzedażowej → transkrypt z timestampami
              </p>
            </div>
          </div>

          {(state === "done" || state === "error") && (
            <button
              onClick={reset}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 16px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 9,
                fontFamily: f.system,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <RotateCcw size={12} />
              Nowe nagranie
            </button>
          )}
        </div>
      </div>

      {/* ── Card ── */}
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          boxShadow: "0 2px 20px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Card top bar */}
        <div
          style={{
            padding: "11px 22px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                flexShrink: 0,
                background:
                  state === "processing"
                    ? "#ff9500"
                    : state === "done"
                      ? "#34c759"
                      : state === "error"
                        ? "#ff3b30"
                        : ACCENT,
                boxShadow: state === "processing" ? "0 0 6px rgba(255,149,0,0.6)" : "none",
                transition: "background 0.3s, box-shadow 0.3s",
              }}
            />
            <span
              style={{
                fontFamily: f.mono,
                fontSize: 11,
                color: "var(--text-secondary)",
                letterSpacing: "0.02em",
              }}
            >
              Groq · Whisper large-v3 · auto-chunking
            </span>
          </div>

          {/* Drive status badges */}
          {driveStatus === "uploading" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Loader2 size={11} color="#ff9500" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontFamily: f.mono, fontSize: 10, color: "var(--text-tertiary)" }}>
                Zapisuję w Drive...
              </span>
            </div>
          )}
          {driveStatus === "saved" && driveLink && (
            <a
              href={driveLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 6,
                textDecoration: "none",
                background: "rgba(52,199,89,0.07)",
                border: "1px solid rgba(52,199,89,0.2)",
                animation: "fadeUp 0.3s ease-out",
              }}
            >
              <Cloud size={11} color="#34c759" />
              <span
                style={{
                  fontFamily: f.mono,
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#34c759",
                  maxWidth: 200,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {driveName ?? "Zapisano w Drive"}
              </span>
              <ExternalLink size={9} color="#34c759" />
            </a>
          )}
          {driveStatus === "scope" && (
            <a
              href="/profil"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 6,
                textDecoration: "none",
                background: "rgba(255,149,0,0.06)",
                border: "1px solid rgba(255,149,0,0.2)",
              }}
            >
              <CloudOff size={11} color="#ff9500" />
              <span style={{ fontFamily: f.mono, fontSize: 10, color: "#ff9500" }}>
                Połącz Drive w Profilu ↗
              </span>
            </a>
          )}
          {driveStatus === "error" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CloudOff size={11} color="var(--text-tertiary)" />
              <span style={{ fontFamily: f.mono, fontSize: 10, color: "var(--text-tertiary)" }}>
                Drive niedostępny
              </span>
            </div>
          )}
        </div>

        {/* ── IDLE ── */}
        {state === "idle" && (
          <div style={{ padding: "28px 24px 24px" }}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? ACCENT : "var(--border)"}`,
                borderRadius: 14,
                minHeight: 280,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 18,
                cursor: "pointer",
                padding: "40px 28px",
                background: isDragOver ? "rgba(26,86,255,0.03)" : "var(--bg)",
                transition: "border-color 0.15s, background 0.15s",
                userSelect: "none" as const,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: isDragOver ? "rgba(26,86,255,0.10)" : "rgba(0,0,0,0.04)",
                  border: `1.5px solid ${isDragOver ? "rgba(26,86,255,0.3)" : "var(--border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                <Upload
                  size={26}
                  color={isDragOver ? ACCENT : "var(--text-tertiary)"}
                  strokeWidth={1.5}
                />
              </div>

              <div style={{ textAlign: "center", maxWidth: 400 }}>
                <div
                  style={{
                    fontFamily: f.system,
                    fontSize: 16,
                    fontWeight: 700,
                    color: isDragOver ? ACCENT : "var(--text-primary)",
                    marginBottom: 8,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {isDragOver ? "Upuść, aby transkrybować" : "Przeciągnij nagranie lub kliknij"}
                </div>
                <div
                  style={{
                    fontFamily: f.system,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  MP3 · M4A · WAV · FLAC · OGG · WEBM
                </div>
                <div
                  style={{
                    fontFamily: f.mono,
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    marginTop: 4,
                    letterSpacing: "0.02em",
                  }}
                >
                  Maks. 100 MB · Pliki &gt;22 MB dzielone automatycznie
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                style={{
                  padding: "10px 30px",
                  background: ACCENT,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontFamily: f.system,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 18px rgba(26,86,255,0.30)",
                }}
              >
                Wybierz plik
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.m4a,.wav,.ogg,.webm,.flac"
                style={{ display: "none" }}
                onChange={onFileChange}
              />
            </div>

            {/* Info strip */}
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {[
                { label: "Prędkość", value: "~50× realtime" },
                { label: "Model", value: "Whisper large-v3" },
                { label: "Auto-zapis", value: "Google Drive" },
                { label: "Duże pliki", value: "Auto-chunking" },
              ].map((item, i, arr) => (
                <div
                  key={item.label}
                  style={{
                    padding: "12px 16px",
                    borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                    background: "var(--bg)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: f.mono,
                      fontSize: 9,
                      fontWeight: 700,
                      color: ACCENT,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase" as const,
                      marginBottom: 4,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontFamily: f.system,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {state === "processing" && (
          <div style={{ padding: "28px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
              <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: ACCENT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Loader2
                    size={22}
                    color="#fff"
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                </div>
                <div
                  style={{
                    position: "absolute",
                    inset: -6,
                    borderRadius: "50%",
                    border: "2.5px solid transparent",
                    borderTopColor: "rgba(26,86,255,0.35)",
                    animation: "spin 1.6s linear infinite",
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: f.system,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: 5,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {statusMsg(progress, elapsed)}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: f.mono,
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  <FileAudio size={11} />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    {fileName}
                  </span>
                  <span
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      padding: "1px 6px",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    {bytesLabel(fileSize)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  fontFamily: f.mono,
                  fontSize: 28,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.04em",
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtElapsed(elapsed)}
              </div>
            </div>

            <div
              style={{
                height: 5,
                background: "var(--border)",
                borderRadius: 3,
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              {pct !== null ? (
                <div
                  style={{
                    height: "100%",
                    borderRadius: 3,
                    transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, rgba(26,86,255,0.6) 0%, ${ACCENT} 100%)`,
                  }}
                />
              ) : (
                <div
                  style={{
                    height: "100%",
                    borderRadius: 3,
                    width: "30%",
                    background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
                    animation: "slide 1.6s ease-in-out infinite",
                  }}
                />
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 20,
                fontFamily: f.mono,
                fontSize: 11,
              }}
            >
              {pct !== null && (
                <span
                  style={{
                    background: ACCENT,
                    color: "#fff",
                    padding: "2px 9px",
                    borderRadius: 99,
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  {pct}%
                </span>
              )}
              {progress.total > 1 && (
                <span style={{ color: "var(--text-secondary)" }}>
                  Fragment {progress.done}/{progress.total}
                </span>
              )}
              {progress.processedDuration > 0 && (
                <span style={{ color: "var(--text-secondary)" }}>
                  {fmtTime(progress.processedDuration)} przetworzone
                </span>
              )}
              <span style={{ marginLeft: "auto", color: "var(--text-tertiary)" }}>
                ~50× realtime
              </span>
            </div>

            <div
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "14px 18px",
                minHeight: 90,
              }}
            >
              <div
                style={{
                  fontFamily: f.mono,
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase" as const,
                  marginBottom: 10,
                }}
              >
                ▸ Podgląd na żywo
              </div>
              {previewText ? (
                <p
                  style={{
                    fontFamily: f.system,
                    fontSize: 13,
                    color: "var(--text-primary)",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {previewText}
                  <span
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: 14,
                      background: ACCENT,
                      marginLeft: 3,
                      verticalAlign: "middle",
                      animation: "blink 1s step-end infinite",
                    }}
                  />
                </p>
              ) : (
                <>
                  <div
                    style={{
                      height: 13,
                      background: "rgba(0,0,0,0.05)",
                      borderRadius: 4,
                      width: "78%",
                      marginBottom: 8,
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                  <div
                    style={{
                      height: 13,
                      background: "rgba(0,0,0,0.05)",
                      borderRadius: 4,
                      width: "55%",
                      animation: "pulse 1.5s ease-in-out infinite 0.3s",
                    }}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {state === "done" && result && (
          <div style={{ animation: "fadeUp 0.25s ease-out" }}>
            {/* Stats */}
            <div
              style={{
                padding: "16px 22px",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg)",
              }}
            >
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[
                  { value: fmtTime(result.duration), label: "Czas nagrania", accent: true },
                  { value: result.segments.length.toString(), label: "Segmenty", accent: false },
                  {
                    value: `≈${wordCount(result.transcript).toLocaleString("pl")}`,
                    label: "Słów",
                    accent: false,
                  },
                  { value: langLabel(result.language), label: "Język", accent: false },
                  ...(result.chunks > 1
                    ? [{ value: `${result.chunks}×`, label: "Fragmenty", accent: false }]
                    : []),
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      flex: 1,
                      background: s.accent ? ACCENT : "var(--bg-elevated)",
                      border: `1px solid ${s.accent ? ACCENT : "var(--border)"}`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: f.mono,
                        fontSize: 20,
                        fontWeight: 800,
                        lineHeight: 1,
                        letterSpacing: "-0.03em",
                        marginBottom: 5,
                        color: s.accent ? "#fff" : "var(--text-primary)",
                      }}
                    >
                      {s.value}
                    </div>
                    <div
                      style={{
                        fontFamily: f.system,
                        fontSize: 11,
                        fontWeight: 500,
                        color: s.accent ? "rgba(255,255,255,0.65)" : "var(--text-secondary)",
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <CheckCircle size={12} color="#34c759" />
                  <span
                    style={{ fontFamily: f.mono, fontSize: 11, color: "#34c759", fontWeight: 600 }}
                  >
                    Transkrypt gotowy
                  </span>
                </div>
                <span style={{ fontFamily: f.mono, fontSize: 11, color: "var(--text-tertiary)" }}>
                  ·
                </span>
                <span style={{ fontFamily: f.mono, fontSize: 11, color: "var(--text-tertiary)" }}>
                  {fileName}
                  {fileSize > 0 && ` · ${bytesLabel(fileSize)}`}
                  {result.chunks > 1 && ` · ${result.chunks} fragmenty`}
                </span>
              </div>
            </div>

            {/* Toolbar */}
            <div
              style={{
                padding: "10px 22px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "3px",
                }}
              >
                {(["timestamps", "clean"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 6,
                      border: "none",
                      background: viewMode === mode ? ACCENT : "transparent",
                      color: viewMode === mode ? "#fff" : "var(--text-secondary)",
                      fontFamily: f.system,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                  >
                    {mode === "timestamps" ? "⏱ Timestamps" : "☰ Czysty tekst"}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 7 }}>
                <button
                  onClick={copy}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    background: copied ? "rgba(52,199,89,0.08)" : ACCENT,
                    color: copied ? "#34c759" : "#fff",
                    border: copied ? "1px solid rgba(52,199,89,0.3)" : "none",
                    borderRadius: 8,
                    fontFamily: f.system,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    boxShadow: copied ? "none" : "0 1px 6px rgba(26,86,255,0.25)",
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Skopiowano!" : "Kopiuj"}
                </button>
                <button
                  onClick={download}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontFamily: f.system,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  <Download size={12} />
                  .txt
                </button>
              </div>
            </div>

            {/* Transcript body */}
            <div style={{ padding: "0 22px", maxHeight: 520, overflowY: "auto" }}>
              {viewMode === "timestamps" ? (
                <div>
                  {result.segments.map((seg, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "76px 1fr",
                        gap: 20,
                        padding: "9px 0",
                        borderBottom: "1px solid var(--border)",
                        alignItems: "baseline",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: f.mono,
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: ACCENT,
                          flexShrink: 0,
                          userSelect: "none",
                        }}
                      >
                        {fmtTime(seg.start)}
                      </span>
                      <span
                        style={{
                          fontFamily: f.system,
                          fontSize: 14,
                          lineHeight: 1.65,
                          color: "var(--text-primary)",
                          fontWeight: 400,
                        }}
                      >
                        {seg.text}
                      </span>
                    </div>
                  ))}
                  <div style={{ height: 20 }} />
                </div>
              ) : (
                <textarea
                  readOnly
                  value={result.transcript}
                  style={{
                    width: "100%",
                    minHeight: 400,
                    padding: "20px 0",
                    background: "transparent",
                    border: "none",
                    fontFamily: f.system,
                    fontSize: 14,
                    color: "var(--text-primary)",
                    lineHeight: 1.75,
                    resize: "vertical" as const,
                    outline: "none",
                    boxSizing: "border-box" as const,
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {state === "error" && (
          <div
            style={{
              padding: "56px 28px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 18,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(255,59,48,0.06)",
                border: "1px solid rgba(255,59,48,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertCircle size={24} color="#ff3b30" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: f.system,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 10,
                  letterSpacing: "-0.02em",
                }}
              >
                Nie udało się przetworzyć nagrania
              </div>
              <div
                style={{
                  fontFamily: f.mono,
                  fontSize: 12,
                  color: "#ff3b30",
                  lineHeight: 1.6,
                  maxWidth: 480,
                  background: "rgba(255,59,48,0.04)",
                  border: "1px solid rgba(255,59,48,0.12)",
                  borderRadius: 8,
                  padding: "10px 16px",
                }}
              >
                {error}
              </div>
            </div>
            <button
              onClick={reset}
              style={{
                padding: "10px 28px",
                background: ACCENT,
                color: "#fff",
                border: "none",
                borderRadius: 9,
                fontFamily: f.system,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 12px rgba(26,86,255,0.28)",
              }}
            >
              Spróbuj ponownie
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
