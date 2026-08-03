import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addTask, completeTask, deleteTask, getTasks } from "@/lib/google";
import { setManualLabel, clearManualLabel, logError } from "@/lib/supabase";
import { linkTask, unlinkTask, isMissingTable } from "@/lib/shinga";

// 未完了タスクの一覧（インナーワールドの「今日」タブなどから使う）
export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const tasks = await getTasks(userId, false);
    return NextResponse.json({ tasks });
  } catch (e: any) {
    await logError(userId, "/api/tasks", e);
    return NextResponse.json({ error: String(e?.message ?? e), tasks: [] }, { status: 500 });
  }
}

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
      // クエスト由来などの「出自」を外付けで記録する。
      // 既存の呼び出し (source なし) は何も起きない。
      // ここで失敗してもタスク作成自体は成功扱いにする（既存機能を絶対に壊さない）。
      if (created.id && (body.sourceType || body.sourceQuestId || body.sourceConversationId)) {
        try {
          await linkTask(userId, created.id, {
            sourceType: body.sourceType ?? "manual",
            sourceQuestId: body.sourceQuestId ?? null,
            sourceConversationId: body.sourceConversationId ?? null,
          });
        } catch (e) {
          if (!isMissingTable(e)) console.error("[/api/tasks] linkTask failed:", e);
        }
      }
      return NextResponse.json({ ok: true, task: created });
    }
    if (action === "complete") {
      await completeTask(userId, body.tasklistId, body.taskId);
      // 「現実で終わらせたこと」として残す。
      // これが無いせいで、日常のタスクをいくらこなしてもメーターから見えなかった。
      // 理想（クエスト）から生まれたタスクなら aligned=true ＝ 今日つないだ、として扱う。
      try {
        const { recordRealAction } = await import("@/lib/balance");
        const { supabaseAdmin } = await import("@/lib/supabase");
        let aligned = false;
        try {
          const { data } = await supabaseAdmin().from("task_links")
            .select("source_type, source_quest_id")
            .eq("user_id", userId).eq("google_task_id", String(body.taskId)).maybeSingle();
          aligned = !!data && (data.source_type === "quest" || !!data.source_quest_id);
        } catch { /* 出自が分からなくても、完了そのものは残す */ }
        await recordRealAction(userId, { kind: "task", title: body.title, aligned });
        // メーターの所見は作り直す（✓の直後に画面が動くように）
        void import("@/lib/lean").then((m) => m.refreshLean(userId)).catch(() => {});
      } catch { /* 記録に失敗しても完了は成功 */ }
      return NextResponse.json({ ok: true });
    }
    if (action === "delete") {
      await deleteTask(userId, body.tasklistId, body.taskId);
      await clearManualLabel(userId, body.taskId);
      await unlinkTask(userId, body.taskId); // 内部で失敗を握りつぶすので既存挙動に影響なし
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
