/**
 * クリスタルルームで決めた一手を、リアルバースの**本物のタスク**（Googleタスク）に置く。
 *
 * 【やらかしたこと】
 * 以前はここで quests（昔の「可能性の空」）にだけ書いていた。
 * その画面はもう使っていないので、「置いたよ」と出るのに、リアルバースを開いても
 * どこにも無い——という状態だった（淳くん：それきちんとタスクに入る？ → 入っていなかった）。
 *
 * いまは夜の振り返り／マネーオーダーと同じく addTask で本物に入れる。
 * 期限は Googleタスクの期限（due）にそのまま入るので、本文に書かなくても日付欄に出る。
 * 記録として quests にも残す（無くても失敗にはしない）。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createQuest } from "@/lib/shinga";
import { addTask } from "@/lib/google";
import { logError } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const title = String(b?.title ?? "").trim().slice(0, 60);
  if (!title) return NextResponse.json({ error: "中身がありません" }, { status: 400 });
  const notes = String(b?.body ?? "").trim().slice(0, 300);
  const due = /^\d{4}-\d{2}-\d{2}$/.test(String(b?.due ?? "")) ? String(b.due) : null;

  // ① リアルバース本体（Googleタスク）へ。ここが本命
  try {
    await addTask(userId, title, { notes: notes || undefined, due });
  } catch (e: any) {
    await logError(userId, "/api/shinga/quest addTask", e);
    return NextResponse.json({ error: "リアルバースに置けなかった（Googleタスクにつながっていないかも）" }, { status: 502 });
  }

  // ② 記録として quests にも残す（表が無くても、置けたことは変えない）
  let questId: string | null = null;
  try {
    const q = await createQuest(userId, { title, body: notes, category: "life" });
    questId = q.id;
  } catch { /* 記録だけ。失敗しても本命は置けている */ }

  return NextResponse.json({ ok: true, placed: title, due, questId });
}
