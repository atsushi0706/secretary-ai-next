/**
 * 主人公レベル API（本人が現在地を選ぶ方式）。
 * GET: 主人公設定＋レベル＋変化の履歴。
 * POST action=save: 主人公設定を保存。
 * POST action=levels: 本人が選んだ現在地（各領域の値 or null=不明）を保存し、履歴に積む。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getHero, saveHeroIdentity, saveHeroLevels, hasIdentity, DOMAINS, emptyLevels, type HeroLevels, type HeroDomain } from "@/lib/hero";
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
    return NextResponse.json({ hero: h, hasIdentity: hasIdentity(h) });
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

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/hero", e);
    return fail(e);
  }
}
