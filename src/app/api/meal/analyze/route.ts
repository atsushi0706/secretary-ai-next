/**
 * 食事の写真 → カロリーとPFCの目安。
 * POST（multipart） image=写真 → 推定結果（保存はしない）
 *
 * 写真はメモリの上で扱って、そのまま捨てる。どこにも保存しない。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeMeal, looksLikeImage, MAX_IMAGE_BYTES, MIME_OK } from "@/lib/meal";
import { logError } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 拡張子しか手がかりが無いときのため（iPhoneのHEICで起きる） */
function mimeOf(file: File): string {
  if (MIME_OK.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  return "";
}

function b64(bytes: Uint8Array): string {
  let s = "";
  const STEP = 0x8000;
  for (let i = 0; i < bytes.length; i += STEP) s += String.fromCharCode(...bytes.subarray(i, i + STEP));
  return btoa(s);
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "ログインしてね" }, { status: 401 });

  try {
    const fd = await req.formData().catch(() => null);
    const image = fd?.get("image");
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "食事の写真を選んでね" }, { status: 400 });
    }
    if (image.size === 0 || image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "写真は8MBまで。撮り直すか、小さくしてね" }, { status: 400 });
    }
    const mime = mimeOf(image);
    if (!mime) {
      return NextResponse.json({ error: "JPEG・PNG・WebP・HEIC の写真を使ってね" }, { status: 415 });
    }
    const bytes = new Uint8Array(await image.arrayBuffer());
    if (!looksLikeImage(bytes, mime)) {
      return NextResponse.json({ error: "写真が壊れているみたい。もう一度撮ってみて" }, { status: 422 });
    }

    const log: string[] = [];
    const result = await analyzeMeal(userId, b64(bytes), mime, log);
    if (!result) {
      // 何が起きたか分からないまま「失敗しました」で終わらせない
      return NextResponse.json({
        error: "写真を読み取れなかった。もう一度、明るいところで撮ってみて",
        detail: log.join(" / ").slice(0, 300),
      }, { status: 502 });
    }
    return NextResponse.json({ result });
  } catch (e: any) {
    await logError(userId, "/api/meal/analyze", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
