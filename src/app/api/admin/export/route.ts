/**
 * 全データの書き出し。
 * 管理者（ADMIN_USER_IDS に登録された Google sub）だけが使える。
 * 自分の分だけなら ?mine=1 で、ログインしていれば誰でも取り出せる。
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

  if (!mine && !isAdmin(userId)) {
    return NextResponse.json(
      { error: "全員分の書き出しは管理者だけです。自分の分は ?mine=1 で取り出せます。" },
      { status: 403 },
    );
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
