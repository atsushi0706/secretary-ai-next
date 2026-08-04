"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * データの控えの中身（管理者だけが見る）。
 * 入口の page.tsx で管理者かどうかを確かめてから、これを出す。
 */
export function BackupPanel() {
  const [busy, setBusy] = useState<"mine" | "all" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function download(scope: "mine" | "all") {
    setBusy(scope);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/export${scope === "mine" ? "?mine=1" : ""}`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setMsg(d?.error ?? `取り出せませんでした（${r.status}）`);
        return;
      }
      const blob = await r.blob();
      const cd = r.headers.get("Content-Disposition") ?? "";
      const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? "backup.json";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);

      const mb = (blob.size / 1024 / 1024).toFixed(2);
      setMsg(`${name} を保存しました（${mb} MB）`);
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-20">
      <h1 className="text-2xl font-bold mb-1">
        🗄 データの控え
        <span className="ml-2 text-xs align-middle bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">管理者専用</span>
      </h1>
      <Link href="/" className="text-sm text-[var(--accent)] underline">← ホームに戻る</Link>

      <div className="card mt-6 space-y-3">
        <p className="text-sm leading-relaxed">
          いま使っているデータベースの無料プランは、<strong>自動で控えを取ってくれません</strong>。
          間違って消してしまった場合、戻す手段がありません。
        </p>
        <p className="text-sm leading-relaxed">
          月に1回、ここからファイルを落として、パソコンかクラウドに置いておいてください。
          クエスト・会話・状態の記録が、まるごと1つのファイルに入ります。
        </p>
        <p className="text-xs text-gray-500 leading-relaxed">
          ※ APIキーとGoogleの再接続情報は、安全のため<strong>ファイルに入れていません</strong>。
          これらは失っても、ログインし直せば元に戻ります。
        </p>
      </div>

      <div className="card mt-4 space-y-3">
        <h2 className="font-bold text-base text-purple-700">自分の分だけ</h2>
        <p className="text-xs text-gray-600">あなた（管理者）自身の分だけを取り出します。</p>
        <button
          onClick={() => download("mine")}
          disabled={busy !== null}
          className="w-full bg-gray-100 hover:bg-gray-200 font-bold py-2.5 rounded-xl disabled:opacity-50"
        >
          {busy === "mine" ? "取り出しています…" : "⬇ 自分の分を保存"}
        </button>
      </div>

      <div className="card mt-4 space-y-3">
        <h2 className="font-bold text-base text-purple-700">全員のデータ</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          使っている人全員の分をまとめて取り出します。
          この画面は管理者しか開けません。
        </p>
        <button
          onClick={() => download("all")}
          disabled={busy !== null}
          className="w-full bg-[var(--accent)] text-white font-bold py-2.5 rounded-xl disabled:opacity-50"
        >
          {busy === "all" ? "取り出しています…" : "⬇ 全員分を保存"}
        </button>
      </div>

      {msg && (
        <div className="card mt-4 text-sm leading-relaxed">
          {msg}
        </div>
      )}

      <div className="card mt-4">
        <h2 className="font-bold text-sm mb-2">止まらないようにする仕組み</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          このデータベースは「7日間まったく使われない」と一時停止します。
          止まらないように、<strong>毎朝6時に自動で軽く触る</strong>ようにしてあります。
          誰も使わない週があっても、これで止まりません。
        </p>
      </div>
    </main>
  );
}
