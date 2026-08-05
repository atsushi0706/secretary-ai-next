"use client";

import { useEffect, useRef, useState } from "react";
import { BREATH_LINES } from "@/lib/breath-lines";
import { feelGuide } from "@/lib/feelGuide";

/**
 * 波動を高める呼吸トレーニング（誘導音声＋カウントダウン＋自分のペースで進む）。
 *
 * - AI/画面が呼吸をガイドする。
 * - 各ステップに秒数のカウントダウン（5秒で吐き切る、など）。
 * - カウントが終わったら「次へ」を押して進む＝体感覚に馴染ませる。
 */

type Step = { instr: string; say: string; count: number; scale: number; img?: string; voice?: string; round?: number };

// 呼吸ステップの図（public に置く）。無ければオーブ表示にフォールバック。
const IMG_EXHALE = "/breath-step1.png"; // ふーっと全部吐ききる
const IMG_HOLD = "/breath-step2.png";   // 吐ききって3秒止める
const IMG_INHALE = "/breath-step3.png"; // はぁーっと一気に吸う
const IMG_SETTLE = "/breath-step4.png"; // 吸った感覚をゆっくりなじませる

// 吐く＝口をすぼめて細く強く少しずつ吐ききる → 吐いたら少し止めて真空を作る(3秒) → 強く吸う → ゆっくり整える
const EXHALE = 10; // すぼめて少しずつ吐ききる
const HOLD = 3;    // 吐ききったら少し止める＝真空の状態を作る（3秒）
const INHALE = 4;  // 一気に、強く吸う
const SETTLE = 15; // ゆっくり呼吸で、15秒かけてならす

// emotion があれば、吸うステップで「未来からの◯◯を吸う」＝インストールにする
function buildSteps(emotionRaw?: string): Step[] {
  // 手紙由来の値に <山括弧> やかっこが混ざったまま画面に出ないよう、入口で落とす
  const emotion = emotionRaw?.replace(/[<>「」]/g, "").trim() || undefined;
  // 喋る言葉は breath-lines.ts が唯一の正（焼き込みと画面がズレないように）。
  // 感情は画面の文字だけで見せる。音声に入れると全員ぶんを焼けなくなるため。
  const L = (k: string) => BREATH_LINES.find((x) => x.key === k)?.text ?? "";
  const inhaleInstr = emotion ? `一気に、強く吸う（未来からの「${emotion}」を）` : "一気に、強く吸う";
  const inhaleSay = emotion ? `いっきに、みらいからの、${emotion}を、つよく、すってー` : "いっきに、つよく、すってー";
  const introSay = emotion
    ? `じゃあ、はじめよっか。立てるなら立って、体をゆらゆらしてね。未来からの「${emotion}」を、これから吸って身体に入れていくよ。`
    : "じゃあ、はじめよっか。立てるなら立って、体をゆらゆらしてみてね。";

  const steps: Step[] = [
    { instr: emotion ? `立って、体を軽くゆらそう（未来の「${emotion}」を入れる準備）` : "立って、体を軽くゆらそう", say: L("intro"), count: SETTLE, scale: 1, voice: "intro" },
  ];
  /**
   * 吐く回数は **3回**。
   *
   * 以前は「3回まわしたあと、最後にもう一度」を足していたので、
   * 実際には4回吐くことになっていた。締めの一言は、3回目の整えに寄せる。
   */
  const ROUNDS = 3;
  for (let i = 0; i < ROUNDS; i++) {
    const last = i === ROUNDS - 1;
    steps.push(
      { instr: `${i + 1}回目：口をすぼめて、細く強く吐ききる（ろうそくを消すように）`, round: i + 1, say: L(`ex${i + 1}`), count: EXHALE, scale: 0.35, img: IMG_EXHALE, voice: `ex${i + 1}` },
      { instr: `吐ききったら、少し止める（真空を作る・${HOLD}秒）`, round: i + 1, say: L(last ? "lasthold" : "hold"), count: HOLD, scale: last ? 0.24 : 0.28, img: IMG_HOLD, voice: last ? "lasthold" : "hold" },
      { instr: last && emotion ? `一気に、強く吸う（「${emotion}」を満たす）` : inhaleInstr,
        say: L("inhale"), count: INHALE, scale: last ? 1.12 : 1.1, img: IMG_INHALE, voice: "inhale" },
      last
        ? { instr: emotion ? `ゆっくり整えて、「${emotion}」を身体に馴染ませる` : "ゆっくり、呼吸を整えて、目を開ける", say: L("lastsettle"), count: SETTLE, scale: 1, img: IMG_SETTLE, voice: "lastsettle" }
        : { instr: "ゆっくり、呼吸を整える", say: L("settle"), count: SETTLE, scale: 1, img: IMG_SETTLE, voice: "settle" },
    );
  }
  return steps;
}

// フォールバック（OpenAI TTSが使えないとき）：ブラウザ読み上げ
function speakFallback(text: string) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.pitch = 1.6;
    u.rate = 1.0;
    const vs = window.speechSynthesis.getVoices().filter((x) => x.lang?.startsWith("ja"));
    const pref = vs.find((x) => /female|woman|girl|child|kyoko|o-ren|nanami|haruka/i.test(x.name)) || vs[0];
    if (pref) u.voice = pref;
    window.speechSynthesis.speak(u);
  } catch { /* 声が出なくても画面で進める */ }
}

