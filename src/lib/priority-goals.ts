/**
 * 優先順位（1・2・3）と、そこに至る道のりの分解。サーバ専用。
 *
 * ※ 既存の goals.ts（年→月→週の青写真）とは別の仕組み。名前がぶつからないよう
 *   ここでは PGoal（Priority Goal＝優先順位の目標）と呼ぶ。
 *
 * 【何をする道具か】
 * 「月に100万円作る」のような大きな目標を、**1日30分で終わる粒**まで割って、
 * 日付を振って進めていけるようにする。
 *
 * 【どの水準を狙うか】
 * 経営の勉強をした人がきちんと組むレベルの逆算を、話すだけで作れるようにする。
 * だから、思いついた行動を並べるだけにはしない。
 *
 * 【段の順番（ここが設計の芯）】
 *   1 誰が止まっているか  … 優先順位を決める3つの問い
 *   2 お金か、状態か      … **混ぜたまま進ませない**
 *   3 数字にする          … 何を・いくつ・いつまでに
 *   4 分解の筋            … 数字を掛け算・足し算に割る。筋は2〜3通り出して選ばせる
 *   5 月・週の到達点      … 期限から逆算
 *   6 抜けを疑う          … 「◯◯を見落としていませんか？」を必ず1回
 *   7 30分の粒            … 実行できる単位まで割って日付を振る
 *
 * ■ 1段目：優先順位に迷ったら、この順で聞く
 *   ① 今、最も成果が出ていないのは誰か？（自分か、周りの人か）
 *   ② その人を止めている一番の原因は何か？
 *   ③ 今日作る・伝える・直すことで、何を前進させられるか？——**いちばんミニマムで**
 *   自分の目標だけでなく、他者に向けてやっていることにも同じ問いが立つ。
 *   だから「自分／人」を切り替えられるようにしてある。
 *
 * ■ 2段目：お金と幸せを、一緒くたにしない
 *   「稼ぎたい、でも心穏やかに暮らしたい」——この2つは追い方が違う。
 *   混ざったまま計画にすると、どちらも中途半端になる。
 *   ・お金を追うなら、**お金のことだけ**を数字で組む
 *   ・状態（幸せ・関係・健康）を追うなら、それを**別の目標として**細分化する
 *   混ざっていると見たら、こちらから分けることを勧める。勝手には分けない。
 *
 * 【一撃で作らせない】
 * 全部を1回のプロンプトでやらせると、必ず薄くなる。段ごとに分けて、
 * **いま立っている段の指示だけ**を渡す。間に本人が口を挟める余白も残す。
 *
 * 【勝手に決めない】
 * 数字も、選ぶ筋も、決めるのは本人。AIは案を出して、抜けを指摘する側に回る。
 */
import { supabaseAdmin } from "./supabase";
import { complete } from "./ai";
import { jstDateStr } from "./google";

/* ── 形 ────────────────────────────────────────── */

export type PGoalStatus = "active" | "done" | "paused";

/** 誰のための目標か。他者に向けてやっていることにも同じ問いが立つ */
export type Subject = "me" | "others";
export const isSubject = (v: unknown): v is Subject => v === "me" || v === "others";

/**
 * この目標は何を追うものか。
 * お金と状態（幸せ）を混ぜたまま計画にすると、どちらも中途半端になる。
 * mixed のまま先へ進ませない——分けることを勧める。
 */
export type PGoalKind = "money" | "state" | "mixed" | "";
export const isGoalKind = (v: unknown): v is PGoalKind =>
  v === "money" || v === "state" || v === "mixed" || v === "";

export type PGoal = {
  id: string;
  rank: number;                 // 1・2・3
  title: string;                // 「月に100万円作る」
  /** 自分のことか、人のことか */
  subject: Subject;
  /** お金を追うのか、状態を追うのか。混ざっていれば mixed */
  kind: PGoalKind;
  /** 何を測るか（例：月の売上） */
  metric: string;
  /** いくら（例：1000000） */
  target_value: number | null;
  /** 単位（例：円 / 件 / kg） */
  unit: string;
  /** いつまでに（YYYY-MM-DD） */
  due: string | null;
  status: PGoalStatus;
  /** 分解の途中経過（下の Plan） */
  plan: Plan | null;
  created_at: string;
  updated_at: string;
};

