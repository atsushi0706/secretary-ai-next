"use client";

/**
 * グローバルタイマー Context。
 *  - 1セッションに1つのタイマー (シンプル化のため)
 *  - localStorage に永続化 → ページ遷移しても継続
 *  - storage イベントで複数タブ間も同期
 *  - 終了時は dismiss されるまで音が鳴り続ける (3秒ごと)
 */
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

type TimerState = {
  label: string;
  startedAt: number;  // epoch ms
  durationMs: number;
};

type TimerValue = {
  state: TimerState | null;
  finished: boolean;
  remainingMs: number;
  start: (minutes: number, label: string) => void;
  stop: () => void;
  dismiss: () => void;  // 終了後の音を止める
};

const STORAGE_KEY = "kiyose_timer_v1";
const FINISHED_KEY = "kiyose_timer_finished_v1";

const TimerCtx = createContext<TimerValue | null>(null);

function loadState(): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj && typeof obj.startedAt === "number" && typeof obj.durationMs === "number") return obj;
    return null;
  } catch { return null; }
}
function saveState(s: TimerState | null) {
  if (typeof window === "undefined") return;
  if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  else localStorage.removeItem(STORAGE_KEY);
}
function loadFinished(): { label: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FINISHED_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function saveFinished(f: { label: string } | null) {
  if (typeof window === "undefined") return;
  if (f) localStorage.setItem(FINISHED_KEY, JSON.stringify(f));
  else localStorage.removeItem(FINISHED_KEY);
}

// Web Audio でビープ音を生成
function beep(durationMs = 600, freq = 880) {
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    o.start();
    o.stop(ctx.currentTime + durationMs / 1000 + 0.02);
    setTimeout(() => ctx.close().catch(() => {}), durationMs + 200);
  } catch { /* ignore */ }
}

function ringAlarmOnce() {
  // ピロロン
  beep(300, 988);
  setTimeout(() => beep(300, 1318), 350);
  setTimeout(() => beep(500, 988), 700);
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState | null>(null);
  const [finished, setFinished] = useState<{ label: string } | null>(null);
  const [now, setNow] = useState<number>(() => (typeof window === "undefined" ? 0 : Date.now()));
  const ringerRef = useRef<any>(null);
  const mountedRef = useRef(false);

  // 初期ロード (localStorage)
  useEffect(() => {
    setState(loadState());
    setFinished(loadFinished());
    mountedRef.current = true;
    setNow(Date.now());
  }, []);

  // storage イベント (別タブで変更されたら同期)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setState(loadState());
      if (e.key === FINISHED_KEY) setFinished(loadFinished());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // 永続化
  useEffect(() => {
    if (!mountedRef.current) return;
    saveState(state);
  }, [state]);
  useEffect(() => {
    if (!mountedRef.current) return;
    saveFinished(finished);
  }, [finished]);

  // ティッカー: 残時間を更新 & 終了検知
  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      const remaining = state.startedAt + state.durationMs - n;
      if (remaining <= 0) {
        // 終了処理
        const lbl = state.label;
        setState(null);
        setFinished({ label: lbl });
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`タイマー終了: ${lbl}`, {
              body: "時間です",
              icon: "/kiyose.png",
              tag: "kiyose-timer-finished",
            });
          }
        } catch { /* ignore */ }
      }
    }, 250);
    return () => clearInterval(id);
  }, [state]);

  // 終了後: 3秒間隔で鳴らし続ける (dismiss されるまで)
  useEffect(() => {
    if (!finished) {
      if (ringerRef.current) { clearInterval(ringerRef.current); ringerRef.current = null; }
      return;
    }
    // 即座に1回鳴らす
    ringAlarmOnce();
    // 以後 3 秒ごとに鳴らす
    ringerRef.current = setInterval(ringAlarmOnce, 3000);
    return () => {
      if (ringerRef.current) { clearInterval(ringerRef.current); ringerRef.current = null; }
    };
  }, [finished]);

  const start = useCallback((minutes: number, label: string) => {
    // 通知許可
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch { /* ignore */ }
    // ユーザー操作起点で AudioContext を1回作って閉じる → 後で beep 可能になる
    try {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctor) {
        const c = new Ctor();
        if (c.state === "suspended") c.resume();
        c.close().catch(() => {});
      }
    } catch { /* ignore */ }
    setFinished(null);
    setState({ label, startedAt: Date.now(), durationMs: minutes * 60 * 1000 });
  }, []);

  const stop = useCallback(() => {
    setState(null);
  }, []);

  const dismiss = useCallback(() => {
    setFinished(null);
  }, []);

  const remainingMs = state ? Math.max(0, state.startedAt + state.durationMs - now) : 0;

  return (
    <TimerCtx.Provider value={{
      state,
      finished: !!finished,
      remainingMs,
      start,
      stop,
      dismiss,
    }}>
      {children}
    </TimerCtx.Provider>
  );
}

export function useTimer(): TimerValue {
  const v = useContext(TimerCtx);
  if (!v) {
    // SSR / フォールバック: ダミー値
    return {
      state: null, finished: false, remainingMs: 0,
      start: () => {}, stop: () => {}, dismiss: () => {},
    };
  }
  return v;
}

/** 横ゲージ (LEDメーター風)。progress 0-1 を渡す (1=満タン, 0=空) */
export function TimerGauge({
  progress,
  segments = 20,
  className = "",
}: { progress: number; segments?: number; className?: string }) {
  const lit = Math.max(0, Math.min(segments, Math.ceil(segments * progress)));
  // 色: 残量に応じてグラデーション (緑→水色→青→紫→ピンク)
  const colorFor = (i: number) => {
    const r = i / Math.max(1, segments - 1);
    if (r < 0.25) return "#10b981"; // green
    if (r < 0.5)  return "#06b6d4"; // cyan
    if (r < 0.75) return "#3b82f6"; // blue
    if (r < 0.9)  return "#a855f7"; // purple
    return "#ec4899";               // pink
  };
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: segments }).map((_, i) => {
        const isOn = i < lit;
        return (
          <div
            key={i}
            className="flex-1 transition-opacity"
            style={{
              height: "16px",
              backgroundColor: isOn ? colorFor(i) : "rgba(0,0,0,0.10)",
              opacity: isOn ? 1 : 0.5,
              boxShadow: isOn ? `0 0 6px ${colorFor(i)}66, inset 0 0 2px rgba(255,255,255,0.4)` : "none",
              borderRadius: "1px",
            }}
          />
        );
      })}
    </div>
  );
}
