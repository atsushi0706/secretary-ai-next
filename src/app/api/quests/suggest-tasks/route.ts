/**
 * クエスト → リアルバースのタスク候補を返す。
 *
 * ここは「AI差し替えポイント」。
 * いまはルールベース (src/lib/questToTasks.ts) を呼ぶだけ。
 * 将来 AI にする場合も、このルートのレスポンス形 { candidates: TaskCandidate[] } は変えない。
 * → UI 側 (QuestBoard) は一切修正不要で AI 化できる。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getQuest, isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { suggestTasks } from "@/lib/questToTasks";
import { jstDateStr } from "@/lib/google";
import { logError } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.questId) return NextResponse.json({ error: "questId が必要です" }, { status: 400 });

    const quest = await getQuest(userId, body.questId);
    if (!quest) return NextResponse.json({ error: "クエストが見つかりません" }, { status: 404 });

    const candidates = suggestTasks(
      { title: quest.title, body: quest.body, category: quest.category },
      jstDateStr(),
    );
    return NextResponse.json({ candidates, source: "rule" });
  } catch (e: any) {
    if (isMissingTable(e)) {
      return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
    }
    await logError(userId, "/api/quests/suggest-tasks", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
