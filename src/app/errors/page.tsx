"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ErrorRow = {
  id: number;
  user_id: string | null;
  route: string;
  message: string;
  stack: string | null;
  meta: any;
  created_at: string;
};

export default function ErrorsPage() {
  const [rows, setRows] = useState<ErrorRow[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterUserId, setFilterUserId] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const url = filterUserId
        ? `/api/errors?userId=${encodeURIComponent(filterUserId)}&limit=200`
        : "/api/errors?limit=200";
      const r = await fetch(url);
      const d = await r.json();
      if (d.error) {
        setError(d.error);
        setRows(null);
      } else {
        setRows(d.errors);
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function fmt(d: string) {
    try {
      const dt = new Date(d);
      return `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}:${String(dt.getSeconds()).padStart(2, "0")}`;
    } catch {
      return d;
    }
  }

  if (loading) return <main className="p-6">読み込み中…</main>;

  if (error) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">⚠ エラーログ</h1>
        <Link href="/" className="text-sm text-[var(--accent)] underline">← ホームに戻る</Link>
        <div className="card mt-6 bg-red-50 border-red-200">
          <div className="font-bold text-red-700">アクセス不可</div>
          <div className="text-sm text-red-600 mt-1">{error}</div>
          <div className="text-xs text-gray-600 mt-3 leading-relaxed">
            このページを使うには Vercel の環境変数 <code>ADMIN_USER_IDS</code> に
            あなたの Google sub を登録してください。<br />
            自分の sub は <Link href="/me/id" className="underline text-purple-700">/me/id</Link> で確認できます。
          </div>
        </div>
      </main>
    );
  }

  // user_id 別の件数集計
  const byUser: Record<string, number> = {};
  for (const r of rows ?? []) {
    const k = r.user_id ?? "(unauthenticated)";
    byUser[k] = (byUser[k] ?? 0) + 1;
  }
  const userBreakdown = Object.entries(byUser).sort((a, b) => b[1] - a[1]);

  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">⚠ エラーログ</h1>
        <Link href="/" className="text-sm text-[var(--accent)] underline">← ホームに戻る</Link>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            placeholder="特定の Google sub で絞り込む (空欄=全部)"
            className="flex-1 min-w-[280px] p-2 border rounded-lg text-sm font-mono"
          />
          <button onClick={load} className="bg-[var(--accent)] text-white font-bold py-2 px-4 rounded-lg text-sm hover:opacity-90">
            🔍 検索
          </button>
          <button
            onClick={() => { setFilterUserId(""); setTimeout(load, 0); }}
            className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg text-sm hover:bg-gray-300"
          >
            ↺ クリア
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          表示中: {rows?.length ?? 0} 件 / 直近順
        </div>
      </div>

      {/* ユーザー別件数の概要 */}
      {userBreakdown.length > 0 && (
        <div className="card mb-4">
          <div className="font-bold text-sm text-purple-700 mb-2">📊 ユーザー別エラー件数（多い順）</div>
          <div className="space-y-1 text-xs font-mono">
            {userBreakdown.slice(0, 10).map(([uid, count]) => (
              <div key={uid} className="flex items-center gap-2">
                <button
                  className="text-purple-700 underline hover:text-purple-900"
                  onClick={() => { setFilterUserId(uid === "(unauthenticated)" ? "" : uid); setTimeout(load, 0); }}
                >
                  {uid}
                </button>
                <span className="text-gray-400">→</span>
                <span className="font-bold tabular-nums">{count}件</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-purple-100 text-xs text-gray-500">
              <th className="text-left py-2 px-2">時刻</th>
              <th className="text-left py-2 px-2">user_id</th>
              <th className="text-left py-2 px-2">route</th>
              <th className="text-left py-2 px-2">message</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <>
                <tr
                  key={r.id}
                  className="border-b border-gray-50 hover:bg-purple-50 cursor-pointer"
                  onClick={() => setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }))}
                >
                  <td className="py-2 px-2 text-xs tabular-nums whitespace-nowrap">{fmt(r.created_at)}</td>
                  <td className="py-2 px-2 text-xs font-mono">
                    <span className="text-purple-700">{r.user_id ?? "—"}</span>
                  </td>
                  <td className="py-2 px-2 text-xs font-mono text-blue-700">{r.route}</td>
                  <td className="py-2 px-2 text-xs">{r.message}</td>
                </tr>
                {expanded[r.id] && r.stack && (
                  <tr key={`${r.id}-stack`}>
                    <td colSpan={4} className="bg-gray-900 text-green-300 p-3 text-xs font-mono whitespace-pre-wrap break-all">
                      {r.stack}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {(rows?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-gray-400 py-8">エラーログはまだありません 🎉</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-xs text-gray-500 leading-relaxed">
        ※ 行をクリックするとスタックトレースを展開します<br />
        ※ ユーザー本人の会話内容・タスク内容は記録していません。エラー発生時の技術的情報のみ。
      </div>
    </main>
  );
}
