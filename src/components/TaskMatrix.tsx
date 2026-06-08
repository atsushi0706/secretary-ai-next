"use client";

import { useEffect, useState } from "react";
import type { TodayProgress } from "@/lib/todayProgress";

type TimeKey = "quick" | "mid" | "long";
type Win3 = "today" | "this_week" | "this_month";

type Task = {
  id: string;
  tasklist_id: string;
  title: string;
  due: string | null;
  label: { category: string; urgency: string; importance: string; time: string };
  bucket: "urgent_work" | "important_work" | "personal" | "by_time";
  window: Win3;
};

const WIN_LABEL: Record<Win3, string> = {
  today: "🔥 今日終わらす",
  this_week: "📅 今週",
  this_month: "🗓 今月",
};

const WIN_COLOR: Record<Win3, string> = {
  today: "#e2574c",
  this_week: "#e0a82e",
  this_month: "#3a78c2",
};

const WIN_BG: Record<Win3, string> = {
  today: "linear-gradient(135deg, #fdecec 0%, #fff7f5 100%)",
  this_week: "linear-gradient(135deg, #fdf4e0 0%, #fffaeb 100%)",
  this_month: "linear-gradient(135deg, #e9f0fa 0%, #f4f8fd 100%)",
};

const TIME_LABEL: Record<string, string> = {
  quick: "⚡すぐ",
  mid: "📅30分〜1時間",
  long: "🗓1〜3時間",
  today: "📅30分〜1時間",
  days: "🗓1〜3時間",
};

const TIME_WEIGHT_MIN: Record<string, number> = {
  quick: 15, mid: 45, long: 120, today: 45, days: 120,
};

function normalizeTime(t: string | undefined): TimeKey {
  if (t === "quick") return "quick";
  if (t === "mid" || t === "today") return "mid";
  if (t === "long" || t === "days") return "long";
  return "mid";
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function seenKey(date: string, winKey: Win3): string {
  return `secretary-ai-next.bucketSeen.${date}.${winKey}`;
}

type Seen = Record<string, { weight: number; title: string }>;

function loadSeen(winKey: Win3): Seen {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(seenKey(todayDateStr(), winKey)) || "{}");
  } catch { return {}; }
}

function saveSeen(winKey: Win3, seen: Seen) {
  if (typeof window === "undefined") return;
  localStorage.setItem(seenKey(todayDateStr(), winKey), JSON.stringify(seen));
}

function priorityScore(t: Task): number {
  const u = t.label.urgency === "high" ? 1 : 0;
  const i = t.label.importance === "high" ? 1 : 0;
  return u * 2 + i;
}

// 丸メーター（中央に数字、100%超え時はゴールド）
function CategoryRing({
  percent, color, size = 56, centerLabel, overflow,
}: {
  percent: number;
  color: string;
  size?: number;
  centerLabel?: string;
  overflow?: boolean;
}) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c * (1 - clamped / 100);
  const ringColor = overflow ? "#e69500" : color;
  const textColor = overflow ? "#b87600" : "#2c2c2e";
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={ringColor} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .5s ease" }}
      />
      <text
        x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize={size * (centerLabel && centerLabel.length >= 3 ? 0.30 : 0.36)} fontWeight={800} fill={textColor}
      >
        {centerLabel ?? String(clamped)}
      </text>
    </svg>
  );
}

