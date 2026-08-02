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
