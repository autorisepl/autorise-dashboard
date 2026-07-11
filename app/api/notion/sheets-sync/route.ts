import { Client } from "@notionhq/client";
import { type NextRequest, NextResponse } from "next/server";
import { normalizePhonePL } from "@/lib/format/normalizePhonePL";
import { getRefreshToken, getSheetsClient } from "@/lib/google/auth";
import { getPipelineClients } from "@/lib/notion/client";

const SHEET_ID = "18BjXDFAWDVQnQkrE_1Kmvj0-ZJIGXQejLY6IJOOXnH0";
const PIPELINE_DB_ID = "75ac8bc6fd6d4c36934bedc1270217eb";

function richText(text: string) {
  return [{ type: "text" as const, text: { content: text.slice(0, 2000) } }];
}

export interface SheetsSyncResult {
  created: number;
  skipped: number;
  errors: string[];
}

// Flexible column finder — tries each regex pattern in order, returns first match
function findCol(headers: string[], ...patterns: RegExp[]): string | undefined {
  for (const p of patterns) {
    const h = headers.find((h) => p.test(h));
    if (h) return h;
  }
  return undefined;
}

// Derive Notion Pipeline status from sheet boolean columns (same logic as agencja/page.tsx deriveStage)
function deriveNotionStatus(row: Record<string, string | number>, headers: string[]): string {
  const isTruthy = (v: unknown) => {
    const t = String(v ?? "")
      .trim()
      .toLowerCase();
    return t === "true" || t === "tak" || t === "✓" || t === "x" || t === "1";
  };
  const get = (re: RegExp) => {
    const h = headers.find((x) => re.test(x));
    return h ? isTruthy(row[h]) : false;
  };

  if (get(/pozyskany\s+klient/i) || get(/podpisana\s+umowa/i) || get(/op[lł]acona\s+faktura/i))
    return "Kickoff";
  if (get(/odbyte\s+spotkanie\s+decyzyjne/i) || get(/um[oó]wione\s+spotkanie\s+decyzyjne/i))
    return "Finalizacja";
  if (get(/odbyta\s+rozmowa\s+sprzeda/i) || get(/um[oó]wiona\s+rozmowa\s+sprzeda/i))
    return "Kwalifikacja";
  if (get(/rozmowa\s+telefoniczna.*kwalifik/i) || get(/^rozmowa.*kwalifik/i)) return "Kwalifikacja";
  return "Nowy lead";
}

