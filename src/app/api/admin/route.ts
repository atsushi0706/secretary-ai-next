/**
 * 管理者用エンドポイント: 全ユーザーのサマリーを返す
 * 環境変数 ADMIN_USER_IDS (カンマ区切りの Google sub) に該当するユーザーのみアクセス可
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

function isAdmin(userId: string): boolean {
  const admins = (process.env.ADMIN_USER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return admins.includes(userId);
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "forbidden — ADMIN_USER_IDS に登録された Google sub のみアクセス可" }, { status: 403 });
  }

  const supa = supabaseAdmin();
  // 全ユーザー設定を取得
  const { data: users, error } = await supa
    .from("user_settings")
    .select("user_id, user_call_name, secretary_name, ntfy_topic, gemini_api_key, google_refresh_token, created_at, updated_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 各ユーザーの最終会話日・会話数・タスク数を集計
  const summaries = await Promise.all((users ?? []).map(async (u) => {
    // 最終会話
    const { data: lastConv } = await supa
      .from("conversations")
      .select("created_at")
      .eq("user_id", u.user_id)
      .order("created_at", { ascending: false })
      .limit(1);
    // 会話の総数
    const { count: convCount } = await supa
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", u.user_id);
    // 今日のbriefing数
    const today = new Date();
    const todayStr = `${today.getUTCFullYear() + (today.getUTCHours() >= 15 ? 0 : 0)}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate() + (today.getUTCHours() >= 15 ? 1 : 0)).padStart(2, "0")}`;
    void todayStr;
    return {
      user_id: u.user_id,
      user_call_name: u.user_call_name ?? "",
      secretary_name: u.secretary_name ?? "(default)",
      has_gemini_key: !!u.gemini_api_key,
      has_google: !!u.google_refresh_token,
      has_ntfy: !!u.ntfy_topic,
      created_at: u.created_at,
      updated_at: u.updated_at,
      last_conversation_at: lastConv?.[0]?.created_at ?? null,
      conversation_count: convCount ?? 0,
    };
  }));

  return NextResponse.json({
    ok: true,
    user_count: summaries.length,
    users: summaries,
  });
}
