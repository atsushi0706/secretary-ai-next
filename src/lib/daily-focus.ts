/**
 * 今日のフォーカス（1日ぶん）。
 * - emotion：今日1日、どんな感情でいようと思うか（先取りする感情）。
 * - priority：理想の状態を今日に入れる“ちっちゃな最優先の一歩”。
 *
 * パラレルウォークの最後に決めて、priority はタスク（Google Tasks＝リアルバース）にも入れる。
 * リアルバース（AI秘書）側は、この2つを今日のピンとして表示する。
 */
import { supabaseAdmin } from "./supabase";
import { jstDateStr } from "./google";

export type DailyFocus = { date: string; emotion: string; priority: string };

export async function getDailyFocus(userId: string, date?: string): Promise<DailyFocus> {
  const d = date || jstDateStr();
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("daily_focus")
    .select("date, emotion, priority")
    .eq("user_id", userId).eq("date", d)
    .maybeSingle();
  if (error) throw error;
  return (data as DailyFocus) ?? { date: d, emotion: "", priority: "" };
}

export async function saveDailyFocus(
  userId: string,
  fields: { emotion?: string; priority?: string },
  date?: string,
): Promise<DailyFocus> {
  const d = date || jstDateStr();
  const supa = supabaseAdmin();
  const row = {
    user_id: userId, date: d,
    emotion: (fields.emotion ?? "").trim(),
    priority: (fields.priority ?? "").trim(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supa.from("daily_focus").upsert(row, { onConflict: "user_id,date" });
  if (error) throw error;
  return { date: d, emotion: row.emotion, priority: row.priority };
}
