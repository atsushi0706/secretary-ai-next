/**
 * 「今日終わらす」タスクの進捗を計算する共通ロジック。
 * - baseline: その日 window="today" に現れたタスクの重み合計（固定）。
 *   一度入ったら消えない。新規追加されたタスクは追加で baseline 入り。
 * - completed: 完了 or 削除されたタスクの重み積算。
 * - 進捗 = completed / baseline × 100。100% を超えることもある。
 * - 1日マイ自動リセット（localStorage キーに日付が入る）。
 */

const TIME_WEIGHT_MIN: Record<string, number> = {
  quick: 15, mid: 45, long: 120, today: 45, days: 120,
};

export type TodayTask = {
  id: string;
  title: string;
  window?: string;
  label?: { time?: string };
};

export function weightOf(t: TodayTask): number {
  const tk = (t.label?.time ?? "mid") as string;
  return TIME_WEIGHT_MIN[tk] ?? 45;
}

export function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Snapshot = {
  date: string;
  baseline: Record<string, { weight: number; title: string }>;
  completed: Record<string, { weight: number; completedAt: string }>;
};

function storageKey(date: string) {
  return `secretary-ai-next.todayProgress.${date}`;
}

function loadSnapshot(): Snapshot {
  if (typeof window === "undefined") {
    return { date: todayDateStr(), baseline: {}, completed: {} };
  }
  const today = todayDateStr();
  try {
    const raw = localStorage.getItem(storageKey(today));
    if (raw) {
      const s = JSON.parse(raw) as Snapshot;
      if (s.date === today && s.baseline && s.completed) return s;
    }
  } catch { /* ignore */ }
  return { date: today, baseline: {}, completed: {} };
}

function saveSnapshot(s: Snapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(s.date), JSON.stringify(s));
}

export type TodayProgress = {
  pct: number;            // 100超えあり
  pctClamped: number;     // 0-100 (リング描画用)
  baselineMin: number;
  completedMin: number;
  baselineCount: number;
  completedCount: number;
};

/**
 * tasks を受け取って snapshot を更新し、進捗を返す。
 * 副作用: 必要なら localStorage に書き込み。
 */
export function syncTodayProgress(tasks: TodayTask[]): TodayProgress {
  const snap = loadSnapshot();
  let changed = false;

  // 「今日終わらす」タスクを baseline に追加（一度入ったら消えない）
  const todayTasks = tasks.filter((t) => t.window === "today");
  for (const t of todayTasks) {
    if (!snap.baseline[t.id]) {
      snap.baseline[t.id] = { weight: weightOf(t), title: t.title };
      changed = true;
    }
  }

  // 完了判定: baseline にあるが現在の active(未完了)一覧にいない → 完了扱い
  const activeIds = new Set(tasks.map((t) => t.id));
  for (const [id, info] of Object.entries(snap.baseline)) {
    if (!activeIds.has(id) && !snap.completed[id]) {
      snap.completed[id] = { weight: info.weight, completedAt: new Date().toISOString() };
      changed = true;
    }
  }
  // 誤チェック取り消し: completed にあるが現在 active に戻ってきたら完了を取り消す
  for (const id of activeIds) {
    if (snap.completed[id]) {
      delete snap.completed[id];
      changed = true;
    }
  }

  if (changed) saveSnapshot(snap);

  const baselineMin = Object.values(snap.baseline).reduce((a, v) => a + v.weight, 0);
  const completedMin = Object.values(snap.completed).reduce((a, v) => a + v.weight, 0);
  const pct = baselineMin > 0 ? Math.round((completedMin / baselineMin) * 100) : 0;
  return {
    pct,
    pctClamped: Math.max(0, Math.min(100, pct)),
    baselineMin,
    completedMin,
    baselineCount: Object.keys(snap.baseline).length,
    completedCount: Object.keys(snap.completed).length,
  };
}
