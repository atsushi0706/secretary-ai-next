/**
 * プッシュ購読の登録・解除・状態。
 * - GET   : { configured, subscribed }  ← ボタンの表示判定に使う
 * - POST  : { subscription } を保存 → { ok }
 * - DELETE: { endpoint } を解除 → { ok }
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveSubscription, removeSubscription, hasSubscription, pushConfigured } from "@/lib/push";
import { isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { logError } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    return NextResponse.json({
      configured: pushConfigured(),
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
      subscribed: pushConfigured() ? await hasSubscription(userId) : false,
      // どちらの鍵が見えていないかだけ返す（値そのものは返さない）
      has: {
        pub: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        priv: !!process.env.VAPID_PRIVATE_KEY,
        subject: !!process.env.VAPID_SUBJECT,
      },
    });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ configured: pushConfigured(), subscribed: false, needsMigration: true });
    return NextResponse.json({ configured: pushConfigured(), subscribed: false });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const { subscription } = await req.json();
    await saveSubscription(userId, subscription);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
    await logError(userId, "/api/push/subscribe", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const { endpoint } = await req.json();
    await removeSubscription(String(endpoint ?? ""));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    await logError(userId, "/api/push/subscribe DELETE", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
