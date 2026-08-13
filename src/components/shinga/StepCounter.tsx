"use client";

/**
 * 散歩のおとも（歩数）。
 *
 * 【設計方針】ワークの邪魔をしないこと。
 *  - パラレルウォークに入ったら **勝手に数えはじめる**（ボタンを押させない）
 *  - 画面に出るのは **歩数の小さなバッジだけ**。目標も履歴もここには出さない
 *    （記録は「⚖️ からだの記録」と同じく、あとから見る場所で見ればいい）
 *  - 歩き終わり（ワークを出るとき）に自動で保存する
 *
 * ※ ヘルスケア／Google Fit の歩数はアプリ化しないと読めない。ここは
 *   「アプリを開いて歩いている間だけ」の計測。バックグラウンドでは止まる。
 *
 * 数え方：加速度の大きさを平滑化して山を数える。閾値は直近の揺れ幅から動的に決める。
 */
import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";

const MIN_STEP_MS = 260;
const SMOOTH = 0.28;
const MIN_AMPLITUDE = 1.1;
const KEEP = "sw-walking";        // 作り直されても続きから数えるための退避
const OK_KEY = "sw-motion-ok";    // iOSで一度許可したか

export type StepCounterHandle = {
  /** いま数えたぶんを確定して保存する（ワークを出るときに呼ぶ） */
  finish: () => Promise<{ steps: number; seconds: number } | null>;
};

export const StepCounter = forwardRef<StepCounterHandle, { onEarn?: (titles: string[]) => void }>(
function StepCounter({ onEarn }, ref) {
  const [steps, setSteps] = useState(0);
  const [running, setRunning] = useState(false);
  const [needTap, setNeedTap] = useState(false);   // iOSで許可がまだのときだけ出す
  const [unsupported, setUnsupported] = useState(false);

  const smoothed = useRef(0);
  const lastStepAt = useRef(0);
  const rising = useRef(false);
  const lo = useRef(9.8);
  const hi = useRef(9.8);
  const stepsRef = useRef(0);
  const secRef = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const handler = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  const keep = (on: boolean) => {
    try {
      if (on) localStorage.setItem(KEEP, JSON.stringify({ steps: stepsRef.current, sec: secRef.current, at: Date.now() }));
      else localStorage.removeItem(KEEP);
    } catch { /* ignore */ }
  };

  const begin = useCallback(() => {
    if (handler.current) return;   // 二重起動しない
    smoothed.current = 9.8; lo.current = 9.8; hi.current = 9.8;
    lastStepAt.current = 0; rising.current = false;

    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      smoothed.current += (mag - smoothed.current) * SMOOTH;
      const v = smoothed.current;
      hi.current += (Math.max(v, hi.current * 0.995) - hi.current) * 0.08;
      lo.current += (Math.min(v, lo.current * 1.005) - lo.current) * 0.08;
      const amp = hi.current - lo.current;
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
    timer.current = setInterval(() => { secRef.current += 1; keep(true); }, 1000);
    setRunning(true);
    setNeedTap(false);
  }, []);

  /** iOSは操作の流れの中でしか許可を求められないので、そこだけタップしてもらう */
  const askAndBegin = useCallback(async () => {
    try {
      const anyMotion = DeviceMotionEvent as any;
      if (typeof anyMotion?.requestPermission === "function") {
        const res = await anyMotion.requestPermission();
        if (res !== "granted") { setNeedTap(true); return; }
        try { localStorage.setItem(OK_KEY, "1"); } catch { /* ignore */ }
      }
      begin();
    } catch { setNeedTap(true); }
  }, [begin]);

  /*
   * 【いったん入れて、やめたこと】
   * 「iPhoneで、パラレルウォーク中に音声入力すると落ちる」という声に対して、
   * 録音のあいだ、ゆれ（devicemotion）の受信を止める手当てを入れた。
   *
   * やめた理由（淳くん）：
   *   「音声入力中は歩数のカウントが始まらないのは嫌だな。
   *     これで本当に強制終了になってるのかな？ もしそうじゃないなら、
   *     歩きながら話してるんだから、これを元に戻してほしい」
   *
   * その通りで、**iOSが原因だと確かめたわけではなかった。**
   * 確かでないことのために、歩きながら話す人の歩数を毎回捨てるのは割に合わない。
   * だから戻した。数えるのは、録音中も止めない。
   *
   * 代わりに、本当に落ちているのかを**記録で確かめる**ようにした
   *（useDictation の「録音中の目印」→ 次に開いたときに気づいて報告する）。
   */

  // 入ったら勝手に数えはじめる
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("DeviceMotionEvent" in window)) { setUnsupported(true); return; }

    // 直前まで数えていたぶんがあれば引き継ぐ
    try {
      const raw = localStorage.getItem(KEEP);
      if (raw) {
        const k = JSON.parse(raw);
        if (k && Date.now() - k.at < 300_000 && k.steps > 0) {
          stepsRef.current = k.steps; setSteps(k.steps); secRef.current = k.sec ?? 0;
        } else localStorage.removeItem(KEEP);
      }
    } catch { /* ignore */ }

    const anyMotion = DeviceMotionEvent as any;
    if (typeof anyMotion?.requestPermission === "function") {
      // iOS：一度許可していれば黙って開始、まだなら小さくタップを促す
      let allowed = false;
      try { allowed = localStorage.getItem(OK_KEY) === "1"; } catch { /* ignore */ }
      if (allowed) void askAndBegin(); else setNeedTap(true);
    } else {
      begin();   // Android など：許可不要なのでそのまま
    }

    return () => {
      if (handler.current) { window.removeEventListener("devicemotion", handler.current); handler.current = null; }
      if (timer.current) { clearInterval(timer.current); timer.current = null; }
    };
  }, [begin, askAndBegin]);

  // ワークを出るときに、親から確定を呼んでもらう
  useImperativeHandle(ref, () => ({
    finish: async () => {
      if (handler.current) { window.removeEventListener("devicemotion", handler.current); handler.current = null; }
      if (timer.current) { clearInterval(timer.current); timer.current = null; }
      setRunning(false);
      const s = stepsRef.current, sec = secRef.current;
      stepsRef.current = 0; secRef.current = 0;
      setSteps(0); keep(false);
      if (s < 20) return null;   // ほとんど歩いていない＝記録しない
      try {
        const d = await (await fetch("/api/steps", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steps: s, seconds: sec }),
        })).json();
        const earned = (d?.earned ?? []) as { title: string }[];
        if (earned.length) onEarn?.(earned.map((e) => e.title));
      } catch { /* 保存できなくても歩いた事実は変わらない */ }
      return { steps: s, seconds: sec };
    },
  }), [onEarn]);

  if (unsupported) return null;   // パソコンなどでは、そもそも何も出さない

  if (needTap) {
    return (
      <button className="sc-chip is-ask" onClick={() => void askAndBegin()}>
        👟 歩数を数える
      </button>
    );
  }
  if (!running && steps === 0) return null;

  return (
    <div className="sc-chip">
      <span className="sc-dot" />
      👟 <b>{steps.toLocaleString()}</b> 歩
    </div>
  );
});
