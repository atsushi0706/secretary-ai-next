"use client";

import { useEffect, useRef, useState } from "react";
import { lineOf, voiceFile } from "@/lib/breath-lines";
import { feelGuide } from "@/lib/feelGuide";

/**
 * 波動を高める呼吸トレーニング（誘導音声＋カウントダウン＋自分のペースで進む）。
 *
 * - AI/画面が呼吸をガイドする。
 * - 各ステップに秒数のカウントダウン（5秒で吐き切る、など）。
 * - カウントが終わったら「次へ」を押して進む＝体感覚に馴染ませる。
 */

type Step = {
  /** 画面に出す文（改行はそのまま出す） */
  instr: string;
  /** 音が鳴らないときの読み上げ用 */
  say: string;
  count: number;
  scale: number;
  img?: string;
  /** 鳴らす音声。複数書くと、その順に続けて鳴る（「1回目」→「口を閉じます」など） */
  voice?: string[];
  round?: number;
  /**
   * 「流れにまかせる」でも、ここだけは押して進む。
   *
   * 吐き切るところを勝手に飛ばすと、**吐き切れていないのに次へ行ってしまう**。
   * 細く吐いている途中は時間で流していいが、「全部吐き切った」だけは本人しか知らない。
   * はじめの一歩（体をゆらす→1回目に入る）も、心の準備のために1回だけ止める。
   */
  waitForPerson?: boolean;
  /** 押すボタンの言葉（何を待っているのかが分かるように） */
  waitLabel?: string;
};

/**
 * 呼吸ステップの図（public に置く）。無ければ光の玉（オーブ）に戻る。
 *
 * 【この4枚は、文字が入った解説パネル】
 * 中身は**前のやり方**の説明になっている。
 *   step1「『ふーっ』と全部吐ききる」（頭をお腹に近づけて丸まる／口をすぼめて吐く）
 *   step2「吐ききったあと5秒止める」
 *   step3「口を開けて『はぁーっ』と一気に吸う」
 *   step4「吸った感覚をゆっくりなじませる（約15秒）」
 * 新しい流れ（口を閉じて口の中に圧をかける）と食い違う面があるので、
 * **主題が一致するところにだけ**割り当てる。合う絵が無いところは光の玉にする。
 * 絵の中の秒数（5秒・15秒）に合わせて、こちらのカウントもそろえてある。
 *   ・口を閉じる／口の中に圧をかける … 絵なし（この局面の絵が存在しない）
 *   ・細く長く吐く … 絵なし（玉が縮んでいくほうが「細く長く」に合う）
 */
const IMG_BURST = "/breath-step1.png";  // 全部吐ききる
const IMG_HOLD = "/breath-step2.png";   // 吐ききったあと5秒止める
const IMG_INHALE = "/breath-step3.png"; // 一気に吸う
const IMG_SETTLE = "/breath-step4.png"; // なじませる（約15秒）

/**
 * 各ステップの長さ（秒）。**淳くんが実際に通してみて決めた数字**。
 *
 * カウントは「目安」であって、締め切りではない。0になっても勝手に進まず、
 * 「次へ」を押すまでその場に留まる。だから声より短いところがあってよい
 * （圧をかける・吐き切る は、声が鳴っている間に動作が終わるので短くしてある）。
 * 声：intro 4.2 / closemouth 1.5 / press 4.6 / exhale 6.9 / burst 3.8 /
 *     hold 2.6 / inhale 1.6 / settle 6.6 秒
 */
const T = {
  intro: 10,       // 体をゆらす（淳くんの指定）
  closemouth: 3,   // 口を閉じる（淳くんの指定。掛け声＋この一言で実測2.2秒）
  press: 4,        // 口の中に圧をかける（淳くんの指定。声は実測3.5秒）
  exhale: 10,      // 細く長く吐く（淳くんの指定。16秒は長すぎた）
  burst: 3,        // 勢いよく吐き切る（淳くんの指定）
  hold: 3,         // キープ（淳くんの指定。ボタンなしで流す）
  inhale: 3,       // 一気に吸う（淳くんの指定。ボタンなしで流す）
  settle: 15,      // 馴染ませる（絵に「約15秒」と書いてあるのでそろえる）
};

/**
 * 流れを組む。
 *
 * 【2026-08-07 に作り替えた】淳くんが録り直した音声（音声改.mp4）の流れに合わせた。
 *   はじめ … 目を閉じて体を左右にゆらゆら
 *   1回目 … 口を閉じる → 口の中に圧 → 細く吐く → 勢いよく吐き切る
 *            → キープ → 一気に吸う → 馴染ませる
 *   2回目 … 同じ7つ
 *   3回目 … 同じ7つ
 * 「馴染ませる」まで含めて**丸ごう3回**繰り返すのが、いまの決まり。
 *
 * emotion（未来からの手紙の感情）は**画面の文字だけ**に出す。
 * 音声は録音した固定の11個なので、人によって変わる言葉は音に入れない。
 */
