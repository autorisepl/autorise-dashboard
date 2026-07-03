"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { KalkulatorRoi } from "@/components/kalkulator/KalkulatorRoi";
import { formatPhone } from "@/lib/format/phone";
import { ICP_RULES, OBJECTIONS_K, STEPS_K } from "@/lib/scripts/kwalifikacyjna";
import { GROUP_COLORS, MESSAGES_DATA } from "@/lib/scripts/messages";
import type { ScriptLine } from "@/lib/scripts/types";
import { objectionColor } from "@/lib/scripts/types";

// ── Helpers ──────────────────────────────────────────────────────────

function toVocative(name: string): string {
  const first = name.trim().split(" ")[0];
  if (!first) return name;
  if (first.endsWith("ał")) return first.slice(0, -2) + "ale";
  if (first.endsWith("eł")) return first.slice(0, -2) + "le";
  if (first.endsWith("ek") && first.length > 3) return first.slice(0, -2) + "ku";
  if (first.endsWith("a") && first.length > 2) return first.slice(0, -1) + "o";
  return first;
}

// ── Line colors ───────────────────────────────────────────────────────

const LINE_COLOR: Record<ScriptLine["t"], string> = {
  say: "var(--text-primary)",
  client: "var(--text-secondary)",
  note: "var(--warning)",
  action: "var(--accent)",
  branch: "var(--success-text)",
  "branch-bad": "var(--error)",
};

const LINE_BG: Record<ScriptLine["t"], string> = {
  say: "transparent",
  client: "transparent",
  note: "var(--warning-bg)",
  action: "var(--accent-muted)",
  branch: "var(--success-bg)",
  "branch-bad": "var(--error-bg)",
};

// ── Card wrapper ──────────────────────────────────────────────────────

