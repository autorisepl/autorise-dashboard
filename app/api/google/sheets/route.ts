import { type NextRequest, NextResponse } from "next/server";
import { getRefreshToken, getSheetsClient } from "@/lib/google/auth";

// Spreadsheet ID for Autorise agency contacts
const SHEET_ID = "18BjXDFAWDVQnQkrE_1Kmvj0-ZJIGXQejLY6IJOOXnH0";

export interface SheetContact {
  _row: number;
  [key: string]: string | number;
}

export interface SheetsResponse {
  headers: string[];
  rows: SheetContact[];
  lastSync: string;
  sheetTitle: string;
}

export async function GET(req: NextRequest) {
  const token = getRefreshToken({
    get: (name: string) => {
      const val = req.cookies.get(name);
      return val ? { value: val.value } : undefined;
    },
  });

  if (!token) {
    return NextResponse.json({ error: "Not connected to Google" }, { status: 401 });
  }

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
      return NextResponse.json({
        headers: [],
        rows: [],
        lastSync: new Date().toISOString(),
        sheetTitle,
      } satisfies SheetsResponse);
    }

    const headers = (allRows[0] ?? []).map(String);
    const rows: SheetContact[] = allRows
      .slice(1)
      .map((row, idx) => {
        const contact: SheetContact = { _row: idx + 2 };
        headers.forEach((h, i) => {
          contact[h] = String(row[i] ?? "");
        });
        return contact;
      })
      .filter((r) => headers.some((h) => r[h] !== ""));

    return NextResponse.json({
      headers,
      rows,
      lastSync: new Date().toISOString(),
      sheetTitle,
    } satisfies SheetsResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("insufficient") || message.includes("scope")) {
      return NextResponse.json({ error: "scope_required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to read sheet", detail: message }, { status: 500 });
  }
}
