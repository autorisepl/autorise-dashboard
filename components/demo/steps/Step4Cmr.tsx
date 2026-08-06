"use client";

import {
  Camera,
  CheckCircle2,
  FileCheck2,
  Hourglass,
  Loader2,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { useEffect, useState } from "react";
import { demoColors, demoFont } from "@/components/demo/demoTheme";
import { ZLECENIE } from "@/lib/demo/arekDemoData";

interface Step4CmrProps {
  active: boolean;
  confirmed: boolean;
  onConfirm: () => void;
}

const OCR_FIELDS = [
  { key: "cmr", label: "Numer CMR", value: ZLECENIE.cmrNumer },
  { key: "pod", label: "Potwierdzenie odbioru", value: ZLECENIE.podPotwierdzenie },
  { key: "waga", label: "Waga potwierdzona", value: ZLECENIE.ladunekWagaKg },
] as const;

function OcrFieldRow({ label, value }: { label: string; value: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: demoFont.sans, fontSize: 10, color: demoColors.textTertiary }}>
        {label}
      </span>
      {editing ? (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              flex: 1,
              fontFamily: demoFont.mono,
              fontSize: 12,
              color: demoColors.textPrimary,
              background: demoColors.bg,
              border: `1px solid ${demoColors.accentBorder}`,
              borderRadius: 6,
              padding: "4px 8px",
              height: 26,
            }}
          />
          <button type="button" onClick={() => setEditing(false)} style={saveFieldButtonStyle}>
            Zapisz
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{ fontFamily: demoFont.mono, fontSize: 12, color: demoColors.textPrimary }}
          >
            {draft}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Popraw pole: ${label}`}
            style={editFieldButtonStyle}
          >
            <Pencil size={11} />
            Popraw
          </button>
        </div>
      )}
    </div>
  );
}

export function Step4Cmr({ active, confirmed, onConfirm }: Step4CmrProps) {
  const [ocrDone, setOcrDone] = useState(false);

  useEffect(() => {
    if (!active) {
      setOcrDone(false);
      return;
    }
    const t = setTimeout(() => setOcrDone(true), 1400);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <div
        style={{
          flex: "1 1 220px",
          background: "#e7f8e2",
          borderRadius: 14,
          padding: 16,
          boxShadow: demoColors.cardShadow,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <MessageSquare size={15} color="#25a244" />
          <span
            style={{ fontFamily: demoFont.sans, fontSize: 12, fontWeight: 700, color: "#128c3f" }}
          >
            WhatsApp, {ZLECENIE.kierowca}
          </span>
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Camera size={22} color="#6b6b6b" style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: demoFont.sans, fontSize: 12, color: "#1f1f1f" }}>
            [zdjęcie] CMR {ZLECENIE.cmrNumer}
          </span>
        </div>
        <div style={{ marginTop: 6, fontFamily: demoFont.sans, fontSize: 11, color: "#3d6b3d" }}>
          Rozładunek zakończony, wysyłam dokument
        </div>
      </div>

      <div
        style={{
          flex: "1 1 220px",
          background: demoColors.surfaceRaised,
          border: `1px solid ${demoColors.border}`,
          borderRadius: 14,
          padding: 16,
          boxShadow: demoColors.cardShadow,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <FileCheck2 size={15} color={demoColors.accent} />
          <span
            style={{
              fontFamily: demoFont.sans,
              fontSize: 12,
              fontWeight: 700,
              color: demoColors.textPrimary,
            }}
          >
            Odczyt dokumentu
          </span>
        </div>

        {!ocrDone && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Loader2
              size={14}
              color={demoColors.textTertiary}
              style={{ animation: "spin 1s linear infinite" }}
            />
            <span
              style={{ fontFamily: demoFont.sans, fontSize: 12, color: demoColors.textSecondary }}
            >
              Rozpoznawanie danych z dokumentu...
            </span>
          </div>
        )}

        {ocrDone && !confirmed && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: demoFont.sans,
                fontSize: 12,
                color: demoColors.warning,
                fontWeight: 600,
              }}
            >
              <Hourglass size={13} />
              System odczytał dokument. Oczekuje potwierdzenia spedytora przed zapisaniem na stałe.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {OCR_FIELDS.map((field) => (
                <OcrFieldRow key={field.key} label={field.label} value={field.value} />
              ))}
            </div>
            <button type="button" onClick={onConfirm} style={confirmButtonStyle}>
              Potwierdź i zapisz
            </button>
          </div>
        )}

        {ocrDone && confirmed && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: demoFont.sans,
                fontSize: 12,
                color: demoColors.success,
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={13} />
              Numer CMR: {ZLECENIE.cmrNumer}
            </div>
            <div
              style={{ fontFamily: demoFont.sans, fontSize: 12, color: demoColors.textSecondary }}
            >
              POD: {ZLECENIE.podPotwierdzenie}
            </div>
            <div
              style={{ fontFamily: demoFont.sans, fontSize: 12, color: demoColors.textSecondary }}
            >
              Zlecenie {ZLECENIE.numerZleceniaTms} zapisane na stałe, status: Dostarczone
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const confirmButtonStyle = {
  alignSelf: "flex-start",
  fontFamily: demoFont.sans,
  fontSize: 12,
  fontWeight: 600,
  height: 32,
  padding: "0 14px",
  borderRadius: 8,
  background: demoColors.accent,
  border: "none",
  color: "#1a1207",
  cursor: "pointer",
} as const;

const editFieldButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontFamily: demoFont.sans,
  fontSize: 10,
  fontWeight: 600,
  color: demoColors.accent,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
} as const;

const saveFieldButtonStyle = {
  fontFamily: demoFont.sans,
  fontSize: 11,
  fontWeight: 600,
  height: 26,
  padding: "0 10px",
  borderRadius: 6,
  background: demoColors.accent,
  border: "none",
  color: "#1a1207",
  cursor: "pointer",
} as const;
