import { type NextRequest, NextResponse } from "next/server";
import { getRefreshToken, getSheetsClient } from "@/lib/google/auth";
import {
  buildColumnMap,
  CHECKBOX_KEYS,
  colIndexToLetter,
  TEXT_NOTE_KEYS,
} from "@/lib/google/sheets-card";

export const dynamic = "force-dynamic";

const SHEET_ID = "18BjXDFAWDVQnQkrE_1Kmvj0-ZJIGXQejLY6IJOOXnH0";

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

  try {
    const sheets = getSheetsClient(token);

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
    const numDataRows = allRows.length - 1;

    if (numDataRows === 0) {
      return NextResponse.json({ success: true, resetRows: 0 });
    }

    const colMap = buildColumnMap(headers);

    // One range update per checkbox column covering all data rows at once
    const batchData: { range: string; values: string[][] }[] = [];
    for (const key of CHECKBOX_KEYS) {
      const colIdx = colMap[key];
      if (colIdx === undefined) continue;
      const letter = colIndexToLetter(colIdx);
      batchData.push({
        range: `${sheetTitle}!${letter}2:${letter}${numDataRows + 1}`,
        values: Array.from({ length: numDataRows }, () => ["FALSE"]),
      });
    }

    // Wyczyść też ręcznie wpisane notatki tekstowe — checkboxy same nie wracają
    // karty do stanu "czysto ze Slacka" jeśli notatki po rozmowie zostają.
    for (const key of TEXT_NOTE_KEYS) {
      const colIdx = colMap[key];
      if (colIdx === undefined) continue;
      const letter = colIndexToLetter(colIdx);
      batchData.push({
        range: `${sheetTitle}!${letter}2:${letter}${numDataRows + 1}`,
        values: Array.from({ length: numDataRows }, () => [""]),
      });
    }

    if (batchData.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: batchData,
        },
      });
    }

    return NextResponse.json({ success: true, resetRows: numDataRows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("insufficient") || message.includes("scope")) {
      return NextResponse.json({ error: "scope_required" }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
