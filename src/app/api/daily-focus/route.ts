/**
 * 今日のフォーカス API（今日の感情＋最優先の一歩）。
 * GET: 今日のフォーカス。
 * POST: { emotion, priority, addTask } を保存。addTask かつ priority があれば、
 *        リアルバース（Google Tasks）にも今日の最優先タスクとして1つ入れる。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDailyFocus, saveDailyFocus } from "@/lib/daily-focus";
import { addTask } from "@/lib/google";
import { setManualLabel, logError } from "@/lib/supabase";
import { isMissingTable, MIGRATION_HINT } from "@/lib/shinga";

function fail(e: any) {
  if (isMissingTable(e)) return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
  return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    return NextResponse.json({ focus: await getDailyFocus(userId) });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/daily-focus", e);
    return fail(e);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    const focus = await saveDailyFocus(userId, { emotion: b.emotion, priority: b.priority });

    let task: any = null;
    if (b.addTask && focus.priority) {
      // 今日の最優先として、リアルバースのタスクに1つ入れる（最重要・すぐ）
      const today = focus.date;
      task = await addTask(userId, `⭐ ${focus.priority}`, { notes: "パラレルウォークで決めた、今日の最優先の一歩", due: today });
      if (task?.id) {
        await setManualLabel(userId, task.id, { category: "life", urgency: "high", importance: "high", time_label: "quick" }).catch(() => {});
      }
    }
    return NextResponse.json({ ok: true, focus, task });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/daily-focus", e);
    return fail(e);
  }
}
