"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TaskMatrix } from "./TaskMatrix";
import { Chat } from "./Chat";
import { MonthCalendar } from "./MonthCalendar";

type Bootstrap = {
  setupNeeded?: boolean;
  now: string;
  today: string;
  targetDay: string;
  targetLabel: string;
  isMorning: boolean;
  events: any[];
  tasks: any[];
  schedule: any;
  messages: { role: "user" | "assistant"; content: string }[];
  quickmemo: string;
};

export function Dashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<"auto" | "morning" | "evening">("auto");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    setRefreshing(true);
    const q = mode === "auto" ? "" : `?mode=${mode}`;
    fetch(`/api/bootstrap${q}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => {
        setRefreshing(false);
        setInitialLoading(false);
      });
  }, [mode, reloadKey]);

  useEffect(() => { load(); }, [load]);

  if (initialLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-8 h-8 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin" />
          清瀬リンクが準備中…
        </div>
      </main>
    );
  }

  if (data?.setupNeeded) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-md w-full text-center">
          <h1 className="text-xl font-bold mb-2">初回設定</h1>
          <p className="text-sm text-gray-600 mb-4">
            Google ログイン と AIキー（管理者設定の Anthropic キー）が必要です。
          </p>
          <Link
            href="/settings"
            className="block bg-[var(--accent)] text-white font-bold py-3 rounded-xl"
          >
            設定画面へ
          </Link>
        </div>
      </main>
    );
  }

  if (!data) return null;

  // 初回挨拶を流すかどうか：会話履歴がまだ無いとき
  const autoGreet = data.messages.length === 0;

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 p-3 sm:p-5">
        {/* ── 左サイドバー（モバイルでは上に積む） ── */}
        <aside className="space-y-4">
          <section className="card flex flex-col items-center text-center pt-5">
            <div className="relative">
              <Image
                src="/kiyose.png"
                alt="清瀬リンク"
                width={140}
                height={140}
                className="rounded-full border-4 border-purple-200 shadow"
                priority
              />
              <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-green-400 border-2 border-white" />
            </div>
            <div className="mt-3 font-bold text-lg">清瀬リンク</div>
            <div className="text-xs text-green-600">● オンライン</div>
            <div className="text-xs text-gray-500 mt-1">{userName} 専属の秘書</div>

            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="mt-4 text-sm p-2 border rounded-lg w-full"
            >
              <option value="auto">🤖 自動（時刻判別）</option>
              <option value="morning">🌅 朝（今日の組み立て）</option>
              <option value="evening">🌙 夜（明日の準備）</option>
            </select>
            <div className="text-xs text-gray-600 mt-2">
              いま: <b>{data.isMorning ? "今日の組み立て" : "明日の準備"}</b>
            </div>

            <div className="flex gap-2 mt-3 w-full">
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                disabled={refreshing}
                className="flex-1 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-60"
              >
                {refreshing ? "更新中…" : "🔄 更新"}
              </button>
              <Link
                href="/settings"
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
              >
                ⚙️
              </Link>
            </div>
          </section>

          <details className="card" open>
            <summary className="cursor-pointer font-bold text-sm">📅 月間カレンダー</summary>
            <div className="mt-3">
              <MonthCalendar />
            </div>
          </details>
        </aside>

        {/* ── メイン列 ── */}
        <div className="space-y-4 min-w-0">
          {/* 今日のタスク進捗 */}
          <DailyProgress targetDay={data.targetDay} tasks={data.tasks} onRefresh={() => setReloadKey((k) => k + 1)} />

          {/* 今日/明日の流れ（固定予定を時系列で見せる） */}
          <section className="card">
            <h2 className="font-bold text-base mb-2">
              📆 {data.targetLabel}の流れ
              <span className="text-xs text-gray-500 ml-2 font-normal">
                ({data.targetDay} / 稼働9–17時)
              </span>
            </h2>
            <Timeline schedule={data.schedule} events={data.events} targetDay={data.targetDay} />
          </section>

          {/* 清瀬リンクとの会話 */}
          <section>
            <h2 className="font-bold text-base mb-2">💬 清瀬リンクとの会話</h2>
            <Chat
              key={`${data.targetDay}-${data.isMorning}`}
              initialMessages={data.messages}
              isMorning={data.isMorning}
              autoGreet={autoGreet}
              onTasksUpdated={() => setReloadKey((k) => k + 1)}
            />
          </section>

          {/* タスクボード */}
          <section>
            <h2 className="font-bold text-base mb-2">🗂️ タスクボード</h2>
            <TaskMatrix tasks={data.tasks} onRefresh={() => setReloadKey((k) => k + 1)} />
          </section>
        </div>
      </div>
    </main>
  );
}

// 重み (分): 完了の進捗バーで使う
const TIME_WEIGHT_MIN: Record<string, number> = {
  quick: 15,
  today: 180,
  days: 480,
};

type Commit = {
  date: string;
  // taskId -> weight (minutes)
  items: Record<string, { weight: number; title: string }>;
};

function commitKey(date: string) {
  return `secretary-ai-next.commit.${date}`;
}

function loadCommit(date: string): Commit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(commitKey(date));
    if (!raw) return null;
    const c = JSON.parse(raw) as Commit;
    if (c.date !== date) return null;
    return c;
  } catch {
    return null;
  }
}

function saveCommit(c: Commit) {
  if (typeof window === "undefined") return;
  localStorage.setItem(commitKey(c.date), JSON.stringify(c));
}

function clearCommit(date: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(commitKey(date));
}

// 本日のタスク「確定」 + 進捗バー
function DailyProgress({
  targetDay, tasks, onRefresh,
}: {
  targetDay: string;
  tasks: any[];
  onRefresh: () => void;
}) {
  const [commit, setCommit] = useState<Commit | null>(null);
  const [tick, setTick] = useState(0);

  // クライアントマウント後に localStorage 読む
  useEffect(() => {
    setCommit(loadCommit(targetDay));
  }, [targetDay, tick]);

  // 「今日着手する」とみなすタスクの候補（確定前のプレビュー）
  // - urgent_work / important_work / by_time の今日着手分（label.time != "days"）+ 期限が今日以前
  const candidates = tasks.filter((t) => {
    if (t.bucket === "personal") return false;
    if (t.label?.time === "days") return false;
    return true;
  });

  function doCommit() {
    const items: Commit["items"] = {};
    for (const t of candidates) {
      const w = TIME_WEIGHT_MIN[t.label?.time as string] ?? 60;
      items[t.id] = { weight: w, title: t.title };
    }
    if (Object.keys(items).length === 0) {
      alert("今日のタスクが見当たらない。タスクボードで先に1つ以上追加してね。");
      return;
    }
    const c: Commit = { date: targetDay, items };
    saveCommit(c);
    setTick((x) => x + 1);
  }

  function resetCommit() {
    if (!confirm("今日の確定をやり直す？")) return;
    clearCommit(targetDay);
    setTick((x) => x + 1);
  }

  // 進捗計算
  let pctTask = 0, pctWeight = 0, doneCount = 0, totalCount = 0, doneMin = 0, totalMin = 0;
  if (commit) {
    const stillOpen = new Set(tasks.map((t) => t.id));
    const entries = Object.entries(commit.items);
    totalCount = entries.length;
    totalMin = entries.reduce((a, [, v]) => a + v.weight, 0);
    for (const [id, v] of entries) {
      if (!stillOpen.has(id)) {
        doneCount++;
        doneMin += v.weight;
      }
    }
    pctTask = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    pctWeight = totalMin > 0 ? Math.round((doneMin / totalMin) * 100) : 0;
  }

  if (!commit) {
    // 未確定 → CTAカード
    const totalCand = candidates.length;
    const totalCandMin = candidates.reduce(
      (a, t) => a + (TIME_WEIGHT_MIN[t.label?.time as string] ?? 60), 0
    );
    return (
      <section className="card flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">🎯 今日のタスクを確定する</div>
          <div className="text-xs text-gray-500 mt-0.5">
            候補 {totalCand}件 / 見積 {Math.floor(totalCandMin / 60)}h{totalCandMin % 60}m
            （長期=daysは除外）
          </div>
        </div>
        <button
          onClick={doCommit}
          disabled={candidates.length === 0}
          className="bg-[var(--accent)] text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          これで確定する
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="font-bold text-sm">
          🎯 今日の進捗
          <span className="text-xs text-gray-500 ml-2 font-normal">
            {doneCount}/{totalCount} 完了 ／ {Math.floor(doneMin / 60)}h{doneMin % 60}m済
            ／ 見積 {Math.floor(totalMin / 60)}h{totalMin % 60}m
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { onRefresh(); setTick((x) => x + 1); }}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
          >
            🔄 反映
          </button>
          <button
            onClick={resetCommit}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
          >
            やり直し
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-0.5">
            <span>所要時間ベース</span>
            <span className="font-bold tabular-nums">{pctWeight}%</span>
          </div>
          <div className="h-2.5 bg-purple-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] transition-all"
              style={{ width: `${pctWeight}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-0.5">
            <span>件数ベース</span>
            <span className="tabular-nums">{pctTask}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-400 transition-all"
              style={{ width: `${pctTask}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// 固定予定（events）と空き時間から、簡易タイムラインを描く
function Timeline({
  schedule, events, targetDay,
}: {
  schedule: any;
  events: any[];
  targetDay: string;
}) {
  // 当日内の時刻つき予定だけ拾う（holiday除外、終日除外）
  const slots: Array<{ start: string; end: string; title: string; loc?: string }> = [];
  for (const e of events ?? []) {
    if (e.holiday || e.all_day || !e.start) continue;
    const startDate = e.start.slice(0, 10);
    if (startDate !== targetDay) continue;
    try {
      const s = new Date(e.start);
      const en = e.end ? new Date(e.end) : new Date(s.getTime() + 30 * 60000);
      const fmt = (d: Date) =>
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      slots.push({
        start: fmt(s),
        end: fmt(en),
        title: e.title,
        loc: e.location || undefined,
      });
    } catch { /* skip */ }
  }
  slots.sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="space-y-2">
      {slots.length === 0 && (
        <div className="text-sm text-gray-500">
          固定の予定なし — 1日まるごと使えるよ（{schedule?.free_minutes ?? 0}分）
        </div>
      )}
      {slots.map((s, i) => (
        <div key={i} className="slot" style={{ marginTop: 0, marginBottom: 0 }}>
          <span className="time">{s.start}–{s.end}</span>
          <span className="flex-1">
            {s.title}
            {s.loc && <span className="ml-2 text-xs text-gray-500">@{s.loc}</span>}
          </span>
        </div>
      ))}
      <div className="text-xs text-gray-500 mt-2">
        合計 固定: {Math.floor((schedule?.busy_minutes ?? 0) / 60)}h{(schedule?.busy_minutes ?? 0) % 60}m
        ／ 空き: {Math.floor((schedule?.free_minutes ?? 0) / 60)}h{(schedule?.free_minutes ?? 0) % 60}m
      </div>
    </div>
  );
}
