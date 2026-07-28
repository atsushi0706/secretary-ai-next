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

// 吐く＝口をすぼめて細く強く少しずつ吐ききる → 吐いたら少し止めて真空を作る(5秒) → 強く吸う → ゆっくり整える
const EXHALE = 10; // すぼめて少しずつ吐ききる
const HOLD = 5;    // 吐ききったら少し止める＝真空の状態を作る（5秒）
const INHALE = 4;  // 一気に、強く吸う
const SETTLE = 15; // ゆっくり呼吸で、15秒かけてならす

function buildSteps(): Step[] {
  const steps: Step[] = [
    { instr: "立って、体を軽くゆらそう", say: "じゃあ、はじめよっか。立てるなら立って、体をゆらゆらしてみてね。", count: SETTLE, scale: 1 },
  ];
  for (let i = 0; i < 3; i++) {
    steps.push(
      { instr: `${i + 1}回目：口をすぼめて、細く強く吐ききる（ろうそくを消すように）`, say: `${i + 1}かいめ。お口をすぼめて、ほそーく強く、ふーって少しずつ吐ききってね`, count: EXHALE, scale: 0.35 },
      { instr: "吐ききったら、少し止める（真空を作る・5秒）", say: "そのまま、すこし止めてね。からっぽの真空をつくるよ", count: HOLD, scale: 0.28 },
      { instr: "一気に、強く吸う", say: "つぎは、いっきに、つよく、すってー", count: INHALE, scale: 1.1 },
      { instr: "ゆっくり、呼吸を整える", say: "目をとじて、ゆっくり呼吸を整えてね", count: SETTLE, scale: 1 },
    );
  }
  steps.push(
    { instr: "最後にもう一度、口をすぼめて吐ききる", say: "さいごにもう一回。お口をすぼめて、ぜんぶ吐いてー", count: EXHALE, scale: 0.3 },
    { instr: "少し止める（真空を作る・5秒）", say: "そのまま、すこし止めて、真空をつくってね", count: HOLD, scale: 0.24 },
    { instr: "一気に、強く吸う", say: "いっきに、つよく、すってー", count: INHALE, scale: 1.12 },
    { instr: "ゆっくり、呼吸を整えて、目を開ける", say: "いいね。ゆっくり呼吸を整えて、目をあけてね。", count: SETTLE, scale: 1 },
  );
  return steps;
}

function speak(text: string) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    // 小さい子どものキャラ：高めのピッチ＋ナチュラルな速さ
    u.pitch = 1.6;
    u.rate = 1.0;
    const vs = window.speechSynthesis.getVoices().filter((x) => x.lang?.startsWith("ja"));
    // 女性/子ども寄りの声があれば優先
    const pref = vs.find((x) => /female|woman|girl|child|kyoko|o-ren|nanami|haruka/i.test(x.name)) || vs[0];
    if (pref) u.voice = pref;
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
          style={{ transform: `scale(${scale})`, transitionDuration: cur ? `${cur.count}s` : ".4s" }}
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
