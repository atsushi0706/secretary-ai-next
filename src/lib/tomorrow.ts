/**
 * 夜の振り返りで決めた「明日」を持ち越す。サーバ専用。
 *
 * 1日を閉じるときに決まるのは2つ。
 *   ・明日やること（話し合って決めた一手。リアルバースのタスクになる）
 *   ・**明日の最優先感情**（明日の夜、どんな感情になっていたいか）
 *
 * 感情のほうが先。何をやるかより「どう在りたいか」を先に置くと、
 * 翌日のタスクの選び方そのものが変わる。だから朝いちで目に入る場所に置く。
 *
 * 【記録する日時について】
 * date だけでなく、曜日と、決めた瞬間の時刻も残す。
 * 週次レポートで「何曜日にどう感じていたか」を並べるのに要るし、
 * あとから「いつ決めたのか」を辿れないと、振り返りの精度が落ちるため。
 */
import { supabaseAdmin } from "./supabase";
import { jstDateStr, jstNow } from "./google";

export type TomorrowFocus = {
  /** その振り返りをした日（＝前日） */
  date: string;
  /** 対象の日（＝明日） */
  targetDate: string;
  /** 明日の夜、どんな感情になっていたいか */
  emotion: string;
  /** なぜその感情か（本人の言葉） */
  why: string;
  /** 明日やると決めたこと */
  actions: string[];
};

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

/** JSTの曜日（0=日）。週次レポートで曜日ごとの傾向を見るのに使う */
export function jstWeekday(d: Date = jstNow()): number {
  return d.getDay();
}
export function jstWeekdayJa(d: Date = jstNow()): string {
  return WEEKDAY_JA[jstWeekday(d)];
}

/** 明日の日付（JST） */
export function tomorrowStr(): string {
  return jstDateStr(new Date(Date.now() + 86400000));
}

/** 夜の振り返りで決まったものを保存（同じ日は上書き＝決め直せる） */
export async function saveTomorrow(
  userId: string,
  f: { emotion?: string; why?: string; actions?: string[] },
): Promise<void> {
  const supa = supabaseAdmin();
  const now = jstNow();
  const date = jstDateStr();
  await supa.from("tomorrow_focus").upsert(
    {
      user_id: userId,
      date,
      target_date: tomorrowStr(),
      weekday: jstWeekday(now),
      emotion: (f.emotion ?? "").slice(0, 40),
      why: (f.why ?? "").slice(0, 200),
      actions: (f.actions ?? []).slice(0, 5).map((a) => a.slice(0, 60)),
      decided_at: new Date().toISOString(),   // いつ決めたか（実時刻）
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );
}

/** 今日ぶんの「最優先感情」を読む（朝いちにリアルバースで見せる） */
export async function todaysFocus(userId: string): Promise<TomorrowFocus | null> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("tomorrow_focus")
      .select("date, target_date, emotion, why, actions")
      .eq("user_id", userId).eq("target_date", jstDateStr()).maybeSingle();
    if (!data) return null;
    return {
      date: data.date,
      targetDate: data.target_date,
      emotion: data.emotion ?? "",
      why: data.why ?? "",
      actions: Array.isArray(data.actions) ? data.actions : [],
    };
  } catch { return null; }
}

/** 直近の履歴（週次レポートの材料） */
export async function listTomorrow(userId: string, days = 14): Promise<any[]> {
  try {
    const supa = supabaseAdmin();
    const from = jstDateStr(new Date(Date.now() - days * 86400000));
    const { data } = await supa.from("tomorrow_focus")
      .select("date, weekday, emotion, why, actions")
      .eq("user_id", userId).gte("date", from).order("date", { ascending: true });
    return data ?? [];
  } catch { return []; }
}
