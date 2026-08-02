/**
 * 「どんな一日だったか」の記録（夜のチェック）。サーバ専用。
 *
 * 状態チェック（emotion_logs＝10段階の点）とは別物。
 * こちらは一日をまるごと1つの言葉で置く。判定しない。8種類のどれも正解。
 */
import { supabaseAdmin } from "./supabase";
import { jstDateStr } from "./google";

export type DayKind =
  | "full" | "burn" | "wave" | "fog"
  | "hold" | "calm" | "spark" | "empty";

/** 8種類の一日。順番は「表示順」。どれが上等ということはない */
export const DAY_KINDS: { kind: DayKind; emoji: string; label: string; hint: string }[] = [
  { kind: "full",  emoji: "🌸", label: "満ちた日",     hint: "うれしい・満たされた" },
  { kind: "burn",  emoji: "🔥", label: "燃えた日",     hint: "集中して動けた" },
  { kind: "calm",  emoji: "🍃", label: "しずかな日",   hint: "おだやか・ゆっくり" },
  { kind: "wave",  emoji: "🌊", label: "ゆれた日",     hint: "気持ちが上下した" },
  { kind: "fog",   emoji: "🌫", label: "もやの日",     hint: "はっきりしない" },
  { kind: "spark", emoji: "⚡", label: "ざわめいた日", hint: "焦り・いらいら" },
  { kind: "hold",  emoji: "🪨", label: "ふんばった日", hint: "しんどい中たえた" },
  { kind: "empty", emoji: "🌙", label: "からっぽの日", hint: "つかれはてた" },
];

export function isDayKind(v: unknown): v is DayKind {
  return typeof v === "string" && DAY_KINDS.some((k) => k.kind === v);
}
export function dayKind(kind: DayKind) {
  return DAY_KINDS.find((k) => k.kind === kind)!;
}

/** 今日のぶんを記録（同じ日は上書き＝選び直せる） */
export async function markDay(userId: string, kind: DayKind): Promise<void> {
  const supa = supabaseAdmin();
  await supa.from("day_marks").upsert(
    { user_id: userId, date: jstDateStr(), kind, updated_at: new Date().toISOString() },
    { onConflict: "user_id,date" },
  );
}

export type DayMark = { date: string; kind: DayKind };

/** 直近の記録（新しい順）。経過を見るためのもの */
export async function listDayMarks(userId: string, limit = 30): Promise<DayMark[]> {
  const supa = supabaseAdmin();
  const { data } = await supa.from("day_marks")
    .select("date, kind")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(limit);
  return (data ?? []) as DayMark[];
}
