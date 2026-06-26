"use client";

import { BarChart2, Clock, Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import type { RoadmapStep } from "@/components/ui/StatusRoadmap";
import { StatusRoadmap } from "@/components/ui/StatusRoadmap";

// ── Roadmap ─────────────────────────────────────────────────────────

const STEPS: RoadmapStep[] = [
  { label: "Oczekiwanie na opis narzędzia" },
  { label: "Analiza funkcjonalności" },
  { label: "Ocena przydatności dla Autorise" },
  { label: "Generowanie raportu oceny" },
];

// ── Output renderer ──────────────────────────────────────────────────

function OutputBlock({ content }: { content: string }) {
  const paragraphs = content.split("\n").filter((p) => p.trim());
  return (
    <Panel style={{ padding: 20 }}>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          lineHeight: 1.7,
          color: "var(--text-primary)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {paragraphs.map((para, i) => {
          const isHeading = para.startsWith("#") || /^[A-ZŁŚŹĆÓĄĘ][A-ZŁŚŹĆÓĄĘ\s]+:/.test(para);
          return (
            <p
              key={i}
              style={{
                margin: 0,
                fontWeight: isHeading ? 600 : 400,
                color: isHeading ? "var(--text-primary)" : "var(--text-secondary)",
                borderLeft: isHeading ? "2px solid var(--accent)" : "none",
                paddingLeft: isHeading ? 10 : 0,
              }}
            >
              {para.replace(/^#+\s*/, "")}
            </p>
          );
        })}
      </div>
    </Panel>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function AnalizaNarzedziPage() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const startRef = useRef<number>(0);
  const focused = useRef(false);

  const roadmapStep = status === "idle" ? 0 : status === "running" ? 2 : STEPS.length - 1;

  const run = useCallback(async () => {
    if (!input.trim()) return;
    setStatus("running");
    setOutput(null);
    setError(null);
    setElapsed(null);
    startRef.current = Date.now();

    try {
      const res = await fetch("/api/agents/agent6", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: input }),
      });
      const data = await res.json();
      const secs = Math.round((Date.now() - startRef.current) / 1000);
      setElapsed(secs);

      if (data.success) {
        const raw = data.output;
        setOutput(typeof raw === "string" ? raw : JSON.stringify(raw, null, 2));
        setStatus("done");
      } else {
        setError(data.error ?? "Nieznany błąd");
        setStatus("error");
      }
    } catch (err) {
      const secs = Math.round((Date.now() - startRef.current) / 1000);
      setElapsed(secs);
      setError(err instanceof Error ? err.message : "Błąd połączenia");
      setStatus("error");
    }
  }, [input]);

  return (
    <div
      style={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

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
        <BarChart2 size={15} color="var(--accent)" />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          Analiza nowych narzędzi
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            background: "rgba(0,0,0,0.04)",
            padding: "2px 8px",
            borderRadius: "var(--radius-xs)",
            border: "1px solid var(--border)",
            letterSpacing: "0.05em",
          }}
        >
          06 · claude-opus-4-8
        </span>
      </div>

      {/* Body — 2/5 + 3/5 */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {/* Left panel */}
        <div
          style={{
            flex: 2,
            borderRight: "1px solid var(--border)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            padding: 16,
            gap: 12,
          }}
        >
          <Panel style={{ padding: 14, flexShrink: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Analiza narzędzia lub biblioteki
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <span>Krok 1. Analizuje opis narzędzia lub biblioteki AI.</span>
              <span>Krok 2. Ocenia przydatność w kontekście Autorise.</span>
              <span>Krok 3. Generuje raport z rekomendacją.</span>
            </div>
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {[
                { label: "Model", value: "claude-opus-4-8" },
                { label: "Uruchomienie", value: "Ocena nowego narzędzia AI" },
                { label: "Czas pracy", value: "ok. 45–90 sekund" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      width: 86,
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-primary)",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <label
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Opis narzędzia do oceny
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Wklej opis narzędzia, biblioteki lub koncepcji do oceny."
              style={{
                flex: 1,
                resize: "none",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.55,
                padding: "10px 12px",
                background: "var(--bg-elevated)",
                border: `1px solid ${focused.current ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                focused.current = true;
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onBlur={(e) => {
                focused.current = false;
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            />
          </div>

          <Button
            variant="primary"
            fullWidth
            size="md"
            loading={status === "running"}
            disabled={!input.trim() || status === "running"}
            onClick={run}
          >
            Analizuj narzędzie
          </Button>

          {elapsed != null && status !== "running" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                justifyContent: "center",
              }}
            >
              <Clock size={10} color="var(--text-tertiary)" />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                {elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`}
              </span>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div
          style={{
            flex: 3,
            overflow: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Panel style={{ padding: 14, flexShrink: 0 }}>
            <StatusRoadmap steps={STEPS} currentStep={roadmapStep} />
          </Panel>

          {status === "running" && (
            <Panel
              style={{
                padding: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <Loader2
                size={16}
                color="var(--accent)"
                style={{ animation: "spin 1s linear infinite" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                Analiza w toku...
              </span>
            </Panel>
          )}

          {status === "error" && error && (
            <Panel
              style={{
                padding: 16,
                background: "var(--error-bg)",
                borderColor: "rgba(255,69,58,0.2)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--error)",
                  marginBottom: 4,
                }}
              >
                Błąd agenta
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--error)",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            </Panel>
          )}

          {status === "done" && output && <OutputBlock content={output} />}
        </div>
      </div>
    </div>
  );
}
