"use client";

import { Download, Mic, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

type RecorderState = "idle" | "recording" | "preview";

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function WaveformCanvas({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const buf = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
      if (!ctx || !canvas || !analyser) return;
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(buf);

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = "var(--accent)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const step = W / buf.length;
      for (let i = 0; i < buf.length; i++) {
        const y = ((buf[i] - 128) / 128) * (H / 2) + H / 2;
        i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * step, y);
      }
      ctx.stroke();
    }

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={48}
      style={{ width: "100%", height: 48, borderRadius: 8, background: "rgba(81,112,255,0.06)" }}
    />
  );
}

export function AudioRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [filename, setFilename] = useState("nagranie");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopAll = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
    setAnalyser(null);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 44100, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const an = audioCtx.createAnalyser();
      an.fftSize = 1024;
      source.connect(an);
      setAnalyser(an);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
      mediaRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const recorded = new Blob(chunksRef.current, { type: mimeType });
        setBlob(recorded);
        setState("preview");
      };

      recorder.start(250);
      startTimeRef.current = Date.now();
      setDuration(0);
      setState("recording");

      timerRef.current = setInterval(() => {
        setDuration(Date.now() - startTimeRef.current);
      }, 500);
    } catch {
      alert("Brak dostępu do mikrofonu.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    stopAll();
  }, [stopAll]);

  const discard = useCallback(() => {
    setBlob(null);
    setDuration(0);
    setState("idle");
  }, []);

  const save = useCallback(() => {
    if (!blob) return;
    const ext = blob.type.includes("mp4") ? "m4a" : "mp3";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename.trim() || "nagranie"}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, [blob, filename]);

  useEffect(() => () => stopAll(), [stopAll]);

  return (
    <div
      style={{
        padding: "16px 20px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Mic size={14} color="var(--accent)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          Rejestr dźwięku (mp3)
        </span>
        {state === "recording" && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--error)",
              fontVariantNumeric: "tabular-nums",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--error)",
                animation: "blink 1s step-end infinite",
              }}
            />
            {fmtDuration(duration)}
          </span>
        )}
      </div>

      {state === "idle" && (
        <Button variant="primary" onClick={startRecording} style={{ width: "100%" }}>
          <Mic size={13} style={{ marginRight: 6 }} />
          Rozpocznij nagrywanie
        </Button>
      )}

      {state === "recording" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <WaveformCanvas analyser={analyser} />
          <Button variant="primary" onClick={stopRecording} style={{ width: "100%", background: "var(--error)", borderColor: "var(--error)" }}>
            <Square size={12} style={{ marginRight: 6 }} fill="currentColor" />
            Zatrzymaj
          </Button>
        </div>
      )}

      {state === "preview" && blob && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <audio
            controls
            src={URL.createObjectURL(blob)}
            style={{ width: "100%", height: 36, borderRadius: 8 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="nazwa pliku"
              style={{
                flex: 1,
                height: 34,
                padding: "0 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", display: "flex", alignItems: "center" }}>
              .mp3
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" onClick={save} style={{ flex: 1 }}>
              <Download size={12} style={{ marginRight: 6 }} />
              Zapisz
            </Button>
            <Button variant="ghost" onClick={discard}>
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
