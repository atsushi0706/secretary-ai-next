/**
 * 取扱説明書 API。
 * GET  : 最新の説明書＋前回の回答＋過去の一覧（画面を1回で開ける）
 * POST : { answers } → 16問の答えを保存して、説明書を生成
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateManual, latestManual, listManuals, loadAnswers, saveAnswers } from "@/lib/manual";
import { answeredCount, type Answers } from "@/lib/manual-quiz";
import { AIRateLimitError } from "@/lib/ai";
import { isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { getUserSettings, logError } from "@/lib/supabase";

export const maxDuration = 120;   // 長文なので少し余裕を持たせる

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const [manual, answers, history, s] = await Promise.all([
      latestManual(userId),
      loadAnswers(userId),
      listManuals(userId, 10),
      getUserSettings(userId).catch(() => null) as any,
    ]);
    return NextResponse.json({
      manual, answers, history,
      hasBirth: !!String(s?.birth_date ?? "").trim(),
    });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ manual: null, answers: {}, history: [], needsMigration: true });
    await logError(userId, "/api/manual GET", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    const answers = (b?.answers ?? {}) as Answers;
    if (answeredCount(answers) < 16) {
      return NextResponse.json({ error: "16問すべてに答えてね" }, { status: 400 });
    }
    await saveAnswers(userId, answers).catch(() => { /* 保存できなくても生成は進める */ });
    const manual = await generateManual(userId, answers);
    return NextResponse.json({ manual });
  } catch (e: any) {
    if (e instanceof AIRateLimitError) {
      return NextResponse.json({ error: `AIが混み合ってる。${e.retryAfterSec}秒ほど待ってもう一度試してね。` }, { status: 429 });
    }
    if (isMissingTable(e)) return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
    await logError(userId, "/api/manual POST", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
