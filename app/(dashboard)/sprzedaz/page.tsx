"use client";

import {
  AlertTriangle,
  ArrowDown,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Monitor,
  RefreshCw,
  Search,
  Target,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GoogleTaskList } from "@/app/api/google/tasks/route";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { ProgressBar, SectionLabelSmall, StepCard } from "@/components/dalsze-kroki/DalszeKrokiUI";
import { KalkulatorRoi } from "@/components/kalkulator/KalkulatorRoi";
import { DecisionDiagram } from "@/components/scripts/DecisionDiagram";
import { NextStepArrow } from "@/components/scripts/NextStepArrow";
import { formatPhone } from "@/lib/format/phone";
import { DISCOVERY_STATUSES, OBJECTIONS_D, STEPS_D } from "@/lib/scripts/discovery";
import { GROUP_COLORS, MESSAGES_DATA } from "@/lib/scripts/messages";
import type { DecisionOption, ScriptLine } from "@/lib/scripts/types";
import { objectionColor } from "@/lib/scripts/types";

// ── Helpers ───────────────────────────────────────────────────────────

function toVocative(name: string): string {
  const first = name.trim().split(" ")[0];
  if (!first) return name;
  if (first.endsWith("ał")) return first.slice(0, -2) + "ale";
  if (first.endsWith("eł")) return first.slice(0, -2) + "le";
  if (first.endsWith("ek") && first.length > 3) return first.slice(0, -2) + "ku";
  if (first.endsWith("a") && first.length > 2) return first.slice(0, -1) + "o";
  return first;
}

function findStepLabelD(stepId: string): string {
  const step = STEPS_D.find((s) => s.id === stepId);
  return step ? `${step.nr} ${step.label}` : stepId;
}

const STATUS_COLORS: Record<string, string> = {
  Kwalifikacja: "#7c3aed",
  "Discovery umówione": "#0d9488",
  Finalizacja: "#d97706",
  Kickoff: "#16a34a",
  Wdrożenie: "#15803d",
  Retainer: "#166534",
  Upsell: "#8b5cf6",
};

