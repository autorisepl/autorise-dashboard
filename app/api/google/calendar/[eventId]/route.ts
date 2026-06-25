import { type NextRequest, NextResponse } from "next/server";
import { getCalendarClient, getRefreshToken } from "@/lib/google/auth";

export const dynamic = "force-dynamic";

function getToken(req: NextRequest): string | null {
  return getRefreshToken({
    get: (name) => {
      const val = req.cookies.get(name);
      return val ? { value: val.value } : undefined;
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  const { eventId } = await params;
  const body = (await req.json()) as {
    summary?: string;
    startDateTime?: string;
    endDateTime?: string;
    description?: string;
    location?: string;
  };

  try {
    const cal = getCalendarClient(token);
    const requestBody: Record<string, unknown> = {};

    if (body.summary !== undefined) requestBody.summary = body.summary;
    if (body.description !== undefined) requestBody.description = body.description;
    if (body.location !== undefined) requestBody.location = body.location;
    if (body.startDateTime) requestBody.start = { dateTime: body.startDateTime };
    if (body.endDateTime) requestBody.end = { dateTime: body.endDateTime };

    const { data } = await cal.events.patch({
      calendarId: "primary",
      eventId,
      requestBody,
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd aktualizacji wydarzenia";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  const { eventId } = await params;

  try {
    const cal = getCalendarClient(token);
    await cal.events.delete({ calendarId: "primary", eventId });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd usuwania wydarzenia";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
