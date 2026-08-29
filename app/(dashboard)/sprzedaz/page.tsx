"use client";

import {
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Monitor,
  PhoneOff,
  Target,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GoogleTaskList } from "@/app/api/google/tasks/route";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { ClientSidebar } from "@/components/clients/ClientSidebar";
import { ProgressBar, SectionLabelSmall, StepCard } from "@/components/dalsze-kroki/DalszeKrokiUI";
import { DecisionDiagram } from "@/components/scripts/DecisionDiagram";
import {
  answerParagraphs,
  CollapsibleAnswer,
  ExpectedBlock,
  ScriptLineRow,
  SectionCap,
  StepHeaderPill,
  TransitionBlock,
} from "@/components/scripts/ScriptStepShared";
import { AnalizaPrzedkontraktowaPanel } from "@/components/sprzedaz/AnalizaPrzedkontraktowaPanel";
import { WarunkiUmowyForm } from "@/components/sprzedaz/WarunkiUmowyForm";
import { fillBrief, parseCytatyKlienta } from "@/lib/scripts/fillBrief";
import { useFormaGrzecznosciowa } from "@/lib/scripts/formaGrzecznosciowa";
import { GROUP_COLORS, MESSAGES_DATA } from "@/lib/scripts/messages";
import { OBJECTIONS_D, STEPS_D } from "@/lib/scripts/sprzedaz";
import type { DecisionOption, Objection } from "@/lib/scripts/types";
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

// Minimalny, wyselekcjonowany zestaw obiekcji przypięty do KONKRETNEGO kroku — ten sam wzór
// co STEP_OBJECTIONS w /kwalifikacja (przeniesienie z osobnego, zawsze-widocznego prawego
// panelu do kroków w których realnie padają, 2026-08-29). Sub-obiekcje otwierane przez
// decision.openObjectionId nadrzędnej obiekcji (np. od1 → od1_finanse) muszą siedzieć w TYM
// SAMYM kroku co rodzic, inaczej jumpToObjection nie znajdzie elementu DOM do przewinięcia —
// stąd close_c ma cały klaster cenowy razem, nie tylko obiekcje najwyższego poziomu.
const STEP_OBJECTIONS_D: Record<string, string[]> = {
  podsumowanie_kwal: ["juz_mowilem"],
  info: ["od8"],
  proby: ["od7"],
  pitch: ["od6", "od9", "konkurencja_m365_d", "od23"],
  close_c: [
    "od1",
    "od1_watpliwosc",
    "od1_finanse",
    "od1_partner",
    "od3",
    "od3_logistyka",
    "od3_wartosc",
    "od3_konkurencja",
    "od10",
    "od11",
    "od14",
    "od17",
    "od22",
    "od24",
  ],
  closing: ["od4", "od5", "od19", "od20", "od21", "od1_pozniej"],
  warunki_umowy: ["od12", "od13", "od15", "od18"],
};

// ── Card wrapper ──────────────────────────────────────────────────────

