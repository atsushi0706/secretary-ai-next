/**
 * 歩数の記録と、歩くことで手に入るもの。サーバ専用。
 *
 * 数えるのはアプリを開いている間だけなので、ここに貯まるのは
 * 「このアプリと一緒に歩いた歩数」。健康アプリの代わりではなく、
 * パラレルウォークを"実際に歩いた"記録として積み上がっていく。
 */
import { supabaseAdmin } from "./supabase";
import { jstDateStr } from "./google";
import { grantSkillCard } from "./awaken";

/** この歩数から「歩いた日」とみなす（連続日数の判定に使う） */
export const WALKED_THRESHOLD = 1000;

export type StepDay = { date: string; steps: number; seconds: number; sessions: number };

export type StepSummary = {
  today: number;
  todaySeconds: number;
  streak: number;        // 連続で歩いた日数
  bestStreak: number;
  total: number;         // 累計
  days: number;          // 歩いた日の数
  best: { date: string; steps: number } | null;
  history: StepDay[];    // 新しい順
};

/** 手に入るカード。1つの key につき1枚だけ */
type Milestone = { key: string; title: string; body: string; rarity: "bronze" | "silver" | "gold" };

const DAILY: { at: number; card: Milestone }[] = [
  { at: 3000, card: { key: "walk-d3000", title: "はじまりの一歩", body: "1日3,000歩。理想を語りながら、その足で確かに前へ進んだ日。", rarity: "bronze" } },
  { at: 6000, card: { key: "walk-d6000", title: "道をひらく脚", body: "1日6,000歩。景色が変わるところまで歩いた。頭ではなく、身体で世界を動かした。", rarity: "silver" } },
  { at: 10000, card: { key: "walk-d10000", title: "遠くまで行ける者", body: "1日10,000歩。ここまで来られると分かった脚は、もう遠くを恐れない。", rarity: "gold" } },
];

const STREAK: { at: number; card: Milestone }[] = [
  { at: 3, card: { key: "walk-s3", title: "三日の道", body: "3日つづけて歩いた。いちばん切れやすいところを、越えた。", rarity: "bronze" } },
  { at: 7, card: { key: "walk-s7", title: "七日の巡礼", body: "7日つづけて歩いた。もう気合いではなく、暮らしの一部になりはじめている。", rarity: "silver" } },
  { at: 30, card: { key: "walk-s30", title: "旅を生きる者", body: "30日つづけて歩いた。やっていることではなく、そういう人になった。", rarity: "gold" } },
];

const TOTAL: { at: number; card: Milestone }[] = [
  { at: 50000, card: { key: "walk-t50k", title: "五万歩の足跡", body: "累計50,000歩。ここまでの道は、全部この足でつけた跡。", rarity: "silver" } },
  { at: 200000, card: { key: "walk-t200k", title: "地平を越えた足", body: "累計200,000歩。地図の端まで歩いた者だけが知っている景色がある。", rarity: "gold" } },
];

/** 連続日数を数える（今日または昨日から遡る。今日まだ歩いていなくても途切れさせない） */
function calcStreak(days: StepDay[], todayStr: string): number {
  const walked = new Set(days.filter((d) => d.steps >= WALKED_THRESHOLD).map((d) => d.date));
  const at = (offset: number) => {
    const t = new Date(`${todayStr}T00:00:00+09:00`);
    t.setDate(t.getDate() - offset);
    return jstDateStr(t);
  };
  // 今日がまだなら昨日から数える（今日の途中で「途切れた」と見せないため）
  let start = walked.has(at(0)) ? 0 : (walked.has(at(1)) ? 1 : -1);
  if (start < 0) return 0;
  let n = 0;
  for (let i = start; i < 400; i++) {
    if (!walked.has(at(i))) break;
    n++;
  }
  return n;
}

