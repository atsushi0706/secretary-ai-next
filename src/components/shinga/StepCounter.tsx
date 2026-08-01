"use client";

/**
 * 散歩のおとも（歩数カウント＋記録＋習慣）。
 *
 * ブラウザの加速度センサーだけで歩数を数える。
 * ※ ヘルスケア／Google Fit の歩数はアプリ化しないと読めない。ここは
 *   「アプリを開いて歩いている間だけ」の計測。バックグラウンドでは止まる。
 *   だからこそ、パラレルウォークを"実際に歩きながら"やるための道具として置いている。
 *
 * 数え方：
 *   加速度の大きさ（重力込み）を平滑化して、山（ピーク）を数える。
 *   閾値は直近の揺れ幅から動的に決めるので、ポケットでも手持ちでもだいたい拾える。
 *   260ms 以内の連続は同じ一歩として弾く（腕の振りの二重カウント防止）。
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "asking" | "walking" | "denied" | "unsupported";
type Day = { date: string; steps: number; seconds: number; sessions: number };
type Card = { key: string; title: string; body: string; rarity: "bronze" | "silver" | "gold" };
type Summary = {
  today: number; streak: number; bestStreak: number; total: number; days: number;
  best: { date: string; steps: number } | null;
  history: Day[];
  next: { label: string; at: number; left: number } | null;
  needsMigration?: boolean;
};

const MIN_STEP_MS = 260;
const SMOOTH = 0.28;
const MIN_AMPLITUDE = 1.1;
const RARITY_LABEL: Record<string, string> = { gold: "金", silver: "銀", bronze: "銅" };

export function StepCounter({ onFinish }: { onFinish?: (steps: number, seconds: number) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [sum, setSum] = useState<Summary | null>(null);
  const [openLog, setOpenLog] = useState(false);
  const [won, setWon] = useState<Card[] | null>(null);

  const smoothed = useRef(0);
  const lastStepAt = useRef(0);
  const rising = useRef(false);
  const lo = useRef(9.8);
  const hi = useRef(9.8);
  const stepsRef = useRef(0);
  const secRef = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const handler = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  const load = useCallback(() => {
    fetch("/api/steps").then((r) => r.json()).then(setSum).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && !("DeviceMotionEvent" in window)) setPhase("unsupported");
    load();
  }, [load]);

  useEffect(() => () => { if (handler.current) window.removeEventListener("devicemotion", handler.current); }, []);

  const stop = useCallback(async () => {
    if (handler.current) { window.removeEventListener("devicemotion", handler.current); handler.current = null; }
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setPhase("idle"); setLevel(0);
    const s = stepsRef.current, sec = secRef.current;
    stepsRef.current = 0; secRef.current = 0;
    setSteps(0); setSeconds(0);
    if (s <= 0) return;
    try {
      const d: Summary & { earned?: Card[] } = await (await fetch("/api/steps", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: s, seconds: sec }),
      })).json();
      setSum(d);
      if (d.earned?.length) setWon(d.earned);
    } catch { /* 保存できなくても会話は続ける */ }
    onFinish?.(s, sec);
  }, [onFinish]);

  async function start() {
    setPhase("asking");
    try {
      const anyMotion = DeviceMotionEvent as any;
      if (typeof anyMotion?.requestPermission === "function") {
        const res = await anyMotion.requestPermission();
        if (res !== "granted") { setPhase("denied"); return; }
      }
    } catch { setPhase("denied"); return; }

    smoothed.current = 9.8; lo.current = 9.8; hi.current = 9.8;
    lastStepAt.current = 0; rising.current = false;
    stepsRef.current = 0; secRef.current = 0;
    setSteps(0); setSeconds(0);

    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      smoothed.current += (mag - smoothed.current) * SMOOTH;
      const v = smoothed.current;
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
    timer.current = setInterval(() => { secRef.current += 1; setSeconds(secRef.current); }, 1000);
    setPhase("walking");
  }

  if (phase === "unsupported") {
    return <div className="sc-box is-flat"><span className="sc-msg">この端末では歩数を数えられません（パソコンなど）。スマホで開くと使えます。</span></div>;
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const todayNow = (sum?.today ?? 0) + steps;   // 計測中は今の歩数も足して見せる

  return (
    <>
      <div className={`sc-box ${phase === "walking" ? "is-on" : ""}`}>
        {phase !== "walking" ? (
          <>
            <div className="sc-head">
              <span className="sc-title">👟 散歩のおとも</span>
              {sum && sum.streak > 0 && <span className="sc-streak">🔥 {sum.streak}日つづけて</span>}
            </div>

            {/* 今日の歩数と、次に手が届くもの */}
            <div className="sc-todaybar">
              <div className="sc-tnum"><b>{(sum?.today ?? 0).toLocaleString()}</b><span>歩 / 今日</span></div>
              {sum?.next ? (
                <div className="sc-next">
                  <div className="sc-next-txt">
                    「{sum.next.label}」まで <b>あと{sum.next.left.toLocaleString()}歩</b>
                  </div>
                  <span className="sc-next-track">
                    <span className="sc-next-fill" style={{ width: `${Math.min(100, ((sum.today ?? 0) / sum.next.at) * 100)}%` }} />
                  </span>
                </div>
              ) : (
                <div className="sc-next-done">今日のぶんは全部とった 🏅</div>
              )}
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
            {sum?.needsMigration && <p className="sc-deny">記録の保存先がまだ作られていません（step_logs）。</p>}

            <button className="sc-go" onClick={() => void start()} disabled={phase === "asking"}>
              {phase === "asking" ? "準備中…" : "歩きはじめる"}
            </button>

            <button className="sc-logtoggle" onClick={() => { setOpenLog((v) => !v); if (!openLog) load(); }}>
              {openLog ? "▲ 記録を閉じる" : "▼ これまでの記録を見る"}
            </button>

            {openLog && sum && <StepLog sum={sum} />}
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
                  {[0, 1, 2, 3, 4].map((i) => <span key={i} className={`sc-bar ${level > i * 0.2 ? "on" : ""}`} />)}
                </span>
              </div>
            </div>
            {sum?.next && (
              <div className="sc-next is-live">
                <div className="sc-next-txt">
                  今日 <b>{todayNow.toLocaleString()}</b> 歩 ／「{sum.next.label}」まであと {Math.max(0, sum.next.at - todayNow).toLocaleString()}
                </div>
                <span className="sc-next-track">
                  <span className="sc-next-fill" style={{ width: `${Math.min(100, (todayNow / sum.next.at) * 100)}%` }} />
                </span>
              </div>
            )}
            <p className="sc-tip">歩きながら話しかけてOK。マイクを使うと、前を向いたまま歩けるよ。</p>
            <button className="sc-stop" onClick={() => void stop()}>歩きおわる</button>
          </>
        )}
      </div>

      {/* 手に入れたカード */}
      {won && (
        <div className="sw-overlay" onClick={() => setWon(null)}>
          <div className="sw-card" onClick={(e) => e.stopPropagation()}>
            <div className="sw-kicker">歩いて手に入れた</div>
            {won.map((c) => (
              <div key={c.key} className={`sw-item r-${c.rarity}`}>
                <div className="sw-top"><span className="sw-rar">{RARITY_LABEL[c.rarity]}</span><span className="sw-title">{c.title}</span></div>
                <div className="sw-body">{c.body}</div>
              </div>
            ))}
            <button className="sw-close" onClick={() => setWon(null)}>受け取る</button>
          </div>
        </div>
      )}
    </>
  );
}

