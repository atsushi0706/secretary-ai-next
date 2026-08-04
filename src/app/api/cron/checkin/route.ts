/**
 * 日中の能動声がけ cron。
 * GET /api/cron/checkin?slot=morning|midday|afternoon|evening
 * Authorization: Bearer <CRON_SECRET>
 *
 * プッシュ通知を購読している全ユーザーへ、その時間帯の声かけを送る（別アプリは不要）。
 * メッセージはユーザーごとに Claude で生成（タスク/予定/進捗を踏まえた一言）。
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getClaude, CLAUDE_MODEL, SECRETARY_NAME } from "@/lib/claude";
import { sendPushToUser, pushConfigured } from "@/lib/push";
import { getTodayCard } from "@/lib/questCard";
import { getCalendarEvents, getTasks, computeSchedule, jstNow, jstDateStr } from "@/lib/google";

type Slot = "morning" | "midday" | "afternoon" | "evening";

const SLOT_LABEL: Record<Slot, string> = {
  morning: "6:30の声かけ（今日を始める）",
  midday: "12:00の声かけ（気にかける・確認する）",
  afternoon: "15:30の声かけ（残り時間の追い込み）",
  evening: "20:00の声かけ（1日のレポート）",
};

const SLOT_PROMPT: Record<Slot, string> = {
  morning: `いまJST6時半。1日の入り口。「今日もやろう」と背中を押す朝の呼びかけ。
60〜100文字。まだ何も始まっていない時間なので、詰めない。今日ひとつだけ向き合うものを思い出させる。
優先タスクがあれば1件だけ具体名で触れて「今日はここからいこっか」のように誘う。`,
  midday: `いまJST12時。昼の声かけ。まず人として気にかける一言から入る（ごはん食べた？ちゃんと休めてる？等）。
そのうえで、まだ手つかずのことがあれば1件だけ、責めずに確認する。無ければ普通に会話として問いかけるだけでいい。
60〜100文字。詰問にしない。「どう、進んでる？」くらいの温度で。`,
  afternoon: `いまJST15時半前後。17時稼働終了まで残り90分。あと1個進めるならどれ？という尻押しメッセージ。
60〜100文字。優先タスク1個を具体名で挙げて「ここから30〜60分で1個だけ片付ける？」のような提案。`,
  evening: `いまJST20時。1日のレポート。今日やれたことを具体的に拾って渡す（できなかったことを責めない）。
60〜100文字。完了数を踏まえて「お疲れさま。今日は◯個片づいたね」から入り、
最後に「振り返り、開いてみる？」と1日の振り返りへ誘う。`,
};

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Fail closed: 環境変数が未設定なら誰も通さない（過去は開発用に true を返していたが、本番で誰でも叩けてしまうため変更）
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const slot = (url.searchParams.get("slot") || "midday") as Slot;
  if (!(slot in SLOT_LABEL)) {
    return NextResponse.json({ error: "invalid slot" }, { status: 400 });
  }

  const supa = supabaseAdmin();
  const { data: users, error } = await supa
    .from("user_settings")
    .select("user_id, anthropic_api_key, google_refresh_token");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 朝は「まだ体重を記録していない人」に一言そえる（責めない・触れるだけ）
  const weighedToday = new Set<string>();
  if (slot === "morning") {
    try {
      const { data } = await supa.from("weight_logs").select("user_id").eq("date", jstDateStr());
      for (const r of (data ?? []) as { user_id: string }[]) if (r.user_id) weighedToday.add(r.user_id);
    } catch { /* テーブルが無くても通知は出す */ }
  }

  // プッシュ購読者の user_id 集合
  const pushUsers = new Set<string>();
  if (pushConfigured()) {
    const { data: subs } = await supa.from("push_subscriptions").select("user_id");
    for (const s of (subs ?? []) as { user_id: string }[]) if (s.user_id) pushUsers.add(s.user_id);
  }

  const results: any[] = [];
  for (const u of users ?? []) {
    const wantsPush = pushUsers.has(u.user_id);
    if (!wantsPush) continue;
    try {
      const message = await generateMessage(u.user_id, slot, !!u.google_refresh_token);

      if (wantsPush) {
        let pushOk = false, pushErr: string | null = null;
        try {
          const withWeight = slot === "morning" && !weighedToday.has(u.user_id)
            ? `${message}
（起きたらまず、体重をひとつ置いていこう）`
            : message;
          // 朝は「今日のあなたの取扱説明書」から始まるようにする（開いた瞬間にその日の手引きが読める）
          const goTo = slot === "morning" ? "/shinga?open=akashic" : "/";
          const pr = await sendPushToUser(u.user_id, { title: `${SECRETARY_NAME}より`, body: withWeight, url: goTo, tag: `checkin:${slot}` });
          pushOk = pr.sent > 0;
        } catch (e: any) { pushErr = String(e?.message ?? e); }
        await supa.from("notifications").insert({
          user_id: u.user_id, channel: "webpush", type: `checkin:${slot}`, body: message, success: pushOk, error: pushErr,
        });
      }

      // 午前：未来からのクエストカードを1枚用意して、プッシュで知らせる（毎日）
      let card = false;
      if (slot === "morning" && wantsPush) {
        try {
          await getTodayCard(u.user_id); // 今日の1枚を確定
          const pr = await sendPushToUser(u.user_id, {
            title: "🎴 未来からのクエスト",
            body: "今日きみが乗り越えることが、1枚届いた。開いて受け取ろう。",
            url: "/shinga", tag: "quest-card",
          });
          card = pr.sent > 0;
          await supa.from("notifications").insert({
            user_id: u.user_id, channel: "webpush", type: "quest-card", body: "未来からのクエストが届いた", success: card, error: null,
          });
        } catch { /* カード配信の失敗は他をブロックしない */ }
      }

      // 夜：1日の振り返りが「開いた」ことをプッシュで知らせる（それまでは鍵）
      let night = false;
      if (slot === "evening" && wantsPush) {
        try {
          const pr = await sendPushToUser(u.user_id, {
            title: "🌙 1日の振り返りが開いたよ",
            body: "今日はどんな日だった？ 3分だけ、一緒に振り返ろう。",
            url: "/shinga?open=daily", tag: "reflect-open",
          });
          night = pr.sent > 0;
          await supa.from("notifications").insert({
            user_id: u.user_id, channel: "webpush", type: "reflect-open", body: "1日の振り返りが開いた", success: night, error: null,
          });
        } catch { /* 失敗しても他をブロックしない */ }
      }

      results.push({ user_id: u.user_id, push: wantsPush, card, night });
    } catch (e: any) {
      results.push({ user_id: u.user_id, ok: false, error: String(e?.message ?? e) });
    }
  }
  return NextResponse.json({ ok: true, slot, results });
}

