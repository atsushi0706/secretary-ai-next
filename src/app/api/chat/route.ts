import { auth } from "@/auth";
import { getClaudeForUser, CLAUDE_MODEL, SECRETARY_PERSONA, extractJson } from "@/lib/claude";
import {
  saveMessage, loadMessages, setManualLabel, saveBriefing,
} from "@/lib/supabase";
import { getCalendarEvents, getTasks, computeSchedule, jstNow, jstDateStr, addTask } from "@/lib/google";

const ADD_INTENT_KEYWORDS = [
  "入れといて", "入れておいて", "入れとい", "追加しといて", "追加しておいて",
  "追加しとい", "タスクに入れて", "タスクに追加", "todoに", "ToDoに",
  "やることに入れて", "リストに入れて", "リストに追加",
  "登録しといて", "登録しておいて",
];

function sseEvent(name: string, data: any): Uint8Array {
  const payload = `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const text: string = (body.text ?? "").trim();
  const isMorning: boolean = body.isMorning ?? true;
  if (!text) {
    return new Response(JSON.stringify({ error: "empty" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (name: string, data: any) => controller.enqueue(sseEvent(name, data));
      try {
        const now = jstNow();
        const today = jstDateStr();
        const targetDay = isMorning ? today : jstDateStr(new Date(Date.now() + 86400000));
        const targetLabel = isMorning ? "今日" : "明日";
        const mode = isMorning ? "morning" : "evening";

        await saveMessage(userId, today, mode, "user", text);

        const client = await getClaudeForUser(userId);

        // 「入れといて」自動検出 → タスク追加
        const intentAdd = ADD_INTENT_KEYWORDS.some((k) => text.includes(k));
        const addedTitles: string[] = [];

        if (intentAdd) {
          try {
            const tasks = await getTasks(userId);
            const existingTitles = tasks.map((t) => t.title);
            const allMsgs = await loadMessages(userId, today, mode);
            const userLines = allMsgs.filter((m) => m.role === "user")
              .map((m) => `- ${m.content.slice(0, 400)}`).join("\n") || `- ${text}`;

            const exPrompt = `あなたは秘書。${targetLabel}(${targetDay})に着手すべきタスクを抽出。

【絶対ルール】
- 会話で本人が新規に追加したいと言ったものだけ
- 既存タスクの再掲禁止（意味が近いものも禁止）
- 該当なしなら []

【既存タスク（再掲禁止）】
${existingTitles.map((t) => "- " + t).join("\n") || "(なし)"}

【会話】
${userLines}

JSONのみ:
[{"title":"30字","notes":"出所","category":"work|personal","urgency":"high|low","importance":"high|low","time":"quick|mid|long","due":"${targetDay}|"}]
※ time の意味: quick=すぐ終わる(〜30分) / mid=30分〜1時間 / long=1〜3時間`;

            const r = await client.messages.create({
              model: CLAUDE_MODEL,
              max_tokens: 1024,
              messages: [{ role: "user", content: exPrompt }],
            });
            const raw = r.content
              .filter((b: any) => b.type === "text")
              .map((b: any) => b.text).join("\n");
            const cands = extractJson<any[]>(raw) ?? [];
            const existingLower = new Set(existingTitles.map((t) => t.toLowerCase().trim()));
            for (const c of cands) {
              const title = String(c.title ?? "").trim();
              if (!title || existingLower.has(title.toLowerCase())) continue;
              try {
                const created = await addTask(userId, title, {
                  notes: c.notes ?? "",
                  due: c.due || null,
                });
                if (created.id) {
                  await setManualLabel(userId, created.id, {
                    category: ["work", "personal"].includes(c.category) ? c.category : "work",
                    urgency: ["high", "low"].includes(c.urgency) ? c.urgency : "low",
                    importance: ["high", "low"].includes(c.importance) ? c.importance : "high",
                    time_label: ["quick", "mid", "long"].includes(c.time) ? c.time : "mid",
                    reason: "自動追加",
                  });
                  addedTitles.push(title);
                }
              } catch (e) {
                console.error("addTask failed:", e);
              }
            }
          } catch (e) {
            console.error("auto-add failed:", e);
          }
          if (addedTitles.length > 0) {
            send("added", { titles: addedTitles });
          }
        }

        // 会話コンテキストを組み立て
        const [events, tasks] = await Promise.all([
          getCalendarEvents(userId, 1),
          getTasks(userId),
        ]);
        const targetDate = new Date(targetDay + "T00:00:00+09:00");
        const sched = computeSchedule(events, targetDate, 9, 17, isMorning ? now : undefined);
        const ctxLines = [
          `【現在時刻】${now.toISOString().slice(0, 16).replace("T", " ")}`,
          `日付の対象: ${targetLabel}（稼働は9〜17時）`,
          `■固定の予定:\n${sched.busy_text}`,
          `空き時間（計${sched.free_minutes}分）:\n${sched.free_text}`,
        ];
        if (sched.after_hours_text) {
          ctxLines.push("■夜の予定（参考）:\n" + sched.after_hours_text);
        }
        const taskLines = tasks.map((t) => `- ${t.title}（期限:${t.due ?? "なし"}）`).join("\n");
        ctxLines.push("未完了タスク:\n" + (taskLines || "なし"));

        if (addedTitles.length > 0) {
          ctxLines.push(
            `[システム注記] 以下のタスクをGoogleタスクに自動追加済み: ${addedTitles.map((t) => `「${t}」`).join(" / ")}。返答ではこの追加を自然に確認だけ伝えて。`
          );
        }

        const allMessages = await loadMessages(userId, today, mode);
        // 最新が今追加した user メッセージ → 30件取って Claude 形式へ
        const history = allMessages.slice(-30).map((m) => ({
          role: m.role === "assistant" ? "assistant" as const : "user" as const,
          content: m.content,
        }));
        // 末尾が user で終わるよう正規化
        if (history.length === 0 || history[history.length - 1].role !== "user") {
          history.push({ role: "user", content: text });
        }

        const systemText = SECRETARY_PERSONA + "\n\n# いまの状況\n" + ctxLines.join("\n\n");

        // Claude streaming + web_search
        let fullReply = "";
        const sdkStream = client.messages.stream({
          model: CLAUDE_MODEL,
          max_tokens: 2048,
          temperature: 0.6,
          system: systemText,
          messages: history,
          tools: [
            { type: "web_search_20250305", name: "web_search", max_uses: 3 } as any,
          ],
        });

        for await (const event of sdkStream) {
          if (event.type === "content_block_delta") {
            const delta: any = event.delta;
            if (delta.type === "text_delta" && delta.text) {
              fullReply += delta.text;
              send("delta", { text: delta.text });
            }
          } else if (event.type === "content_block_start") {
            const cb: any = event.content_block;
            if (cb?.type === "server_tool_use" && cb?.name === "web_search") {
              send("tool", { name: "web_search" });
            }
          }
        }

        // AIの応答内に <tasks_to_add>...</tasks_to_add> タグがあれば、実体化する
        const tagMatch = fullReply.match(/<tasks_to_add>([\s\S]*?)<\/tasks_to_add>/);
        if (tagMatch) {
          try {
            // 既存タスク一覧（再追加避け）
            const existingTasks = await getTasks(userId);
            const existingLower = new Set(
              existingTasks.map((t: any) => String(t.title || "").toLowerCase().trim()),
            );
            const cands = extractJson<any[]>(tagMatch[1]) ?? [];
            for (const c of Array.isArray(cands) ? cands : []) {
              const title = String(c.title ?? "").trim();
              if (!title) continue;
              if (existingLower.has(title.toLowerCase())) continue;
              try {
                const created = await addTask(userId, title, {
                  notes: c.notes ?? "",
                  due: c.due || null,
                });
                if (created.id) {
                  await setManualLabel(userId, created.id, {
                    category: ["work", "personal"].includes(c.category) ? c.category : "work",
                    urgency: ["high", "low"].includes(c.urgency) ? c.urgency : "low",
                    importance: ["high", "low"].includes(c.importance) ? c.importance : "high",
                    time_label: ["quick", "mid", "long"].includes(c.time) ? c.time : "mid",
                    reason: "AI判定で追加",
                  });
                  addedTitles.push(title);
                }
              } catch (e) {
                console.error("tag addTask failed:", e);
              }
            }
            if (addedTitles.length > 0) {
              send("added", { titles: addedTitles });
            }
          } catch (e) {
            console.error("parse tasks_to_add failed:", e);
          }
        }

        // タグはユーザー画面に残さない・保存もタグを除いた版で
        const cleanReply = fullReply.replace(/<tasks_to_add>[\s\S]*?<\/tasks_to_add>/g, "").trim();
        await saveMessage(userId, today, mode, "assistant", cleanReply);

        // タグを除いた本文をフロントにも通知（タイピング中に一瞬見えたタグを差し替える）
        if (tagMatch) {
          send("replace", { text: cleanReply });
        }

        // 時間割っぽい応答(時刻範囲が3個以上)なら briefing として保存
        const timeMatches = cleanReply.match(/\d{1,2}:\d{2}\s*[-–〜~]\s*\d{1,2}:\d{2}/g);
        if (timeMatches && timeMatches.length >= 3) {
          try {
            await saveBriefing(userId, targetDay, mode, cleanReply);
          } catch (e) {
            console.error("saveBriefing failed:", e);
          }
        }

        send("done", { addedTitles });
      } catch (e: any) {
        console.error("chat stream error:", e);
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