export async function POST(req: NextRequest) {
  const token = getRefreshToken({
    get: (name: string) => {
      const val = req.cookies.get(name);
      return val ? { value: val.value } : undefined;
    },
  });

  if (!token) {
    return NextResponse.json({ error: "Not connected to Google" }, { status: 401 });
  }

  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  try {
    const sheets = getSheetsClient(token);

    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const allSheets = meta.data.sheets ?? [];
    const sheetTitle =
      allSheets.find((s) => s.properties?.title === "Kontakty")?.properties?.title ??
      allSheets[0]?.properties?.title ??
      "Sheet1";

    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetTitle}!A1:AZ2000`,
    });

    const allRows = data.values ?? [];
    if (allRows.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, errors: [] } satisfies SheetsSyncResult);
    }

    const headers = (allRows[0] ?? []).map(String);

    // Detect columns flexibly — handles any naming convention
    const companyKey = findCol(
      headers,
      /^firma$/i,
      /^company$/i,
      /^organizacj/i,
      /^nazwa\s+firm/i,
      /^nazwa\s+klient/i,
    );
    const nameKey = findCol(
      headers,
      /^imię?\s*i\s*nazwisko$/i,
      /^imie\s*i\s*nazwisko$/i,
      /^imię$/i,
      /^imie$/i,
      /^imię$/i,
      /^kontakt$/i,
      /^osoba$/i,
      /^nazwa$/i,
      /^name$/i,
    );
    const phoneKey = findCol(
      headers,
      /^telefon$/i,
      /^numer\s+telefonu$/i,
      /^numer$/i,
      /^phone$/i,
      /^tel\.?$/i,
      /^mob/i,
      /^kom/i,
    );
    const emailKey = findCol(headers, /^email$/i, /^e-mail$/i, /^mail$/i);
    const notesKey = findCol(
      headers,
      /^notatki$/i,
      /^uwagi$/i,
      /^notes$/i,
      /^comment/i,
      /^opis$/i,
      /^info$/i,
    );

    const rows = allRows
      .slice(1)
      .map((row, idx) => {
        const contact: Record<string, string | number> = { _row: idx + 2 };
        headers.forEach((h, i) => {
          contact[h] = String(row[i] ?? "");
        });
        return contact;
      })
      .filter((r) => headers.some((h) => h !== "_row" && String(r[h]).trim() !== ""));

    // Build dedup set from existing Notion pipeline leads (by normalized firm name)
    const normalizePhone = (p: string) => p.replace(/\D/g, "").slice(-9);
    const normalizeName = (n: string) => n.toLowerCase().replace(/\s+/g, " ").trim();

    const existingPhones = new Set<string>();
    const existingFirmas = new Set<string>();

    try {
      const existing = await getPipelineClients();
      for (const lead of existing) {
        if (lead.name) existingFirmas.add(normalizeName(lead.name));
      }
    } catch {
      /* non-fatal — proceed without dedup on fetch failure */
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    const todayISO = new Date().toISOString().split("T")[0];

    for (const row of rows) {
      const companyVal = companyKey ? String(row[companyKey] ?? "").trim() : "";
      const nameVal = nameKey ? String(row[nameKey] ?? "").trim() : "";
      const phoneVal = phoneKey ? String(row[phoneKey] ?? "").trim() : "";
      const emailVal = emailKey ? String(row[emailKey] ?? "").trim() : "";
      const notesVal = notesKey ? String(row[notesKey] ?? "").trim() : "";

      // Title: company takes precedence over name; fallback to first non-empty cell
      const titleVal =
        companyVal ||
        nameVal ||
        String(
          Object.entries(row).find(([k, v]) => k !== "_row" && String(v).trim())?.[1] ?? "",
        ).trim();

      if (!titleVal) {
        skipped++;
        continue;
      }

      // Dedup: skip if phone or company name already exists in Notion
      const normPhone = normalizePhone(phoneVal);
      const normFirma = normalizeName(titleVal);
      if (
        (normPhone.length >= 7 && existingPhones.has(normPhone)) ||
        existingFirmas.has(normFirma)
      ) {
        skipped++;
        continue;
      }

      // Include email in notes if no dedicated Email property in Notion
      const notesWithEmail = [notesVal, emailVal ? `Email: ${emailVal}` : ""]
        .filter(Boolean)
        .join(" | ");

      try {
        const notionStatus = deriveNotionStatus(row, headers);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const props: Record<string, any> = {
          Firma: { title: richText(titleVal) },
          Status: { select: { name: notionStatus } },
          "Data pierwszego kontaktu": { date: { start: todayISO } },
        };

        // Kontakt: person name when it differs from the title (company)
        if (nameVal && nameVal !== titleVal) {
          props["Kontakt"] = { rich_text: richText(nameVal) };
        }

        if (phoneVal) {
          const normalized = normalizePhonePL(phoneVal);
          if (!normalized) console.warn(`normalizePhonePL: nie udało się znormalizować "${phoneVal}"`);
          props["Telefon"] = { phone_number: normalized ?? phoneVal };
        }
        if (notesWithEmail) props["Notatki"] = { rich_text: richText(notesWithEmail) };

        await notion.pages.create({
          parent: { database_id: PIPELINE_DB_ID },
          properties: props,
        });
        created++;
        // Add to dedup sets so subsequent rows in same batch don't also create
        if (normPhone.length >= 7) existingPhones.add(normPhone);
        existingFirmas.add(normFirma);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Wiersz ${String(row._row)} (${titleVal}): ${msg}`);
      }
    }

    return NextResponse.json({ created, skipped, errors } satisfies SheetsSyncResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("insufficient") || message.includes("scope")) {
      return NextResponse.json({ error: "scope_required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Sync failed", detail: message }, { status: 500 });
  }
}
