/**
 * エラーログ閲覧用エンドポイント。
 * ADMIN_USER_IDS 環境変数 (カンマ区切りの Google sub) に登録された userId だけアクセス可能。
 * 講座生をサポートするとき、特定の Google sub で起きたエラーを確認するのに使う。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listRecentErrors } from "@/lib/supabase";

function isAdmin(userId: string): boolean {
  const admins = (process.env.ADMIN_USER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return admins.includes(userId);
}

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdmin(userId)) {
    return NextResponse.json(
      { error: "forbidden — ADMIN_USER_IDS に登録された Google sub のみアクセス可" },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const filterUserId = url.searchParams.get("userId")?.trim() || undefined;
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? "100")));

  try {
    const errors = await listRecentErrors(limit, filterUserId);
    return NextResponse.json({ ok: true, errors });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
