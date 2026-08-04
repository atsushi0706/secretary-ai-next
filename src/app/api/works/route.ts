/**
 * いまのユーザーが使えるワーク。
 * 親アカウント（管理者）は常に全部。それ以外は app_config の鍵に従う。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getLockedWorks } from "@/lib/app-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  // 親アカウントかどうかも返す。まだ配っていない機能（発信スタジオ）の出し分けに使う
  const admin = isAdmin(userId);
  if (admin) return NextResponse.json({ locked: [], isAdmin: true });
  return NextResponse.json({ locked: await getLockedWorks(), isAdmin: false });
}
