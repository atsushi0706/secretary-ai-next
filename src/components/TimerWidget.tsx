"use client";

import { useTimer, TimerGauge } from "./TimerContext";

export function TimerWidget() {
  const { state, finished, remainingMs, start, stop, dismiss } = useTimer();
  const running = !!state;
  const totalMs = state?.durationMs ?? 0;
  const progress = running && totalMs > 0 ? remainingMs / totalMs : 0;
  const totalSec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");

  return (
    <section className="card">
      <div className="font-bold text-sm mb-2 flex items-center gap-1">
        ⏱ タイマー
      </div>
      {running ? (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl font-extrabold tabular-nums text-purple-700 leading-none">
              {mm}:{ss}
            </div>
            <div className="text-xs text-gray-500 ml-auto">{state?.label}</div>
          </div>
          <TimerGauge progress={progress} className="mb-3" />
          <button
            onClick={stop}
            className="w-full text-xs bg-gray-100 hover:bg-red-50 hover:text-red-600 px-4 py-1.5 rounded border border-gray-200"
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
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs flex items-center gap-2 animate-pulse">
              <span className="text-amber-700 font-bold">🔔 タイマー終了！(音が鳴ってます)</span>
              <button
                onClick={dismiss}
                className="ml-auto bg-amber-600 text-white px-3 py-1 rounded font-bold hover:bg-amber-700"
              >
                停止
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
