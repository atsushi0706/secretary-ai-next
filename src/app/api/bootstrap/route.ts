/**
 * ページ初回表示時に1回だけ叩く。
 * 予定/タスク/分類/会話履歴 を一気に返す。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCalendarEvents, getTasks, computeSchedule, jstNow, jstDateStr } from "@/lib/google";
import { categorize, type Label, URGENCY, IMPORTANCE, TIME_KEYS, CATEGORY_KEYS, normalizeTime, windowOf } from "@/lib/gemini";
import { getClaudeForUser, CLAUDE_MODEL, extractJson } from "@/lib/claude";
import { getManualLabels, loadMessages, loadQuickmemo, getUserSettings, loadBriefing } from "@/lib/supabase";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const settings = await getUserSettings(userId);
  // Claude(共通) or 個人 Anthropic キーがあればOK。Google接続は必須。
  const hasAnthropic = !!(settings?.anthropic_api_key) || !!process.env.ANTHROPIC_API_KEY;
  const setupNeeded = !hasAnthropic || !settings?.google_refresh_token;
  if (setupNeeded) {
    return NextResponse.json({ setupNeeded: true, settings });
  }

  try {
    const url = new URL(req.url);
    const modeParam = url.searchParams.get("mode");
    const now = jstNow();
    const hour = now.getHours();
    const isMorning = modeParam ? modeParam === "morning" : hour < 15;
    const today = jstDateStr();
    const targetDay = isMorning ? today
      : jstDateStr(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const targetLabel = isMorning ? "今日" : "明日";
    const targetDate = new Date(targetDay + "T00:00:00+09:00");

    const [events, tasks, manualLabels, messages, quickmemo, eveningBriefing] = await Promise.all([
      getCalendarEvents(userId, 1),
      getTasks(userId, false),
      getManualLabels(userId),
      loadMessages(userId, today, isMorning ? "morning" : "evening"),
      loadQuickmemo(userId),
      // 朝モードのとき: 昨夜(yesterday の evening)で targetDay=今日 として保存された briefing を取りに行く
      isMorning ? loadBriefing(userId, today, "evening") : Promise.resolve(null),
    ]);

    // タスク分類: manual 優先、無ければ Claude に投げる
    // manual_labels テーブルのカラムは time_label だが、Label 型は time。明示マッピングする。
    const labels: Record<string, Label> = {};
    const toClassify: any[] = [];
    for (const t of tasks) {
      const ml = manualLabels[t.id];
      if (ml) {
        labels[t.id] = {
          category: (ml.category === "personal" ? "personal" : "work") as Label["category"],
          urgency: (ml.urgency === "high" ? "high" : "low") as Label["urgency"],
          importance: (ml.importance === "high" ? "high" : "low") as Label["importance"],
          time: normalizeTime(ml.time_label),
          reason: ml.reason ?? undefined,
          manual: true,
        };
      } else {
        toClassify.push(t);
      }
    }
    if (toClassify.length > 0) {
      try {
        const client = await getClaudeForUser(userId);
        const taskBlock = toClassify.map((t) =>
          `- id: ${t.id}\n  タイトル: ${t.title}\n  期限: ${t.due ?? "期限なし"}`
        ).join("\n");
        const prompt = `あなたは秘書。以下のタスクを分類してください。
カテゴリ category: work(仕事) / personal(趣味・自己投資)
緊急度 urgency: high / low
重要度 importance: high / low
所要時間 time: quick(すぐ終わる, 〜30分) / mid(30分〜1時間) / long(1〜3時間)

必ずJSONオブジェクトのみで返却(フェンス禁止):
{"タスクid":{"category":"...","urgency":"...","importance":"...","time":"...","reason":"30字以内"}}

タスク:
${taskBlock}`;
        const r = await client.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        });
        const raw = r.content
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text).join("\n");
        const data = extractJson<Record<string, any>>(raw);
        if (data) {
          for (const [tid, v] of Object.entries(data)) {
            if (typeof v !== "object" || !v) continue;
            labels[tid] = {
              category: (CATEGORY_KEYS as readonly string[]).includes(v.category) ? v.category : "work",
              urgency: (URGENCY as readonly string[]).includes(v.urgency) ? v.urgency : "low",
              importance: (IMPORTANCE as readonly string[]).includes(v.importance) ? v.importance : "low",
              time: (TIME_KEYS as readonly string[]).includes(v.time) ? v.time : "today",
              reason: String(v.reason ?? "").slice(0, 40),
            };
          }
        }
      } catch (e) {
        console.error("Claude classify failed:", e);
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
      // ユーザー個別のカスタマイズ設定
      secretaryName: (settings as any)?.secretary_name || "清瀬リンク",
      secretaryAvatarUrl: (settings as any)?.secretary_avatar_url || "/kiyose.png",
      userCallName: (settings as any)?.user_call_name || "",
      events,
      tasks: tasks.map((t) => {
        const lab = labels[t.id] ?? { category: "work" as const, urgency: "low" as const, importance: "low" as const, time: "mid" as const };
        return {
          ...t,
          label: lab,
          bucket: categorize(lab),       // 既存4軸: 色分けやデフォ追加先に使用
          window: windowOf(lab, t.due),  // 新3軸: タスクボードの主軸
        };
      }),
      schedule,
      messages,
      quickmemo,
      eveningBriefing, // 朝モード時、昨夜の時間割提案
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
