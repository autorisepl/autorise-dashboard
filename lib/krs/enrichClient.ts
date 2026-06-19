export interface KRSZarzad {
  imie: string;
  nazwisko: string;
  funkcja: string;
}

export interface KRSEnrichment {
  firma_oficjalna: string | null;
  krs_numer: string | null;
  nip_normalized: string | null;
  regon: string | null;
  adres: string | null;
  vat_status: string | null;
  pkd_glowne: string | null;
  pkd_kody: string[];
  zarzad: KRSZarzad[];
  branza_tsl: boolean;
  source: "krs+mf" | "mf_only" | "none";
  raw_text: string;
}

const TSL_PREFIXES = ["49", "50", "51", "52", "53", "77.12"];

function normalizNIP(nip: string): string {
  return nip.replace(/[\s-]/g, "").replace(/^PL/i, "");
}

function isTSL(pkdKody: string[]): boolean {
  return pkdKody.some((kod) =>
    TSL_PREFIXES.some((p) => kod.replace(".", "").startsWith(p.replace(".", ""))),
  );
}

function formatAdres(obj: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const ulica = (obj["ulica"] ?? obj["ulicaINumer"] ?? "") as string;
  const nr = (obj["nrDomu"] ?? obj["nrLokalu"] ?? "") as string;
  const miasto = (obj["miejscowosc"] ?? obj["miasto"] ?? "") as string;
  const kod = (obj["kodPocztowy"] ?? obj["kod"] ?? "") as string;

  if (ulica) parts.push(ulica + (nr ? ` ${nr}` : ""));
  if (kod || miasto) parts.push([kod, miasto].filter(Boolean).join(" "));
  return parts.length > 0 ? parts.join(", ") : null;
}

function safeStr(val: unknown): string {
  return typeof val === "string" ? val.trim() : "";
}

// ── MF Whitelist API (Ministry of Finance VAT whitelist) ─────────────
// Free, no auth, very reliable — returns basic company data + KRS number

