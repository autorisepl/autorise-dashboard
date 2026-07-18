"use client";

import { AlertTriangle, Check, Loader2, Rocket } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { GlobalClientSelector } from "@/components/clients/GlobalClientSelector";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

// A1 (2026-07-18) — PROTOTYP zgodnie z instrukcją "zacznij prototypem: sam Panel Dostępy
// + oś czasu, dla jednego klienta, do oceny Michała". Reszta specyfikacji (Panel Pomiar
// bazowy, Checklist tygodniowa, Panel Weryfikacja Dzień 30 — patrz PLAN_CLAUDE_CODE.md blok
// A1) świadomie NIE zbudowana w tym punkcie, czeka na akceptację kierunku tego prototypu.
//
// Zakres tej zakładki po decyzji Michała (2026-07-18): wyłącznie jednorazowy proces Tydzień 0
// do Dzień 30. Stały retainer po zamknięciu weryfikacji żyje w osobnej zakładce /utrzymanie.

const STAGES = ["Tydzień 0", "Tydzień 1", "Tydzień 2-3", "Tydzień 4", "Dzień 30"] as const;

interface AccessItem {
  key: string;
  label: (client: PipelineClientDetailed) => string;
}

// KARTA_PRODUKTU_SYSTEM_OPERACYJNY.md pkt 9 — lista stała, nie generowana z pola "zakres
// modułów" bo taki wybór per klient jeszcze nie istnieje w schemacie Notion (poza zakresem
// tego prototypu).
const ACCESS_ITEMS: AccessItem[] = [
  {
    key: "tms",
    label: (c) => `TMS${c.tms ? `: ${c.tms}` : " (nie ustalono, potwierdzić na Kickoff)"}`,
  },
  { key: "poczta", label: () => "Poczta firmowa (moduł email-parser)" },
  { key: "ksiegowosc", label: () => "System księgowy / KSeF (moduł payment-monitor)" },
  {
    key: "kontakty",
    label: () => "Kontakty operacyjne (osoba techniczna u dostawcy TMS, spedytorzy, księgowość)",
  },
];

function fmtDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysSince(iso: string): number {
  const start = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}

function computeStageIndex(client: PipelineClientDetailed): number {
  if (!client.dataPotwierdzeniaDostepow) return 0;
  const days = daysSince(client.dataPotwierdzeniaDostepow);
  if (days < 7) return 1;
  if (days < 21) return 2;
  if (days < 30) return 3;
  return 4;
}

