/**
 * 日中の能動声がけ cron。
 * GET /api/cron/checkin?slot=morning|midday|afternoon|evening
 * Authorization: Bearer <CRON_SECRET>
 *
 * 全ユーザーの user_settings.ntfy_topic を見て、登録があれば push を送る。
 * メッセージはユーザーごとに Claude で生成（タスク/予定/進捗を踏まえた一言）。
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getClaude, CLAUDE_MODEL, SECRETARY_NAME } from "@/lib/claude";
import { sendNtfy } from "@/lib/ntfy";
import { sendPushToUser, pushConfigured } from "@/lib/push";
import { getTodayCard } from "@/lib/questCard";
import { getCalendarEvents, getTasks, computeSchedule, jstNow, jstDateStr } from "@/lib/google";

type Slot = "morning" | "midday" | "afternoon" | "evening";

const SLOT_LABEL: Record<Slot, string> = {
  morning: "10時の声かけ（午前の優先確認）",
  midday: "13時の声かけ（午前の振り返り＋午後の調整）",
  afternoon: "15:30の声かけ（残り時間の追い込み）",
  evening: "17時の声かけ（1日の振り返り）",
};

const SLOT_PROMPT: Record<Slot, string> = {
  morning: `いまJST10時前後。淳くんがちゃんと作業を始められてるか、優先タスクの1個目に着手できてるかを軽く確認するメッセージ。
60〜100文字。プッシュ通知で読むので短く。優先タスク1〜2件のタイトルを引用して「これ、もう手つけた？」のような声かけにする。`,
  midday: `いまJST13時前後。午前の動きを軽く振り返って、午後を整え直すメッセージ。
60〜100文字。「午前どうだった？詰まったところは？」みたいな声かけ。完了が0なら無理せず1個から、進んでたら次の優先を促す。`,
  afternoon: `いまJST15時半前後。17時稼働終了まで残り90分。あと1個進めるならどれ？という尻押しメッセージ。
60〜100文字。優先タスク1個を具体名で挙げて「ここから30〜60分で1個だけ片付ける？」のような提案。`,
  evening: `いまJST17時前後。1日のクロージング声かけ。今日できたことを軽く拾って、明日に残すものを意識させる。
60〜100文字。完了数と進捗%を踏まえて「お疲れさま、◯/◯完了。明日に残すのは△△と□□、それでOK？」`,
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
    .select("user_id, ntfy_topic, anthropic_api_key, google_refresh_token");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // プッシュ購読者の user_id 集合（ntfy 未設定でもプッシュには送る）
  const pushUsers = new Set<string>();
  if (pushConfigured()) {
    const { data: subs } = await supa.from("push_subscriptions").select("user_id");
    for (const s of (subs ?? []) as { user_id: string }[]) if (s.user_id) pushUsers.add(s.user_id);
  }

  const results: any[] = [];
  for (const u of users ?? []) {
    const wantsNtfy = !!u.ntfy_topic;
    const wantsPush = pushUsers.has(u.user_id);
    if (!wantsNtfy && !wantsPush) continue;
    try {
      const message = await generateMessage(u.user_id, slot, !!u.google_refresh_token);

      if (wantsNtfy) {
        const r = await sendNtfy(u.ntfy_topic!, message, { title: `${SECRETARY_NAME}より`, tags: ["sparkles"] });
        await supa.from("notifications").insert({
          user_id: u.user_id, channel: "ntfy", type: `checkin:${slot}`, body: message, success: r.ok, error: r.error ?? null,
        });
      }

      if (wantsPush) {
        let pushOk = false, pushErr: string | null = null;
        try {
          const pr = await sendPushToUser(u.user_id, { title: `${SECRETARY_NAME}より`, body: message, url: "/", tag: `checkin:${slot}` });
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

      results.push({ user_id: u.user_id, ntfy: wantsNtfy, push: wantsPush, card });
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
    case "morning": return "おはよう。今日の優先タスク、もう1つ目に手つけた？";
    case "midday": return "午前どうだった？詰まったところあれば話そう。午後の組み直しもできるよ。";
    case "afternoon": return "残り90分。今日のうちにあと1個だけ片付けるなら、どれにする？";
    case "evening": return "お疲れさま。今日できたこと、明日に残したこと、ちょっと整理しよう。";
  }
}
