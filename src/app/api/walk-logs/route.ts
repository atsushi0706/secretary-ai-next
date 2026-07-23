/**
 * パラレルウォークの記録。
 * ChatGPTでのワーク後、本人が要約を貼って保存する。ここに溜めた記録が、
 * 「いつ・どんなワークをして・どう変化したか」の蓄積になり、週次レポートの材料になる。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveWalkLog, listWalkLogs, isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { jstDateStr } from "@/lib/google";
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
    return NextResponse.json({ logs: await listWalkLogs(userId, 30) });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/walk-logs", e);
    return fail(e);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    const summary = String(b.summary ?? "").trim();
    if (!summary) return NextResponse.json({ error: "貼り付ける内容がありません" }, { status: 400 });
    const log = await saveWalkLog(userId, b.date || jstDateStr(), summary);
    return NextResponse.json({ ok: true, log });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/walk-logs", e);
    return fail(e);
  }
}
