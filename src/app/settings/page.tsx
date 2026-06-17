"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [ntfyTopic, setNtfyTopic] = useState("");
  const [workEmail, setWorkEmail] = useState("");

  // カスタマイズ系
  const [secretaryName, setSecretaryName] = useState("");
  const [secretaryAvatarUrl, setSecretaryAvatarUrl] = useState("");
  const [userCallName, setUserCallName] = useState("");

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((s) => {
      setHasGeminiKey(!!s.gemini_api_key_set);
      setHasAnthropicKey(!!s.anthropic_api_key_set);
      setNtfyTopic(s.ntfy_topic ?? "");
      setWorkEmail(s.work_email ?? "");
      setSecretaryName(s.secretary_name ?? "");
      setSecretaryAvatarUrl(s.secretary_avatar_url ?? "");
      setUserCallName(s.user_call_name ?? "");
      setLoading(false);
    });
  }, []);

  async function save() {
    const body: any = {
      ntfy_topic: ntfyTopic,
      work_email: workEmail,
      secretary_name: secretaryName,
      secretary_avatar_url: secretaryAvatarUrl,
      user_call_name: userCallName,
    };
    if (geminiKey) body.gemini_api_key = geminiKey;
    if (anthropicKey) body.anthropic_api_key = anthropicKey;
    const r = await fetch("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      setSaved(true);
      if (geminiKey) setHasGeminiKey(true);
      if (anthropicKey) setHasAnthropicKey(true);
      setGeminiKey("");
      setAnthropicKey("");
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (loading) return <main className="p-6">読み込み中…</main>;

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">⚙️ 設定</h1>
      <Link href="/" className="text-sm text-[var(--accent)] underline">← ホームに戻る</Link>

      <div className="card mt-6 space-y-4">
        <h2 className="font-bold text-base text-purple-700">🎭 秘書のカスタマイズ</h2>
        <div>
          <label className="block font-bold text-sm mb-1">秘書の名前</label>
          <input
            type="text"
            value={secretaryName}
            onChange={(e) => setSecretaryName(e.target.value)}
            placeholder="清瀬リンク (空欄でデフォルト)"
            maxLength={20}
            className="w-full p-2 border rounded-lg text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            会話の中で秘書がこの名前で自己紹介します
          </p>
        </div>

        <div>
          <label className="block font-bold text-sm mb-1">秘書のアバター画像URL（任意）</label>
          <input
            type="url"
            value={secretaryAvatarUrl}
            onChange={(e) => setSecretaryAvatarUrl(e.target.value)}
            placeholder="https://example.com/your-character.png"
            className="w-full p-2 border rounded-lg text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            空欄ならデフォルトの清瀬リンク画像が使われます
          </p>
        </div>

        <div>
          <label className="block font-bold text-sm mb-1">あなたの呼ばれたい名前</label>
          <input
            type="text"
            value={userCallName}
            onChange={(e) => setUserCallName(e.target.value)}
            placeholder="例: 淳くん、たろう、Mike"
            maxLength={30}
            className="w-full p-2 border rounded-lg text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            秘書から会話の中でこう呼ばれます（空欄なら「あなた」と呼びます）
          </p>
        </div>
      </div>

      <div className="card mt-6 space-y-4">
        <h2 className="font-bold text-base text-purple-700">🔑 AIキー（運営側で設定済みなら空欄でOK）</h2>
        <div>
          <label className="block font-bold text-sm mb-1">
            Anthropic API キー
            {hasAnthropicKey && <span className="text-green-600 text-xs ml-2">✓ 設定済み</span>}
          </label>
          <input
            type="password"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder={hasAnthropicKey ? "（保存済み。再設定する場合のみ）" : "sk-ant-... を貼り付け"}
            className="w-full p-2 border rounded-lg text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            👉 <a href="https://console.anthropic.com/" target="_blank" className="underline">Anthropic Console</a> で発行
          </p>
        </div>

        <div>
          <label className="block font-bold text-sm mb-1">
            Gemini APIキー（互換用・任意）
            {hasGeminiKey && <span className="text-green-600 text-xs ml-2">✓ 設定済み</span>}
          </label>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder={hasGeminiKey ? "（保存済み。再設定する場合のみ）" : "AIza... を貼り付け"}
            className="w-full p-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="card mt-6 space-y-4">
        <h2 className="font-bold text-base text-purple-700">📱 通知・その他</h2>
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
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          className="bg-[var(--accent)] text-white font-bold py-2 px-6 rounded-lg hover:opacity-90"
        >
          保存
        </button>
        {saved && <span className="text-green-600 text-sm">✓ 保存しました</span>}
      </div>
    </main>
  );
}
