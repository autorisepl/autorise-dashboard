import { type NextRequest, NextResponse } from "next/server";
import { getRefreshToken, getTasksClient } from "@/lib/google/auth";

export interface GoogleTaskList {
  id: string;
  title: string;
  updated: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  status: "needsAction" | "completed";
  due?: string;
  notes?: string;
  updated: string;
}

export interface GoogleTasksResponse {
  lists: GoogleTaskList[];
  tasksByList: Record<string, GoogleTask[]>;
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
    const tasks = getTasksClient(token);

    const { data: listsData } = await tasks.tasklists.list({ maxResults: 20 });
    const rawLists = listsData.items ?? [];

    const lists: GoogleTaskList[] = rawLists
      .map((l) => ({
        id: l.id ?? "",
        title: l.title ?? "Bez nazwy",
        updated: l.updated ?? "",
      }))
      .filter((l) => l.id);

    const tasksByList: Record<string, GoogleTask[]> = {};

    await Promise.all(
      lists.map(async (list) => {
        try {
          const { data: tasksData } = await tasks.tasks.list({
            tasklist: list.id,
            maxResults: 100,
            showCompleted: true,
            showHidden: false,
          });
          tasksByList[list.id] = (tasksData.items ?? [])
            .map((t) => ({
              id: t.id ?? "",
              title: t.title ?? "",
              status: (t.status ?? "needsAction") as GoogleTask["status"],
              due: t.due ?? undefined,
              notes: t.notes ?? undefined,
              updated: t.updated ?? "",
            }))
            .filter((t) => t.id && t.title);
        } catch {
          tasksByList[list.id] = [];
        }
      }),
    );

    return NextResponse.json({ lists, tasksByList } satisfies GoogleTasksResponse);
  } catch {
    return NextResponse.json({ error: "Failed to fetch Google Tasks" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const token = getRefreshToken({
    get: (name: string) => {
      const val = req.cookies.get(name);
      return val ? { value: val.value } : undefined;
    },
  });

  if (!token) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  const body = (await req.json()) as {
    listId: string;
    taskId: string;
    status?: "needsAction" | "completed";
    title?: string;
    notes?: string;
    due?: string;
  };
  const { listId, taskId, status, title, notes, due } = body;

  try {
    const tasks = getTasksClient(token);
    const requestBody: Record<string, string | undefined> = {};
    if (status) {
      requestBody.status = status;
      requestBody.completed = status === "completed" ? new Date().toISOString() : undefined;
    }
    if (title !== undefined) requestBody.title = title;
    if (notes !== undefined) requestBody.notes = notes || undefined;
    if (due !== undefined)
      requestBody.due = due ? new Date(due + "T00:00:00").toISOString() : undefined;
    await tasks.tasks.patch({ tasklist: listId, task: taskId, requestBody });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = getRefreshToken({
    get: (name: string) => {
      const val = req.cookies.get(name);
      return val ? { value: val.value } : undefined;
    },
  });
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  const { listId, title, notes, due } = (await req.json()) as {
    listId: string;
    title: string;
    notes?: string;
    due?: string;
  };
  if (!listId || !title?.trim()) {
    return NextResponse.json({ error: "listId and title required" }, { status: 400 });
  }

  try {
    const client = getTasksClient(token);
    const { data } = await client.tasks.insert({
      tasklist: listId,
      requestBody: {
        title: title.trim(),
        notes: notes?.trim() || undefined,
        due: due ? new Date(due).toISOString() : undefined,
      },
    });
    const task: GoogleTask = {
      id: data.id ?? "",
      title: data.title ?? "",
      status: (data.status ?? "needsAction") as GoogleTask["status"],
      due: data.due ?? undefined,
      notes: data.notes ?? undefined,
      updated: data.updated ?? "",
    };
    return NextResponse.json({ task });
  } catch {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = getRefreshToken({
    get: (name: string) => {
      const val = req.cookies.get(name);
      return val ? { value: val.value } : undefined;
    },
  });
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  const { listId, taskId } = (await req.json()) as { listId: string; taskId: string };
  if (!listId || !taskId) {
    return NextResponse.json({ error: "listId and taskId required" }, { status: 400 });
  }

  try {
    const client = getTasksClient(token);
    await client.tasks.delete({ tasklist: listId, task: taskId });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
