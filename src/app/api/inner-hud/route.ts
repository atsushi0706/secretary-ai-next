/**
 * インナーワールドのゲームHUD：🔮イメージ力／🔨現実化力 と、今日のナゾ（ハイヤークエスト）。
 * GET: { grounding, quest }
 * POST: action=add {text} / action=done {index, done} / action=remove {index}
 *   → 更新後の { grounding, quest } を返す（解いた瞬間ゲージが動くため）
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { computeGrounding, getTodayQuest, addQuestItem, toggleQuestItem, removeQuestItem } from "@/lib/inner";
import { countActiveDays, isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { getHero, applyHeroDeltas, labelOf } from "@/lib/hero";
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
    const [grounding, quest, activeDays] = await Promise.all([
      computeGrounding(userId), getTodayQuest(userId), countActiveDays(userId).catch(() => 0),
    ]);
    return NextResponse.json({ grounding, quest, activeDays });
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
    let heroChange: { label: string; from: number; to: number; reason?: string } | null = null;

    if (b.action === "add") await addQuestItem(userId, String(b.text ?? ""));
    else if (b.action === "done") {
      const before = await getTodayQuest(userId);
      const doneNow = !!b.done;
      await toggleQuestItem(userId, Number(b.index), doneNow);
      // 解いた瞬間、主人公Lv（体現）が上がる。理由を後から見せる（驚愕→納得）
      if (doneNow) {
        const item = before.items[Number(b.index)];
        const hero = await getHero(userId).catch(() => null);
        if (hero?.levels) {
          const { changed } = await applyHeroDeltas(
            userId,
            [{ domain: "embodiment", delta: 2, reason: `今日のナゾ「${item?.text ?? "一手"}」を実行したから` }],
            hero,
          );
          if (changed[0]) heroChange = { ...changed[0], label: labelOf(changed[0].domain) };
        }
      }
    }
    else if (b.action === "remove") await removeQuestItem(userId, Number(b.index));
    else return NextResponse.json({ error: "unknown action" }, { status: 400 });

    const [grounding, quest, activeDays] = await Promise.all([
      computeGrounding(userId), getTodayQuest(userId), countActiveDays(userId).catch(() => 0),
    ]);
    return NextResponse.json({ ok: true, grounding, quest, activeDays, heroChange });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/inner-hud", e);
    return fail(e);
  }
}
