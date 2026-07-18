"use client";

import { Check, LifeBuoy, Phone, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { ClientSidebar } from "@/components/clients/ClientSidebar";
import { ContactAttemptsBadge } from "@/components/clients/ContactAttemptsBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

// A1, decyzja Michała 2026-07-18: /wdrozenie i /utrzymanie rozdzielone — jednorazowy proces
// vs stały retainer. PROTOTYP: Panel "Co obejmuje retainer" (deterministyczny, wzorem slajdu 6
// prezentacji) jest realnie wpięty w Notion. Metryki miesięczne, drabinka eskalacji i historia
// zgłoszeń są też realnie zapisywane, ale zgodnie z instrukcją "zacznij prototypem" dla
// jednego klienta — czekają na ocenę Michała przed rozbudową (np. o realną integrację z
// logami systemu zamiast ręcznego wpisu metryk, KARTA_PRODUKTU pkt 13).

// Ten sam fallback co DOMYSLNY_RETAINER w /api/notion/prezentacja-dane — pole "Retainer PLN/mc"
// jest wypełniane wyłącznie ręcznie przez Michała, wczesne karty mają je puste.
const DOMYSLNY_RETAINER = 4000;

// Treść identyczna ze slajdu 6 prezentacji (public/prezentacja.html, sekcja "Co obejmuje
// retainer") — jeden opis stałego zakresu retainera, nie dwie wersje tego samego tekstu.
const RETAINER_ZAKRES = [
  "Poprawki przy zmianach API dostawców (TMS, księgowość, KSeF)",
  "Skalowanie systemu wraz ze wzrostem floty i biura",
  "Wsparcie telefoniczne bezpośrednio u Foundera",
  "Kontrola działania systemu na dashboardzie",
  "Naprawa awarii w 24 godziny",
];

// KARTA_PRODUKTU_SYSTEM_OPERACYJNY.md pkt 14, drabinka eskalacji zdecydowana 2026-07-17.
const ESCALATION_LEVELS = [
  {
    minDays: 30,
    label: "Dzień 30",
    action:
      "Prawo do zakończenia współpracy bez zwrotu (jak przy spóźnionych dostępach, §2 ust. 4)",
  },
  {
    minDays: 14,
    label: "Dzień 14",
    action: 'Formalne wstrzymanie prac, status Notion "Wstrzymane — brak kontaktu"',
  },
  { minDays: 7, label: "Dzień 7", action: "Formalne, pisemne zawiadomienie e-mailem (§3 ust. 4b)" },
  {
    minDays: 3,
    label: "Dzień 3-4",
    action: "Telefon + wiadomość wprost: brak odpowiedzi zagraża harmonogramowi",
  },
  {
    minDays: 0,
    label: "Dzień 0",
    action: "Przekroczone 48h — swobodne przypomnienie tym samym kanałem",
  },
] as const;

interface HistoriaEntry {
  data: string;
  opis: string;
}

function parseHistoria(raw: string): HistoriaEntry[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => {
      const [data, ...rest] = line.split(" | ");
      return { data: data?.trim() ?? "", opis: rest.join(" | ").trim() };
    })
    .filter((e) => e.data || e.opis);
}

