"use client";

import { useState } from "react";

type Task = {
  id: string;
  tasklist_id: string;
  title: string;
  due: string | null;
  label: { category: string; urgency: string; importance: string; time: string };
  bucket: "urgent_work" | "important_work" | "personal" | "by_time";
};

const CAT_LABEL = {
  urgent_work: "🔴 緊急度：高 × 重要度：高",
  important_work: "🟡 緊急度：低 × 重要度：高",
  personal: "🟢 自分時間・趣味",
  by_time: "🔵 作業時間別",
} as const;

const CAT_SHORT = {
  urgent_work: "🔴 緊急×重要",
  important_work: "🟡 重要だが後で",
  personal: "🟢 自分時間",
  by_time: "🔵 作業時間別",
} as const;

const CAT_COLOR = {
  urgent_work: "#e2574c",
  important_work: "#e0a82e",
  personal: "#3fb27f",
  by_time: "#3a78c2",
} as const;

const CAT_FIXED = {
  urgent_work: { urgency: "high", importance: "high", category: "work" },
  important_work: { urgency: "low", importance: "high", category: "work" },
  personal: { urgency: "low", importance: "high", category: "personal" },
  by_time: { urgency: "low", importance: "low", category: "work" },
} as const;

const TIME_LABEL = {
  quick: "⚡すぐ終わる",
  today: "📅半日〜1日",
  days: "🗓1〜3日",
} as const;

