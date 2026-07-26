"use client";

import { AlertTriangle, Check, Loader2, Rocket } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";
import { ClientSidebar } from "@/components/clients/ClientSidebar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import {
  type ModuleTimeRow,
  ModuleTimeTable,
  sumGodzinyMiesiecznie,
} from "@/components/wdrozenie/ModuleTimeTable";
import {
  MODULE_CATALOG,
  MODULE_DEFAULT_UNIT,
  MODULE_DEFAULT_WLICZAJ_DO_PROGU,
} from "@/lib/scripts/moduleCatalog";

// A1 (2026-07-18) — PROTOTYP zgodnie z instrukcją "zacznij prototypem: sam Panel Dostępy
// + oś czasu, dla jednego klienta, do oceny Michała". Reszta specyfikacji (Panel Pomiar
// bazowy, Checklist tygodniowa, Panel Weryfikacja Dzień 30 — patrz PLAN_CLAUDE_CODE.md blok
// A1) świadomie NIE zbudowana w tym punkcie, czeka na akceptację kierunku tego prototypu.
//
// Zakres tej zakładki po decyzji Michała (2026-07-18): wyłącznie jednorazowy proces Tydzień 0
// do Dzień 30. Stały retainer po zamknięciu weryfikacji żyje w osobnej zakładce /utrzymanie.

const STAGES = [
  "Kickoff",
  "Tydzień 0",
  "Tydzień 1",
  "Tydzień 2-3",
  "Tydzień 4",
  "Odbiór",
  "Dzień 30",
] as const;

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

// Zadania (Google Tasks), nie sztywne wydarzenia kalendarzowe — umowa mówi że terminy sesji
// ustala się "przez Strony", więc `due` tutaj jest zawsze PRZYBLIŻENIEM/przypomnieniem do
// umówienia, nigdy zapisanym terminem spotkania. "@default" to specjalny identyfikator
// Google Tasks API wskazujący na domyślną listę użytkownika — świadomie nie zgadujemy nazwy
// jednej z realnych list Michała (są 4, różne nazwy własne), żeby nie utworzyć zadania w
// niewłaściwym miejscu. Cichy fail jeśli Google niepodłączone, zwraca false do wywołującego,
// żeby UI mogło pokazać ostrzeżenie zamiast milczeć o nieudanej integracji.
async function createGoogleTask(params: {
  title: string;
  notes?: string;
  due?: string;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/google/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listId: "@default",
        title: params.title,
        notes: params.notes,
        due: params.due,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const MODULE_LABELS: Record<string, string> = Object.fromEntries(
  MODULE_CATALOG.map((m) => [m.code, m.label]),
);

function buildDefaultModuleRows(client: PipelineClientDetailed): ModuleTimeRow[] {
  return MODULE_CATALOG.filter((m) => client.moduleWdrazane.includes(m.code)).map((m) => ({
    moduleId: m.code,
    jednostka: MODULE_DEFAULT_UNIT[m.code] ?? "",
    czasMinut: 0,
    wolumenMiesieczny: 0,
    wliczajDoProgu: MODULE_DEFAULT_WLICZAJ_DO_PROGU[m.code] ?? true,
  }));
}

function parseModuleRows(raw: string): ModuleTimeRow[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ModuleTimeRow[]) : null;
  } catch {
    return null;
  }
}

