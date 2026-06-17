/**
 * 秘書のアバター画像アップロード
 * POST /api/upload-avatar  multipart/form-data, field: file
 * Supabase Storage の "avatars" バケットに保存し、public URL を user_settings に保存
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin, upsertUserSettings } from "@/lib/supabase";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const BUCKET = "avatars";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "ファイルが大きすぎます (5MBまで)" }, { status: 400 });
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: "PNG/JPEG/WEBP/GIF のみ対応" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png"
      : file.type === "image/jpeg" ? "jpg"
      : file.type === "image/webp" ? "webp" : "gif";
    // ユーザーIDを含めたパスにする(他人と衝突しないよう)
    const objectPath = `${userId}/avatar-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const supa = supabaseAdmin();
    const { error: upErr } = await supa.storage
      .from(BUCKET)
      .upload(objectPath, bytes, {
        contentType: file.type,
        upsert: true,
        cacheControl: "3600",
      });
    if (upErr) {
      return NextResponse.json({
        error: `アップロード失敗: ${upErr.message}。Supabase で "${BUCKET}" バケット(public)を作成してください。`,
      }, { status: 500 });
    }

    const { data: pub } = supa.storage.from(BUCKET).getPublicUrl(objectPath);
    const publicUrl = pub.publicUrl;

    // 設定に保存
    await upsertUserSettings(userId, { secretary_avatar_url: publicUrl });

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
