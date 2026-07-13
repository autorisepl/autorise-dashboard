"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface WarunkiUmowyFormProps {
  client: PipelineClientDetailed | null;
  onSaved: (patch: Partial<PipelineClientDetailed>) => void;
}

const inputStyle: React.CSSProperties = {
  height: 36,
  padding: "0 10px",
  borderRadius: 8,
  border: "1px solid #E5E5EA",
  background: "#fff",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
};

// Mini-formularz "obok kalkulatora" w kroku ceny/zamknięcia: dwa pola ustalane na żywo
// podczas rozmowy zamykającej, zapisywane do Notion Pipeline tym samym mechanizmem co
// reszta pól ręcznych (PATCH /api/notion/pipeline-update) — wzorzec incrementCallAttempt
// w /kwalifikacja. "Dni dostępów" trafia do Załącznika nr 1 umowy (SZKIC_UMOWA_AUTORISE.md
// §2 ust. 1), nie jest sztywną liczbą dla wszystkich klientów.
export function WarunkiUmowyForm({ client, onSaved }: WarunkiUmowyFormProps) {
  const [dni, setDni] = useState("");
  const [uwagi, setUwagi] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setDni(client?.warunkiDniDostepow ? String(client.warunkiDniDostepow) : "");
    setUwagi(client?.warunkiUwagi ?? "");
    setStatus("idle");
  }, [client?.id]);

  const save = async (patch: { dniDostepow?: number | null; uwagiWarunki?: string | null }) => {
    if (!client) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: client.id, ...patch }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Błąd zapisu");
      setStatus("saved");
      onSaved({
        ...(patch.dniDostepow !== undefined ? { warunkiDniDostepow: patch.dniDostepow ?? 0 } : {}),
        ...(patch.uwagiWarunki !== undefined ? { warunkiUwagi: patch.uwagiWarunki ?? "" } : {}),
      });
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setStatus("error");
    }
  };

  if (!client) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "4px 2px" }}>
        Wybierz klienta, żeby ustalić warunki.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 5,
          }}
        >
          Ustalony termin zebrania dostępów (dni)
        </label>
        <input
          type="number"
          min={0}
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          onBlur={() => {
            const parsed = dni.trim() === "" ? null : Number(dni);
            void save({ dniDostepow: parsed !== null && Number.isFinite(parsed) ? parsed : null });
          }}
          placeholder="np. 5"
          style={inputStyle}
        />
      </div>
      <div>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 5,
          }}
        >
          Uwagi do warunków niestandardowych
        </label>
        <textarea
          value={uwagi}
          onChange={(e) => setUwagi(e.target.value)}
          onBlur={() => void save({ uwagiWarunki: uwagi.trim() || null })}
          placeholder="Opcjonalnie — np. rozszerzenie zakresu, indywidualna wycena..."
          style={{
            ...inputStyle,
            height: "auto",
            minHeight: 72,
            padding: "8px 10px",
            resize: "vertical",
            lineHeight: 1.5,
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
        {status === "saving" && (
          <>
            <Loader2
              size={11}
              color="var(--text-tertiary)"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <span style={{ color: "var(--text-tertiary)" }}>Zapisuję...</span>
          </>
        )}
        {status === "saved" && (
          <>
            <Check size={11} color="var(--success-text)" />
            <span style={{ color: "var(--success-text)", fontWeight: 600 }}>
              Zapisano do Notion
            </span>
          </>
        )}
        {status === "error" && (
          <span style={{ color: "var(--error)" }}>Błąd zapisu, spróbuj ponownie.</span>
        )}
        {status === "idle" && (
          <span style={{ color: "var(--text-tertiary)" }}>
            Zapis do karty klienta w Notion Pipeline.
          </span>
        )}
      </div>
    </div>
  );
}