// Card wzorem 1:1 z /kwalifikacja (border rgba, --radius-md, --shadow-sm) — poprzednia
// wersja (--bg-card, --border, radius 12 na sztywno) dawała wizualnie inną kartę niż
// kwalifikacja mimo identycznej nazwy komponentu (Michał, 2026-08-29).
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
        background: "var(--bg-elevated)",
        border: "1px solid rgba(255,255,255,0.42)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      <div
        onClick={collapsible ? () => setOpen((p) => !p) : undefined}
        style={{
          padding: "12px 16px",
          borderBottom: open ? "1px solid var(--border)" : "none",
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

// Kolor plakietki etapu — jedna spójna barwa dla całego Discovery (kwalifikacja rezerwuje
// niebieski #3b82f6 wyłącznie dla opener/"NOWY LEAD", tu nie ma odpowiednika statusu
// Pipeline do podświetlenia, więc cały skrypt dostaje jednolity akcent #4379b1).
const STEP_PILL_COLOR = "#4379b1";

function ScriptStep({
  step,
  fill,
  onJump,
  onDecisionSelect,
  selectedTrigger,
  openObjectionId,
  setOpenObjectionId,
  selectedOptions,
}: {
  step: (typeof STEPS_D)[0];
  fill: (t: string) => string;
  onJump: (stepId: string) => void;
  onDecisionSelect: (stepId: string, option: DecisionOption) => void;
  selectedTrigger?: string;
  openObjectionId: string | null;
  setOpenObjectionId: (id: string | null) => void;
  selectedOptions: Record<string, string>;
}) {
  const [open, setOpen] = useState(true);
  const stepObjections = STEP_OBJECTIONS_D[step.id] ?? [];

  return (
    <div
      id={`step-${step.id}`}
      style={{
        marginBottom: 10,
        border: "1px solid rgba(255,255,255,0.42)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-elevated)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setOpen((p) => !p)}
        style={{
          padding: "12px 14px",
          background: open ? "rgba(67, 121, 177, 0.04)" : "transparent",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <StepHeaderPill color={STEP_PILL_COLOR} label={step.label} />
        <span style={{ flex: 1 }} />
        {step.tag && step.tag !== "MÓWISZ" && (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}
          >
            {step.tag}
          </span>
        )}
        <ChevronDown
          size={13}
          color="var(--text-tertiary)"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
        />
      </div>
      {open && (
        <div style={{ padding: "8px 14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {step.lines.map((line, li) => (
            <ScriptLineRow key={li} line={line} fill={fill} />
          ))}

          {step.expected && <ExpectedBlock text={fill(step.expected)} />}

          {step.transition && <TransitionBlock text={fill(step.transition)} idPrefix={step.id} />}

          {step.decision && (
            <DecisionDiagram
              decision={step.decision}
              onSelect={(option) => onDecisionSelect(step.id, option)}
              onJump={onJump}
              selectedTrigger={selectedTrigger}
            />
          )}

          {stepObjections.length > 0 && (
            <>
              <SectionCap>Możliwe obiekcje</SectionCap>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {stepObjections.map((objId) => {
                  const obj = OBJECTIONS_D.find((o) => o.id === objId);
                  if (!obj) return null;
                  return (
                    <ObjectionRow
                      key={obj.id}
                      obj={obj}
                      openId={openObjectionId}
                      setOpenId={setOpenObjectionId}
                      fill={fill}
                      onDecisionSelect={onDecisionSelect}
                      selectedOptions={selectedOptions}
                      onJump={onJump}
                    />
                  );
                })}
              </div>
            </>
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
  const cytaty = parseCytatyKlienta(client.cytatyKlienta);

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
            color: "var(--warning-text)",
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
            color: "var(--accent-text)",
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
            {fillBrief(client.hipotezaBolGlowny, client)}
          </p>
        </div>
      )}
      {cytaty.length > 0 && (
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
            Cytaty klienta
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cytaty.map((c, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--bg-hover)",
                  border: "1px solid var(--border)",
                  borderLeft: "3px solid var(--accent)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-sans)",
                    fontStyle: "italic",
                  }}
                >
                  „{c.cytat}"
                </p>
                {c.kontekst && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {c.kontekst}
                  </p>
                )}
              </div>
            ))}
          </div>
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
            {fillBrief(client.pitchRecipe, client)}
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
              color: "var(--warning-text)",
              fontFamily: "var(--font-sans)",
              whiteSpace: "pre-wrap",
            }}
          >
            {fillBrief(client.przewidywaneObiekcje, client)}
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
          border: "1px solid var(--border)",
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
// Przeniesione 2026-08-29 z osobnego, zawsze-widocznego prawego panelu (grupowanego wg stage)
// do kroków skryptu w których dana obiekcja realnie pada — ten sam wzór co STEP_OBJECTIONS w
// /kwalifikacja (patrz STEP_OBJECTIONS_D wyżej). renderObjectionD zostaje bez zmian, wołane
// teraz z wnętrza ScriptStep zamiast z osobnego ObjectionsPanel.

// Jeden wiersz obiekcji — wzór 1:1 z CollapsibleAnswer w /kwalifikacja (patrz
// ScriptStepShared.tsx), rozszerzony o to czego kwalifikacja nie potrzebuje: decyzję
// rozgałęziającą do sub-obiekcji (od1 -> od1_finanse) i opcjonalny SMS. `id` na elemencie
// DOM zostaje, bo jumpToObjection() w tej stronie przewija do niego po id, niezależnie od
// tego w którym kroku dana obiekcja fizycznie siedzi.
function ObjectionRow({
  obj,
  openId,
  setOpenId,
  fill,
  onDecisionSelect,
  selectedOptions,
  onJump,
}: {
  obj: Objection;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  fill: (t: string) => string;
  onDecisionSelect: (objectionId: string, option: DecisionOption) => void;
  selectedOptions: Record<string, string>;
  onJump: (stepId: string) => void;
}) {
  const oc = objectionColor(obj.label);
  const isOpen = openId === obj.id;
  return (
    <CollapsibleAnswer
      id={`objection-${obj.id}`}
      label={obj.label}
      sublabel={oc.category}
      open={isOpen}
      onToggle={() => setOpenId(isOpen ? null : obj.id)}
    >
      {obj.script && answerParagraphs(fill(obj.script), `obj-${obj.id}-s`)}
      {obj.followup && (
        <div style={{ marginTop: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--accent)",
            }}
          >
            Jeśli nadal naciska:
          </span>
          {answerParagraphs(fill(obj.followup), `obj-${obj.id}-f`)}
        </div>
      )}
      {obj.decision && (
        <div style={{ marginTop: 10 }}>
          <DecisionDiagram
            decision={obj.decision}
            onSelect={(option) => onDecisionSelect(obj.id, option)}
            onJump={onJump}
            selectedTrigger={selectedOptions[obj.id]}
          />
        </div>
      )}
      {obj.note && (
        <p
          style={{
            margin: "10px 0 0",
            fontFamily: "var(--font-sans)",
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--text-tertiary)",
          }}
        >
          {obj.note}
        </p>
      )}
      {obj.sms && (
        <div
          style={{
            marginTop: 10,
            background: "var(--accent-muted)",
            border: "1px solid var(--accent-border)",
            padding: "10px 12px",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "var(--accent-text)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            SMS
          </div>
          {answerParagraphs(fill(obj.sms), `obj-${obj.id}-sms`)}
        </div>
      )}
    </CollapsibleAnswer>
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
                  background: "var(--bg)",
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
                    border: "1px solid var(--border)",
                    background: "var(--bg-elevated)",
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
                background: "var(--bg)",
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
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
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
          background: "var(--bg)",
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
            color: "var(--accent-text)",
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
          background: "var(--bg)",
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
            border: "1px solid var(--border)",
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

const DALSZE_KROKI_DISCOVERY_LABELS: Record<
  "fathom" | "brief" | "agent3" | "reminderSms" | "closing",
  string
> = {
  fathom: "Fathom włączony przed spotkaniem",
  brief: "Brief Agenta 02 przeczytany",
  agent3: "Prezentacja zaktualizowana przez Agenta 03",
  reminderSms: "Wyślij przypomnienie dzień przed",
  closing: "Closing i cena zamknięte na tym spotkaniu",
};

const smsPrzypomnienieTekstDiscovery = (clientName: string) =>
  (MESSAGES_DATA.sms.find((m) => m.id === "m3")?.text ?? "").replace(
    /\{IMIĘ\}/g,
    clientName || "[Imię]",
  );

function DalszeKrokiDiscovery({ client }: { client: PipelineClientDetailed | null }) {
  const [checks, setChecks] = useState({
    fathom: false,
    brief: false,
    agent3: false,
    reminderSms: false,
    closing: false,
  });
  const toggle = (k: keyof typeof checks) => setChecks((p) => ({ ...p, [k]: !p[k] }));
  const [reminderSmsExpanded, setReminderSmsExpanded] = useState(false);
  const [reminderSmsCopied, setReminderSmsCopied] = useState(false);
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
      const checkedLabels = (["fathom", "brief", "agent3", "reminderSms", "closing"] as const)
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

      {/* Przemianowane z "Teraz" (2026-08-29, Michał: "te dalsze kroki po discovery to są
          przecież kroki przed discovery") — Fathom/brief/prezentacja/przypomnienie to
          przygotowanie DO rozmowy, nie coś co robi się po jej zakończeniu. Karta nazywa się
          "Dalsze kroki po Discovery", ale realnie obejmuje cały cykl wokół spotkania, więc
          dzieli się teraz jawnie na dwie fazy zamiast udawać że wszystko jest "po". */}
      <SectionLabelSmall>Przed spotkaniem</SectionLabelSmall>
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
        done={checks.reminderSms}
        label={DALSZE_KROKI_DISCOVERY_LABELS.reminderSms}
        onToggle={() => toggle("reminderSms")}
        actionLabel={reminderSmsExpanded ? "Ukryj" : "Pokaż SMS"}
        onAction={() => setReminderSmsExpanded((p) => !p)}
      />
      {reminderSmsExpanded && (
        <div
          style={{
            marginTop: -2,
            marginBottom: 8,
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--bg)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              lineHeight: 1.55,
              color: "var(--text-primary)",
            }}
          >
            {smsPrzypomnienieTekstDiscovery(client?.kontakt?.split(" ")[0] ?? "")}
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                smsPrzypomnienieTekstDiscovery(client?.kontakt?.split(" ")[0] ?? ""),
              );
              setReminderSmsCopied(true);
              setTimeout(() => setReminderSmsCopied(false), 1500);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: reminderSmsCopied ? "var(--success-text)" : "var(--text-secondary)",
            }}
          >
            {reminderSmsCopied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
            Kopiuj
          </button>
        </div>
      )}

      <div style={{ height: 1, background: "var(--border)", margin: "8px 0 12px" }} />

      <SectionLabelSmall>Po spotkaniu</SectionLabelSmall>
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
              color: "var(--text-on-accent)",
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
            <div
              style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--error-text)" }}
            >
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

// ── Right panel ───────────────────────────────────────────────────────

// Obiekcje przeniesione do kroków skryptu (STEP_OBJECTIONS_D) — ten sam wzór co RightPanel
// w /kwalifikacja, który po tej samej przebudowie zostaje wyłącznie z frazami/SMS/ICP.
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
        borderLeft: "1px solid var(--border)",
        overflowY: "auto",
        padding: "12px 12px",
        background: "var(--bg-elevated)",
      }}
    >
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
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [openObjectionId, setOpenObjectionId] = useState<string | null>(null);

  // No-show na klientach Discovery — przeniesione 2026-08-29 z osobnego banera w treści
  // strony (NoShowBanner) do przycisku w headerze, w tym samym miejscu i tej samej formie
  // wizualnej co "Zarejestruj rozmowę" w /kwalifikacja. Zapisuje realną wartość "NO-SHOW"
  // do pola "Wynik Discovery" w Notion (ten sam PATCH co WarunkiUmowyForm), więc show rate
  // w /statystyki liczy się z faktu, nie z domysłu.
  const [noShowSaving, setNoShowSaving] = useState(false);
  const isNoShow = selected?.wynikDiscovery === "NO-SHOW";
  const toggleNoShow = useCallback(async () => {
    if (!selected) return;
    setNoShowSaving(true);
    const next = isNoShow ? null : "NO-SHOW";
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: selected.id, wynikDiscovery: next }),
      });
      const patch = { wynikDiscovery: next ?? "" };
      setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
      setClients((prev) => prev.map((c) => (c.id === selected.id ? { ...c, ...patch } : c)));
    } finally {
      setNoShowSaving(false);
    }
  }, [selected, isNoShow]);

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
    setSelectedOptions({});
    setOpenObjectionId(null);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const saved = localStorage.getItem(`discovery_note_${selected?.id ?? "global"}`);
    setNote(saved ?? "");
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstName = (selected?.kontakt || selected?.firma || "").trim().split(/\s+/)[0] ?? "";
  const { forma, formaOverride, setFormaOverride } = useFormaGrzecznosciowa(
    firstName,
    selected?.id,
  );

  const fill = (text: string): string => {
    let out = text;
    const nominative = (selected?.kontakt || selected?.firma || "").trim().split(/\s+/)[0];
    if (nominative) {
      out = out.replace(/Pan \{IMIĘ\}/g, `${forma} ${nominative}`);
      out = out.replace(/Pani \{IMIĘ\}/g, `${forma} ${nominative}`);
    }
    out = out.replace(/\{FORMA\}/g, forma);
    if (vocative.trim()) out = out.replace(/\{IMIĘ\}/g, vocative.trim());

    // Cały skrypt reaguje na przełącznik Pan/Pani, tak jak w /kwalifikacja (patrz fill() w
    // app/(dashboard)/kwalifikacja/page.tsx) — bez tego niemal cała treść STEPS_D/OBJECTIONS_D
    // zostaje twardo w formie męskiej ("Pana", "Panu", "Panem"), bo tekst skryptu jest pisany
    // z myślą o kliencie-mężczyźnie i tylko nieliczne linie używają placeholdera {FORMA}.
    if (forma === "Pani") {
      out = out
        .replace(/\bPanem\b/g, "Panią")
        .replace(/\bPanie\b/g, "Pani")
        .replace(/\bPanu\b/g, "Pani")
        .replace(/\bPana\b/g, "Pani")
        .replace(/\bPan\b/g, "Pani");

      const fem = (stem: string) => `${stem}a`;
      out = out.replace(/\bPani sam\b/g, "Pani sama").replace(/\bsam Pani\b/g, "sama Pani");
      out = out.replace(
        /\b([a-ząćęłńóśźż]+ł)(by)?((?:\s+(?:się|sobie))?)\s+Pani\b/gi,
        (_m, stem: string, by = "", refl = "") => `${fem(stem)}${by || ""}${refl} Pani`,
      );
      out = out.replace(
        /\bPani(\s+sama)?([^.,;:?!]{0,32}?\s)([a-ząćęłńóśźż]+ł)(by)?\b/gi,
        (_m, sama = "", mid: string, stem: string, by = "") =>
          `Pani${sama || ""}${mid}${fem(stem)}${by || ""}`,
      );
    }
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
      const hipotezaBol = selected.hipotezaBolGlowny?.trim() ?? "";
      const bolGlownyDisplay = bolGlowny || hipotezaBol;
      out = out.replace(
        /\[ból główny słowami klienta z parafrazy\]/g,
        bolGlownyDisplay
          ? `„${bolGlownyDisplay}"`
          : "— odwołaj się do tego co klient powiedział w parafrazie —",
      );
      const poprzednieProby = selected.poprzednieProby?.trim() ?? "";
      out = out.replace(
        /\[poprzednia próba z rozmowy\]/g,
        poprzednieProby
          ? `„${poprzednieProby}"`
          : "— odwołaj się do odpowiedzi z kroku 'Poprzednie próby' —",
      );
      out = out.replace(
        /\[godziny z Pipeline\]/g,
        selected.godzinyWpisywania ? `${selected.godzinyWpisywania}` : "[X]",
      );
      // Blok 6.8 (2026-07-15) — ustalenia "poza zakresem" wpisane w mini-formularzu Warunki
      // umowy (patrz WarunkiUmowyForm.tsx), wstawione na żywo w kroku "Warunki umowy —
      // potwierdź na żywo" zamiast generycznego tekstu.
      const pozaZakresem = selected.pozaZakresem?.trim() ?? "";
      out = out.replace(
        /\[poza zakresem\]/g,
        pozaZakresem
          ? `Poza zakresem tego wdrożenia zostaje: ${pozaZakresem}.`
          : "— brak ustaleń w Notion, dopytaj teraz i zapisz w mini-formularzu 'Warunki umowy' —",
      );
      // Blok "Arek" pkt 1 (2026-07-15) — te nawiasy były NIGDY nieusuwane na żywo, sprzedawca
      // czytał je dosłownie klientowi. Wypełnione danymi klienta (nazwa/flota/TMS) i nowymi
      // polami agenta (system_transformacji/roznicowanie_zdanie/roi_dopowiedzenie) zamiast
      // zostawiać hardcodowany tekst instrukcyjny w treści skryptu.
      const firma = selected.firma?.trim() ?? "";
      out = out.replace(/\[nazwa firmy\]/g, firma || "— brak nazwy firmy w Pipeline —");
      out = out.replace(/\[nazwa\]/g, firma || "Państwa firma");
      out = out.replace(
        /\[X\]\s*pojazd(?:ów|y|u)?/gi,
        selected.flota ? `${selected.flota} pojazdów` : "— brak floty w Pipeline —",
      );
      out = out.replace(
        /\[nazwa TMS\/system klienta\]/g,
        selected.tms?.trim() || "systemu którego dziś Państwo używacie",
      );
      out = out.replace(
        /Wcześniej próbowano \[poprzednie próby\] ale to nie zadziałało bo \[powód\]\./g,
        poprzednieProby
          ? `Wcześniej próbowano: ${poprzednieProby}.`
          : "— dopytaj o wcześniejsze próby rozwiązania tego problemu —",
      );
      out = out.replace(
        /Samodzielnie trudno to rozwiązać bo \[powód\]\./g,
        "Samodzielnie trudno to rozwiązać bez narzędzia dedykowanego pod transport.",
      );
      const roznicowanie = selected.zdanieRoznicujace?.trim() ?? "";
      out = out.replace(
        /Wcześniej pojawiła się próba rozwiązania tego inaczej, \[poprzednia próba z rozmowy\], która nie zadziałała bo \[powód z rozmowy\]\.\s*My robimy to inaczej\.\s*Nie sprzedajemy kolejnego generycznego narzędzia, tylko wdrożenie dopasowane do \[nazwa TMS\/system klienta\] i tego konkretnego procesu\./g,
        roznicowanie ||
          "— brak zdania różnicującego z Agenta Kwalifikacja, opisz na żywo czym Autorise różni się od poprzednich prób klienta —",
      );
      const systemKroki = selected.systemTransformacji ?? [];
      out = out.replace(
        /System transformacji wygląda tak\.\s*Krok pierwszy, \[moduł 1 zakończony konkretnym efektem, nie opisem funkcji\]\.\s*Krok drugi, \[moduł 2 zakończony konkretnym efektem, nie opisem funkcji\]\.\s*Krok trzeci, \[moduł 3 zakończony konkretnym efektem, nie opisem funkcji\]\./g,
        systemKroki.length >= 3
          ? systemKroki.slice(0, 3).join(" ")
          : "— brak system_transformacji z Agenta Kwalifikacja, opisz na żywo 3 kroki wdrożenia dla tego klienta —",
      );
      const roiDopowiedzenie = selected.roiDopowiedzenie?.trim() ?? "";
      out = out.replace(
        /Przy \[kwota oszczędności\] miesięcznie, inwestycja zwraca się w \[X\] miesięcy\./g,
        roiDopowiedzenie || "— policz z kalkulatorem ROI —",
      );
      // Wzorzec ścisły najpierw ("zwraca się w 2 miesiące"), potem luźniejszy fallback
      // (jakakolwiek cyfra przy słowie "miesi") — model czasem zapisuje liczbę słownie
      // ("mniej niż jeden") mimo instrukcji w prompcie, ten drugi wzorzec to łapie.
      const roiMiesiace =
        roiDopowiedzenie.match(/zwraca się w (\d+)/)?.[1] ??
        roiDopowiedzenie.match(/(\d+)\s*miesi/)?.[1];
      out = out.replace(
        /30 000 zł zwraca się w \[X\] miesięcy/g,
        `30 000 zł zwraca się w ${roiMiesiace ?? "— policz —"} miesięcy`,
      );
      // Gwarancja procentowa (nowa umowa, §4): 70% czasu bazowego klienta z Notion
      // ("Czas bazowy potwierdzony h/mc", pole dotąd zarezerwowane, niewykorzystane w UI).
      // Honest fallback gdy pole puste, zamiast fabrykować liczbę godzin.
      const czasBazowy = selected.czasBazowyPotwierdzony;
      const gwarancjaH = czasBazowy && czasBazowy > 0 ? Math.round(czasBazowy * 0.7) : null;
      out = out.replace(
        /\[gwarancja godzin\]/g,
        gwarancjaH != null
          ? `${gwarancjaH} godzin`
          : "— brak czasu bazowego w Pipeline, policz z kalkulatorem ROI —",
      );
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
    el.style.backgroundColor = "rgba(67, 121, 177, 0.08)";
    setTimeout(() => {
      el.style.boxShadow = "";
      el.style.backgroundColor = "";
    }, 2000);
  }, []);

  const jumpToObjection = useCallback((objectionId: string) => {
    setOpenObjectionId(objectionId);
    requestAnimationFrame(() => {
      const el = document.getElementById(`objection-${objectionId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "box-shadow 250ms, background-color 250ms";
      el.style.boxShadow = "0 0 0 2px var(--warning)";
      setTimeout(() => {
        el.style.boxShadow = "";
      }, 2000);
    });
  }, []);

  const handleDecisionSelect = useCallback(
    (sourceId: string, option: DecisionOption) => {
      setSelectedOptions((prev) => ({ ...prev, [sourceId]: option.trigger }));
      if (option.openObjectionId) {
        jumpToObjection(option.openObjectionId);
      }
      // Przejście po `goToStepId` NIE jest automatyczne — setter klika osobny
      // przycisk "Dalej" wewnątrz DecisionDiagram (onJump), dopiero gdy przeczytał
      // klientowi `sayAfter`.
    },
    [jumpToObjection],
  );

  // Wspólny styl etykiety w pasku narzędzi headera — ten sam wzór co TOOLBAR_LABEL
  // w /kwalifikacja (fill() w app/(dashboard)/kwalifikacja/page.tsx).
  const TOOLBAR_LABEL: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: 12.5,
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "var(--text-primary)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header — dwuwierszowy, wzór 1:1 z /pipeline i /kwalifikacja: duży tytuł + podtytuł
          w pierwszym rzędzie, cały pasek narzędzi osobnym, spójnym rzędem pod spodem. */}
      <div
        style={{
          flexShrink: 0,
          padding: "16px 20px 12px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-sans)",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Sprzedaż
          </h1>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            {selected ? selected.kontakt || selected.firma : "Wybierz klienta z listy"}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 14,
            flexWrap: "wrap",
          }}
        >
          {/* ── No-show na Discovery (zamiast "Zarejestruj rozmowę" z /kwalifikacja —
              tu chodzi o obecność klienta na spotkaniu, nie o zliczenie rozmowy) ── */}
          <button
            onClick={selected ? () => void toggleNoShow() : undefined}
            disabled={!selected || noShowSaving}
            title={
              selected
                ? isNoShow
                  ? "Cofnij oznaczenie No-Show"
                  : "Oznacz że klient nie stawił się na Discovery Call"
                : "Wybierz klienta z listy"
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 34,
              padding: "0 14px",
              borderRadius: "var(--radius-xs)",
              border: "1px solid rgba(255,255,255,0.42)",
              background: isNoShow ? "var(--error-bg)" : "var(--bg)",
              color: isNoShow ? "var(--error-text)" : "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: 12.5,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: selected ? "pointer" : "not-allowed",
              opacity: selected ? (noShowSaving ? 0.6 : 1) : 0.45,
              transition: "background 150ms, color 150ms",
            }}
          >
            {isNoShow ? <Undo2 size={15} /> : <PhoneOff size={15} />}
            {isNoShow ? "Oznaczono No-Show" : "Brak uczestnictwa w rozmowie"}
          </button>

          {selected && (
            <>
              <div style={{ height: 24, width: 1, background: "rgba(255,255,255,0.42)" }} />

              {/* ── Forma grzecznościowa ── */}
              <span style={TOOLBAR_LABEL}>Zwrot do klienta</span>
              {(["Pan", "Pani"] as const).map((f) => {
                const active = forma === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFormaOverride(f)}
                    style={{
                      height: 30,
                      padding: "0 14px",
                      borderRadius: "var(--radius-xs)",
                      border: `1px solid ${active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.42)"}`,
                      background: active ? "var(--accent)" : "var(--bg-elevated)",
                      color: active ? "var(--text-on-accent)" : "var(--text-primary)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      fontWeight: active ? 800 : 600,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    {f}
                  </button>
                );
              })}
              {formaOverride !== "auto" && (
                <button
                  onClick={() => setFormaOverride("auto")}
                  title="Wróć do automatycznego wykrywania"
                  style={{
                    height: 30,
                    padding: "0 10px",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid rgba(255,255,255,0.42)",
                    background: "transparent",
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  auto
                </button>
              )}

              <div style={{ height: 24, width: 1, background: "rgba(255,255,255,0.42)" }} />

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={TOOLBAR_LABEL}>Jak się zwracać</span>
                <input
                  value={vocative}
                  onChange={(e) => setVocative(e.target.value)}
                  placeholder="wołacz imienia, np. Marku"
                  style={{
                    height: 30,
                    padding: "0 10px",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid rgba(255,255,255,0.42)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    background: "var(--bg-elevated)",
                    outline: "none",
                    width: 140,
                  }}
                />
              </div>
            </>
          )}
        </div>
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
          filterStatuses={["Discovery umówione"]}
          headerLabel="Discovery umówione"
          emptyLabel='Brak klientów "Discovery umówione"'
          noShowClientIds={clients.filter((c) => c.wynikDiscovery === "NO-SHOW").map((c) => c.id)}
        />

        {/* Main: brief + script + roi + dalsze kroki */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: "var(--bg)" }}>
          <Card title="Brief Agenta 02" collapsible defaultOpen={true}>
            <BriefSection client={selected} />
          </Card>

          <Card title="Skrypt Discovery">
            {STEPS_D.map((step) => (
              <ScriptStep
                key={step.id}
                step={step}
                fill={fill}
                onJump={jumpToStep}
                onDecisionSelect={handleDecisionSelect}
                selectedTrigger={selectedOptions[step.id]}
                openObjectionId={openObjectionId}
                setOpenObjectionId={setOpenObjectionId}
                selectedOptions={selectedOptions}
              />
            ))}
          </Card>

          <Card title="Warunki umowy" collapsible defaultOpen={false}>
            <WarunkiUmowyForm
              client={selected}
              onSaved={(patch) => {
                setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
                setClients((prev) =>
                  prev.map((c) => (c.id === selected?.id ? { ...c, ...patch } : c)),
                );
              }}
            />
          </Card>

          <Card title="Skrypt: Analiza przedkontraktowa" collapsible defaultOpen={false}>
            <AnalizaPrzedkontraktowaPanel
              client={selected}
              onSaved={(patch) => {
                setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
                setClients((prev) =>
                  prev.map((c) => (c.id === selected?.id ? { ...c, ...patch } : c)),
                );
              }}
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
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px",
                background: "var(--bg-elevated)",
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
