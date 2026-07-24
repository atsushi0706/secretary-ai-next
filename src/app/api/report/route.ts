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
    const doneQuests = quests.filter((q) => q.status === "done").length;
    const taskTotal = Object.values(taskCounts).reduce((a: number, b: number) => a + b, 0);

    // AIに渡す素材（コンパクトに）
    const material = [
      `# ${who}のこの頃の記録（内部素材）`,
      walks.length ? `## 歩いた記録（新しい順・最大8件）\n${walks.map((w) => `- ${w.date}: ${w.summary.slice(0, 240)}`).join("\n")}` : "歩いた記録：まだなし",
      emotions.length ? `## 状態の記録\n直近${emotions.length}件。傾向：${trend || "データ少なめ"}。（1=穏やか〜10=しんどい）` : "状態の記録：まだなし",
      quests.length ? `## クエスト\n合計${quests.length}件（うち達成${doneQuests}件）。現実の一歩に変えた数：${taskTotal}。最近のテーマ：${quests.slice(0, 5).map((q) => q.title).join(" / ")}` : "クエスト：まだなし",
      reflections.length ? `## 振り返り（最新3件）\n${reflections.slice(0, 3).map((r) => `- ${r.body.slice(0, 160)}`).join("\n")}` : "",
      `## 今週：歩いた回数 ${walkCount7} 回`,
    ].filter(Boolean).join("\n\n");

    const prompt = `あなたは ${settings?.secretary_name || "清瀬リンク"}。${who} の相棒。
下の記録を読んで、${who} に向けて「この頃のふりかえり」を短く返す。

# ルール（厳守）
- 友達の距離。タメ口。絵文字は少し。あたたかく。
- 判定・決めつけをしない。「〜な傾向があるね」「〜な気がする」と余白を残す。
- できていないことを責めない。むしろ「ここ、変わってきてるね」を証拠から拾って返す（無理の反証）。
- 歩いて掴んだこと・感情の動き・現実の一歩を、ゆるく一本につなぐ。
- 最後に、そっと次の一歩を1つだけ（押し付けない）。
- 算命学・占い等の用語は出さない。
- 全体で5〜7行くらい。見出しや箇条書きは使わず、話しかけるように。

# ${who}の記録
${material}`;

    const report = await complete({ userId, prompt, maxTokens: 700, temperature: 0.8 });

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
