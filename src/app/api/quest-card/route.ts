/**
 * 未来からのクエストカード。
 * GET  : { card, streak, needed }  ← 今日のカード（条件を満たせば新規に引く）
 * POST : action=interpret {text} → AIが今日の課題に深める / action=done → 立ち向かった（完了）
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTodayCard, interpretCard, completeCard, adoptAsHigherQuest } from "@/lib/questCard";
import { isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { logError } from "@/lib/supabase";

export const maxDuration = 30;

function fail(e: any) {
  if (isMissingTable(e)) return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
  return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    return NextResponse.json(await getTodayCard(userId));
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ card: null, streak: 0, needed: 3, needsMigration: true });
    await logError(userId, "/api/quest-card", e);
    return fail(e);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    if (b.action === "interpret") {
      const card = await interpretCard(userId, String(b.text ?? ""));
      return NextResponse.json({ ok: true, card });
    }
    if (b.action === "done") {
      // 「これに立ち向かう」を押したときに初めてクエストへ入れる。
      // （見ただけで勝手に入れない＝決めるのは本人）
      const act = String(b.action_text ?? "").trim();
      if (act) await adoptAsHigherQuest(userId, act).catch(() => {});
      await completeCard(userId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/quest-card", e);
    return fail(e);
  }
}
