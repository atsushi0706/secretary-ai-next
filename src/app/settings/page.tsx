"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [ntfyTopic, setNtfyTopic] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((s) => {
      setHasKey(!!s.gemini_api_key_set);
      setNtfyTopic(s.ntfy_topic ?? "");
      setWorkEmail(s.work_email ?? "");
      setLoading(false);
    });
  }, []);

  async function save() {
    const body: any = { ntfy_topic: ntfyTopic, work_email: workEmail };
    if (geminiKey) body.gemini_api_key = geminiKey;
    const r = await fetch("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      setSaved(true);
      setHasKey(true);
      setGeminiKey("");
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (loading) return <main className="p-6">読み込み中…</main>;

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">⚙️ 設定</h1>
      <Link href="/" className="text-sm text-[var(--accent)] underline">← ホームに戻る</Link>

      <div className="card mt-6 space-y-4">
        <div>
          <label className="block font-bold text-sm mb-1">Gemini APIキー {hasKey && <span className="text-green-600 text-xs ml-2">✓ 設定済み</span>}</label>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder={hasKey ? "（保存済み。再設定する場合のみ入力）" : "AIza... を貼り付け"}
            className="w-full p-2 border rounded-lg text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            👉 <a href="https://aistudio.google.com/apikey" target="_blank" className="underline">Google AI Studio</a> で無料発行（1,000回/日まで無料）
          </p>
        </div>

        <div>
          <label className="block font-bold text-sm mb-1">ntfy トピック名（スマホ通知用・任意）</label>
          <input
            type="text"
            value={ntfyTopic}
            onChange={(e) => setNtfyTopic(e.target.value)}
            placeholder="kiyose_rinq_xxxxx のような推測されにくい名前"
            className="w-full p-2 border rounded-lg text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            スマホに「ntfy」アプリを入れて同じトピックを Subscribe しておく
          </p>
        </div>

        <div>
          <label className="block font-bold text-sm mb-1">仕事用メールアドレス（任意）</label>
          <input
            type="email"
            value={workEmail}
            onChange={(e) => setWorkEmail(e.target.value)}
            placeholder="work@example.com"
            className="w-full p-2 border rounded-lg text-sm"
          />
        </div>

        <button
          onClick={save}
          className="bg-[var(--accent)] text-white font-bold py-2 px-6 rounded-lg hover:opacity-90"
        >
          保存
        </button>
        {saved && <span className="text-green-600 text-sm ml-3">✓ 保存しました</span>}
      </div>
    </main>
  );
}
