"use client";

import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  MessageSquare,
  Monitor,
  PhoneOff,
  Plus,
  Save,
  StickyNote,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GoogleTaskList } from "@/app/api/google/tasks/route";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { ClientSidebar } from "@/components/clients/ClientSidebar";
import { ProgressBar, SectionLabelSmall, StepCard } from "@/components/dalsze-kroki/DalszeKrokiUI";
import { KalkulatorRoi } from "@/components/kalkulator/KalkulatorRoi";
import { isTestClient } from "@/lib/demo/testClient";
import { DecisionDiagram } from "@/components/scripts/DecisionDiagram";
import { NextStepArrow } from "@/components/scripts/NextStepArrow";
import { AnalizaPrzedkontraktowaPanel } from "@/components/sprzedaz/AnalizaPrzedkontraktowaPanel";
import { WarunkiUmowyForm } from "@/components/sprzedaz/WarunkiUmowyForm";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  fillBrief,
  hasUnfilledPlaceholders,
  parseCytatyKlienta,
  parsePrzewidywaneObiekcje,
  type PrzewidywanaObiekcja,
  serializePrzewidywaneObiekcje,
} from "@/lib/scripts/fillBrief";
import { useFormaGrzecznosciowa } from "@/lib/scripts/formaGrzecznosciowa";
import { GROUP_COLORS, MESSAGES_DATA } from "@/lib/scripts/messages";
import { DISCOVERY_STATUSES, OBJECTIONS_D, STEPS_D } from "@/lib/scripts/sprzedaz";
import type { DecisionOption, Objection, ScriptLine } from "@/lib/scripts/types";
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

// Te same wartości co STATUS_COLORS w /pipeline (rozjaśnione pod ciemny motyw, audyt WCAG AA
// 2026-08-05) — jedno źródło prawdy o kolorach statusów, nie osobno dobierane per strona.
const STATUS_COLORS: Record<string, string> = {
  Kwalifikacja: "#a379ec",
  "Discovery umówione": "#14b8a7",
  Finalizacja: "#d97706",
  Kickoff: "#16a34a",
  Wdrożenie: "#34b262",
  Retainer: "#3fa676",
  Upsell: "#0ea5e9",
};

// ── Line styles ───────────────────────────────────────────────────────

// "note" jest tu celowo cichy (text-tertiary, brak tła) — dyskretna adnotacja dla settera,
// nie ostrzeżenie. Warning-bg/AlertTriangle zarezerwowane wyłącznie dla realnych błędów/
// blokad (np. niekompletny brief w BriefSection niżej).
const LINE_COLOR: Record<ScriptLine["t"], string> = {
  say: "var(--text-primary)",
  client: "var(--text-secondary)",
  note: "var(--text-tertiary)",
  action: "var(--accent)",
  branch: "var(--success-text)",
  "branch-bad": "var(--error)",
};

