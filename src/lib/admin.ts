/**
 * 管理者ダッシュボード用のロジック（service_role で全ユーザー横断）。
 * 管理者判定は ADMIN_USER_IDS（カンマ区切りの Google sub）。
 */
import { supabaseAdmin, upsertUserSettings } from "./supabase";
import { fetchGoogleIdentityByToken } from "./google";

export function isAdmin(userId: string | undefined | null): boolean {
  if (!userId) return false;
  const admins = (process.env.ADMIN_USER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return admins.includes(userId);
}

export type AdminUser = {
  userId: string;
  name: string;          // 表示名（呼ばれたい名前 or 本名 or メール or ID断片）
  email: string | null;  // ログインメール（保存できていれば）
  callName: string | null;
  birthName: string | null;
  hasGoogle: boolean;
  hasGemini: boolean;
  hasAnthropic: boolean;
  authExpired: boolean;  // Google連携が切れている（メールを取りに行けない・本人の再ログイン待ち）
  ntfy: boolean;
  push: boolean;
  createdAt: string | null;   // 登録日（user_settings.created_at か updated_at）
  lastActive: string | null;  // 最終アクティビティ（各テーブルの最新日時）
  counts: {
    shinga: number;   // インナーワールドの発言
    walks: number;    // パラレルウォーク
    emotions: number; // 気分チェック
    quests: number;   // クエスト日数
    talks: number;    // 朝夜の会話
    notifs: number;   // 送った通知
  };
};

export type AdminOverview = {
  totalUsers: number;
  users: AdminUser[];
  generatedAt: string;
};

// user_id 列を持つテーブルから user_id と日付列を集計するためのヘルパ
async function tally(
  table: string,
  dateCol: string,
): Promise<Map<string, { count: number; last: string | null }>> {
  const supa = supabaseAdmin();
  const m = new Map<string, { count: number; last: string | null }>();
  try {
    const { data, error } = await supa.from(table).select(`user_id, ${dateCol}`);
    if (error) throw error;
    for (const r of (data ?? []) as any[]) {
      const id = r.user_id;
      if (!id) continue;
      const cur = m.get(id) ?? { count: 0, last: null };
      cur.count++;
      const d = r[dateCol] ? String(r[dateCol]) : null;
      if (d && (!cur.last || d > cur.last)) cur.last = d;
      m.set(id, cur);
    }
  } catch { /* テーブル未作成などは無視 */ }
  return m;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const supa = supabaseAdmin();

  // ベース：user_settings（全ユーザー）
  const { data: settings, error } = await supa
    .from("user_settings")
    .select("*");
  if (error) throw error;

  const [shinga, walks, emotions, quests, talks, notifs, pushRows] = await Promise.all([
    tally("shinga_conversations", "date"),
    tally("walk_logs", "date"),
    tally("emotion_logs", "date"),
    tally("higher_quest", "date"),
    tally("conversations", "date"),
    tally("notifications", "created_at"),
    (async () => {
      try {
        const { data } = await supa.from("push_subscriptions").select("user_id");
        return new Set<string>((data ?? []).map((r: any) => r.user_id).filter(Boolean));
      } catch { return new Set<string>(); }
    })(),
  ]);

  const pick = (s: any) => (typeof s === "string" && s.trim() ? s.trim() : null);

  const users: AdminUser[] = (settings ?? []).map((s: any) => {
    const id = s.user_id as string;
    const email = pick(s.email) ?? pick(s.work_email);
    const callName = pick(s.user_call_name);
    const birthName = pick(s.birth_name);
    const name = pick(s.display_name) || callName || birthName || email || `${id.slice(0, 8)}…`;
    const lasts = [
      shinga.get(id)?.last, walks.get(id)?.last, emotions.get(id)?.last,
      quests.get(id)?.last, talks.get(id)?.last, notifs.get(id)?.last,
    ].filter(Boolean) as string[];
    const lastActive = lasts.length ? lasts.sort().slice(-1)[0] : null;
    return {
      userId: id,
      name,
      email,
      callName,
      birthName,
      hasGoogle: !!s.google_refresh_token,
      hasGemini: !!s.gemini_api_key,
      hasAnthropic: !!s.anthropic_api_key,
      authExpired: false,
      ntfy: !!pick(s.ntfy_topic),
      push: pushRows.has(id),
      createdAt: pick(s.created_at) ?? pick(s.updated_at),
      lastActive,
      counts: {
        shinga: shinga.get(id)?.count ?? 0,
        walks: walks.get(id)?.count ?? 0,
        emotions: emotions.get(id)?.count ?? 0,
        quests: quests.get(id)?.count ?? 0,
        talks: talks.get(id)?.count ?? 0,
        notifs: notifs.get(id)?.count ?? 0,
      },
    };
  });

  // メール未取得だが Google 連携済みのユーザーは、保存済みトークンで Google から
  // メール・名前を取りに行き、DBに保存（次回以降は即表示）。
  // ※Googleが遅い/トークン失効でも画面を落とさないよう、全体を時間制限＋完全ガードにする。
  const settingsById = new Map<string, any>((settings ?? []).map((s: any) => [s.user_id, s]));
  const needFill = users.filter((u) => !u.email && settingsById.get(u.userId)?.google_refresh_token).slice(0, 20);
  if (needFill.length) {
    const withTimeout = <T,>(p: Promise<T>, ms: number, fb: T): Promise<T> =>
      Promise.race([p, new Promise<T>((res) => setTimeout(() => res(fb), ms))]);
    const backfill = Promise.all(needFill.map(async (u) => {
      try {
        const token = settingsById.get(u.userId)?.google_refresh_token;
        const id = await withTimeout(
          fetchGoogleIdentityByToken(token),
          3500,
          { email: null, name: null, status: "error" as const },
        );
        if (id.email || id.name) {
          u.email = id.email ?? u.email;
          if (id.name && ((!u.callName && !u.birthName) || u.name.endsWith("…"))) u.name = id.name;
          try {
            await upsertUserSettings(u.userId, {
              ...(id.email ? { email: id.email } : {}),
              ...(id.name ? { display_name: id.name } : {}),
            });
          } catch { /* 列が無い等は無視 */ }
        } else if (id.status === "expired") {
          u.authExpired = true; // 連携切れ＝本人の再ログインが必要
        }
      } catch { /* このユーザーの補完失敗は無視 */ }
    }));
    // 全体でも上限を設ける（Googleが全滅でも画面は返す）
    try { await withTimeout(backfill, 7000, undefined as any); } catch { /* ignore */ }
  }

  // 最終アクティビティが新しい順
  users.sort((a, b) => (b.lastActive ?? "").localeCompare(a.lastActive ?? ""));

  return { totalUsers: users.length, users, generatedAt: new Date().toISOString() };
}

/** そのユーザーの通知だけ解除（push購読を全削除＋ntfyトピックを消す）。データは残す。 */
export async function disableUserNotifications(userId: string): Promise<void> {
  const supa = supabaseAdmin();
  try { await supa.from("push_subscriptions").delete().eq("user_id", userId); } catch { /* ignore */ }
  try { await supa.from("user_settings").update({ ntfy_topic: null }).eq("user_id", userId); } catch { /* ignore */ }
}

/** そのユーザーを完全に解除（全テーブルのデータ削除）。取り消せない。 */
const USER_TABLES = [
  "push_subscriptions", "notifications", "shinga_conversations", "walk_logs",
  "emotion_logs", "higher_quest", "daily_focus", "goals", "hero", "link_letter",
  "quests", "task_links", "quest_reflections", "extracted_tasks", "manual_labels",
  "briefings", "quickmemo", "classify_cache", "conversations", "shinga_conversations",
  "error_logs", "user_settings",
];
export async function deleteUserCompletely(userId: string): Promise<{ removed: string[]; skipped: string[] }> {
  const supa = supabaseAdmin();
  const removed: string[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();
  for (const t of USER_TABLES) {
    if (seen.has(t)) continue;
    seen.add(t);
    try {
      const { error } = await supa.from(t).delete().eq("user_id", userId);
      if (error) throw error;
      removed.push(t);
    } catch (e: any) {
      skipped.push(`${t}: ${String(e?.message ?? e)}`);
    }
  }
  // ストレージの画像（avatars バケットの userId フォルダ）も掃除
  try {
    const { data } = await supa.storage.from("avatars").list(userId);
    const paths = (data ?? []).map((f: any) => `${userId}/${f.name}`);
    if (paths.length) await supa.storage.from("avatars").remove(paths);
  } catch { /* ignore */ }
  return { removed, skipped };
}
