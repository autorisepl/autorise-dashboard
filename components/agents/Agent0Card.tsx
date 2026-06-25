"use client";

import { Building2, Hash, Mail, Phone } from "lucide-react";

export interface Agent0Output {
  kontakt_imie?: string | null;
  kontakt_nazwisko?: string | null;
  telefon?: string | null;
  email?: string | null;
  nip?: string | null;
  firma_slack?: string | null;
}

interface FieldRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}

function FieldRow({ icon, label, value }: FieldRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: "var(--radius-sm)",
        background: value ? "var(--bg-elevated)" : "transparent",
        border: `1px solid ${value ? "var(--border)" : "transparent"}`,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "var(--radius-xs)",
          background: "var(--accent-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "var(--accent)",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 500,
            color: value ? "var(--text-primary)" : "var(--text-placeholder)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value ?? "—"}
        </div>
      </div>
    </div>
  );
}

export function Agent0Card({ output }: { output: Agent0Output }) {
  const fullName = [output.kontakt_imie, output.kontakt_nazwisko].filter(Boolean).join(" ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Name header */}
      <div
        style={{
          padding: "14px 16px",
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          {fullName || "—"}
        </div>
        {output.firma_slack && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginTop: 5,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            <Building2 size={12} color="var(--text-tertiary)" />
            {output.firma_slack}
          </div>
        )}
      </div>

      {/* Contact fields */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "12px",
          background: "var(--glass)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <FieldRow icon={<Phone size={14} />} label="Telefon" value={output.telefon} />
        <FieldRow icon={<Mail size={14} />} label="E-mail" value={output.email} />
        <FieldRow icon={<Hash size={14} />} label="NIP" value={output.nip} />
      </div>
    </div>
  );
}
