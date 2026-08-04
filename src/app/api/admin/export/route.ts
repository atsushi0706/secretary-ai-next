/**
 * データの書き出し。**管理者だけ**が使える。
 *
 * 以前は ?mine=1 を付ければ、ログインしている人なら誰でも自分の分を落とせた。
 * だが、この世界に書くのは内側のことで、
 * 「持ち出せる」こと自体を配りたくない（淳くんの判断）。
 * 全員分も自分の分も、管理者以外は取り出せない。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportAll } from "@/lib/backup";
import { logError } from "@/lib/supabase";

function isAdmin(userId: string): boolean {
  const admins = (process.env.ADMIN_USER_IDS || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  return admins.includes(userId);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mine = url.searchParams.get("mine") === "1";

  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // 自分の分（?mine=1）であっても、管理者以外は通さない
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "この機能は管理者だけです。" }, { status: 403 });
  }

  try {
    const data = await exportAll(mine ? userId : undefined);
    const stamp = data.takenAt.slice(0, 19).replace(/[:T]/g, "-");
    const name = mine ? `my-data-${stamp}.json` : `secretary-ai-backup-${stamp}.json`;
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    await logError(userId, "/api/admin/export", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
