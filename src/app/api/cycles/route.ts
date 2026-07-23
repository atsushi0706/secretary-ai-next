/**
 * アカシックレコーダー用：その人の「年・3ヶ月・月・週・今日」の周期を返す。
 * 誕生日はサーバー側の設定(user_settings.birth_date)から読む。
 * 体系名・専門用語は一切出さず、時期の言葉だけを返す。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserSettings, logError } from "@/lib/supabase";
import { computeCycles } from "@/lib/star";
import { jstNow } from "@/lib/google";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const s: any = await getUserSettings(userId);
    const birth = s?.birth_date ?? null;
    if (!birth) {
      return NextResponse.json({ hasBirth: false, cycles: null });
    }
    const cycles = computeCycles(birth, jstNow());
    return NextResponse.json({ hasBirth: true, cycles });
  } catch (e: any) {
    await logError(userId, "/api/cycles", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
