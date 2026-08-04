/**
 * 毎週金曜：全ユーザーぶんの週刊レポートを作り、**下書きのまま**溜める。
 * ここでは誰にも届かない。マスターが /admin で読んでOKを出して、初めて届く。
 *
 * 金曜20時(JST) = 金曜11時(UTC) に動かす。
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { buildWeekly, saveWeeklyDraft, weekStartStr } from "@/lib/weekly";
import { sendPushToUser } from "@/lib/push";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  // Vercel Cron 以外から叩かれないようにする
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supa = supabaseAdmin();
  const { data: users } = await supa.from("user_settings").select("user_id");
  const list = (users ?? []) as { user_id: string }[];

  let made = 0;
  const failed: string[] = [];
  for (const u of list) {
    try {
      const body = await buildWeekly(u.user_id);
      await saveWeeklyDraft(u.user_id, body);
      made++;
    } catch (e: any) {
      failed.push(`${u.user_id.slice(0, 8)}: ${String(e?.message ?? e).slice(0, 60)}`);
    }
  }

  // マスターにだけ「できたよ」と知らせる。ここから承認の作業が始まる
  const admins = (process.env.ADMIN_USER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const a of admins) {
    if (!isAdmin(a)) continue;
    try {
      await sendPushToUser(a, {
        title: "📋 みんなの週刊レポートができたよ",
        body: `${made}人ぶん。読んでOKを出すと、みんなに届くよ。`,
        url: "/admin", tag: "weekly-review",
      });
    } catch { /* 通知が飛ばなくても、管理画面には出ている */ }
  }

  return NextResponse.json({ ok: true, weekStart: weekStartStr(), made, failed });
}
