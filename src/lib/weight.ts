/**
 * 体重と体脂肪率の記録。サーバ専用。
 *
 * 毎朝1回、起きたときに入れるだけ。消さずにずっと貯め続ける。
 * 大事なのは1日の数字ではなく「線」なので、
 *  - 前日差ではなく **7日平均** を主役にする（水分で±1kgは普通に動くため）
 *  - 増えた日を責めない。淡々と線を見せる
 */
import { supabaseAdmin } from "./supabase";
import { jstDateStr } from "./google";

export type WeightDay = { date: string; weight: number | null; fat: number | null; note?: string | null };

export type WeightSummary = {
  today: WeightDay | null;
  yesterday: WeightDay | null;
  /** 直近7日の平均（体重・体脂肪） */
  avg7: { weight: number | null; fat: number | null };
  /** その前の7日の平均（比較用） */
  prevAvg7: { weight: number | null; fat: number | null };
  /** 記録した日数と連続記録日数 */
  days: number;
  streak: number;
  /** いちばん軽かった日 */
  lightest: { date: string; weight: number } | null;
  /** 最初に記録した日からの変化 */
  since: { date: string; weight: number } | null;
  history: WeightDay[];   // 新しい順（最大180日）
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function avgOf(rows: WeightDay[], key: "weight" | "fat"): number | null {
  const vs = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
  if (vs.length === 0) return null;
  return round2(vs.reduce((a, b) => a + b, 0) / vs.length);
}

/** 記録した日が今日（or 昨日）から何日続いているか */
function calcStreak(rows: WeightDay[], today: string): number {
  const has = new Set(rows.map((r) => r.date));
  const at = (off: number) => {
    const t = new Date(`${today}T00:00:00+09:00`);
    t.setDate(t.getDate() - off);
    return jstDateStr(t);
  };
  const start = has.has(at(0)) ? 0 : has.has(at(1)) ? 1 : -1;
  if (start < 0) return 0;
  let n = 0;
  for (let i = start; i < 800; i++) {
    if (!has.has(at(i))) break;
    n++;
  }
  return n;
}

export async function getWeightSummary(userId: string): Promise<WeightSummary> {
  const today = jstDateStr();
  let rows: WeightDay[] = [];
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("weight_logs")
      .select("date, weight, fat, note")
      .eq("user_id", userId).order("date", { ascending: false }).limit(180);
    rows = (data ?? []) as WeightDay[];
  } catch { /* テーブルが無くても画面は出す */ }

  const y = new Date(`${today}T00:00:00+09:00`);
  y.setDate(y.getDate() - 1);
  const yStr = jstDateStr(y);

  const withW = rows.filter((r) => typeof r.weight === "number");
  const lightest = withW.reduce<{ date: string; weight: number } | null>(
    (b, r) => (!b || (r.weight as number) < b.weight ? { date: r.date, weight: r.weight as number } : b), null);
  const oldest = withW.length ? withW[withW.length - 1] : null;

  return {
    today: rows.find((r) => r.date === today) ?? null,
    yesterday: rows.find((r) => r.date === yStr) ?? null,
    avg7: { weight: avgOf(rows.slice(0, 7), "weight"), fat: avgOf(rows.slice(0, 7), "fat") },
    prevAvg7: { weight: avgOf(rows.slice(7, 14), "weight"), fat: avgOf(rows.slice(7, 14), "fat") },
    days: rows.length,
    streak: calcStreak(rows, today),
    lightest,
    since: oldest ? { date: oldest.date, weight: oldest.weight as number } : null,
    history: rows,
  };
}

/** 1日ぶんを記録（同じ日は上書き）。小数第2位まで保つ */
export async function saveWeight(
  userId: string,
  input: { date?: string; weight?: number | null; fat?: number | null; note?: string },
): Promise<WeightSummary> {
  const date = (input.date ?? jstDateStr()).slice(0, 10);
  const clamp = (v: number | null | undefined, lo: number, hi: number) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    if (v < lo || v > hi) return null;   // 打ち間違い（桁ミス）は保存しない
    return round2(v);
  };
  const weight = clamp(input.weight, 20, 300);
  const fat = clamp(input.fat, 1, 70);
  if (weight === null && fat === null) throw new Error("体重か体脂肪率のどちらかは入れてね");

  const supa = supabaseAdmin();
  // 片方だけ入れ直したときに、もう片方を消さない
  const { data: cur } = await supa.from("weight_logs")
    .select("weight, fat").eq("user_id", userId).eq("date", date).maybeSingle();

  await supa.from("weight_logs").upsert({
    user_id: userId, date,
    weight: weight ?? cur?.weight ?? null,
    fat: fat ?? cur?.fat ?? null,
    note: input.note?.slice(0, 200) ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,date" });

  return getWeightSummary(userId);
}

export async function deleteWeight(userId: string, date: string): Promise<void> {
  const supa = supabaseAdmin();
  await supa.from("weight_logs").delete().eq("user_id", userId).eq("date", date.slice(0, 10));
}
