/**
 * 「この頃のわたし」— 蓄積データから、変化をやさしく振り返るレポート。
 *
 * 設計思想：人は自分の変化を忘れる。だから外部化して「変わってきてるね」を返す。
 * これが "無理" の反証を積む装置。判定せず、許しと肯定の方向で。
 * インナーで掴んだこと（歩き・気づき）と、感情の動き、現実の一歩を一本につなぐ。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { complete } from "@/lib/ai";
import {
  listWalkLogs, listEmotions, listQuests, countTasksByQuest, listReflections,
  isMissingTable,
} from "@/lib/shinga";
import { getUserSettings, logError } from "@/lib/supabase";
import { jstDateStr } from "@/lib/google";

function daysAgo(iso: string): number {
  const d = new Date(iso).getTime();
  return Math.floor((Date.now() - d) / 86400000);
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const settings: any = await getUserSettings(userId).catch(() => null);
    const who = settings?.user_call_name || "きみ";

    // 蓄積データを軽く集める（全部は読まない・トークン節約）
    const [walks, emotions, quests, taskCounts, reflections] = await Promise.all([
      listWalkLogs(userId, 8).catch(() => []),
      listEmotions(userId, 30).catch(() => []),
      listQuests(userId).catch(() => []),
      countTasksByQuest(userId).catch(() => ({})),
      listReflections(userId).catch(() => []),
    ]);

    const hasAny = walks.length + emotions.length + quests.length + reflections.length > 0;
    if (!hasAny) {
      return NextResponse.json({ empty: true });
    }

    // 感情の傾向（新しい半分 vs 古い半分。1=穏やか〜10=しんどい）
    let trend = "";
    if (emotions.length >= 4) {
      const half = Math.floor(emotions.length / 2);
      const newAvg = emotions.slice(0, half).reduce((a, e) => a + e.level, 0) / half;
      const oldAvg = emotions.slice(half).reduce((a, e) => a + e.level, 0) / (emotions.length - half);
      const diff = newAvg - oldAvg;
      trend = diff <= -1 ? "最近は前より落ち着いてきている" : diff >= 1 ? "最近は少ししんどさが増えている" : "波はありつつ、大きくは変わっていない";
    }

    const walkCount7 = walks.filter((w) => daysAgo(w.created_at) <= 7).length;
    const walkCountPrev7 = walks.filter((w) => { const d = daysAgo(w.created_at); return d > 7 && d <= 14; }).length;
    const doneQuests = quests.filter((q) => q.status === "done").length;
    const taskTotal = Object.values(taskCounts).reduce((a: number, b: number) => a + b, 0);

    // 変化のサイン（前と今を具体的に比べる。AIがふわっとせず"進み"を言えるように）
    const signals: string[] = [];
    if (emotions.length >= 4) {
      const half = Math.floor(emotions.length / 2);
      const newAvg = emotions.slice(0, half).reduce((a, e) => a + e.level, 0) / half;
      const oldAvg = emotions.slice(half).reduce((a, e) => a + e.level, 0) / (emotions.length - half);
      signals.push(`感情の平均：前半${oldAvg.toFixed(1)} → 最近${newAvg.toFixed(1)}（1=穏やか〜10=しんどい）＝${trend}`);
    }
    if (walks.length) signals.push(`歩いた回数：先週${walkCountPrev7}回 → 今週${walkCount7}回`);
    if (quests.length) signals.push(`やってみたいこと：${quests.length}件、うち現実の一歩に落とした数：${taskTotal}、達成${doneQuests}件`);
    if (walks.length >= 2) signals.push(`歩いた記録が${walks.length}件たまってきている（＝続いている証拠）`);

    // AIに渡す素材（コンパクトに）
    const material = [
      `# ${who}のこの頃の記録（内部素材）`,
      signals.length ? `## 変化のサイン（ここを根拠に"進み"を語る）\n${signals.map((s) => `- ${s}`).join("\n")}` : "",
      walks.length ? `## 歩いた記録（新しい順・最大8件）\n${walks.map((w) => `- ${w.date}: ${w.summary.slice(0, 240)}`).join("\n")}` : "歩いた記録：まだなし",
      quests.length ? `## クエスト\n最近のテーマ：${quests.slice(0, 5).map((q) => q.title).join(" / ")}` : "クエスト：まだなし",
      reflections.length ? `## 振り返り（最新3件）\n${reflections.slice(0, 3).map((r) => `- ${r.body.slice(0, 160)}`).join("\n")}` : "",
    ].filter(Boolean).join("\n\n");

    const prompt = `あなたは ${settings?.secretary_name || "清瀬リンク"}。${who} の相棒。
下の記録を読んで、${who} に向けて「この頃、どんな変化が起きているか／何が進んでいるか」を返す。
これは "無理" の反証を積む装置。忘れがちな自分の前進を、証拠から拾って見せてあげる。

# ここが肝（必ず）
- 「変化のサイン」の数字を根拠に、"前はこうだったのが、今はこう変わってきてるね" と具体的に言う。
  （例：「前はしんどさ強めだったのが、最近は落ち着いてきてるね」「歩くのが続いてるね」）
- ふわっとした励ましで終わらせない。何が動いたか・進んだかを、1つは具体的に指させる。
- 歩いて掴んだこと・感情の動き・現実の一歩を、ゆるく一本につなぐ。

# ルール（厳守）
- 友達の距離。タメ口。絵文字は少し。あたたかく。
- 判定・決めつけはしない。「〜な傾向があるね」「〜な気がする」と余白を残す。
- できていないことは責めない。進みを拾う方向で。
- 最後に、そっと次の一歩を1つだけ（押し付けない）。
- 算命学・占い等の用語は出さない。
- 全体で5〜7行くらい。見出しや箇条書きは使わず、話しかけるように最後まで書ききる（途中で切らない）。

# ${who}の記録
${material}`;

    const report = await complete({ userId, prompt, maxTokens: 1600, temperature: 0.8 });

    return NextResponse.json({
      empty: false,
      report: String(report ?? "").trim(),
      glance: {
        walkCount7,
        emotionTrend: trend,
        quests: quests.length,
        doneQuests,
        taskTotal,
        recentEmotions: emotions.slice(0, 20).map((e) => e.level).reverse(),
        generatedAt: jstDateStr(),
      },
    });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/report", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
