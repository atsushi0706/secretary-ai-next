/**
 * 速学力プレゼント企画のポイント。
 *   GET          → 自分のポイントと内訳
 *   GET ?all=1   → 上位（運営だけ）
 *
 * ポイントは持っていない。**毎回、記録から数え直す。**
 * だから、ここには「増やす」入口が無い（水増しの穴を作らないため）。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { logError } from "@/lib/supabase";
import { jstDateStr } from "@/lib/google";
import { scoreOf, ranking, CAMPAIGN, RULES, daysLeft } from "@/lib/points";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "ログインしてね" }, { status: 401 });

  try {
    const all = new URL(req.url).searchParams.get("all") === "1";
    // 上位の一覧は運営だけ。ほかの人の点数は見せない
    if (all) {
      if (!isAdmin(userId)) return NextResponse.json({ error: "権限がありません" }, { status: 403 });
      return NextResponse.json({ campaign: CAMPAIGN, ranking: await ranking(20) });
    }

    const today = jstDateStr();
    const score = await scoreOf(userId);
    return NextResponse.json({
      campaign: CAMPAIGN,
      daysLeft: daysLeft(today),
      dailyCap: RULES.dailyCap,
      ...score,
    });
  } catch (e: any) {
    await logError(userId, "/api/points", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