function buildSteps(emotionRaw?: string): Step[] {
  // 手紙由来の値に <山括弧> やかっこが混ざったまま画面に出ないよう、入口で落とす
  const emotion = emotionRaw?.replace(/[<>「」]/g, "").trim() || undefined;
  const L = (k: string) => lineOf(k)?.text ?? "";
  const S = (k: string) => lineOf(k)?.screen ?? "";

  const steps: Step[] = [
    {
      instr: emotion ? `${S("intro")}
（未来からの「${emotion}」を入れる準備）` : S("intro"),
      say: L("intro"), count: T.intro, scale: 1, voice: ["intro"],
      // 最初の一歩だけは、自分で押して入る
      waitForPerson: true, waitLabel: "はじめる ▶",
    },
  ];

  const ROUNDS = 3;
  for (let i = 0; i < ROUNDS; i += 1) {
    const n = i + 1;
    const last = i === ROUNDS - 1;
    steps.push(
      // 掛け声（1回目…）を先に鳴らしてから「口を閉じます」
      // 口を閉じる・口の中に圧をかける … 合う絵が無いので光の玉
      { instr: S("closemouth"), say: L("closemouth"), count: T.closemouth, scale: 0.95,
        voice: [`r${n}`, "closemouth"], round: n },
      { instr: S("press"), say: L("press"), count: T.press, scale: 0.88,
        voice: ["press"], round: n },
      // 細く長く吐く … 玉がゆっくり縮んでいくほうが伝わる
      { instr: S("exhale"), say: L("exhale"), count: T.exhale, scale: 0.45,
        voice: ["exhale"], round: n },
      // ここだけは必ず押して進む。飛ばすと吐き切れていないまま次へ行ってしまう
      { instr: S("burst"), say: L("burst"), count: T.burst, scale: 0.2,
        img: IMG_BURST, voice: ["burst"], round: n,
        waitForPerson: true, waitLabel: "吐き切った ▶" },
      { instr: S("hold"), say: L("hold"), count: T.hold, scale: 0.18,
        img: IMG_HOLD, voice: ["hold"], round: n },
      {
        instr: emotion ? `${S("inhale")}
（未来からの「${emotion}」を）` : S("inhale"),
        say: L("inhale"), count: T.inhale, scale: last ? 1.15 : 1.1,
        img: IMG_INHALE, voice: ["inhale"], round: n,
      },
      {
        instr: emotion && last ? `${S("settle")}
（「${emotion}」が、体に入っていく）` : S("settle"),
        say: L("settle"), count: T.settle, scale: 1,
        img: IMG_SETTLE, voice: ["settle"], round: n,
      },
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

/**
 * ひとこと喋る。
 *
 * ① 淳くんが録った声（/breath/*.mp3）… 料金0。ふつうはここで決まる
 * ② 焼き込み済み（合成）… 録音が無いキーのときだけ
 * ③ その場で生成 → ④ 同梱mp3 → ⑤ ブラウザ読み上げ
 *
 * voice に2つ以上書いてあれば、**その順に続けて鳴らす**
 * （「1回目」→「口を閉じます」のように、掛け声を頭に付けるため）。
 */
async function speakStep(step: { say: string; voice?: string[] }) {
  const keys = step.voice ?? [];
  if (keys.length) {
    // ① 淳くんの声。1つでも鳴らせたら、そのまま順番に鳴らしきる
    let played = false;
    for (const k of keys) {
      if (await playFileToEnd(voiceFile(k))) played = true;
      else break;
    }
    if (played) return;

    // ② 焼き込み済み（合成）
    await loadBaked();
    for (const k of keys) {
      const url = bakedMap?.[k];
      if (url && await playFileToEnd(url)) played = true;
      else break;
    }
    if (played) return;
  }
  // ③ その場で生成（料金がかかる。録音も焼き込みも無いときだけ）
  if (await speakApi(step.say)) return;
  // ④ 同梱mp3 → ⑤ ブラウザ読み上げ
  if (keys[0] && await playFile(`/voice/breath-${keys[0]}.mp3`)) return;
  speakFallback(step.say);
}

/** 鳴らして、鳴り終わるまで待つ（続けて鳴らすときに重ならないように） */
async function playFileToEnd(src: string): Promise<boolean> {
  stopVoice();
  try {
    const a = new Audio(src);
    currentAudio = a;
    await a.play();
    await new Promise<void>((res) => {
      a.onended = () => res();
      a.onerror = () => res();
      // 万一 onended が来なくても止まらないように、長さ＋1秒で先へ
      setTimeout(() => res(), Math.max(1500, (a.duration || 8) * 1000 + 800));
    });
    return true;
  } catch { return false; }
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

  /**
   * 進み方。既定は「流れにまかせる」（押さずに進む）。
   *
   * 押して進む形だと、一連でバーッと通したい人が毎回止められる。
   * かわりに **吐き切るところと、最初の一歩だけ** は押してもらう（Step.waitForPerson）。
   * 選んだほうはこの端末に覚えておく（毎回選び直させない）。
   */
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    try { if (localStorage.getItem("breath-pace") === "manual") setAuto(false); } catch { /* ignore */ }
  }, []);
  const pickPace = (v: boolean) => {
    setAuto(v);
    try { localStorage.setItem("breath-pace", v ? "auto" : "manual"); } catch { /* ignore */ }
  };

  /** この段の声が鳴り終わったか（秒数が来ても、言葉の途中では進めない） */
  const [spoken, setSpoken] = useState(false);
  const idxRef = useRef(0);

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
    idxRef.current = i;
    setScale(s.scale);
    setRemain(s.count);
    // 声が鳴り終わったら印を付ける。秒数が来ても、言葉の途中では次へ行かせない
    setSpoken(false);
    void speakStep(s).then(() => {
      if (idxRef.current === i) setSpoken(true);
    });
    tickRef.current = setInterval(() => {
      setRemain((r) => {
        if (r <= 1) { clearInterval(tickRef.current); return 0; }
        return r - 1;
      });
    }, 1000);
  }

  const steps = stepsRef.current;
  const cur = started ? steps[idx] : null;

  /**
   * 「流れにまかせる」のとき、秒数が来て、声も鳴り終わったら次へ。
   * 押してもらう段（吐き切る・最初の一歩）では止まる。
   */
  useEffect(() => {
    if (!started || !auto) return;
    const s = stepsRef.current[idx];
    if (!s || s.waitForPerson) return;
    if (remain > 0 || !spoken) return;
    const t = setTimeout(() => goto(idx + 1), 350);   // 少しだけ間をとる
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, auto, idx, remain, spoken]);
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
        {/* 渡されたテロップの改行をそのまま出す（読む間が変わるので大事） */}
        <span className="breath-text">{cur ? cur.instr : "はじめると、声とカウントが導きます"}</span>
      </div>

      {!started ? (
        <div className="breath-start-wrap">
          {/*
            全体図（breath-overview.png）はいったん出していない。
            あの絵も「前のやり方」の流れが描かれているので、
            新しい流れ（口の中に圧をかける）と食い違ってしまう。
            描き直したら、またここに戻す。
          */}
          <div className="breath-flow">
            <div className="bf-t">今日の流れ</div>
            <ol>
              <li>目を閉じて、体を左右にゆらゆら</li>
              <li>口を閉じて、口の中にやさしく空気の圧をかける</li>
              <li>唇をストローのように少し開いて、細く長く吐く</li>
              <li>苦しくなったら、勢いよく全部吐き切る</li>
              <li>吐き切ったら、そのまま一度キープ</li>
              <li>一気に、吸い込む</li>
              <li>ゆったり呼吸して、体に馴染ませる</li>
            </ol>
            <div className="bf-n">この 2〜7 を、<b>3回</b>くり返すよ</div>
          </div>
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
          {/* 進み方。押して進みたい人もいるので選べるようにする（選択は端末に覚える） */}
          <div className="breath-pace">
            <div className="bp-t">進み方</div>
            <div className="bp-row">
              <button className={auto ? "on" : ""} onClick={() => pickPace(true)}>
                流れにまかせる<span>押さずに進む。吐き切るところだけ押す</span>
              </button>
              <button className={!auto ? "on" : ""} onClick={() => pickPace(false)}>
                自分で押して進む<span>ひとつずつ、自分のペースで</span>
              </button>
            </div>
          </div>
          <div className="breath-row">
            <button className="vbar-go breath-start" onClick={begin}>🌬 はじめる</button>
            <button className="breath-skip" onClick={onDone}>スキップ</button>
          </div>
        </div>
      ) : (
        <div className="breath-row">
          {auto && !cur?.waitForPerson ? (
            // 流れにまかせているとき。押す必要はないので、いま何を待っているかだけ出す
            <div className="breath-flowing">
              {isLast ? "もうすぐ終わるよ" : spoken && remain === 0 ? "次へいくね…" : "そのまま、流れにのって"}
            </div>
          ) : (
            <button
              className={`breath-next ${ready || cur?.waitForPerson ? "is-ready" : ""}`}
              onClick={() => goto(idx + 1)}
            >
              {isLast ? "おわる"
                : cur?.waitForPerson ? (cur.waitLabel ?? "次へ ▶")
                  : ready ? "次へ ▶" : "次へ（早く進む）"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
