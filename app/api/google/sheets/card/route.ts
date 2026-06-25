import { type NextRequest, NextResponse } from "next/server";
import { getRefreshToken, getSheetsClient } from "@/lib/google/auth";
import {
  buildColumnMap,
  type CardState,
  cardUpdatesToCells,
  decodeCard,
  findCardRow,
} from "@/lib/google/sheets-card";

export const dynamic = "force-dynamic";

// Same spreadsheet as the agency "Kontakty" card.
const SHEET_ID = "18BjXDFAWDVQnQkrE_1Kmvj0-ZJIGXQejLY6IJOOXnH0";

function tokenFrom(req: NextRequest): string | null {
  return getRefreshToken({
    get: (name: string) => {
      const val = req.cookies.get(name);
      return val ? { value: val.value } : undefined;
    },
  });
}

function classifyError(message: string): NextResponse {
  if (
    message.includes("insufficient") ||
    message.includes("scope") ||
    message.includes("PERMISSION")
  ) {
    return NextResponse.json({ success: false, error: "scope_required" }, { status: 403 });
  }
  return NextResponse.json(
    { success: false, error: "Sheet operation failed", detail: message },
    { status: 500 },
  );
}

async function readSheet(sheets: ReturnType<typeof getSheetsClient>) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const allSheets = meta.data.sheets ?? [];
  const sheetTitle =
    allSheets.find((s) => s.properties?.title === "Kontakty")?.properties?.title ??
    allSheets[0]?.properties?.title ??
    "Kontakty";

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetTitle}!A1:AZ2000`,
  });

  const allRows = (data.values ?? []).map((r) => (r ?? []).map((c) => String(c ?? "")));
  const headers = allRows[0] ?? [];
  const dataRows = allRows.slice(1);
  const colMap = buildColumnMap(headers);
  return { sheetTitle, headers, dataRows, colMap };
}

// ── GET: read a client's card by person name ────────────────────────────

export async function GET(req: NextRequest) {
  const token = tokenFrom(req);
  if (!token) {
    return NextResponse.json({ success: false, error: "Not connected to Google" }, { status: 401 });
  }

  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json(
      { success: false, error: "Missing 'name' query parameter" },
      { status: 400 },
    );
  }

  try {
    const sheets = getSheetsClient(token);
    const { headers, dataRows, colMap } = await readSheet(sheets);
    const found = findCardRow(dataRows, colMap, name);

    if (!found) {
      return NextResponse.json({
        success: true,
        found: false,
        rowNumber: null,
        card: null,
        headers,
      });
    }

    return NextResponse.json({
      success: true,
      found: true,
      rowNumber: found.rowNumber,
      card: decodeCard(found.rowValues, colMap),
      headers,
    });
  } catch (err: unknown) {
    return classifyError(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── PATCH: update a client's card fields (creates row if missing) ────────

interface PatchBody {
  name?: string;
  fields?: Partial<CardState>;
  createIfMissing?: boolean;
  phone?: string;
  email?: string;
}

export async function PATCH(req: NextRequest) {
  const token = tokenFrom(req);
  if (!token) {
    return NextResponse.json({ success: false, error: "Not connected to Google" }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const fields = body.fields ?? {};
  if (!name) {
    return NextResponse.json({ success: false, error: "Missing 'name'" }, { status: 400 });
  }
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
  }

  try {
    const sheets = getSheetsClient(token);
    const { sheetTitle, headers, dataRows, colMap } = await readSheet(sheets);

    if (colMap.imieNazwisko === undefined) {
      return NextResponse.json(
        { success: false, error: "Sheet has no 'Imię i nazwisko' column" },
        { status: 500 },
      );
    }

    let found = findCardRow(dataRows, colMap, name);

    // Create a new row when the client is not yet present.
    if (!found) {
      if (!body.createIfMissing) {
        return NextResponse.json({
          success: true,
          found: false,
          rowNumber: null,
          card: null,
          headers,
        });
      }
      const newRow = new Array<string>(headers.length).fill("");
      newRow[colMap.imieNazwisko] = name;
      if (colMap.numer !== undefined && body.phone) newRow[colMap.numer] = body.phone;
      if (colMap.email !== undefined && body.email) newRow[colMap.email] = body.email;
      if (colMap.data !== undefined) newRow[colMap.data] = new Date().toISOString().split("T")[0];

      const append = await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${sheetTitle}!A1`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [newRow] },
      });

      // updatedRange looks like "Kontakty!A22:Y22" — extract the row number.
      const updatedRange = append.data.updates?.updatedRange ?? "";
      const rowMatch = updatedRange.match(/!\w+?(\d+):/);
      const rowNumber = rowMatch ? parseInt(rowMatch[1], 10) : dataRows.length + 2;
      found = { rowNumber, rowValues: newRow };
    }

    const cells = cardUpdatesToCells(sheetTitle, found.rowNumber, colMap, fields);
    if (cells.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: cells.map((c) => ({ range: c.range, values: c.values })),
        },
      });
    }

    // Re-read just this row for a fresh, authoritative card state.
    const fresh = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetTitle}!A${found.rowNumber}:AZ${found.rowNumber}`,
    });
    const freshRow = (fresh.data.values?.[0] ?? []).map((c) => String(c ?? ""));

    return NextResponse.json({
      success: true,
      found: true,
      rowNumber: found.rowNumber,
      updatedFields: cells.length,
      card: decodeCard(freshRow, colMap),
    });
  } catch (err: unknown) {
    return classifyError(err instanceof Error ? err.message : "Unknown error");
  }
}
