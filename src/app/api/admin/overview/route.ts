/** 管理ダッシュボードのデータ。ADMIN_USER_IDS の管理者だけ。 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin, getAdminOverview } from "@/lib/admin";
import { logError } from "@/lib/supabase";

export const maxDuration = 30; // Google 補完に余裕を持たせる（既定10sだと足りないことがある）

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdmin(userId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    return NextResponse.json(await getAdminOverview());
  } catch (e: any) {
    await logError(userId, "/api/admin/overview", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
