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
  const [birthDate, setBirthDate] = useState("");
  const [birthName, setBirthName] = useState("");

  // 週次シフト
  type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  type Shift = { start: string; end: string; off: boolean };
  // 最初に開いたときは時間入力欄を全部空にしておく（未設定=デフォの9-17で動作）。
  // 一度でも保存したら、その時の値で次回プレフィル。
  const EMPTY_SHIFT: Shift = { start: "", end: "", off: false };
  const [shifts, setShifts] = useState<Record<DayKey, Shift>>({
    mon: { ...EMPTY_SHIFT }, tue: { ...EMPTY_SHIFT }, wed: { ...EMPTY_SHIFT },
    thu: { ...EMPTY_SHIFT }, fri: { ...EMPTY_SHIFT },
    sat: { ...EMPTY_SHIFT }, sun: { ...EMPTY_SHIFT },
  });

  // 0:00 〜 24:00 を 30分刻みで列挙 (00:00, 00:30, 01:00, ..., 23:30, 24:00)
  const TIME_OPTIONS_30MIN: string[] = (() => {
    const arr: string[] = [];
    for (let h = 0; h <= 24; h++) {
      arr.push(`${String(h).padStart(2, "0")}:00`);
      if (h < 24) arr.push(`${String(h).padStart(2, "0")}:30`);
    }
    return arr;
  })();

  /** 月〜金を 9:00-17:00 / 土日休み で埋めるプリセット */
  function applyWeekdayDefault() {
    const next: Record<DayKey, Shift> = {
      mon: { start: "09:00", end: "17:00", off: false },
      tue: { start: "09:00", end: "17:00", off: false },
      wed: { start: "09:00", end: "17:00", off: false },
      thu: { start: "09:00", end: "17:00", off: false },
      fri: { start: "09:00", end: "17:00", off: false },
      sat: { start: "", end: "", off: true },
      sun: { start: "", end: "", off: true },
    };
    setShifts(next);
  }
  function applyClearAll() {
    setShifts({
      mon: { ...EMPTY_SHIFT }, tue: { ...EMPTY_SHIFT }, wed: { ...EMPTY_SHIFT },
      thu: { ...EMPTY_SHIFT }, fri: { ...EMPTY_SHIFT },
      sat: { ...EMPTY_SHIFT }, sun: { ...EMPTY_SHIFT },
    });
  }

  // アップロード
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((s) => {
      setHasGeminiKey(!!s.gemini_api_key_set);
      setNtfyTopic(s.ntfy_topic ?? "");
      setSecretaryName(s.secretary_name ?? "");
      setSecretaryAvatarUrl(s.secretary_avatar_url ?? "");
      setUserCallName(s.user_call_name ?? "");
      setBirthDate(s.birth_date ?? "");
      setBirthName(s.birth_name ?? "");
      // weekly_schedule = {mon: "09:00-17:00" | null, ...} を画面用に展開
      if (s.weekly_schedule && typeof s.weekly_schedule === "object") {
        const ws = s.weekly_schedule;
        const next: any = {};
        (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).forEach((k) => {
          const raw = ws[k];
          if (raw === null) {
            next[k] = { start: "", end: "", off: true };
          } else if (typeof raw === "string") {
            const m = raw.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
            next[k] = m ? { start: m[1], end: m[2], off: false } : { start: "", end: "", off: false };
          } else {
            next[k] = { start: "", end: "", off: false };
          }
        });
        setShifts(next);
      }
      setLoading(false);
    });
  }, []);

  function updateShift(day: DayKey, patch: Partial<Shift>) {
    setShifts((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  /** UI の shifts オブジェクトを weekly_schedule JSON に変換。全曜日空欄なら null を返す (= 未設定扱い) */
  function buildWeeklySchedulePayload(): any {
    const result: any = {};
    let hasAny = false;
    (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).forEach((k) => {
      const s = shifts[k];
      if (s.off) {
        result[k] = null;
        hasAny = true;
      } else if (s.start && s.end) {
        result[k] = `${s.start}-${s.end}`;
        hasAny = true;
      }
      // 両方空白なら省略 → 未設定扱い (デフォの9-17にフォールバック)
    });
    return hasAny ? result : null;
  }

  async function save() {
    const body: any = {
      ntfy_topic: ntfyTopic,
      secretary_name: secretaryName,
      user_call_name: userCallName,
      birth_date: birthDate,
      birth_name: birthName,
      weekly_schedule: buildWeeklySchedulePayload(),
    };
    if (geminiKey) body.gemini_api_key = geminiKey;
    setSaveError("");
    try {
      const r = await fetch("/api/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        setSaved(true);
        if (geminiKey) setHasGeminiKey(true);
        setGeminiKey("");
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await r.json().catch(() => ({}));
        setSaveError(data?.error || `保存に失敗しました (HTTP ${r.status})`);
      }
    } catch (e: any) {
      setSaveError(String(e?.message ?? e));
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

      {/* ── 星（生年月日・名前） ── */}
      <div className="card mt-6 space-y-3">
        <h2 className="font-bold text-base text-purple-700">✦ あなたの星（任意）</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          生年月日を入れておくと、インナーワールドのAIが
          <strong className="text-purple-700">あなたに合った話し方</strong>をします。
          分類して決めつけたりはしません。表に出るのは、聞き方と励まし方が変わることだけです。
        </p>

        <div>
          <label className="block font-bold text-sm mb-1">生年月日</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full p-2 border rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block font-bold text-sm mb-1">お名前（漢字フルネーム）</label>
          <input
            type="text"
            value={birthName}
            onChange={(e) => setBirthName(e.target.value)}
            placeholder="例: 山田 太郎"
            maxLength={40}
            className="w-full p-2 border rounded-lg text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            戸籍の字で入れると精度が上がります。空欄でも大丈夫です。
          </p>
        </div>
      </div>

      {/* ── 固定シフト（週次） ── */}
      <div className="card mt-6 space-y-3">
        <h2 className="font-bold text-base text-purple-700">🕐 固定シフト（週次・任意）</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          曜日ごとの稼働時間。設定すると秘書AIが「その曜日の時間割」を組んでくれる。
          <strong className="text-purple-700">空欄なら 9:00〜17:00 をデフォ</strong>として扱います。
          <br />
          「休み」にチェックすると、その曜日は時間割を作らず軽く挨拶だけ。
        </p>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={applyWeekdayDefault}
            className="text-xs bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg px-3 py-1.5"
          >
            ⚡ 平日 9-17 / 土日休み
          </button>
          <button
            type="button"
            onClick={applyClearAll}
            className="text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5"
          >
            ↺ クリア
          </button>
        </div>

        <div className="space-y-2">
          {([
            ["mon", "月"], ["tue", "火"], ["wed", "水"], ["thu", "木"],
            ["fri", "金"], ["sat", "土"], ["sun", "日"],
          ] as const).map(([k, label]) => {
            const s = shifts[k];
            return (
              <div key={k} className="flex items-center gap-2 text-sm">
                <span className="w-6 font-bold text-gray-700">{label}</span>
                <select
                  value={s.start}
                  onChange={(e) => updateShift(k, { start: e.target.value })}
                  disabled={s.off}
                  className="p-1.5 border rounded text-xs font-mono disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">--:--</option>
                  {TIME_OPTIONS_30MIN.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span className="text-gray-400">〜</span>
                <select
                  value={s.end}
                  onChange={(e) => updateShift(k, { end: e.target.value })}
                  disabled={s.off}
                  className="p-1.5 border rounded text-xs font-mono disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">--:--</option>
                  {TIME_OPTIONS_30MIN.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 ml-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={s.off}
                    onChange={(e) => updateShift(k, { off: e.target.checked })}
                  />
                  休み
                </label>
              </div>
            );
          })}
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

      {/* ── その他 (折りたたみ) ── */}
      <details className="card mt-6 group">
        <summary className="cursor-pointer font-bold text-base text-gray-700 flex items-center justify-between">
          <span>⚙️ その他の設定</span>
          <span className="text-purple-500 group-open:rotate-180 transition text-sm">▼</span>
        </summary>
        <div className="mt-4 space-y-3">
          <h3 className="font-bold text-sm text-purple-700">📱 スマホ通知（任意）</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            設定すると、朝/夜の声かけ・タイマー終了などがスマホにプッシュで届きます。
            ntfy.sh という無料サービスを使います。
          </p>

          <details className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs leading-relaxed">
            <summary className="cursor-pointer font-bold text-purple-700">📝 セットアップ手順を見る</summary>
            <ol className="list-decimal list-inside space-y-1.5 text-gray-700 mt-2">
              <li>
                スマホで <strong>「ntfy」アプリ</strong>をインストール
                （<a href="https://apps.apple.com/jp/app/ntfy/id1625396347" target="_blank" rel="noreferrer" className="underline">iOS</a>
                ／<a href="https://play.google.com/store/apps/details?id=io.heckel.ntfy" target="_blank" rel="noreferrer" className="underline">Android</a>）
              </li>
              <li>他人と被らない「トピック名」を考える（例: <code className="bg-white px-1 rounded">kiyose_yourname_1234</code>）</li>
              <li>ntfy アプリで「＋」→ トピック名を入力 → Subscribe</li>
              <li>下の枠にも同じトピック名を入れて「保存」</li>
              <li>テスト送信: <code className="bg-white px-1 rounded">https://ntfy.sh/トピック名</code> をブラウザで開く</li>
            </ol>
            <div className="mt-2 text-red-600">
              ⚠ トピック名は他人に推測されると通知が漏洩。長くランダムに。
            </div>
          </details>

          <div>
            <label className="block font-bold text-xs mb-1 text-gray-700">ntfy トピック名</label>
            <input
              type="text"
              value={ntfyTopic}
              onChange={(e) => setNtfyTopic(e.target.value)}
              placeholder="例: kiyose_yourname_1234ab"
              className="w-full p-2 border rounded-lg text-sm font-mono"
            />
          </div>
        </div>
      </details>

      {/* ── データの控え ── */}
      <div className="card mt-6">
        <h2 className="font-bold text-base text-purple-700 mb-2">🗄 データの控え</h2>
        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          クエスト・会話・状態の記録を、まるごとファイルに落とせます。
          月に1回やっておくと、万一のときに戻せます。
        </p>
        <Link
          href="/backup"
          className="block text-center bg-gray-100 hover:bg-gray-200 font-bold text-sm py-2 rounded-lg"
        >
          控えを取るページへ
        </Link>
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
          {saveError && (
            <span className="text-red-600 text-xs">❌ {saveError}</span>
          )}
        </div>
      </div>
    </main>
  );
}
