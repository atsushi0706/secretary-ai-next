/**
 * 週刊レポートの確認と承認（マスター専用）。
 * GET  : 承認待ちの一覧（全ユーザーぶん・週ごと）
 * POST : { ids }                       → 承認 → その場で本人へ通知（ここで初めて届く）
 *        { action: "skip", ids }       → 送らずに片づける（本人には何も届かない）
 *        { action: "rebuild", id }     → その1通を、その週の記録で作り直す（下書きのまま）
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { listDrafts, approveWeekly, listAllWeekly, skipWeekly, rebuildWeekly, periodLabel } from "@/lib/weekly";
import { sendPushToUser } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const session = await auth();
  if (!isAdmin((session?.user as any)?.id)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const drafts = await listDrafts();
  // 誰のレポートかが分かるように、呼び名を添える
  const supa = supabaseAdmin();
  const { data: users } = await supa.from("user_settings").select("user_id, user_call_name, email");
  const nameOf = new Map((users ?? []).map((u: any) => [u.user_id, u.user_call_name || u.email || u.user_id.slice(0, 8)]));
  return NextResponse.json({
    drafts: drafts.map((d) => ({ ...d, name: nameOf.get(d.user_id) ?? d.user_id.slice(0, 8), period: periodLabel(d.week_start) })),
    // 承認待ちだけでなく、送りおえたものも含めて週ごとに全員ぶん
    all: (await listAllWeekly(6)).map((w) => ({ ...w, period: periodLabel(w.week_start) })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdmin((session?.user as any)?.id)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const b = await req.json().catch(() => ({}));
    const action = String(b.action ?? "approve");
    const ids: string[] = Array.isArray(b.ids) ? b.ids.map(String) : [];

    if (action === "rebuild") {
      const id = String(b.id ?? "");
      if (!id) return NextResponse.json({ error: "どれを作り直すかが選ばれていません" }, { status: 400 });
      const built = await rebuildWeekly(id);
      if (!built) return NextResponse.json({ error: "下書きでないものは作り直せません" }, { status: 400 });
      return NextResponse.json({ ok: true, body: built.body, facets: built.facets });
    }

    if (action === "skip") {
      if (ids.length === 0) return NextResponse.json({ error: "片づけるものが選ばれていません" }, { status: 400 });
      const skipped = await skipWeekly(ids);
      return NextResponse.json({ ok: true, skipped });
    }

    if (ids.length === 0) return NextResponse.json({ error: "承認するものが選ばれていません" }, { status: 400 });
    const drafts = await listDrafts();
    const target = drafts.filter((d) => ids.includes(d.id));
    const approved = await approveWeekly(ids);

    // 承認できたぶんだけ、本人へ通知する（ここで初めて届く）
    let sent = 0;
    for (const d of target) {
      try {
        const r = await sendPushToUser(d.user_id, {
          title: "📮 今週のふりかえりが届いたよ",
          body: "1週間、おつかれさま。宝箱に入れておいたよ。",
          url: "/shinga?open=weekly", tag: "weekly",
        });
        if (r.sent > 0) sent++;
      } catch { /* 通知が飛ばなくても、画面では読める */ }
    }
    return NextResponse.json({ ok: true, approved, notified: sent });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
