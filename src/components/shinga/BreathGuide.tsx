"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 波動を高める呼吸トレーニング（誘導音声つき）。
 * 画面のオーブが膨らむ／縮むのに合わせて、声で導く。
 *
 * 手順（3回くり返し＋最後の一息）:
 *  口を軽く閉じて → 細く長く吐く → 吐ききる → ゆっくり吸う → 馴染ませる
 *  最後にもう一度、吐ききってから強く吸う。
 */

type Phase = { say: string; sec: number; scale: number; hint: string };

function buildPhases(): Phase[] {
  const cycle: Phase[] = [
    { say: "口を軽く閉じて", sec: 2.5, scale: 0.95, hint: "口を軽く閉じて" },
    { say: "細く、長く……ふーっと吐いて", sec: 6, scale: 0.45, hint: "細く長く、吐く" },
    { say: "最後まで、吐ききって", sec: 2.5, scale: 0.35, hint: "吐ききる" },
    { say: "ゆっくり、吸って", sec: 4, scale: 1, hint: "ゆっくり吸う" },
    { say: "目を閉じて、馴染ませて", sec: 3, scale: 1, hint: "馴染ませる" },
  ];
  const phases: Phase[] = [
    { say: "じゃあ始めよう。立てる人は立って、体を軽く左右にゆらしてみて。", sec: 4.5, scale: 1, hint: "体をゆらす" },
  ];
  const roundLabel = ["1回目", "2回目", "3回目"];
  for (let i = 0; i < 3; i++) {
    phases.push({ ...cycle[0], say: `${roundLabel[i]}。口を軽く閉じて` });
    for (let j = 1; j < cycle.length; j++) phases.push({ ...cycle[j] });
  }
  phases.push(
    { say: "最後にもう一度。口を閉じて、吐ききって", sec: 5, scale: 0.35, hint: "吐ききる" },
    { say: "強く、吸って", sec: 3, scale: 1.08, hint: "強く吸う" },
    { say: "いいね。ゆっくり、目を開けて。", sec: 3.5, scale: 1, hint: "ゆっくり目を開ける" },
  );
  return phases;
}

function speak(text: string) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 0.92;
    u.pitch = 1;
    const v = window.speechSynthesis.getVoices().find((x) => x.lang?.startsWith("ja"));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch { /* 声が出せなくても、画面のガイドで進める */ }
}

export function BreathGuide({ onDone }: { onDone: () => void }) {
  const [running, setRunning] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [scale, setScale] = useState(1);
  const [hint, setHint] = useState("はじめると、声が導きます");
  const phasesRef = useRef<Phase[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => () => { clearTimeout(timerRef.current); try { window.speechSynthesis?.cancel(); } catch {} }, []);

  function start() {
    phasesRef.current = buildPhases();
    setRunning(true);
    setIdx(0);
    step(0);
  }

  function stop() {
    clearTimeout(timerRef.current);
    try { window.speechSynthesis?.cancel(); } catch {}
    setRunning(false);
    setIdx(-1);
    setScale(1);
    setHint("とめました。もう一度はじめてもいいよ");
  }

  function step(i: number) {
    const phases = phasesRef.current;
    if (i >= phases.length) {
      setRunning(false);
      setHint("おつかれさま");
      try { window.speechSynthesis?.cancel(); } catch {}
      onDone();
      return;
    }
    const p = phases[i];
    setIdx(i);
    setScale(p.scale);
    setHint(p.hint);
    speak(p.say);
    timerRef.current = setTimeout(() => step(i + 1), p.sec * 1000);
  }

  const total = phasesRef.current.length || 1;
  const progress = running && idx >= 0 ? Math.round(((idx + 1) / total) * 100) : 0;

  return (
    <div className="breath">
      <div className="breath-orb-wrap">
        <div
          className="breath-orb"
          style={{ transform: `scale(${scale})`, transitionDuration: running && idx >= 0 ? `${phasesRef.current[idx]?.sec ?? 1}s` : ".4s" }}
        />
        <div className="breath-hint">{hint}</div>
      </div>

      {running && (
        <div className="breath-bar"><span style={{ width: `${progress}%` }} /></div>
      )}

      <div className="breath-row">
        {!running ? (
          <button className="vbar-btn is-send" onClick={start}>🌬 はじめる</button>
        ) : (
          <button className="vbar-btn" onClick={stop}>とめる</button>
        )}
        {!running && idx === -1 && (
          <button className="vbar-btn" onClick={onDone}>スキップ</button>
        )}
      </div>
    </div>
  );
}