export function TaskMatrix({
  tasks, onRefresh, todayProgress,
}: {
  tasks: Task[];
  onRefresh: () => void;
  todayProgress?: TodayProgress;
}) {
  const groups: Record<Win3, Task[]> = { today: [], this_week: [], this_month: [] };
  for (const t of tasks) {
    const w = (t.window ?? "this_week") as Win3;
    (groups[w] ?? groups.this_week).push(t);
  }
  // 各枠内: priority 高い順、同点なら due 近い順
  for (const k of Object.keys(groups) as Win3[]) {
    groups[k].sort((a, b) => {
      const ds = priorityScore(b) - priorityScore(a);
      if (ds !== 0) return ds;
      const da = a.due ?? "9999-12-31";
      const db = b.due ?? "9999-12-31";
      return da.localeCompare(db);
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {(["today", "this_week", "this_month"] as Win3[]).map((wk) => (
        <CategoryCard
          key={wk}
          winKey={wk}
          items={groups[wk]}
          onRefresh={onRefresh}
          todayProgress={wk === "today" ? todayProgress : undefined}
        />
      ))}
    </div>
  );
}

function CategoryCard({
  winKey, items, onRefresh, todayProgress,
}: {
  winKey: Win3;
  items: Task[];
  onRefresh: () => void;
  todayProgress?: TodayProgress;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState<TimeKey>("mid");
  const [newUrgent, setNewUrgent] = useState(false);
  const [newImportant, setNewImportant] = useState(true);
  const [seen, setSeen] = useState<Seen>({});

  // 「今日この枠で見た」スナップショットを更新（追加されたら蓄積、日付変わると別キーで0から）
  // ※today枠は todayProgress が外部から来るので、seen は使わない
  useEffect(() => {
    if (winKey === "today") return;
    const s = loadSeen(winKey);
    let changed = false;
    for (const t of items) {
      if (!s[t.id]) {
        const tk = normalizeTime(t.label.time);
        s[t.id] = { weight: TIME_WEIGHT_MIN[tk] ?? 45, title: t.title };
        changed = true;
      }
    }
    if (changed) saveSeen(winKey, s);
    setSeen(s);
  }, [items, winKey]);

  // 完了率算出: today枠は外部の todayProgress を使う、それ以外は seen ベース
  let pct: number;
  let pctClamped: number;
  let doneMin: number;
  let totalMin: number;
  let overflow: boolean;
  if (winKey === "today" && todayProgress) {
    pct = todayProgress.pct;
    pctClamped = todayProgress.pctClamped;
    doneMin = todayProgress.completedMin;
    totalMin = todayProgress.baselineMin;
    overflow = pct > 100;
  } else {
    const currentIds = new Set(items.map((t) => t.id));
    doneMin = 0; totalMin = 0;
    for (const [id, info] of Object.entries(seen)) {
      totalMin += info.weight;
      if (!currentIds.has(id)) doneMin += info.weight;
    }
    pct = totalMin > 0 ? Math.round((doneMin / totalMin) * 100) : 0;
    pctClamped = Math.max(0, Math.min(100, pct));
    overflow = false;
  }

  // 期限の自動補完（今日/今週末/今月末）
  function defaultDue(): string {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (winKey === "today") return todayDateStr();
    if (winKey === "this_week") {
      const dow = d.getDay();
      const add = (7 - dow) % 7; // 日曜まで
      const t = new Date(d); t.setDate(d.getDate() + add);
      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    }
    const t = new Date(d.getFullYear(), d.getMonth() + 1, 0); // 今月末
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }

  async function addNew() {
    if (!newTitle.trim()) return;
    await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        title: newTitle,
        due: defaultDue(),
        category: "work",
        urgency: newUrgent ? "high" : "low",
        importance: newImportant ? "high" : "low",
        time: newTime,
      }),
    });
    setAdding(false); setNewTitle(""); setNewUrgent(false); setNewImportant(true); setNewTime("mid");
    onRefresh();
  }

  async function complete(t: Task) {
    await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", tasklistId: t.tasklist_id, taskId: t.id }),
    });
    onRefresh();
  }

  async function del(t: Task) {
    if (!confirm(`削除: ${t.title}?`)) return;
    await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", tasklistId: t.tasklist_id, taskId: t.id }),
    });
    onRefresh();
  }

  async function moveTo(t: Task, target: Win3) {
    // window の移動は due 日付の変更で行う
    let newDue: string;
    if (target === "today") newDue = todayDateStr();
    else if (target === "this_week") {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      const dow = d.getDay();
      const add = (7 - dow) % 7;
      d.setDate(d.getDate() + add);
      newDue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } else {
      const d = new Date(); const t2 = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      newDue = `${t2.getFullYear()}-${String(t2.getMonth() + 1).padStart(2, "0")}-${String(t2.getDate()).padStart(2, "0")}`;
    }
    // 既存タスクの due を更新するAPIがないので、delete + add で簡易対応
    // → タスクID変わるが、UX的にはOK
    await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        title: t.title,
        due: newDue,
        category: t.label.category,
        urgency: t.label.urgency,
        importance: t.label.importance,
        time: normalizeTime(t.label.time),
      }),
    });
    await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", tasklistId: t.tasklist_id, taskId: t.id }),
    });
    onRefresh();
  }

  async function changeTime(t: Task, time: TimeKey) {
    await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "label",
        taskId: t.id,
        category: t.label.category,
        urgency: t.label.urgency,
        importance: t.label.importance,
        time,
      }),
    });
    onRefresh();
  }

  async function togglePriority(t: Task, field: "urgency" | "importance") {
    const newVal = t.label[field] === "high" ? "low" : "high";
    await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "label",
        taskId: t.id,
        category: t.label.category,
        urgency: field === "urgency" ? newVal : t.label.urgency,
        importance: field === "importance" ? newVal : t.label.importance,
        time: normalizeTime(t.label.time),
      }),
    });
    onRefresh();
  }

  return (
    <div
      className="rounded-2xl border border-purple-100 shadow-sm overflow-hidden"
      style={{ background: WIN_BG[winKey] }}
    >
      {/* ヘッダ */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur-sm border-b border-white/80">
        <CategoryRing
          percent={pctClamped}
          color={WIN_COLOR[winKey]}
          size={54}
          centerLabel={overflow ? `${pct}` : `${pctClamped}`}
          overflow={overflow}
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm" style={{ color: WIN_COLOR[winKey] }}>
            {WIN_LABEL[winKey]}
            {overflow && <span className="ml-1 text-[10px] text-amber-600 font-normal">🎉</span>}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            {items.length}件 残り ／ {Math.floor(Math.max(0, totalMin - doneMin) / 60)}h{Math.max(0, totalMin - doneMin) % 60}m
          </div>
        </div>
        <button
          className="w-8 h-8 rounded-lg bg-white text-purple-700 font-bold hover:bg-purple-50 border border-purple-100 shadow-sm"
          onClick={() => setAdding((v) => !v)}
          title="このマスにタスク追加"
        >
          {adding ? "×" : "＋"}
        </button>
      </div>

      {/* 追加フォーム */}
      {adding && (
        <div className="bg-white/70 backdrop-blur-sm p-3 space-y-2 border-b border-white/80">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="やること"
            className="w-full p-2 border rounded-lg text-sm"
            autoFocus
          />
          <div className="flex gap-2 items-center flex-wrap text-xs">
            <select
              value={newTime}
              onChange={(e) => setNewTime(e.target.value as TimeKey)}
              className="p-1 border rounded"
            >
              <option value="quick">⚡すぐ</option>
              <option value="mid">📅30分〜1時間</option>
              <option value="long">🗓1〜3時間</option>
            </select>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={newUrgent} onChange={(e) => setNewUrgent(e.target.checked)} />
              緊急
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={newImportant} onChange={(e) => setNewImportant(e.target.checked)} />
              重要
            </label>
          </div>
          <button
            onClick={addNew}
            disabled={!newTitle.trim()}
            className="w-full bg-purple-500 text-white text-xs font-bold py-2 rounded disabled:opacity-50"
          >
            追加（期限: {defaultDue()}）
          </button>
        </div>
      )}

      {/* タスクリスト */}
      <div className="p-3 space-y-1 min-h-[80px]">
        {items.length === 0 ? (
          <div className="text-xs text-gray-400 py-4 text-center">なし</div>
        ) : (
          items.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              winKey={winKey}
              onComplete={complete}
              onDelete={del}
              onMove={moveTo}
              onChangeTime={changeTime}
              onTogglePriority={togglePriority}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task, winKey, onComplete, onDelete, onMove, onChangeTime, onTogglePriority,
}: {
  task: Task;
  winKey: Win3;
  onComplete: (t: Task) => void;
  onDelete: (t: Task) => void;
  onMove: (t: Task, target: Win3) => void;
  onChangeTime: (t: Task, time: TimeKey) => void;
  onTogglePriority: (t: Task, field: "urgency" | "importance") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const tkey = normalizeTime(task.label.time);
  const isUrgent = task.label.urgency === "high";
  const isImportant = task.label.importance === "high";

  return (
    <div className="group flex items-start gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-white/80 transition relative">
      <input
        type="checkbox"
        className="rounded shrink-0 cursor-pointer mt-1"
        onChange={() => onComplete(task)}
      />
      <div className="flex-1 min-w-0">
        {/* 1行目: 緊急/重要ドット + タイトル(2行まで折り返し可) */}
        <div className="flex items-start gap-1.5">
          {(isUrgent || isImportant) && (
            <span className="flex gap-0.5 shrink-0 mt-[7px]">
              {isUrgent && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="緊急: 高" />}
              {isImportant && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="重要: 高" />}
            </span>
          )}
          <span
            className={`flex-1 text-sm leading-snug break-words ${isUrgent ? "font-bold" : ""}`}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={task.title}
          >
            {task.title}
          </span>
        </div>
        {/* 2行目: 所要時間 + 期限 + ⋯メニュー */}
        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
          <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
            {TIME_LABEL[tkey] ?? "📅"}
          </span>
          {task.due && (
            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              〆{task.due.slice(5, 10)}
            </span>
          )}
          <button
            className="ml-auto text-gray-400 hover:text-purple-600 px-1 opacity-60 group-hover:opacity-100"
            onClick={() => setMenuOpen((v) => !v)}
            title="メニュー"
          >
            ⋯
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-purple-200 rounded-lg shadow-lg p-2 w-60 text-xs">
            <div className="font-bold text-purple-700 mb-1">いつ着手</div>
            {(["today", "this_week", "this_month"] as Win3[]).map((wk) => (
              <button
                key={wk}
                onClick={() => { onMove(task, wk); setMenuOpen(false); }}
                disabled={wk === winKey}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-purple-50 disabled:opacity-40 disabled:bg-purple-50 disabled:font-bold"
              >
                {WIN_LABEL[wk]} {wk === winKey && "（現在）"}
              </button>
            ))}
            <div className="font-bold text-purple-700 mt-2 mb-1 pt-2 border-t">優先度</div>
            <button
              onClick={() => { onTogglePriority(task, "urgency"); setMenuOpen(false); }}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-purple-50"
            >
              緊急: {isUrgent ? "高 → 低" : "低 → 高"}
            </button>
            <button
              onClick={() => { onTogglePriority(task, "importance"); setMenuOpen(false); }}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-purple-50"
            >
              重要: {isImportant ? "高 → 低" : "低 → 高"}
            </button>
            <div className="font-bold text-purple-700 mt-2 mb-1 pt-2 border-t">所要時間</div>
            {(["quick", "mid", "long"] as const).map((tk) => (
              <button
                key={tk}
                onClick={() => { onChangeTime(task, tk); setMenuOpen(false); }}
                disabled={tk === tkey}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-purple-50 disabled:opacity-40 disabled:bg-purple-50 disabled:font-bold"
              >
                {TIME_LABEL[tk]} {tk === tkey && "（現在）"}
              </button>
            ))}
            <div className="border-t mt-2 pt-2">
              <button
                onClick={() => { onDelete(task); setMenuOpen(false); }}
                className="w-full text-left px-2 py-1.5 rounded text-red-600 hover:bg-red-50"
              >
                🗑 削除
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
