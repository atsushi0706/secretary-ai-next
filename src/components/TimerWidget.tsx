"use client";

import { useTimer } from "./TimerContext";

/**
 * リアルバースのタイマー＝「クエストに対峙する時間」。
 * タスクをモンスターに見立て、経過とともに相手のHPが削れていく。
 * 終わったら休憩へ→そのままピークステート（目を瞑って整える）に入れる。
 */
const PRESETS = [
  { min: 60, label: "1時間", sub: "大物に挑む", emoji: "🐲" },
  { min: 30, label: "30分", sub: "しっかり削る", emoji: "👹" },
  { min: 5, label: "5分", sub: "小物を片づける", emoji: "👾" },
];

export function TimerWidget() {
  const { state, finished, remainingMs, start, stop, dismiss } = useTimer();
  const running = !!state;
  const totalMs = state?.durationMs ?? 0;
  // 残り時間＝相手のHP。時間が経つほど削れていく
  const hp = running && totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const totalSec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const hpPct = Math.round(hp * 100);
  const hpState = hp > 0.5 ? "full" : hp > 0.2 ? "half" : "low";
  const emoji = PRESETS.find((p) => p.label === state?.label)?.emoji ?? "👾";

  return (
    <section className="card">
      <div className="font-bold text-sm mb-2 flex items-center gap-1">
        ⚔️ クエストに対峙する
      </div>

      {running ? (
        <div className="rv-battle">
          <div className="rv-foe">
            <span className={`rv-foe-emoji ${hpState === "low" ? "is-weak" : ""}`}>{emoji}</span>
            <div className="rv-foe-info">
              <div className="rv-foe-name">{state?.label}のクエスト</div>
              <div className="rv-hpbar">
                <span className={`rv-hpfill is-${hpState}`} style={{ width: `${hpPct}%` }} />
              </div>
              <div className="rv-hptext">残り HP {hpPct}%</div>
            </div>
          </div>

          <div className="rv-clock">{mm}:{ss}</div>

          <button onClick={stop} className="rv-retreat">撤退する（中断）</button>
        </div>
      ) : (
        <>
          {finished ? (
            <div className="rv-win">
              <div className="rv-win-title">⚔️ 討伐完了！</div>
              <p className="rv-win-sub">よく戦った。ここで整えると、次がもっと強く踏み込める。</p>
              <a href="/shinga?place=peak&rest=1" className="rv-rest" onClick={dismiss}>
                🌬 休憩する（目を瞑って整える）→
              </a>
              <button onClick={dismiss} className="rv-skip">まだ続ける</button>
            </div>
          ) : (
            <>
              <p className="rv-lead">どれくらい向き合う？ 時間を決めて、1体ずつ倒していこう。</p>
              <div className="rv-presets">
                {PRESETS.map((p) => (
                  <button key={p.min} onClick={() => start(p.min, p.label)} className="rv-preset">
                    <span className="e">{p.emoji}</span>
                    <span className="t">{p.label}</span>
                    <span className="s">{p.sub}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
