"use client";

import { FileText, Mail, Phone } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { formatPhone } from "@/lib/format/phone";

export interface ClientContactFields {
  firma?: string | null;
  kontakt?: string | null;
  telefon?: string | null;
  email?: string | null;
  nip?: string | null;
}

// Blok 1, punkt 1.3 (2026-07-14) — jeden format wyświetlania danych kontaktowych klienta
// (Telefon/Email/NIP), używany wszędzie gdzie dashboard pokazuje klienta: ClientSidebar
// (/kwalifikacja, /sprzedaz), Pipeline Kanban, selektor klienta w /agenci. Nazwa/Firma
// renderowane osobno przez wywołującego (różnią się stylistycznie: rozmiar czcionki, waga,
// kolor przy zaznaczeniu), ale te trzy pola kontaktowe mają być identyczne wszędzie — ta sama
// kolejność, te same ikony, ten sam format telefonu (formatPhone, nie surowy string z Notion —
// Pipeline Kanban pokazywał dotąd telefon niesformatowany, jedyne miejsce które to robiło).
export function ClientContactDetails({
  client,
  size = "sm",
}: {
  client: ClientContactFields;
  size?: "sm" | "xs";
}) {
  if (!client.telefon && !client.email && !client.nip) return null;

  // Wariant "xs" (kompaktowe selektory /agenci, GlobalClientSelector) zostaje płaski.
  // Wariant "sm" (ClientSidebar) dostaje ten sam język ikon co karta w /pipeline:
  // ikona w obwódkowym kółku, wypełniona, w kolorze --text-primary.
  if (size === "xs") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
        {client.telefon && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Phone size={9} color="var(--text-tertiary)" />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                color: "var(--text-secondary)",
              }}
            >
              {formatPhone(client.telefon)}
            </span>
          </div>
        )}
        {client.email && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Mail size={9} color="var(--text-tertiary)" />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                color: "var(--text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 200,
              }}
            >
              {client.email}
            </span>
          </div>
        )}
        {client.nip && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <FileText size={9} color="var(--text-tertiary)" />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                color: "var(--text-secondary)",
              }}
            >
              NIP {client.nip}
            </span>
          </div>
        )}
      </div>
    );
  }

  const row = (icon: ReactNode, text: string, ellipsis = false) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "var(--bg-elevated)",
          border: "1px solid rgba(255,255,255,0.28)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          ...(ellipsis
            ? {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap" as const,
                minWidth: 0,
              }
            : {}),
        }}
      >
        {text}
      </span>
    </div>
  );

  // Wariant "sm" celowo minimalny: tylko telefon i e-mail (firma renderowana osobno
  // przez wywołującego). NIP pomijamy tutaj — nie jest potrzebny w panelu wyboru klienta.
  if (!client.telefon && !client.email) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {client.telefon &&
        row(
          <Phone size={12} strokeWidth={2.5} color="var(--text-primary)" fill="currentColor" />,
          formatPhone(client.telefon),
        )}
      {client.email &&
        row(<Mail size={12} strokeWidth={2.5} color="var(--text-primary)" />, client.email, true)}
    </div>
  );
}

// Linia "Firma" pod głównym nagłówkiem kontakt/firma — ta sama zasada wszędzie: pokaż tylko
// gdy firma różni się od kontaktu (osoby).
export function ClientCompanyLine({
  client,
  style,
}: {
  client: ClientContactFields;
  style?: CSSProperties;
}) {
  if (!client.firma || !client.kontakt || client.firma === client.kontakt) return null;
  return (
    <div style={{ fontSize: 11, color: "var(--text-tertiary)", ...style }}>{client.firma}</div>
  );
}
