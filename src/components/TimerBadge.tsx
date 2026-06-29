"use client";

/**
 * 画面右下に常駐するフローティングタイマーバッジ。
 * グローバル context (TimerProvider) の状態を見て、タイマー稼働中 or 終了アラート中だけ表示。
 * 横ゲージ (LEDメーター風) + 残時間 + 停止ボタン。
 *
 * layout.tsx で全ページに配置するので、設定・welcome・errors など、どこに居ても見える。
 */
import { useTimer, TimerGauge } from "./TimerContext";

export function TimerBadge() {
  const { state, finished, remainingMs, stop, dismiss } = useTimer();
  const running = !!state;

  if (!running && !finished) return null;

  const totalMs = state?.durationMs ?? 0;
  const progress = running && totalMs > 0 ? remainingMs / totalMs : 0;
  const totalSec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");

  // 終了アラート (音鳴ってる状態)
  if (finished && !running) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 bg-amber-500 text-white shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3 animate-pulse"
        style={{ maxWidth: "calc(100vw - 2rem)" }}
      >
        <span className="text-2xl">🔔</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">タイマー終了！</div>
          <div className="text-xs opacity-90">音が鳴り続けてます</div>
        </div>
        <button
          onClick={dismiss}
          className="bg-white text-amber-700 font-bold px-3 py-1.5 rounded-lg text-sm hover:bg-amber-50 whitespace-nowrap"
        >
          停止
        </button>
      </div>
    );
  }

  // 稼働中
  return (
    <div
      className="fixed bottom-4 right-4 z-50 bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-purple-200 px-4 py-2.5 flex items-center gap-3"
      style={{ width: "min(360px, calc(100vw - 2rem))" }}
    >
      <div className="flex flex-col items-end whitespace-nowrap">
        <div className="text-2xl font-extrabold tabular-nums text-purple-700 leading-none">
          {mm}:{ss}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">{state?.label}</div>
      </div>
      <div className="flex-1 min-w-0">
        <TimerGauge progress={progress} segments={18} />
      </div>
      <button
        onClick={stop}
        className="text-xs bg-gray-100 hover:bg-red-50 hover:text-red-600 px-3 py-1.5 rounded border border-gray-200 whitespace-nowrap"
      >
        停止
      </button>
    </div>
  );
}
