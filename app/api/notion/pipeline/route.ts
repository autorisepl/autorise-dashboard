import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
// In @notionhq/client v5, databases.query moved to dataSources.query
const PIPELINE_DATA_SOURCE_ID = "2ea38355-7529-48f9-8d7f-1c62f5570df3";

export interface PipelineClientDetailed {
  id: string;
  firma: string;
  kontakt: string;
  telefon: string;
  email: string;
  status: string;
  lastModified: string;
  dataDiscovery: string;
  nastepnyKrok: string;
  ocenaICP: string;
  dataFollowup: string;
  liczbaProb: number;
  notatki: string;
  bolGlowny: string;
  poprzednieProby: string;
  hipotezaBolGlowny: string;
  uwagiFAgent2: string;
  przewidywaneObiekcje: string;
  pitchRecipe: string;
  ryzyka: string;
  godzinyWpisywania: number;
}

function extractText(prop: PageObjectResponse["properties"][string] | undefined): string {
  if (!prop) return "";
  if (prop.type === "rich_text")
    return prop.rich_text
      .map((t) => t.plain_text)
      .join("")
      .trim();
  if (prop.type === "title")
    return prop.title
      .map((t) => t.plain_text)
      .join("")
      .trim();
  if (prop.type === "phone_number") return prop.phone_number ?? "";
  if (prop.type === "email") return prop.email ?? "";
  if (prop.type === "select") return prop.select?.name ?? "";
  if (prop.type === "date") return prop.date?.start ?? "";
  return "";
}

function extractNumber(prop: PageObjectResponse["properties"][string] | undefined): number {
  if (!prop) return 0;
  if (prop.type === "number") return prop.number ?? 0;
  return 0;
}

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await (notion.dataSources as any).query({
      data_source_id: PIPELINE_DATA_SOURCE_ID,
      sorts: [{ property: "Data pierwszego kontaktu", direction: "descending" }],
      page_size: 100,
    })) as { results: PageObjectResponse[] };

    const clients: PipelineClientDetailed[] = response.results
      .filter((p): p is PageObjectResponse => p.object === "page")
      .map((page: PageObjectResponse) => {
        const props = page.properties;
        const firma = extractText(props["Firma"]) || extractText(props["Kontakt"]) || "Bez nazwy";

        return {
          id: page.id,
          firma,
          kontakt: extractText(props["Kontakt"]),
          telefon: extractText(props["Telefon"]),
          email: extractText(props["E-mail"] ?? props["Email"]),
          status: extractText(props["Status"]),
          lastModified: page.last_edited_time,
          dataDiscovery: extractText(props["Data discovery"]),
          nastepnyKrok: extractText(props["Następny krok"]),
          ocenaICP: extractText(props["Ocena ICP"]),
          dataFollowup: extractText(props["Data następnego kroku"]),
          liczbaProb: extractNumber(props["Liczba prób kontaktu"]),
          notatki: extractText(props["Notatki"]),
          bolGlowny: extractText(props["Ból główny"]),
          poprzednieProby: extractText(props["Poprzednie próby"]),
          hipotezaBolGlowny: extractText(props["Hipoteza ból główny"]),
          uwagiFAgent2: extractText(props["Uwagi Agenta 2"]),
          przewidywaneObiekcje: extractText(props["Przewidywane obiekcje"]),
          pitchRecipe: extractText(props["Pitch Recipe"]),
          ryzyka: extractText(props["Ryzyka rozmowy"]),
          godzinyWpisywania: extractNumber(props["Godziny wpisywania / spedytor"]),
        };
      })
      .filter((c: PipelineClientDetailed) => c.firma !== "Bez nazwy");

    // Deduplicate: same firma+kontakt combo → keep highest-status entry
    const STATUS_ORDER = [
      "Nowy lead",
      "Kwalifikacja",
      "Discovery umówione",
      "Finalizacja",
      "Kickoff",
      "Wdrożenie",
      "Retainer",
      "Upsell",
      "Niekwalifikowany",
    ];
    const deduped = new Map<string, PipelineClientDetailed>();
    for (const c of clients) {
      const key = `${c.firma.toLowerCase().trim()}|${c.kontakt.toLowerCase().trim()}`;
      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, c);
      } else {
        const existingRank = STATUS_ORDER.indexOf(existing.status);
        const currentRank = STATUS_ORDER.indexOf(c.status);
        if (currentRank > existingRank) deduped.set(key, c);
      }
    }
    const dedupedClients = Array.from(deduped.values());

    // Second dedup pass: same phone (last 9 digits) → keep highest-status entry
    const phoneDeduped = new Map<string, PipelineClientDetailed>();
    for (const c of dedupedClients) {
      const raw = c.telefon.replace(/\D/g, "");
      const phoneKey = raw.length >= 9 ? raw.slice(-9) : raw;
      if (!phoneKey) {
        phoneDeduped.set(c.id, c);
        continue;
      }
      const existing = phoneDeduped.get(phoneKey);
      if (!existing) {
        phoneDeduped.set(phoneKey, c);
      } else {
        const existingRank = STATUS_ORDER.indexOf(existing.status);
        const currentRank = STATUS_ORDER.indexOf(c.status);
        if (currentRank > existingRank) phoneDeduped.set(phoneKey, c);
      }
    }
    const finalClients = Array.from(phoneDeduped.values());

    return NextResponse.json({ success: true, clients: finalClients });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Notion";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
