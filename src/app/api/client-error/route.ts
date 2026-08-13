/**
 * 画面側で起きた壊れかたを、記録に残すだけの窓口。
 *
 * これが無かったせいで、「チャットの表示が消える」という声が届いても
 * 何が起きたのか一切分からなかった。/admin のエラー一覧で見られるようにする。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logError } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id ?? "anon";
    const b = await req.json().catch(() => ({}));
    const where = String(b?.where ?? "client").slice(0, 60);
    await logError(userId, `client/${where}`, new Error(String(b?.message ?? "不明")), {
      stack: String(b?.stack ?? "").slice(0, 1200),
      componentStack: String(b?.componentStack ?? "").slice(0, 1200),
      ua: String(b?.ua ?? "").slice(0, 300),
    });
  } catch { /* 記録に失敗しても、画面側は困らせない */ }
  // 何があっても 204。ここで失敗を返すと、壊れた画面がさらに騒がしくなる
  return new NextResponse(null, { status: 204 });
}
