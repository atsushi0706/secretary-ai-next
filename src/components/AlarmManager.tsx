"use client";

/**
 * シンプルアラーム機能
 *  - 時刻 HH:MM (JST 今日) を指定して登録
 *  - 30秒ごとに現在時刻と比較
 *  - 到達したら音 + ブラウザ通知 + 画面内バナー
 *  - 状態は localStorage に保存 (端末・タブ単位。複数端末同期はなし)
 *
 * 使い方:
 *   <AlarmManager />
 *
 * 他コンポーネントから外部APIで追加したい場合:
 *   window.dispatchEvent(new CustomEvent("kiyose:addAlarm", { detail: { time: "15:00", message: "高野さんとのZoom" } }))
 */
import { useEffect, useRef, useState } from "react";

type Alarm = {
  id: string;
  time: string;        // "HH:MM" 今日のJST時刻
  message: string;
  triggered: boolean;
};

const STORAGE_KEY = "kiyose_alarms_v1";

function loadAlarms(): Alarm[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveAlarms(alarms: Alarm[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

function nowHHMM(): string {
  const d = new Date();
  // JST に変換
  const j = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${String(j.getUTCHours()).padStart(2, "0")}:${String(j.getUTCMinutes()).padStart(2, "0")}`;
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10) + "-" + (Date.now() % 100000);
}

/** ピロロンと鳴らす音 (Web Audio API で生成。音声ファイル不要) */
function playBeep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const beepAt = (freq: number, t0: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + t0);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + t0 + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + t0 + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t0);
      osc.stop(ctx.currentTime + t0 + dur + 0.05);
    };
    // 「ピロロン」(高→中→高)
    beepAt(880, 0.0, 0.18);
    beepAt(660, 0.20, 0.18);
    beepAt(880, 0.40, 0.30);
    // 一定時間後に context 解放
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch (e) {
    console.warn("playBeep failed", e);
  }
}

export default function AlarmManager() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [open, setOpen] = useState(false);
  const [draftTime, setDraftTime] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [fired, setFired] = useState<Alarm | null>(null);  // いま鳴ってるアラーム表示用
  const tickRef = useRef<any>(null);
  const hasMounted = useRef(false);

  // 初期ロード
  useEffect(() => {
    setAlarms(loadAlarms());
    hasMounted.current = true;
    // 通知許可をさりげなく取りに行く (初回だけ、ユーザーが UI 開いた時にトリガーするのが本来は丁寧)
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      // 自動 request はブロックされることもあるので、ボタン押下時に request する方が確実 (後述)
    }
  }, []);

  // 永続化
  useEffect(() => {
    if (!hasMounted.current) return;
    saveAlarms(alarms);
  }, [alarms]);

  // 外部から CustomEvent で追加されたらキャッチ
  useEffect(() => {
    function handler(e: any) {
      const detail = e.detail || {};
      if (typeof detail.time !== "string" || !/^\d{2}:\d{2}$/.test(detail.time)) return;
      addAlarm(detail.time, String(detail.message ?? ""));
    }
    window.addEventListener("kiyose:addAlarm", handler);
    return () => window.removeEventListener("kiyose:addAlarm", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarms]);

  // ティッカー: 30秒に1回チェック
  useEffect(() => {
    function tick() {
      const now = nowHHMM();
      setAlarms((prev) => {
        let changed = false;
        const updated = prev.map((a) => {
          if (a.triggered) return a;
          if (a.time === now) {
            // 発火
            playBeep();
            try {
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification("⏰ アラーム", { body: a.message || `${a.time} になりました`, tag: a.id });
              }
            } catch {}
            setFired(a);
            changed = true;
            return { ...a, triggered: true };
          }
          return a;
        });
        return changed ? updated : prev;
      });
    }
    tick();
    tickRef.current = setInterval(tick, 30000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  function addAlarm(time: string, message: string) {
    setAlarms((prev) => [...prev, { id: genId(), time, message, triggered: false }]);
  }

  function removeAlarm(id: string) {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  }

  function clearTriggered() {
    setAlarms((prev) => prev.filter((a) => !a.triggered));
  }

  async function requestNotificationPermission() {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  function onAddClick() {
    if (!draftTime || !/^\d{2}:\d{2}$/.test(draftTime)) return;
    addAlarm(draftTime, draftMessage.trim());
    setDraftTime("");
    setDraftMessage("");
  }

  const pending = alarms.filter((a) => !a.triggered);
  const done = alarms.filter((a) => a.triggered);

  return (
    <>
      {/* 鳴ってるアラームのバナー */}
      {fired && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-pulse">
          <span className="text-2xl">⏰</span>
          <div>
            <div className="font-bold">{fired.time}</div>
            <div className="text-sm">{fired.message || "アラーム"}</div>
          </div>
          <button
            onClick={() => setFired(null)}
            className="ml-3 bg-white text-purple-700 font-bold px-3 py-1 rounded-lg text-sm hover:bg-purple-50"
          >
            停止
          </button>
        </div>
      )}

      {/* 折り畳み式パネル */}
      <details
        className="card mt-3 group"
        open={open}
        onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer flex items-center justify-between font-bold text-sm text-purple-700">
          <span>⏰ アラーム {pending.length > 0 && <span className="text-xs text-gray-500">({pending.length}件セット中)</span>}</span>
          <span className="text-purple-500 group-open:rotate-180 transition text-sm">▼</span>
        </summary>

        <div className="mt-3 space-y-3">
          {/* 追加フォーム */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="time"
              value={draftTime}
              onChange={(e) => setDraftTime(e.target.value)}
              onFocus={requestNotificationPermission}
              className="p-1.5 border rounded text-sm font-mono"
            />
            <input
              type="text"
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              placeholder="メッセージ (任意)"
              maxLength={60}
              className="flex-1 min-w-[160px] p-1.5 border rounded text-sm"
            />
            <button
              onClick={onAddClick}
              disabled={!draftTime}
              className="bg-[var(--accent)] text-white font-bold py-1.5 px-3 rounded-lg text-sm hover:opacity-90 disabled:opacity-40"
            >
              + セット
            </button>
          </div>

          {/* セット中アラーム一覧 */}
          {pending.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-500 font-bold">セット中</div>
              {pending.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm bg-purple-50 border border-purple-200 rounded-lg px-2 py-1.5">
                  <span className="font-mono font-bold text-purple-700">{a.time}</span>
                  <span className="flex-1 text-gray-700 truncate">{a.message || "(メッセージなし)"}</span>
                  <button
                    onClick={() => removeAlarm(a.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                    title="削除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 鳴り終わったアラーム */}
          {done.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400 font-bold">鳴り終わり</div>
                <button
                  onClick={clearTriggered}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  全削除
                </button>
              </div>
              {done.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-xs text-gray-400 px-2 py-1">
                  <span className="font-mono">{a.time}</span>
                  <span className="flex-1 truncate">{a.message || "(メッセージなし)"}</span>
                  <span>✓</span>
                </div>
              ))}
            </div>
          )}

          {/* 説明 */}
          <p className="text-xs text-gray-500 leading-relaxed">
            ※ このタブを開いている間だけ鳴ります（ブラウザ標準）。<br />
            ※ ブラウザの通知許可を求められたら「許可」を選んでください。<br />
            ※ アラームの状態はこの端末・このブラウザにだけ保存されます。
          </p>
        </div>
      </details>
    </>
  );
}
