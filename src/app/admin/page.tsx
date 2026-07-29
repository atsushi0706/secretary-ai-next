"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdminUser = {
  userId: string; name: string; email: string | null; callName: string | null; birthName: string | null;
  hasGoogle: boolean; hasGemini: boolean; hasAnthropic: boolean; ntfy: boolean; push: boolean;
  createdAt: string | null; lastActive: string | null;
  counts: { shinga: number; walks: number; emotions: number; quests: number; talks: number; notifs: number };
};
type Overview = { totalUsers: number; users: AdminUser[]; generatedAt: string };

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return s.length > 10 ? s.slice(0, 10) : s;
}

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [status, setStatus] = useState<"loading" | "forbidden" | "error" | "ok">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [busy, setBusy] = useState<string>("");

  async function load() {
    setStatus("loading");
    try {
      const r = await fetch("/api/admin/overview");
      if (r.status === 403) { setStatus("forbidden"); return; }
      const text = await r.text();
      let d: any = null;
      try { d = text ? JSON.parse(text) : null; } catch { /* 非JSON応答（タイムアウト等） */ }
      if (!r.ok || !d) {
        setErrMsg(d?.error || (r.status >= 500 ? `サーバーが混み合っています（${r.status}）。少し待って「更新」を押してみて。` : `HTTP ${r.status}`));
        setStatus("error"); return;
      }
      setData(d); setStatus("ok");
    } catch (e: any) {
      setErrMsg(String(e?.message ?? e)); setStatus("error");
    }
  }
  useEffect(() => { load(); }, []);

  async function act(action: "disable-notify" | "delete", u: AdminUser) {
    if (action === "delete") {
      if (!confirm(`「${u.name}」を完全に削除します。会話・記録・設定すべてが消え、取り消せません。本当に削除しますか？`)) return;
    } else {
      if (!confirm(`「${u.name}」の通知（プッシュ／ntfy）を解除します。よろしいですか？`)) return;
    }
    setBusy(u.userId + action);
    try {
      const r = await fetch("/api/admin/user", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: u.userId }),
      });
      const d = await r.json();
      if (!r.ok) { alert(`失敗: ${d.error || r.status}`); return; }
      await load();
    } catch (e: any) {
      alert(`失敗: ${String(e?.message ?? e)}`);
    } finally {
      setBusy("");
    }
  }

  if (status === "loading") return <main className="p-6 text-sm">読み込み中…</main>;
  if (status === "forbidden") {
    return (
      <main className="p-6 max-w-xl mx-auto">
        <h1 className="text-xl font-bold mb-2">🔒 管理者専用</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          このページは管理者だけが開けます。あなたのアカウントは <code>ADMIN_USER_IDS</code> に登録されていません。
          自分のIDは <Link href="/me/id" className="text-purple-700 underline">/me/id</Link> で確認できます。
        </p>
        <Link href="/" className="text-sm text-purple-700 underline mt-4 inline-block">← ホームに戻る</Link>
      </main>
    );
  }
  if (status === "error") return <main className="p-6 text-sm text-red-600">エラー: {errMsg}</main>;

  const users = data?.users ?? [];
  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">🛠 管理画面</h1>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-xs border rounded-lg px-3 py-1.5">↻ 更新</button>
          <Link href="/" className="text-xs text-purple-700 underline">← ホーム</Link>
        </div>
      </div>

      <div className="flex gap-3 mb-4 text-sm">
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
          <div className="text-xs text-gray-500">登録ユーザー</div>
          <div className="font-bold text-lg text-purple-700">{data?.totalUsers ?? 0}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <div className="text-xs text-gray-500">通知ON</div>
          <div className="font-bold text-lg text-green-700">{users.filter((u) => u.push || u.ntfy).length}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <div className="text-xs text-gray-500">Google連携</div>
          <div className="font-bold text-lg text-blue-700">{users.filter((u) => u.hasGoogle).length}</div>
        </div>
      </div>

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.userId} className="border rounded-xl p-4 bg-white">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{u.name}</div>
                <div className="text-xs text-gray-500 truncate">{u.email ?? "（メール未取得）"}</div>
                <div className="text-[10px] text-gray-400 font-mono truncate">{u.userId}</div>
              </div>
              <div className="flex flex-wrap gap-1 justify-end shrink-0">
                {u.hasGoogle && <span className="badge bg-blue-100 text-blue-700">G</span>}
                {u.hasGemini && <span className="badge bg-amber-100 text-amber-700">Gemini</span>}
                {u.hasAnthropic && <span className="badge bg-orange-100 text-orange-700">Claude</span>}
                {u.push && <span className="badge bg-green-100 text-green-700">🔔Push</span>}
                {u.ntfy && <span className="badge bg-green-50 text-green-600">ntfy</span>}
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 text-center">
              {([
                ["発言", u.counts.shinga], ["ウォーク", u.counts.walks], ["気分", u.counts.emotions],
                ["クエスト", u.counts.quests], ["会話", u.counts.talks], ["通知", u.counts.notifs],
              ] as const).map(([label, n]) => (
                <div key={label} className="bg-gray-50 rounded-lg py-1.5">
                  <div className="font-bold text-sm">{n}</div>
                  <div className="text-[10px] text-gray-500">{label}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-3 text-[11px] text-gray-500">
              <span>登録: {fmtDate(u.createdAt)} ／ 最終: {fmtDate(u.lastActive)}</span>
              <div className="flex gap-2">
                <button
                  disabled={busy !== ""}
                  onClick={() => act("disable-notify", u)}
                  className="text-purple-700 underline disabled:opacity-40"
                >通知解除</button>
                <button
                  disabled={busy !== ""}
                  onClick={() => act("delete", u)}
                  className="text-red-600 underline disabled:opacity-40"
                >削除</button>
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-gray-500">まだユーザーがいません。</p>}
      </div>

      <p className="text-[11px] text-gray-400 mt-6 leading-relaxed">
        ※ このデータは service_role（サーバー権限）で全ユーザーぶんを横断表示しています。
        「削除」は取り消せません（会話・記録・設定・画像すべて）。
      </p>

      <style jsx>{`
        .badge { font-size: 10px; padding: 2px 6px; border-radius: 999px; font-weight: 700; white-space: nowrap; }
      `}</style>
    </main>
  );
}
