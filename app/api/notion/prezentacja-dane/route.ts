import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Gwarancja to procent czasu bazowego klienta (minimum 70%, patrz AGENT1_SYSTEM_PROMPT i
// SZKIC_UMOWA_AUTORISE.md §4, wersja umowy 2026-07-24), nie sztywna liczba firmowa — ten sam
// mechanizm co placeholder [gwarancja godzin] w lib/scripts/sprzedaz.ts (`fill()` w
// app/(dashboard)/sprzedaz/page.tsx).
const GWARANCJA_PROCENT = 0.7;
// "Po wdrożeniu" nie ma dedykowanego pola w Notion — Agent 3 szacuje je jako 10-15%
// wartości "Dziś" (patrz AGENT3_SYSTEM_PROMPT). Ten endpoint nie wywołuje AI, więc
// replikuje tę samą heurystykę deterministycznie, na środku podanego zakresu (12.5%).
const PO_WDROZENIU_FRACTION = 0.125;
// "Godziny wpisywania / spedytor" to godziny DZIENNIE NA JEDNĄ OSOBĘ, nie h/mc całego
// biura — ten sam wzór co koszt_problemu.wzor_obliczenia Agenta 1 (patrz prompts.ts):
// godziny dziennie × liczba spedytorów × dni robocze/mc.
const DNI_ROBOCZE_MC = 21;
// Cena standardowa, zdefiniowana w lib/agents/prompts.ts (Agent 1/2/5) i SZKIC_UMOWA_AUTORISE.md
// §5 ust. 1 (wersja umowy z 2026-07-24): 18 000 PLN, jedna cena, bez rabatu za terminowość —
// mechanizm rabatu (poprzednia wersja umowy) usunięty. Pole Notion "Cena wdrożenia" jest
// wypełniane ręcznie przez Michała — puste pole oznacza standardową ofertę, nie brak ceny, więc
// fallback na tę stałą zamiast null/"ustalana indywidualnie". Wartość ręcznie wpisana w Notion to
// zawsze cena finalna dla wdrożeń niestandardowych (poza 4 modułami albo skalą floty/biura).
const DOMYSLNA_CENA_WDROZENIA = 18000;
const DOMYSLNY_RETAINER = 4000;

interface PrezentacjaRow {
  firma: string;
  koszt_problemu_pln_mc: number | null;
  koszt_roczny_pln_rok: number | null;
  godziny_wpisywania_spedytor: number | null;
  spedytorzy: number | null;
  tms: string | null;
  cena_wdrozenia: number | null;
  retainer_pln_mc: number | null;
  bol_glowny: string | null;
  czas_bazowy_potwierdzony_h_mc: number | null;
}

type BolKategoria = "dokumenty" | "tms" | "komunikacja" | "widocznosc" | null;

// Proste dopasowanie słów kluczowych do treści "Ból główny" — brak jednoznacznego
// trafienia (albo puste pole) zwraca null, front-end wtedy nie podświetla żadnego modułu.
function determineBolKategoria(bolGlowny: string): BolKategoria {
  const text = bolGlowny.toLowerCase();
  if (!text) return null;
  if (/faktur|cmr|dokument|pod\b|excel/.test(text)) return "dokumenty";
  if (/tms|system|wpisywani[ae]|wpisuj/.test(text)) return "tms";
  if (/sms|telefon|dzwoni|klient pyta|powiadomien/.test(text)) return "komunikacja";
  if (/widoczno|status|nie wiadomo/.test(text)) return "widocznosc";
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ znaleziono: false, error: "Brak parametru id" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: row, error } = await supabase
      .from("pipeline")
      .select(
        "firma, koszt_problemu_pln_mc, koszt_roczny_pln_rok, godziny_wpisywania_spedytor, spedytorzy, tms, cena_wdrozenia, retainer_pln_mc, bol_glowny, czas_bazowy_potwierdzony_h_mc",
      )
      .eq("id", id)
      .maybeSingle<PrezentacjaRow>();

    if (error) {
      return NextResponse.json({ znaleziono: false, error: error.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ znaleziono: false });
    }

    const firma = row.firma ?? "";
    const kosztMiesiecznie = row.koszt_problemu_pln_mc ?? 0;
    const kosztRoczny = row.koszt_roczny_pln_rok ?? 0;
    const godzinyDziennie = row.godziny_wpisywania_spedytor ?? 0;
    const spedytorzy = row.spedytorzy ?? 0;
    const tms = row.tms ?? "";
    const cenaWdrozenia = row.cena_wdrozenia ?? 0;
    const retainer = row.retainer_pln_mc ?? 0;
    const bolGlowny = row.bol_glowny ?? "";
    const czasBazowyPotwierdzony = row.czas_bazowy_potwierdzony_h_mc ?? 0;

    // roi = h/mc CAŁEGO biura, nie surowa wartość dzienna na osobę (patrz stała
    // DNI_ROBOCZE_MC wyżej). Brak "Spedytorzy" w Notion nie może cicho wyzerować
    // wyniku przez mnożenie przez 0 — fallback na samą wartość dzienną z jawnym
    // ostrzeżeniem, żeby niepełne dane było widać, nie zgadywać w ciemno.
    let roi: number;
    let ostrzezenie: string | null = null;
    if (spedytorzy > 0) {
      roi = Math.round(godzinyDziennie * spedytorzy * DNI_ROBOCZE_MC);
    } else {
      roi = Math.round(godzinyDziennie);
      if (godzinyDziennie > 0) {
        ostrzezenie =
          'Brak liczby spedytorów w polu "Spedytorzy" w Notion — roi to surowa wartość dzienna na jedną osobę, nie h/mc całego biura. Uzupełnij "Spedytorzy" w Pipeline dla poprawnego przeliczenia.';
      }
    }

    const po = roi > 0 ? Math.max(Math.round(roi * PO_WDROZENIU_FRACTION), 0) : 0;

    // Gwarancja 70% czasu bazowego. "Czas bazowy potwierdzony h/mc" jest zwykle jeszcze puste
    // przed podpisaniem (wypełniane dopiero podczas Pomiaru bazowego po Kickoff), więc honest
    // fallback na `roi` (bieżący szacunek "Dziś" z kalkulatora kwalifikacji) — nie pokazujemy
    // null/0 na slajdzie gwarancji tylko dlatego że formalne potwierdzenie jeszcze nie nastąpiło.
    const bazaGwarancji = czasBazowyPotwierdzony > 0 ? czasBazowyPotwierdzony : roi;
    const gwarancjaH = bazaGwarancji > 0 ? Math.round(bazaGwarancji * GWARANCJA_PROCENT) : null;

    // Pole puste w Notion (<=0) = standardowa oferta, nie brak ceny — fallback na cenę
    // 18000 zamiast null/"ustalana indywidualnie". Wartość faktycznie wpisana ręcznie
    // (niestandardowe wdrożenie, poza 4 modułami/skalą floty) zawsze ma pierwszeństwo.
    // cena_z_rabatem zostaje zawsze null — mechanizm rabatu za terminowość usunięty z nowej
    // wersji umowy (2026-07-24), front-end przy null pokazuje jedną kwotę bez przekreślenia.
    const cenaWdrozeniaEfektywna = cenaWdrozenia > 0 ? cenaWdrozenia : DOMYSLNA_CENA_WDROZENIA;
    const cenaZRabatem: number | null = null;
    const retainerEfektywny = retainer > 0 ? retainer : DOMYSLNY_RETAINER;

    // ROI/payback liczone względem ceny którą klient faktycznie zapłaci — jedna cena,
    // bez wariantu z rabatem.
    const cenaDoPrzelicznikaRoi = cenaWdrozeniaEfektywna;
    let procentKosztu: number | null = null;
    let paybackMiesiace: number | null = null;
    if (kosztMiesiecznie > 0) {
      paybackMiesiace = Math.round(cenaDoPrzelicznikaRoi / kosztMiesiecznie);
      if (kosztRoczny > 0) {
        procentKosztu = Math.round((cenaDoPrzelicznikaRoi / kosztRoczny) * 100);
      }
    }

    return NextResponse.json({
      znaleziono: true,
      firma,
      roi,
      po,
      bol: kosztRoczny,
      tms,
      gwar: gwarancjaH,
      cena_wdrozenia: cenaWdrozeniaEfektywna,
      cena_z_rabatem: cenaZRabatem,
      retainer: retainerEfektywny,
      procent_kosztu: procentKosztu,
      payback_miesiace: paybackMiesiace,
      bol_glowny: bolGlowny,
      bol_kategoria: determineBolKategoria(bolGlowny),
      ostrzezenie,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Supabase";
    return NextResponse.json({ znaleziono: false, error: msg }, { status: 500 });
  }
}
