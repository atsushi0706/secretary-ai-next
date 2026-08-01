"use client";

/**
 * 散歩のおとも（歩数カウント）。
 *
 * ブラウザの加速度センサーだけで歩数を数える。
 * ※ ヘルスケア／Google Fit の歩数はアプリ化しないと読めない。ここは
 *   「アプリを開いて歩いている間だけ」の計測。バックグラウンドでは止まる。
 *   だからこそ、パラレルウォークを"実際に歩きながら"やるための道具として置いている。
 *
 * 数え方：
 *   加速度の大きさ（重力込み）を平滑化して、山（ピーク）を数える。
 *   閾値は直近の揺れ幅から動的に決めるので、ポケットでも手持ちでもだいたい拾える。
 *   250ms 以内の連続は同じ一歩として弾く（腕の振りの二重カウント防止）。
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "asking" | "walking" | "denied" | "unsupported";

const MIN_STEP_MS = 260;       // これより短い間隔は同じ一歩とみなす
const SMOOTH = 0.28;           // 平滑化の強さ（大きいほど反応が速い＝ノイズも拾う）
const MIN_AMPLITUDE = 1.1;     // これ未満の揺れは歩行とみなさない（置いてあるだけの誤検知を防ぐ）

export function StepCounter({ onFinish }: { onFinish?: (steps: number, seconds: number) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);   // 揺れの強さ（0-1）＝拾えているかの目安
  const [todayTotal, setTodayTotal] = useState(0);

  // センサー処理は再描画に巻き込まれたくないので ref に持つ
  const smoothed = useRef(0);
  const lastStepAt = useRef(0);
  const rising = useRef(false);
  const lo = useRef(9.8);
  const hi = useRef(9.8);
  const stepsRef = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const handler = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  const todayKey = () => {
    const t = new Date();
    return `sw-steps-${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("DeviceMotionEvent" in window)) setPhase("unsupported");
    try { setTodayTotal(Number(localStorage.getItem(todayKey()) ?? 0)); } catch { /* ignore */ }
  }, []);

  const stop = useCallback((notify = true) => {
    if (handler.current) {
      window.removeEventListener("devicemotion", handler.current);
      handler.current = null;
    }
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setPhase("idle");
    setLevel(0);
    const s = stepsRef.current;
    if (s > 0) {
      try {
        const total = Number(localStorage.getItem(todayKey()) ?? 0) + s;
        localStorage.setItem(todayKey(), String(total));
        setTodayTotal(total);
      } catch { /* ignore */ }
      if (notify) onFinish?.(s, seconds);
    }
    stepsRef.current = 0;
    setSteps(0);
    setSeconds(0);
  }, [onFinish, seconds]);

  useEffect(() => () => { if (handler.current) window.removeEventListener("devicemotion", handler.current); }, []);

  async function start() {
    setPhase("asking");
    try {
      // iOS 13+ は、ボタンを押した流れの中でしか許可を求められない
      const anyMotion = DeviceMotionEvent as any;
      if (typeof anyMotion?.requestPermission === "function") {
        const res = await anyMotion.requestPermission();
        if (res !== "granted") { setPhase("denied"); return; }
      }
    } catch { setPhase("denied"); return; }

    smoothed.current = 9.8; lo.current = 9.8; hi.current = 9.8;
    lastStepAt.current = 0; rising.current = false; stepsRef.current = 0;
    setSteps(0); setSeconds(0);

    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      smoothed.current += (mag - smoothed.current) * SMOOTH;
      const v = smoothed.current;

      // 直近の上下幅をゆっくり追いかけて、閾値をその人の歩き方に合わせる
      hi.current += (Math.max(v, hi.current * 0.995) - hi.current) * 0.08;
      lo.current += (Math.min(v, lo.current * 1.005) - lo.current) * 0.08;
      const amp = hi.current - lo.current;
      setLevel(Math.min(1, amp / 6));

      if (amp < MIN_AMPLITUDE) { rising.current = false; return; }
      const mid = (hi.current + lo.current) / 2;
      const now = Date.now();
      if (!rising.current && v > mid + amp * 0.15) {
        rising.current = true;
        if (now - lastStepAt.current > MIN_STEP_MS) {
          lastStepAt.current = now;
          stepsRef.current += 1;
          setSteps(stepsRef.current);
        }
      } else if (rising.current && v < mid - amp * 0.1) {
        rising.current = false;
      }
    };

    handler.current = onMotion;
    window.addEventListener("devicemotion", onMotion);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    setPhase("walking");
  }

  if (phase === "unsupported") {
    return (
      <div className="sc-box is-flat">
        <span className="sc-msg">この端末では歩数を数えられません（パソコンなど）。スマホで開くと使えます。</span>
      </div>
    );
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className={`sc-box ${phase === "walking" ? "is-on" : ""}`}>
      {phase !== "walking" ? (
        <>
          <div className="sc-head">
            <span className="sc-title">👟 散歩のおとも</span>
            {todayTotal > 0 && <span className="sc-today">今日 {todayTotal.toLocaleString()} 歩</span>}
          </div>
          <p className="sc-lead">
            実際に歩きながら、理想の世界を話してみて。<br />
            <b>画面を閉じると止まります</b>（開いている間だけ数えられます）。
          </p>
          {phase === "denied" && (
            <p className="sc-deny">
              センサーの利用が許可されませんでした。<br />
              iPhoneは「設定 → Safari → モーションと画面の向きのアクセス」をONにしてね。
            </p>
          )}
          <button className="sc-go" onClick={() => void start()} disabled={phase === "asking"}>
            {phase === "asking" ? "準備中…" : "歩きはじめる"}
          </button>
        </>
      ) : (
        <>
          <div className="sc-live">
            <div className="sc-count">
              <span className="sc-n">{steps.toLocaleString()}</span>
              <span className="sc-u">歩</span>
            </div>
            <div className="sc-meta">
              <span className="sc-time">{mm}:{ss}</span>
              <span className="sc-wave">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={`sc-bar ${level > i * 0.2 ? "on" : ""}`} />
                ))}
              </span>
            </div>
          </div>
          <p className="sc-tip">歩きながら話しかけてOK。マイクを使うと、前を向いたまま歩けるよ。</p>
          <button className="sc-stop" onClick={() => stop()}>歩きおわる</button>
        </>
      )}
    </div>
  );
}
