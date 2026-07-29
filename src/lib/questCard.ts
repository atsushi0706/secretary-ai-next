/**
 * 未来からのクエストカード。
 * 3日連続で使ったら、ホームに「届いてる」演出でカードが1枚届く（1日1枚・ランダム16種の抽象シンボル）。
 * 流れ：本人がシンボルの意味を受け取る → AI(清瀬リンク)がそれを"今日乗り越えること"に深める → 立ち向かう → レベルが上がる。
 */
import { supabaseAdmin } from "./supabase";
import { getClaude, CLAUDE_MODEL } from "./claude";
import { jstDateStr, jstNow } from "./google";

export const SYMBOL_COUNT = 16;
const STREAK_NEEDED = 3;

export type QuestCard = {
  date: string;
  symbol: number;          // 1..16
  interpretation: string;  // 本人の解釈
  challenge: string;       // AIが深めた今日の課題
  done: boolean;
};

// userId+date から決まる擬似ランダム（同じ日は同じ絵・リロードで変わらない）
function seededSymbol(userId: string, date: string): number {
  let h = 0;
  const s = `${userId}:${date}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % SYMBOL_COUNT) + 1;
}

function jstYesterdayStr(n: number): string {
  return jstDateStr(new Date(jstNow().getTime() - n * 86400000));
}

/** 今日を含む「連続で使った日数」。emotion/walk/インナー/秘書チャットのある日を1日として数える。 */
export async function consecutiveStreak(userId: string): Promise<number> {
  const supa = supabaseAdmin();
  const since = jstDateStr(new Date(jstNow().getTime() - 40 * 86400000));
  const [emo, walks, shinga, talks] = await Promise.all([
    supa.from("emotion_logs").select("date").eq("user_id", userId).gte("date", since),
    supa.from("walk_logs").select("date").eq("user_id", userId).gte("date", since),
    supa.from("shinga_conversations").select("date").eq("user_id", userId).eq("role", "user").gte("date", since),
    supa.from("conversations").select("date").eq("user_id", userId).eq("role", "user").gte("date", since),
  ]);
  const days = new Set<string>();
  for (const rows of [emo.data, walks.data, shinga.data, talks.data]) {
    for (const r of (rows ?? []) as { date: string }[]) if (r.date) days.add(r.date);
  }
  // 今日から遡って連続している日数を数える
  let streak = 0;
  for (let i = 0; i < 40; i++) {
    if (days.has(jstYesterdayStr(i))) streak++;
    else break;
  }
  return streak;
}

async function readCard(userId: string, date: string): Promise<QuestCard | null> {
  const supa = supabaseAdmin();
  const { data } = await supa.from("quest_cards").select("*").eq("user_id", userId).eq("date", date).maybeSingle();
  if (!data) return null;
  return { date: data.date, symbol: data.symbol, interpretation: data.interpretation ?? "", challenge: data.challenge ?? "", done: !!data.done };
}

/** 今日のカードを返す。無くて、条件（3日連続）を満たしていれば新規に1枚引く。 */
export async function getTodayCard(userId: string): Promise<{ card: QuestCard | null; streak: number; needed: number }> {
  const date = jstDateStr();
  const existing = await readCard(userId, date);
  if (existing) {
    const streak = await consecutiveStreak(userId);
    return { card: existing, streak, needed: STREAK_NEEDED };
  }
  const streak = await consecutiveStreak(userId);
  if (streak < STREAK_NEEDED) return { card: null, streak, needed: STREAK_NEEDED };

  const symbol = seededSymbol(userId, date);
  const supa = supabaseAdmin();
  const { data, error } = await supa.from("quest_cards")
    .upsert({ user_id: userId, date, symbol, interpretation: "", challenge: "", done: false }, { onConflict: "user_id,date" })
    .select("*").single();
  if (error) throw error;
  return { card: { date, symbol: data.symbol, interpretation: "", challenge: "", done: false }, streak, needed: STREAK_NEEDED };
}

/** 本人の解釈を受けて、AI(清瀬リンク)が"今日乗り越えること"に深める。 */
export async function interpretCard(userId: string, interpretation: string): Promise<QuestCard> {
  const date = jstDateStr();
  const card = await readCard(userId, date);
  if (!card) throw new Error("今日のカードがまだありません");
  const text = interpretation.trim().slice(0, 500);

  const prompt = `あなたは「清瀬リンク」。友達距離・タメ口・適度な絵文字・若干皮肉（きよブラック）。
相手が"未来からのクエストカード"（抽象的なシンボルの絵）を引いて、その絵から今日について、こう受け取った：
「${text || "（まだうまく言葉にできていない）"}」

これを、今日その人が"乗り越える一手"に落とし込んで渡して。ルール：
- 説教・分析はしない。まず受け取って、そこから「じゃあ今日はこれ、やってみよ」という具体的な小さな挑戦を1つだけ。
- 未来の自分から届いた挑戦、というトーン。重すぎず、でも逃げ場を残しすぎない。
- 3〜4行。最後の1行は「今日これに立ち向かう？」と背中を押す一言で締める。
- 占い用語は出さない。相手の言葉に乗っかる。`;

  const client = getClaude();
  const r = await client.messages.create({ model: CLAUDE_MODEL, max_tokens: 500, temperature: 0.85, messages: [{ role: "user", content: prompt }] });
  const challenge = r.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();

  const supa = supabaseAdmin();
  await supa.from("quest_cards").update({ interpretation: text, challenge }).eq("user_id", userId).eq("date", date);
  return { ...card, interpretation: text, challenge };
}

/** 立ち向かった＝完了。レベルが上がる（computeLevelがquest_cardsのdone日数を数える）。 */
export async function completeCard(userId: string): Promise<void> {
  const supa = supabaseAdmin();
  await supa.from("quest_cards").update({ done: true }).eq("user_id", userId).eq("date", jstDateStr());
}
