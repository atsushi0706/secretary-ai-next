"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UserSummary = {
  user_id: string;
  user_call_name: string;
  secretary_name: string;
  has_gemini_key: boolean;
  has_google: boolean;
  has_ntfy: boolean;
  created_at: string;
  updated_at: string;
  last_conversation_at: string | null;
  conversation_count: number;
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setUsers(d.users);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="p-6">読み込み中…</main>;

  if (error) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">⚙️ 管理画面</h1>
        <Link href="/" className="text-sm text-[var(--accent)] underline">← ホームに戻る</Link>
        <div className="card mt-6 bg-red-50 border-red-200">
          <div className="font-bold text-red-700">アクセス不可</div>
          <div className="text-sm text-red-600 mt-1">{error}</div>
          <div className="text-xs text-gray-600 mt-3 leading-relaxed">
            管理者として使うには Vercel の環境変数 <code>ADMIN_USER_IDS</code> に
            あなたの Google sub (NextAuth セッションの userId) をカンマ区切りで設定してください。
          </div>
        </div>
      </main>
    );
  }

  const sorted = (users ?? []).slice().sort((a, b) => {
    const aT = a.last_conversation_at ?? "";
    const bT = b.last_conversation_at ?? "";
    return bT.localeCompare(aT);
  });

  function fmtDate(s: string | null) {
    if (!s) return "—";
    try {
      const d = new Date(s);
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch { return s; }
  }
  function fmtDaysAgo(s: string | null) {
    if (!s) return "";
    try {
      const ms = Date.now() - new Date(s).getTime();
      const d = Math.floor(ms / (24 * 3600 * 1000));
      if (d === 0) return "(今日)";
      if (d === 1) return "(昨日)";
      return `(${d}日前)`;
    } catch { return ""; }
  }

  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">⚙️ 管理画面</h1>
        <Link href="/" className="text-sm text-[var(--accent)] underline">← ホームに戻る</Link>
      </div>

      <div className="card mb-4 flex items-center gap-4 flex-wrap">
        <div>
          <div className="text-xs text-gray-500">登録ユーザー</div>
          <div className="text-2xl font-bold">{sorted.length}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Gemini キー設定済</div>
          <div className="text-2xl font-bold text-green-600">
            {sorted.filter((u) => u.has_gemini_key).length}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">通知設定済</div>
          <div className="text-2xl font-bold text-purple-600">
            {sorted.filter((u) => u.has_ntfy).length}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">7日以内に活動</div>
          <div className="text-2xl font-bold text-blue-600">
            {sorted.filter((u) => {
              if (!u.last_conversation_at) return false;
              const days = (Date.now() - new Date(u.last_conversation_at).getTime()) / (24 * 3600 * 1000);
              return days <= 7;
            }).length}
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-purple-100 text-xs text-gray-500">
              <th className="text-left py-2 px-2">呼ばれ名</th>
              <th className="text-left py-2 px-2">秘書名</th>
              <th className="text-center py-2 px-2">Gemini</th>
              <th className="text-center py-2 px-2">Google</th>
              <th className="text-center py-2 px-2">通知</th>
              <th className="text-right py-2 px-2">会話数</th>
              <th className="text-right py-2 px-2">最終会話</th>
              <th className="text-right py-2 px-2">登録日</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => (
              <tr key={u.user_id} className="border-b border-gray-50 hover:bg-purple-50">
                <td className="py-2 px-2 font-bold">{u.user_call_name || "(未設定)"}</td>
                <td className="py-2 px-2">{u.secretary_name || "(default)"}</td>
                <td className="text-center">{u.has_gemini_key ? "✅" : "❌"}</td>
                <td className="text-center">{u.has_google ? "✅" : "❌"}</td>
                <td className="text-center">{u.has_ntfy ? "✅" : "—"}</td>
                <td className="text-right tabular-nums">{u.conversation_count}</td>
                <td className="text-right text-xs">
                  {fmtDate(u.last_conversation_at)} <span className="text-gray-400">{fmtDaysAgo(u.last_conversation_at)}</span>
                </td>
                <td className="text-right text-xs text-gray-500">{fmtDate(u.created_at)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-8">ユーザーがまだいません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-xs text-gray-500 leading-relaxed">
        ※ ユーザーの会話本文・タスク内容そのものは表示していません。プライバシー保護のため、活動状況の集計値のみ表示。<br />
        ※ 管理者を増やすには Vercel 環境変数 <code>ADMIN_USER_IDS</code> にカンマ区切りで Google sub を追加。
      </div>
    </main>
  );
}
