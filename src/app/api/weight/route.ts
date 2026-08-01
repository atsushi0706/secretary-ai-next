/**
 * 体重・体脂肪率の記録。
 * GET    : 今日 / 7日平均 / 連続日数 / 履歴（180日）
 * POST   : { date?, weight?, fat?, note? } → 保存（同じ日は上書き）
 * DELETE : { date } → その日を消す
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getWeightSummary, saveWeight, deleteWeight } from "@/lib/weight";
import { isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { logError } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    return NextResponse.json(await getWeightSummary(userId));
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ needsMigration: true, history: [], days: 0, streak: 0 });
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    const num = (v: any) => (v === "" || v == null ? null : Number(v));
    const summary = await saveWeight(userId, {
      date: typeof b.date === "string" ? b.date : undefined,
      weight: num(b.weight),
      fat: num(b.fat),
      note: typeof b.note === "string" ? b.note : undefined,
    });
    return NextResponse.json(summary);
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
    const msg = String(e?.message ?? e);
    // 入力ミス（桁違いなど）は 400 で返して、画面で言い直してもらう
    if (/入れてね/.test(msg)) return NextResponse.json({ error: msg }, { status: 400 });
    await logError(userId, "/api/weight", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    await deleteWeight(userId, String(b.date ?? ""));
    return NextResponse.json(await getWeightSummary(userId));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