/** これまでの記録（直近30日の棒グラフ＋積み上がったもの） */
function StepLog({ sum }: { sum: Summary }) {
  const days = [...sum.history].slice(0, 30).reverse();
  const max = Math.max(3000, ...days.map((d) => d.steps));
  const md = (s: string) => s.slice(5).replace("-", "/");
  return (
    <div className="sc-log">
      <div className="sc-stats">
        <div className="sc-stat"><b>{sum.streak}</b><span>連続日</span></div>
        <div className="sc-stat"><b>{sum.days}</b><span>歩いた日</span></div>
        <div className="sc-stat"><b>{sum.total.toLocaleString()}</b><span>累計</span></div>
        <div className="sc-stat"><b>{sum.bestStreak}</b><span>最長連続</span></div>
      </div>

      {days.length === 0 ? (
        <p className="sc-empty">まだ記録がないよ。1回歩くと、ここに積み上がっていく。</p>
      ) : (
        <>
          <div className="sc-chart">
            {days.map((d) => (
              <span key={d.date} className="sc-col" title={`${d.date}　${d.steps.toLocaleString()}歩`}>
                <span className={`sc-colbar ${d.steps >= 3000 ? "is-goal" : ""}`}
                  style={{ height: `${Math.max(3, (d.steps / max) * 100)}%` }} />
              </span>
            ))}
          </div>
          <div className="sc-axis"><span>{days[0] ? md(days[0].date) : ""}</span><span>今日</span></div>
          {sum.best && <div className="sc-best">いちばん歩いた日：{md(sum.best.date)}　{sum.best.steps.toLocaleString()}歩</div>}
        </>
      )}

      <div className="sc-goals">
        <div className="sc-goals-t">歩いて手に入るもの</div>
        <div className="sc-goal"><span className="g-n">3,000</span>はじまりの一歩（銅）</div>
        <div className="sc-goal"><span className="g-n">6,000</span>道をひらく脚（銀）</div>
        <div className="sc-goal"><span className="g-n">10,000</span>遠くまで行ける者（金）</div>
        <div className="sc-goal"><span className="g-n">3日</span>三日の道（銅）／<span className="g-n">7日</span>七日の巡礼（銀）／<span className="g-n">30日</span>旅を生きる者（金）</div>
      </div>
    </div>
  );
}