async function fetchMFWhitelist(nip: string): Promise<{
  firma: string | null;
  krs: string | null;
  regon: string | null;
  adres: string | null;
  vat_status: string | null;
} | null> {
  const today = new Date().toISOString().split("T")[0];
  const url = `https://wl-api.mf.gov.pl/api/search/nip/${encodeURIComponent(nip)}?date=${today}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      result?: {
        subject?: {
          name?: string;
          krs?: string;
          regon?: string;
          residenceAddress?: string;
          workingAddress?: string;
          statusVat?: string;
        };
      };
    };

    const subject = data?.result?.subject;
    if (!subject) return null;

    return {
      firma: subject.name ?? null,
      krs: subject.krs ?? null,
      regon: subject.regon ?? null,
      adres: subject.residenceAddress ?? subject.workingAddress ?? null,
      vat_status: subject.statusVat ?? null,
    };
  } catch {
    return null;
  }
}

// ── KRS Open API (Ministry of Justice) ──────────────────────────────
// Free, no auth — returns management board, PKD codes, full details

async function fetchKRSOdpis(krsNumber: string): Promise<{
  pkd_glowne: string | null;
  pkd_kody: string[];
  zarzad: KRSZarzad[];
  adres: string | null;
} | null> {
  const krsClean = krsNumber.replace(/\D/g, "").padStart(10, "0");
  const url = `https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/${krsClean}?rejestr=P&format=json`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as Record<string, any>;

    // KRS API response structure varies — attempt multiple paths
    const odpis = data?.odpis ?? data?.OrganizacjaPubliczna ?? data;
    const dane = odpis?.dane ?? odpis?.Dane ?? {};
    const dzial1 = dane?.dzial1 ?? dane?.Dzial1 ?? {};
    const dzial2 = dane?.dzial2 ?? dane?.Dzial2 ?? {};

    // PKD codes
    const pkdKody: string[] = [];
    let pkdGlowne: string | null = null;

    const pkdMain =
      dzial1?.pkdDzialalnosciPrzewazajacej ?? dzial1?.pkdPrzewazajaca ?? dzial1?.pkdGlowne;
    if (pkdMain) {
      const kod = safeStr(pkdMain.kodPkd ?? pkdMain.kod ?? pkdMain.kodPKD);
      const opis = safeStr(pkdMain.opisPkd ?? pkdMain.opis ?? pkdMain.opisPKD);
      if (kod) {
        pkdGlowne = opis ? `${kod} ${opis}` : kod;
        pkdKody.push(kod);
      }
    }

    const pkdDod = dzial1?.pkdDzialalnosciPozostalej ?? dzial1?.pkdDodatkowe ?? [];
    if (Array.isArray(pkdDod)) {
      for (const p of pkdDod) {
        const k = safeStr(p.kodPkd ?? p.kod ?? p.kodPKD);
        if (k && !pkdKody.includes(k)) pkdKody.push(k);
      }
    }

    // Address
    let adres: string | null = null;
    const siedz = dzial1?.daneSiedziby ?? dzial1?.siedziba ?? {};
    if (siedz?.adres) {
      adres =
        typeof siedz.adres === "string"
          ? siedz.adres
          : formatAdres(siedz.adres as Record<string, unknown>);
    } else if (siedz?.miejscowosc || siedz?.ulica) {
      adres = formatAdres(siedz as Record<string, unknown>);
    }

    // Management board — try multiple paths
    const zarzad: KRSZarzad[] = [];
    const organ = dzial2?.organPrzedstawicielski ?? dzial2?.reprezentacja ?? dzial2?.zarzad ?? {};

    const czlonkowie: unknown[] =
      organ?.czlonkowie ?? organ?.dane ?? organ?.osoby ?? organ?.listaOsob ?? [];

    if (Array.isArray(czlonkowie)) {
      for (const c of czlonkowie) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const osoba = (c as any)?.osobaFizyczna ?? (c as any)?.osoba ?? c ?? {};
        const imie = safeStr(osoba.imie1 ?? osoba.imie ?? osoba.firstName ?? osoba.Imie);
        const nazwisko = safeStr(osoba.nazwisko ?? osoba.lastName ?? osoba.Nazwisko);
        const funkcja = safeStr(
          osoba.pelnionaFunkcja ??
            osoba.pelnioneFunkcje ??
            osoba.funkcja ??
            osoba.Funkcja ??
            osoba.rola ??
            "Członek zarządu",
        );
        if (imie && nazwisko) {
          zarzad.push({ imie, nazwisko, funkcja: funkcja.toUpperCase() || "CZŁONEK ZARZĄDU" });
        }
      }
    }

    return { pkd_glowne: pkdGlowne, pkd_kody: pkdKody, zarzad, adres };
  } catch {
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────

export async function enrichByNIP(nip: string): Promise<KRSEnrichment> {
  const nipClean = normalizNIP(nip);
  const empty: KRSEnrichment = {
    firma_oficjalna: null,
    krs_numer: null,
    nip_normalized: nipClean,
    regon: null,
    adres: null,
    vat_status: null,
    pkd_glowne: null,
    pkd_kody: [],
    zarzad: [],
    branza_tsl: false,
    source: "none",
    raw_text: `Brak danych dla NIP: ${nipClean}`,
  };

  if (!nipClean || nipClean.length !== 10 || !/^\d+$/.test(nipClean)) {
    return { ...empty, raw_text: `Nieprawidłowy NIP: ${nip}` };
  }

  // Step 1: MF whitelist
  const mf = await fetchMFWhitelist(nipClean);
  if (!mf) return empty;

  let result: KRSEnrichment = {
    ...empty,
    firma_oficjalna: mf.firma,
    krs_numer: mf.krs,
    regon: mf.regon,
    adres: mf.adres,
    vat_status: mf.vat_status,
    source: "mf_only",
  };

  // Step 2: KRS details (if we have a KRS number)
  if (mf.krs) {
    const krs = await fetchKRSOdpis(mf.krs);
    if (krs) {
      result = {
        ...result,
        pkd_glowne: krs.pkd_glowne,
        pkd_kody: krs.pkd_kody,
        zarzad: krs.zarzad,
        adres: krs.adres ?? result.adres,
        branza_tsl: isTSL(krs.pkd_kody),
        source: "krs+mf",
      };
    }
  }

  // Build human-readable text for the Claude prompt
  const lines: string[] = ["=== DANE Z REJESTRÓW PUBLICZNYCH ==="];
  if (result.firma_oficjalna) lines.push(`Nazwa oficjalna: ${result.firma_oficjalna}`);
  lines.push(`NIP: ${nipClean}`);
  if (result.krs_numer) lines.push(`KRS: ${result.krs_numer}`);
  if (result.regon) lines.push(`REGON: ${result.regon}`);
  if (result.adres) lines.push(`Adres: ${result.adres}`);
  if (result.vat_status) lines.push(`Status VAT: ${result.vat_status}`);
  if (result.pkd_glowne) lines.push(`PKD główne: ${result.pkd_glowne}`);
  if (result.pkd_kody.length > 1)
    lines.push(`PKD dodatkowe: ${result.pkd_kody.slice(1, 8).join(", ")}`);
  lines.push(
    `Branża TSL: ${result.branza_tsl ? "TAK (kody PKD potwierdzają transport)" : "NIE / NIEZNANE"}`,
  );

  if (result.zarzad.length > 0) {
    lines.push("\nZARZĄD / REPREZENTACJA:");
    for (const z of result.zarzad) {
      lines.push(`  • ${z.imie} ${z.nazwisko} — ${z.funkcja}`);
    }
  } else {
    lines.push("\nZARZĄD: brak danych (KRS nie zwrócił zarządu)");
  }

  result.raw_text = lines.join("\n");
  return result;
}

export async function enrichByName(companyName: string): Promise<KRSEnrichment | null> {
  // Name search via KRS podmiotSzukany endpoint
  const encoded = encodeURIComponent(companyName.slice(0, 60));
  const url = `https://api-krs.ms.gov.pl/api/krs/podmiotSzukanyVersja3?nazwa=${encoded}&rejestr=P&format=json&strona=1&maxWynikow=1`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    const items: unknown[] = data?.items ?? data?.odpisy ?? [];
    if (!Array.isArray(items) || items.length === 0) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const first = items[0] as any;
    const nip = safeStr(first?.nip ?? first?.identyfikatoryPodmiotu?.nip);
    if (nip) return enrichByNIP(nip);

    return null;
  } catch {
    return null;
  }
}
