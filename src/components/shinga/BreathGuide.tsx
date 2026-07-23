"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 波動を高める呼吸トレーニング（誘導音声＋カウントダウン＋自分のペースで進む）。
 *
 * - AI/画面が呼吸をガイドする。
 * - 各ステップに秒数のカウントダウン（5秒で吐き切る、など）。
 * - カウントが終わったら「次へ」を押して進む＝体感覚に馴染ませる。
 */

type Step = { instr: string; say: string; count: number; scale: number };

function buildSteps(): Step[] {
  const steps: Step[] = [
    { instr: "立って、体を軽くゆらそう", say: "じゃあ始めよう。立てる人は立って、体を軽くゆらしてみて。", count: 5, scale: 1 },
  ];
  for (let i = 0; i < 3; i++) {
    steps.push(
      { instr: `${i + 1}回目：口を閉じて、細く吐き切る`, say: `${i + 1}回目。口を閉じて、細く、吐き切って`, count: 5, scale: 0.4 },
      { instr: "ゆっくり、吸う", say: "ゆっくり、吸って", count: 5, scale: 1 },
      { instr: "そのまま、馴染ませる", say: "目を閉じて、その感覚を馴染ませて", count: 8, scale: 1 },
    );
  }
  steps.push(
    { instr: "最後にもう一度、吐き切る", say: "最後にもう一度。口を閉じて、吐き切って", count: 5, scale: 0.35 },
    { instr: "強く、吸う", say: "強く、吸って", count: 4, scale: 1.08 },
    { instr: "ゆっくり、目を開ける", say: "いいね。ゆっくり、目を開けて。", count: 4, scale: 1 },
  );
  return steps;
}

function speak(text: string) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP"; u.rate = 0.92;
    const v = window.speechSynthesis.getVoices().find((x) => x.lang?.startsWith("ja"));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch { /* 声が出なくても画面で進める */ }
}

export function BreathGuide({ onDone }: { onDone: () => void }) {
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [remain, setRemain] = useState(0);
  const [scale, setScale] = useState(1);
  const stepsRef = useRef<Step[]>([]);
  const tickRef = useRef<any>(null);

  useEffect(() => () => { clearInterval(tickRef.current); try { window.speechSynthesis?.cancel(); } catch {} }, []);

  function begin() {
    stepsRef.current = buildSteps();
    setStarted(true);
    goto(0);
  }

  function goto(i: number) {
    const steps = stepsRef.current;
    clearInterval(tickRef.current);
    if (i >= steps.length) {
      try { window.speechSynthesis?.cancel(); } catch {}
      onDone();
      return;
    }
    const s = steps[i];
    setIdx(i);
    setScale(s.scale);
    setRemain(s.count);
    speak(s.say);
    tickRef.current = setInterval(() => {
      setRemain((r) => {
        if (r <= 1) { clearInterval(tickRef.current); return 0; }
        return r - 1;
      });
    }, 1000);
  }

  const steps = stepsRef.current;
  const cur = started ? steps[idx] : null;
  const ready = remain === 0;         // カウント終了＝次へ進める
  const isLast = started && idx >= steps.length - 1;

  return (
    <div className="breath">
      <div className="breath-orb-wrap">
        <div
          className="breath-orb"
          style={{ transform: `scale(${scale})`, transitionDuration: cur ? `${Math.min(cur.count, 6)}s` : ".4s" }}
        />
        {started && <div className="breath-count">{remain > 0 ? remain : "○"}</div>}
      </div>

      <div className="breath-instr">
        {cur ? cur.instr : "はじめると、声とカウントが導きます"}
      </div>

      {!started ? (
        <div className="breath-row">
          <button className="vbar-go breath-start" onClick={begin}>🌬 はじめる</button>
          <button className="breath-skip" onClick={onDone}>スキップ</button>
        </div>
      ) : (
        <div className="breath-row">
          <button
            className={`breath-next ${ready ? "is-ready" : ""}`}
            onClick={() => goto(idx + 1)}
          >
            {isLast ? "おわる" : ready ? "次へ ▶" : "次へ（早く進む）"}
          </button>
        </div>
      )}
    </div>
  );
}
