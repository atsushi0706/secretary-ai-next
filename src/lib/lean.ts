/**
 * 対話の中身から「いまどちらに偏っているか」を読む。
 *
 * 行動の回数（ウォーク何日／✓何日）だけでは、その人の"状態"は分からない。
 * 淳くんの定義：
 *  - 空想寄り＝まだ起きていないことに怯えている／理想を描くだけで一歩も動いていない
 *  - 現実寄り＝理想を見ずに、ただ漫然と作業をこなしている／現実に締めつけられて苦しい
 *
 * 会話の実際の言葉から、この2つの癖を見つけて、真ん中（ゾーン）へ戻す一言を返す。
 */
import { supabaseAdmin } from "./supabase";
import { getClaude, CLAUDE_MODEL } from "./claude";
import { jstDateStr } from "./google";

export type LeanRead = {
  lean: "image" | "real" | "zone";  // 空想寄り / 現実寄り / 整っている
  strength: number;                  // 0-100 どれくらい寄っているか
  pattern: string;                   // 見つけた癖（例：まだ起きていないことを先に痛がる）
  message: string;                   // 本人に渡す一言
};

/** 直近の会話を集める（インナー＋秘書チャット） */
async function recentTalk(userId: string, days = 7): Promise<string> {
  const supa = supabaseAdmin();
  const since = jstDateStr(new Date(Date.now() - days * 86400000));
  const [inner, real] = await Promise.all([
    supa.from("shinga_conversations").select("date, role, content")
      .eq("user_id", userId).eq("role", "user").gte("date", since)
      .order("created_at", { ascending: false }).limit(40)
      .then((r) => r.data ?? [], () => []),
    supa.from("conversations").select("date, role, content")
      .eq("user_id", userId).eq("role", "user").gte("date", since)
      .order("id", { ascending: false }).limit(30)
      .then((r) => r.data ?? [], () => []),
  ]);
  const lines = [
    ...(inner as any[]).map((r) => `[内側 ${r.date}] ${String(r.content ?? "").slice(0, 160)}`),
    ...(real as any[]).map((r) => `[現実 ${r.date}] ${String(r.content ?? "").slice(0, 160)}`),
  ];
  return lines.slice(0, 50).join("\n");
}

/**
 * 直近で「実際にやったこと」を集める。
 *
 * ここが無いと、会話の言葉だけを見て「今週やることが見えてない」と決めつけてしまう。
 * ✓が付いている＝本人はもう決めて動いている。それは事実として必ず認める。
 */
export async function recentDoneText(userId: string, days = 7): Promise<string> {
  const supa = supabaseAdmin();
  const since = jstDateStr(new Date(Date.now() - days * 86400000));
  const [quests, walks, emo, cards, guards, skills] = await Promise.all([
    supa.from("higher_quest").select("date, items").eq("user_id", userId).gte("date", since)
      .then((r) => r.data ?? [], () => []),
    supa.from("walk_logs").select("date").eq("user_id", userId).gte("date", since)
      .then((r) => r.data ?? [], () => []),
    supa.from("emotion_logs").select("date").eq("user_id", userId).gte("date", since)
      .then((r) => r.data ?? [], () => []),
    supa.from("quest_cards").select("date, title, done").eq("user_id", userId).gte("date", since)
      .then((r) => r.data ?? [], () => []),
    supa.from("guardians").select("date, color").eq("user_id", userId).gte("date", since)
      .then((r) => r.data ?? [], () => []),
    supa.from("skill_cards").select("date, title").eq("user_id", userId).gte("date", since)
      .then((r) => r.data ?? [], () => []),
  ]);

  const lines: string[] = [];
  for (const q of quests as any[]) {
    for (const it of (Array.isArray(q.items) ? q.items : [])) {
      if (it?.done) lines.push(`[${q.date}] ✓ 今日の一手を実行：${String(it.text ?? "").slice(0, 60)}`);
      else if (it?.text) lines.push(`[${q.date}] □ 受け取り済み（未着手）：${String(it.text).slice(0, 60)}`);
    }
  }
  for (const c of (cards as any[]).filter((c) => c?.done)) {
    lines.push(`[${c.date}] ✓ 未来からのクエストを受け取った：${String(c.title ?? "").slice(0, 50)}`);
  }
  for (const g of guards as any[]) lines.push(`[${g.date}] ✦ 守り手を解放（${g.color}）`);
  for (const s of skills as any[]) lines.push(`[${s.date}] 🃏 スキルカード獲得：${String(s.title ?? "").slice(0, 40)}`);
  const wd = [...new Set((walks as any[]).map((w) => w.date))];
  if (wd.length) lines.push(`パラレルウォークをした日：${wd.length}日（${wd.slice(0, 5).join("・")}）`);
  const ed = [...new Set((emo as any[]).map((e) => e.date))];
  if (ed.length) lines.push(`状態チェックをした日：${ed.length}日`);

  return lines.length ? lines.slice(0, 40).join("\n") : "（この期間、記録に残っている行動はまだ無い）";
}

