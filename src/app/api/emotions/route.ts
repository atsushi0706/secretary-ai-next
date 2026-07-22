/**
 * 状態パラメーター（心の状態＋体のエネルギー）。
 * 1日2回まで。朝の枠（〜15時）と夜の枠（15時〜）でそれぞれ1回ずつ。
 * 何度も記録できると「今この瞬間の気分」になってしまい、変化が読めなくなるため。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listEmotions, createEmotion, isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { jstDateStr, jstHour } from "@/lib/google";
import { logError } from "@/lib/supabase";

export type Slot = "morning" | "evening";

/** いまが朝の枠か夜の枠か。リアルバース側の朝夜判定と同じ基準（15時）にそろえる */
export function currentSlot(): Slot {
  return jstHour() < 15 ? "morning" : "evening";
}

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
    const slot = currentSlot();
    const todays = emotions.filter((e) => e.date === today);
    return NextResponse.json({
      emotions,
      today,
      slot,
      // この枠はもう記録済みか（UI がボタンを閉じるのに使う）
      doneThisSlot: todays.some((e: any) => e.slot === slot),
      doneMorning: todays.some((e: any) => e.slot === "morning"),
      doneEvening: todays.some((e: any) => e.slot === "evening"),
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
    const slot: Slot = b.slot === "morning" || b.slot === "evening" ? b.slot : currentSlot();

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
    // 同じ枠に2回目を入れようとした（DB側の一意制約で弾かれる）
    if (e?.code === "23505") {
      return NextResponse.json(
        { error: "この枠はもう記録済みです。次は夜（または明日の朝）に。", alreadyDone: true },
        { status: 409 },
      );
    }
    if (!isMissingTable(e)) await logError(userId, "/api/emotions", e);
    return fail(e);
  }
}
