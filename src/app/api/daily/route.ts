/**
 * 1日の振り返り。
 *
 * GET  : 今日のチェックの経過（タイムライン）＋「どんな一日だったか」＋締めのひとこと
 * POST : { kind } → 今日がどんな一日だったかを記録（8種類・選び直し可）
 *
 * 大事な直し：
 * 「はじまり → いま」は、**今日2回以上チェックしたときだけ**返す。
 * 前は1回でも start=now で同じ値の矢印が出て、チェックしていないのに
 * 「落ち着いている→落ち着いている」のような嘘くさい表示になっていた。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { complete } from "@/lib/ai";
import { listEmotions, loadShingaMessages, listWalkLogs, isMissingTable } from "@/lib/shinga";
import { getUserSettings, logError } from "@/lib/supabase";
import { jstDateStr } from "@/lib/google";
import { markDay, listDayMarks, isDayKind, dayKind, DAY_KINDS } from "@/lib/day-marks";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const today = jstDateStr();
    const settings: any = await getUserSettings(userId).catch(() => null);
    const who = settings?.user_call_name || "きみ";

    const [emotions, messages, walks, marks] = await Promise.all([
      listEmotions(userId, 60).catch(() => []),
      loadShingaMessages(userId, 40, today).catch(() => []),   // ← 今日ぶんだけ読む（過去の日を混ぜない）
      listWalkLogs(userId, 5).catch(() => []),
      listDayMarks(userId, 8).catch(() => []),
    ]);

    const todayEmo = emotions.filter((e) => e.date === today).sort((a, b) => a.created_at.localeCompare(b.created_at));
    // ★ 2回以上チェックしたときだけ「はじまり→いま」が成立する。1回だけなら矢印は出さない。
    const start = todayEmo.length >= 2 ? todayEmo[0] : null;
    const now = todayEmo.length >= 2 ? todayEmo[todayEmo.length - 1] : null;

    // 今日のチェックの経過（何時に・どの状態で・何のあとか）
    const checks = todayEmo.map((e) => ({
      level: e.level,
      at: e.created_at,
      note: (e as any).note || "",
    }));

    const todayMark = marks.find((m) => m.date === today) ?? null;

    // 会話も「今日の日付」で厳密に絞る（時間軸を跨がせない）
    const todayMsgs = messages.filter((m) => m.role === "user" && m.date === today);
    const walksToday = walks.filter((w) => w.date === today);

    const hasData = todayEmo.length + todayMsgs.length + walksToday.length > 0 || !!todayMark;
    if (!hasData) {
      return NextResponse.json({
        empty: true, start: null, now: null, checks: [],
        dayKind: null, kinds: DAY_KINDS, marks: marks.slice(0, 7),
      });
    }

    const material = [
      start && now
        ? `状態：はじめ ${start.level} → いま ${now.level}（1=穏やか〜10=しんどい）。記録${todayEmo.length}回`
        : todayEmo.length === 1
        ? `状態の記録：今日は1回だけ（${todayEmo[0].level}）。変化はまだ分からない`
        : "状態の記録：なし",
      todayMark ? `本人が選んだ今日：「${dayKind(todayMark.kind).label}」（${dayKind(todayMark.kind).hint}）` : "",
      todayMsgs.length ? `今日話したこと（本人の言葉・最大10）：\n${todayMsgs.slice(-10).map((m) => `- ${m.content.slice(0, 120)}`).join("\n")}` : "",
      walksToday.length ? `今日のパラレルウォーク：\n${walksToday.map((w) => `- ${w.summary.slice(0, 160)}`).join("\n")}` : "",
    ].filter(Boolean).join("\n\n");

    const prompt = `あなたは ${settings?.secretary_name || "清瀬リンク"}。${who} の相棒。
今日の記録を読んで、一日を締めるひとことを返す。

# ルール
- 友達の距離。タメ口。あたたかく。絵文字は少し。
- 「ここから始まって、今日ここにたどりついたね」という、一日の流れを受け取る形で。
- 本人が「今日はどんな一日だったか」を選んでいたら、その言葉を必ず受け取る（言い換えて否定しない）。
- 判定・決めつけをしない。うまくいかない日でも、そのまま受け取る（許しの方向）。
- 記録に無いことを言わない。状態の記録が無い/1回だけなら、変化には触れない。
- 今日の会話や歩きから、印象に残ったことに1つだけ触れる。
- 4〜6行。話しかけるように。用語（算命学など）は出さない。

# 今日の記録
${material}`;

    const closing = await complete({ userId, prompt, maxTokens: 1400, temperature: 0.8 });

    return NextResponse.json({
      empty: false,
      start: start ? { level: start.level } : null,
      now: now ? { level: now.level } : null,
      count: todayEmo.length,
      checks,
      dayKind: todayMark?.kind ?? null,
      kinds: DAY_KINDS,
      marks: marks.slice(0, 7),
      closing: String(closing ?? "").trim(),
    });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/daily", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

/** 今日がどんな一日だったかを置く（8種類・上書きで選び直せる） */
export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json().catch(() => ({}));
    if (!isDayKind(b.kind)) return NextResponse.json({ error: "8種類から選んでね" }, { status: 400 });
    await markDay(userId, b.kind);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ error: "保存先（day_marks）がまだ作られていません", needsMigration: true }, { status: 503 });
    await logError(userId, "/api/daily", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
