/**
 * インナーワールドのゲームHUD：🔮イメージ力／🔨現実化力 と、今日のナゾ（ハイヤークエスト）。
 * GET: { grounding, quest }
 * POST: action=add {text} / action=done {index, done} / action=remove {index}
 *   → 更新後の { grounding, quest } を返す（解いた瞬間ゲージが動くため）
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { computeGrounding, computeLevel, getTodayQuest, addQuestItem, toggleQuestItem, removeQuestItem, reconcileQuestWithTasks } from "@/lib/inner";
import { readLean } from "@/lib/lean";
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
    const [grounding, quest, level, lean] = await Promise.all([
      computeGrounding(userId),
      getTodayQuest(userId),
      computeLevel(userId),
      readLean(userId).catch(() => null),   // 対話の中身から偏りを読む（材料が薄ければ null）
    ]);
    return NextResponse.json({ grounding, quest, level, lean });
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
    if (b.action === "add") await addQuestItem(userId, String(b.text ?? ""));
    else if (b.action === "done") await toggleQuestItem(userId, Number(b.index), !!b.done);
    else if (b.action === "remove") await removeQuestItem(userId, Number(b.index));
    else return NextResponse.json({ error: "unknown action" }, { status: 400 });

    const [grounding, quest, level] = await Promise.all([computeGrounding(userId), getTodayQuest(userId), computeLevel(userId)]);
    return NextResponse.json({ ok: true, grounding, quest, level });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/inner-hud", e);
    return fail(e);
  }
}
