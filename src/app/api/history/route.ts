/**
 * チャットの記録。
 *
 *   GET                     → 一覧（日付 × 部屋の束。新しい日が上）
 *   GET ?q=ことば            → その言葉を話した束だけ（どこが当たったかも返す）
 *   GET ?key=iw:日付:部屋   → その束の中身（古い順）
 *   GET ?key=rv:日付:朝夜   → リアルバース側も同じ形で
 *
 * 本人の記録だけ。ここは**読むだけ**の場所（書き込み・削除の口は作らない）。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin, logError } from "@/lib/supabase";
import { isMissingTable } from "@/lib/pg-errors";
import { toSessions, roomJa, isNoise, terms, matches, snippet, resumeMode, type HistRow } from "@/lib/history";

export const dynamic = "force-dynamic";

/** 一覧に出す範囲。無限に遡ると重いので、直近をこれだけ */
const IW_ROWS = 1600;
const RV_ROWS = 1000;

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const supa = supabaseAdmin();
    const key = new URL(req.url).searchParams.get("key");

    /* ── 中身をひとつ ── */
    if (key) {
      const m = key.match(/^(iw|rv):(\d{4}-\d{2}-\d{2}):(.+)$/);
      if (!m) return NextResponse.json({ error: "その記録が見つからない" }, { status: 400 });
      const [, kind, date, room] = m;

      const rows = kind === "iw"
        ? (await supa.from("shinga_conversations")
            .select("role, content, created_at")
            .eq("user_id", userId).eq("date", date).eq("place", room)
            .order("id", { ascending: true }).limit(400)).data
        : (await supa.from("conversations")
            .select("role, content, created_at")
            .eq("user_id", userId).eq("date", date).eq("mode", room)
            .order("id", { ascending: true }).limit(400)).data;

      return NextResponse.json({
        date,
        roomJa: roomJa(kind === "rv" ? `rv:${room}` : room),
        // その部屋なら、この記録の続きから話せる（できない部屋は null）
        resume: kind === "iw" ? resumeMode(room) : null,
        messages: (rows ?? [])
          .filter((r: any) => !isNoise(r.content))
          .map((r: any) => ({ role: r.role, content: r.content, at: r.created_at })),
      });
    }

    /* ── 一覧 ── */
    const [iw, rv] = await Promise.all([
      supa.from("shinga_conversations")
        .select("date, place, role, content")
        .eq("user_id", userId).order("id", { ascending: false }).limit(IW_ROWS),
      supa.from("conversations")
        .select("date, mode, role, content")
        .eq("user_id", userId).order("id", { ascending: false }).limit(RV_ROWS),
    ]);
    const sessions = toSessions((iw.data ?? []) as HistRow[], (rv.data ?? []) as HistRow[]);

    /*
     * 探す（?q=）。
     * 束ごとに「その言葉を話したか」を見て、当たった束だけ返す。
     * どこが当たったかも一緒に返す（開かなくても分かるように）。
     */
    const q = new URL(req.url).searchParams.get("q") ?? "";
    const ts = terms(q);
    if (!ts.length) return NextResponse.json({ sessions });

    const all = [
      ...((iw.data ?? []) as HistRow[]).map((r) => ({ k: `iw:${r.date}:${String(r.place ?? "map")}`, c: r.content })),
      ...((rv.data ?? []) as HistRow[]).map((r) => ({ k: `rv:${r.date}:${r.mode ?? "morning"}`, c: r.content })),
    ];
    const hit = new Map<string, string>();
    for (const r of all) {
      if (isNoise(r.c) || hit.has(r.k) || !matches(r.c, ts)) continue;
      hit.set(r.k, snippet(r.c, ts));
    }
    return NextResponse.json({
      q,
      sessions: sessions.filter((x) => hit.has(x.key)).map((x) => ({ ...x, hit: hit.get(x.key) ?? "" })),
    });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ sessions: [] });
    await logError(userId, "/api/history", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
