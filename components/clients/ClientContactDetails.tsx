"use client";

import { FileText, Mail, Phone } from "lucide-react";
import type { CSSProperties } from "react";
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
  const fontSize = size === "xs" ? 10 : 11;
  const iconSize = size === "xs" ? 9 : 10;
  if (!client.telefon && !client.email && !client.nip) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
      {client.telefon && (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Phone size={iconSize} color="var(--text-tertiary)" />
          <span
            style={{ fontFamily: "var(--font-sans)", fontSize, color: "var(--text-secondary)" }}
          >
            {formatPhone(client.telefon)}
          </span>
        </div>
      )}
      {client.email && (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Mail size={iconSize} color="var(--text-tertiary)" />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize,
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
          <FileText size={iconSize} color="var(--text-tertiary)" />
          <span
            style={{ fontFamily: "var(--font-sans)", fontSize, color: "var(--text-secondary)" }}
          >
            NIP {client.nip}
          </span>
        </div>
      )}
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
