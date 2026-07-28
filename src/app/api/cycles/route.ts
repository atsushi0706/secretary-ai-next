/**
 * アカシックレコーダー用：その人の「年・3ヶ月・月・週・今日」の周期を返す。
 * 誕生日はサーバー側の設定(user_settings.birth_date)から読む。
 * 体系名・専門用語は一切出さず、時期の言葉だけを返す。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserSettings, logError } from "@/lib/supabase";
import { computeCycles } from "@/lib/star";
import { computeLife } from "@/lib/sanmei";
import { countActiveDays, countWalks } from "@/lib/shinga";
import { isMaster } from "@/lib/akashic";
import { jstNow } from "@/lib/google";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const s: any = await getUserSettings(userId);
    const birth = s?.birth_date ?? null;
    const gender = s?.birth_gender ?? null;
    if (!birth) {
      return NextResponse.json({ hasBirth: false, cycles: null, life: null });
    }
    const now = jstNow();
    const cycles = computeCycles(birth, now);
    const life = computeLife(birth, gender, now); // 性別が無ければ null
    const [activeDays, walkCount] = await Promise.all([
      countActiveDays(userId).catch(() => 0), // 地図の育ち（取り組み日数）
      countWalks(userId).catch(() => 0),      // 段階解放（歩いた回数）
    ]);
    const master = isMaster((session?.user as any)?.email);           // マスターは全開放
    return NextResponse.json({ hasBirth: true, hasGender: !!gender, cycles, life, activeDays, walkCount, master });
  } catch (e: any) {
    await logError(userId, "/api/cycles", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
