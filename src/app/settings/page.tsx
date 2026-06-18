"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [ntfyTopic, setNtfyTopic] = useState("");

  // カスタマイズ系
  const [secretaryName, setSecretaryName] = useState("");
  const [secretaryAvatarUrl, setSecretaryAvatarUrl] = useState("");
  const [userCallName, setUserCallName] = useState("");

  // アップロード
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [yourUserId, setYourUserId] = useState("");
  const [idCopied, setIdCopied] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((s) => {
      setHasGeminiKey(!!s.gemini_api_key_set);
      setNtfyTopic(s.ntfy_topic ?? "");
      setSecretaryName(s.secretary_name ?? "");
      setSecretaryAvatarUrl(s.secretary_avatar_url ?? "");
      setUserCallName(s.user_call_name ?? "");
      setYourUserId(s.your_user_id ?? "");
      setLoading(false);
    });
  }, []);

  async function save() {
    const body: any = {
      ntfy_topic: ntfyTopic,
      secretary_name: secretaryName,
      user_call_name: userCallName,
    };
    if (geminiKey) body.gemini_api_key = geminiKey;
    const r = await fetch("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      setSaved(true);
      if (geminiKey) setHasGeminiKey(true);
      setGeminiKey("");
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function uploadAvatar() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload-avatar", { method: "POST", body: fd });
      const data = await r.json();
      if (data.error) {
        setUploadError(data.error);
      } else {
        setSecretaryAvatarUrl(data.url);
      }
    } catch (e: any) {
      setUploadError(String(e?.message ?? e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (loading) return <main className="p-6">読み込み中…</main>;

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-20">
      <h1 className="text-2xl font-bold mb-4">⚙️ 設定</h1>
      <Link href="/" className="text-sm text-[var(--accent)] underline">← ホームに戻る</Link>

      {/* ── 秘書のカスタマイズ ── */}
      <div className="card mt-6 space-y-5">
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
          <label className="block font-bold text-sm mb-1">秘書のアバター画像</label>
          <div className="flex items-center gap-3 mb-2">
            {secretaryAvatarUrl && (
              <Image
                src={secretaryAvatarUrl}
                alt="現在のアバター"
                width={64}
                height={64}
                className="rounded-full border-2 border-purple-200"
                unoptimized={secretaryAvatarUrl.startsWith("http")}
              />
            )}
            <div className="flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={uploadAvatar}
                disabled={uploading}
                className="text-xs"
              />
              {uploading && <div className="text-xs text-purple-600 mt-1">アップロード中…</div>}
              {uploadError && <div className="text-xs text-red-500 mt-1">{uploadError}</div>}
            </div>
          </div>
          <p className="text-xs text-gray-500">
            5MBまで・PNG/JPEG/WEBP/GIF。アップロードした画像が秘書のアイコンになります。
            空欄ならデフォルトの清瀬リンク画像が使われます。
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

      {/* ── Gemini API キー ── */}
      <div className="card mt-6 space-y-3">
        <h2 className="font-bold text-base text-purple-700">🔑 Gemini API キー（必須）</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          秘書AIを動かすために、Google の Gemini API キーをご自身で取得して貼り付けてください。
          <strong className="text-purple-700">無料枠で1日1,000回までの利用が可能</strong>です（毎日リセット）。
        </p>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs leading-relaxed">
          <div className="font-bold text-purple-700 mb-2">📝 取得手順（3分くらい）</div>
          <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
            <li>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                 className="text-purple-700 underline font-bold">
                Google AI Studio
              </a>
              を開く
            </li>
            <li>Google アカウントでログイン（このアプリと同じアカウントでOK）</li>
            <li>右上の <strong>「Create API key」</strong> ボタンを押す</li>
            <li>プロジェクトを選ぶか「Create API key in new project」を選択</li>
            <li>表示された <strong>「AIzaSy...」で始まる文字列</strong>をコピー</li>
            <li>下の枠に貼り付けて「保存」</li>
          </ol>
        </div>

        <div>
          <label className="block font-bold text-sm mb-1">
            Gemini API キー
            {hasGeminiKey && <span className="text-green-600 text-xs ml-2">✓ 設定済み</span>}
          </label>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder={hasGeminiKey ? "（保存済み。再設定する場合のみ入力）" : "AIzaSy... を貼り付け"}
            className="w-full p-2 border rounded-lg text-sm font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">
            キーはあなた専用です。秘書AIの応答だけに使われます。他の用途には利用しません。
          </p>
        </div>
      </div>

      {/* ── スマホ通知 (ntfy) ── */}
      <div className="card mt-6 space-y-3">
        <h2 className="font-bold text-base text-purple-700">📱 スマホ通知（任意）</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          設定すると、朝/夜の声かけ・集中タイム終了・タイマー終了などが
          <strong>スマホにプッシュ通知で届く</strong>ようになります。
          ntfy.sh という無料のオープンソース通知サービスを使います。
        </p>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs leading-relaxed">
          <div className="font-bold text-purple-700 mb-2">📝 セットアップ手順（5分くらい）</div>
          <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
            <li>
              スマホで <strong>「ntfy」アプリ</strong>をインストール
              （<a href="https://apps.apple.com/jp/app/ntfy/id1625396347" target="_blank" rel="noreferrer" className="underline">iOS</a>
              ／<a href="https://play.google.com/store/apps/details?id=io.heckel.ntfy" target="_blank" rel="noreferrer" className="underline">Android</a>）
            </li>
            <li>
              他の人と被らない「トピック名」を考える。例:
              <code className="bg-white px-1.5 py-0.5 rounded mx-1">kiyose_yourname_1234</code>
              のように<strong>長くて他人に推測されない名前</strong>にする
            </li>
            <li>
              ntfy アプリで <strong>「＋」または「Subscribe to topic」</strong>を押して、
              上で決めたトピック名を入力 → 「Subscribe」
            </li>
            <li>下の枠にも同じトピック名を入れて「保存」</li>
            <li>
              すぐ届くかテストしたい場合: スマホのブラウザで
              <code className="bg-white px-1.5 py-0.5 rounded mx-1">https://ntfy.sh/トピック名</code>
              を開いて、ターミナルやアプリから送信できます
            </li>
          </ol>
          <div className="mt-2 text-red-600">
            ⚠ トピック名は他人が知ると通知を盗み見できてしまいます。<strong>長く・ランダムに</strong>。
          </div>
        </div>

        <div>
          <label className="block font-bold text-sm mb-1">ntfy トピック名</label>
          <input
            type="text"
            value={ntfyTopic}
            onChange={(e) => setNtfyTopic(e.target.value)}
            placeholder="例: kiyose_yourname_1234ab"
            className="w-full p-2 border rounded-lg text-sm font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">
            空欄にするとプッシュ通知は使われません（ブラウザ通知だけになります）
          </p>
        </div>
      </div>

      {/* ── あなたのID (管理者設定用) ── */}
      <div className="card mt-6 space-y-3">
        <h2 className="font-bold text-base text-purple-700">🔐 あなたのID（管理者設定用）</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          講座生管理画面（<code>/admin</code>）を使いたい場合だけ必要。
          下のIDをコピーして Vercel の環境変数 <code>ADMIN_USER_IDS</code> に登録してください。
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={yourUserId}
            readOnly
            className="flex-1 p-2 border rounded-lg text-xs font-mono bg-gray-50"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(yourUserId);
              setIdCopied(true);
              setTimeout(() => setIdCopied(false), 2000);
            }}
            className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg font-bold"
          >
            {idCopied ? "✓ コピー" : "📋 コピー"}
          </button>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs leading-relaxed">
          <div className="font-bold text-amber-700 mb-1">📝 設定手順</div>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>上の「コピー」ボタンを押してIDをコピー</li>
            <li>
              <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="text-purple-700 underline">
                Vercel ダッシュボード ↗
              </a>
              で <code>secretary-ai-next</code> プロジェクトを開く
            </li>
            <li>左メニュー <strong>Settings → Environment Variables</strong></li>
            <li>「Add New」ボタンを押す</li>
            <li>Key に <code>ADMIN_USER_IDS</code> 、Value にコピーしたIDを貼り付け</li>
            <li>「Save」を押す</li>
            <li>左メニュー <strong>Deployments</strong> → 最新行の「⋯」→「Redeploy」</li>
            <li>1-2分待ってから <code>/admin</code> を開く → 管理画面が見える</li>
          </ol>
        </div>
      </div>

      {/* ── 保存ボタン (固定 footer) ── */}
      <div className="sticky bottom-0 mt-6 -mx-6 px-6 py-4 bg-white/95 backdrop-blur border-t border-purple-100">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={save}
            className="bg-[var(--accent)] text-white font-bold py-2 px-6 rounded-lg hover:opacity-90"
          >
            保存
          </button>
          {saved && <span className="text-green-600 text-sm">✓ 保存しました</span>}
        </div>
      </div>
    </main>
  );
}
