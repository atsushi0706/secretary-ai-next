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
import { hasFeature } from "@/lib/app-config";
import { complete } from "@/lib/ai";
import { logError, getUserSettings } from "@/lib/supabase";
import {
  dkPersona, dkJudgePrompt, dkOpenerPrompt, dkSurrenderPrompt, dkWelcomeBackPrompt, hasCore,
  afterFeelingPrompt, saidFeeling, AFTER_FEELING_CORE, AFTER_FEELING_FALLBACK,
  DAMAGE, DK_MAX_HP, DK_FACES, DK_OPENERS, DK_SURRENDER, DK_BACK_FALLBACK, type DkHit,
} from "@/lib/dreamkiller";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

async function gate() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { err: NextResponse.json({ error: "ログインしてね" }, { status: 401 }) };
  // 管理者か、管理画面で開けてもらった人（お試しスイッチ）
  if (!isAdmin(userId) && !(await hasFeature(userId, "dreamkiller"))) {
    return { err: NextResponse.json({ error: "まだ準備中です" }, { status: 403 }) };
  }
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
      // 第一声は、その場の話に合わせて作る（固定文だと話に噛み合わない）
      let say = "";
      try {
        say = (await complete({
          userId: g.userId,
          prompt: dkOpenerPrompt(theme),
          maxTokens: 140,
          temperature: 1,
        })).trim();
      } catch { /* 下で保険に落ちる */ }
      if (!say || say.length > 90) say = pickBy(seed * 7 + 3, DK_OPENERS);
      return NextResponse.json({ face: pickBy(seed, DK_FACES), say, hp: DK_MAX_HP });
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

      const log = (Array.isArray(b.log) ? b.log : [])
        .slice(-6)
        .map((x: any) => `${x.who === "dk" ? "ドリームキラー" : "相手"}：${String(x.text ?? "").slice(0, 300)}`)
        .join("\n");

      /*
       * ② 倒れた。負けを認めて消える。
       *
       * **言い方は毎回変える**（同じ文が続くと、演出ではなく仕掛けに見える）。
       * ただし言う中身＝芯は変えない。芯（うつし・信じている・ありがとう）が
       * 1つでも抜けていたら、決まった文に差し替える。
       * 生成にまかせきると、この機能でいちばん大事な一言が消えることがある。
       */
      if (hp <= 0) {
        let bye = "";
        try {
          bye = (await complete({
            userId: g.userId,
            prompt: dkSurrenderPrompt(theme, [log, `相手：${said}`].join(String.fromCharCode(10))),
            maxTokens: 420,
            temperature: 1,
          })).trim();
        } catch { /* 下で保険に落ちる */ }
        if (!bye || !hasCore(bye)) bye = DK_SURRENDER;
        return NextResponse.json({ hp: 0, hit, why, say: bye, defeated: true });
      }

      // ③ まだ立っている。食い下がる
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

    /* ── 消えたあと、パラレルウォークに戻る。清瀬リンクが先に口を開く ── */
    if (b.action === "back") {
      const settings = await getUserSettings(g.userId).catch(() => null) as any;
      const guideName = String(settings?.secretary_name || "清瀬リンク");
      let say = "";
      try {
        say = (await complete({
          userId: g.userId,
          prompt: dkWelcomeBackPrompt(guideName, theme, b.won === true),
          maxTokens: 260,
          temperature: 1,
        })).trim();
      } catch { /* 下で保険に落ちる */ }
      // 知らないはずのことを言っていたら使わない（世界観が壊れる）
      if (!say || /ドリームキラー|戦っ|たたかっ|勝っ|倒し/.test(say)) say = DK_BACK_FALLBACK;
      return NextResponse.json({ say });
    }

    /*
     * ── 戻ったあと、相手が苛立ちや不安を口にしたとき ──
     *
     * 淳くん自身が、言われてめちゃくちゃイラッとして、少し不安にもなった。
     * そこで放り出さない。**でも、気持ちを口にしたときだけ**返す。
     * 言っていないのに解説を始めると、ただのお説教になる。
     */
    if (b.action === "feeling") {
      const said = String(b.said ?? "").trim().slice(0, 1200);
      if (!said || !saidFeeling(said)) return NextResponse.json({ say: "" });

      const settings = await getUserSettings(g.userId).catch(() => null) as any;
      const guideName = String(settings?.secretary_name || "清瀬リンク");
      let say = "";
      try {
        say = (await complete({
          userId: g.userId,
          prompt: afterFeelingPrompt(guideName, said, theme),
          maxTokens: 420,
          temperature: 1,
        })).trim();
      } catch { /* 下で保険に落ちる */ }
      // 筋（まだ叶っていない／叶っていたら響かない／それでも行きたい）が抜けたら、決まった文に
      const 筋あり = AFTER_FEELING_CORE.filter((c) => c.re.test(say)).length >= 2;
      if (!say || !筋あり) say = AFTER_FEELING_FALLBACK;
      return NextResponse.json({ say });
    }

    return NextResponse.json({ error: "何をするのか分からなかった" }, { status: 400 });
  } catch (e: any) {
    await logError(g.userId, "/api/dreamkiller", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