/** 分解の途中経過。段を進むごとに足されていく */
export type Plan = {
  /** いま何段目か（1〜7） */
  stage: number;
  /**
   * ① 誰が止まっているか（優先順位を決める3つの問い）。
   * 自分の目標でも、他者に向けた活動でも、同じ問いが立つ。
   */
  stuck?: {
    /** 最も成果が出ていないのは誰か */
    who: string;
    /** その人を止めている一番の原因 */
    cause: string;
    /** 今日、作る／伝える／直すことで前進させられること（いちばんミニマム） */
    smallest: string;
    /** その一手が、なぜ効くのか */
    why: string;
  };
  /** ② お金か、状態か。混ざっていたら split に分け方を入れる */
  split?: {
    kind: PGoalKind;
    /** なぜそう見たのか */
    reason: string;
    /** 混ざっているときの分け方（お金の目標／状態の目標） */
    money?: string;
    state?: string;
  };
  /** ① 数字にした結果 */
  shape?: {
    metric: string; value: number | null; unit: string; due: string;
    /** いま地点（現状の数字） */
    current: number | null;
    /** 埋まっていないもの（本人に聞くこと） */
    unknowns: string[];
  };
  /** ② 分解の筋（2〜3通り）。chosen が選ばれたもの */
  routes?: { key: string; name: string; formula: string; note: string; risk: string }[];
  chosen?: string;
  /** ③ 段（マイルストーン）。期日から逆算した到達点 */
  milestones?: { by: string; target: string; why: string }[];
  /** ④ 抜け漏れの指摘（本人が答えたら反映する） */
  gaps?: { point: string; question: string }[];
  /** 前提（これが崩れたら計画も変わる、と分かるように残す） */
  assumptions?: string[];
};

export type Step = {
  id: string;
  goal_id: string;
  /** どの段のためのものか */
  milestone: string;
  title: string;
  /** 見込みの分数（既定30） */
  minutes: number;
  due: string | null;
  done: boolean;
  order_no: number;
  /** Googleタスクに置いたときのID */
  task_id: string | null;
};

/* ── 読み書き ───────────────────────────────────── */