async function generateMessage(userId: string, slot: Slot, hasGoogle: boolean): Promise<string> {
  // タスク・予定の現状を要約
  let ctx = "";
  if (hasGoogle) {
    try {
      const today = jstDateStr();
      const targetDate = new Date(today + "T00:00:00+09:00");
      const [events, tasks] = await Promise.all([
        getCalendarEvents(userId, 0),
        getTasks(userId),
      ]);
      const sched = computeSchedule(events, targetDate, 9, 17, jstNow());
      const top = tasks.slice(0, 5).map((t: any) => `- ${t.title}（〆${t.due ?? "なし"}）`).join("\n");
      ctx = `■ 現在のタスクトップ:\n${top || "(なし)"}\n■ 残空き時間: ${sched.free_minutes}分`;
    } catch (e) {
      ctx = "（カレンダー/タスク取得失敗）";
    }
  }

  const client = getClaude(); // ユーザーキーは push 側では参照しない（共通鍵）
  const system = `あなたは「清瀬リンク」。淳くんの秘書AI。
タメ口寄り、ドライだけど押しつけがましくない。茶化しはOK、煽り・お説教・キラキラ禁止。
プッシュ通知で読まれるので短く（60〜100文字）。改行は1〜2回まで。絵文字は1個まで。`;
  const userPrompt = `${SLOT_PROMPT[slot]}

${ctx}

このまま push 通知の本文として送るので、余計な前置きはなし。`;

  try {
    const r = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      temperature: 0.7,
      system,
      messages: [{ role: "user", content: userPrompt }],
    });
    const text = r.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text).join("\n").trim();
    return text || fallbackMessage(slot);
  } catch (e) {
    console.error("checkin message generation failed:", e);
    return fallbackMessage(slot);
  }
}

function fallbackMessage(slot: Slot): string {
  switch (slot) {
    case "morning": return "おはよう。今日もいこっか。まずはひとつだけ、向き合うものを決めよう。";
    case "midday": return "おつかれ。ごはん食べた？ 午前どうだった？ 詰まってるなら一緒に整えよう。";
    case "afternoon": return "残り90分。今日のうちにあと1個だけ片付けるなら、どれにする？";
    case "evening": return "お疲れさま。今日のこと、3分だけ振り返ってみない？";
  }
}