function Timeline({ stageIndex }: { stageIndex: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      {STAGES.map((label, i) => (
        <div
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            flex: i < STAGES.length - 1 ? 1 : "0 0 auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 700,
                background: i <= stageIndex ? "var(--accent)" : "var(--bg)",
                color: i <= stageIndex ? "#fff" : "var(--text-tertiary)",
                border: i <= stageIndex ? "none" : "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              {i < stageIndex ? <Check size={13} /> : i + 1}
            </div>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: i === stageIndex ? 700 : 500,
                color: i === stageIndex ? "var(--text-primary)" : "var(--text-tertiary)",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          </div>
          {i < STAGES.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                margin: "0 6px",
                marginBottom: 17,
                background: i < stageIndex ? "var(--accent)" : "var(--border)",
                borderRadius: 1,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function WdrozenieePage() {
  const [clients, setClients] = useState<PipelineClientDetailed[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/notion/pipeline");
      const data = await res.json();
      if (data.success) setClients(data.clients as PipelineClientDetailed[]);
    } catch {
      // cichy fail, wzorem reszty dashboardu — polling odświeży za chwilę
    }
  }, []);

  useEffect(() => {
    void fetchClients();
    const id = setInterval(() => void fetchClients(), 60_000);
    return () => clearInterval(id);
  }, [fetchClients]);

  const selected = clients.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setChecked(new Set());
      return;
    }
    const saved = selected.dostepyZebrane
      ? selected.dostepyZebrane
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    setChecked(new Set(saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.dostepyZebrane]);

  const stageIndex = useMemo(() => (selected ? computeStageIndex(selected) : 0), [selected]);
  const allChecked = ACCESS_ITEMS.every((item) => checked.has(item.key));

  const toggleItem = useCallback(
    async (key: string) => {
      if (!selected) return;
      const next = new Set(checked);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setChecked(next);
      setSaving(true);
      try {
        await fetch("/api/notion/pipeline-update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: selected.id, dostepyZebrane: [...next].join(",") }),
        });
      } finally {
        setSaving(false);
      }
    },
    [selected, checked],
  );

  const confirmAccess = useCallback(async () => {
    if (!selected || !allChecked) return;
    setConfirming(true);
    const today = new Date().toISOString().slice(0, 10);
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: selected.id, dataPotwierdzeniaDostepow: today }),
      });
      await fetchClients();
    } finally {
      setConfirming(false);
    }
  }, [selected, allChecked, fetchClients]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PageHeader icon={<Rocket size={15} color="var(--accent)" />} title="Wdrożenie">
        <GlobalClientSelector
          clients={clients}
          selectedId={selectedId}
          onSelect={setSelectedId}
          placeholder="Wybierz klienta we wdrożeniu..."
        />
      </PageHeader>

      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {!selected ? (
          <Panel>
            <div
              style={{
                padding: 32,
                textAlign: "center",
                fontFamily: "var(--font-sans)",
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            >
              Wybierz klienta u góry, żeby zobaczyć proces wdrożenia. Docelowo: Tydzień 0 (dostępy)
              do Dzień 30 (weryfikacja gwarancji). Stały retainer po zamknięciu wdrożenia jest w
              osobnej zakładce Utrzymanie.
            </div>
          </Panel>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
            <Panel>
              <Timeline stageIndex={stageIndex} />
            </Panel>

            {!["Kickoff", "Wdrożenie", "Retainer"].includes(selected.status) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255,149,0,0.1)",
                  border: "1px solid var(--warning)",
                }}
              >
                <AlertTriangle
                  size={14}
                  color="var(--warning)"
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  Status klienta w Pipeline to "{selected.status || "brak"}", nie Kickoff, Wdrożenie
                  ani Retainer. Ta zakładka ma sens od podpisania umowy. Sprawdź, czy status jest
                  aktualny.
                </span>
              </div>
            )}

            <Panel>
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    marginBottom: 3,
                  }}
                >
                  Panel 1: Dostępy (Tydzień 0)
                </div>
                {selected.warunkiDniDostepow > 0 && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Termin ustalony z klientem: {selected.warunkiDniDostepow} dni od podpisu umowy.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ACCESS_ITEMS.map((item) => {
                  const isChecked = checked.has(item.key);
                  return (
                    <label
                      key={item.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 10px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                        background: isChecked ? "var(--bg-active)" : "var(--bg)",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          border: `1px solid ${isChecked ? "var(--accent)" : "var(--border)"}`,
                          background: isChecked ? "var(--accent)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {isChecked && <Check size={11} color="#fff" strokeWidth={3} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => void toggleItem(item.key)}
                        style={{ display: "none" }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          color: "var(--text-primary)",
                        }}
                      >
                        {item.label(selected)}
                      </span>
                    </label>
                  );
                })}
              </div>

              {selected.dataPotwierdzeniaDostepow ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(52,199,89,0.1)",
                    border: "1px solid #34c759",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  Zegar 30 dni uruchomiony {fmtDate(selected.dataPotwierdzeniaDostepow)}.
                  Weryfikacja: {fmtDate(addDays(selected.dataPotwierdzeniaDostepow, 30))} (
                  {daysSince(selected.dataPotwierdzeniaDostepow)} dni minęło).
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void confirmAccess()}
                  disabled={!allChecked || confirming}
                  style={{
                    marginTop: 14,
                    height: 36,
                    padding: "0 16px",
                    borderRadius: 8,
                    border: "none",
                    background: allChecked ? "var(--accent)" : "var(--bg-hover)",
                    color: allChecked ? "#fff" : "var(--text-tertiary)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: allChecked ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {confirming && <Loader2 size={13} />}
                  Potwierdź komplet dostępów
                </button>
              )}
              {saving && (
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  Zapisywanie...
                </div>
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
