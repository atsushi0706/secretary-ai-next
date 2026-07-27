/**
 * 目標階層 API（年・月・週）。今日のタスクは /api/tasks（リアルバース本体）側。
 * GET: いまの年・月・週の目標＋期間ラベル。
 * POST: { scope, vision, emotion } を、いまのその期間に保存。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentGoals, saveGoal, periodLabels, type GoalScope } from "@/lib/goals";
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
    const { periods, goals } = await getCurrentGoals(userId);
    return NextResponse.json({ periods, labels: periodLabels(periods), goals });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/goals", e);
    return fail(e);
  }
}

const SCOPES: GoalScope[] = ["year", "month", "week"];

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    const scope = b.scope as GoalScope;
    if (!SCOPES.includes(scope)) return NextResponse.json({ error: "unknown scope" }, { status: 400 });
    const { periods } = await getCurrentGoals(userId);
    await saveGoal(userId, scope, periods[scope], {
      vision: typeof b.vision === "string" ? b.vision : "",
      emotion: typeof b.emotion === "string" ? b.emotion : "",
    });
    const { goals, periods: p2 } = await getCurrentGoals(userId);
    return NextResponse.json({ ok: true, goals, periods: p2, labels: periodLabels(p2) });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/goals", e);
    return fail(e);
  }
}