function serializeHistoria(entries: HistoriaEntry[]): string {
  return entries.map((e) => `${e.data} | ${e.opis}`).join("\n");
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function currentEscalation(days: number) {
  return ESCALATION_LEVELS.find((l) => days >= l.minDays) ?? null;
}

export default function UtrzymanieePage() {
  const [clients, setClients] = useState<PipelineClientDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PipelineClientDetailed | null>(null);
  const [savingKontakt, setSavingKontakt] = useState(false);
  const [nowyOpis, setNowyOpis] = useState("");
  const [savingHistoria, setSavingHistoria] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notion/pipeline");
      const data = await res.json();
      if (data.success) setClients(data.clients as PipelineClientDetailed[]);
    } catch {
      // cichy fail, wzorem reszty dashboardu
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClients();
    const id = setInterval(() => void fetchClients(), 60_000);
    return () => clearInterval(id);
  }, [fetchClients]);

  // Po refetchu trzeba podmienić referencję na świeżą wersję z listy, ten sam wzorzec co
  // /pipeline i /wdrozenie.
  useEffect(() => {
    setSelected((prev) => (prev ? (clients.find((c) => c.id === prev.id) ?? prev) : prev));
  }, [clients]);

  const registerContact = useCallback(async () => {
    if (!selected) return;
    setSavingKontakt(true);
    const today = new Date().toISOString().slice(0, 10);
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: selected.id, ostatniKontaktRetainer: today }),
      });
      await fetchClients();
    } finally {
      setSavingKontakt(false);
    }
  }, [selected, fetchClients]);

  const addHistoriaEntry = useCallback(async () => {
    if (!selected || !nowyOpis.trim()) return;
    setSavingHistoria(true);
    const today = new Date().toISOString().slice(0, 10);
    const entries = parseHistoria(selected.historiaZgloszenRetainer);
    const next = [{ data: today, opis: nowyOpis.trim() }, ...entries];
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: selected.id,
          historiaZgloszenRetainer: serializeHistoria(next),
        }),
      });
      setNowyOpis("");
      await fetchClients();
    } finally {
      setSavingHistoria(false);
    }
  }, [selected, nowyOpis, fetchClients]);

  const retainerAmount = selected && selected.retainer > 0 ? selected.retainer : DOMYSLNY_RETAINER;
  const kontaktDays = selected?.ostatniKontaktRetainer
    ? daysSince(selected.ostatniKontaktRetainer)
    : null;
  const escalation = kontaktDays !== null ? currentEscalation(kontaktDays) : null;
  const historia = selected ? parseHistoria(selected.historiaZgloszenRetainer) : [];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PageHeader icon={<LifeBuoy size={15} color="var(--accent)" />} title="Utrzymanie" />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <ClientSidebar
          clients={clients}
          loading={loading}
          selected={selected}
          onSelect={setSelected}
          onRefresh={fetchClients}
          emptyLabel="Brak klientów"
        />

        <div style={{ flex: 1, overflow: "auto", padding: 20, background: "#F5F5F7" }}>
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
                Wybierz klienta z panelu po lewej. Ta zakładka jest dla klientów w statusie
                Retainer, po zamknięciu weryfikacji Dzień 30 w zakładce Wdrożenie.
              </div>
            </Panel>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
              {selected.status !== "Retainer" && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(255,149,0,0.1)",
                    border: "1px solid var(--warning)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  Status klienta w Pipeline to "{selected.status || "brak"}", nie Retainer. Panel
                  pokazuje dane mimo to, ale sprawdź, czy klient rzeczywiście jest już na
                  utrzymaniu.
                </div>
              )}

              {/* Panel: Co obejmuje retainer — deterministyczny, zero AI, wzorem prezentacji */}
              <Panel>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    marginBottom: 6,
                  }}
                >
                  Co obejmuje retainer
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    color: "var(--text-primary)",
                    marginBottom: 12,
                  }}
                >
                  <strong>{retainerAmount.toLocaleString("pl-PL")} PLN</strong> miesięcznie, opieka
                  nad systemem po wdrożeniu
                  {selected.retainer <= 0 && (
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 6 }}>
                      (fallback, kwota nie ustalona ręcznie w Notion)
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {RETAINER_ZAKRES.map((line) => (
                    <div key={line} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <Check
                        size={13}
                        color="var(--accent)"
                        style={{ flexShrink: 0, marginTop: 2 }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {line}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Panel: Metryki miesięczne — KARTA_PRODUKTU pkt 13 */}
              <Panel>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    marginBottom: 8,
                  }}
                >
                  Metryki miesięczne
                </div>
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg)",
                    border: "1px dashed var(--border)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                  }}
                >
                  Godziny zaoszczędzone, dokumenty przetworzone, wyjątki, czas reakcji: brak
                  integracji z logami systemu (system produktowy jeszcze nie generuje ich per
                  klient). Panel czeka na tę integrację zamiast pokazywać wymyślone liczby — patrz
                  KARTA_PRODUKTU_SYSTEM_OPERACYJNY.md pkt 13.
                </div>
              </Panel>

              {/* Panel: Drabinka eskalacji — reużywa tokeny/styl ContactAttemptsBadge z Pipeline,
                sama odznaka nie pasuje 1:1 (tam licznik prób 1-3, tu dni 0/3-4/7/14/30) */}
              <Panel>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    marginBottom: 8,
                  }}
                >
                  Drabinka eskalacji przy braku kontaktu
                </div>
                {selected.liczbaProb > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <ContactAttemptsBadge proby={selected.liczbaProb} />
                  </div>
                )}
                {selected.ostatniKontaktRetainer ? (
                  <>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginBottom: 10,
                      }}
                    >
                      Ostatni potwierdzony kontakt: {fmtDate(selected.ostatniKontaktRetainer)} (
                      {kontaktDays} dni temu).
                    </div>
                    {escalation && kontaktDays !== null && kontaktDays >= 3 ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          padding: "10px 12px",
                          borderRadius: "var(--radius-sm)",
                          background: kontaktDays >= 14 ? "var(--error-bg)" : "rgba(255,149,0,0.1)",
                          border: `1px solid ${kontaktDays >= 14 ? "var(--error-border)" : "var(--warning)"}`,
                        }}
                      >
                        <Phone
                          size={13}
                          color={kontaktDays >= 14 ? "var(--error)" : "var(--warning)"}
                          style={{ flexShrink: 0, marginTop: 1 }}
                        />
                        <span
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          <strong>{escalation.label}:</strong> {escalation.action}
                        </span>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        Kontakt w normie, poniżej progu 3 dni.
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      marginBottom: 10,
                    }}
                  >
                    Brak zapisanej daty ostatniego kontaktu.
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void registerContact()}
                  disabled={savingKontakt}
                  style={{
                    marginTop: 12,
                    height: 32,
                    padding: "0 12px",
                    borderRadius: 7,
                    border: "1px solid var(--border)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Zarejestruj kontakt dzisiaj
                </button>
              </Panel>

              {/* Panel: Historia zgłoszeń */}
              <Panel>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    marginBottom: 8,
                  }}
                >
                  Historia zgłoszeń
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    value={nowyOpis}
                    onChange={(e) => setNowyOpis(e.target.value)}
                    placeholder="Opis zgłoszenia / interwencji..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void addHistoriaEntry();
                    }}
                    style={{
                      flex: 1,
                      height: 32,
                      borderRadius: 7,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      padding: "0 10px",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-primary)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void addHistoriaEntry()}
                    disabled={savingHistoria || !nowyOpis.trim()}
                    style={{
                      height: 32,
                      padding: "0 10px",
                      borderRadius: 7,
                      border: "none",
                      background: "var(--accent)",
                      color: "#fff",
                      cursor: nowyOpis.trim() ? "pointer" : "not-allowed",
                      opacity: nowyOpis.trim() ? 1 : 0.5,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {historia.length === 0 ? (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Brak zgłoszeń.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {historia.map((e) => (
                      <div
                        key={`${e.data}-${e.opis}`}
                        style={{
                          display: "flex",
                          gap: 10,
                          padding: "7px 10px",
                          borderRadius: "var(--radius-xs)",
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                            flexShrink: 0,
                            width: 78,
                          }}
                        >
                          {fmtDate(e.data)}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {e.opis}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
