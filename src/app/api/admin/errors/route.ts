/**
 * 最近のエラーを見る。管理者だけ。
 *
 * 【なぜ作ったか】
 * お客様から「文字におこすところで失敗する」と言われても、
 * こちらには何も残っておらず、原因を確かめる手立てがまったく無かった。
 * 記録は前からあった（error_logs）のに、**それを読む画面が無かった**。
 *
 *   GET               → 直近のエラー（既定50件）
 *   GET ?route=/api/stt → その入口のぶんだけ
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin, logError } from "@/lib/supabase";
import { isMissingTable } from "@/lib/pg-errors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdmin(userId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const sp = new URL(req.url).searchParams;
    const route = sp.get("route");
    const limit = Math.min(200, Math.max(1, Number(sp.get("limit")) || 50));

    const supa = supabaseAdmin();
    let q = supa.from("error_logs")
      .select("id, user_id, route, message, meta, created_at")
      .order("id", { ascending: false })
      .limit(limit);
    if (route) q = q.eq("route", route);
    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as any[];

    // どの入口で何件出ているか（どこが痛んでいるかを一目で）
    const byRoute: Record<string, number> = {};
    for (const r of rows) byRoute[r.route] = (byRoute[r.route] ?? 0) + 1;

    return NextResponse.json({
      rows: rows.map((r) => ({
        id: r.id,
        at: r.created_at,
        route: r.route,
        // 誰のものかは、末尾だけ（本人を突き止めるためではなく、同じ人かを見るため）
        who: r.user_id ? `…${String(r.user_id).slice(-6)}` : "（不明）",
        message: r.message,
        meta: r.meta ?? null,
      })),
      byRoute,
    });
  } catch (e: any) {
    if (isMissingTable(e)) {
      return NextResponse.json({ rows: [], byRoute: {}, needsMigration: true });
    }
    await logError(userId, "/api/admin/errors", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
