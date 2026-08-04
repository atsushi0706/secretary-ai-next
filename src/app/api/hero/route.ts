/**
 * 主人公レベル API（本人が現在地を選ぶ方式）。
 * GET: 主人公設定＋レベル＋変化の履歴。
 * POST action=save: 主人公設定を保存。
 * POST action=levels: 本人が選んだ現在地（各領域の値 or null=不明）を保存し、履歴に積む。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getHero, saveHeroIdentity, saveHeroLevels, hasIdentity, DOMAINS, emptyLevels, type HeroLevels, type HeroDomain } from "@/lib/hero";
import { checkTurn, commitCheck, daysUntilDue, hasMeasured, isDue, lastCheckedAt, type CheckPick } from "@/lib/hero-check";
import { getUserSettings } from "@/lib/supabase";
import { isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { logError } from "@/lib/supabase";

function fail(e: any) {
  if (isMissingTable(e)) return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
  return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const h = await getHero(userId);
    return NextResponse.json({
      hero: h,
      hasIdentity: hasIdentity(h),
      // レベルチェック（週1）の状態。測る前は数字を出さない
      check: {
        due: isDue(h),
        daysUntilDue: daysUntilDue(h),
        lastCheckedAt: lastCheckedAt(h),
        measured: hasMeasured(h),
      },
    });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/hero", e);
    return fail(e);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const action = b.action ?? "save";

    if (action === "save") {
      await saveHeroIdentity(userId, {
        enemy_world: String(b.enemy_world ?? ""),
        desired_world: String(b.desired_world ?? ""),
        needed_people: String(b.needed_people ?? ""),
        hero_statement: String(b.hero_statement ?? ""),
      });
      return NextResponse.json({ ok: true, hero: await getHero(userId) });
    }

    if (action === "levels") {
      const h = await getHero(userId);
      if (!hasIdentity(h)) return NextResponse.json({ error: "先に主人公を設定してください" }, { status: 400 });
      const inLv = b.levels ?? {};
      const levels: HeroLevels = emptyLevels();
      for (const d of DOMAINS) {
        const v = inLv[d.key];
        levels[d.key as HeroDomain] = v == null ? null : Math.max(0, Math.min(100, Math.round(Number(v))));
      }
      await saveHeroLevels(userId, levels, h!.history);
      return NextResponse.json({ ok: true, hero: await getHero(userId) });
    }

    /**
     * レベルチェックの1ターン。会話でいまの様子を聞いて、埋まった領域だけ返す。
     * 数字は本人に見せない（見せると、その数字に合わせて答えてしまう）。
     */
    if (action === "check_turn") {
      const h = await getHero(userId);
      if (!isDue(h)) {
        return NextResponse.json({ error: `次のチェックまであと${daysUntilDue(h)}日だよ` }, { status: 429 });
      }
      const s2: any = await getUserSettings(userId).catch(() => null);
      const history = (Array.isArray(b.history) ? b.history : [])
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 500) }))
        .slice(-20);
      const filled = (Array.isArray(b.filled) ? b.filled : [])
        .filter((k: any) => DOMAINS.some((d) => d.key === k)) as HeroDomain[];
      const turn = await checkTurn(
        userId,
        s2?.user_call_name || "きみ",
        s2?.secretary_name || "清瀬リンク",
        history,
        filled,
      );
      return NextResponse.json({ ok: true, ...turn });
    }

    /** チェックの結果を確定。ここで初めて数字が動く（下がるのは1回6まで） */
    if (action === "check_commit") {
      const h = await getHero(userId);
      if (!isDue(h)) {
        return NextResponse.json({ error: `次のチェックまであと${daysUntilDue(h)}日だよ` }, { status: 429 });
      }
      const picks = (Array.isArray(b.picks) ? b.picks : [])
        .filter((p: any) => DOMAINS.some((d) => d.key === p?.domain) && Number.isFinite(Number(p?.value)))
        .map((p: any) => ({ domain: p.domain as HeroDomain, value: Number(p.value), why: String(p.why ?? "") })) as CheckPick[];
      if (!picks.length) return NextResponse.json({ error: "まだ何も埋まっていないよ" }, { status: 400 });
      await commitCheck(userId, h, picks, String(b.note ?? "").slice(0, 200));
      return NextResponse.json({ ok: true, hero: await getHero(userId) });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/hero", e);
    return fail(e);
  }
}
