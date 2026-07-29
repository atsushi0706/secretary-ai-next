/**
 * 管理者によるユーザー操作。ADMIN_USER_IDS の管理者だけ。
 * POST { action: "disable-notify" | "delete", userId }
 *  - disable-notify: 通知だけ解除（データは残す）
 *  - delete        : そのユーザーを完全削除（取り消せない）
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin, disableUserNotifications, deleteUserCompletely } from "@/lib/admin";
import { logError } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  const meId = (session?.user as any)?.id;
  if (!meId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdmin(meId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const { action, userId } = await req.json();
    const target = String(userId ?? "").trim();
    if (!target) return NextResponse.json({ error: "userId が必要です" }, { status: 400 });

    if (action === "disable-notify") {
      await disableUserNotifications(target);
      return NextResponse.json({ ok: true });
    }
    if (action === "delete") {
      // 管理者自身は削除させない（誤操作でロックアウト防止）
      if (target === meId) return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });
      const r = await deleteUserCompletely(target);
      return NextResponse.json({ ok: true, ...r });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    await logError(meId, "/api/admin/user", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
