/**
 * 主人公レベルアップ API。
 * GET: 主人公設定＋最新レベル＋推移を返す。
 * POST action=save: 主人公設定を保存。
 * POST action=assess: 記録からAIが5領域のレベルを推定して保存。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { complete } from "@/lib/ai";
import { extractJson } from "@/lib/claude";
import { getHero, saveHeroIdentity, saveHeroAssessment, hasIdentity, DOMAINS, type HeroLevels } from "@/lib/hero";
import { listWalkLogs, listEmotions, listQuests, loadShingaMessages, isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { getUserSettings, logError } from "@/lib/supabase";
import { jstDateStr } from "@/lib/google";

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
      const h = await getHero(userId);
      return NextResponse.json({ ok: true, hero: h });
    }

    if (action === "assess") {
      const h = await getHero(userId);
      if (!hasIdentity(h)) return NextResponse.json({ error: "先に主人公を設定してください" }, { status: 400 });

      const settings: any = await getUserSettings(userId).catch(() => null);
      const who = settings?.user_call_name || "この人";
      const [walks, emotions, quests, msgs] = await Promise.all([
        listWalkLogs(userId, 10).catch(() => []),
        listEmotions(userId, 20).catch(() => []),
        listQuests(userId).catch(() => []),
        loadShingaMessages(userId, 40).catch(() => []),
      ]);

      const prev = h!.levels;
      const material = [
        `主人公像：${h!.hero_statement}`,
        `増やしたい世界：${h!.desired_world}`,
        `減らしたい世界：${h!.enemy_world}`,
        `必要な人：${h!.needed_people}`,
        prev ? `前回のレベル：${JSON.stringify(prev)}` : "前回のレベル：なし（初回）",
        walks.length ? `パラレルウォークの記録（最大10）：\n${walks.map((w) => `- ${w.date}: ${w.summary.slice(0, 200)}`).join("\n")}` : "歩いた記録：なし",
        quests.length ? `クエスト：${quests.length}件（達成${quests.filter((q) => q.status === "done").length}）／${quests.slice(0, 6).map((q) => q.title).join(" / ")}` : "クエスト：なし",
        msgs.length ? `最近の会話（本人の言葉・最大12）：\n${msgs.filter((m) => m.role === "user").slice(-12).map((m) => `- ${m.content.slice(0, 100)}`).join("\n")}` : "",
      ].filter(Boolean).join("\n\n");

      const domainList = DOMAINS.map((d) => `${d.key}（${d.label}：${d.hint}）`).join("\n");

      const prompt = `あなたは ${settings?.secretary_name || "清瀬リンク"}。${who} の主人公としての成長を、記録から見立てる。

# 5つの領域（各 1〜100）
${domainList}

# ルール（厳守）
- 断定しない。「現在の記録から見ると、体現は42前後」という"現在地の仮説"として。
- 人格を否定しない。低いことを欠点にしない。身近な人への実践(relationship)を初級扱いしない。
- 急に大きく動かさない。前回がある場合、各領域 ±5 以内で微調整（明確な転機のみ ±10）。
- 「知っている」より「生きている・届けている」を重視。証拠がなければ上げない。
- 今日の1％行動は、小さく・今日できる・主人公視点・失敗時の代替つき。

# 出力（JSONのみ・フェンス無し）
{"levels":{"inner":0,"embodiment":0,"relationship":0,"delivery":0,"socialization":0},
"strongest":"領域キー","growth":"領域キー",
"summary":"2〜3文。強みと、次に伸ばす領域を、あたたかく。",
"nextAction":{"title":"今日の1％","description":"具体的に","fallback":"さらに小さい代替"}}

# ${who}の記録
${material}`;

      const raw = await complete({ userId, prompt, maxTokens: 900, temperature: 0.4 });
      const parsed = extractJson<any>(raw);
      if (!parsed?.levels) return NextResponse.json({ error: "うまく見立てられませんでした。もう一度試してください。" }, { status: 502 });

      const clamp = (n: any) => Math.max(1, Math.min(100, Math.round(Number(n) || 1)));
      const levels: HeroLevels = {
        inner: clamp(parsed.levels.inner), embodiment: clamp(parsed.levels.embodiment),
        relationship: clamp(parsed.levels.relationship), delivery: clamp(parsed.levels.delivery),
        socialization: clamp(parsed.levels.socialization),
      };
      const assessment = {
        strongest: parsed.strongest, growth: parsed.growth,
        summary: String(parsed.summary ?? ""), nextAction: parsed.nextAction ?? null,
        at: jstDateStr(),
      };
      await saveHeroAssessment(userId, levels, assessment, h!.history);
      const updated = await getHero(userId);
      return NextResponse.json({ ok: true, hero: updated });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/hero", e);
    return fail(e);
  }
}
