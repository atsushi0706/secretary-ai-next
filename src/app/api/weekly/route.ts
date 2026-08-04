/**
 * 週刊レポート（本人用）。
 * マスターが承認したものだけを返す。未承認のものは絶対に見せない。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listMyWeekly } from "@/lib/weekly";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ reports: await listMyWeekly(userId) });
}