const LINE_BG: Record<ScriptLine["t"], string> = {
  say: "transparent",
  client: "transparent",
  note: "transparent",
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
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
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
            size={17}
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

// ── No-show banner ────────────────────────────────────────────────────

// A6 (2026-07-18): dotąd zero mechanizmu no-show w całym systemie — /statystyki miało
// wyłącznie szacunek (pole "Wynik Discovery" puste + data w przeszłości). Ten przycisk
// zapisuje realną wartość "NO-SHOW" do tego samego pola, więc show rate i licznik No-Show
// w /statystyki liczą się z faktu, nie z domysłu. Zapis idzie tym samym PATCH
// /api/notion/pipeline-update co WarunkiUmowyForm, ten sam wzorzec optimistic update.
// A1 (Faza 2): dawny duży pomarańczowy baner w treści strony zastąpiony kompaktowym
// przyciskiem w headerze, dokładnie tym samym wzorcem co "Brak odbioru" w /kwalifikacja
// (32px wysokości, ten sam border/radius/gap) — tylko inna etykieta i akcja (No-Show
// zamiast braku odbioru telefonicznego).
function NoShowHeaderButton({
  client,
  onSaved,
}: {
  client: PipelineClientDetailed;
  onSaved: (patch: Partial<PipelineClientDetailed>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const isNoShow = client.wynikDiscovery === "NO-SHOW";
  const isTest = isTestClient(client);

  const toggle = useCallback(async () => {
    if (isTest) return;
    setSaving(true);
    const next = isNoShow ? null : "NO-SHOW";
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: client.id, wynikDiscovery: next }),
      });
      onSaved({ wynikDiscovery: next ?? "" });
    } finally {
      setSaving(false);
    }
  }, [client.id, isNoShow, isTest, onSaved]);

  return (
    <button
      onClick={() => void toggle()}
      disabled={saving || isTest}
      title={
        isTest
          ? "Klient testowy — akcje nie zapisują się do Notion"
          : isNoShow
            ? "Cofnij oznaczenie No-Show"
            : "Klient nie stawił się na Discovery Call — zapisze No-Show do Notion, licznik w /statystyki zaktualizuje się od razu"
      }
      style={{
        height: 32,
        padding: "0 12px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: isNoShow ? "var(--error-bg)" : "var(--bg)",
        fontSize: 12,
        color: isNoShow ? "var(--error-text)" : "var(--text-secondary)",
        cursor: saving || isTest ? "default" : "pointer",
        opacity: saving || isTest ? 0.6 : 1,
        display: "flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        flexShrink: 0,
        fontFamily: "var(--font-sans)",
        transition: "background 150ms, color 150ms",
      }}
    >
      <PhoneOff size={15} strokeWidth={2} />
      {isNoShow ? "Cofnij No-Show" : "Oznacz No-Show"}
    </button>
  );
}

// ── Script step ───────────────────────────────────────────────────────

function ScriptStep({
  step,
  index,
  fill,
  onCopy,
  copiedId,
  onJump,
  onDecisionSelect,
  onJumpToObjection,
  selectedTrigger,
}: {
  step: (typeof STEPS_D)[0];
  index: number;
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  onJump: (stepId: string) => void;
  onDecisionSelect: (stepId: string, option: DecisionOption) => void;
  onJumpToObjection: (objectionId: string) => void;
  selectedTrigger?: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div
      id={`step-${step.id}`}
      style={{
        marginBottom: 8,
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setOpen((p) => !p)}
        style={{
          padding: "10px 14px",
          background: open ? "rgba(67, 121, 177, 0.03)" : "var(--bg-elevated)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "var(--accent)",
            color: "var(--text-on-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {index + 1}
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
        <ChevronDown
          size={16}
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
                  <MessageSquare size={16} color="var(--accent)" strokeWidth={1.6} />
                )}
                {line.t === "client" && (
                  <Users size={16} color="var(--text-secondary)" strokeWidth={1.8} />
                )}
                {line.t === "note" && (
                  <StickyNote size={14} color="var(--text-tertiary)" strokeWidth={1.6} />
                )}
                {line.t === "action" && <Check size={15} color="var(--accent)" strokeWidth={2} />}
                {(line.t === "branch" || line.t === "branch-bad") && (
                  <Check size={15} color={LINE_COLOR[line.t]} strokeWidth={2} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                {line.t === "note" ? (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      lineHeight: 1.5,
                      fontStyle: "italic",
                      color: LINE_COLOR.note,
                    }}
                  >
                    {fill(line.setterNote)}
                  </p>
                ) : (
                  (Array.isArray(line.text) ? line.text : [line.text]).map((paragraph, pi) => {
                    const filled = fill(paragraph);
                    const incomplete = line.t === "say" && hasUnfilledPlaceholders(filled);
                    return (
                      <p
                        key={pi}
                        style={{
                          margin: pi === 0 ? 0 : "6px 0 0 0",
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          lineHeight: 1.55,
                          color: incomplete ? "var(--warning-text)" : LINE_COLOR[line.t],
                        }}
                      >
                        {incomplete && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              marginRight: 6,
                              padding: "1px 5px",
                              borderRadius: 4,
                              border: "1px solid var(--warning-border)",
                            }}
                          >
                            nie czytaj, dane niekompletne
                          </span>
                        )}
                        {filled}
                      </p>
                    );
                  })
                )}
                {line.t === "say" && line.cel && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      fontStyle: "italic",
                      marginTop: 2,
                      paddingLeft: 8,
                      borderLeft: "2px solid var(--text-tertiary)",
                    }}
                  >
                    Cel: {line.cel}
                  </div>
                )}
                {line.t === "say" && line.setterNote && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      fontStyle: "italic",
                      marginTop: 2,
                    }}
                  >
                    {line.setterNote}
                  </div>
                )}
                {line.t === "note" && line.linkObjectionId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToObjection(line.linkObjectionId!);
                    }}
                    style={{
                      marginTop: 6,
                      padding: "4px 9px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Otwórz obiekcję
                  </button>
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
                    border: "1px solid var(--border)",
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
                    <CheckCircle2 size={13} />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              )}
            </div>
          ))}
          {step.decision && (
            <DecisionDiagram
              decision={step.decision}
              onSelect={(option) => onDecisionSelect(step.id, option)}
              selectedTrigger={selectedTrigger}
            />
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

function BriefLabel({ children, hint }: { children: React.ReactNode; hint?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
        }}
      >
        {children}
      </div>
      {hint && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            padding: "1px 6px",
            borderRadius: 99,
            border: "1px solid var(--border)",
          }}
        >
          dane niekompletne
        </span>
      )}
    </div>
  );
}

