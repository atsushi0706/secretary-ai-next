import { auth } from "@/auth";
import { buildSecretaryPersona, extractJson } from "@/lib/claude";
import { streamChat, complete, AIRateLimitError, formatRateLimitForUser } from "@/lib/ai";
import { getUserSettings } from "@/lib/supabase";
import {
  saveMessage, loadMessages, setManualLabel, saveBriefing, getManualLabels, logError,
} from "@/lib/supabase";
import { getCalendarEvents, getTasks, computeSchedule, jstNow, jstDateStr, formatJstDateTime, addTask, addCalendarEvent, completeTask, deleteTask, jstDayOfWeekJa, deleteCalendarEventsByCriteria } from "@/lib/google";
import { clearManualLabel } from "@/lib/supabase";

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

// 重複判定用にタイトルを正規化（空白・記号・カッコを落として比較。言い換えの重複を防ぐ）
function normTitle(s: string): string {
  return String(s ?? "").toLowerCase().replace(/[\s　「」『』（）()【】〔〕、,.。･・\-—_/｜|]/g, "").trim();
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

            const exPrompt = `あなたは秘書。会話から、新しく追加すべきタスクを抽出する。今日は ${today}。

【絶対ルール】
- 会話で本人が新規に追加したいと言ったものだけ
- 既存タスクの再掲禁止（意味が近いものも禁止）
- 該当なしなら []

【期日(due)の決め方 — 最重要】
- 本人が「◯月◯日」「◯日まで」「来週火曜」「今週中」など期日を言ったら、それを必ず due(YYYY-MM-DD)にする。
  例: 今日が ${today} で「8月16日に」→ due は今年以降で最も近い "YYYY-08-16"。年をまたぐなら翌年。
- 期日を言っていないものだけ due を "${targetDay}"（＝${targetLabel}）にする。
- 【禁止】期日を notes に書くな。「8月16日にやる」等は書かず、必ず due に入れる。notes は出所メモだけ。

【既存タスク（再掲禁止）】
${existingTitles.map((t) => "- " + t).join("\n") || "(なし)"}

【会話】
${userLines}

JSONのみ:
[{"title":"30字","notes":"出所メモ(日付は書かない)","category":"work|personal","urgency":"high|low","importance":"high|low","time":"quick|mid|long|halfday|fullday|multiday","due":"YYYY-MM-DD"}]
※ time: quick=〜30分 / mid=30分〜1時間 / long=1〜3時間 / halfday=半日(3〜5h) / fullday=1日 / multiday=数日`;

            const raw = await complete({
              userId,
              prompt: exPrompt,
              maxTokens: 1024,
              temperature: 0.3,
            });
            const cands = extractJson<any[]>(raw) ?? [];
            const existingSet = new Set(existingTitles.map(normTitle));
            for (const c of cands) {
              const title = String(c.title ?? "").trim();
              const key = normTitle(title);
              if (!title || existingSet.has(key)) continue;
              existingSet.add(key); // 同一リクエスト内の重複も防ぐ
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
                    time_label: ["quick", "mid", "long", "halfday", "fullday", "multiday"].includes(c.time) ? c.time : "mid",
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
        const [events, tasks, manualLabels, settingsForCtx] = await Promise.all([
          getCalendarEvents(userId, 1),
          getTasks(userId),
          getManualLabels(userId),
          getUserSettings(userId).catch(() => null) as Promise<any>,
        ]);
        const targetDate = new Date(targetDay + "T00:00:00+09:00");
        const sched = computeSchedule(
          events, targetDate, 9, 17, isMorning ? now : undefined,
          settingsForCtx?.weekly_schedule,
        );
        const todayWeekday = jstDayOfWeekJa(now);
        const targetWeekday = jstDayOfWeekJa(targetDate);
        const stateBlock = sched.is_off_day
          ? `【今日の状態】お休みの日 (本業もタスクも休み)`
          : sched.is_flexible_day
            ? `【今日の状態】フレキシブル日 — この曜日に本業シフトは設定されていない。作業可能時間: ${sched.work_start_text}〜${sched.work_end_text} (AI が自由にタスクを詰める時間。本業ではない)`
            : `【今日の状態】本業シフトあり — 本業 (会社/メイン業務) ${sched.work_start_text}〜${sched.work_end_text} (拘束時間。AI からタスクを勝手に入れない)`;
        const ctxLines = [
          `【現在時刻】${formatJstDateTime(now)} (JST) (${todayWeekday})`,
          `日付の対象: ${targetLabel} ${targetDay} (${targetWeekday})`,
          stateBlock,
          `[重要] 上の曜日は確定値。AI 自身で曜日を再計算するな。`,
          sched.is_flexible_day
            ? `[絶対NG] この日に本業シフトは無い。時間割に「本業」「会社」「メイン業務」のブロックを書くのは絶対禁止 (ユーザーが本業を設定してないため、書くと虚偽情報)。${sched.work_start_text}〜${sched.work_end_text} は AI の作業時間として普通に使う。`
            : sched.is_off_day
              ? `[重要] 今日はお休み。時間割は組まない。`
              : `[重要] シフト時間は本業(会社/メイン業務)の拘束時間。シフト中にタスクを入れる時は必ずユーザーに確認してから。`,
          `■固定の予定 (Google カレンダー):\n${sched.busy_text}`,
          sched.is_off_day
            ? `今日はお休みの日として設定されているため、時間割は組まなくて OK。`
            : sched.is_flexible_day
              ? `■空き時間 (計${sched.free_minutes}分 — 本業シフトなし、ここにタスクを詰めて OK):\n${sched.free_text}`
              : `■シフト時間内の空き (本業中の隙間、計${sched.free_minutes}分 — ここはタスクを勝手に入れない):\n${sched.free_text}`,
          sched.is_off_day
            ? ""
            : sched.is_flexible_day
              ? `[ヒント] この日は本業シフト設定なし。${sched.work_start_text}〜${sched.work_end_text} の範囲で普通に時間割を組む。固定予定の合間にタスクを詰める。`
              : `[ヒント] AI が新規にタスクを入れるべきは、シフトの「外」(${sched.work_start_text} より前 / ${sched.work_end_text} より後)。シフト中に入れたい時は必ずユーザーに確認。`,
        ].filter(Boolean);
        if (sched.after_hours_text) {
          ctxLines.push("■夜の予定（参考）:\n" + sched.after_hours_text);
        }
        // 既存タスクには time_label / urgency / importance も含めて、AI が再質問しないように
        const timeLabelMap: Record<string, string> = {
          quick: "すぐ", mid: "30分〜1時間", long: "1〜3時間", halfday: "半日", fullday: "1日", multiday: "数日", today: "30分〜1時間", days: "1〜3時間",
        };
        const taskLines = tasks.map((t: any) => {
          const lb = manualLabels[t.id];
          const tk = lb?.time_label;
          const u = lb?.urgency;
          const im = lb?.importance;
          const meta: string[] = [];
          if (tk && timeLabelMap[tk]) meta.push(`所要:${timeLabelMap[tk]}`);
          if (t.due) meta.push(`期限:${t.due.slice(0, 10)}`);
          if (u === "high") meta.push("緊急");
          if (im === "high") meta.push("重要");
          const metaStr = meta.length > 0 ? `（${meta.join(", ")}）` : "（情報不足）";
          return `- ${t.title}${metaStr}`;
        }).join("\n");
        ctxLines.push("未完了タスク:\n" + (taskLines || "なし"));
        ctxLines.push(
          "[注記] 上の未完了タスクには既に所要時間・期限・緊急度・重要度が記載されている。" +
          "これらの値が分かっているタスクについて、淳くんに『どれくらいかかる？』『いつまで？』を" +
          "再質問するのは禁止。情報不足タスクのみ聞く。"
        );

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

        const settings = await getUserSettings(userId);
        const persona = buildSecretaryPersona({
          secretaryName: (settings as any)?.secretary_name,
          userCallName: (settings as any)?.user_call_name,
        });
        const systemText = persona + "\n\n# いまの状況\n" + ctxLines.join("\n\n");

        // AI streaming (Gemini or Claude を自動選択) + web_search (Claude時のみ)
        let fullReply = "";
        for await (const ev of streamChat({
          userId,
          system: systemText,
          messages: history,
          maxTokens: 2048,
          temperature: 0.6,
          enableWebSearch: true,
        })) {
          if (ev.type === "delta") {
            fullReply += ev.text;
            send("delta", { text: ev.text });
          } else if (ev.type === "tool_start") {
            send("tool", { name: ev.name });
          }
        }

        // AIの応答内に <tasks_to_add>...</tasks_to_add> タグがあれば、実体化する
        const tagMatch = fullReply.match(/<tasks_to_add>([\s\S]*?)<\/tasks_to_add>/);
        if (tagMatch) {
          try {
            // 既存タスク一覧（再追加避け）
            const existingTasks = await getTasks(userId);
            const existingSet = new Set(existingTasks.map((t: any) => normTitle(t.title)));
            // このリクエストで既に追加したものも重複させない
            for (const t of addedTitles) existingSet.add(normTitle(t));
            const cands = extractJson<any[]>(tagMatch[1]) ?? [];
            for (const c of Array.isArray(cands) ? cands : []) {
              const title = String(c.title ?? "").trim();
              const key = normTitle(title);
              if (!title || existingSet.has(key)) continue;
              existingSet.add(key);
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
                    time_label: ["quick", "mid", "long", "halfday", "fullday", "multiday"].includes(c.time) ? c.time : "mid",
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

        // AIの応答内に <tasks_to_remove>...</tasks_to_remove> タグがあれば削除/完了
        const removeTagMatch = fullReply.match(/<tasks_to_remove>([\s\S]*?)<\/tasks_to_remove>/);
        const removedTitles: string[] = [];
        if (removeTagMatch) {
          try {
            const existingTasks = await getTasks(userId);
            const removes = extractJson<any[]>(removeTagMatch[1]) ?? [];
            for (const r of Array.isArray(removes) ? removes : []) {
              const titleMatch = String(r.title_match ?? "").trim().toLowerCase();
              const action = (r.action === "complete") ? "complete" : "delete";
              if (!titleMatch) continue;
              // 部分一致で対象を特定
              const target = existingTasks.find((t: any) =>
                String(t.title || "").toLowerCase().includes(titleMatch)
              );
              if (!target) {
                console.warn("remove target not found:", titleMatch);
                continue;
              }
              try {
                if (action === "delete") {
                  await deleteTask(userId, target.tasklist_id, target.id);
                  await clearManualLabel(userId, target.id);
                } else {
                  await completeTask(userId, target.tasklist_id, target.id);
                }
                removedTitles.push(target.title);
              } catch (e) {
                console.error("remove task failed:", e);
              }
            }
            if (removedTitles.length > 0) {
              send("removed", { titles: removedTitles });
            }
          } catch (e) {
            console.error("parse tasks_to_remove failed:", e);
          }
        }

        // AIの応答内に <calendar_events_to_remove>...</calendar_events_to_remove> タグがあれば、予定を削除
        const calRemoveTagMatch = fullReply.match(/<calendar_events_to_remove>([\s\S]*?)<\/calendar_events_to_remove>/);
        const removedEvents: string[] = [];
        if (calRemoveTagMatch) {
          try {
            const arr = extractJson<any[]>(calRemoveTagMatch[1]);
            if (Array.isArray(arr)) {
              for (const item of arr) {
                const dateJST = String(item?.date ?? "").trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dateJST)) continue;
                const titleMatch = item?.title_match ? String(item.title_match).trim() : undefined;
                const startHHMM = item?.start ? String(item.start).trim() : undefined;
                const deleteAll = item?.delete_all === true;
                try {
                  const titles = await deleteCalendarEventsByCriteria(userId, {
                    dateJST,
                    titleMatch,
                    startHHMM,
                    deleteAll,
                  });
                  removedEvents.push(...titles.map((t) => `${dateJST} ${t}`));
                } catch (err: any) {
                  console.error("deleteCalendarEventsByCriteria failed:", err);
                }
              }
            }
          } catch (e) {
            console.error("parse calendar_events_to_remove failed:", e);
          }
        }

        // AIの応答内に <calendar_events>...</calendar_events> タグがあれば、予定を実体化する
        const eventTagMatch = fullReply.match(/<calendar_events>([\s\S]*?)<\/calendar_events>/);
        const addedEvents: string[] = [];
        if (eventTagMatch) {
          try {
            const evs = extractJson<any[]>(eventTagMatch[1]) ?? [];
            for (const e of Array.isArray(evs) ? evs : []) {
              const title = String(e.title ?? "").trim();
              const date = String(e.date ?? "").trim();
              const start = String(e.start ?? "").trim();
              const end = String(e.end ?? "").trim();
              if (!title || !date || !start) continue;
              const endTime = end || (() => {
                const [h, m] = start.split(":").map(Number);
                const t = h * 60 + (m || 0) + 30;
                return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
              })();
              try {
                await addCalendarEvent(userId, {
                  title,
                  startISO: `${date}T${start}:00+09:00`,
                  endISO: `${date}T${endTime}:00+09:00`,
                  description: e.description || undefined,
                });
                addedEvents.push(`${date} ${start}〜${endTime} ${title}`);
              } catch (err: any) {
                console.error("addCalendarEvent failed:", err);
                send("error", { message: `カレンダー登録失敗: ${err?.message ?? err}。ログアウト→再ログインで calendar 書き込みを許可してください。` });
              }
            }
            if (addedEvents.length > 0) {
              send("calendar_added", { events: addedEvents });
            }
          } catch (e) {
            console.error("parse calendar_events failed:", e);
          }
        }

        // タグはユーザー画面に残さない・保存もタグを除いた版で
        const cleanReply = fullReply
          .replace(/<tasks_to_add>[\s\S]*?<\/tasks_to_add>/g, "")
          .replace(/<tasks_to_remove>[\s\S]*?<\/tasks_to_remove>/g, "")
          .replace(/<calendar_events>[\s\S]*?<\/calendar_events>/g, "")
          .replace(/<calendar_events_to_remove>[\s\S]*?<\/calendar_events_to_remove>/g, "")
          .trim();
        await saveMessage(userId, today, mode, "assistant", cleanReply);

        // タグを除いた本文をフロントにも通知（タイピング中に一瞬見えたタグを差し替える）
        if (tagMatch || eventTagMatch || removeTagMatch) {
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

        send("done", { addedTitles, addedEvents, removedTitles, removedEvents });
      } catch (e: any) {
        await logError(userId, "/api/chat", e);
        if (e instanceof AIRateLimitError) {
          // 秘書AIの返答として友好的なメッセージを delta で流す
          const settings: any = await getUserSettings(userId).catch(() => null);
          const secretaryName = settings?.secretary_name || "清瀬リンク";
          const friendly = formatRateLimitForUser(e, secretaryName);
          send("delta", { text: friendly });
          send("replace", { text: friendly });
          send("done", { addedTitles: [], addedEvents: [], removedTitles: [], removedEvents: [] });
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