/**
 * 対話から偏りを読む。会話が少なければ null（数値だけで判断させる）。
 */
export async function readLean(userId: string): Promise<LeanRead | null> {
  const [talk, done] = await Promise.all([
    recentTalk(userId).catch(() => ""),
    recentDoneText(userId).catch(() => "（記録を読めなかった）"),
  ]);
  if (talk.split("\n").filter(Boolean).length < 4) return null; // 材料が少なすぎる

  const prompt = `下は、ある人の直近の「発言」と「実際にやったことの記録」。
この人がいま「空想」と「現実」のどちらに偏っているかを読んで。

# 最重要のルール（これを破ったら失格）
- **記録に✓が付いていることは、必ず「やった」として扱う。**
  「動けていない」「決められていない」「見えていない」と書いてはいけない。
  ✓があるのに「やることが見えてない」と書くのは、本人の努力を無かったことにする最悪の誤りになる。
- 偏りを指摘するときは、**先にやれていることを認めてから**、足りない側を1つだけ添える。
- 痛い言い方をしない。刺さる指摘より、隣にいる人の言い方を選ぶ。
- 決めつけない。「〜な癖が出てるかも」と余白を残す。
- 発言に無いことを推測で断定しない。材料が薄ければ zone にする。

# 判断基準
- **空想に寄っている（image）**＝次のどちらか
  ・まだ起きていないことを先に痛がっている（不安・最悪の想像・「〜だったらどうしよう」）
  ・理想を語る量に対して、記録に残る行動が明らかに少ない
    ※ ただし✓が複数あるなら、これには当たらない。行動はしている。
- **現実に寄っている（real）**＝次のどちらか
  ・理想や望みの話が出てこず、目の前の作業・義務・締切の話だけをしている
  ・「やらなきゃ」「時間がない」で締めつけられて、何のためかを見失っている
- **整っている（zone）**＝理想の話と、行動（発言でも記録でも可）が、両方そろっている

# 出力（JSONだけ）
{
 "lean": "image" | "real" | "zone",
 "strength": 0-100の数値（どれくらい強く偏っているか。zoneなら0-20）,
 "pattern": "気づいたことを20〜35字で。責める言葉にしない（例：理想の解像度が上がってきてる時期かも）",
 "message": "本人へ渡す一言。40〜70字。友達の距離・タメ口。まず認めて、戻る方向を1つだけ添える"
}

# 実際にやったことの記録（事実。ここにあることは全部やっている）
${done}

# 直近の発言
${talk}`;

  try {
    const client = getClaude();
    const r = await client.messages.create({
      model: CLAUDE_MODEL, max_tokens: 500, temperature: 0.6,
      messages: [{ role: "user", content: prompt }],
    });
    const text = r.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const p = JSON.parse(m[0]);
    const lean = p.lean === "image" || p.lean === "real" ? p.lean : "zone";
    return {
      lean,
      strength: Math.max(0, Math.min(100, Number(p.strength) || 0)),
      pattern: String(p.pattern ?? "").slice(0, 60),
      message: String(p.message ?? "").slice(0, 160),
    };
  } catch {
    return null;
  }
}
