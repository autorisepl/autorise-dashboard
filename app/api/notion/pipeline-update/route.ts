// Wewnętrznie zapisuje do Supabase (public.pipeline), NIE do Notion — przepięte 2026-08-22.
// Kontrakt zewnętrzny (URL, nazwy pól body) pozostał identyczny. "pageId" w body to teraz
// Supabase `id` (uuid), nie notion_page_id — patrz app/api/notion/pipeline/route.ts, które
// zwraca właśnie to `id` jako pole "id" odpowiedzi. Notion nie jest już w ogóle zapisywany
// przez ten route. Osobny endpoint app/api/pipeline/[id]/route.ts (Supabase, inny kontrakt)
// zostaje nietknięty — to on jest referencją nazw kolumn użytą tutaj do mapowania.
import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhonePL } from "@/lib/format/normalizePhonePL";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  pageId: z.string().min(1),
  status: z.string().optional(),
  nastepnyKrok: z.string().optional(),
  dataFollowup: z.string().nullable().optional(),
  typFollowup: z.string().nullable().optional(),
  kontekstFollowup: z.string().nullable().optional(),
  powodNiekwalifikowania: z.string().nullable().optional(),
  dataReengagement: z.string().nullable().optional(),
  liczbaProb: z.number().optional(),
  firma: z.string().optional(),
  kontakt: z.string().optional(),
  telefon: z.string().optional(),
  email: z.string().optional(),
  notatki: z.string().optional(),
  dniDostepow: z.number().nullable().optional(),
  uwagiWarunki: z.string().nullable().optional(),
  pozaZakresem: z.string().nullable().optional(),
  utracony: z.boolean().optional(),
  powodUtraty: z.string().nullable().optional(),
  dataPotwierdzeniaDostepow: z.string().nullable().optional(),
  czasBazowyPotwierdzony: z.number().nullable().optional(),
  dostepyZebrane: z.string().nullable().optional(),
  ostatniKontaktRetainer: z.string().nullable().optional(),
  historiaZgloszenRetainer: z.string().nullable().optional(),
  wynikDiscovery: z.string().nullable().optional(),
  protokolOdbioruPodpisany: z.boolean().optional(),
  dataProtokoluOdbioru: z.string().nullable().optional(),
  kickoffOdbyty: z.boolean().optional(),
  dataKickoff: z.string().nullable().optional(),
  moduleWdrazane: z.array(z.string()).optional(),
  tabelaModulowKickoff: z.string().nullable().optional(),
  tabelaModulowWeryfikacja: z.string().nullable().optional(),
  celEfektywnosciProcent: z.number().nullable().optional(),
  tabelaModulowPrzedkontraktowa: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" },
        { status: 400 },
      );
    }

    const d = parsed.data;
    const columns: Record<string, string | number | boolean | string[] | null> = {};

    if (d.status !== undefined) columns.status = d.status;
    if (d.nastepnyKrok !== undefined) columns.nastepny_krok = d.nastepnyKrok;
    if (d.dataFollowup !== undefined) columns.data_nastepnego_kroku = d.dataFollowup || null;
    if (d.typFollowup !== undefined) columns.typ_follow_up = d.typFollowup || null;
    if (d.kontekstFollowup !== undefined && d.kontekstFollowup) {
      columns.nastepny_krok = `[Follow-up: ${d.typFollowup ?? ""}] ${d.kontekstFollowup}`;
    }
    if (d.powodNiekwalifikowania !== undefined) {
      columns.powod_rezygnacji = d.powodNiekwalifikowania || null;
    }
    if (d.dataReengagement !== undefined) columns.re_engagement = d.dataReengagement || null;
    if (d.liczbaProb !== undefined) columns.liczba_prob_kontaktu = d.liczbaProb;
    if (d.firma !== undefined && d.firma) columns.firma = d.firma;
    if (d.kontakt !== undefined) columns.kontakt = d.kontakt;
    if (d.telefon !== undefined) {
      const normalized = d.telefon ? normalizePhonePL(d.telefon) : null;
      if (d.telefon && !normalized)
        console.warn(`normalizePhonePL: nie udało się znormalizować "${d.telefon}"`);
      columns.telefon = normalized ?? d.telefon;
    }
    if (d.email !== undefined) columns.email = d.email;
    if (d.notatki !== undefined) columns.notatki = d.notatki;
    if (d.dniDostepow !== undefined) columns.warunki_umowy_dni_dostepow = d.dniDostepow;
    if (d.uwagiWarunki !== undefined) columns.warunki_umowy_uwagi = d.uwagiWarunki;
    if (d.pozaZakresem !== undefined) columns.poza_zakresem_ustalenia = d.pozaZakresem;
    if (d.utracony !== undefined) columns.utracony = d.utracony;
    if (d.powodUtraty !== undefined) columns.powod_utraty = d.powodUtraty;
    if (d.dataPotwierdzeniaDostepow !== undefined)
      columns.data_potwierdzenia_dostepow = d.dataPotwierdzeniaDostepow || null;
    if (d.czasBazowyPotwierdzony !== undefined)
      columns.czas_bazowy_potwierdzony_h_mc = d.czasBazowyPotwierdzony;
    if (d.dostepyZebrane !== undefined) columns.dostepy_zebrane = d.dostepyZebrane;
    if (d.ostatniKontaktRetainer !== undefined)
      columns.ostatni_kontakt_retainer = d.ostatniKontaktRetainer || null;
    if (d.historiaZgloszenRetainer !== undefined)
      columns.historia_zgloszen_retainer = d.historiaZgloszenRetainer;
    if (d.wynikDiscovery !== undefined) columns.wynik_discovery = d.wynikDiscovery || null;
    if (d.protokolOdbioruPodpisany !== undefined)
      columns.protokol_odbioru_podpisany = d.protokolOdbioruPodpisany;
    if (d.dataProtokoluOdbioru !== undefined)
      columns.data_protokolu_odbioru = d.dataProtokoluOdbioru || null;
    if (d.kickoffOdbyty !== undefined) columns.kickoff_odbyty = d.kickoffOdbyty;
    if (d.dataKickoff !== undefined) columns.data_kickoff = d.dataKickoff || null;
    if (d.moduleWdrazane !== undefined) columns.moduly_wdrazane = d.moduleWdrazane;
    if (d.tabelaModulowKickoff !== undefined)
      columns.tabela_modulow_kickoff = d.tabelaModulowKickoff;
    if (d.tabelaModulowWeryfikacja !== undefined)
      columns.tabela_modulow_weryfikacja = d.tabelaModulowWeryfikacja;
    if (d.celEfektywnosciProcent !== undefined)
      columns.cel_efektywnosci_procent = d.celEfektywnosciProcent;
    if (d.tabelaModulowPrzedkontraktowa !== undefined)
      columns.tabela_modulow_przedkontraktowa = d.tabelaModulowPrzedkontraktowa;

    if (Object.keys(columns).length === 0) {
      return NextResponse.json(
        { success: false, error: "Brak pól do aktualizacji" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("pipeline").update(columns).eq("id", d.pageId);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Nieznany błąd";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// Zachowane dla wstecznej zgodności (KalkulatorRoi.tsx) — wyłącznie pola numeryczne.
export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const schema = z.object({
      pageId: z.string().min(1),
      fields: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
    });
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" },
        { status: 400 },
      );
    }

    const { pageId, fields } = parsed.data;
    const FIELD_MAP: Record<string, string> = {
      koszt_problemu: "koszt_problemu_pln_mc",
      koszt_roczny: "koszt_roczny_pln_rok",
      maile_dziennie: "maile_ze_zleceniami_dzien",
      godziny_wpisywania: "godziny_wpisywania_spedytor",
      faktury_po_terminie: "faktury_po_terminie_mc",
      srednia_wartosc_faktury: "srednia_wartosc_faktury_pln",
    };

    const columns: Record<string, number> = {};
    for (const [key, column] of Object.entries(FIELD_MAP)) {
      const val = fields[key];
      if (val != null && typeof val === "number") {
        columns[column] = val;
      }
    }

    if (Object.keys(columns).length === 0) {
      return NextResponse.json(
        { success: false, error: "Brak pól do aktualizacji" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("pipeline").update(columns).eq("id", pageId);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Nieznany błąd";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
