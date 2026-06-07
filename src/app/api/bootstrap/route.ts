/**
 * ページ初回表示時に1回だけ叩く。
 * 予定/タスク/分類/会話履歴 を一気に返す。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCalendarEvents, getTasks, computeSchedule, jstNow, jstDateStr } from "@/lib/google";
import { categorize, getGemini, extractJson, type Label, URGENCY, IMPORTANCE, TIME_KEYS, CATEGORY_KEYS } from "@/lib/gemini";
import { getManualLabels, loadMessages, loadQuickmemo, getUserSettings } from "@/lib/supabase";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const settings = await getUserSettings(userId);
  const setupNeeded = !settings?.gemini_api_key || !settings?.google_refresh_token;
  if (setupNeeded) {
    return NextResponse.json({ setupNeeded: true, settings });
  }

  try {
    const url = new URL(req.url);
    const modeParam = url.searchParams.get("mode");
    const now = jstNow();
    const hour = now.getHours();
    const isMorning = modeParam ? modeParam === "morning"
      : hour < 15;
    const today = jstDateStr();
    const targetDay = isMorning ? today
      : jstDateStr(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const targetLabel = isMorning ? "今日" : "明日";
    const targetDate = new Date(targetDay + "T00:00:00+09:00");

    const [events, tasks, manualLabels, messages, quickmemo] = await Promise.all([
      getCalendarEvents(userId, 1),
      getTasks(userId, false),
      getManualLabels(userId),
      loadMessages(userId, today, isMorning ? "morning" : "evening"),
      loadQuickmemo(userId),
    ]);

    // タスク分類: manual 優先、無ければ Gemini に投げる
    const labels: Record<string, Label> = {};
    const toClassify: any[] = [];
    for (const t of tasks) {
      if (manualLabels[t.id]) {
        labels[t.id] = manualLabels[t.id] as Label;
      } else {
        toClassify.push(t);
      }
    }
    if (toClassify.length > 0) {
      try {
        const gem = await getGemini(userId, "gemini-2.5-flash");
        const taskBlock = toClassify.map((t) =>
          `- id: ${t.id}\n  タイトル: ${t.title}\n  期限: ${t.due ?? "期限なし"}`
        ).join("\n");
        const prompt = `あなたは秘書。以下のタスクを分類してください。
カテゴリ category: work(仕事) / personal(趣味・自己投資)
緊急度 urgency: high / low
重要度 importance: high / low
所要時間 time: quick(5-30分) / today(半日〜1日) / days(1〜3日)

必ずJSONオブジェクトのみで返却(フェンス禁止):
{"タスクid":{"category":"...","urgency":"...","importance":"...","time":"...","reason":"30字以内"}}

タスク:
${taskBlock}`;
        const r = await gem.generateContent(prompt);
        const data = extractJson<Record<string, any>>(r.response.text());
        if (data) {
          for (const [tid, v] of Object.entries(data)) {
            if (typeof v !== "object" || !v) continue;
            labels[tid] = {
              category: CATEGORY_KEYS.includes(v.category) ? v.category : "work",
              urgency: URGENCY.includes(v.urgency) ? v.urgency : "low",
              importance: IMPORTANCE.includes(v.importance) ? v.importance : "low",
              time: TIME_KEYS.includes(v.time) ? v.time : "today",
              reason: String(v.reason ?? "").slice(0, 40),
            };
          }
        }
      } catch (e) {
        console.error("Gemini classify failed:", e);
      }
    }

    const schedule = computeSchedule(events, targetDate, 9, 17, isMorning ? now : undefined);

    return NextResponse.json({
      setupNeeded: false,
      now: now.toISOString(),
      today,
      targetDay,
      targetLabel,
      isMorning,
      events,
      tasks: tasks.map((t) => ({
        ...t,
        label: labels[t.id] ?? { category: "work", urgency: "low", importance: "low", time: "today" },
        bucket: categorize(labels[t.id]),
      })),
      schedule,
      messages,
      quickmemo,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
