/**
 * インナーワールドのゲーム的ステータス。
 *
 * - 🔮 イメージ力：理想（パラレル）にどれだけ触れているか。
 *   → パラレルウォーク提出（walk_logs）＋パラレルトラベルの対話（place=higher）の"別々の日数" ÷ 7。
 * - 🔨 現実化力：理想を現実にどれだけ落としているか。
 *   → 今日のナゾ（higher_quest）を1つ以上こなした"別々の日数" ÷ 7。
 *
 * 事実ベースで、直近7日のローリング。毎日やれば100%、休むと少しずつ下がる（判断材料として）。
 *
 * 今日のナゾ（＝ハイヤークエスト）：理想の状態から今日に落とす小さな一手。最大3個、1個こなせば今日は100%。
 */
import { supabaseAdmin } from "./supabase";
import { jstDateStr } from "./google";

// image/real は日数（0〜7）。満点(%)を作らないための"綱引き"用の生の値。
export type Grounding = { image: number; real: number; imageDays: number; realDays: number };
export type QuestItem = { text: string; done: boolean };
export type TodayQuest = { date: string; items: QuestItem[]; percent: number };

const MAX_ITEMS = 3;

function since7(): string {
  return jstDateStr(new Date(Date.now() - 6 * 86400000)); // 今日を含む直近7日
}

export async function computeGrounding(userId: string): Promise<Grounding> {
  const supa = supabaseAdmin();
  const since = since7();

  const [walks, convs, hq] = await Promise.all([
    supa.from("walk_logs").select("date").eq("user_id", userId).gte("date", since),
    supa.from("shinga_conversations").select("date").eq("user_id", userId).eq("role", "user").in("place", ["walk", "higher"]).gte("date", since),
    supa.from("higher_quest").select("date, items").eq("user_id", userId).gte("date", since),
  ]);

  const imgDays = new Set<string>();
  for (const r of (walks.data ?? []) as { date: string }[]) if (r.date) imgDays.add(r.date);
  for (const r of (convs.data ?? []) as { date: string }[]) if (r.date) imgDays.add(r.date);

  const realDays = new Set<string>();
  for (const r of (hq.data ?? []) as { date: string; items: QuestItem[] }[]) {
    const items = Array.isArray(r.items) ? r.items : [];
    if (items.some((it) => it?.done)) realDays.add(r.date);
  }

  return {
    image: Math.min(100, Math.round((imgDays.size / 7) * 100)),
    real: Math.min(100, Math.round((realDays.size / 7) * 100)),
    imageDays: imgDays.size,
    realDays: realDays.size,
  };
}

function percentOf(items: QuestItem[]): number {
  return items.some((it) => it.done) ? 100 : 0; // 1個こなせば今日は100%
}

export async function getTodayQuest(userId: string): Promise<TodayQuest> {
  const supa = supabaseAdmin();
  const date = jstDateStr();
  const { data, error } = await supa
    .from("higher_quest").select("date, items").eq("user_id", userId).eq("date", date).maybeSingle();
  if (error) throw error;
  const items: QuestItem[] = Array.isArray(data?.items) ? (data!.items as QuestItem[]) : [];
  return { date, items, percent: percentOf(items) };
}

async function saveItems(userId: string, date: string, items: QuestItem[]): Promise<TodayQuest> {
  const supa = supabaseAdmin();
  const { error } = await supa.from("higher_quest").upsert(
    { user_id: userId, date, items, updated_at: new Date().toISOString() },
    { onConflict: "user_id,date" },
  );
  if (error) throw error;
  return { date, items, percent: percentOf(items) };
}

export async function addQuestItem(userId: string, text: string): Promise<TodayQuest> {
  const t = text.trim();
  const { date, items } = await getTodayQuest(userId);
  if (!t || items.length >= MAX_ITEMS) return { date, items, percent: percentOf(items) };
  const next = [...items, { text: t, done: false }];
  return saveItems(userId, date, next);
}

export async function toggleQuestItem(userId: string, index: number, done: boolean): Promise<TodayQuest> {
  const { date, items } = await getTodayQuest(userId);
  if (index < 0 || index >= items.length) return { date, items, percent: percentOf(items) };
  const next = items.map((it, i) => (i === index ? { ...it, done } : it));
  return saveItems(userId, date, next);
}

export async function removeQuestItem(userId: string, index: number): Promise<TodayQuest> {
  const { date, items } = await getTodayQuest(userId);
  const next = items.filter((_, i) => i !== index);
  return saveItems(userId, date, next);
}
