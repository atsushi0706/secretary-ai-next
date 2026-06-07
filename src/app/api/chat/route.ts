import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGemini, SECRETARY_PERSONA, extractJson } from "@/lib/gemini";
import {
  saveMessage, loadMessages, setManualLabel,
} from "@/lib/supabase";
import { getCalendarEvents, getTasks, computeSchedule, jstNow, jstDateStr, addTask } from "@/lib/google";

const ADD_INTENT_KEYWORDS = [
  "入れといて", "入れておいて", "入れとい", "追加しといて", "追加しておいて",
  "追加しとい", "タスクに入れて", "タスクに追加", "todoに", "ToDoに",
  "やることに入れて", "リストに入れて", "リストに追加",
  "登録しといて", "登録しておいて",
];

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const text: string = (body.text ?? "").trim();
    const isMorning: boolean = body.isMorning ?? true;
    if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });

    const now = jstNow();
    const today = jstDateStr();
    const targetDay = isMorning ? today : jstDateStr(new Date(Date.now() + 86400000));
    const targetLabel = isMorning ? "今日" : "明日";
    const mode = isMorning ? "morning" : "evening";

    // ユーザー発言を保存
    await saveMessage(userId, today, mode, "user", text);

    // 「入れといて」自動検出
    const intentAdd = ADD_INTENT_KEYWORDS.some((k) => text.includes(k));
    let addedTitles: string[] = [];

    if (intentAdd) {
      try {
        // 既存タスク取得
        const tasks = await getTasks(userId);
        const existingTitles = tasks.map((t) => t.title);
        const allMsgs = await loadMessages(userId, today, mode);
        const userLines = allMsgs.filter((m) => m.role === "user")
          .map((m) => `- ${m.content.slice(0, 400)}`).join("\n") || `- ${text}`;

        const gem = await getGemini(userId, "gemini-2.5-flash");
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
[{"title":"30字","notes":"出所","category":"work|personal","urgency":"high|low","importance":"high|low","time":"quick|today|days","due":"${targetDay}|"}]`;
        const r = await gem.generateContent(exPrompt);
        const cands = extractJson<any[]>(r.response.text()) ?? [];
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
                category: ["work","personal"].includes(c.category) ? c.category : "work",
                urgency: ["high","low"].includes(c.urgency) ? c.urgency : "low",
                importance: ["high","low"].includes(c.importance) ? c.importance : "high",
                time_label: ["quick","today","days"].includes(c.time) ? c.time : "today",
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
    }

    // 会話のコンテキストを組み立て
    const [events, tasks] = await Promise.all([
      getCalendarEvents(userId, 1),
      getTasks(userId),
    ]);
    const targetDate = new Date(targetDay + "T00:00:00+09:00");
    const sched = computeSchedule(events, targetDate, 9, 17, isMorning ? now : undefined);
    const ctxLines = [
      `【現在時刻】${now.toISOString().slice(0,16).replace("T"," ")}`,
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
    const history = allMessages.slice(-30).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    if (history.length === 0 || history[0].role === "model") {
      history.unshift({ role: "user", parts: [{ text: "(秘書業務を開始)" }] });
    }

    const gem = await getGemini(userId, "gemini-2.5-flash");
    const chat = gem.startChat({
      history: history.slice(0, -1),
      systemInstruction: SECRETARY_PERSONA + "\n\n# いまの状況\n" + ctxLines.join("\n\n"),
      generationConfig: { temperature: 0.6 },
    });
    const lastUser = history[history.length - 1].parts[0].text;
    const r = await chat.sendMessage(lastUser);
    const reply = r.response.text();
    await saveMessage(userId, today, mode, "assistant", reply);

    return NextResponse.json({ reply, addedTitles });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
