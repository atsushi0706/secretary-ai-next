"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TaskMatrix } from "./TaskMatrix";
import { Chat } from "./Chat";
import { MonthCalendar } from "./MonthCalendar";
import { WeekCalendarCompact } from "./WeekCalendarCompact";

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
  eveningBriefing?: { body: string; created_at: string } | null;
};

// PC開きっぱなしで情報が古くなったときの判定しきい値
const STALE_AFTER_MS = 5 * 60 * 1000; // 5分

export function Dashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<"auto" | "morning" | "evening">("auto");
  const [reloadKey, setReloadKey] = useState(0);
  const [calTab, setCalTab] = useState<"week" | "month">("week");
  const [lastLoadedAt, setLastLoadedAt] = useState<number>(0);
  const lastLoadedRef = useRef<number>(0);

  const load = useCallback(() => {
    setRefreshing(true);
    const q = mode === "auto" ? "" : `?mode=${mode}`;
    fetch(`/api/bootstrap${q}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        const t = Date.now();
        setLastLoadedAt(t);
        lastLoadedRef.current = t;
      })
      .finally(() => {
        setRefreshing(false);
        setInitialLoading(false);
      });
  }, [mode, reloadKey]);

  useEffect(() => { load(); }, [load]);

  // タブが visible に戻った/フォーカスが返ったとき、5分以上経ってたら自動で最新化
  useEffect(() => {
    function maybeRefresh() {
      if (document.visibilityState !== "visible") return;
      const last = lastLoadedRef.current;
      if (!last) return;
      const elapsed = Date.now() - last;
      if (elapsed > STALE_AFTER_MS) {
        setReloadKey((k) => k + 1);
      }
    }
    document.addEventListener("visibilitychange", maybeRefresh);
    window.addEventListener("focus", maybeRefresh);
    return () => {
      document.removeEventListener("visibilitychange", maybeRefresh);
      window.removeEventListener("focus", maybeRefresh);
    };
  }, []);

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

  const autoGreet = data.messages.length === 0;

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 p-3 sm:p-5">
        {/* ── 左サイドバー ── */}
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
            {lastLoadedAt > 0 && (
              <LastLoadedBadge ts={lastLoadedAt} stale={Date.now() - lastLoadedAt > STALE_AFTER_MS} />
            )}
          </section>

          {/* 月/週 タブ切替カレンダー */}
          <section className="card">
            <div className="flex items-center gap-1 mb-3">
              <button
                onClick={() => setCalTab("week")}
                className={`flex-1 text-xs font-bold py-1.5 rounded-md transition ${
                  calTab === "week" ? "bg-[var(--accent)] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                週
              </button>
              <button
                onClick={() => setCalTab("month")}
                className={`flex-1 text-xs font-bold py-1.5 rounded-md transition ${
                  calTab === "month" ? "bg-[var(--accent)] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                月
              </button>
            </div>
            {calTab === "week" ? <WeekCalendarCompact /> : <MonthCalendar />}
          </section>
        </aside>

        {/* ── メイン列 ── */}
        <div className="space-y-4 min-w-0">
          {/* 昨夜決めた明日の流れ（朝モード時、briefingがあれば） */}
          {data.isMorning && data.eveningBriefing?.body && (
            <EveningBriefingCard briefing={data.eveningBriefing} />
          )}

          {/* 今日のタスク進捗（リング表示） */}
          <DailyProgress targetDay={data.targetDay} tasks={data.tasks} onRefresh={() => setReloadKey((k) => k + 1)} />

          {/* 清瀬リンクとの会話（森背景＋立ち絵） */}
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
// 旧キー(today/days)が残っていても対応できるよう全部マップ
const TIME_WEIGHT_MIN: Record<string, number> = {
  quick: 15,    // すぐ終わる
  mid: 45,      // 30分〜1時間
  long: 120,    // 1〜3時間
  // 旧キー互換
  today: 45,
  days: 120,
};

type Commit = {
  date: string;
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

const WALK_ROUTINE_TITLE = "ウォーキング30分";

// 昨夜の briefing 表示
function EveningBriefingCard({
  briefing,
}: {
  briefing: { body: string; created_at: string };
}) {
  const [collapsed, setCollapsed] = useState(false);
  const created = new Date(briefing.created_at);
  const m = `${created.getMonth() + 1}/${created.getDate()} ${String(created.getHours()).padStart(2, "0")}:${String(created.getMinutes()).padStart(2, "0")}`;
  // 簡易: 時刻範囲行をハイライト
  const html = briefing.body
    .replace(
      /^[\s・\-\*●○◇◆|]*(\d{1,2}:\d{2})\s*[-–〜~]\s*(\d{1,2}:\d{2})\s*[:：|]*\s*(.+?)\s*$/gm,
      (_, t1, t2, lbl) =>
        `<div class="slot" style="margin:4px 0;"><span class="time">${t1}–${t2}</span><span>${lbl.replace(/^\|\s*/, "")}</span></div>`,
    )
    .replace(/^\| .+$/gm, "")
    .replace(/^\|[-:]+\|.*$/gm, "")
    .replace(/\n/g, "<br/>");
  return (
    <section className="card border-l-4 border-purple-500 bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm text-purple-700">
          📋 昨夜決めた今日の流れ
          <span className="text-xs text-gray-500 ml-2 font-normal">（{m} 作成）</span>
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="text-xs bg-white hover:bg-purple-50 border border-purple-200 px-2 py-1 rounded"
        >
          {collapsed ? "▼ 開く" : "▲ 閉じる"}
        </button>
      </div>
      {!collapsed && (
        <div
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </section>
  );
}

// 「最終更新 HH:MM」バッジ。古ければ赤くする。30秒ごとに自分で再描画
function LastLoadedBadge({ ts, stale }: { ts: number; stale: boolean }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const elapsedMs = Date.now() - ts;
  const elapsedMin = Math.floor(elapsedMs / 60000);
  const isStaleNow = stale || elapsedMs > 5 * 60 * 1000;
  return (
    <div className={`mt-2 text-[10px] ${isStaleNow ? "text-red-500" : "text-gray-400"}`}>
      最終更新 {hh}:{mm}
      {elapsedMin > 0 && <span className="ml-1">（{elapsedMin}分前）</span>}
      {isStaleNow && <span className="ml-1">← 古いかも</span>}
    </div>
  );
}

// SVG 円形プログレスリング
function ProgressRing({
  percent, size = 120, stroke = 12,
}: { percent: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c * (1 - clamped / 100);
  return (
    <svg width={size} height={size} className="shrink-0">
      <defs>
        <linearGradient id={`pg-grad-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-dark)" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ece8f7" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={`url(#pg-grad-${size})`} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .5s ease" }}
      />
      <text
        x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill="var(--accent-dark)" fontSize={size * 0.26} fontWeight={800}
      >
        {clamped}%
      </text>
    </svg>
  );
}

function DailyProgress({
  targetDay, tasks, onRefresh,
}: {
  targetDay: string;
  tasks: any[];
  onRefresh: () => void;
}) {
  const [commit, setCommit] = useState<Commit | null>(null);
  const [tick, setTick] = useState(0);
  const [includeWalk, setIncludeWalk] = useState(true);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    setCommit(loadCommit(targetDay));
  }, [targetDay, tick]);

  // 「今日着手」候補: 新軸 window === "today" を最優先、無ければ従来基準
  const candidates = tasks.filter((t) => {
    if (t.window === "today") return true;
    if (t.window) return false; // window があって today 以外なら除外
    // window が無い古いデータへのフォールバック
    if (t.bucket === "personal") return false;
    const tk = t.label?.time as string | undefined;
    if (tk === "long" || tk === "days") return false;
    return true;
  });

  const hasWalkTask = tasks.some((t) => /ウォーキング/i.test(t.title ?? ""));

  async function ensureWalkTask(): Promise<{ id: string; title: string } | null> {
    if (hasWalkTask) {
      const existing = tasks.find((t) => /ウォーキング/i.test(t.title ?? ""));
      return existing ? { id: existing.id, title: existing.title } : null;
    }
    try {
      const r = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          title: WALK_ROUTINE_TITLE,
          notes: "毎日の必須ルーチン。音声学習や音声入力と組み合わせ可。",
          due: targetDay,
          category: "personal",
          urgency: "low",
          importance: "high",
          time: "quick",
        }),
      });
      const data = await r.json();
      if (data?.task?.id) return { id: data.task.id, title: WALK_ROUTINE_TITLE };
    } catch (e) { console.error("ensureWalkTask failed", e); }
    return null;
  }

  async function doCommit() {
    if (committing) return;
    setCommitting(true);
    try {
      const items: Commit["items"] = {};
      for (const t of candidates) {
        const w = TIME_WEIGHT_MIN[t.label?.time as string] ?? 60;
        items[t.id] = { weight: w, title: t.title };
      }
      if (includeWalk) {
        const walk = await ensureWalkTask();
        if (walk) {
          items[walk.id] = { weight: 30, title: walk.title };
        }
      }
      if (Object.keys(items).length === 0) {
        alert("今日のタスクが見当たらない。タスクボードで先に1つ以上追加してね。");
        return;
      }
      const c: Commit = { date: targetDay, items };
      saveCommit(c);
      onRefresh();
      setTick((x) => x + 1);
    } finally {
      setCommitting(false);
    }
  }

  function resetCommit() {
    if (!confirm("今日の確定をやり直す？")) return;
    clearCommit(targetDay);
    setTick((x) => x + 1);
  }

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
    const totalCand = candidates.length;
    const totalCandMin = candidates.reduce(
      (a, t) => a + (TIME_WEIGHT_MIN[t.label?.time as string] ?? 60), 0
    );
    return (
      <section className="card flex items-center gap-4">
        <ProgressRing percent={0} size={108} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base">🎯 今日のタスクを確定する</div>
          <div className="text-xs text-gray-500 mt-1">
            候補 {totalCand}件 / 見積 {Math.floor(totalCandMin / 60)}h{totalCandMin % 60}m
            （長期=daysは除外）
          </div>
          <label className="flex items-center gap-2 mt-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={includeWalk}
              onChange={(e) => setIncludeWalk(e.target.checked)}
            />
            🚶 ウォーキング30分も入れる
            {hasWalkTask && <span className="text-purple-600">— 既に登録済み</span>}
          </label>
          <button
            onClick={doCommit}
            disabled={committing || (candidates.length === 0 && !includeWalk)}
            className="mt-3 bg-[var(--accent)] text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {committing ? "確定中…" : "これで確定する"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card flex items-center gap-4 flex-wrap">
      <ProgressRing percent={pctWeight} size={120} />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-base">
          🎯 今日の進捗
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {doneCount}/{totalCount} 完了 ／ {Math.floor(doneMin / 60)}h{doneMin % 60}m済
          ／ 見積 {Math.floor(totalMin / 60)}h{totalMin % 60}m
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-0.5">
            <span>件数ベース</span>
            <span className="tabular-nums">{pctTask}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] transition-all"
              style={{ width: `${pctTask}%` }}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
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
    </section>
  );
}
