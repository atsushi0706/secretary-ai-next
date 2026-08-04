/**
 * 宝物庫の「回数」。
 *
 * 何回やったかは、AIに数えさせない。**実際に残っている記録だけ**を数える。
 * 数えられないものは 0 として出す（無いものを、あるように見せない）。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Count = { key: string; label: string; n: number };

/** その表から件数を数える。表がまだ無ければ 0（機能を止めない） */
async function countOf(table: string, userId: string): Promise<number> {
  try {
    const supa = supabaseAdmin();
    const { count, error } = await supa.from(table)
      .select("*", { count: "exact", head: true }).eq("user_id", userId);
    if (error) return 0;
    return count ?? 0;
  } catch { return 0; }
}

/** ワークをした「日数」。同じ日に何度話しても1日として数える */
async function workDays(userId: string): Promise<number> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("shinga_conversations")
      .select("date").eq("user_id", userId).eq("role", "user").limit(4000);
    return new Set((data ?? []).map((r: any) => r.date)).size;
  } catch { return 0; }
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const [days, walk, shadow, guardian, emotion, quest, real] = await Promise.all([
    workDays(userId),
    countOf("walk_logs", userId),
    countOf("shadow_encounters", userId),
    countOf("guardians", userId),
    countOf("emotion_logs", userId),
    countOf("quest_cards", userId),
    countOf("real_actions", userId),
  ]);

  const counts: Count[] = [
    { key: "days", label: "ワークをした日", n: days },
    { key: "walk", label: "パラレルウォーク", n: walk },
    { key: "shadow", label: "ミラーオブワールド", n: shadow },
    { key: "guardian", label: "内なる子の神殿", n: guardian },
    { key: "emotion", label: "状態チェック", n: emotion },
    { key: "quest", label: "未来からのクエスト", n: quest },
    { key: "real", label: "現実に落としたこと", n: real },
  ];

  return NextResponse.json({ counts });
}
