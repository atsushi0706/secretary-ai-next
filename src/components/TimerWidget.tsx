"use client";

import { useEffect, useRef, useState } from "react";

// Web Audio API でビープ音を生成 (mp3不要)
function beep(durationMs = 600, freq = 880) {
  try {
    const Ctor =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    o.start();
    o.stop(ctx.currentTime + durationMs / 1000 + 0.02);
    setTimeout(() => ctx.close(), durationMs + 200);
  } catch (e) { console.error("beep failed", e); }
}

function ringAlarm() {
  // ピンポンパンポン: 3回鳴らす
  beep(400, 988); // B5
  setTimeout(() => beep(400, 1318), 500); // E6
  setTimeout(() => beep(700, 988), 1000);
  setTimeout(() => beep(400, 988), 1900);
  setTimeout(() => beep(400, 1318), 2400);
  setTimeout(() => beep(700, 988), 2900);
}

export function TimerWidget() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [label, setLabel] = useState<string>("");
  const [finished, setFinished] = useState<{ label: string } | null>(null);
  const endAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      // 鳴らす
      ringAlarm();
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`タイマー終了: ${label}`, {
            body: "時間です",
            icon: "/kiyose.png",
          });
        }
      } catch { /* ignore */ }
      setFinished({ label });
      setRemaining(null);
      setLabel("");
      endAtRef.current = null;
      return;
    }
    // 経過時間ベースで正確に計算（タブが裏で遅れても正確）
    const id = setInterval(() => {
      if (!endAtRef.current) return;
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
    }, 250);
    return () => clearInterval(id);
  }, [remaining, label]);

  function start(minutes: number, lbl: string) {
    // 通知許可
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch { /* ignore */ }
    // 音声コンテキスト解放のためダミービープ（ユーザー操作起点で実行されるので OK）
    try {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctor) {
        const c = new Ctor();
        if (c.state === "suspended") c.resume();
        c.close();
      }
    } catch { /* ignore */ }
    setFinished(null);
    setLabel(lbl);
    endAtRef.current = Date.now() + minutes * 60 * 1000;
    setRemaining(minutes * 60);
  }

  function stop() {
    endAtRef.current = null;
    setRemaining(null);
    setLabel("");
  }

  function dismiss() {
    setFinished(null);
  }

  const mm = remaining !== null ? String(Math.floor(remaining / 60)).padStart(2, "0") : "00";
  const ss = remaining !== null ? String(remaining % 60).padStart(2, "0") : "00";
  const running = remaining !== null;

  return (
    <section className="card">
      <div className="font-bold text-sm mb-2 flex items-center gap-1">
        ⏱ タイマー
      </div>
      {running ? (
        <div className="text-center">
          <div className="text-4xl font-extrabold tabular-nums text-purple-700 leading-none">
            {mm}:{ss}
          </div>
          <div className="text-xs text-gray-500 mt-1 mb-3">{label} カウント中</div>
          <button
            onClick={stop}
            className="text-xs bg-gray-100 hover:bg-red-50 hover:text-red-600 px-4 py-1.5 rounded border border-gray-200"
          >
            停止
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <button
              onClick={() => start(30, "30分")}
              className="flex-1 bg-[var(--accent)] hover:opacity-90 text-white text-sm font-bold py-2.5 rounded-lg shadow-sm"
            >
              30分
            </button>
            <button
              onClick={() => start(5, "5分")}
              className="flex-1 bg-purple-400 hover:bg-purple-500 text-white text-sm font-bold py-2.5 rounded-lg shadow-sm"
            >
              5分
            </button>
          </div>
          {finished && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs flex items-center gap-2">
              <span className="text-amber-700 font-bold">🔔 {finished.label} 終了！</span>
              <button
                onClick={dismiss}
                className="ml-auto text-amber-700 hover:text-amber-900"
              >
                ✕
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
