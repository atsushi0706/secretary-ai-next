/**
 * 目標階層（年 → 月 → 週）。リアルバースへの架け橋の"設計図"側。
 *
 * 淳くんの構造：
 * - 2026（年）：どんな理想／青写真か。
 * - 今月：その年のために。＋「どんな感情を先取りするか（感情目標）」。
 * - 今週：その月のために。
 * - 今日：↑から落とした"小さいタスク"。これはタスク（Google Tasks＝リアルバース）に作る。
 *
 * goals テーブルは year/month/week の本文だけを持つ。今日のタスクは tasks 側（同期の実体）。
 */
import { supabaseAdmin } from "./supabase";
import { jstDateStr } from "./google";

export type GoalScope = "year" | "month" | "week";
export type Goal = { scope: GoalScope; period: string; vision: string; emotion: string };

/** いまの年・月・週のキー（週は「その週の月曜」の日付／JST基準） */
export function currentPeriods(): Record<GoalScope, string> {
  const today = jstDateStr();               // YYYY-MM-DD（JST）
  const year = today.slice(0, 4);
  const month = today.slice(0, 7);
  const jst = new Date(Date.now() + 9 * 3600 * 1000);
  const dow = jst.getUTCDay();              // 0=日〜6=土
  const diff = dow === 0 ? -6 : 1 - dow;    // 月曜まで戻す
  const monday = new Date(jst.getTime() + diff * 86400000);
  const week = monday.toISOString().slice(0, 10);
  return { year, month, week };
}

/** 表示ラベル（例：2026年 / 7月 / 今週(7/28〜)） */
export function periodLabels(p: Record<GoalScope, string>): Record<GoalScope, string> {
  const [wy, wm, wd] = p.week.split("-");
  return {
    year: `${p.year}年`,
    month: `${Number(p.month.slice(5, 7))}月`,
    week: `今週（${Number(wm)}/${Number(wd)}〜）`,
  };
  void wy;
}

const EMPTY = (scope: GoalScope, period: string): Goal => ({ scope, period, vision: "", emotion: "" });

/** いまの年・月・週の目標をまとめて取得（無ければ空で埋める） */
export async function getCurrentGoals(userId: string): Promise<{ periods: Record<GoalScope, string>; goals: Record<GoalScope, Goal> }> {
  const periods = currentPeriods();
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("goals")
    .select("scope, period, vision, emotion")
    .eq("user_id", userId)
    .in("scope", ["year", "month", "week"]);
  if (error) throw error;

  const rows = (data ?? []) as Goal[];
  const pick = (scope: GoalScope) =>
    rows.find((r) => r.scope === scope && r.period === periods[scope]) ?? EMPTY(scope, periods[scope]);

  return { periods, goals: { year: pick("year"), month: pick("month"), week: pick("week") } };
}

/** 1つの階層の目標を保存（upsert） */
export async function saveGoal(
  userId: string,
  scope: GoalScope,
  period: string,
  fields: { vision?: string; emotion?: string },
): Promise<void> {
  const supa = supabaseAdmin();
  const { error } = await supa.from("goals").upsert(
    {
      user_id: userId, scope, period,
      vision: fields.vision ?? "", emotion: fields.emotion ?? "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,scope,period" },
  );
  if (error) throw error;
}
