"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"auto" | "morning" | "evening">("auto");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    const q = mode === "auto" ? "" : `?mode=${mode}`;
    fetch(`/api/bootstrap${q}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [mode, reloadKey]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中…</div>
      </main>
    );
  }

  if (data?.setupNeeded) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-md w-full text-center">
          <h1 className="text-xl font-bold mb-2">初回設定</h1>
          <p className="text-sm text-gray-600 mb-4">
            Gemini APIキーを設定してください。
            <br />（無料発行: <a className="underline" href="https://aistudio.google.com/apikey" target="_blank">Google AI Studio</a>）
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

  return (
    <main className="min-h-screen p-3 sm:p-6 max-w-5xl mx-auto space-y-4">
      <header className="card flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center text-2xl">
          🤖
        </div>
        <div className="flex-1">
          <div className="font-bold">清瀬リンク <span className="text-green-500 text-xs">●オンライン</span></div>
          <div className="text-xs text-gray-500">{data.targetLabel}の時間割を一緒に組みましょう</div>
        </div>
        <Link href="/settings" className="text-sm text-gray-400 hover:text-purple-600">⚙️</Link>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          className="text-sm p-2 border rounded-lg"
        >
          <option value="auto">🤖 自動（時刻判別）</option>
          <option value="morning">🌅 朝（今日の組み立て）</option>
          <option value="evening">🌙 夜（明日の準備）</option>
        </select>
        <span className="text-sm text-gray-600">
          💡 いま: <b>{data.isMorning ? "今日の組み立て" : "明日の準備"}</b>
        </span>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="ml-auto text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
        >
          🔄 更新
        </button>
      </div>

      <details className="card">
        <summary className="cursor-pointer font-bold text-sm">📅 月間カレンダー</summary>
        <div className="mt-3">
          <MonthCalendar />
        </div>
      </details>

      <section>
        <h2 className="font-bold text-base mb-2">🗂️ タスクボード</h2>
        <TaskMatrix tasks={data.tasks} onRefresh={() => setReloadKey((k) => k + 1)} />
      </section>

      <section>
        <h2 className="font-bold text-base mb-2">💬 清瀬リンクとの会話</h2>
        <Chat
          initialMessages={data.messages}
          isMorning={data.isMorning}
          onTasksUpdated={() => setReloadKey((k) => k + 1)}
        />
      </section>
    </main>
  );
}
