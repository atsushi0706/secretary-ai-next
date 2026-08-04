/**
 * インナーワールドのゲーム的ステータス。
 *
 * - 🔮 イメージ力：理想（パラレル）にどれだけ触れているか。
 *   → パラレルウォーク提出（walk_logs）＋パラレルトラベルの対話（place=higher）の"別々の日数" ÷ 7。
 * - 🔨 現実化力：理想を現実にどれだけ落としているか。
 *   → 今日のナゾ（higher_quest）を1つ以上こなした"別々の日数" ÷ 7。
 *
 * 事実ベースで、直近7日のローリング。毎日やれば100%、休むと少しずつ下がる（判断材料として）。
 *
 * 今日のナゾ（＝ハイヤークエスト）：理想の状態から今日に落とす小さな一手。最大3個、1個こなせば今日は100%。
 */
import { supabaseAdmin } from "./supabase";
import { jstDateStr, addTask, completeTask, deleteTask, reopenTask, getTasks } from "./google";

// image/real は「直近7日でそれをやった日数」。%ではなく、空想↔現実のバランス（フロー）を見るための生の値。
export type Grounding = { imageDays: number; realDays: number };
// taskId/tasklistId ＝ リアルバース(Googleタスク)との連動リンク。どちらでチェック/削除しても両方に反映するため。
export type QuestItem = { text: string; done: boolean; taskId?: string; tasklistId?: string };
export type TodayQuest = { date: string; items: QuestItem[]; percent: number };

const MAX_ITEMS = 3;

function since7(): string {
  return jstDateStr(new Date(Date.now() - 6 * 86400000)); // 今日を含む直近7日
}

export async function computeGrounding(userId: string): Promise<Grounding> {
  const supa = supabaseAdmin();
  const since = since7();

  const [walks, convs, hq] = await Promise.all([
    supa.from("walk_logs").select("date").eq("user_id", userId).gte("date", since),
    supa.from("shinga_conversations").select("date").eq("user_id", userId).eq("role", "user").in("place", ["walk", "higher"]).gte("date", since),
    supa.from("higher_quest").select("date, items").eq("user_id", userId).gte("date", since),
  ]);

  const imgDays = new Set<string>();
  for (const r of (walks.data ?? []) as { date: string }[]) if (r.date) imgDays.add(r.date);
  for (const r of (convs.data ?? []) as { date: string }[]) if (r.date) imgDays.add(r.date);

  const realDays = new Set<string>();
  for (const r of (hq.data ?? []) as { date: string; items: QuestItem[] }[]) {
    const items = Array.isArray(r.items) ? r.items : [];
    if (items.some((it) => it?.done)) realDays.add(r.date);
  }

  return { imageDays: imgDays.size, realDays: realDays.size };
}

// ── レベル（%制・50%スタート）──────────────────────────
// やれば上がる／やらなければ少しずつ下がる。続けていれば100%を保てる。
// ・初期値 50%
// ・その日ワークをやったら、内容に応じて加算（ぐんぐん上がる）
// ・何もしなかった日は -2%（下がり方はゆるやか）
// ・0〜100 でクランプ
const LEVEL_START = 50;   // 初期値
/**
 * やったこと1つにつき +1。**何をやってもプラス1**（淳くんの指定）。
 *
 * 前は「きもちチェック +2／パラレルウォーク +6／未来からのクエスト +10」のように
 * 行動ごとに重みが違った。だが、どれがどれだけ効くのかは本人には分からないし、
 * 重い行動をした日だけ跳ねるので、動きが読めない。全部そろえて 1 にする。
 * （3つやった日は +3。やった数だけ上がる、という素直な作りにする）
 */
const LEVEL_PER = 1;
/**
 * 何もしなかった日の下がり幅。
 * 上げ幅が 1 になったので、下げも 1 にそろえる（2 のままだと下がる一方になる）。
 */
const LEVEL_DECAY = 1;
export type LevelAction = { key: string; label: string; per: number; days: number; earnedToday: boolean };
export type LevelStatus = { level: number; max: number; actions: LevelAction[] };

