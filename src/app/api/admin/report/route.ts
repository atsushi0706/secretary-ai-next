/** 管理者：指定ユーザーの週次レポート（実データベース）。ADMIN_USER_IDS のみ。 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { buildUserWeekReport } from "@/lib/adminReport";
import { logError } from "@/lib/supabase";

export const maxDuration = 30;

export async function GET(req: Request) {
  const session = await auth();
  const meId = (session?.user as any)?.id;
  if (!meId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdmin(meId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const sp = new URL(req.url).searchParams;
    const userId = String(sp.get("userId") ?? "").trim();
    const days = Math.max(1, Math.min(31, Number(sp.get("days")) || 7));
    if (!userId) return NextResponse.json({ error: "userId が必要です" }, { status: 400 });
    const r = await buildUserWeekReport(userId, days);
    return NextResponse.json(r);
  } catch (e: any) {
    await logError(meId, "/api/admin/report", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
