/**
 * 初回挨拶 + 時間割提案を SSE で流す。
 * GET /api/greet?isMorning=true
 */
import { auth } from "@/auth";
import { buildSecretaryPersona } from "@/lib/claude";
import { streamChat, AIRateLimitError, formatRateLimitForUser } from "@/lib/ai";
import { saveMessage, saveBriefing, getUserSettings, logError } from "@/lib/supabase";
import { getCalendarEvents, getTasks, computeSchedule, jstNow, jstDateStr, formatJstDateTime, jstDayOfWeekJa } from "@/lib/google";

function sse(name: string, data: any): Uint8Array {
  return new TextEncoder().encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }
  const url = new URL(req.url);
  const isMorning = (url.searchParams.get("isMorning") ?? "true") === "true";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (name: string, data: any) => controller.enqueue(sse(name, data));
      try {
        const now = jstNow();
        const today = jstDateStr();
        const targetDay = isMorning ? today : jstDateStr(new Date(Date.now() + 86400000));
        const targetLabel = isMorning ? "今日" : "明日";
        const mode = isMorning ? "morning" : "evening";

        const settings: any = await getUserSettings(userId).catch(() => null);
        const [events, tasks] = await Promise.all([
          getCalendarEvents(userId, 1),
          getTasks(userId),
        ]);
        const targetDate = new Date(targetDay + "T00:00:00+09:00");
        const sched = computeSchedule(
          events, targetDate, 9, 17, isMorning ? now : undefined,
          settings?.weekly_schedule,
        );

        const todayWeekday = jstDayOfWeekJa(now);
        const targetWeekday = jstDayOfWeekJa(targetDate);
        const stateBlock = sched.is_off_day
          ? `【今日の状態】お休みの日 (本業もタスクも休み)`
          : sched.is_flexible_day
            ? `【今日の状態】フレキシブル日 — この曜日に本業シフトは設定されていない。作業可能時間: ${sched.work_start_text}〜${sched.work_end_text} (AI が自由にタスクを詰める時間。本業ではない)`
            : `【今日の状態】本業シフトあり — 本業 (会社/メイン業務) ${sched.work_start_text}〜${sched.work_end_text} (拘束時間。AI からタスクを勝手に入れない)`;
        const ctx = [
          `【現在時刻】${formatJstDateTime(now)} (JST) (${todayWeekday})`,
          `対象: ${targetLabel} ${targetDay} (${targetWeekday})`,
          stateBlock,
          `[重要] 上の曜日は確定値。AI 自身で曜日を再計算するな。`,
          sched.is_flexible_day
            ? `[絶対NG] この日に本業シフトは無い。時間割に「本業」「会社」「メイン業務」のブロックを書くのは絶対禁止 (ユーザーが本業を設定してないため、書くと虚偽情報)。${sched.work_start_text}〜${sched.work_end_text} は AI の作業時間として普通に使う。`
            : sched.is_off_day
              ? `[重要] 今日はお休み。時間割は組まない。`
              : `[重要] シフト時間は本業(会社/メイン業務)の拘束時間。シフト中にタスクを入れる時は必ずユーザーに確認してから。`,
          `■固定の予定 (Google カレンダー):\n${sched.busy_text}`,
          sched.is_off_day
            ? `今日はお休みの日として設定されています。時間割を作らず、軽くゆっくりした挨拶だけしてください。`
            : sched.is_flexible_day
              ? `■空き時間 (計${sched.free_minutes}分 — 本業シフトなし、ここにタスクを詰めて OK):\n${sched.free_text}`
              : `■シフト時間内の空き (本業中の隙間、計${sched.free_minutes}分 — ここはタスクを勝手に入れない):\n${sched.free_text}`,
          sched.is_off_day
            ? ""
            : sched.is_flexible_day
              ? `[ヒント] この日は本業シフト設定なし。${sched.work_start_text}〜${sched.work_end_text} の範囲で普通に時間割を組む。固定予定の合間にタスクを詰める。`
              : `[ヒント] AI が新規にタスクを入れるべきは、シフトの「外」(${sched.work_start_text} より前 / ${sched.work_end_text} より後)。シフト中に入れたい時は必ずユーザーに確認。`,
        ].filter(Boolean);
        if (sched.after_hours_text) ctx.push("■夜の予定:\n" + sched.after_hours_text);
        ctx.push("未完了タスク:\n" + (tasks.map((t) => `- ${t.title}（期限:${t.due ?? "なし"}）`).join("\n") || "なし"));

        const userTrigger = sched.is_off_day
          ? (isMorning
            ? "おはよう。今日はお休みの日に設定してるので、ゆっくり休む方向で短く挨拶して。時間割は作らなくていい。"
            : "お疲れさま。明日はお休みの日なので、軽く挨拶だけで OK。時間割は不要。")
          : (isMorning
            ? "おはよう。今日の流れを時間割で組んで。本業シフトは時刻つきで本体に書いて。固定予定も省略禁止。タスクはシフト前後の時間に差し込む形で。1日のどこかに15分散歩も入れて提案して。"
            : "お疲れさま。明日の流れを組んでくれる？本業シフトは時刻つきで本体に書いて、固定予定も省略禁止。タスクはシフト前後の時間に差し込む形で。1日のどこかに15分散歩も提案して。");

        await saveMessage(userId, today, mode, "user", userTrigger);

        const persona = buildSecretaryPersona({
          secretaryName: settings?.secretary_name,
          userCallName: settings?.user_call_name,
        });

        let full = "";
        for await (const ev of streamChat({
          userId,
          system: persona + "\n\n# いまの状況\n" + ctx.join("\n\n"),
          messages: [{ role: "user", content: userTrigger }],
          maxTokens: 1800,
          temperature: 0.5,
          enableWebSearch: false,
        })) {
          if (ev.type === "delta") {
            full += ev.text;
            send("delta", { text: ev.text });
          }
        }
        await saveMessage(userId, today, mode, "assistant", full);

        // 時間割を含む応答なら briefing として targetDay に保存
        const timeMatches = full.match(/\d{1,2}:\d{2}\s*[-–〜~]\s*\d{1,2}:\d{2}/g);
        if (timeMatches && timeMatches.length >= 3) {
          try {
            await saveBriefing(userId, targetDay, mode, full);
          } catch (e) {
            console.error("saveBriefing failed:", e);
          }
        }

        send("done", {});
      } catch (e: any) {
        await logError(userId, "/api/greet", e);
        if (e instanceof AIRateLimitError) {
          const settings: any = await getUserSettings(userId).catch(() => null);
          const secretaryName = settings?.secretary_name || "清瀬リンク";
          const friendly = formatRateLimitForUser(e, secretaryName);
          send("delta", { text: friendly });
          send("done", {});
        } else {
          send("error", { message: String(e?.message ?? e) });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
