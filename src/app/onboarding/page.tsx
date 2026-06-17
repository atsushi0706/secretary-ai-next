"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [userCallName, setUserCallName] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 既存の設定があったらスキップ判定
  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((s) => {
      if (s.user_call_name) setUserCallName(s.user_call_name);
      if (s.gemini_api_key_set && s.user_call_name) {
        // すでに完了している → ホームへ
        router.replace("/");
      }
    });
  }, [router]);

  async function saveAndNext() {
    setSaving(true);
    setError("");
    try {
      const body: any = {};
      if (step === 1 && userCallName) body.user_call_name = userCallName;
      if (step === 2 && geminiKey) body.gemini_api_key = geminiKey;
      if (Object.keys(body).length > 0) {
        const r = await fetch("/api/settings", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error("保存に失敗しました");
      }
      if (step < 3) setStep((step + 1) as Step);
      else router.replace("/");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen flex items-start justify-center p-6 pt-12">
      <div className="max-w-xl w-full">
        <h1 className="text-2xl font-bold text-purple-700 mb-2">ようこそ！</h1>
        <p className="text-sm text-gray-600 mb-6">
          秘書AIを使い始める前に、3つだけ設定させてください（2〜3分）
        </p>

        {/* ステップインジケータ */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= n ? "bg-[var(--accent)] text-white" : "bg-gray-200 text-gray-500"
              }`}>{n}</div>
              {n < 3 && <div className={`flex-1 h-0.5 ${step > n ? "bg-[var(--accent)]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: 呼ばれたい名前 */}
        {step === 1 && (
          <div className="card space-y-4">
            <h2 className="font-bold text-lg">① あなたの呼ばれたい名前</h2>
            <p className="text-sm text-gray-600">
              秘書がこの名前でお声がけします。本名でもニックネームでもOK。
            </p>
            <input
              type="text"
              value={userCallName}
              onChange={(e) => setUserCallName(e.target.value)}
              placeholder="例: 淳くん、たろう、Mike"
              maxLength={30}
              className="w-full p-3 border-2 border-purple-200 rounded-lg text-base focus:border-[var(--accent)] outline-none"
              autoFocus
            />
            <button
              onClick={saveAndNext}
              disabled={!userCallName.trim() || saving}
              className="w-full bg-[var(--accent)] text-white font-bold py-3 rounded-lg disabled:opacity-50"
            >
              {saving ? "保存中…" : "次へ →"}
            </button>
          </div>
        )}

        {/* Step 2: Gemini API キー */}
        {step === 2 && (
          <div className="card space-y-4">
            <h2 className="font-bold text-lg">② Gemini API キーの取得</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              秘書AIを動かすために、Google の Gemini API キーをご自身で取得してください。
              <strong className="text-purple-700">無料枠で1日1,000回まで利用可能</strong>（毎日リセット）。
              ご自身のキーなので、運営側で利用内容を知ることはできません。
            </p>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm leading-relaxed">
              <div className="font-bold text-purple-700 mb-2">📝 取得手順</div>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                     className="text-purple-700 underline font-bold">
                    Google AI Studio を開く ↗
                  </a>
                </li>
                <li>Google アカウントでログイン（このアプリと同じアカウントでOK）</li>
                <li>右上の <strong>「Create API key」</strong> ボタンを押す</li>
                <li>プロジェクト選択 or 「Create API key in new project」</li>
                <li><strong>「AIzaSy...」で始まる文字列</strong>をコピー</li>
                <li>下の枠に貼り付け</li>
              </ol>
            </div>

            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy... を貼り付け"
              className="w-full p-3 border-2 border-purple-200 rounded-lg text-base font-mono focus:border-[var(--accent)] outline-none"
            />
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
              >
                ← 戻る
              </button>
              <button
                onClick={saveAndNext}
                disabled={!geminiKey.trim() || saving}
                className="flex-1 bg-[var(--accent)] text-white font-bold py-3 rounded-lg disabled:opacity-50"
              >
                {saving ? "保存中…" : "次へ →"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 完了 */}
        {step === 3 && (
          <div className="card space-y-4 text-center">
            <div className="text-6xl">🎉</div>
            <h2 className="font-bold text-xl text-purple-700">準備完了！</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              これで秘書AIが使えます。<br />
              ホーム画面で「{userCallName}」と呼びかけてくれます。
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-left">
              <div className="font-bold text-amber-700 mb-1">✨ おすすめの次の一手</div>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>「⚙️ 設定」から秘書の名前・アバター画像をカスタマイズ</li>
                <li>スマホに通知を飛ばしたい場合は ntfy を設定</li>
                <li>Chrome 拡張機能で集中モード＋タイマー</li>
              </ul>
            </div>
            <button
              onClick={() => router.replace("/")}
              className="w-full bg-[var(--accent)] text-white font-bold py-3 rounded-lg"
            >
              ホームへ
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-gray-400 hover:text-purple-600 underline">
            スキップしてホームへ
          </Link>
        </div>
      </div>
    </main>
  );
}
