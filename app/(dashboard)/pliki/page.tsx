"use client";

import {
  AlertCircle,
  Edit3,
  ExternalLink,
  Eye,
  Files,
  FileText,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DriveFile } from "@/app/api/google/drive/transcripts/route";
import type { WorkspaceFile } from "@/app/api/workspace/list/route";
import { ClientFileCard } from "@/components/transcripts/ClientFileCard";
import { Markdown } from "@/components/ui/Markdown";
import { Panel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { hasMatchingTranscript, parseClientFileName } from "@/lib/transcripts/parse";

// ── Types ─────────────────────────────────────────────────────────────

interface SelectedFile {
  type: "txt" | "mp3" | "ctx";
  id?: string;
  name: string;
  webViewLink?: string;
  path?: string;
  mimeType?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

function fmt(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0)
    return `dziś ${d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  if (diff === 1) return "wczoraj";
  if (diff < 7) return `${diff} dni temu`;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── File row (context files + fallback) ───────────────────────────────

function FileRow({
  name,
  sub,
  date,
  size,
  selected,
  icon,
  onClick,
}: {
  name: string;
  sub?: string;
  date?: string;
  size?: number;
  webViewLink?: string;
  selected: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        cursor: "pointer",
        background: selected ? "var(--accent-muted)" : hovered ? "var(--bg-hover)" : "transparent",
        borderLeft: selected ? "2px solid var(--accent)" : "2px solid transparent",
        transition: "background 100ms",
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 500,
            color: selected ? "var(--accent)" : "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
        {sub && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              color: "var(--text-tertiary)",
              marginTop: 1,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        {date && (
          <div
            style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-tertiary)" }}
          >
            {date}
          </div>
        )}
        {size !== undefined && size > 0 && (
          <div
            style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-tertiary)" }}
          >
            {fmtSize(size)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel chrome ──────────────────────────────────────────────────────

function FilePanelHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div
      style={{
        padding: "9px 12px 7px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 7,
        background: "var(--bg)",
        flexShrink: 0,
      }}
    >
      <SectionLabel>{title}</SectionLabel>
      {count !== undefined && count > 0 && (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            background: "var(--bg-hover)",
            padding: "1px 7px",
            borderRadius: 99,
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function FilePanel({
  title,
  count,
  borderRight,
  children,
}: {
  title: string;
  count?: number;
  borderRight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRight: borderRight ? "1px solid var(--border)" : "none",
      }}
    >
      <FilePanelHeader title={title} count={count} />
      <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
    </div>
  );
}

function PanelLoading() {
  return (
    <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 6 }}>
      <Loader2
        size={12}
        color="var(--text-tertiary)"
        style={{ animation: "spin 1s linear infinite" }}
      />
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-tertiary)" }}>
        Ładowanie...
      </span>
    </div>
  );
}

function PanelEmpty({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "14px 12px",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        color: "var(--text-tertiary)",
        textAlign: "center",
      }}
    >
      {label}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function PlikiPage() {
  const [mp3Files, setMp3Files] = useState<DriveFile[]>([]);
  const [txtFiles, setTxtFiles] = useState<DriveFile[]>([]);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveAuthNeeded, setDriveAuthNeeded] = useState(false);
  const [loadingDrive, setLoadingDrive] = useState(true);

  const [contextFiles, setContextFiles] = useState<WorkspaceFile[]>([]);
  const [loadingCtx, setLoadingCtx] = useState(true);

  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchDrive = useCallback(async () => {
    setLoadingDrive(true);
    setDriveError(null);
    setDriveAuthNeeded(false);
    try {
      const res = await fetch("/api/google/drive/transcripts");
      const data = (await res.json()) as {
        success: boolean;
        mp3?: DriveFile[];
        txt?: DriveFile[];
        error?: string;
      };
      if (data.success) {
        setMp3Files(data.mp3 ?? []);
        setTxtFiles(data.txt ?? []);
        setLastUpdated(
          new Date().toLocaleTimeString("pl-PL", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        );
      } else {
        const isAuth =
          res.status === 401 ||
          (data.error?.toLowerCase().includes("autoryz") ?? false) ||
          (data.error?.toLowerCase().includes("auth") ?? false) ||
          (data.error?.toLowerCase().includes("scope") ?? false);
        setDriveAuthNeeded(isAuth);
        setDriveError(data.error ?? "Błąd pobierania plików");
      }
    } catch {
      setDriveError("Błąd połączenia");
    } finally {
      setLoadingDrive(false);
    }
  }, []);

  const fetchContextFiles = useCallback(async () => {
    setLoadingCtx(true);
    try {
      const [ctxRes, rootRes] = await Promise.all([
        fetch("/api/workspace/list?path=context"),
        fetch("/api/workspace/list?path="),
      ]);
      const [ctxData, rootData] = await Promise.all([
        ctxRes.json() as Promise<{ success: boolean; files?: WorkspaceFile[] }>,
        rootRes.json() as Promise<{ success: boolean; files?: WorkspaceFile[] }>,
      ]);
      const rootMd = (rootData.files ?? []).filter((f) => f.name.endsWith(".md"));
      const ctxFiles = ctxData.files ?? [];
      setContextFiles([...rootMd, ...ctxFiles]);
    } catch {
      /* silent */
    } finally {
      setLoadingCtx(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchDrive(), fetchContextFiles()]);
  }, [fetchDrive, fetchContextFiles]);

  useEffect(() => {
    void fetchAll();
    const id = setInterval(() => void fetchAll(), 30_000);
    const onFocus = () => void fetchAll();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchAll]);

  const loadPreview = useCallback(async (file: SelectedFile) => {
    setSelected(file);
    setPreviewContent(null);
    setPreviewError(null);
    setEditMode(false);
    setUnsaved(false);

    if (file.type === "mp3") return;

    setLoadingPreview(true);
    try {
      let content = "";
      if (file.type === "txt" && file.id) {
        const res = await fetch(`/api/google/drive/file/${file.id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        content = await res.text();
      } else if (file.type === "ctx" && file.path) {
        const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(file.path)}`);
        const data = (await res.json()) as { content?: string; error?: string };
        if (!data.content) throw new Error(data.error ?? "Błąd odczytu");
        content = data.content;
      }
      setPreviewContent(content);
      setEditContent(content);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Błąd ładowania");
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  async function handleSave() {
    if (!selected?.path || !editContent) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selected.path, content: editContent }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setPreviewContent(editContent);
        setUnsaved(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const isEditable = selected?.type === "ctx";

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 20px",
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Files size={15} color="var(--accent)" />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            flex: 1,
          }}
        >
          Najważniejsze pliki
        </span>
        {lastUpdated && (
          <span
            style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-tertiary)" }}
          >
            Sync: {lastUpdated}
          </span>
        )}
        <button
          onClick={() => void fetchAll()}
          disabled={loadingDrive}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            cursor: loadingDrive ? "default" : "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-secondary)",
            opacity: loadingDrive ? 0.6 : 1,
          }}
        >
          <RefreshCw size={11} />
          Odśwież
        </button>
      </div>

      {/* Body — file panels (left) + preview (right) */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {/* Left: file panels */}
        <div
          style={{
            width: "54%",
            minWidth: 460,
            borderRight: "1px solid var(--border)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top row: TXT | MP3 side by side */}
          <div
            style={{
              flex: "3 1 0",
              display: "flex",
              overflow: "hidden",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {/* TXT panel */}
            <FilePanel title="Transkrypty TXT" count={txtFiles.length} borderRight>
              {driveError ? (
                <div
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    color: driveAuthNeeded ? "var(--warning)" : "var(--error)",
                    lineHeight: 1.5,
                  }}
                >
                  <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                  {driveAuthNeeded
                    ? "Odśwież uprawnienia Google w Profilu (odłącz i połącz ponownie)"
                    : driveError}
                </div>
              ) : loadingDrive ? (
                <PanelLoading />
              ) : txtFiles.length === 0 ? (
                <PanelEmpty label="Brak plików TXT" />
              ) : (
                txtFiles.map((f) => (
                  <ClientFileCard
                    key={f.id}
                    kind="txt"
                    fileName={f.name}
                    modifiedTime={f.modifiedTime}
                    size={f.size}
                    selected={selected?.id === f.id}
                    onClick={() =>
                      void loadPreview({
                        type: "txt",
                        id: f.id,
                        name: f.name,
                        webViewLink: f.webViewLink,
                      })
                    }
                  />
                ))
              )}
            </FilePanel>

            {/* MP3 panel */}
            <FilePanel title="Nagrania MP3" count={mp3Files.length}>
              {!driveError && !loadingDrive && mp3Files.length === 0 ? (
                <PanelEmpty label="Brak nagrań" />
              ) : loadingDrive && !driveError ? (
                <PanelLoading />
              ) : (
                mp3Files.map((f) => (
                  <ClientFileCard
                    key={f.id}
                    kind="mp3"
                    fileName={f.name}
                    modifiedTime={f.modifiedTime}
                    size={f.size}
                    selected={selected?.id === f.id}
                    status={
                      hasMatchingTranscript(
                        f.name,
                        txtFiles.map((t) => t.name),
                      )
                        ? "done"
                        : "todo"
                    }
                    onClick={() =>
                      void loadPreview({
                        type: "mp3",
                        id: f.id,
                        name: f.name,
                        webViewLink: f.webViewLink,
                      })
                    }
                  />
                ))
              )}
            </FilePanel>
          </div>

          {/* Bottom: context files full width */}
          <div
            style={{ flex: "2 1 0", display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            <FilePanelHeader title="Pliki kontekstowe" count={contextFiles.length} />
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loadingCtx ? (
                <PanelLoading />
              ) : contextFiles.length === 0 ? (
                <PanelEmpty label="Brak plików kontekstowych" />
              ) : (
                contextFiles.map((f) => (
                  <FileRow
                    key={f.path}
                    name={f.name}
                    sub={f.path}
                    date={fmt(f.modifiedTime)}
                    size={f.size}
                    selected={selected?.path === f.path}
                    icon={<FileText size={13} color="var(--text-tertiary)" />}
                    onClick={() => void loadPreview({ type: "ctx", name: f.name, path: f.path })}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: preview/editor */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {!selected ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <FileText size={32} color="var(--border)" />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                }}
              >
                Wybierz plik z listy
              </span>
            </div>
          ) : (
            <>
              {/* Preview toolbar */}
              <div
                style={{
                  height: 40,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 16px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-primary)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selected.type === "txt"
                    ? parseClientFileName(selected.name).displayName
                    : selected.name}
                </span>
                {unsaved && (
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 10,
                      color: "var(--warning)",
                      background: "rgba(255,159,10,0.08)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-xs)",
                      border: "1px solid rgba(255,159,10,0.2)",
                    }}
                  >
                    niezapisane
                  </span>
                )}
                {selected.webViewLink && (
                  <a
                    href={selected.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-xs)",
                      textDecoration: "none",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      background: "var(--bg)",
                    }}
                  >
                    <ExternalLink size={10} />
                    Drive
                  </a>
                )}
                {isEditable && previewContent !== null && (
                  <>
                    <button
                      onClick={() => setEditMode(!editMode)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 8px",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-xs)",
                        background: editMode ? "var(--accent-muted)" : "var(--bg)",
                        fontFamily: "var(--font-sans)",
                        fontSize: 11,
                        color: editMode ? "var(--accent)" : "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      {editMode ? <Eye size={10} /> : <Edit3 size={10} />}
                      {editMode ? "Podgląd" : "Edytuj"}
                    </button>
                    {editMode && (
                      <button
                        onClick={() => void handleSave()}
                        disabled={saving || !unsaved}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: "var(--radius-xs)",
                          border: "none",
                          background: unsaved ? "var(--accent)" : "var(--bg-elevated)",
                          fontFamily: "var(--font-sans)",
                          fontSize: 11,
                          color: unsaved ? "#fff" : "var(--text-tertiary)",
                          cursor: saving || !unsaved ? "default" : "pointer",
                        }}
                      >
                        {saving ? <Loader2 size={10} /> : <Save size={10} />}
                        Zapisz
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Preview body */}
              <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
                {loadingPreview && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                    Ładowanie...
                  </div>
                )}
                {previewError && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 14px",
                      background: "var(--error-bg)",
                      border: "1px solid rgba(255,69,58,0.2)",
                      borderRadius: "var(--radius-xs)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--error)",
                    }}
                  >
                    <AlertCircle size={14} />
                    {previewError}
                  </div>
                )}

                {/* MP3 */}
                {selected.type === "mp3" && selected.webViewLink && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {selected.name}
                    </div>
                    <a
                      href={selected.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 14px",
                        borderRadius: "var(--radius-xs)",
                        border: "1px solid var(--border)",
                        background: "var(--bg-elevated)",
                        textDecoration: "none",
                        fontFamily: "var(--font-sans)",
                        fontSize: 12,
                        color: "var(--text-primary)",
                      }}
                    >
                      <ExternalLink size={13} />
                      Otwórz w Google Drive
                    </a>
                  </div>
                )}

                {/* Text/MD */}
                {!loadingPreview &&
                  !previewError &&
                  previewContent !== null &&
                  selected.type !== "mp3" &&
                  (editMode && isEditable ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => {
                        setEditContent(e.target.value);
                        setUnsaved(true);
                      }}
                      style={{
                        width: "100%",
                        height: "calc(100vh - 200px)",
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        lineHeight: 1.7,
                        color: "var(--text-primary)",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "12px",
                        resize: "none",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  ) : selected.name.endsWith(".md") ? (
                    <Markdown content={previewContent} />
                  ) : (
                    <pre
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        lineHeight: 1.7,
                        color: "var(--text-secondary)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        margin: 0,
                      }}
                    >
                      {previewContent}
                    </pre>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
