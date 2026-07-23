/**
 * インナーワールド（自己開示・自己探求の領域）のデータアクセス層。
 *
 * 設計方針:
 * - 既存テーブル (user_settings / conversations / manual_labels ...) には一切触らない。
 * - タスク本体は Google Tasks 側にあるため、出自情報は task_links で外付けする。
 * - テーブル未作成でも既存機能が絶対に死なないよう、読み取り系は空を返してフォールバックする。
 */
import { supabaseAdmin } from "./supabase";

export type QuestStatus = "idea" | "active" | "paused" | "done";

export type Quest = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  category: string;
  status: QuestStatus;
  source_conversation_id: number | null;
  created_at: string;
  updated_at: string;
};

export type TaskLink = {
  user_id: string;
  google_task_id: string;
  source_type: string | null;
  source_quest_id: string | null;
  source_conversation_id: number | null;
};

export type Reflection = {
  id: number;
  user_id: string;
  quest_id: string;
  google_task_id: string | null;
  body: string;
  emotion_before: number | null;
  emotion_after: number | null;
  gap: string | null;
  next_step: string | null;
  created_at: string;
};

export type EmotionLog = {
  id: number;
  user_id: string;
  date: string;
  /** 'morning' / 'evening'。1日2回まで */
  slot: string | null;
  /** 心の状態 1〜10 */
  level: number;
  /** 体のエネルギー 1〜10（任意） */
  energy: number | null;
  note: string;
  quest_id: string | null;
  created_at: string;
};

/** Supabase に該当テーブルが無い (= マイグレーション未実行) かどうか */
export function isMissingTable(e: any): boolean {
  const code = e?.code ?? "";
  const msg = String(e?.message ?? e ?? "");
  return code === "42P01" || /does not exist|schema cache/i.test(msg);
}

export const MIGRATION_HINT =
  "インナーワールド用のテーブルがまだ作られていません。Supabase の SQL Editor で supabase/schema.sql を実行してください。";

// ── クエスト ────────────────────────────────────────────────

export async function listQuests(userId: string): Promise<Quest[]> {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("quests")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Quest[];
}

export async function getQuest(userId: string, id: string): Promise<Quest | null> {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("quests")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Quest) ?? null;
}

