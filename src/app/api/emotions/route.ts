/**
 * 状態パラメーター（心の状態＋体のエネルギー）。
 * ピークで最初に1回、ワークの後にもう1回…と、その都度チェックできる（変化を見るため）。
 * 各記録は時刻つきで残し、1日の中の「さっき→今」の変化や、一日の流れが読める。
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
    const today = jstDateStr();
    const todays = emotions.filter((e) => e.date === today);
    // 直近の記録（＝「さっき」の値）を返す。ワーク後の変化チェックに使う。
    const last = emotions[0] ?? null;
    return NextResponse.json({
      emotions,
      today,
      todayCount: todays.length,
      last: last ? { level: last.level, note: last.note, at: last.created_at } : null,
    });
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
      return NextResponse.json({ error: "心の状態は 1〜10 で選んでください" }, { status: 400 });
    }
    const energyRaw = b.energy == null || b.energy === "" ? null : Number(b.energy);
    if (energyRaw != null && (!Number.isInteger(energyRaw) || energyRaw < 1 || energyRaw > 10)) {
      return NextResponse.json({ error: "体のエネルギーは 1〜10 で選んでください" }, { status: 400 });
    }

    const date = b.date || jstDateStr();
    // 時刻を slot にして、1日に何度でも記録できるようにする（さっき→今の変化を残す）
    const slot = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm（一意マーカー）

    const emotion = await createEmotion(userId, {
      date,
      slot,
      level,
      energy: energyRaw,
      note: String(b.note ?? ""),
      quest_id: b.questId ?? null,
    });
    return NextResponse.json({ ok: true, emotion });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/emotions", e);
    return fail(e);
  }
}