// 自然な音声（OpenAI TTS）。固定セリフはブラウザにキャッシュ → 初回だけ生成、以後は再生のみ。
let currentAudio: HTMLAudioElement | null = null;
function stopVoice() {
  try { currentAudio?.pause(); } catch { /* ignore */ }
  currentAudio = null;
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}
/**
 * ひとこと喋る。
 *
 * 順番が大事：
 *   1. TTS API（ElevenLabs → OpenAI）… 自然な声。ブラウザにキャッシュするので生成は初回だけ
 *   2. 同梱の mp3（/voice/breath-*.mp3）… 機械的だが、キーが無くても必ず鳴る保険
 *   3. ブラウザ読み上げ … 最後の砦
 *
 * ※ 以前は 2 を最優先にしていたため、APIを良い声にしても機械的な声のままだった。
 */
/** 焼き込み済み音声の場所（1回だけ取りに行く）。全ユーザー共通なので料金がかからない */
let bakedMap: Record<string, string> | null = null;
let bakedTried = false;
async function loadBaked() {
  if (bakedTried) return;
  bakedTried = true;
  try {
    const d = await (await fetch("/api/tts/bake")).json();
    bakedMap = d?.baked ?? null;
  } catch { bakedMap = null; }
}

async function speakStep(step: { say: string; voice?: string }) {
  // ① 焼き込み済み（0円・全員同じ音）
  if (step.voice) {
    await loadBaked();
    const url = bakedMap?.[step.voice];
    if (url && await playFile(url)) return;
  }
  // ② その場で生成（料金がかかる。焼いていないときだけ）
  if (await speakApi(step.say)) return;
  // ③ 同梱mp3 → ④ ブラウザ読み上げ
  if (step.voice && await playFile(`/voice/breath-${step.voice}.mp3`)) return;
  speakFallback(step.say);
}

async function playFile(src: string): Promise<boolean> {
  stopVoice();
  try {
    const a = new Audio(src);
    currentAudio = a;
    await a.play();
    return true;
  } catch { return false; }
}

/** TTS API で喋る。使えなければ false を返して、呼び出し側が退避する */
async function speakApi(text: string): Promise<boolean> {
  const t = text.trim();
  if (!t) return true;
  stopVoice();
  try {
    // 声のエンジンを変えたらキャッシュも作り直したいので、名前に版を持たせる
    const cache = await caches.open("iw-tts-v2");
    const key = `/__tts__/${encodeURIComponent(t)}`;
    let res = await cache.match(key);
    if (!res) {
      const r = await fetch("/api/tts", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }),
      });
      if (!r.ok) return false;          // キー未設定など → 同梱mp3へ
      await cache.put(key, r.clone());
      res = r;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    currentAudio = a;
    a.onended = () => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } };
    await a.play();
    return true;
  } catch {
    return false;
  }
}

/** 任意の文を喋る（呼吸のステップ以外から呼ばれる用） */
async function speak(text: string) {
  if (await speakApi(text)) return;
  speakFallback(text);
}


export function BreathGuide({ onDone }: { onDone: () => void }) {
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [remain, setRemain] = useState(0);
  const [scale, setScale] = useState(1);
  const stepsRef = useRef<Step[]>([]);
  const tickRef = useRef<any>(null);
  const emotionRef = useRef<string>(""); // 未来からの手紙の「理想の感情」を吸う
  const [emo, setEmo] = useState("");
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({}); // 画像未配置ならオーブに戻す

  useEffect(() => () => { clearInterval(tickRef.current); stopVoice(); }, []);

  // その日の手紙の感情を取り込む（吸ってインストールする対象）
  useEffect(() => {
    fetch("/api/link-letter").then((r) => r.json()).then((d) => {
      const e = d?.letter?.emotion;
      if (typeof e === "string" && e.trim()) { emotionRef.current = e.trim(); setEmo(e.trim()); }
    }).catch(() => {});
  }, []);

  function begin() {
    stepsRef.current = buildSteps(emotionRef.current || undefined);
    setStarted(true);
    goto(0);
  }

  function goto(i: number) {
    const steps = stepsRef.current;
    clearInterval(tickRef.current);
    if (i >= steps.length) {
      stopVoice();
      onDone();
      return;
    }
    const s = steps[i];
    setIdx(i);
    setScale(s.scale);
    setRemain(s.count);
    void speakStep(s);
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
        {cur?.img && !imgFailed[cur.img] ? (
          <img className="breath-img" src={cur.img} alt="" onError={() => setImgFailed((p) => ({ ...p, [cur.img as string]: true }))} />
        ) : (
          <div
            className="breath-orb"
            style={{ transform: `scale(${scale})`, transitionDuration: cur ? `${cur.count}s` : ".4s" }}
          />
        )}
        {started && <div className="breath-count">{remain > 0 ? remain : "○"}</div>}
      </div>

      <div className="breath-instr">
        {cur?.round && <span className="breath-round">{cur.round} / 3 巡目</span>}
        {cur ? cur.instr : "はじめると、声とカウントが導きます"}
      </div>

      {!started ? (
        <div className="breath-start-wrap">
          {!imgFailed["/breath-overview.png"] && (
            <img className="breath-overview" src="/breath-overview.png" alt="呼吸の流れ"
              onError={() => setImgFailed((p) => ({ ...p, "/breath-overview.png": true }))} />
          )}
          {emo && (
            <div className="breath-install">
              未来からの「<b>{emo}</b>」を、吸ってインストールするよ
              {(() => {
                const g = feelGuide(emo);
                return g ? (
                  <span className="bi-feel">
                    <span className="k">どんな感覚？</span>
                    <span className="v">{g.body}</span>
                    <span className="im">{g.image}</span>
                  </span>
                ) : null;
              })()}
            </div>
          )}
          <div className="breath-row">
            <button className="vbar-go breath-start" onClick={begin}>🌬 はじめる</button>
            <button className="breath-skip" onClick={onDone}>スキップ</button>
          </div>
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