// B1 (Faza 2): brief był dawniej czystym odczytem (<p>) tego co zapisał agent — jeśli agent
// zostawił niewypełniony placeholder albo błąd, jedynym wyjściem było ponowne uruchomienie
// Agenta 02. Teraz pole edycyjne wprost w tym panelu, zapisywane do Notion przez
// /api/notion/pipeline-update (ten sam mechanizm co saveAgent2Output), z widocznym przyciskiem
// "Zapisz brief" wyłącznie gdy coś realnie się zmieniło (patrz `dirty` w BriefSection niżej).
function BriefTextField({
  label,
  value,
  onChange,
  rows = 3,
  incompleteHint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  incompleteHint?: boolean;
}) {
  return (
    <div>
      <BriefLabel hint={incompleteHint}>{label}</BriefLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{
          width: "100%",
          resize: "vertical",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--text-primary)",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

// Sekcja C: pod każdą obiekcją pole gotowej odpowiedzi — wypełnione przez agenta, albo (gdy
// agent go nie dostarczył dla rozpoznanego, standardowego wzorca) przez bibliotekę gotowych
// odpowiedzi z lib/scripts/objectionAnswers.ts, patrz parsePrzewidywaneObiekcje.
function ObiekcjeEditor({
  items,
  onChange,
}: {
  items: PrzewidywanaObiekcja[];
  onChange: (items: PrzewidywanaObiekcja[]) => void;
}) {
  const update = (i: number, patch: Partial<PrzewidywanaObiekcja>) =>
    onChange(items.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { objekcja: "", odpowiedz: "" }]);

  return (
    <div>
      <BriefLabel>Przewidywane obiekcje</BriefLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((o, i) => (
          <div
            key={i}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <input
                value={o.objekcja}
                onChange={(e) => update(i, { objekcja: e.target.value })}
                placeholder="Treść obiekcji"
                style={{
                  flex: 1,
                  height: 32,
                  padding: "0 10px",
                  borderRadius: 7,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--warning-text)",
                  outline: "none",
                }}
              />
              <button
                onClick={() => remove(i)}
                title="Usuń obiekcję"
                style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: 7,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <textarea
              value={o.odpowiedz}
              onChange={(e) => update(i, { odpowiedz: e.target.value })}
              placeholder="Odpowiedź do powiedzenia klientowi"
              rows={2}
              style={{
                width: "100%",
                resize: "vertical",
                padding: "8px 10px",
                borderRadius: 7,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                lineHeight: 1.55,
                color: "var(--text-primary)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}
      </div>
      <button
        onClick={add}
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 7,
          border: "1px dashed var(--border)",
          background: "transparent",
          color: "var(--text-secondary)",
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
        }}
      >
        <Plus size={13} />
        Dodaj obiekcję
      </button>
    </div>
  );
}

interface BriefDraft {
  hipoteza: string;
  obiekcje: PrzewidywanaObiekcja[];
  pitch: string;
  uwagi: string;
}

function draftFromClient(client: PipelineClientDetailed): BriefDraft {
  return {
    hipoteza: client.hipotezaBolGlowny ?? "",
    obiekcje: parsePrzewidywaneObiekcje(client.przewidywaneObiekcje ?? ""),
    pitch: client.pitchRecipe ?? "",
    uwagi: client.uwagiFAgent2 ?? "",
  };
}

function BriefSection({
  client,
  onSaved,
}: {
  client: PipelineClientDetailed | null;
  onSaved: (patch: Partial<PipelineClientDetailed>) => void;
}) {
  const [draft, setDraft] = useState<BriefDraft | null>(client ? draftFromClient(client) : null);
  const [original, setOriginal] = useState<BriefDraft | null>(
    client ? draftFromClient(client) : null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      const next = draftFromClient(client);
      setDraft(next);
      setOriginal(next);
    } else {
      setDraft(null);
      setOriginal(null);
    }
    setSaveError(null);
    // client.id wystarcza — draftFromClient(client) czytany od nowa przy zmianie klienta,
    // nie przy każdej zmianie referencji obiektu client (np. po No-Show).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  const dirty =
    !!draft &&
    !!original &&
    (draft.hipoteza !== original.hipoteza ||
      draft.pitch !== original.pitch ||
      draft.uwagi !== original.uwagi ||
      serializePrzewidywaneObiekcje(draft.obiekcje) !==
        serializePrzewidywaneObiekcje(original.obiekcje));

  const handleSave = useCallback(async () => {
    if (!client || !draft) return;
    if (isTestClient(client)) {
      // Klient testowy nie ma realnej strony w Notion — zapisujemy tylko lokalnie,
      // żeby dało się przetestować edycję briefu bez błędu 404 z PATCH.
      onSaved({});
      setOriginal(draft);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const patch = {
        hipotezaBolGlowny: draft.hipoteza,
        przewidywaneObiekcje: serializePrzewidywaneObiekcje(draft.obiekcje),
        pitchRecipe: draft.pitch,
        uwagiFAgent2: draft.uwagi,
      };
      const res = await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: client.id, ...patch }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Nie udało się zapisać briefu");
      onSaved(patch);
      setOriginal(draft);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Nie udało się zapisać briefu");
    } finally {
      setSaving(false);
    }
  }, [client, draft, onSaved]);

  if (!client || !draft) {
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
        Wybierz klienta, aby zobaczyć Brief agenta sprzedażowego.
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
          Brief agenta sprzedażowego nie jest dostępny dla tego klienta. Uruchom Agenta 02 na stronie Agenci
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
          <ExternalLink size={16} />
          Uruchom Agent 02 dla {client.kontakt || client.firma}
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {dirty && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          {saveError && (
            <span style={{ fontSize: 12, color: "var(--error-text)", fontFamily: "var(--font-sans)" }}>
              {saveError}
            </span>
          )}
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: 8,
              border: "1px solid var(--accent-border)",
              background: "var(--accent-muted)",
              color: "var(--accent-text)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 700,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Save size={13} />
            {saving ? "Zapisywanie…" : "Zapisz brief"}
          </button>
        </div>
      )}

      <BriefTextField
        label="Hipoteza bólu głównego"
        value={draft.hipoteza}
        onChange={(v) => setDraft((d) => (d ? { ...d, hipoteza: v } : d))}
        rows={2}
        incompleteHint={hasUnfilledPlaceholders(fillBrief(draft.hipoteza, client))}
      />

      {cytaty.length > 0 && (
        <div>
          <BriefLabel>Cytaty klienta</BriefLabel>
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

      <BriefTextField
        label="Pitch Recipe"
        value={draft.pitch}
        onChange={(v) => setDraft((d) => (d ? { ...d, pitch: v } : d))}
        rows={5}
        incompleteHint={hasUnfilledPlaceholders(fillBrief(draft.pitch, client))}
      />

      <ObiekcjeEditor
        items={draft.obiekcje}
        onChange={(items) => setDraft((d) => (d ? { ...d, obiekcje: items } : d))}
      />

      <BriefTextField
        label="Uwagi Agenta 02"
        value={draft.uwagi}
        onChange={(v) => setDraft((d) => (d ? { ...d, uwagi: v } : d))}
        rows={3}
      />

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
        <ExternalLink size={14} />
        Otwórz w Agenci AI
      </a>
    </div>
  );
}

// ── Objections accordion ──────────────────────────────────────────────

const STAGE_LABELS_D: Partial<Record<Objection["stage"], string>> = {
  diagnoza: "Diagnoza",
  pitch: "Prezentacja",
  cena: "Cena",
  closing: "Zamknięcie",
  wszedzie: "Obiekcje ogólne",
};

const STAGE_ORDER_D: Objection["stage"][] = ["diagnoza", "pitch", "cena", "closing", "wszedzie"];

function renderObjectionD(
  obj: Objection,
  openId: string | null,
  setOpenId: (id: string | null) => void,
  fill: (t: string) => string,
  onCopy: (id: string, text: string) => void,
  copiedId: string | null,
  onDecisionSelect: (objectionId: string, option: DecisionOption) => void,
  selectedOptions: Record<string, string>,
) {
  const oc = objectionColor(obj.label);
  const isOpen = openId === obj.id;
  return (
    <div
      key={obj.id}
      id={`objection-${obj.id}`}
      style={{
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${oc.accent}`,
        borderRadius: 8,
        overflow: "hidden",
        background: isOpen ? oc.bg : "var(--bg-elevated)",
        transition: "background-color 200ms, box-shadow 250ms",
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
          size={15}
          color="var(--text-tertiary)"
          style={{
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 150ms",
            flexShrink: 0,
          }}
        />
      </div>
      {isOpen && (
        <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {obj.script && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: hasUnfilledPlaceholders(fill(obj.script))
                    ? "var(--warning-text)"
                    : "var(--text-primary)",
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
                  border: "1px solid var(--border)",
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
                  <CheckCircle2 size={13} />
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>
          )}
          {obj.followup && (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.55,
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {fill(obj.followup)}
            </p>
          )}
          {obj.decision && (
            <DecisionDiagram
              decision={obj.decision}
              onSelect={(option) => onDecisionSelect(obj.id, option)}
              selectedTrigger={selectedOptions[obj.id]}
            />
          )}
          {obj.setterNote && (
            <p
              style={{
                margin: 0,
                fontSize: 11,
                lineHeight: 1.5,
                fontStyle: "italic",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {obj.setterNote}
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
                  color: "var(--accent-text)",
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
}

function ObjectionsPanel({
  fill,
  onCopy,
  copiedId,
  openId,
  setOpenId,
  onDecisionSelect,
  selectedOptions,
}: {
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onDecisionSelect: (objectionId: string, option: DecisionOption) => void;
  selectedOptions: Record<string, string>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {STAGE_ORDER_D.map((stage) => {
        const items = OBJECTIONS_D.filter((o) => o.stage === stage);
        if (items.length === 0) return null;
        return (
          <div key={stage} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text-tertiary)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {STAGE_LABELS_D[stage]}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {items.map((obj) =>
                renderObjectionD(
                  obj,
                  openId,
                  setOpenId,
                  fill,
                  onCopy,
                  copiedId,
                  onDecisionSelect,
                  selectedOptions,
                ),
              )}
            </div>
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
                  {copiedId === `sms-${item.id}` ? <CheckCircle2 size={14} /> : <Copy size={14} />}
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
                {copiedId === `tel-${item.id}` ? <CheckCircle2 size={14} /> : <Copy size={14} />}
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
        <Monitor size={17} color="var(--accent)" />
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
          <ExternalLink size={14} />
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
        <Target size={17} color="var(--success-text)" />
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
          <ExternalLink size={14} />
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
  brief: "Brief agenta sprzedażowego przeczytany",
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
            {reminderSmsCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            Kopiuj
          </button>
        </div>
      )}
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
        <Target size={16} color="var(--text-secondary)" />
        Przejdź do Pipeline
      </a>
    </div>
  );
}

// ── Right panel ───────────────────────────────────────────────────────

function RightPanel({
  client,
  fill,
  onCopy,
  copiedId,
  openObjectionId,
  setOpenObjectionId,
  onDecisionSelect,
  selectedOptions,
}: {
  client: PipelineClientDetailed | null;
  fill: (t: string) => string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
  openObjectionId: string | null;
  setOpenObjectionId: (id: string | null) => void;
  onDecisionSelect: (objectionId: string, option: DecisionOption) => void;
  selectedOptions: Record<string, string>;
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
      <Card title="Obiekcje w Discovery">
        <ObjectionsPanel
          fill={fill}
          onCopy={onCopy}
          copiedId={copiedId}
          openId={openObjectionId}
          setOpenId={setOpenObjectionId}
          onDecisionSelect={onDecisionSelect}
          selectedOptions={selectedOptions}
        />
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
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [openObjectionId, setOpenObjectionId] = useState<string | null>(null);

  // A6 (2026-07-16): licznik rozmów sprzedażowych — wcześniej /sprzedaz nie miało
  // WCALE żadnego tally, "Rozmowy" w /statystyki zawsze liczyło wyłącznie
  // kwalifikację. Wzorzec identyczny jak tally("dial"/"rozmowa") w /kwalifikacja.
  const [rozmowaFlash, setRozmowaFlash] = useState(false);
  const [rozmowaUndo, setRozmowaUndo] = useState(false);
  const postRozmowaTally = (delta: 1 | -1) =>
    fetch("/api/stats/tally", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "rozmowa_sprzedaz", delta }),
    }).catch(() => {
      /* licznik jest pomocniczy — brak sieci nie blokuje pracy */
    });
  const tallyRozmowa = useCallback(() => {
    setRozmowaFlash(true);
    setRozmowaUndo(true);
    setTimeout(() => setRozmowaFlash(false), 1800);
    setTimeout(() => setRozmowaUndo(false), 5000);
    void postRozmowaTally(1);
  }, []);
  const undoRozmowaTally = useCallback(() => {
    setRozmowaUndo(false);
    void postRozmowaTally(-1);
  }, []);

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
      // Faza 3, Sekcja E (2026-08-15): trzy nawiasy w kroku "Parafraza" ([ból główny], [cel],
      // [opis pracy]) nie miały żadnego podstawienia mimo że reszta parafrazy jest już
      // wypełniana danymi klienta — odwołują się do odpowiedzi udzielonych chwilę wcześniej w
      // TEJ SAMEJ rozmowie (nie do Notion), więc honest fallback wskazuje krok, nie "brak danych".
      out = out.replace(
        /\[ból główny\]/g,
        bolGlownyDisplay
          ? `„${bolGlownyDisplay}"`
          : "— odwołaj się do tego co klient powiedział o problemie —",
      );
      out = out.replace(/\[cel\]/g, "— odwołaj się do odpowiedzi z kroku 'Cel: wizja przyszłości' —");
      out = out.replace(/\[opis pracy\]/g, "— odwołaj się do opisu procesu z kroku 'Diagnoza' —");
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
      // Wzorzec [^\]]* zamiast literalnej treści nawiasu (Faza 3, 2026-08-14): poprzednia
      // wersja tego regexu wymagała dosłownego brzmienia placeholdera i przestała pasować po
      // korekcie tekstu w sprzedaz.ts ("opisany korzyścią" -> "zakończony konkretnym efektem"),
      // przez co [poprzednia próba z rozmowy] i [powód z rozmowy] leciały do klienta surowe.
      // Elastyczny wzorzec przetrwa kolejne drobne poprawki brzmienia w skrypcie.
      out = out.replace(
        /Wcześniej pojawiła się próba rozwiązania tego inaczej: \[poprzednia próba z rozmowy\], która nie zadziałała bo \[powód z rozmowy\]\. My robimy to inaczej: nie sprzedajemy kolejnego generycznego narzędzia, tylko wdrożenie dopasowane do \[nazwa TMS\/system klienta\] i tego konkretnego procesu\./g,
        roznicowanie ||
          "— brak zdania różnicującego z Agenta Kwalifikacja, opisz na żywo czym Autorise różni się od poprzednich prób klienta —",
      );
      const systemKroki = selected.systemTransformacji ?? [];
      out = out.replace(
        /System transformacji wygląda tak: krok pierwszy, \[moduł 1[^\]]*\]\. Krok drugi, \[moduł 2[^\]]*\]\. Krok trzeci, \[moduł 3[^\]]*\]\./g,
        systemKroki.length >= 3
          ? `System transformacji wygląda tak: ${systemKroki.slice(0, 3).join(" ")}`
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
        /18000 zł zwraca się w \[X\] miesięcy/g,
        `18000 zł zwraca się w ${roiMiesiace ?? "— policz —"} miesięcy`,
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
      // Faza 3, Sekcja E (2026-08-15): [email] w kroku wysyłki umowy nie miał żadnego
      // podstawienia, setter czytał to dosłownie klientowi. Wykryte dopiero teraz przy
      // ponownym przejściu przez cały łańcuch kroków closing.
      const email = selected.email?.trim() ?? "";
      out = out.replace(
        /\[email\]/g,
        email || "— brak adresu email w Pipeline, dopytaj i zapisz w karcie klienta —",
      );
      // Krok B (rezonans) podsumowuje wartość w skrócie: godziny z tej samej gwarancji co
      // reszta pitchu, złotówki z kosztu rocznego / 12 (jedyne pole miesięczne dostępne w
      // Pipeline to roczne, dzielone tutaj).
      const kosztMiesieczny =
        selected.kosztRoczny && selected.kosztRoczny > 0
          ? Math.round(selected.kosztRoczny / 12)
          : null;
      out = out.replace(
        /\[X godzin\/zł miesięcznie\]/g,
        gwarancjaH != null && kosztMiesieczny != null
          ? `${gwarancjaH} godzin, ${kosztMiesieczny.toLocaleString("pl-PL")} zł miesięcznie`
          : "— policz z kalkulatorem ROI —",
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
        return;
      }
      if (option.goToStepId) jumpToStep(option.goToStepId);
    },
    [jumpToStep, jumpToObjection],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <PageHeader icon={<Target size={18} color="var(--accent)" />} title="Sprzedaż">
        <div style={{ height: 20, width: 1, background: "var(--border)", marginLeft: 4 }} />
        <span
          style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-tertiary)" }}
        >
          {selected ? selected.kontakt || selected.firma : "Discovery Call"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={tallyRozmowa}
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 7,
              border: "1px solid var(--border)",
              background: rozmowaFlash ? "var(--success-bg)" : "var(--bg)",
              color: rozmowaFlash ? "var(--success-text)" : "var(--text-secondary)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "var(--font-sans)",
              transition: "background 150ms, color 150ms",
            }}
            title="Zlicz odbytą rozmowę sprzedażową (statystyki dzienne)"
          >
            {rozmowaFlash ? <Check size={14} /> : <MessageSquare size={14} />}
            Rozmowa
          </button>
          {rozmowaUndo && (
            <button
              onClick={undoRozmowaTally}
              style={{
                height: 28,
                padding: "0 10px",
                borderRadius: 7,
                border: "1px solid var(--warning)",
                background: "var(--warning-bg)",
                color: "var(--warning-text)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
              title="Cofnij ostatnie zliczenie (5 sekund)"
            >
              Cofnij
            </button>
          )}
        </div>
        {selected && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <NoShowHeaderButton
              client={selected}
              onSaved={(patch) => {
                setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
                setClients((prev) =>
                  prev.map((c) => (c.id === selected.id ? { ...c, ...patch } : c)),
                );
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "4px 10px 4px 4px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg)",
              }}
              title="Jak setter ma zwracać się do klienta w tej rozmowie"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Zwrot:
                </span>
                {(["Pan", "Pani"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormaOverride(f)}
                    style={{
                      height: 28,
                      padding: "0 10px",
                      borderRadius: 8,
                      border: `1px solid ${forma === f ? "var(--accent)" : "var(--border)"}`,
                      background: forma === f ? "rgba(67, 121, 177, 0.08)" : "var(--bg-elevated)",
                      color: forma === f ? "var(--accent)" : "var(--text-secondary)",
                      fontSize: 12,
                      fontWeight: forma === f ? 600 : 400,
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {f}
                  </button>
                ))}
                {formaOverride !== "auto" && (
                  <button
                    onClick={() => setFormaOverride("auto")}
                    title="Wróć do automatycznego wykrywania"
                    style={{
                      height: 28,
                      padding: "0 8px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-tertiary)",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    auto
                  </button>
                )}
              </div>
              <div style={{ height: 20, width: 1, background: "var(--border)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Wołacz:
                </span>
                <input
                  value={vocative}
                  onChange={(e) => setVocative(e.target.value)}
                  placeholder="wołacz imienia"
                  style={{
                    height: 28,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    background: "var(--bg-elevated)",
                    outline: "none",
                    width: 110,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </PageHeader>

      {/* 3-column layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: client list */}
        <ClientSidebar
          clients={clients}
          loading={loading}
          selected={selected}
          onSelect={setSelected}
          onRefresh={fetchClients}
          filterStatuses={DISCOVERY_STATUSES}
          groupByStatus
          statusColors={STATUS_COLORS}
          showTestClient
          emptyLabel="Brak klientów Discovery"
        />

        {/* Main: brief + script + roi + dalsze kroki */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: "var(--bg)" }}>
          <Card title="Brief agenta sprzedażowego" collapsible defaultOpen={true}>
            <BriefSection
              client={selected}
              onSaved={(patch) => {
                setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
                setClients((prev) =>
                  prev.map((c) => (c.id === selected?.id ? { ...c, ...patch } : c)),
                );
              }}
            />
          </Card>

          <Card title="Skrypt Discovery">
            {STEPS_D.map((step, index) => (
              <ScriptStep
                key={step.id}
                step={step}
                index={index}
                fill={fill}
                onCopy={onCopy}
                copiedId={copiedId}
                onJump={jumpToStep}
                onJumpToObjection={jumpToObjection}
                onDecisionSelect={handleDecisionSelect}
                selectedTrigger={selectedOptions[step.id]}
              />
            ))}
          </Card>

          <Card title="Kalkulator ROI" collapsible defaultOpen={false}>
            {/* B2 (Faza 2): dawniej priorytet miał `selected.kontakt` (imię i nazwisko osoby
                kontaktowej), więc pole "Nazwa firmy" domyślnie pokazywało nie-firmowe dane.
                Teraz wyłącznie `firma` (albo pusto, żeby zadziałał placeholder pola). */}
            <KalkulatorRoi
              embedded
              initialClientName={selected?.firma && selected.firma !== "Bez nazwy" ? selected.firma : ""}
            />
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
              <FileText size={14} color="var(--text-tertiary)" />
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
        <RightPanel
          client={selected}
          fill={fill}
          onCopy={onCopy}
          copiedId={copiedId}
          openObjectionId={openObjectionId}
          setOpenObjectionId={setOpenObjectionId}
          onDecisionSelect={handleDecisionSelect}
          selectedOptions={selectedOptions}
        />
      </div>
    </div>
  );
}
