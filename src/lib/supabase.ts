import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * サーバーサイドで使う Supabase クライアント。
 * service_role キーを使うので、ユーザー認可は呼び出し側で保証すること。
 */
export function supabaseAdmin(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です。.env.local または Vercel 環境変数に設定してください。",
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// 各ユーザーの設定取得
export async function getUserSettings(userId: string) {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// 週次シフト型: 各曜日に "HH:MM-HH:MM" or null(=休み)
export type WeekDayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type WeeklySchedule = Partial<Record<WeekDayKey, string | null>>;

export async function upsertUserSettings(
  userId: string,
  fields: Partial<{
    gemini_api_key: string;
    anthropic_api_key: string;
    ntfy_topic: string;
    work_email: string;
    drive_root_folder_id: string;
    google_refresh_token: string;
    google_scopes: string;
    secretary_name: string;
    secretary_avatar_url: string;
    user_call_name: string;
    birth_date: string | null;
    birth_name: string;
    weekly_schedule: WeeklySchedule | null;
  }>,
) {
  const supa = supabaseAdmin();
  const { error } = await supa
    .from("user_settings")
    .upsert({ user_id: userId, ...fields, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function saveMessage(
  userId: string, date: string, mode: "morning" | "evening",
  role: "user" | "assistant", content: string,
) {
  const supa = supabaseAdmin();
  const { error } = await supa.from("conversations").insert({
    user_id: userId, date, mode, role, content,
  });
  if (error) throw error;
}

export async function loadMessages(
  userId: string, date: string, mode: "morning" | "evening",
) {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("conversations")
    .select("role, content")
    .eq("user_id", userId).eq("date", date).eq("mode", mode)
    .order("id", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function setManualLabel(
  userId: string, googleTaskId: string,
  fields: { category?: string; urgency?: string; importance?: string; time_label?: string; reason?: string },
) {
  const supa = supabaseAdmin();
  const { error } = await supa.from("manual_labels").upsert({
    user_id: userId, google_task_id: googleTaskId, ...fields,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getManualLabels(userId: string) {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("manual_labels").select("*").eq("user_id", userId);
  if (error) throw error;
  const map: Record<string, any> = {};
  for (const row of data ?? []) map[row.google_task_id] = row;
  return map;
}

export async function clearManualLabel(userId: string, googleTaskId: string) {
  const supa = supabaseAdmin();
  await supa.from("manual_labels").delete()
    .eq("user_id", userId).eq("google_task_id", googleTaskId);
}

export async function loadQuickmemo(userId: string): Promise<string> {
  const supa = supabaseAdmin();
  const { data } = await supa.from("quickmemo").select("body")
    .eq("user_id", userId).maybeSingle();
  return data?.body ?? "";
}

export async function saveQuickmemo(userId: string, body: string) {
  const supa = supabaseAdmin();
  await supa.from("quickmemo").upsert({
    user_id: userId, body, updated_at: new Date().toISOString(),
  });
}

// error_logs: API でキャッチした例外を user_id と紐づけて保存。/errors ページで閲覧。
export async function logError(
  userId: string | null,
  route: string,
  err: unknown,
  meta?: Record<string, unknown>,
) {
  try {
    const supa = supabaseAdmin();
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack ?? null : null;
    await supa.from("error_logs").insert({
      user_id: userId,
      route,
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 8000) ?? null,
      meta: meta ?? null,
    });
  } catch (e) {
    // ロギング自体は静かに失敗（本体APIをこれ以上壊さない）
    console.error("[logError] failed to persist", e);
  }
}

export async function listRecentErrors(limit = 100, filterUserId?: string) {
  const supa = supabaseAdmin();
  let q = supa.from("error_logs")
    .select("id, user_id, route, message, stack, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filterUserId) q = q.eq("user_id", filterUserId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// briefings: 朝/夜の本文を保存して、翌日のダッシュボードでも参照できるようにする
// schema: user_id, date, mode, body  (unique: user_id, date, mode)
export async function saveBriefing(
  userId: string, date: string, mode: "morning" | "evening", body: string,
) {
  if (!body || body.length < 20) return; // 短すぎるのは保存しない
  const supa = supabaseAdmin();
  await supa.from("briefings").upsert(
    { user_id: userId, date, mode, body },
    { onConflict: "user_id,date,mode" },
  );
}

export async function loadBriefing(
  userId: string, date: string, mode: "morning" | "evening",
) {
  const supa = supabaseAdmin();
  const { data } = await supa.from("briefings").select("body, created_at")
    .eq("user_id", userId).eq("date", date).eq("mode", mode)
    .maybeSingle();
  return data ?? null;
}
