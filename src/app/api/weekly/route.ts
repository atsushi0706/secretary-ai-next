/**
 * 週刊レポート（本人用）。
 * マスターが承認したものだけを返す。未承認のものは絶対に見せない。
 *
 * GET  … 読めるレポート一覧
 * POST … 宝箱を開いた合図。未読の印を消す
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listMyWeekly, markWeeklyRead } from "@/lib/weekly";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ reports: await listMyWeekly(userId) });
}

export async function POST() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  await markWeeklyRead(userId);
  return NextResponse.json({ ok: true });
}
