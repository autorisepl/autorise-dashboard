"use client";

import { CalendarPlus, Check, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

const ACCENT = "#1a56ff";
const TIME_ZONE = "Europe/Warsaw";
const DEFAULT_HOUR = "10:00";

// "DD.MM.YYYY" + "HH:MM" → naiwny ISO "YYYY-MM-DDTHH:MM:00" (Google + timeZone rozwiąże DST).
function toNaiveIso(
  dateStr: string,
  timeStr: string | null,
): { start: string; end: string } | null {
  const m = dateStr.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const tm = (timeStr ?? DEFAULT_HOUR).match(/(\d{1,2}):(\d{2})/);
  const hh = tm ? tm[1].padStart(2, "0") : "10";
  const min = tm ? tm[2] : "00";
  const day = dd.padStart(2, "0");
  const month = mm.padStart(2, "0");
  const start = `${yyyy}-${month}-${day}T${hh}:${min}:00`;
  const endHour = String((parseInt(hh, 10) + 1) % 24).padStart(2, "0");
  const end = `${yyyy}-${month}-${day}T${endHour}:${min}:00`;
  return { start, end };
}

type Status = "idle" | "loading" | "done" | "error";

export function CalendarAddButton({
  summary,
  dateStr,
  timeStr,
  description,
}: {
  summary: string;
  dateStr: string;
  timeStr?: string | null;
  description?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const parsed = toNaiveIso(dateStr, timeStr ?? null);
    if (!parsed) {
      setStatus("error");
      setError("Nie rozpoznano daty spotkania.");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/google/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary,
          startDateTime: parsed.start,
          endDateTime: parsed.end,
          description: description || undefined,
          timeZone: TIME_ZONE,
        }),
      });
      const data = (await res.json()) as { htmlLink?: string; error?: string };
      if (!res.ok) {
        setStatus("error");
        setError(
          res.status === 401
            ? "Połącz konto Google (zakładka Profil)."
            : data.error || "Błąd kalendarza.",
        );
        return;
      }
      setLink(data.htmlLink ?? null);
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Błąd sieci — spróbuj ponownie.");
    }
  }

  if (status === "done") {
    return (
      <a
        href={link ?? "#"}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 11px",
          borderRadius: 7,
          fontFamily: "var(--font-system)",
          fontSize: 12,
          fontWeight: 600,
          textDecoration: "none",
          background: "var(--success-bg)",
          color: "var(--success-text)",
          border: "1px solid var(--success-border)",
        }}
      >
        <Check size={13} /> W kalendarzu
        {link && <ExternalLink size={11} />}
      </a>
    );
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button
        onClick={add}
        disabled={status === "loading"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 11px",
          borderRadius: 7,
          fontFamily: "var(--font-system)",
          fontSize: 12,
          fontWeight: 600,
          cursor: status === "loading" ? "default" : "pointer",
          background: `${ACCENT}1a`,
          color: ACCENT,
          border: `1px solid ${ACCENT}50`,
          opacity: status === "loading" ? 0.7 : 1,
        }}
      >
        {status === "loading" ? <Loader2 size={13} className="spin" /> : <CalendarPlus size={13} />}
        Dodaj do kalendarza
      </button>
      {status === "error" && error && (
        <span style={{ fontSize: 11, color: "var(--error)", fontFamily: "var(--font-system)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