function bestStreakOf(days: StepDay[]): number {
  const walked = days.filter((d) => d.steps >= WALKED_THRESHOLD).map((d) => d.date).sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const d of walked) {
    if (prev) {
      const a = new Date(`${prev}T00:00:00+09:00`);
      a.setDate(a.getDate() + 1);
      run = jstDateStr(a) === d ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export async function getSummary(userId: string, limit = 60): Promise<StepSummary> {
  const today = jstDateStr();
  let rows: StepDay[] = [];
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("step_logs")
      .select("date, steps, seconds, sessions")
      .eq("user_id", userId).order("date", { ascending: false }).limit(limit);
    rows = (data ?? []) as StepDay[];
  } catch { /* テーブルが無くても画面は出す */ }

  const t = rows.find((r) => r.date === today);
  const total = rows.reduce((a, r) => a + (r.steps ?? 0), 0);
  const walkedDays = rows.filter((r) => r.steps >= WALKED_THRESHOLD);
  const best = rows.reduce<{ date: string; steps: number } | null>(
    (b, r) => (!b || r.steps > b.steps ? { date: r.date, steps: r.steps } : b), null);

  return {
    today: t?.steps ?? 0,
    todaySeconds: t?.seconds ?? 0,
    streak: calcStreak(rows, today),
    bestStreak: bestStreakOf(rows),
    total,
    days: walkedDays.length,
    best,
    history: rows,
  };
}

/**
 * 1回ぶんの散歩を足す。今日の合計に積み上げて、届いたぶんのカードを渡す。
 * @returns 加算後の状態と、今回新しく手に入ったカード
 */
export async function addSteps(
  userId: string, steps: number, seconds: number,
): Promise<{ summary: StepSummary; earned: Milestone[] }> {
  const date = jstDateStr();
  const supa = supabaseAdmin();

  // 今日ぶんに積み上げる（1日1行）
  const { data: cur } = await supa.from("step_logs")
    .select("steps, seconds, sessions").eq("user_id", userId).eq("date", date).maybeSingle();
  const nextSteps = (cur?.steps ?? 0) + steps;
  const nextSec = (cur?.seconds ?? 0) + seconds;
  const nextSessions = (cur?.sessions ?? 0) + 1;

  await supa.from("step_logs").upsert({
    user_id: userId, date,
    steps: nextSteps, seconds: nextSec, sessions: nextSessions,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,date" });

  const summary = await getSummary(userId);

  // 届いたぶんのカードを渡す（同じ key は1枚だけなので、何度呼んでも増えない）
  const earned: Milestone[] = [];
  const before = { daily: cur?.steps ?? 0 };
  for (const m of DAILY) if (summary.today >= m.at && before.daily < m.at) earned.push(m.card);
  for (const m of STREAK) if (summary.streak >= m.at) earned.push(m.card);
  for (const m of TOTAL) if (summary.total >= m.at) earned.push(m.card);

  const given: Milestone[] = [];
  for (const c of earned) {
    try {
      const fresh = await grantIfNew(userId, c);
      if (fresh) given.push(c);
    } catch { /* カードが渡せなくても記録は残す */ }
  }
  return { summary, earned: given };
}

/** まだ持っていないときだけ渡す（持っていれば false） */
async function grantIfNew(userId: string, c: Milestone): Promise<boolean> {
  const supa = supabaseAdmin();
  const { data } = await supa.from("skill_cards")
    .select("key").eq("user_id", userId).eq("key", c.key).maybeSingle();
  if (data) return false;
  await grantSkillCard(userId, {
    key: c.key, title: c.title, body: c.body, rarity: c.rarity, source: "散歩のおとも",
  });
  return true;
}

/** 次に手が届くもの（あと何歩か）。歩きたくなるように出す */
export function nextGoal(summary: StepSummary): { label: string; at: number; left: number } | null {
  for (const m of DAILY) if (summary.today < m.at) {
    return { label: m.card.title, at: m.at, left: m.at - summary.today };
  }
  return null;
}
