/** 自分にテスト通知を送る。ボタン「テスト通知を送る」用。 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendPushToUser } from "@/lib/push";
import { logError } from "@/lib/supabase";

export async function POST() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const r = await sendPushToUser(userId, {
      title: "清瀬リンク",
      body: "テスト通知だよ😊 これが届けばプッシュはバッチリ。",
      url: "/",
      tag: "test",
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    await logError(userId, "/api/push/test", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
