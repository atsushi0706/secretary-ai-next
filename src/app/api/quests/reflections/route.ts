/**
 * クエストの振り返り記録。
 * リアルバースで実行した結果を、シンガワールド側に残すための入口。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listReflections, createReflection, isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { logError } from "@/lib/supabase";

function fail(e: any) {
  if (isMissingTable(e)) {
    return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
  }
  return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
}

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const questId = new URL(req.url).searchParams.get("questId") ?? undefined;
    const reflections = await listReflections(userId, questId);
    return NextResponse.json({ reflections });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/quests/reflections", e);
    return fail(e);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const b = await req.json();
    if (!b.questId) return NextResponse.json({ error: "questId が必要です" }, { status: 400 });
    const text = String(b.body ?? "").trim();
    if (!text) return NextResponse.json({ error: "本文が空です" }, { status: 400 });

    const reflection = await createReflection(userId, {
      quest_id: b.questId,
      google_task_id: b.googleTaskId ?? null,
      body: text,
      emotion_before: b.emotionBefore ?? null,
      emotion_after: b.emotionAfter ?? null,
      gap: b.gap ?? null,
      next_step: b.nextStep ?? null,
    });
    return NextResponse.json({ ok: true, reflection });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/quests/reflections", e);
    return fail(e);
  }
}