function Card({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #E5E5EA",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      <div
        onClick={collapsible ? () => setOpen((p) => !p) : undefined}
        style={{
          padding: "12px 16px",
          borderBottom: open ? "1px solid #E5E5EA" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: collapsible ? "pointer" : "default",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {title}
        </span>
        {collapsible && (
          <ChevronDown
            size={14}
            color="var(--text-tertiary)"
            style={{
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 150ms",
            }}
          />
        )}
      </div>
      {open && <div style={{ padding: 16 }}>{children}</div>}
    </div>
  );
}

// ── Script step ───────────────────────────────────────────────────────

function ScriptStep({
  step,
  fill,
  onCopy,
  copiedId,
  children,
}: {
  step: (typeof STEPS_K)[0];
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  const tagColors: Record<string, string> = {
    AKCJA: "var(--accent)",
    MÓWISZ: "var(--text-primary)",
    PYTASZ: "#7c3aed",
    UWAGA: "var(--warning)",
    GAŁĘZIE: "var(--success-text)",
    ZAMKNIĘCIE: "#16a34a",
    KALKULATOR: "#0d9488",
  };

  return (
    <div
      style={{
        marginBottom: 8,
        border: "1px solid #E5E5EA",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setOpen((p) => !p)}
        style={{
          padding: "10px 14px",
          background: open ? "rgba(10,132,255,0.03)" : "#fff",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            fontWeight: 800,
            color: "#AEAEB2",
            minWidth: 18,
          }}
        >
          {step.nr}
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            flex: 1,
          }}
        >
          {step.label}
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: tagColors[step.tag] ?? "var(--text-tertiary)",
            padding: "2px 7px",
            borderRadius: 4,
            background: `${tagColors[step.tag] ?? "var(--text-tertiary)"}15`,
          }}
        >
          {step.tag}
        </span>
        <ChevronDown
          size={13}
          color="var(--text-tertiary)"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
        />
      </div>
      {open && (
        <div style={{ padding: "8px 14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {step.lines.map((line, li) => (
            <div
              key={li}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 8,
                background: LINE_BG[line.t],
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                {line.t === "say" && (
                  <MessageSquare size={13} color="var(--accent)" strokeWidth={1.6} />
                )}
                {line.t === "client" && (
                  <Users size={13} color="var(--text-secondary)" strokeWidth={1.8} />
                )}
                {line.t === "note" && (
                  <AlertTriangle size={12} color="var(--warning)" strokeWidth={1.6} />
                )}
                {line.t === "action" && <Check size={12} color="var(--accent)" strokeWidth={2} />}
                {(line.t === "branch" || line.t === "branch-bad") && (
                  <Check size={12} color={LINE_COLOR[line.t]} strokeWidth={2} />
                )}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: LINE_COLOR[line.t],
                  flex: 1,
                }}
              >
                {fill(line.text)}
              </span>
              {line.t === "say" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(`${step.id}-${li}`, line.text);
                  }}
                  style={{
                    flexShrink: 0,
                    padding: "3px 7px",
                    borderRadius: 5,
                    border: "1px solid #E5E5EA",
                    background: "transparent",
                    cursor: "pointer",
                    color:
                      copiedId === `${step.id}-${li}`
                        ? "var(--success-text)"
                        : "var(--text-tertiary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 10,
                  }}
                >
                  {copiedId === `${step.id}-${li}` ? (
                    <CheckCircle2 size={10} />
                  ) : (
                    <Copy size={10} />
                  )}
                </button>
              )}
            </div>
          ))}
          {children && (
            <div style={{ borderTop: "1px solid #E5E5EA", marginTop: 4, paddingTop: 10 }}>
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Objections accordion ──────────────────────────────────────────────

function ObjectionsPanel({
  fill,
  onCopy,
  copiedId,
}: {
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {OBJECTIONS_K.map((obj) => {
        const oc = objectionColor(obj.label);
        const isOpen = openId === obj.id;
        return (
          <div
            key={obj.id}
            style={{
              border: "1px solid #E5E5EA",
              borderLeft: `3px solid ${oc.accent}`,
              borderRadius: 8,
              overflow: "hidden",
              background: isOpen ? oc.bg : "#fff",
            }}
          >
            <div
              onClick={() => setOpenId(isOpen ? null : obj.id)}
              style={{
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: oc.accent,
                    marginBottom: 1,
                  }}
                >
                  {oc.category}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {obj.label}
                </div>
              </div>
              <ChevronDown
                size={12}
                color="var(--text-tertiary)"
                style={{
                  transform: isOpen ? "rotate(180deg)" : "none",
                  transition: "transform 150ms",
                  flexShrink: 0,
                }}
              />
            </div>
            {isOpen && (
              <div
                style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}
              >
                {obj.script && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-sans)",
                        flex: 1,
                      }}
                    >
                      {fill(obj.script)}
                    </p>
                    <button
                      onClick={() => onCopy(`obj-${obj.id}-script`, obj.script!)}
                      style={{
                        flexShrink: 0,
                        padding: "3px 7px",
                        borderRadius: 5,
                        border: "1px solid #E5E5EA",
                        background: "transparent",
                        cursor: "pointer",
                        color:
                          copiedId === `obj-${obj.id}-script`
                            ? "var(--success-text)"
                            : "var(--text-tertiary)",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {copiedId === `obj-${obj.id}-script` ? (
                        <CheckCircle2 size={10} />
                      ) : (
                        <Copy size={10} />
                      )}
                    </button>
                  </div>
                )}
                {obj.followup && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: "var(--accent)",
                      fontFamily: "var(--font-sans)",
                      fontStyle: "italic",
                      borderTop: "1px solid #E5E5EA",
                      paddingTop: 8,
                    }}
                  >
                    {fill(obj.followup)}
                  </p>
                )}
                {obj.note && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-sans)",
                      background: "var(--warning-bg)",
                      padding: "6px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {obj.note}
                  </p>
                )}
                {obj.sms && (
                  <div
                    style={{
                      background: "var(--accent-muted)",
                      padding: "8px 10px",
                      borderRadius: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "var(--accent)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      SMS
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "var(--text-primary)",
                        lineHeight: 1.55,
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {fill(obj.sms)}
                    </p>
                  </div>
                )}
                {obj.extra && (
                  <div
                    style={{ background: "var(--bg-hover)", padding: "8px 10px", borderRadius: 6 }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Wiadomość prywatna
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "var(--text-primary)",
                        lineHeight: 1.55,
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {fill(obj.extra)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SMS templates ─────────────────────────────────────────────────────

function SmsPanel({
  fill,
  onCopy,
  copiedId,
}: {
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}) {
  const kwalItems = MESSAGES_DATA.sms.filter((m) => m.group === "Kwalifikacja");
  const fbItems = MESSAGES_DATA.fb;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 2,
        }}
      >
        SMS / WhatsApp
      </div>
      {kwalItems.map((item) => (
        <div key={item.id} style={{ background: "#F5F5F7", borderRadius: 8, padding: "10px 12px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: GROUP_COLORS[item.group] ?? "var(--accent)",
              marginBottom: 4,
            }}
          >
            {item.label}
          </div>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              lineHeight: 1.55,
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {fill(item.text)}
          </p>
          <button
            onClick={() => onCopy(`sms-${item.id}`, item.text)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #E5E5EA",
              background: "#fff",
              cursor: "pointer",
              fontSize: 11,
              color:
                copiedId === `sms-${item.id}` ? "var(--success-text)" : "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {copiedId === `sms-${item.id}` ? <CheckCircle2 size={11} /> : <Copy size={11} />}
            {copiedId === `sms-${item.id}` ? "Skopiowano" : "Kopiuj"}
          </button>
        </div>
      ))}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginTop: 8,
          marginBottom: 2,
        }}
      >
        Facebook
      </div>
      {fbItems.map((item) => (
        <div key={item.id} style={{ background: "#F5F5F7", borderRadius: 8, padding: "10px 12px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: GROUP_COLORS[item.group] ?? "var(--accent)",
              marginBottom: 4,
            }}
          >
            {item.label}
          </div>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              lineHeight: 1.55,
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {fill(item.text)}
          </p>
          <button
            onClick={() => onCopy(`fb-${item.id}`, item.text)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #E5E5EA",
              background: "#fff",
              cursor: "pointer",
              fontSize: 11,
              color: copiedId === `fb-${item.id}` ? "var(--success-text)" : "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {copiedId === `fb-${item.id}` ? <CheckCircle2 size={11} /> : <Copy size={11} />}
            {copiedId === `fb-${item.id}` ? "Skopiowano" : "Kopiuj"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── ICP Quick Reference ───────────────────────────────────────────────

function IcpPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ICP_RULES.map((rule, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 8,
            background: rule.ok ? "var(--success-bg)" : "var(--error-bg)",
            border: `1px solid ${rule.ok ? "var(--success-border)" : "var(--error-border)"}`,
          }}
        >
          <div style={{ flexShrink: 0, marginTop: 1 }}>
            {rule.ok ? (
              <Check size={12} color="var(--success-text)" strokeWidth={2.5} />
            ) : (
              <X size={12} color="var(--error)" strokeWidth={2.5} />
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: rule.ok ? "var(--success-text)" : "var(--error)",
                marginBottom: 1,
              }}
            >
              {rule.label}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                lineHeight: 1.45,
                fontFamily: "var(--font-sans)",
              }}
            >
              {rule.val}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dalsze kroki ──────────────────────────────────────────────────────

const CALENDLY_URL = "https://calendly.com/autorise";

function DalszeKroki({ client }: { client: PipelineClientDetailed | null }) {
  const [checks, setChecks] = useState({ calendly: false, sms: false });
  const toggle = (k: keyof typeof checks) => setChecks((p) => ({ ...p, [k]: !p[k] }));

  const Chk = ({ k, label }: { k: keyof typeof checks; label: string }) => (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div
        onClick={() => toggle(k)}
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: `1.5px solid ${checks[k] ? "var(--accent)" : "#D1D1D6"}`,
          background: checks[k] ? "var(--accent)" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          cursor: "pointer",
        }}
      >
        {checks[k] && <Check size={10} color="#fff" strokeWidth={2.5} />}
      </div>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-primary)" }}>
        {label}
      </span>
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Chk k="calendly" label="Link Calendly wysłany" />
        <Chk k="sms" label="SMS potwierdzający wysłany" />
      </div>
      <div style={{ height: 1, background: "#E5E5EA" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <a
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 14px",
            borderRadius: 8,
            border: "1px solid #E5E5EA",
            background: "#fff",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          <Phone size={13} color="var(--accent)" />
          Otwórz Calendly
        </a>
        <a
          href="/agenci"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 14px",
            borderRadius: 8,
            border: "1px solid var(--accent-border)",
            background: "var(--accent-muted)",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--accent)",
            fontFamily: "var(--font-sans)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          <MessageSquare size={13} color="var(--accent)" />
          Uruchom Agent 01 ({client ? client.kontakt || client.firma : "wybierz klienta"})
        </a>
      </div>
    </div>
  );
}

// ── Przypadki specjalne ───────────────────────────────────────────────

const SPECIAL_CASES = [
  {
    id: "prev",
    label: "Klient był wcześniej na starym skrypcie",
    content: [
      "Sprawdź Pipeline — czy ma notatkę z poprzedniej rozmowy.",
      "Zapytaj na początku: 'Rozmawialiśmy już — czy sytuacja się zmieniła od tamtej rozmowy?'",
      "Nie powtarzaj diagnozy jeśli ból jest potwierdzony — idź do ICP i zaproszenia.",
    ],
  },
  {
    id: "nobrak",
    label: "Klient nie odbiera (3 próby)",
    content: [
      "Wyślij SMS z szablonu 'Brak odbioru po 3 próbach'.",
      "Zmień status na 'Nieaktywny (follow up)'.",
      "Ustaw data re-engagement za 14 dni.",
    ],
  },
  {
    id: "reeng",
    label: "Klient wraca po re-engagement",
    content: [
      "Sprawdź notatkę z poprzedniej rozmowy w Pipeline.",
      "Zacznij od: 'Rozmawialiśmy [kiedy] — czy sytuacja się zmieniła?'",
      "Jeśli ból aktualny — skróć diagnozę i przejdź do ICP i zaproszenia.",
      "Jeśli sytuacja niezmieniona — zakwalifikuj lub odrzuć.",
    ],
  },
];

function PrzypadkiSpecjalne() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {SPECIAL_CASES.map((c) => (
        <div
          key={c.id}
          style={{ border: "1px solid #E5E5EA", borderRadius: 8, overflow: "hidden" }}
        >
          <div
            onClick={() => setOpenId(openId === c.id ? null : c.id)}
            style={{
              padding: "9px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              userSelect: "none",
              background: openId === c.id ? "#F5F5F7" : "#fff",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              {c.label}
            </span>
            <ChevronDown
              size={12}
              color="var(--text-tertiary)"
              style={{
                transform: openId === c.id ? "rotate(180deg)" : "none",
                transition: "transform 150ms",
              }}
            />
          </div>
          {openId === c.id && (
            <div style={{ padding: "8px 12px 12px" }}>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {c.content.map((line, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      marginBottom: 4,
                    }}
                  >
                    {line}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Left client sidebar ───────────────────────────────────────────────

function ClientSidebar({
  clients,
  loading,
  selected,
  onSelect,
  onRefresh,
}: {
  clients: PipelineClientDetailed[];
  loading: boolean;
  selected: PipelineClientDetailed | null;
  onSelect: (c: PipelineClientDetailed | null) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = clients
    .filter((c) => c.status === "Nowy lead")
    .filter((c) =>
      search.trim() ? `${c.kontakt} ${c.firma}`.toLowerCase().includes(search.toLowerCase()) : true,
    );

  return (
    <div
      style={{
        width: 240,
        minWidth: 240,
        height: "100%",
        borderRight: "1px solid #E5E5EA",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
      }}
    >
      <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #E5E5EA", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}
          >
            Nowy lead ({filtered.length})
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              background: "transparent",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              color: "var(--text-tertiary)",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <RefreshCw
              size={12}
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
            />
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: 32,
            background: "#F5F5F7",
            borderRadius: 8,
            padding: "0 10px",
          }}
        >
          <Search size={12} color="var(--text-tertiary)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj klienta..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
        {filtered.length === 0 && (
          <div
            style={{
              padding: "20px 8px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
            }}
          >
            Brak klientów "Nowy lead"
          </div>
        )}
        {filtered.map((c) => {
          const isSelected = selected?.id === c.id;
          return (
            <div
              key={c.id}
              onClick={() => onSelect(isSelected ? null : c)}
              style={{
                padding: "9px 10px",
                borderRadius: 8,
                marginBottom: 2,
                cursor: "pointer",
                background: isSelected ? "var(--accent-muted)" : "transparent",
                border: isSelected ? "1px solid var(--accent-border)" : "1px solid transparent",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: isSelected ? "var(--accent)" : "var(--text-primary)",
                  marginBottom: 2,
                }}
              >
                {c.kontakt || c.firma || "—"}
              </div>
              {c.firma && c.kontakt && c.firma !== c.kontakt && (
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{c.firma}</div>
              )}
              {c.telefon && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {formatPhone(c.telefon)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <div
          style={{
            padding: "10px 12px",
            borderTop: "1px solid #E5E5EA",
            flexShrink: 0,
            background: "#F5F5F7",
          }}
        >
          <button
            onClick={() => onSelect(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              fontSize: 11,
              fontFamily: "var(--font-sans)",
            }}
          >
            <X size={11} />
            Odznacz klienta
          </button>
        </div>
      )}
    </div>
  );
}

// ── Right panel ───────────────────────────────────────────────────────

function RightPanel({
  fill,
  onCopy,
  copiedId,
}: {
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}) {
  return (
    <div
      style={{
        width: 320,
        minWidth: 320,
        height: "100%",
        borderLeft: "1px solid #E5E5EA",
        overflowY: "auto",
        padding: "12px 12px",
        background: "#fff",
      }}
    >
      <Card title="Obiekcje kwalifikacja">
        <ObjectionsPanel fill={fill} onCopy={onCopy} copiedId={copiedId} />
      </Card>
      <Card title="SMS / Wiadomości" collapsible defaultOpen={false}>
        <SmsPanel fill={fill} onCopy={onCopy} copiedId={copiedId} />
      </Card>
      <Card title="ICP Quick Reference" collapsible defaultOpen={false}>
        <IcpPanel />
      </Card>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function KwalifikacjaPage() {
  const [clients, setClients] = useState<PipelineClientDetailed[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PipelineClientDetailed | null>(null);
  const [vocative, setVocative] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notion/pipeline");
      const data = await res.json();
      if (data.success) setClients(data.clients);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClients();
    const id = setInterval(() => void fetchClients(), 60_000);
    return () => clearInterval(id);
  }, [fetchClients]);

  useEffect(() => {
    if (selected) setVocative(toVocative(selected.kontakt || selected.firma || ""));
    else setVocative("");
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const saved = localStorage.getItem(`kwal_note_${selected?.id ?? "global"}`);
    setNote(saved ?? "");
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fill = (text: string): string => {
    let out = text;
    const nominative = (selected?.kontakt ?? "").trim().split(/\s+/)[0];
    if (nominative) {
      out = out.replace(/Pan \{IMIĘ\}/g, `Pan ${nominative}`);
      out = out.replace(/Pani \{IMIĘ\}/g, `Pani ${nominative}`);
    }
    if (vocative.trim()) out = out.replace(/\{IMIĘ\}/g, vocative.trim());
    return out;
  };

  const onCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(fill(text)).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          borderBottom: "1px solid #E5E5EA",
          background: "#fff",
          flexShrink: 0,
          gap: 16,
        }}
      >
        <Phone size={16} color="var(--accent)" strokeWidth={1.8} />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          Kwalifikacja
        </span>
        <div style={{ height: 20, width: 1, background: "#E5E5EA", marginLeft: 4 }} />
        <span
          style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-tertiary)" }}
        >
          {selected ? selected.kontakt || selected.firma : "Wybierz klienta z listy"}
        </span>
        {selected && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Forma grzecznościowa:
            </span>
            <input
              value={vocative}
              onChange={(e) => setVocative(e.target.value)}
              placeholder="wołacz imienia"
              style={{
                height: 32,
                padding: "0 10px",
                borderRadius: 8,
                border: "1px solid #E5E5EA",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-primary)",
                background: "#F5F5F7",
                outline: "none",
                width: 140,
              }}
            />
          </div>
        )}
      </div>

      {/* 3-column layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: client list */}
        <ClientSidebar
          clients={clients}
          loading={loading}
          selected={selected}
          onSelect={setSelected}
          onRefresh={fetchClients}
        />

        {/* Main: script + roi + dalsze kroki */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: "#F5F5F7" }}>
          <Card title="Skrypt kwalifikacyjny">
            {STEPS_K.map((step) => (
              <ScriptStep
                key={step.id}
                step={step}
                fill={fill}
                onCopy={onCopy}
                copiedId={copiedId}
              >
                {step.hasCalculator && (
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#0d9488",
                        marginBottom: 10,
                      }}
                    >
                      Kalkulator ROI — wypełniaj w trakcie rozmowy
                    </div>
                    <KalkulatorRoi
                      embedded
                      initialClientName={selected?.kontakt || selected?.firma || ""}
                    />
                  </div>
                )}
              </ScriptStep>
            ))}
          </Card>

          <Card title="Dalsze kroki">
            <DalszeKroki client={selected} />
          </Card>

          <Card title="Przypadki specjalne" collapsible defaultOpen={false}>
            <PrzypadkiSpecjalne />
          </Card>

          <Card title="Notatki z rozmowy" collapsible defaultOpen={false}>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                localStorage.setItem(`kwal_note_${selected?.id ?? "global"}`, e.target.value);
              }}
              placeholder="Notatki z rozmowy kwalifikacyjnej..."
              style={{
                width: "100%",
                minHeight: 120,
                resize: "vertical",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-primary)",
                border: "1px solid #E5E5EA",
                borderRadius: 8,
                padding: "10px 12px",
                background: "#fff",
                outline: "none",
                lineHeight: 1.55,
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <FileText size={11} color="var(--text-tertiary)" />
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Zapis automatyczny per klient
              </span>
            </div>
          </Card>
        </div>

        {/* Right: objections + SMS + ICP */}
        <RightPanel fill={fill} onCopy={onCopy} copiedId={copiedId} />
      </div>
    </div>
  );
}