function computeStageIndex(client: PipelineClientDetailed): number {
  if (!client.kickoffOdbyty) return 0;
  if (!client.dataPotwierdzeniaDostepow) return 1;
  const days = daysSince(client.dataPotwierdzeniaDostepow);
  if (days < 7) return 2;
  if (days < 21) return 3;
  if (days < 30) return 4;
  if (!client.protokolOdbioruPodpisany) return 5;
  return 6;
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
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PipelineClientDetailed | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [savingProtokol, setSavingProtokol] = useState(false);
  const [taskWarning, setTaskWarning] = useState<string | null>(null);
  const [kickoffRows, setKickoffRows] = useState<ModuleTimeRow[]>([]);
  const [savingKickoffTable, setSavingKickoffTable] = useState(false);
  const [verificationVolumes, setVerificationVolumes] = useState<Record<string, number>>({});
  const [savingWeryfikacjaTable, setSavingWeryfikacjaTable] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notion/pipeline");
      const data = await res.json();
      if (data.success) setClients(data.clients as PipelineClientDetailed[]);
    } catch {
      // cichy fail, wzorem reszty dashboardu — polling odświeży za chwilę
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClients();
    const id = setInterval(() => void fetchClients(), 60_000);
    return () => clearInterval(id);
  }, [fetchClients]);

  // Po refetchu (np. po zapisie checkboxa) trzeba podmienić referencję na świeżą wersję
  // z listy, inaczej panel dalej pokazuje stan sprzed zapisu — ten sam wzorzec co /pipeline.
  useEffect(() => {
    setSelected((prev) => (prev ? (clients.find((c) => c.id === prev.id) ?? prev) : prev));
  }, [clients]);

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

  // Inicjalizacja tabeli Kickoff TYLKO przy zmianie wybranego klienta, nie przy każdym
  // pollingu odświeżenia listy (60s) — inaczej niezapisane zmiany w tabeli byłyby co chwilę
  // nadpisywane danymi z serwera, mimo że użytkownik jeszcze edytuje. Zapis jest jawny
  // (przycisk "Zapisz"), więc lokalny stan jest źródłem prawdy między zapisami.
  useEffect(() => {
    if (!selected) {
      setKickoffRows([]);
      setVerificationVolumes({});
      return;
    }
    const savedKickoff = parseModuleRows(selected.tabelaModulowKickoff);
    setKickoffRows(savedKickoff ?? buildDefaultModuleRows(selected));

    const savedWeryfikacja = parseModuleRows(selected.tabelaModulowWeryfikacja);
    setVerificationVolumes(
      savedWeryfikacja
        ? Object.fromEntries(savedWeryfikacja.map((r) => [r.moduleId, r.wolumenMiesieczny]))
        : {},
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // Wiersze Weryfikacji wyprowadzone NA ŻYWO z kickoffRows (jednostka/czas na jednostkę/
  // wliczaj-do-progu), tylko wolumen podmieniony na rzeczywisty (verificationVolumes). Świadomie
  // NIE osobny stan pełnych wierszy — wcześniejsza wersja trzymała drugą kopię tych samych pól i
  // traciła synchronizację z Kickoffem po zapisie (czas na jednostkę zostawał 0, bo kopia
  // powstała zanim tabela Kickoff w ogóle miała zapisane wartości). Zapis nadal robi pełny
  // zrzut JSON (nie sam wolumen), więc dane w Notion są samodzielnym snapshotem.
  const weryfikacjaRows = useMemo<ModuleTimeRow[]>(
    () =>
      kickoffRows.map((r) => ({ ...r, wolumenMiesieczny: verificationVolumes[r.moduleId] ?? 0 })),
    [kickoffRows, verificationVolumes],
  );

  const updateVerificationVolumes = useCallback((rows: ModuleTimeRow[]) => {
    setVerificationVolumes(Object.fromEntries(rows.map((r) => [r.moduleId, r.wolumenMiesieczny])));
  }, []);

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

  // Krok "Kickoff" (2026-07-25) — pierwszy formalny kontakt po podpisaniu (30-45 minut,
  // ustalenie Wykazu dostępów), dotąd brakujący jako punkt w samej osi czasu mimo że
  // poprzedza Panel 1 Dostępy koncepcyjnie. Ten sam prosty wzorzec co panel Odbioru: checkbox
  // + data, bez dodatkowej logiki.
  const toggleKickoff = useCallback(async () => {
    if (!selected) return;
    const next = !selected.kickoffOdbyty;
    setSavingProtokol(true);
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: selected.id,
          kickoffOdbyty: next,
          ...(next && !selected.dataKickoff
            ? { dataKickoff: new Date().toISOString().slice(0, 10) }
            : {}),
        }),
      });
      await fetchClients();
    } finally {
      setSavingProtokol(false);
    }
  }, [selected, fetchClients]);

  const updateDataKickoff = useCallback(
    async (value: string) => {
      if (!selected) return;
      setSavingProtokol(true);
      try {
        await fetch("/api/notion/pipeline-update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: selected.id, dataKickoff: value || null }),
        });
        await fetchClients();
      } finally {
        setSavingProtokol(false);
      }
    },
    [selected, fetchClients],
  );

  // Tabela czasu bazowego per moduł (nowa umowa, Załącznik 1) — wypełniana na Kickoff, suma
  // nadpisuje "Czas bazowy potwierdzony h/mc" (dawniej wpisywane ręcznie jedną liczbą, teraz
  // liczone automatycznie z sumy wierszy modułowych, patrz CLAUDE.md).
  const saveKickoffTable = useCallback(async () => {
    if (!selected) return;
    setSavingKickoffTable(true);
    try {
      const total = Math.round(sumGodzinyMiesiecznie(kickoffRows) * 10) / 10;
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: selected.id,
          tabelaModulowKickoff: JSON.stringify(kickoffRows),
          czasBazowyPotwierdzony: total,
        }),
      });
      await fetchClients();
    } finally {
      setSavingKickoffTable(false);
    }
  }, [selected, kickoffRows, fetchClients]);

  // Ta sama tabela, druga runda na Weryfikacji Dnia 30 — jednostka/czas na jednostkę/wliczaj-
  // do-progu przychodzą z Kickoffu jako tylko-do-odczytu (ModuleTimeTable editableFields=
  // "wolumenOnly"), edytowalny jest wyłącznie rzeczywisty wolumen z minionych 30 dni. Zapisujemy
  // pełny wiersz (nie sam wolumen), żeby zapis był samodzielnym zrzutem stanu w chwili
  // weryfikacji, niezależnym od ewentualnej późniejszej zmiany tabeli Kickoff.
  const saveWeryfikacjaTable = useCallback(async () => {
    if (!selected) return;
    setSavingWeryfikacjaTable(true);
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: selected.id,
          tabelaModulowWeryfikacja: JSON.stringify(weryfikacjaRows),
        }),
      });
      await fetchClients();
    } finally {
      setSavingWeryfikacjaTable(false);
    }
  }, [selected, weryfikacjaRows, fetchClients]);

  // Krok "Odbiór" (nowa umowa §3, między Tydzień 4/Live i Dzień 30/Weryfikacja) — na razie
  // świadomie prosty panel (checkbox + data), bez pełnej logiki usterka krytyczna/niekrytyczna
  // ani "milczącego odbioru", zgodnie z zakresem tej rundy. Może poczekać na kolejną iterację.
  const toggleProtokolOdbioru = useCallback(async () => {
    if (!selected) return;
    const next = !selected.protokolOdbioruPodpisany;
    setSavingProtokol(true);
    setTaskWarning(null);
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: selected.id,
          protokolOdbioruPodpisany: next,
          ...(next && !selected.dataProtokoluOdbioru
            ? { dataProtokoluOdbioru: new Date().toISOString().slice(0, 10) }
            : {}),
        }),
      });
      // Zadanie tworzone tylko przy przejściu false→true, nie przy odznaczeniu — instrukcja
      // KARTA_PRODUKTU/umowa §4 ust. 4: do 3 sesji uzupełniających w trakcie 30-dniowego
      // okresu. Świadomie bez daty due — umowa nie daje punktu odniesienia węższego niż "w
      // trakcie 30 dni", nie zgadujemy konkretnego dnia.
      if (next) {
        const ok = await createGoogleTask({
          title: `Zaplanuj 3 sesje uzupełniające weryfikacji — ${selected.firma}`,
          notes:
            "Umowa §4 ust. 4: do 3 sesji po 30 minut w trakcie 30-dniowego okresu weryfikacji, termin do ustalenia z klientem.",
        });
        if (!ok)
          setTaskWarning(
            "Zadanie w Google Tasks nie zostało utworzone (sprawdź połączenie z Google).",
          );
      }
      await fetchClients();
    } finally {
      setSavingProtokol(false);
    }
  }, [selected, fetchClients]);

  const updateDataProtokolu = useCallback(
    async (value: string) => {
      if (!selected) return;
      setSavingProtokol(true);
      try {
        await fetch("/api/notion/pipeline-update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: selected.id, dataProtokoluOdbioru: value || null }),
        });
        await fetchClients();
      } finally {
        setSavingProtokol(false);
      }
    },
    [selected, fetchClients],
  );

  const confirmAccess = useCallback(async () => {
    if (!selected || !allChecked) return;
    setConfirming(true);
    setTaskWarning(null);
    const today = new Date().toISOString().slice(0, 10);
    try {
      await fetch("/api/notion/pipeline-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: selected.id, dataPotwierdzeniaDostepow: today }),
      });
      // Termin przybliżony: +25 dni, nie dokładnie Dzień 30 — margines żeby zdążyć umówić
      // realny termin z klientem (umowa: terminy sesji ustalane są "przez Strony"), nie
      // sztywne wydarzenie kalendarzowe z domyślną datą.
      const ok = await createGoogleTask({
        title: `Umów termin Dnia 30 — weryfikacja efektywności ${selected.firma}`,
        notes: `Zegar 30-dniowej gwarancji wystartował ${today}. Umów z klientem konkretny termin sesji weryfikacyjnej blisko Dnia 30 — ta data jest tylko przybliżeniem, żeby nie zapomnieć.`,
        due: addDays(today, 25),
      });
      if (!ok)
        setTaskWarning(
          "Zadanie w Google Tasks nie zostało utworzone (sprawdź połączenie z Google).",
        );
      await fetchClients();
    } finally {
      setConfirming(false);
    }
  }, [selected, allChecked, fetchClients]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PageHeader icon={<Rocket size={15} color="var(--accent)" />} title="Wdrożenie" />

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
                Wybierz klienta z panelu po lewej, żeby zobaczyć proces wdrożenia. Docelowo: Tydzień
                0 (dostępy) do Dzień 30 (weryfikacja gwarancji). Stały retainer po zamknięciu
                wdrożenia jest w osobnej zakładce Utrzymanie.
              </div>
            </Panel>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
              <Panel>
                <Timeline stageIndex={stageIndex} />
              </Panel>

              {taskWarning && (
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
                    {taskWarning} Zapis w Notion się powiódł, tylko przypomnienie w Google Tasks nie
                    zostało utworzone — utwórz je ręcznie.
                  </span>
                </div>
              )}

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
                    Status klienta w Pipeline to "{selected.status || "brak"}", nie Kickoff,
                    Wdrożenie ani Retainer. Ta zakładka ma sens od podpisania umowy. Sprawdź, czy
                    status jest aktualny.
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
                    Panel 0: Kickoff
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Pierwszy formalny kontakt po podpisaniu (30-45 minut), ustalenie Wykazu dostępów
                    przed Panelem Dostępy poniżej.
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: selected.kickoffOdbyty ? "var(--bg-active)" : "var(--bg)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: `1px solid ${selected.kickoffOdbyty ? "var(--accent)" : "var(--border)"}`,
                      background: selected.kickoffOdbyty ? "var(--accent)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {selected.kickoffOdbyty && <Check size={11} color="#fff" strokeWidth={3} />}
                  </div>
                  <input
                    type="checkbox"
                    checked={selected.kickoffOdbyty}
                    onChange={() => void toggleKickoff()}
                    style={{ display: "none" }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    Kickoff odbyty
                  </span>
                </label>

                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Data Kickoff
                  </span>
                  <input
                    type="date"
                    value={selected.dataKickoff?.slice(0, 10) ?? ""}
                    onChange={(e) => void updateDataKickoff(e.target.value)}
                    style={{
                      height: 32,
                      padding: "0 8px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--text-primary)",
                      background: "var(--bg)",
                    }}
                  />
                </div>

                <div style={{ marginTop: 18 }}>
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
                    Pomiar bazowy — czas per moduł
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginBottom: 10,
                    }}
                  >
                    Załącznik 1 umowy. Ta sama tabela wraca na Weryfikacji Dnia 30 z rzeczywistym
                    wolumenem.
                  </div>

                  <ModuleTimeTable
                    rows={kickoffRows}
                    moduleLabels={MODULE_LABELS}
                    editableFields="all"
                    onChange={setKickoffRows}
                  />

                  {kickoffRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void saveKickoffTable()}
                      disabled={savingKickoffTable}
                      style={{
                        marginTop: 12,
                        height: 34,
                        padding: "0 14px",
                        borderRadius: 8,
                        border: "none",
                        background: "var(--accent)",
                        color: "#fff",
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: savingKickoffTable ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {savingKickoffTable && <Loader2 size={13} />}
                      Zapisz tabelę Kickoff
                    </button>
                  )}
                </div>
              </Panel>

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
                      Termin ustalony z klientem: {selected.warunkiDniDostepow} dni od podpisu
                      umowy.
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
                    Panel 2: Odbiór systemu
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Formalny odbiór wg umowy §3. Na razie prosty panel — protokół + data, bez
                    rozróżnienia usterka krytyczna/niekrytyczna ani "milczącego odbioru".
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: selected.protokolOdbioruPodpisany
                      ? "var(--bg-active)"
                      : "var(--bg)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: `1px solid ${selected.protokolOdbioruPodpisany ? "var(--accent)" : "var(--border)"}`,
                      background: selected.protokolOdbioruPodpisany
                        ? "var(--accent)"
                        : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {selected.protokolOdbioruPodpisany && (
                      <Check size={11} color="#fff" strokeWidth={3} />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={selected.protokolOdbioruPodpisany}
                    onChange={() => void toggleProtokolOdbioru()}
                    style={{ display: "none" }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    Protokół odbioru podpisany
                  </span>
                </label>

                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Data protokołu
                  </span>
                  <input
                    type="date"
                    value={selected.dataProtokoluOdbioru?.slice(0, 10) ?? ""}
                    onChange={(e) => void updateDataProtokolu(e.target.value)}
                    style={{
                      height: 32,
                      padding: "0 8px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--text-primary)",
                      background: "var(--bg)",
                    }}
                  />
                </div>

                {savingProtokol && (
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
                    Panel 3: Weryfikacja (Dzień 30)
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Ta sama tabela co na Kickoffie — jednostka i czas na jednostkę nie zmieniają
                    się, wpisz rzeczywisty wolumen z minionych 30 dni (z logów systemu). Suma
                    porównana z progiem 70% zapisanym na Kickoffie.
                  </div>
                </div>

                {kickoffRows.length === 0 ? (
                  <div
                    style={{
                      padding: "10px 12px",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Uzupełnij i zapisz tabelę Kickoff w Panelu 0 zanim rozpoczniesz weryfikację — to
                    stamtąd pochodzi jednostka, czas na jednostkę i próg gwarancji.
                  </div>
                ) : (
                  <>
                    <ModuleTimeTable
                      rows={weryfikacjaRows}
                      moduleLabels={MODULE_LABELS}
                      editableFields="wolumenOnly"
                      onChange={updateVerificationVolumes}
                      progGwarancji={Math.round(sumGodzinyMiesiecznie(kickoffRows) * 0.7 * 10) / 10}
                    />

                    <button
                      type="button"
                      onClick={() => void saveWeryfikacjaTable()}
                      disabled={savingWeryfikacjaTable}
                      style={{
                        marginTop: 12,
                        height: 34,
                        padding: "0 14px",
                        borderRadius: 8,
                        border: "none",
                        background: "var(--accent)",
                        color: "#fff",
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: savingWeryfikacjaTable ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {savingWeryfikacjaTable && <Loader2 size={13} />}
                      Zapisz weryfikację
                    </button>
                  </>
                )}
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