export async function createQuest(
  userId: string,
  fields: { title: string; body?: string; category?: string; status?: QuestStatus; source_conversation_id?: number | null },
): Promise<Quest> {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("quests")
    .insert({
      user_id: userId,
      title: fields.title,
      body: fields.body ?? "",
      category: fields.category ?? "life",
      status: fields.status ?? "active",
      source_conversation_id: fields.source_conversation_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Quest;
}

export async function updateQuest(
  userId: string,
  id: string,
  fields: Partial<Pick<Quest, "title" | "body" | "category" | "status">>,
): Promise<Quest | null> {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("quests")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("user_id", userId)   // ユーザー分離: 他人のクエストは絶対に触れない
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return (data as Quest) ?? null;
}

export async function deleteQuest(userId: string, id: string): Promise<void> {
  const supa = supabaseAdmin();
  const { error } = await supa.from("quests").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
  // 紐づいていたタスクリンクは「出自なし」に戻す (タスク本体は消さない)
  await supa.from("task_links").delete().eq("user_id", userId).eq("source_quest_id", id);
}

// ── タスクの出自リンク ──────────────────────────────────────

export async function linkTask(
  userId: string,
  googleTaskId: string,
  fields: { sourceType?: string; sourceQuestId?: string | null; sourceConversationId?: number | null },
): Promise<void> {
  const supa = supabaseAdmin();
  const { error } = await supa.from("task_links").upsert({
    user_id: userId,
    google_task_id: googleTaskId,
    source_type: fields.sourceType ?? null,
    source_quest_id: fields.sourceQuestId ?? null,
    source_conversation_id: fields.sourceConversationId ?? null,
  });
  if (error) throw error;
}

/**
 * user の全タスクリンクを google_task_id => link のマップで返す。
 * テーブル未作成でも既存ダッシュボードを落とさないため、失敗時は {} を返す。
 */
export async function getTaskLinks(userId: string): Promise<Record<string, TaskLink>> {
  try {
    const supa = supabaseAdmin();
    const { data, error } = await supa.from("task_links").select("*").eq("user_id", userId);
    if (error) throw error;
    const map: Record<string, TaskLink> = {};
    for (const row of (data ?? []) as TaskLink[]) map[row.google_task_id] = row;
    return map;
  } catch (e) {
    if (!isMissingTable(e)) console.error("[getTaskLinks] failed:", e);
    return {};
  }
}

export async function unlinkTask(userId: string, googleTaskId: string): Promise<void> {
  try {
    const supa = supabaseAdmin();
    await supa.from("task_links").delete().eq("user_id", userId).eq("google_task_id", googleTaskId);
  } catch (e) {
    if (!isMissingTable(e)) console.error("[unlinkTask] failed:", e);
  }
}

/** クエストごとのタスク件数 (quest_id => 件数) */
export async function countTasksByQuest(userId: string): Promise<Record<string, number>> {
  const links = await getTaskLinks(userId);
  const counts: Record<string, number> = {};
  for (const l of Object.values(links)) {
    if (!l.source_quest_id) continue;
    counts[l.source_quest_id] = (counts[l.source_quest_id] ?? 0) + 1;
  }
  return counts;
}

// ── インナーワールドでの会話 ──────────────────────────────────

export type ShingaMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  place: string | null;
  created_at: string;
};

export async function saveShingaMessage(
  userId: string, date: string,
  role: "user" | "assistant", content: string, place: string | null,
): Promise<void> {
  const supa = supabaseAdmin();
  const { error } = await supa.from("shinga_conversations").insert({
    user_id: userId, date, role, content, place,
  });
  if (error) throw error;
}

/** 直近 limit 件を古い順で返す（全件読むと会話が伸びるほど重くなるため） */
export async function loadShingaMessages(userId: string, limit = 30): Promise<ShingaMessage[]> {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("shinga_conversations")
    .select("id, role, content, place, created_at")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as ShingaMessage[]).reverse();
}

// ── パラレルウォークの記録 ──────────────────────────────────

export type WalkLog = {
  id: number;
  date: string;
  summary: string;
  created_at: string;
};

export async function saveWalkLog(userId: string, date: string, summary: string): Promise<WalkLog> {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("walk_logs")
    .insert({ user_id: userId, date, summary })
    .select("id, date, summary, created_at")
    .single();
  if (error) throw error;
  return data as WalkLog;
}

export async function listWalkLogs(userId: string, limit = 30): Promise<WalkLog[]> {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("walk_logs")
    .select("id, date, summary, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WalkLog[];
}

// ── 振り返り ────────────────────────────────────────────────

export async function listReflections(userId: string, questId?: string): Promise<Reflection[]> {
  const supa = supabaseAdmin();
  let q = supa
    .from("quest_reflections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (questId) q = q.eq("quest_id", questId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Reflection[];
}

export async function createReflection(
  userId: string,
  fields: {
    quest_id: string;
    google_task_id?: string | null;
    body: string;
    emotion_before?: number | null;
    emotion_after?: number | null;
    gap?: string | null;
    next_step?: string | null;
  },
): Promise<Reflection> {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("quest_reflections")
    .insert({ user_id: userId, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data as Reflection;
}

// ── 感情の10段階記録 ────────────────────────────────────────

export async function listEmotions(userId: string, limit = 60): Promise<EmotionLog[]> {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("emotion_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as EmotionLog[];
}

export async function createEmotion(
  userId: string,
  fields: {
    date: string;
    slot: string;
    level: number;
    energy?: number | null;
    note?: string;
    quest_id?: string | null;
  },
): Promise<EmotionLog> {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("emotion_logs")
    .insert({
      user_id: userId,
      date: fields.date,
      slot: fields.slot,
      level: fields.level,
      energy: fields.energy ?? null,
      note: fields.note ?? "",
      quest_id: fields.quest_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;   // 同じ枠の2回目は一意制約(23505)で弾かれる
  return data as EmotionLog;
}
