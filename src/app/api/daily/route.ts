/**
 * 1日の振り返り。
 * 「ここから始まり、今日ここにたどりついたね」——今日の状態の始まり→今と、
 * 今日話したこと・歩いたことをもとに、そっと一日を締める。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { complete } from "@/lib/ai";
import { listEmotions, loadShingaMessages, listWalkLogs, isMissingTable } from "@/lib/shinga";
import { getTodayQuest } from "@/lib/inner";
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
      loadShingaMessages(userId, 40, today).catch(() => []),   // ← 今日ぶんだけ読む（過去の日を混ぜない）
      listWalkLogs(userId, 5).catch(() => []),
    ]);

    const todayEmo = emotions.filter((e) => e.date === today).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const start = todayEmo[0] ?? null;
    const now = todayEmo[todayEmo.length - 1] ?? null;

    // 会話も「今日の日付」で厳密に絞る（時間軸を跨がせない）
    const todayMsgs = messages.filter((m) => m.role === "user" && m.date === today);
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

    const closing = await complete({ userId, prompt, maxTokens: 1400, temperature: 0.8 });

    // 「今日、きみは◯◯した」の1行カード（他人に語れる＝物語になる）。事実から作る。
    const quest = await getTodayQuest(userId).catch(() => null);
    const solved = quest?.items.find((it) => it.done)?.text;
    const oneLine = solved
      ? `今日、きみは「${solved}」をやり切った。`
      : walksToday.length
        ? "今日、きみは理想の未来を歩いた。"
        : todayMsgs.length
          ? "今日、きみは自分の内側と、ちゃんと向き合った。"
          : "今日、きみはこの世界に来た。それだけで、十分。";

    return NextResponse.json({
      empty: false,
      start: start ? { level: start.level } : null,
      now: now ? { level: now.level } : null,
      count: todayEmo.length,
      closing: String(closing ?? "").trim(),
      oneLine,
    });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/daily", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