export function TaskMatrix({
  tasks, onRefresh,
}: { tasks: Task[]; onRefresh: () => void }) {
  const buckets: Record<string, Task[]> = {
    urgent_work: [], important_work: [], personal: [], by_time: [],
  };
  for (const t of tasks) buckets[t.bucket]?.push(t);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {(["urgent_work", "important_work", "personal", "by_time"] as const).map((k) => (
        <CategoryCard
          key={k} catKey={k} items={buckets[k]} onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

function CategoryCard({
  catKey, items, onRefresh,
}: {
  catKey: keyof typeof CAT_LABEL;
  items: Task[];
  onRefresh: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState<"quick" | "today" | "days">("today");
  const [hasDue, setHasDue] = useState(false);
  const [newDue, setNewDue] = useState("");

  async function addNew() {
    if (!newTitle.trim()) return;
    const fixed = CAT_FIXED[catKey];
    const r = await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        title: newTitle, due: hasDue ? newDue : null,
        ...fixed, time: newTime,
      }),
    });
    if (r.ok) {
      setAdding(false); setNewTitle(""); setHasDue(false); setNewDue("");
      onRefresh();
    }
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

  async function moveTo(t: Task, target: keyof typeof CAT_LABEL) {
    if (target === t.bucket) return;
    const fixed = CAT_FIXED[target];
    await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "label",
        taskId: t.id,
        ...fixed,
        time: t.label.time,
      }),
    });
    onRefresh();
  }

  async function changeTime(t: Task, time: "quick" | "today" | "days") {
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

  const groupedByTime = catKey === "by_time"
    ? { quick: [] as Task[], today: [] as Task[], days: [] as Task[] }
    : null;
  if (groupedByTime) {
    for (const t of items) {
      const k = (t.label.time as "quick" | "today" | "days") in groupedByTime
        ? (t.label.time as "quick" | "today" | "days") : "today";
      groupedByTime[k].push(t);
    }
  }

  return (
    <div className="card" style={{ minHeight: 320 }}>
      <div className="flex items-start justify-between mb-2">
        <div
          className="font-bold text-sm pl-2"
          style={{ borderLeft: `5px solid ${CAT_COLOR[catKey]}` }}
        >
          {CAT_LABEL[catKey]} <span className="text-xs ml-2 bg-purple-100 text-purple-700 px-2 rounded-full">{items.length}</span>
        </div>
        <button
          className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-bold hover:bg-purple-200"
          onClick={() => setAdding((v) => !v)}
          title="このマスにタスク追加"
        >
          {adding ? "×" : "＋"}
        </button>
      </div>

      {adding && (
        <div className="bg-purple-50 p-2 rounded-lg mb-3 space-y-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="やること"
            className="w-full p-1.5 border rounded text-sm"
          />
          <div className="flex gap-2 items-center">
            <select
              value={newTime}
              onChange={(e) => setNewTime(e.target.value as any)}
              className="text-xs p-1 border rounded"
            >
              <option value="quick">⚡すぐ</option>
              <option value="today">📅半日〜1日</option>
              <option value="days">🗓1〜3日</option>
            </select>
            <label className="text-xs flex items-center gap-1">
              <input
                type="checkbox" checked={hasDue}
                onChange={(e) => setHasDue(e.target.checked)}
              />
              期限
            </label>
            {hasDue && (
              <input
                type="date" value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="text-xs p-1 border rounded"
              />
            )}
          </div>
          <button
            onClick={addNew}
            className="w-full bg-purple-500 text-white text-xs font-bold py-1.5 rounded"
          >
            追加
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-xs text-gray-400">なし</div>
      ) : groupedByTime ? (
        <>
          {(["quick", "today", "days"] as const).map((tk) => groupedByTime[tk].length > 0 && (
            <div key={tk}>
              <div className="text-xs font-bold text-purple-700 mt-2 mb-1">
                {TIME_LABEL[tk]}
              </div>
              {groupedByTime[tk].map((t) => (
                <TaskRow key={t.id} task={t} onComplete={complete} onDelete={del} onMove={moveTo} onChangeTime={changeTime} />
              ))}
            </div>
          ))}
        </>
      ) : (
        <div className="space-y-1">
          {items.map((t) => (
            <TaskRow key={t.id} task={t} onComplete={complete} onDelete={del} onMove={moveTo} onChangeTime={changeTime} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task, onComplete, onDelete, onMove, onChangeTime,
}: {
  task: Task;
  onComplete: (t: Task) => void;
  onDelete: (t: Task) => void;
  onMove: (t: Task, target: keyof typeof CAT_LABEL) => void;
  onChangeTime: (t: Task, time: "quick" | "today" | "days") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 text-sm py-1 group relative">
      <input
        type="checkbox"
        className="rounded"
        onChange={() => onComplete(task)}
      />
      <span className="flex-1 truncate" title={task.title}>{task.title}</span>
      <span className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
        {TIME_LABEL[task.label.time as "quick" | "today" | "days"] ?? "📅"}
      </span>
      {task.due && (
        <span className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
          〆{task.due.slice(5, 10)}
        </span>
      )}
      <button
        className="text-gray-400 hover:text-purple-600 px-1 opacity-60 group-hover:opacity-100"
        onClick={() => setMenuOpen((v) => !v)}
        title="移動・優先度変更"
      >
        ⋯
      </button>
      <button
        className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
        onClick={() => onDelete(task)}
        title="削除"
      >
        🗑
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-purple-200 rounded-lg shadow-lg p-2 w-56 text-xs">
            <div className="font-bold text-purple-700 mb-1">優先度を変更</div>
            {(Object.keys(CAT_SHORT) as Array<keyof typeof CAT_SHORT>).map((k) => (
              <button
                key={k}
                onClick={() => { onMove(task, k); setMenuOpen(false); }}
                disabled={k === task.bucket}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-purple-50 disabled:opacity-40 disabled:bg-purple-50 disabled:font-bold"
              >
                {CAT_SHORT[k]} {k === task.bucket && "（現在）"}
              </button>
            ))}
            <div className="font-bold text-purple-700 mt-2 mb-1 pt-2 border-t">所要時間を変更</div>
            {(["quick", "today", "days"] as const).map((tk) => (
              <button
                key={tk}
                onClick={() => { onChangeTime(task, tk); setMenuOpen(false); }}
                disabled={tk === task.label.time}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-purple-50 disabled:opacity-40 disabled:bg-purple-50 disabled:font-bold"
              >
                {TIME_LABEL[tk]} {tk === task.label.time && "（現在）"}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
