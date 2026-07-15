import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhonePL } from "@/lib/format/normalizePhonePL";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

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
  notatki: z.string().optional(),
  dniDostepow: z.number().nullable().optional(),
  uwagiWarunki: z.string().nullable().optional(),
  pozaZakresem: z.string().nullable().optional(),
  utracony: z.boolean().optional(),
  powodUtraty: z.string().nullable().optional(),
});

function richText(text: string) {
  return [{ type: "text" as const, text: { content: text.slice(0, 2000) } }];
}

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const properties: Record<string, any> = {};

    if (d.status !== undefined) {
      properties["Status"] = { select: { name: d.status } };
    }
    if (d.nastepnyKrok !== undefined) {
      properties["Następny krok"] = { rich_text: richText(d.nastepnyKrok) };
    }
    if (d.dataFollowup !== undefined) {
      properties["Data następnego kroku"] = d.dataFollowup
        ? { date: { start: d.dataFollowup } }
        : { date: null };
    }
    if (d.typFollowup !== undefined) {
      properties["Typ follow-up"] = d.typFollowup
        ? { select: { name: d.typFollowup } }
        : { select: null };
    }
    if (d.kontekstFollowup !== undefined && d.kontekstFollowup) {
      properties["Następny krok"] = {
        rich_text: richText(`[Follow-up: ${d.typFollowup ?? ""}] ${d.kontekstFollowup}`),
      };
    }
    if (d.powodNiekwalifikowania !== undefined && d.powodNiekwalifikowania) {
      properties["Powód rezygnacji"] = { rich_text: richText(d.powodNiekwalifikowania) };
    }
    if (d.dataReengagement !== undefined) {
      properties["Re-engagement"] = d.dataReengagement
        ? { date: { start: d.dataReengagement } }
        : { date: null };
    }
    if (d.liczbaProb !== undefined) {
      properties["Liczba prób kontaktu"] = { number: d.liczbaProb };
    }
    if (d.firma !== undefined && d.firma) {
      properties["Firma"] = { title: richText(d.firma) };
    }
    if (d.kontakt !== undefined) {
      properties["Kontakt"] = { rich_text: richText(d.kontakt) };
    }
    if (d.telefon !== undefined) {
      const normalized = d.telefon ? normalizePhonePL(d.telefon) : null;
      if (d.telefon && !normalized)
        console.warn(`normalizePhonePL: nie udało się znormalizować "${d.telefon}"`);
      properties["Telefon"] = { phone_number: normalized ?? d.telefon };
    }
    if (d.notatki !== undefined) {
      properties["Notatki"] = { rich_text: richText(d.notatki) };
    }
    if (d.dniDostepow !== undefined) {
      properties["Warunki umowy — dni dostępów"] = { number: d.dniDostepow };
    }
    if (d.uwagiWarunki !== undefined) {
      properties["Warunki umowy — uwagi"] = {
        rich_text: d.uwagiWarunki ? richText(d.uwagiWarunki) : [],
      };
    }
    if (d.pozaZakresem !== undefined) {
      properties["Poza zakresem — ustalenia"] = {
        rich_text: d.pozaZakresem ? richText(d.pozaZakresem) : [],
      };
    }
    if (d.utracony !== undefined) {
      properties["Utracony"] = { checkbox: d.utracony };
    }
    if (d.powodUtraty !== undefined) {
      properties["Powód utraty"] = { rich_text: d.powodUtraty ? richText(d.powodUtraty) : [] };
    }

    if (Object.keys(properties).length === 0) {
      return NextResponse.json(
        { success: false, error: "Brak pól do aktualizacji" },
        { status: 400 },
      );
    }

    await notion.pages.update({ page_id: d.pageId, properties });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Nieznany błąd";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// Keep POST for backward compat (numeric fields only)
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
      koszt_problemu: "Koszt problemu PLN/mc",
      koszt_roczny: "Koszt roczny PLN/rok",
      maile_dziennie: "Maile ze zleceniami / dzień",
      godziny_wpisywania: "Godziny wpisywania / spedytor",
      faktury_po_terminie: "Faktury po terminie / mc",
      srednia_wartosc_faktury: "Średnia wartość faktury PLN",
    };

    const properties: Record<string, { number: number }> = {};
    for (const [key, notionProp] of Object.entries(FIELD_MAP)) {
      const val = fields[key];
      if (val != null && typeof val === "number") {
        properties[notionProp] = { number: val };
      }
    }

    if (Object.keys(properties).length === 0) {
      return NextResponse.json(
        { success: false, error: "Brak pól do aktualizacji" },
        { status: 400 },
      );
    }

    await notion.pages.update({ page_id: pageId, properties });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Nieznany błąd";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
