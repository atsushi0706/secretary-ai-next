/**
 * アプリ全体の設定（app_config：key-value）。サーバ専用。
 *
 * いまの用途：ワークの鍵。
 * 親アカウント（管理者）は常に全ワークが使える。
 * それ以外のユーザーには、管理画面からワークごとに鍵をかけられる。
 * テーブルが無い・読めないときは「全部開いている」に倒す（既存の動きを壊さない）。
 */
import { supabaseAdmin } from "./supabase";

const LOCKS_KEY = "work_locks";

export async function getLockedWorks(): Promise<string[]> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("app_config").select("value").eq("key", LOCKS_KEY).maybeSingle();
    const list = (data?.value as any)?.locked;
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

export async function setLockedWorks(locked: string[]): Promise<void> {
  const supa = supabaseAdmin();
  await supa.from("app_config").upsert(
    { key: LOCKS_KEY, value: { locked }, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
}

/* ══════════════════════════════════════════════════════════════
   ひとりずつ開ける機能（発信スタジオなど）

   ワークの鍵（work_locks）は「全員に効く／管理者だけ素通し」という作りで、
   個人ごとに開け閉めできない。
   まだ配りたくないものは、**既定で全員に鍵**をかけておき、
   管理画面で「この人には開ける」と決めた人だけが使えるようにする。
   ══════════════════════════════════════════════════════════════ */

const GRANTS_KEY = "feature_grants";

/** ひとりずつ開ける対象の機能 */
export type FeatureKey = "broadcast" | "dreamkiller" | "mindmap" | "money";
export const GRANTABLE: { key: FeatureKey; label: string; note: string }[] = [
  { key: "broadcast", label: "発信スタジオ", note: "SNS用の文章をつくる部屋。" },
  { key: "dreamkiller", label: "ドリームキラー", note: "パラレルウォークの途中に現れて、言い返す相手。" },
  { key: "mindmap", label: "マインドマップ", note: "話した内容を整理して、30分の粒まで割る道具。" },
  { key: "money", label: "マネーオーダー", note: "見えない資産を見つけて、受け取りを許すワーク。" },
];
export const isFeatureKey = (v: unknown): v is FeatureKey =>
  typeof v === "string" && GRANTABLE.some((g) => g.key === v);

/**
 * 開け閉めの決まり。
 *
 * 【なぜ一覧ではなく「既定＋例外」にしたか】
 * 最初は「開いている人の一覧」で持っていた。
 * だが人が何百人と増えると、一人ずつ押して回るのは現実的でない。
 *   ・all=true  … 既定で全員に開ける（except に入れた人だけ閉じる）
 *   ・all=false … 既定で全員に鍵（except に入れた人だけ開ける）
 * 一括で切り替えられて、個別の例外も残せる。
 */
export type FeatureRule = { all: boolean; except: string[] };
export type FeatureGrants = Record<FeatureKey, FeatureRule>;

const EMPTY: FeatureRule = { all: false, except: [] };

/** 古い形（開いている人の一覧）も読めるようにする */
function toRule(v: any): FeatureRule {
  if (Array.isArray(v)) return { all: false, except: v.map(String) };   // 昔の形
  if (v && typeof v === "object") {
    return { all: !!v.all, except: Array.isArray(v.except) ? v.except.map(String) : [] };
  }
  return { ...EMPTY, except: [] };
}

export async function getFeatureGrants(): Promise<FeatureGrants> {
  const out = Object.fromEntries(
    GRANTABLE.map((g) => [g.key, { ...EMPTY, except: [] as string[] }]),
  ) as unknown as FeatureGrants;
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("app_config").select("value").eq("key", GRANTS_KEY).maybeSingle();
    const v = (data?.value ?? {}) as any;
    for (const g of GRANTABLE) out[g.key] = toRule(v[g.key]);
    return out;
  } catch {
    // 表がまだ無いときは「誰にも開いていない」に倒す。
    // 開きっぱなしで配ってしまうより安全。
    return out;
  }
}

/** その人に、その機能が開いているか（既定と例外の組み合わせ） */
export function ruleAllows(rule: FeatureRule, userId: string): boolean {
  return rule.all !== rule.except.includes(userId);
}

export async function hasFeature(userId: string, key: FeatureKey): Promise<boolean> {
  const g = await getFeatureGrants();
  return ruleAllows(g[key], userId);
}

async function save(next: FeatureGrants): Promise<FeatureGrants> {
  const supa = supabaseAdmin();
  const { error } = await supa.from("app_config").upsert(
    { key: GRANTS_KEY, value: next, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) throw error;
  return next;
}

/** 全員まとめて開ける／閉じる。例外は消して、まっさらにする */
export async function setFeatureAll(key: FeatureKey, all: boolean): Promise<FeatureGrants> {
  const cur = await getFeatureGrants();
  return save({ ...cur, [key]: { all, except: [] } });
}

/** ひとりぶんの開け閉め（既定と違う扱いにする＝例外に入れる／外す） */
export async function setFeatureGrant(key: FeatureKey, userId: string, on: boolean): Promise<FeatureGrants> {
  const cur = await getFeatureGrants();
  const rule = cur[key];
  const set = new Set(rule.except);
  // 既定と同じなら例外から外す。違うなら例外に入れる
  if (on === rule.all) set.delete(userId); else set.add(userId);
  return save({ ...cur, [key]: { all: rule.all, except: Array.from(set) } });
}
