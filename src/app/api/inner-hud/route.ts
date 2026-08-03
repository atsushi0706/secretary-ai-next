/**
 * インナーワールドのゲームHUD：🔮イメージ力／🔨現実化力 と、今日のナゾ（ハイヤークエスト）。
 * GET: { grounding, quest }
 * POST: action=add {text} / action=done {index, done} / action=remove {index}
 *   → 更新後の { grounding, quest } を返す（解いた瞬間ゲージが動くため）
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { computeGrounding, computeLevel, getTodayQuest, addQuestItem, toggleQuestItem, removeQuestItem, reconcileQuestWithTasks } from "@/lib/inner";
import { readLeanCached, refreshLean } from "@/lib/lean";
import { computeBalance } from "@/lib/balance";
import { isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { logError } from "@/lib/supabase";

function fail(e: any) {
  if (isMissingTable(e)) return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
  return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    // 先にリアルバース(Googleタスク)→インナーの連動を合わせてから、状態を読む
    await reconcileQuestWithTasks(userId).catch(() => {});
    const [grounding, balance, quest, level, lean] = await Promise.all([
      computeGrounding(userId),
      computeBalance(userId),   // 針の位置は「実際にやったこと」だけで決める
      getTodayQuest(userId),
      computeLevel(userId),
      readLeanCached(userId),   // キャッシュのみ（AIを呼ばない＝一瞬で返る）。作り直しは lean_refresh
    ]);
    return NextResponse.json({ grounding, balance, quest, level, lean });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/inner-hud", e);
    return fail(e);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    // 所見の作り直し（画面が裏で呼ぶ。開くのを待たせない）
    if (b.action === "lean_refresh") {
      const lean = await refreshLean(userId);
      return NextResponse.json({ ok: true, lean });
    }
    if (b.action === "add") await addQuestItem(userId, String(b.text ?? ""));
    else if (b.action === "done") await toggleQuestItem(userId, Number(b.index), !!b.done);
    else if (b.action === "remove") await removeQuestItem(userId, Number(b.index));
    else return NextResponse.json({ error: "unknown action" }, { status: 400 });

    // ✓を付けた直後に針が動くよう、ここでも balance を作り直して返す
    const [grounding, balance, quest, level] = await Promise.all([
      computeGrounding(userId), computeBalance(userId), getTodayQuest(userId), computeLevel(userId),
    ]);
    return NextResponse.json({ ok: true, grounding, balance, quest, level });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/inner-hud", e);
    return fail(e);
  }
}