const LEVEL_MAX = 100;

export async function computeLevel(userId: string): Promise<LevelStatus> {
  const supa = supabaseAdmin();
  const today = jstDateStr();
  const [emo, walks, hq, letters, cards] = await Promise.all([
    supa.from("emotion_logs").select("date").eq("user_id", userId),
    supa.from("walk_logs").select("date").eq("user_id", userId),
    supa.from("higher_quest").select("date, items").eq("user_id", userId),
    supa.from("link_letter").select("date, read").eq("user_id", userId).eq("read", true),
    supa.from("quest_cards").select("date, done").eq("user_id", userId).eq("done", true).then((r) => r, () => ({ data: [] as any[] })),
  ]);

  const daySet = (rows: { date?: string | null }[] | null | undefined) => {
    const s = new Set<string>();
    for (const r of rows ?? []) if (r?.date) s.add(r.date as string);
    return s;
  };
  const emoDays = daySet(emo.data as any);
  const walkDays = daySet(walks.data as any);
  const letterDays = daySet(letters.data as any);
  const cardDays = daySet((cards as any)?.data as any);
  const questDays = new Set<string>();
  for (const r of (hq.data ?? []) as { date: string; items: QuestItem[] }[]) {
    const items = Array.isArray(r.items) ? r.items : [];
    if (items.some((it) => it?.done)) questDays.add(r.date);
  }

  // 何をやっても +1。行動によって重みを変えない
  const defs: { key: string; label: string; per: number; set: Set<string> }[] = [
    { key: "emotion", label: "きもちをチェックする", per: LEVEL_PER, set: emoDays },
    { key: "letter", label: "未来からの手紙をひらく", per: LEVEL_PER, set: letterDays },
    { key: "walk", label: "パラレルウォークをする", per: LEVEL_PER, set: walkDays },
    { key: "quest", label: "理想を今日に1個おろす", per: LEVEL_PER, set: questDays },
    { key: "card", label: "未来からのクエストに立ち向かう", per: LEVEL_PER, set: cardDays },
  ];

  // 最初にワークをした日から今日まで、1日ずつ「やった分だけ上げ／やらない日は少し下げ」を積む
  const allDays = [...emoDays, ...walkDays, ...letterDays, ...cardDays, ...questDays].sort();
  const startDay = allDays[0] ?? today;
  let level = LEVEL_START;
  const start = new Date(startDay + "T00:00:00+09:00").getTime();
  const end = new Date(today + "T00:00:00+09:00").getTime();
  for (let t = start; t <= end; t += 86400000) {
    const d = jstDateStr(new Date(t));
    let gain = 0;
    for (const def of defs) if (def.set.has(d)) gain += def.per;
    level += gain > 0 ? gain : -LEVEL_DECAY;         // やった日は加算／やらない日はゆるやかに減衰
    level = Math.max(0, Math.min(LEVEL_MAX, level));  // 0〜100 に収める
  }

  const actions: LevelAction[] = defs.map((d) => ({
    key: d.key, label: d.label, per: d.per, days: d.set.size, earnedToday: d.set.has(today),
  }));

  return { level: Math.round(level), max: LEVEL_MAX, actions };
}

function percentOf(items: QuestItem[]): number {
  return items.some((it) => it.done) ? 100 : 0; // 1個こなせば今日は100%
}

export async function getTodayQuest(userId: string): Promise<TodayQuest> {
  const supa = supabaseAdmin();
  const date = jstDateStr();
  const { data, error } = await supa
    .from("higher_quest").select("date, items").eq("user_id", userId).eq("date", date).maybeSingle();
  if (error) throw error;
  const items: QuestItem[] = Array.isArray(data?.items) ? (data!.items as QuestItem[]) : [];
  return { date, items, percent: percentOf(items) };
}

