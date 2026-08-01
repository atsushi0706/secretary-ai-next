/**
 * 歩数の記録。
 * GET  : 今日 / 連続日数 / 累計 / 履歴（60日）
 * POST : { steps, seconds } → 今日ぶんに足して、届いたカードを返す
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addSteps, getSummary, nextGoal } from "@/lib/steps";
import { isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { logError } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const summary = await getSummary(userId);
    return NextResponse.json({ ...summary, next: nextGoal(summary) });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ needsMigration: true, history: [], today: 0, streak: 0, total: 0 });
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    const steps = Math.max(0, Math.min(200000, Math.round(Number(b?.steps) || 0)));
    const seconds = Math.max(0, Math.min(86400, Math.round(Number(b?.seconds) || 0)));
    if (steps <= 0) return NextResponse.json({ error: "steps が空" }, { status: 400 });

    const { summary, earned } = await addSteps(userId, steps, seconds);
    return NextResponse.json({ ...summary, next: nextGoal(summary), earned });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
    await logError(userId, "/api/steps", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
