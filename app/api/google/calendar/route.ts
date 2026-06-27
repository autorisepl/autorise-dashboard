import { type NextRequest, NextResponse } from "next/server";
import { getCalendarClient, getRefreshToken } from "@/lib/google/auth";

export const dynamic = "force-dynamic";

export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  htmlLink?: string;
  colorId?: string;
  allDay: boolean;
}

export interface CalendarResponse {
  events: CalendarEvent[];
  calendarName: string;
}

function getToken(req: NextRequest): string | null {
  return getRefreshToken({
    get: (name) => {
      const val = req.cookies.get(name);
      return val ? { value: val.value } : undefined;
    },
  });
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Not connected to Google" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "week";
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  const now = new Date();

  let timeMin: Date;
  let timeMax: Date;

  if (startParam && endParam) {
    timeMin = new Date(startParam);
    timeMax = new Date(endParam);
  } else if (view === "day") {
    timeMin = new Date(now);
    timeMin.setHours(0, 0, 0, 0);
    timeMax = new Date(now);
    timeMax.setHours(23, 59, 59, 999);
  } else if (view === "month") {
    timeMin = new Date(now.getFullYear(), now.getMonth(), 1);
    timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    // week
    const day = now.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // Monday of this week
    timeMin = new Date(now);
    timeMin.setDate(now.getDate() + diff);
    timeMin.setHours(0, 0, 0, 0);
    timeMax = new Date(timeMin);
    timeMax.setDate(timeMin.getDate() + 6);
    timeMax.setHours(23, 59, 59, 999);
  }

  try {
    const cal = getCalendarClient(token);

    const { data } = await cal.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 200,
    });

    const { data: calData } = await cal.calendars.get({ calendarId: "primary" });

    const events: CalendarEvent[] = (data.items ?? []).map((e) => {
      const allDay = !e.start?.dateTime;
      return {
        id: e.id ?? "",
        summary: e.summary ?? "(bez tytułu)",
        start: {
          dateTime: e.start?.dateTime ?? undefined,
          date: e.start?.date ?? undefined,
        },
        end: {
          dateTime: e.end?.dateTime ?? undefined,
          date: e.end?.date ?? undefined,
        },
        location: e.location ?? undefined,
        description: e.description ?? undefined,
        attendees: (e.attendees ?? []).map((a) => ({
          email: a.email ?? "",
          displayName: a.displayName ?? undefined,
          responseStatus: a.responseStatus ?? undefined,
        })),
        htmlLink: e.htmlLink ?? undefined,
        colorId: e.colorId ?? undefined,
        allDay,
      };
    });

    return NextResponse.json({
      events,
      calendarName: calData.summary ?? "Google Calendar",
    } satisfies CalendarResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd Google Calendar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  const body = (await req.json()) as {
    summary: string;
    startDateTime: string;
    endDateTime: string;
    description?: string;
    location?: string;
    timeZone?: string;
  };

  const { summary, startDateTime, endDateTime, description, location, timeZone } = body;
  if (!summary || !startDateTime || !endDateTime) {
    return NextResponse.json(
      { error: "summary, startDateTime i endDateTime są wymagane" },
      { status: 400 },
    );
  }

  try {
    const cal = getCalendarClient(token);
    // timeZone (np. Europe/Warsaw) → Google rozwiązuje DST z naiwnego dateTime.
    const { data } = await cal.events.insert({
      calendarId: "primary",
      requestBody: {
        summary,
        start: { dateTime: startDateTime, timeZone: timeZone || undefined },
        end: { dateTime: endDateTime, timeZone: timeZone || undefined },
        description: description || undefined,
        location: location || undefined,
      },
    });

    return NextResponse.json({ id: data.id, htmlLink: data.htmlLink });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd tworzenia wydarzenia";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