export async function listPGoals(userId: string): Promise<PGoal[]> {
  const supa = supabaseAdmin();
  const { data, error } = await supa.from("priority_goals")
    .select("*").eq("user_id", userId).neq("status", "done")
    .order("rank", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PGoal[];
}

export async function getPGoal(userId: string, id: string): Promise<PGoal | null> {
  const supa = supabaseAdmin();
  const { data, error } = await supa.from("priority_goals")
    .select("*").eq("user_id", userId).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as PGoal | null;
}

export async function savePGoal(
  userId: string,
  g: { id?: string; rank: number; title: string; subject?: Subject; kind?: PGoalKind; metric?: string; target_value?: number | null; unit?: string; due?: string | null; status?: PGoalStatus; plan?: Plan | null },
): Promise<PGoal> {
  const supa = supabaseAdmin();
  const row: any = {
    user_id: userId,
    rank: Math.max(1, Math.min(3, Math.round(g.rank))),
    title: String(g.title ?? "").trim().slice(0, 200),
    updated_at: new Date().toISOString(),
  };
  if (g.subject !== undefined) row.subject = isSubject(g.subject) ? g.subject : "me";
  if (g.kind !== undefined) row.kind = isGoalKind(g.kind) ? g.kind : "";
  if (g.metric !== undefined) row.metric = String(g.metric ?? "").slice(0, 80);
  if (g.target_value !== undefined) row.target_value = g.target_value;
  if (g.unit !== undefined) row.unit = String(g.unit ?? "").slice(0, 20);
  if (g.due !== undefined) row.due = g.due || null;
  if (g.status !== undefined) row.status = g.status;
  if (g.plan !== undefined) row.plan = g.plan;
  if (g.id) row.id = g.id;

  /*
   * 新しく置くとき、**同じ題名のものが既にあれば、それを返す**。
   *
   * 画面側で連打を止めてはいるが、それだけでは足りない。
   * 通信が遅いとき・電波が切れて押し直したとき・画面を2つ開いているときは、
   * 同じものが2回届く。実際に「AIチームビルディングのお客様を優先する」が
   * 順位1で2つ並んだ。**作る側で止めるのが本筋。**
   */
  if (!g.id && row.title) {
    const { data: dup } = await supa.from("priority_goals")
      .select("*").eq("user_id", userId).eq("title", row.title).neq("status", "done")
      .limit(1);
    const found = (dup ?? [])[0];
    if (found) return found as PGoal;
  }

  const { data, error } = await supa.from("priority_goals")
    .upsert(row, { onConflict: "id" }).select("*").single();
  if (error) throw error;
  return data as PGoal;
}

export async function deletePGoal(userId: string, id: string): Promise<void> {
  const supa = supabaseAdmin();
  await supa.from("goal_steps").delete().eq("user_id", userId).eq("goal_id", id);
  const { error } = await supa.from("priority_goals").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

export async function listSteps(userId: string, goalId: string): Promise<Step[]> {
  const supa = supabaseAdmin();
  const { data, error } = await supa.from("goal_steps")
    .select("*").eq("user_id", userId).eq("goal_id", goalId)
    .order("order_no", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Step[];
}

export async function replaceSteps(
  userId: string, goalId: string,
  steps: { milestone: string; title: string; minutes: number; due: string | null }[],
): Promise<Step[]> {
  const supa = supabaseAdmin();
  // 置き直す前に、Googleタスクに出してあるものは残す（消すと本人の手元から消える）
  await supa.from("goal_steps").delete()
    .eq("user_id", userId).eq("goal_id", goalId).is("task_id", null);
  const rows = steps.slice(0, 200).map((s, i) => ({
    user_id: userId, goal_id: goalId,
    milestone: String(s.milestone ?? "").slice(0, 120),
    title: String(s.title ?? "").slice(0, 200),
    minutes: Math.max(5, Math.min(180, Math.round(s.minutes) || 30)),
    due: s.due || null,
    order_no: i,
  }));
  if (rows.length) {
    const { error } = await supa.from("goal_steps").insert(rows);
    if (error) throw error;
  }
  return listSteps(userId, goalId);
}

export async function updateStep(
  userId: string, id: string,
  patch: { done?: boolean; due?: string | null; minutes?: number; title?: string; task_id?: string | null },
): Promise<void> {
  const supa = supabaseAdmin();
  const row: any = {};
  if (patch.done !== undefined) row.done = !!patch.done;
  if (patch.due !== undefined) row.due = patch.due || null;
  if (patch.minutes !== undefined) row.minutes = Math.max(5, Math.min(180, Math.round(patch.minutes) || 30));
  if (patch.title !== undefined) row.title = String(patch.title).slice(0, 200);
  if (patch.task_id !== undefined) row.task_id = patch.task_id;
  if (Object.keys(row).length === 0) return;
  const { error } = await supa.from("goal_steps").update(row).eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

/* 分解の段（チェーン）は goals-chain.ts に分けてある。
   段ごとの指示文が長いので、読み書きと混ぜるとどちらも追えなくなるため。 */

/** この表を作るSQL（管理画面から見せる） */
export const PRIORITY_MIGRATION = `
create table if not exists priority_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  rank          smallint not null default 1,
  title         text not null default '',
  metric        text not null default '',
  target_value  numeric,
  unit          text not null default '',
  due           date,
  status        text not null default 'active',
  plan          jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists priority_goals_user_idx on priority_goals (user_id, rank);

create table if not exists goal_steps (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  goal_id    uuid not null,
  milestone  text not null default '',
  title      text not null default '',
  minutes    smallint not null default 30,
  due        date,
  done       boolean not null default false,
  order_no   integer not null default 0,
  task_id    text,
  created_at timestamptz not null default now()
);
create index if not exists goal_steps_goal_idx on goal_steps (user_id, goal_id, order_no);
`.trim();
