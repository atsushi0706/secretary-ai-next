/**
 * 今日のあなたの取扱説明書。
 * GET            : 今日ぶん（無ければその場で作る。1日1回だけ生成）
 * GET ?peek=1    : 生成せずに、すでにあるものだけ返す（表示前の先読み用）
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTodayManual, loadTodayManual } from "@/lib/today-manual";
import { logError } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    if (new URL(req.url).searchParams.get("peek") === "1") {
      return NextResponse.json({ manual: await loadTodayManual(userId) });
    }
    return NextResponse.json({ manual: await getTodayManual(userId) });
  } catch (e: any) {
    await logError(userId, "/api/today-manual", e).catch(() => {});
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