async function saveItems(userId: string, date: string, items: QuestItem[]): Promise<TodayQuest> {
  const supa = supabaseAdmin();
  const { error } = await supa.from("higher_quest").upsert(
    { user_id: userId, date, items, updated_at: new Date().toISOString() },
    { onConflict: "user_id,date" },
  );
  if (error) throw error;
  return { date, items, percent: percentOf(items) };
}

export async function addQuestItem(userId: string, text: string): Promise<TodayQuest> {
  const t = text.trim();
  const { date, items } = await getTodayQuest(userId);
  if (!t || items.length >= MAX_ITEMS) return { date, items, percent: percentOf(items) };
  // リアルバース(Googleタスク)にも同じものを入れて、その日のうちにリアルのタスクにする
  let link: { taskId?: string; tasklistId?: string } = {};
  try {
    const task: any = await addTask(userId, t, { notes: "🔨 インナーワールドのハイヤークエスト（今日おろす理想）", due: `${date}T00:00:00.000Z` });
    if (task?.id) link = { taskId: task.id, tasklistId: "@default" };
  } catch { /* Google未接続でもクエストは機能する（連動なしで進む） */ }
  const next = [...items, { text: t, done: false, ...link }];
  return saveItems(userId, date, next);
}

export async function toggleQuestItem(userId: string, index: number, done: boolean): Promise<TodayQuest> {
  const { date, items } = await getTodayQuest(userId);
  if (index < 0 || index >= items.length) return { date, items, percent: percentOf(items) };
  const it = items[index];
  // リアルバース側も連動（チェック→完了 / 外す→未完了に戻す）
  if (it?.taskId) {
    try {
      if (done) await completeTask(userId, it.tasklistId || "@default", it.taskId);
      else await reopenTask(userId, it.tasklistId || "@default", it.taskId);
    } catch { /* 連動失敗してもインナー側は進める */ }
  }
  const next = items.map((x, i) => (i === index ? { ...x, done } : x));
  return saveItems(userId, date, next);
}

export async function removeQuestItem(userId: string, index: number): Promise<TodayQuest> {
  const { date, items } = await getTodayQuest(userId);
  const it = items[index];
  // リアルバース側のタスクも一緒に消す（どちらか消したら両方消える）
  if (it?.taskId) {
    try { await deleteTask(userId, it.tasklistId || "@default", it.taskId); } catch { /* ignore */ }
  }
  const next = items.filter((_, i) => i !== index);
  return saveItems(userId, date, next);
}

/**
 * リアルバース(Googleタスク)→ インナーの向きを合わせる。
 * リアルバースでチェック(完了)された → クエストも done に。
 * リアルバースで削除された → クエストからも消す。
 * HUD読み込み時に1回だけ呼ぶ（Googleが取れなければ何もしない）。
 */
export async function reconcileQuestWithTasks(userId: string): Promise<void> {
  const supa = supabaseAdmin();
  const date = jstDateStr();
  const { data } = await supa.from("higher_quest").select("items").eq("user_id", userId).eq("date", date).maybeSingle();
  const items: QuestItem[] = Array.isArray(data?.items) ? (data!.items as QuestItem[]) : [];
  const linked = items.filter((it) => it.taskId);
  if (linked.length === 0) return; // 連動対象なし

  let tasks: any[] = [];
  try { tasks = await getTasks(userId, true); } catch { return; } // 完了含めて取得。取れなければ何もしない
  const byId = new Map<string, any>();
  for (const t of tasks) if (t?.id) byId.set(t.id, t);

  let changed = false;
  const next: QuestItem[] = [];
  for (const it of items) {
    if (!it.taskId) { next.push(it); continue; }
    const t = byId.get(it.taskId);
    if (!t) { changed = true; continue; }              // リアルバースで削除 → クエストからも消す
    const doneInReal = t.status === "completed";
    if (doneInReal !== it.done) { changed = true; next.push({ ...it, done: doneInReal }); }
    else next.push(it);
  }
  if (changed) {
    await supa.from("higher_quest").upsert(
      { user_id: userId, date, items: next, updated_at: new Date().toISOString() },
      { onConflict: "user_id,date" },
    );
  }
}
