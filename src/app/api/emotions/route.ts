/**
 * 感情の10段階記録。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listEmotions, createEmotion, isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { jstDateStr } from "@/lib/google";
import { logError } from "@/lib/supabase";

function fail(e: any) {
  if (isMissingTable(e)) {
    return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
  }
  return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const emotions = await listEmotions(userId, 60);
    return NextResponse.json({ emotions });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/emotions", e);
    return fail(e);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const level = Number(b.level);
    if (!Number.isInteger(level) || level < 1 || level > 10) {
      return NextResponse.json({ error: "level は 1〜10 の整数です" }, { status: 400 });
    }
    const emotion = await createEmotion(userId, {
      date: b.date || jstDateStr(),
      level,
      note: String(b.note ?? ""),
      quest_id: b.questId ?? null,
    });
    return NextResponse.json({ ok: true, emotion });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/emotions", e);
    return fail(e);
  }
}