// ── Line styles ───────────────────────────────────────────────────────

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
  onJump,
  onDecisionSelect,
}: {
  step: (typeof STEPS_D)[0];
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  onJump: (stepId: string) => void;
  onDecisionSelect: (option: DecisionOption) => void;
}) {
  const [open, setOpen] = useState(true);

  const tagColors: Record<string, string> = {
    AKCJA: "var(--accent)",
    MÓWISZ: "var(--text-primary)",
    PYTASZ: "#7c3aed",
    UWAGA: "var(--warning)",
    GAŁĘZIE: "var(--success-text)",
    ZAMKNIĘCIE: "#16a34a",
    PARAFRAZA: "#0d9488",
  };

  return (
    <div
      id={`step-${step.id}`}
      style={{
        marginBottom: 8,
        border: "1px solid #E5E5EA",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {(step.decision || step.nextStepId) && (
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            color: "var(--text-tertiary)",
            padding: "5px 14px",
            background: "#FAFAFA",
            borderBottom: "1px solid #E5E5EA",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ArrowDown size={10} />
          {step.decision
            ? `Dalej: ${step.decision.options.map((o) => o.trigger).join(" / ")}`
            : `Dalej: ${findStepLabelD(step.nextStepId!)}`}
        </div>
      )}
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
            minWidth: 20,
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
        {step.duration && (
          <span
            style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}
          >
            {step.duration}
          </span>
        )}
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
              <div style={{ flex: 1 }}>
                {(Array.isArray(line.text) ? line.text : [line.text]).map((paragraph, pi) => (
                  <p
                    key={pi}
                    style={{
                      margin: pi === 0 ? 0 : "6px 0 0 0",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: LINE_COLOR[line.t],
                    }}
                  >
                    {fill(paragraph)}
                  </p>
                ))}
                {line.t === "say" && line.cel && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      fontStyle: "italic",
                      marginTop: 2,
                      paddingLeft: 8,
                      borderLeft: "2px solid var(--border)",
                    }}
                  >
                    Cel: {line.cel}
                  </div>
                )}
              </div>
              {line.t === "say" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(
                      `${step.id}-${li}`,
                      Array.isArray(line.text) ? line.text.join(" ") : line.text,
                    );
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
          {step.decision && (
            <DecisionDiagram decision={step.decision} onSelect={onDecisionSelect} />
          )}
          {!step.decision && step.nextStepId && (
            <NextStepArrow label="Dalej" onJump={() => onJump(step.nextStepId!)} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Brief Agent 02 ────────────────────────────────────────────────────

function BriefSection({ client }: { client: PipelineClientDetailed | null }) {
  if (!client) {
    return (
      <div
        style={{
          padding: "20px 0",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: 13,
          fontFamily: "var(--font-sans)",
        }}
      >
        Wybierz klienta, aby zobaczyć Brief Agenta 02.
      </div>
    );
  }

  const hasBrief = !!(client.uwagiFAgent2 || client.hipotezaBolGlowny || client.pitchRecipe);

  if (!hasBrief) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            padding: "14px 16px",
            background: "var(--warning-bg)",
            border: "1px solid var(--warning-border)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--warning)",
            fontFamily: "var(--font-sans)",
          }}
        >
          Brief Agenta 02 nie jest dostępny dla tego klienta. Uruchom Agenta 02 na stronie Agenci
          AI.
        </div>
        <a
          href="/agenci"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--accent-border)",
            background: "var(--accent-muted)",
            color: "var(--accent)",
            textDecoration: "none",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <ExternalLink size={13} />
          Uruchom Agent 02 dla {client.kontakt || client.firma}
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {client.hipotezaBolGlowny && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: 6,
            }}
          >
            Hipoteza bólu głównego
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.65,
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              whiteSpace: "pre-wrap",
            }}
          >
            {client.hipotezaBolGlowny}
          </p>
        </div>
      )}
      {client.pitchRecipe && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: 6,
            }}
          >
            Pitch Recipe
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.65,
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              whiteSpace: "pre-wrap",
            }}
          >
            {client.pitchRecipe}
          </p>
        </div>
      )}
      {client.przewidywaneObiekcje && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: 6,
            }}
          >
            Przewidywane obiekcje
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.65,
              color: "var(--warning)",
              fontFamily: "var(--font-sans)",
              whiteSpace: "pre-wrap",
            }}
          >
            {client.przewidywaneObiekcje}
          </p>
        </div>
      )}
      {client.uwagiFAgent2 && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: 6,
            }}
          >
            Uwagi Agenta 02
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.65,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              whiteSpace: "pre-wrap",
            }}
          >
            {client.uwagiFAgent2}
          </p>
        </div>
      )}
      <a
        href="/agenci"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 12px",
          borderRadius: 7,
          border: "1px solid #E5E5EA",
          background: "transparent",
          color: "var(--text-secondary)",
          textDecoration: "none",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
        }}
      >
        <ExternalLink size={11} />
        Otwórz w Agenci AI
      </a>
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
      {OBJECTIONS_D.map((obj) => {
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SMS panel ─────────────────────────────────────────────────────────

function SmsPanel({
  fill,
  onCopy,
  copiedId,
}: {
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}) {
  const discoveryItems = MESSAGES_DATA.sms.filter((m) =>
    ["Przed Discovery", "Po Discovery"].includes(m.group),
  );
  const telefonItems = MESSAGES_DATA.telefon;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {["Przed Discovery", "Po Discovery"].map((group) => {
        const items = discoveryItems.filter((m) => m.group === group);
        if (!items.length) return null;
        return (
          <div key={group}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: GROUP_COLORS[group] ?? "var(--text-tertiary)",
                marginBottom: 6,
              }}
            >
              {group}
            </div>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "#F5F5F7",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
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
                      copiedId === `sms-${item.id}`
                        ? "var(--success-text)"
                        : "var(--text-secondary)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {copiedId === `sms-${item.id}` ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                  {copiedId === `sms-${item.id}` ? "Skopiowano" : "Kopiuj"}
                </button>
              </div>
            ))}
          </div>
        );
      })}
      {telefonItems.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: 6,
            }}
          >
            Skrypty telefoniczne
          </div>
          {telefonItems.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#F5F5F7",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
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
                onClick={() => onCopy(`tel-${item.id}`, item.text)}
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
                    copiedId === `tel-${item.id}` ? "var(--success-text)" : "var(--text-secondary)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {copiedId === `tel-${item.id}` ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                {copiedId === `tel-${item.id}` ? "Skopiowano" : "Kopiuj"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Prezentacja sync ──────────────────────────────────────────────────

function PrezentacjaSection({ client }: { client: PipelineClientDetailed | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          padding: "10px 12px",
          background: "#F5F5F7",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Monitor size={14} color="var(--accent)" />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Prezentacja personalizowana
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
            {client ? `Agent 03 dla: ${client.kontakt || client.firma}` : "Wybierz klienta"}
          </div>
        </div>
        <a
          href="/agenci"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 10px",
            borderRadius: 7,
            border: "1px solid var(--accent-border)",
            background: "var(--accent-muted)",
            color: "var(--accent)",
            textDecoration: "none",
            fontSize: 11,
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          <ExternalLink size={11} />
          Agent 03
        </a>
      </div>
      <div
        style={{
          padding: "10px 12px",
          background: "#F5F5F7",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Target size={14} color="var(--success-text)" />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Pipeline klienta
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
            Status, notatki, historia kontaktu
          </div>
        </div>
        <a
          href="/pipeline"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 10px",
            borderRadius: 7,
            border: "1px solid #E5E5EA",
            background: "transparent",
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontSize: 11,
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          <ExternalLink size={11} />
          Pipeline
        </a>
      </div>
    </div>
  );
}

// ── Dalsze kroki Discovery ────────────────────────────────────────────

const DALSZE_KROKI_DISCOVERY_LABELS: Record<"fathom" | "brief" | "agent3" | "closing", string> = {
  fathom: "Fathom włączony przed spotkaniem",
  brief: "Brief Agenta 02 przeczytany",
  agent3: "Prezentacja zaktualizowana przez Agenta 03",
  closing: "Closing i cena zamknięte na tym spotkaniu",
};

function DalszeKrokiDiscovery({ client }: { client: PipelineClientDetailed | null }) {
  const [checks, setChecks] = useState({
    fathom: false,
    brief: false,
    agent3: false,
    closing: false,
  });
  const toggle = (k: keyof typeof checks) => setChecks((p) => ({ ...p, [k]: !p[k] }));
  const [reminderOn, setReminderOn] = useState(false);
  const [extraContext, setExtraContext] = useState("");
  const [taskLists, setTaskLists] = useState<GoogleTaskList[] | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [taskSaved, setTaskSaved] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const doneCount = Object.values(checks).filter(Boolean).length;
  const totalCount = Object.keys(checks).length;

  const saveDalszeKroki = async () => {
    setSavingTask(true);
    setTaskError(null);
    try {
      let lists = taskLists;
      if (!lists) {
        const res = await fetch("/api/google/tasks");
        const data = (await res.json()) as { lists?: GoogleTaskList[]; error?: string };
        if (data.error || !data.lists) throw new Error(data.error ?? "Brak list zadań Google");
        lists = data.lists;
        setTaskLists(lists);
      }
      const targetList = lists.find((l) => l.title.toLowerCase().includes("autorise")) ?? lists[0];
      if (!targetList) throw new Error("Brak dostępnej listy zadań");
      const checkedLabels = (["fathom", "brief", "agent3", "closing"] as const)
        .filter((k) => checks[k])
        .map((k) => DALSZE_KROKI_DISCOVERY_LABELS[k]);
      const title = `Discovery ${client?.kontakt || client?.firma || "klient"} — ${
        checkedLabels.length ? checkedLabels.join(", ") : "follow-up"
      }`;
      const res = await fetch("/api/google/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: targetList.id,
          title,
          notes: extraContext.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Nie udało się zapisać zadania");
      setTaskSaved(true);
      setTimeout(() => setTaskSaved(false), 2500);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : "Błąd zapisu zadania");
    } finally {
      setSavingTask(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <ProgressBar doneCount={doneCount} totalCount={totalCount} />

      <SectionLabelSmall>Teraz</SectionLabelSmall>
      <StepCard
        done={checks.fathom}
        label={DALSZE_KROKI_DISCOVERY_LABELS.fathom}
        onToggle={() => toggle("fathom")}
      />
      <StepCard
        done={checks.brief}
        label={DALSZE_KROKI_DISCOVERY_LABELS.brief}
        onToggle={() => toggle("brief")}
      />
      <StepCard
        done={checks.agent3}
        label={DALSZE_KROKI_DISCOVERY_LABELS.agent3}
        onToggle={() => toggle("agent3")}
      />
      <StepCard
        done={checks.closing}
        label={DALSZE_KROKI_DISCOVERY_LABELS.closing}
        detail={client ? client.kontakt || client.firma : "wybierz klienta"}
        onToggle={() => toggle("closing")}
        actionLabel="Agent 04"
        onAction={() => window.open("/agenci", "_blank")}
      />

      <div style={{ height: 1, background: "var(--border)", margin: "8px 0 12px" }} />

      <SectionLabelSmall>Przypomnienie</SectionLabelSmall>
      <StepCard
        done={reminderOn}
        label="Dodaj do Zadań"
        onToggle={() => setReminderOn((p) => !p)}
      />
      {reminderOn && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: -2 }}>
          <textarea
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder="Dodatkowy kontekst do zadania (opcjonalnie)..."
            style={{
              minHeight: 60,
              resize: "vertical",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 10px",
              outline: "none",
              background: "var(--bg-card)",
            }}
          />
          <button
            onClick={saveDalszeKroki}
            disabled={savingTask}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              cursor: savingTask ? "not-allowed" : "pointer",
              fontSize: 13,
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
            }}
          >
            {savingTask ? "Zapisywanie..." : "Zapisz przypomnienie"}
          </button>
          {taskSaved && (
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--success-text)",
              }}
            >
              Dodano do Zadań (Autorise)
            </div>
          )}
          {taskError && (
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--error)" }}>
              {taskError}
            </div>
          )}
        </div>
      )}

      <div style={{ height: 1, background: "var(--border)", margin: "12px 0 8px" }} />
      <a
        href="/pipeline"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 14px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "transparent",
          cursor: "pointer",
          fontSize: 13,
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        <Target size={13} color="var(--text-secondary)" />
        Przejdź do Pipeline
      </a>
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
    .filter((c) => DISCOVERY_STATUSES.includes(c.status ?? ""))
    .filter((c) =>
      search.trim() ? `${c.kontakt} ${c.firma}`.toLowerCase().includes(search.toLowerCase()) : true,
    );

  // Group by status
  const grouped = DISCOVERY_STATUSES.reduce<Record<string, PipelineClientDetailed[]>>((acc, s) => {
    acc[s] = filtered.filter((c) => c.status === s);
    return acc;
  }, {});

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
            Klienci ({filtered.length})
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
        {DISCOVERY_STATUSES.map((status) => {
          const group = grouped[status] ?? [];
          if (!group.length) return null;
          const color = STATUS_COLORS[status] ?? "var(--text-tertiary)";
          return (
            <div key={status} style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color,
                  padding: "3px 8px 4px",
                }}
              >
                {status} ({group.length})
              </div>
              {group.map((c) => {
                const isSelected = selected?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => onSelect(isSelected ? null : c)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      marginBottom: 2,
                      cursor: "pointer",
                      background: isSelected ? "var(--accent-muted)" : "transparent",
                      border: isSelected
                        ? "1px solid var(--accent-border)"
                        : "1px solid transparent",
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
                          marginTop: 1,
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
          );
        })}
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
            Brak klientów Discovery
          </div>
        )}
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
  client,
  fill,
  onCopy,
  copiedId,
}: {
  client: PipelineClientDetailed | null;
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
      <Card title="Obiekcje Discovery">
        <ObjectionsPanel fill={fill} onCopy={onCopy} copiedId={copiedId} />
      </Card>
      <Card title="SMS / Wiadomości" collapsible defaultOpen={false}>
        <SmsPanel fill={fill} onCopy={onCopy} copiedId={copiedId} />
      </Card>
      <Card title="Prezentacja i synchronizacja" collapsible defaultOpen={false}>
        <PrezentacjaSection client={client} />
      </Card>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function SprzedazPage() {
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
    const saved = localStorage.getItem(`discovery_note_${selected?.id ?? "global"}`);
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
    if (selected) {
      const bolGlowny = selected.bolGlowny?.trim() ?? "";
      const kwalNote = selected.nastepnyKrok?.trim() ?? "";
      out = out.replace(
        /\[podsumowanie z kwalifikacji\]/g,
        bolGlowny
          ? `„${bolGlowny}"`
          : kwalNote
            ? `„${kwalNote}"`
            : "— brak danych z kwalifikacji —",
      );
      out = out.replace(/\[kwota roczna\]/g, "— policz z kalkulatorem ROI —");
      out = out.replace(/\[kwota\]/g, "— policz z kalkulatorem ROI —");
    }
    return out;
  };

  const onCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(fill(text)).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const jumpToStep = useCallback((stepId: string) => {
    const el = document.getElementById(`step-${stepId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.style.transition = "box-shadow 250ms, background-color 250ms";
    el.style.boxShadow = "0 0 0 2px var(--accent)";
    el.style.backgroundColor = "rgba(10,132,255,0.08)";
    setTimeout(() => {
      el.style.boxShadow = "";
      el.style.backgroundColor = "";
    }, 2000);
  }, []);

  const handleDecisionSelect = useCallback(
    (option: DecisionOption) => {
      if (option.goToStepId) jumpToStep(option.goToStepId);
    },
    [jumpToStep],
  );

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
        <Target size={16} color="var(--accent)" strokeWidth={1.8} />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          Sprzedaż
        </span>
        <div style={{ height: 20, width: 1, background: "#E5E5EA", marginLeft: 4 }} />
        <span
          style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-tertiary)" }}
        >
          {selected ? selected.kontakt || selected.firma : "Discovery Call"}
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

        {/* Main: brief + script + roi + dalsze kroki */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: "#F5F5F7" }}>
          <Card title="Brief Agenta 02" collapsible defaultOpen={true}>
            <BriefSection client={selected} />
          </Card>

          <Card title="Skrypt Discovery">
            {STEPS_D.map((step) => (
              <ScriptStep
                key={step.id}
                step={step}
                fill={fill}
                onCopy={onCopy}
                copiedId={copiedId}
                onJump={jumpToStep}
                onDecisionSelect={handleDecisionSelect}
              />
            ))}
          </Card>

          <Card title="Kalkulator ROI" collapsible defaultOpen={false}>
            <KalkulatorRoi
              embedded
              initialClientName={selected?.kontakt || selected?.firma || ""}
            />
          </Card>

          <Card title="Dalsze kroki po Discovery">
            <DalszeKrokiDiscovery client={selected} />
          </Card>

          <Card title="Notatki z Discovery" collapsible defaultOpen={false}>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                localStorage.setItem(`discovery_note_${selected?.id ?? "global"}`, e.target.value);
              }}
              placeholder="Notatki ze spotkania Discovery..."
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

        {/* Right: objections + SMS + prezentacja */}
        <RightPanel client={selected} fill={fill} onCopy={onCopy} copiedId={copiedId} />
      </div>
    </div>
  );
}
