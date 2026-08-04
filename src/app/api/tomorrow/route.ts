/**
 * 明日への引き継ぎ（最優先感情＋明日やること）。
 * GET  : 今日ぶんの「最優先感情」（前の晩に決めたもの）
 * POST : { emotion, why, actions[] } → 保存。actions はリアルバースのタスクにもなる
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveTomorrow, todaysFocus, tomorrowStr } from "@/lib/tomorrow";
import { logError } from "@/lib/supabase";
import { isMissingTable } from "@/lib/shinga";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ focus: await todaysFocus(userId) });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json().catch(() => ({}));
    const actions: string[] = Array.isArray(b.actions)
      ? b.actions.map((a: any) => String(a ?? "").trim()).filter(Boolean)
      : [];

    await saveTomorrow(userId, { emotion: String(b.emotion ?? ""), why: String(b.why ?? ""), actions });

    // 決めた「明日やること」は、明日づけのタスクとして本当に置く。
    // ここを飛ばすと「話し合ったのに何も残らない」になる。
    const placed: string[] = [];
    for (const a of actions.slice(0, 3)) {
      try {
        const { addTask } = await import("@/lib/google");
        await addTask(userId, a, {
          notes: "🌙 夜の振り返りで決めた、明日の一手",
          due: `${tomorrowStr()}T00:00:00.000Z`,
        });
        placed.push(a);
      } catch { /* Google未接続でも、決めたこと自体は残る */ }
    }
    return NextResponse.json({ ok: true, placed });
  } catch (e: any) {
    if (isMissingTable(e)) {
      return NextResponse.json({ error: "保存先（tomorrow_focus）がまだ作られていません", needsMigration: true }, { status: 503 });
    }
    await logError(userId, "/api/tomorrow", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
