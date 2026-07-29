/**
 * 「未来の私」の写真（任意・臨場感のため）。
 * 既存の "avatars" バケットにユーザー固定パスで保存する（新しいバケット/テーブルは不要）。
 * - GET  : { url: string | null }  （無ければ null）
 * - POST : multipart/form-data field=file → { ok, url }
 * - DELETE: 写真を消す → { ok }
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin, logError } from "@/lib/supabase";

const BUCKET = "avatars";
const MAX_BYTES = 6 * 1024 * 1024; // 6MB
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const objectPath = (userId: string) => `${userId}/future-self`; // 拡張子なし固定＝常に1枚・上書き

async function currentUrl(userId: string): Promise<string | null> {
  const supa = supabaseAdmin();
  const { data, error } = await supa.storage.from(BUCKET).list(userId, { search: "future-self" });
  if (error) return null;
  const found = (data ?? []).find((f) => f.name === "future-self");
  if (!found) return null;
  const { data: pub } = supa.storage.from(BUCKET).getPublicUrl(objectPath(userId));
  const v = (found as any)?.updated_at ? new Date((found as any).updated_at).getTime() : "";
  return `${pub.publicUrl}${v ? `?v=${v}` : ""}`;
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    return NextResponse.json({ url: await currentUrl(userId) });
  } catch (e: any) {
    await logError(userId, "/api/future-self GET", e);
    return NextResponse.json({ url: null });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "ファイルが大きすぎます (6MBまで)" }, { status: 400 });
    if (!ALLOWED_MIME.includes(file.type)) return NextResponse.json({ error: "PNG/JPEG/WEBP/GIF のみ対応" }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const supa = supabaseAdmin();
    const { error: upErr } = await supa.storage.from(BUCKET).upload(objectPath(userId), bytes, {
      contentType: file.type, upsert: true, cacheControl: "3600",
    });
    if (upErr) {
      return NextResponse.json({
        error: `アップロード失敗: ${upErr.message}。Supabase で "${BUCKET}" バケット(public)が必要です。`,
      }, { status: 500 });
    }
    return NextResponse.json({ ok: true, url: await currentUrl(userId) });
  } catch (e: any) {
    await logError(userId, "/api/future-self POST", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const supa = supabaseAdmin();
    await supa.storage.from(BUCKET).remove([objectPath(userId)]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    await logError(userId, "/api/future-self DELETE", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
