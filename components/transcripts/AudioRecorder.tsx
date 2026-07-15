"use client";

import { ChevronDown, Download, Info, Mic, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { approxMinutesForBytes, fmtMb, MAX_FILE_BYTES } from "@/lib/transcripts/audioLimits";

type RecorderState = "idle" | "recording" | "preview";

const DEVICE_ID_KEY = "autorise_recorder_device_id";

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
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  // Blok 3, punkt 3.2 (2026-07-15/16) — wybór mikrofonu ma być trwały: zapamiętany między
  // sesjami (localStorage), nie tylko między nagraniami w tej samej karcie.
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() =>
    typeof window === "undefined" ? "" : (localStorage.getItem(DEVICE_ID_KEY) ?? ""),
  );

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Enumerate audio input devices on mount and after permissions.
  const loadDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === "audioinput");
      setAudioDevices(inputs);
      // Zachowaj zapamiętany mikrofon jeśli nadal istnieje wśród dostępnych urządzeń;
      // dopiero gdy go brak (albo nic jeszcze nie wybrano) — użyj pierwszego z listy.
      const storedStillValid = inputs.some((d) => d.deviceId === selectedDeviceId);
      if (inputs.length > 0 && !storedStillValid) {
        setSelectedDeviceId(inputs[0].deviceId);
      }
    } catch {
      // enumerateDevices may fail without permissions — handled gracefully
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    void loadDevices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopAll = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
    if (streamRef.current)
      streamRef.current.getTracks().forEach((t) => {
        t.stop();
      });
    if (audioCtxRef.current) audioCtxRef.current.close();
    setAnalyser(null);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const audioConstraints: MediaTrackConstraints = {
        sampleRate: 44100,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      };
      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      // After first getUserMedia call, re-enumerate to get labels.
      void loadDevices();
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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
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
  }, [selectedDeviceId, loadDevices]);

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
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("webm") ? "webm" : "mp3";
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
          Rejestr dźwięku
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

      {/* Microphone selector — Blok 3, punkt 3.2: pole trwałe, nie znika po wyborze/w
          trakcie nagrywania (dotąd renderowane wyłącznie w state==="idle", więc znikało
          w chwili startu nagrania i przy każdym powrocie trzeba było je odnajdywać od
          nowa). Zablokowane (nie ukryte) podczas nagrywania — zmiana urządzenia w
          połowie nagrania nie ma sensu, ale widoczność i pamięć wyboru już tak. */}
      {audioDevices.length > 1 && (
        <div style={{ position: "relative", marginBottom: 10 }}>
          <select
            value={selectedDeviceId}
            disabled={state !== "idle"}
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
              localStorage.setItem(DEVICE_ID_KEY, e.target.value);
            }}
            style={{
              width: "100%",
              padding: "6px 28px 6px 10px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: state === "idle" ? "var(--bg)" : "var(--bg-hover)",
              color: state === "idle" ? "var(--text-primary)" : "var(--text-tertiary)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              appearance: "none",
              outline: "none",
              cursor: state === "idle" ? "pointer" : "default",
            }}
          >
            {audioDevices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Mikrofon ${i + 1}`}
              </option>
            ))}
          </select>
          <ChevronDown
            size={11}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "var(--text-tertiary)",
            }}
          />
        </div>
      )}

      {state === "idle" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            marginBottom: 10,
            borderRadius: 8,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          <Info size={11} style={{ flexShrink: 0 }} />
          <span>
            Format: WebM/Opus · Limit pliku: {fmtMb(MAX_FILE_BYTES)} · maks. ~
            {approxMinutesForBytes(MAX_FILE_BYTES)} min nagrania
          </span>
        </div>
      )}

      {state === "idle" && (
        <Button variant="primary" onClick={startRecording} style={{ width: "100%" }}>
          <Mic size={13} style={{ marginRight: 6 }} />
          Rozpocznij nagrywanie
        </Button>
      )}

      {state === "recording" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <WaveformCanvas analyser={analyser} />
          <Button
            variant="primary"
            onClick={stopRecording}
            style={{ width: "100%", background: "var(--error)", borderColor: "var(--error)" }}
          >
            <Square size={12} style={{ marginRight: 6 }} fill="currentColor" />
            Zatrzymaj
          </Button>
        </div>
      )}

      {state === "preview" && blob && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* biome-ignore lint/a11y/useMediaCaption: audio preview for own recordings, no captions needed */}
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
            <span
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                display: "flex",
                alignItems: "center",
              }}
            >
              .{blob.type.includes("mp4") ? "m4a" : blob.type.includes("webm") ? "webm" : "mp3"}
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
