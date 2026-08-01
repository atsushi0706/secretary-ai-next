/**
 * 発信スタジオ API。
 * GET    : 投稿一覧＋メソッド＋アバター（studio を1回で開ける）
 * POST   : {} → 直近ワークから投稿を生成（編集者チェーン）
 * PATCH  : { id, slides?, caption?, title? } → 手直しを保存
 * DELETE : { id } → 削除
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generatePost, listPosts, updatePost, deletePost, getMethod } from "@/lib/broadcast";
import { AIRateLimitError } from "@/lib/ai";
import { isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { supabaseAdmin, logError } from "@/lib/supabase";

async function futureSelfUrl(userId: string): Promise<string | null> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.storage.from("avatars").list(userId, { search: "future-self" });
    if (!(data ?? []).some((f) => f.name === "future-self")) return null;
    const { data: pub } = supa.storage.from("avatars").getPublicUrl(`${userId}/future-self`);
    return pub.publicUrl;
  } catch { return null; }
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const [posts, method, avatar, settings] = await Promise.all([
      listPosts(userId),
      getMethod(userId),
      futureSelfUrl(userId),
      supabaseAdmin().from("user_settings").select("user_call_name, display_name").eq("user_id", userId).maybeSingle().then((r) => r.data, () => null),
    ]);
    return NextResponse.json({
      posts, method, avatar,
      penName: (settings as any)?.user_call_name || (settings as any)?.display_name || "",
      refUrl: `https://singaworld.rinq-systeme.jp/welcome?ref=${encodeURIComponent(userId)}`,
    });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ posts: [], method: null, needsMigration: true, hint: MIGRATION_HINT });
    await logError(userId, "/api/broadcast GET", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const post = await generatePost(userId);
    return NextResponse.json({ post });
  } catch (e: any) {
    if (e instanceof AIRateLimitError) {
      return NextResponse.json({ error: `AIが混み合ってる。${e.retryAfterSec}秒ほど待ってもう一度押してみて。` }, { status: 429 });
    }
    if (isMissingTable(e)) return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
    await logError(userId, "/api/broadcast POST", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    const id = Number(b.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "id が不正" }, { status: 400 });
    await updatePost(userId, id, {
      slides: Array.isArray(b.slides) ? b.slides : undefined,
      caption: typeof b.caption === "string" ? b.caption : undefined,
      title: typeof b.title === "string" ? b.title : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    await logError(userId, "/api/broadcast PATCH", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    await deletePost(userId, Number(b.id));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
