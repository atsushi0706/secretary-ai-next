/**
 * 初回挨拶 + 時間割提案を SSE で流す。
 * GET /api/greet?isMorning=true
 */
import { auth } from "@/auth";
import { buildSecretaryPersona } from "@/lib/claude";
import { streamChat } from "@/lib/ai";
import { saveMessage, saveBriefing, getUserSettings } from "@/lib/supabase";
import { getCalendarEvents, getTasks, computeSchedule, jstNow, jstDateStr, formatJstDateTime } from "@/lib/google";

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

        const [events, tasks] = await Promise.all([
          getCalendarEvents(userId, 1),
          getTasks(userId),
        ]);
        const targetDate = new Date(targetDay + "T00:00:00+09:00");
        const sched = computeSchedule(events, targetDate, 9, 17, isMorning ? now : undefined);

        const ctx = [
          `【現在時刻】${formatJstDateTime(now)} (JST)`,
          `対象: ${targetLabel}（稼働 9〜17時）`,
          `■固定の予定:\n${sched.busy_text}`,
          `空き時間（計${sched.free_minutes}分）:\n${sched.free_text}`,
        ];
        if (sched.after_hours_text) ctx.push("■夜の予定:\n" + sched.after_hours_text);
        ctx.push("未完了タスク:\n" + (tasks.map((t) => `- ${t.title}（期限:${t.due ?? "なし"}）`).join("\n") || "なし"));

        const userTrigger = isMorning
          ? "おはよう。今日の流れと、優先順位の高いタスクを時間割で組んで。固定予定は時刻つきで省略せず全部入れて。"
          : "お疲れさま。明日の流れを組んでくれる？固定予定は時刻つきで全部入れて、空き時間にタスクを差し込んで。";

        await saveMessage(userId, today, mode, "user", userTrigger);

        const settings = await getUserSettings(userId);
        const persona = buildSecretaryPersona({
          secretaryName: (settings as any)?.secretary_name,
          userCallName: (settings as any)?.user_call_name,
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
        send("error", { message: String(e?.message ?? e) });
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
