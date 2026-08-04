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
export type FeatureKey = "broadcast";
export const GRANTABLE: { key: FeatureKey; label: string; note: string }[] = [
  { key: "broadcast", label: "発信スタジオ", note: "SNS用の文章をつくる部屋。既定は鍵。" },
];
export const isFeatureKey = (v: unknown): v is FeatureKey =>
  typeof v === "string" && GRANTABLE.some((g) => g.key === v);

/** { broadcast: [userId, ...] } */
export type FeatureGrants = Partial<Record<FeatureKey, string[]>>;

export async function getFeatureGrants(): Promise<FeatureGrants> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("app_config").select("value").eq("key", GRANTS_KEY).maybeSingle();
    const v = (data?.value ?? {}) as any;
    const out: FeatureGrants = {};
    for (const g of GRANTABLE) {
      out[g.key] = Array.isArray(v[g.key]) ? v[g.key].map(String) : [];
    }
    return out;
  } catch {
    // 表がまだ無いときは「誰にも開いていない」に倒す。
    // 鍵の側に倒すのが安全（開きっぱなしで配ってしまうより良い）。
    return Object.fromEntries(GRANTABLE.map((g) => [g.key, []])) as FeatureGrants;
  }
}

/** その人に、その機能が開いているか */
export async function hasFeature(userId: string, key: FeatureKey): Promise<boolean> {
  const g = await getFeatureGrants();
  return (g[key] ?? []).includes(userId);
}

/** ひとりぶんの開け閉め */
export async function setFeatureGrant(key: FeatureKey, userId: string, on: boolean): Promise<FeatureGrants> {
  const cur = await getFeatureGrants();
  const set = new Set(cur[key] ?? []);
  if (on) set.add(userId); else set.delete(userId);
  const next: FeatureGrants = { ...cur, [key]: Array.from(set) };
  const supa = supabaseAdmin();
  const { error } = await supa.from("app_config").upsert(
    { key: GRANTS_KEY, value: next, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) throw error;
  return next;
}
