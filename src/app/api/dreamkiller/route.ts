/**
 * ドリームキラーとのやり取り。
 *
 *   POST { action: "appear", theme }            → 現れる（第一声と姿）
 *   POST { action: "hit", theme, said, log }    → 言い返しを受けて、HPを減らして言い返す
 *
 * 淳くん専用（管理者だけ）。
 *
 * 【減らし幅はコードで決める】
 * AIには「どの手応えか（clean/solid/wobbly/none）」だけを選ばせ、
 * 何ポイント減らすかは dreamkiller.ts の DAMAGE で決める。
 * AIに数字を作らせると、同じ返しでも日によって1〜100まで振れてしまう。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { complete } from "@/lib/ai";
import { logError } from "@/lib/supabase";
import {
  dkPersona, dkJudgePrompt, DAMAGE, DK_MAX_HP, DK_FACES,
  DK_OPENERS, DK_SURRENDER, type DkHit,
} from "@/lib/dreamkiller";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

async function gate() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { err: NextResponse.json({ error: "ログインしてね" }, { status: 401 }) };
  if (!isAdmin(userId)) return { err: NextResponse.json({ error: "まだ準備中です" }, { status: 403 }) };
  return { userId };
}

/** 同じものが続けて出ないように、種から選ぶ（Math.random を使わない） */
function pickBy(seed: number, list: string[]): string {
  return list[Math.abs(seed) % list.length];
}

export async function POST(req: Request) {
  const g = await gate();
  if ("err" in g) return g.err;
  try {
    const b = await req.json().catch(() => ({}));
    const theme = String(b.theme ?? "").slice(0, 600);

    /* ── 現れる ── */
    if (b.action === "appear") {
      const seed = Number(b.seed) || theme.length || 1;
      return NextResponse.json({
        face: pickBy(seed, DK_FACES),
        say: pickBy(seed * 7 + 3, DK_OPENERS),
        hp: DK_MAX_HP,
      });
    }

    /* ── 言い返しを受ける ── */
    if (b.action === "hit") {
      const said = String(b.said ?? "").trim().slice(0, 1200);
      const dkSaid = String(b.dkSaid ?? "").slice(0, 600);
      const hpNow = Math.max(0, Math.min(DK_MAX_HP, Number(b.hp) || DK_MAX_HP));
      if (!said) return NextResponse.json({ error: "何か言い返してみて" }, { status: 400 });

      // ① どれだけ芯があるか（判定だけ。数字は作らせない）
      let hit: DkHit = "wobbly";
      let why = "";
      try {
        const raw = await complete({
          userId: g.userId,
          prompt: dkJudgePrompt(theme, said, dkSaid),
          maxTokens: 120,
          temperature: 0,
          prefer: "claude",
        });
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
          const j = JSON.parse(m[0]);
          if (["clean", "solid", "wobbly", "none"].includes(j.hit)) hit = j.hit;
          why = String(j.why ?? "").slice(0, 40);
        }
      } catch { /* 判定に失敗しても、動いた分は減らす（wobbly のまま） */ }

      const hp = Math.max(0, hpNow - DAMAGE[hit]);

      // ② 倒れたなら、決まった言葉を残して消える（AIに書かせない。ここが芯だから）
      if (hp <= 0) {
        return NextResponse.json({ hp: 0, hit, why, say: DK_SURRENDER, defeated: true });
      }

      // ③ まだ立っている。食い下がる
      const log = (Array.isArray(b.log) ? b.log : [])
        .slice(-6)
        .map((x: any) => `${x.who === "dk" ? "ドリームキラー" : "相手"}：${String(x.text ?? "").slice(0, 300)}`)
        .join("\n");
      let say = "";
      try {
        say = (await complete({
          userId: g.userId,
          system: dkPersona(theme),
          prompt: `${log ? `# ここまでのやり取り\n${log}\n\n` : ""}`
            + `# 相手がいま言い返してきたこと\n${said}\n\n`
            + `これに食い下がってください。2〜4文。共感しない。説教しない。`,
          maxTokens: 220,
          temperature: 0.9,
        })).trim();
      } catch { /* 下で埋める */ }
      if (!say) say = "ふーん。……で？";

      return NextResponse.json({ hp, hit, why, say, defeated: false });
    }

    return NextResponse.json({ error: "何をするのか分からなかった" }, { status: 400 });
  } catch (e: any) {
    await logError(g.userId, "/api/dreamkiller", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
