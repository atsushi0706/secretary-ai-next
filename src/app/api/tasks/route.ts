import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addTask, completeTask, deleteTask } from "@/lib/google";
import { setManualLabel, clearManualLabel, logError } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const action = body.action;
    if (action === "add") {
      const created = await addTask(userId, body.title, {
        notes: body.notes ?? "", due: body.due ?? null,
      });
      if (created.id && (body.category || body.urgency || body.importance || body.time)) {
        await setManualLabel(userId, created.id, {
          category: body.category, urgency: body.urgency,
          importance: body.importance, time_label: body.time,
        });
      }
      return NextResponse.json({ ok: true, task: created });
    }
    if (action === "complete") {
      await completeTask(userId, body.tasklistId, body.taskId);
      return NextResponse.json({ ok: true });
    }
    if (action === "delete") {
      await deleteTask(userId, body.tasklistId, body.taskId);
      await clearManualLabel(userId, body.taskId);
      return NextResponse.json({ ok: true });
    }
    if (action === "label") {
      await setManualLabel(userId, body.taskId, {
        category: body.category, urgency: body.urgency,
        importance: body.importance, time_label: body.time,
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "clearLabel") {
      await clearManualLabel(userId, body.taskId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    await logError(userId, "/api/tasks", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
