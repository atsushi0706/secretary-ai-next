/**
 * 1日の振り返り。
 * 「ここから始まり、今日ここにたどりついたね」——今日の状態の始まり→今と、
 * 今日話したこと・歩いたことをもとに、そっと一日を締める。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { complete } from "@/lib/ai";
import { listEmotions, loadShingaMessages, listWalkLogs, isMissingTable } from "@/lib/shinga";
import { getUserSettings, logError } from "@/lib/supabase";
import { jstDateStr } from "@/lib/google";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const today = jstDateStr();
    const settings: any = await getUserSettings(userId).catch(() => null);
    const who = settings?.user_call_name || "きみ";

    const [emotions, messages, walks] = await Promise.all([
      listEmotions(userId, 60).catch(() => []),
      loadShingaMessages(userId, 40).catch(() => []),
      listWalkLogs(userId, 5).catch(() => []),
    ]);

    const todayEmo = emotions.filter((e) => e.date === today).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const start = todayEmo[0] ?? null;
    const now = todayEmo[todayEmo.length - 1] ?? null;

    const todayMsgs = messages.filter((m) => m.role === "user"); // 直近の会話（大まかに今日ぶん）
    const walksToday = walks.filter((w) => w.date === today);

    const hasData = todayEmo.length + todayMsgs.length + walksToday.length > 0;
    if (!hasData) return NextResponse.json({ empty: true, start: null, now: null });

    const material = [
      start && now ? `状態：はじめ ${start.level} → いま ${now.level}（1=穏やか〜10=しんどい）。記録${todayEmo.length}回` : "状態の記録：なし",
      todayMsgs.length ? `今日話したこと（本人の言葉・最大10）：\n${todayMsgs.slice(-10).map((m) => `- ${m.content.slice(0, 120)}`).join("\n")}` : "",
      walksToday.length ? `今日のパラレルウォーク：\n${walksToday.map((w) => `- ${w.summary.slice(0, 160)}`).join("\n")}` : "",
    ].filter(Boolean).join("\n\n");

    const prompt = `あなたは ${settings?.secretary_name || "清瀬リンク"}。${who} の相棒。
今日の記録を読んで、一日を締めるひとことを返す。

# ルール
- 友達の距離。タメ口。あたたかく。絵文字は少し。
- 「ここから始まって、今日ここにたどりついたね」という、一日の流れを受け取る形で。
- 判定・決めつけをしない。うまくいかない日でも、そのまま受け取る（許しの方向）。
- 今日の会話や歩きから、印象に残ったことに1つだけ触れる。
- 4〜6行。話しかけるように。用語（算命学など）は出さない。

# 今日の記録
${material}`;

    const closing = await complete({ userId, prompt, maxTokens: 600, temperature: 0.8 });

    return NextResponse.json({
      empty: false,
      start: start ? { level: start.level } : null,
      now: now ? { level: now.level } : null,
      count: todayEmo.length,
      closing: String(closing ?? "").trim(),
    });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/daily", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
