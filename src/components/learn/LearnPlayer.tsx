"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Episode, ExpStep, Face, Line, Part, Scene, Slide } from "@/lib/learn/types";
import { VOICE_OF } from "@/lib/learn/types";
import type { AdventureEvidence, AdventureNode, AdventureScenario } from "@/lib/learn/adventure";
import { interpolateAdventureText } from "@/lib/learn/adventure";
import { MangaArt } from "./MangaArt";

/* ═══════════════════════ 声 ═══════════════════════
 * 1行ずつ同じ低い男性音声で鳴らす。声質が途中で変わらないよう、焼き込み音声と
 * ブラウザ内蔵音声は混ぜず、/api/tts の VOICEVOX 青山龍星だけを使う。
 * 質問チケットのために、途中で止めて・続きから再開できる。
 */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function useVoice(ep: string) {
  void ep;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const runRef = useRef(0);
  const pausedRef = useRef(false);
  const [speaking, setSpeaking] = useState(false);
  const [engine, setEngine] = useState<"baked" | "tts" | "browser" | "silent">("tts");

  const waitWhilePaused = useCallback(async () => {
    while (pausedRef.current) await sleep(120);
  }, []);

  const stop = useCallback(() => {
    runRef.current++;
    const a = audioRef.current;
    if (a) { try { a.pause(); a.src = ""; } catch { /* ignore */ } }
    audioRef.current = null;
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    setSpeaking(false);
  }, []);

  const playUrl = useCallback((url: string, run: number) => new Promise<boolean>((resolve) => {
    const a = new Audio();
    audioRef.current = a;
    a.preload = "auto";
    a.onended = () => resolve(true);
    a.onerror = () => resolve(false);
    a.src = url;
    a.play().then(() => { if (runRef.current === run) setSpeaking(true); }).catch(() => resolve(false));
  }), []);

  const speak = useCallback(async (line: Line): Promise<void> => {
    stop();
    const run = runRef.current;
    // 合成待ちも「再生中」と同じ中断可能状態にする。
    setSpeaking(true);
    await waitWhilePaused();
    if (runRef.current !== run) { setSpeaking(false); return; }

    // 全台詞を同じ VOICEVOX 話者で合成する。
    let ok = false;
    try {
      const r = await fetch("/api/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: line.text, speaker: VOICE_OF[line.who], strictVoice: true }),
      });
      if (runRef.current !== run) return;
      if (r.ok) {
        const url = URL.createObjectURL(await r.blob());
        ok = await playUrl(url, run);
        URL.revokeObjectURL(url);
        if (runRef.current !== run) return;
        if (ok) { setEngine("tts"); setSpeaking(false); return; }
      }
    } catch { /* 音声が作れない時は、異なる声へ切り替えず無音にする */ }

    // 合成待ちの間にスキップ／画面移動された場合は、無音待機も開始しない。
    if (runRef.current !== run) { setSpeaking(false); return; }

    // 異なる代替声は使わない。短く待って、文字だけで進められる状態にする。
    setEngine("silent");
    setSpeaking(true);
    await sleep(450);
    setSpeaking(false);
  }, [playUrl, stop, waitWhilePaused]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    try { audioRef.current?.pause(); } catch { /* ignore */ }
    try { window.speechSynthesis?.pause(); } catch { /* ignore */ }
  }, []);
  const resume = useCallback(() => {
    pausedRef.current = false;
    try { void audioRef.current?.play(); } catch { /* ignore */ }
    try { window.speechSynthesis?.resume(); } catch { /* ignore */ }
  }, []);

  useEffect(() => () => stop(), [stop]);
  return { speak, stop, pause, resume, speaking, engine, waitWhilePaused, pausedRef };
}

/* ═══════════════════════ 顔 ═══════════════════════ */

const ERICKSON: Record<Face | "talk", string> = {
  neutral: "/learn/chars/erickson-neutral.webp",
  smile: "/learn/chars/erickson-smile.webp",
  laugh: "/learn/chars/erickson-smile.webp",
  aha: "/learn/chars/erickson-smile.webp",
  think: "/learn/chars/erickson-think.webp",
  shy: "/learn/chars/erickson-neutral.webp",
  talk: "/learn/chars/erickson-talk.webp",
};
const ERICKSON_CUTOUT = "/learn/adventure/erickson-cutout-v1.webp";
const LINK_BASE: Record<Face, string> = {
  neutral: "link-neutral", smile: "link-smile", laugh: "link-smile", aha: "link-smile",
  think: "link-neutral", shy: "link-worry",
};
function linkSrc(face: Face, open: boolean) {
  return `/learn/chars/${LINK_BASE[face]}${open ? "-open" : ""}.webp`;
}

/** 口パク：話している間だけ 開↔閉 を切り替える */
function useMouth(active: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 180);
    return () => window.clearInterval(timer);
  }, [active]);
  return active && tick % 2 === 1;
}

/* ═══════════════════════ スライド ═══════════════════════ */

function SlideView({ slide, sceneLabel }: { slide: Slide | null; sceneLabel?: string }) {
  if (!slide) {
    return (
      <div className="lrn-slide is-empty">
        {sceneLabel && <span className="lrn-scene-chip">{sceneLabel}</span>}
        <div className="lrn-board">
          <span className="lrn-board-title">Utilization</span>
        </div>
      </div>
    );
  }
  const st = slide.style ?? "big";
  return (
    <div className={`lrn-slide is-${st}`} key={JSON.stringify(slide)}>
      {sceneLabel && <span className="lrn-scene-chip">{sceneLabel}</span>}
      {slide.recall && (
        <div className="lrn-recall">
          {slide.recall.map((k) => <MangaArt key={k} art={k} />)}
        </div>
      )}
      {st === "vs" ? (
        <div className="lrn-vs">
          <div className="l"><s>{slide.left}</s></div>
          <div className="x">×</div>
          <div className="r">{(slide.right ?? "").split("\n").map((t, i) => <div key={i}>{t}</div>)}</div>
        </div>
      ) : (
        <>
          {slide.h && (
            <div className={`lrn-h ${st === "strike" || st === "cross" ? "is-struck" : ""}`}>
              {slide.h.split("\n").map((t, i) => <div key={i}>{t}</div>)}
              {st === "cross" && <span className="lrn-cross">×</span>}
            </div>
          )}
          {slide.items && slide.items.length > 0 && (
            <div className="lrn-items">
              {slide.items.map((t, i) => (
                <div className="lrn-item" key={i}>
                  {(st === "flow" || st === "strike") && <span className="arrow">↓</span>}
                  {st === "steps" && <span className="num">{i + 1}</span>}
                  <span className="txt">{t.split("\n").map((s, j) => <div key={j}>{s}</div>)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════ 教室の舞台 ═══════════════════════ */

function Stage({
  line, speaking, slide, sceneLabel, onTap, dim, aside,
}: { line: Line | null; speaking: boolean; slide: Slide | null; sceneLabel?: string; onTap?: () => void; dim?: boolean; aside?: React.ReactNode }) {
  const who = line?.who ?? null;
  const lFace: Face = (who === "link" ? line?.face : line?.react) ?? "neutral";
  const lMouth = useMouth(speaking && who === "link");
  return (
    <div className={`lrn-stage ${dim ? "is-dim" : ""}`} onClick={onTap}>
      <SlideView slide={slide} sceneLabel={sceneLabel} />

      <div className="lrn-bubble-wrap">
        {line ? (
          <div className={`lrn-bubble is-${line.who}`} key={line.id}>
            <span className="lrn-name">{line.who === "teacher" ? "エリクソン" : "リンク"}</span>
            <p>{line.text}</p>
          </div>
        ) : <div className="lrn-bubble is-blank" />}
        {aside}
      </div>

      <div className="lrn-chars">
        <div className={`lrn-char is-teacher ${who === "teacher" ? "is-on" : who ? "is-off" : ""}`}>
          <img src={ERICKSON_CUTOUT} alt="エリクソン" />
        </div>
        <div className={`lrn-char is-link ${who === "link" ? "is-on" : who ? "is-off" : ""}`}>
          <img src={linkSrc(lFace, who === "link" && lMouth)} alt="リンク" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ 質問チケット ═══════════════════════ */

type LearnAskContext = {
  scenarioId?: string;
  caseTitle?: string;
  location?: string;
  objective?: string;
  nodeKind?: string;
  evidence?: string[];
  theme?: string;
  exception?: string;
  exceptionScore?: string;
  clue?: string;
  resource?: string;
  lastInteraction?: string;
};

type AskMessage = { role: "user" | "teacher"; text: string };

function AskSheet({
  ep, sceneNo, tickets, onUse, onClose, title = "先生に聞く", context,
}: {
  ep: string; sceneNo: number; tickets: number; onUse: () => void; onClose: () => void;
  title?: string; context?: LearnAskContext;
}) {
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [ticketUsed, setTicketUsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const [voicing, setVoicing] = useState(false);

  async function ask(suggested?: string) {
    const question = (suggested ?? q).trim();
    if (!question || busy || (!ticketUsed && tickets <= 0)) return;
    setBusy(true); setErr("");
    try { audioRef.current?.pause(); } catch { /* ignore */ }
    setVoicing(false);
    try {
      const r = await fetch("/api/learn/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ep, sceneNo, question, history: messages, context }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? "答えが返ってこなかった"); return; }
      setMessages((old) => [...old, { role: "user", text: question }, { role: "teacher", text: d.answer }]);
      setQ("");
      if (!ticketUsed) {
        setTicketUsed(true);
        onUse();
      }
      // 声（その場で VOICEVOX。失敗しても文字は出ている）
      try {
        const t = await fetch("/api/tts", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: String(d.answer).slice(0, 480), speaker: VOICE_OF.teacher, strictVoice: true }),
        });
        if (t.ok) {
          const url = URL.createObjectURL(await t.blob());
          const au = new Audio(url); audioRef.current = au;
          au.onended = () => setVoicing(false);
          setVoicing(true);
          await au.play().catch(() => setVoicing(false));
        }
      } catch { /* 文字だけ */ }
    } catch (error: unknown) { setErr(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  useEffect(() => () => { try { audioRef.current?.pause(); } catch { /* ignore */ } }, []);
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="lrn-sheet" role="dialog">
      <div className="lrn-sheet-card">
        <div className="lrn-sheet-head">
          <span>🎫 {title}</span>
          <span className="rest">{ticketUsed ? "この対話は追加消費なし" : `残り 🎫 × ${tickets}`}</span>
        </div>
        <p className="lrn-sheet-lead">
          {context?.location ? `「${context.location}」で時間を止めています。` : "授業はここで止まっています。"}
          分からない言葉も、自分の場合の使い方も、そのまま聞いてください。
        </p>

        {messages.length > 0 && <div ref={threadRef} className="lrn-ask-thread" aria-live="polite">
          {messages.map((message, i) => message.role === "user" ? (
            <div className="lrn-ask-msg is-user" key={i}><b>あなた</b><p>{message.text}</p></div>
          ) : (
            <div className="lrn-ask-msg is-teacher" key={i}>
              <div className="lrn-answer-who"><img src={ERICKSON[voicing && i === messages.length - 1 ? "talk" : "smile"]} alt="" /><span>エリクソン</span></div>
              <p>{message.text}</p>
            </div>
          ))}
        </div>}

        {messages.length > 0 && <div className="lrn-ask-followups">
          <span>もう一歩たしかめる</span>
          <button disabled={busy} onClick={() => void ask("今の説明を、専門用語を使わずにもっと簡単に言い換えてください。")}>もっと簡単に</button>
          <button disabled={busy} onClick={() => void ask("私が入力した悩みの場合、今の学びをどう使えばいいですか？")}>自分の場合は？</button>
          <button disabled={busy} onClick={() => void ask("別の解釈や、当てはまらない場合も教えてください。")}>別の解釈は？</button>
        </div>}

        <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={messages.length ? 2 : 3}
          placeholder={messages.length ? "続けて質問する…" : "例：催眠は相手を操ることとは違うの？"} autoFocus={messages.length === 0} />
        {err && <p className="lrn-err">{err}</p>}
        <div className="lrn-sheet-btns">
          <button className="ghost" onClick={onClose}>{messages.length ? "理解できた・戻る" : "やっぱり戻る"}</button>
          <button className="main" disabled={!q.trim() || busy || (!ticketUsed && tickets <= 0)} onClick={() => void ask()}>
            {busy ? "先生が考えている…" : ticketUsed ? "続けて聞く" : "チケットを使って聞く"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ 各パート ═══════════════════════ */

function MangaPart({ ep, part, onDone, label }: { ep: string; part: Extract<Part, { kind: "manga" }>; onDone: () => void; label: string }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [briefed, setBriefed] = useState(() => {
    if (!part.briefing || typeof window === "undefined") return !part.briefing;
    try { return window.localStorage.getItem(`learn:${ep}:briefing:v7`) === "done"; }
    catch { return false; }
  });

  function go(to: number) {
    const next = Math.max(0, Math.min(part.frames.length - 1, to));
    const track = trackRef.current;
    if (track) track.scrollTo({ left: track.clientWidth * next, behavior: "smooth" });
    setIndex(next);
  }

  if (!briefed && part.briefing) {
    const briefing = part.briefing;
    return (
      <div className="lrn-lesson-briefing">
        <img className="lrn-brief-bg" src="/learn/adventure/erickson-study-v1.webp" alt="" />
        <div className="lrn-brief-shade" />
        <img className="lrn-brief-person" src={ERICKSON_CUTOUT} alt="ミルトン・エリクソン" />
        <div className="lrn-lesson-briefing-inner">
          <div className="lrn-brief-eyebrow">{briefing.eyebrow}</div>
          <div className="lrn-brief-title">
            <span>{briefing.title}</span>
            <b>{briefing.principle}</b>
          </div>
          <div className="lrn-brief-case">CASE 01</div>
          <h1>{briefing.hook}</h1>
          <p className="lrn-brief-teaser">{briefing.teaser}</p>
          <button className="lrn-cta" onClick={() => {
            try { window.localStorage.setItem(`learn:${ep}:briefing:v7`, "done"); } catch { /* ignore */ }
            setBriefed(true);
          }}>{briefing.cta}</button>
          {briefing.note && <span className="lrn-exp-time">{briefing.note}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="lrn-manga-story">
      <div
        ref={trackRef}
        className="lrn-manga-track"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.max(0, Math.min(part.frames.length - 1, Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))));
        }}
      >
        {part.frames.map((frame, i) => (
          <section className="lrn-manga-frame" key={frame.img} aria-label={`${i + 1}ページ目`}>
            <img src={frame.img} alt={frame.alt} draggable={false} />
          </section>
        ))}
      </div>

      <div className="lrn-manga-counter">{index + 1} / {part.frames.length}</div>
      {index === 0 && <div className="lrn-swipe-hint">左へスワイプ <span>←</span></div>}
      <div className="lrn-manga-nav">
        <button onClick={() => go(index - 1)} disabled={index === 0} aria-label="前のページ">← 戻る</button>
        {index < part.frames.length - 1
          ? <button className="next" onClick={() => go(index + 1)}>次のページ →</button>
          : <button className="next is-finish" onClick={onDone}>{label}</button>}
      </div>
    </div>
  );
}

function ExperiencePart({ ep, part, voice, onDone }: {
  ep: string; part: Extract<Part, { kind: "experience" }>; voice: ReturnType<typeof useVoice>;
  onDone: () => void;
}) {
  const [started, setStarted] = useState(() => !part.bridge && !part.gate);
  const [timeline, setTimeline] = useState<ExpStep[]>(part.steps);
  const [idx, setIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const saved: Record<string, string> = {};
    for (const key of ["theme", "exception", "exceptionScore", "clueCategory", "clue"]) {
      try {
        const value = window.localStorage.getItem(`learn:${ep}:${key}`)?.trim();
        if (value) saved[key] = value;
      } catch { /* ignore */ }
    }
    return saved;
  });
  const [hintStepId, setHintStepId] = useState<string | null>(null);
  const bridge = part.bridge;
  const gate = part.gate;
  const step = timeline[idx];
  const resolve = useCallback((text: string) => interpolateAdventureText(text, values), [values]);
  const line = useMemo<Line | null>(() => {
    const source = step?.kind === "say" ? step.line : step?.kind === "input" || step?.kind === "scale" ? (step.line ?? null) : null;
    if (!source) return null;
    const text = resolve(source.text);
    return { ...source, text, dynamic: source.dynamic || text !== source.text };
  }, [resolve, step]);
  const inputReady = step?.kind === "input"
    ? Boolean(values[step.id]?.trim())
    : step?.kind === "scale"
      ? Number.isFinite(Number(values[step.id])) && Number(values[step.id]) >= (step.min ?? 0) && Number(values[step.id]) <= (step.max ?? 99)
      : true;

  useEffect(() => {
    if (!started || !line) return;
    void voice.speak(line);
    return () => voice.stop();
    // ステップが変わったときだけ読む
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, idx]);

  useEffect(() => {
    if (!started || step?.kind !== "fade") return;
    const t = window.setTimeout(onDone, 1300);
    return () => window.clearTimeout(t);
  }, [onDone, started, step]);

  function start() {
    setStarted(true);
  }

  function next() {
    if (!inputReady) return;
    voice.stop();
    if (step?.kind === "input" || step?.kind === "scale") {
      try { localStorage.setItem(`learn:${ep}:${step.id}`, values[step.id].trim()); } catch { /* ignore */ }
    }
    if (idx + 1 < timeline.length) setIdx(idx + 1);
    else onDone();
  }

  function back() {
    if (idx <= 0) {
      if (bridge) {
        voice.stop();
        setStarted(false);
      }
      return;
    }
    voice.stop();
    setIdx((i) => Math.max(0, i - 1));
  }

  function choose(option: Extract<ExpStep, { kind: "choice" }>["options"][number]) {
    voice.stop();
    if (step?.kind === "choice" && step.storeAs && option.value) {
      const value = resolve(option.value);
      setValues((old) => ({ ...old, [step.storeAs!]: value }));
      try { localStorage.setItem(`learn:${ep}:${step.storeAs}`, value); } catch { /* ignore */ }
    }
    setTimeline((old) => [...old.slice(0, idx + 1), ...option.then]);
    setIdx(idx + 1);
  }

  return (
    <div className={`lrn-exp ${!started && bridge ? "is-bridge" : step ? `is-${step.kind}` : ""} ${step?.kind === "fade" ? "is-fade" : ""}`}>
      {!started && bridge ? (
        <div className="lrn-exp-bridge">
          <img className="lrn-exp-bridge-bg" src={bridge.background ?? "/learn/adventure/erickson-study-v1.webp"} alt="" />
          <div className="lrn-exp-bridge-shade" />
          <img className="lrn-exp-bridge-person" src={ERICKSON_CUTOUT} alt="ミルトン・エリクソン" />
          <p className="lrn-exp-bridge-narration">{bridge.narration}</p>
          <div className="lrn-exp-bridge-dialogue">
            <b>エリクソン</b>
            <p>{bridge.line}</p>
          </div>
          <button className="lrn-cta" onClick={start}>{bridge.cta}</button>
        </div>
      ) : !started && gate ? (
        <div className="lrn-exp-gate">
          <div className="lrn-exp-gate-portrait"><img src={ERICKSON_CUTOUT} alt="ミルトン・エリクソン" /></div>
          <div className="lrn-kicker">{gate.kicker}</div>
          <h2>{gate.title}</h2>
          <p className="lead">{gate.lead}</p>
          <div className="lrn-exp-brief">
            {gate.steps.map((text, index) => <div key={text}><b>{String(index + 1).padStart(2, "0")}</b><span>{text}</span></div>)}
          </div>
          <button className="lrn-cta" onClick={start}>{gate.cta}</button>
          <span className="lrn-exp-time">{gate.note ?? `約${part.minutes ?? 3}分 ・ 戻る/音声スキップ対応`}</span>
        </div>
      ) : (
        <>
          <div className={`lrn-exp-mentor ${voice.speaking ? "is-on" : ""}`}>
            <div className="lrn-exp-aura" />
            <img src={ERICKSON_CUTOUT} alt="ミルトン・エリクソン" />
            <div className="lrn-exp-name"><b>MILTON H. ERICKSON</b><span>{voice.speaking ? "語りかけています" : step?.kind === "input" || step?.kind === "scale" || step?.kind === "choice" ? "あなたの答えを待っています" : "次へ進めます"}</span></div>
          </div>

          <div className="lrn-exp-dialogue">
            {line && <div className="lrn-exp-speaker">エリクソン</div>}
            {step?.kind === "say" && <p key={step.line.id} className="lrn-exp-line">{resolve(step.line.text)}</p>}
            {step?.kind === "input" && (
              <div className="lrn-exp-turn">
                {line && <p className="lrn-exp-question-line">{line.text}</p>}
                <div className="lrn-exp-prompt">
                <div className="lrn-exp-step">INPUT ・ {idx + 1}</div>
                <h3>{resolve(step.title)}</h3>
                <p>{resolve(step.prompt)}</p>
                {step.hints && <>
                  <button className="lrn-exp-hint-toggle" onClick={() => setHintStepId((id) => id === step.id ? null : step.id)}>
                    {hintStepId === step.id ? "ヒントを閉じる" : "思いつかない時だけヒントを見る"}
                  </button>
                  {hintStepId === step.id && <div className="lrn-exp-items is-optional">{step.hints.map((t, i) => <div key={t} className="lrn-exp-item"><b>0{i + 1}</b>{resolve(t)}</div>)}</div>}
                </>}
                <textarea rows={3} value={values[step.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [step.id]: e.target.value }))} placeholder={step.placeholder ? resolve(step.placeholder) : undefined} autoFocus />
                {step.helper && <small>{resolve(step.helper)}</small>}
                </div>
              </div>
            )}
            {step?.kind === "scale" && (
              <div className="lrn-exp-turn">
                {line && <p className="lrn-exp-question-line">{line.text}</p>}
                <div className="lrn-exp-prompt lrn-exp-scale">
                <div className="lrn-exp-step">SCALE ・ {idx + 1}</div>
                <h3>{resolve(step.title)}</h3>
                <p>{resolve(step.prompt)}</p>
                <div className="lrn-exp-scale-baseline"><span>困難が最も強い状態</span><b>100</b></div>
                <label className="lrn-exp-score-input">
                  <span>あなたが思い出した瞬間</span>
                  <span className="field"><input type="number" inputMode="numeric" min={step.min ?? 0} max={step.max ?? 99}
                    value={values[step.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [step.id]: e.target.value }))} placeholder="80" autoFocus /><b>点</b></span>
                </label>
                {step.helper && <small>{resolve(step.helper)}</small>}
                </div>
              </div>
            )}
            {step?.kind === "choice" && (
              <div className="lrn-exp-choice">
                <div className="lrn-exp-step">SELECT ・ {idx + 1}</div>
                <h3>{resolve(step.q)}</h3>
                {step.help && <p>{resolve(step.help)}</p>}
                <div className="lrn-exp-options">
                  {step.options.map((o, i) => <button key={o.label} onClick={() => choose(o)}><b>{String(i + 1).padStart(2, "0")}</b><span>{resolve(o.label)}</span><i>→</i></button>)}
                </div>
              </div>
            )}
            {step?.kind === "fade" && <div className="lrn-fade">{step.text}</div>}
          </div>

          <div className="lrn-exp-controls">
            <button onClick={back} disabled={idx === 0 && !bridge}>← 戻る</button>
            <button onClick={voice.stop} disabled={!voice.speaking}>⏩ 音声を飛ばす</button>
            {step && step.kind !== "choice" && step.kind !== "fade" && (
              <button className="lrn-exp-next" onClick={next} disabled={!inputReady}>{step.kind === "input" ? "この答えで進む" : step.kind === "scale" ? "この点数で進む" : "次へ"} →</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════ シナリオ駆動アドベンチャー ═══════════════════════ */

function AdventurePart({ ep, scenario, voice, onDone }: {
  ep: string;
  scenario: AdventureScenario;
  voice: ReturnType<typeof useVoice>;
  onDone: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const read = (key: string, fallback: string) => {
      if (typeof window === "undefined") return fallback;
      try { return window.localStorage.getItem(`learn:${ep}:${key}`)?.trim() || fallback; }
      catch { return fallback; }
    };
    return {
      theme: read("theme", "今変えたいこと"),
      exception: read("exception", "まだ見つかっていない100ではなかった瞬間"),
      exceptionScore: read("exceptionScore", "100未満"),
      clue: read("clue", "その瞬間にあった違い"),
      resource: read("resource", "100との差を作った条件を一つ再現する"),
    };
  });
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [activeEvidence, setActiveEvidence] = useState<{ evidence: AdventureEvidence; comment: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const node = scenario.nodes[idx];

  const resolve = useCallback((text: string) => interpolateAdventureText(text, values), [values]);
  const currentLine = useMemo<Line | null>(() => {
    if (node?.kind !== "dialogue") return null;
    const text = resolve(node.line.text);
    return { ...node.line, text, dynamic: node.line.dynamic || text !== node.line.text } as Line;
  }, [node, resolve]);

  useEffect(() => {
    if (!started || !currentLine) return;
    void voice.speak(currentLine);
    return () => voice.stop();
    // ノードが進んだときだけ読み上げる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, idx]);

  function resetChoice() {
    setSelectedId(null);
    setFeedback("");
  }

  function advance() {
    voice.stop();
    resetChoice();
    setActiveEvidence(null);
    if (idx + 1 < scenario.nodes.length) setIdx((i) => i + 1);
    else onDone();
  }

  function back() {
    if (idx <= 0) return;
    voice.stop();
    resetChoice();
    setActiveEvidence(null);
    setIdx((i) => Math.max(0, i - 1));
  }

  function inspect(spot: Extract<AdventureNode, { kind: "investigate" }>['spots'][number]) {
    const evidence = scenario.evidence.find((item) => item.id === spot.evidenceId);
    if (!evidence) return;
    setEvidenceIds((ids) => ids.includes(evidence.id) ? ids : [...ids, evidence.id]);
    setActiveEvidence({ evidence, comment: spot.linkComment });
  }

  function choose(
    challenge: Extract<AdventureNode, { kind: "deduction" | "apply" }>,
    option: Extract<AdventureNode, { kind: "deduction" | "apply" }>['options'][number],
  ) {
    setSelectedId(option.id);
    setFeedback(resolve(option.feedback));
    if (!option.correct) return;
    setSolved((old) => ({ ...old, [challenge.id]: true }));
    if (challenge.kind === "apply" && "value" in option) {
      const value = resolve(option.value);
      setValues((old) => ({ ...old, [challenge.storeAs]: value }));
      try { localStorage.setItem(`learn:${ep}:${challenge.storeAs}`, value); } catch { /* ignore */ }
    }
  }

  const speaker = currentLine?.who ?? null;
  const sceneName = node?.scene ?? scenario.title;
  const gatheredHere = node?.kind === "investigate"
    ? node.spots.filter((spot) => evidenceIds.includes(spot.evidenceId)).length
    : 0;
  const investigateDone = node?.kind === "investigate" && gatheredHere === node.spots.length;
  const availableEvidenceIds = useMemo(() => new Set(
    scenario.nodes.slice(0, idx + 1).flatMap((item) => item.kind === "investigate" ? item.spots.map((spot) => spot.evidenceId) : []),
  ), [idx, scenario.nodes]);
  const availableEvidence = scenario.evidence.filter((item) => availableEvidenceIds.has(item.id));

  return (
    <div className={`lrn-av lrn-av-camera-${node?.kind === "dialogue" ? (node.camera ?? "wide") : "evidence"}`}
      style={{ backgroundImage: `linear-gradient(180deg,rgba(5,9,18,.05),rgba(5,9,18,.78)),url(${scenario.background})` }}>
      <div className="lrn-av-vignette" />

      {!started ? (
        <div className="lrn-av-start">
          <div className="lrn-av-case-no">{scenario.caseNo}</div>
          <h2>{scenario.title}</h2>
          <p className="lrn-av-question">{scenario.question}</p>
          <div className="lrn-av-start-cast" aria-hidden="true">
            <img className="teacher" src={scenario.teacherSprite} alt="" />
            <img className="link" src={scenario.linkSprite} alt="" />
          </div>
          <div className="lrn-av-objective"><b>MISSION</b><span>{scenario.objective}</span></div>
          <button className="lrn-av-primary" onClick={() => setStarted(true)}>捜査を始める</button>
        </div>
      ) : (
        <>
          <div className="lrn-av-hud">
            <div className="lrn-av-hud-case"><b>{scenario.caseNo}</b><span>{sceneName}</span></div>
            <div className="lrn-av-hud-goal">目的：{scenario.objective}</div>
            <div className={`lrn-av-hud-actions ${node?.kind === "dialogue" ? "is-dialogue" : ""}`}>
              <button onClick={back} disabled={idx === 0} aria-label="一つ前へ戻る">↶</button>
              <button onClick={voice.stop} disabled={!voice.speaking} aria-label="音声をスキップ">≫</button>
            </div>
          </div>

          {availableEvidence.length > 0 && <div className="lrn-av-evidence-tray" aria-label={`証拠 ${evidenceIds.length}個`}>
            {availableEvidence.map((evidence) => (
              <span key={evidence.id} className={evidenceIds.includes(evidence.id) ? "is-found" : ""} title={evidence.title}>
                {evidenceIds.includes(evidence.id) ? evidence.icon : "?"}
              </span>
            ))}
          </div>}

          <div className="lrn-av-cast" aria-hidden="true">
            <img className={`teacher ${speaker === "teacher" ? "is-speaking" : speaker ? "is-dim" : ""}`} src={scenario.teacherSprite} alt="" />
            <img className={`link ${speaker === "link" ? "is-speaking" : speaker ? "is-dim" : ""}`} src={scenario.linkSprite} alt="" />
          </div>

          {node?.kind === "dialogue" && currentLine && (
            <div className={`lrn-av-dialogue is-${currentLine.who}`} key={node.id}>
              <div className="lrn-av-speaker">{currentLine.who === "teacher" ? "ミルトン・エリクソン" : "清瀬リンク"}</div>
              <p>{currentLine.text}</p>
              <div className="lrn-av-dialogue-controls">
                <button onClick={back} disabled={idx === 0}>← 戻る</button>
                <button onClick={voice.stop} disabled={!voice.speaking}>⏩ 音声</button>
                <button className="next" onClick={advance}>{node.nextLabel ?? "会話を続ける"} <span>›</span></button>
              </div>
            </div>
          )}

          {node?.kind === "investigate" && (
            <div className="lrn-av-investigate">
              <div className="lrn-av-task-card">
                <b>INVESTIGATION</b><h3>{node.title}</h3><p>{node.prompt}</p>
                <span>{gatheredHere} / {node.spots.length} 発見</span>
              </div>
              {node.spots.map((spot) => {
                const found = evidenceIds.includes(spot.evidenceId);
                return <button key={spot.id} className={`lrn-av-hotspot ${found ? "is-found" : ""}`}
                  style={{ left: `${spot.x}%`, top: `${spot.y}%` }} onClick={() => inspect(spot)}>
                  <i>{found ? "✓" : "!"}</i><span>{spot.label}</span>
                </button>;
              })}
              {investigateDone && !activeEvidence && <button className="lrn-av-primary lrn-av-investigate-next" onClick={advance}>3つの証拠で推理する</button>}
            </div>
          )}

          {(node?.kind === "deduction" || node?.kind === "apply") && (
            <div className={`lrn-av-challenge ${node.kind === "apply" ? "is-apply" : ""}`}>
              <div className="lrn-av-challenge-kicker">{node.kind === "apply" ? "YOUR CASE" : "DEDUCTION"}</div>
              <h3>{resolve(node.title)}</h3>
              <p>{resolve(node.prompt)}</p>
              {node.kind === "deduction" && node.hint && <small>HINT：{resolve(node.hint)}</small>}
              <div className="lrn-av-choice-list">
                {node.options.map((option, optionIndex) => {
                  const selected = selectedId === option.id;
                  const correct = selected && option.correct;
                  const wrong = selected && !option.correct;
                  return <button key={option.id} className={`${selected ? "is-selected" : ""} ${correct ? "is-correct" : ""} ${wrong ? "is-wrong" : ""}`}
                    onClick={() => choose(node, option)} disabled={Boolean(solved[node.id]) && !selected}>
                    <b>{String(optionIndex + 1).padStart(2, "0")}</b><span>{resolve(option.label)}</span><i>{correct ? "✓" : wrong ? "×" : "›"}</i>
                  </button>;
                })}
              </div>
              {feedback && <div className={`lrn-av-feedback ${solved[node.id] ? "is-correct" : ""}`}><b>リンク</b><span>{feedback}</span></div>}
              {solved[node.id] && <button className="lrn-av-primary" onClick={advance}>{node.kind === "apply" ? "この一手を使う" : "推理を確定する"}</button>}
            </div>
          )}

          {node?.kind === "reveal" && (
            <div className="lrn-av-reveal">
              <div className="lrn-av-reveal-kicker">{node.kicker}</div>
              <h3>{resolve(node.title)}</h3>
              <p>{resolve(node.body)}</p>
              {node.evidenceIds && <div className="lrn-av-reveal-evidence">
                {node.evidenceIds.map((id) => {
                  const evidence = scenario.evidence.find((item) => item.id === id);
                  return evidence ? <span key={id}>{evidence.icon} {evidence.title}</span> : null;
                })}
              </div>}
              <button className="lrn-av-primary" onClick={advance}>{node.nextLabel ?? "続ける"}</button>
            </div>
          )}

          {activeEvidence && (
            <div className="lrn-av-evidence-modal" role="dialog" aria-label="証拠を発見">
              <div className="lrn-av-evidence-card">
                <div className="lrn-av-evidence-found">EVIDENCE FOUND</div>
                <div className="icon">{activeEvidence.evidence.icon}</div>
                <h3>{activeEvidence.evidence.title}</h3>
                <b>{activeEvidence.evidence.summary}</b>
                <p>{activeEvidence.evidence.detail}</p>
                <div className="link-comment"><img src={scenario.linkSprite} alt="清瀬リンク" /><span>{activeEvidence.comment}</span></div>
                <button className="lrn-av-primary" onClick={() => setActiveEvidence(null)}>証拠ファイルへ保存</button>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}

type Flat = { line: Line; scene: Scene | null; sceneIdx: number };

function DialoguePart({
  ep, items, voice, tickets, onUseTicket, onDone, showTickets, startLabel, dim,
}: {
  ep: string; items: Flat[]; voice: ReturnType<typeof useVoice>; tickets: number; onUseTicket: () => void;
  onDone: () => void; showTickets: boolean; startLabel?: string; dim?: boolean;
}) {
  const [idx, setIdx] = useState(startLabel ? -1 : 0);
  const [asking, setAsking] = useState(false);
  const runIdRef = useRef(0);
  const aliveRef = useRef(true);
  const [lectureValues] = useState<Record<string, string>>(() => {
    const read = (key: string, fallback: string) => {
      if (typeof window === "undefined") return fallback;
      try { return window.localStorage.getItem(`learn:${ep}:${key}`)?.trim() || fallback; }
      catch { return fallback; }
    };
    return {
      theme: read("theme", "今変えたいこと"),
      exception: read("exception", "100ではなかった瞬間"),
      exceptionScore: read("exceptionScore", "100未満"),
      clue: read("clue", "その瞬間にあった違い"),
      resource: read("resource", "100との差を作った条件を一つ試す"),
    };
  });
  const rawCur = idx >= 0 ? items[idx] : null;
  const cur = useMemo<Flat | null>(() => {
    if (!rawCur) return null;
    const text = interpolateAdventureText(rawCur.line.text, lectureValues);
    return { ...rawCur, line: { ...rawCur.line, text, dynamic: rawCur.line.dynamic || text !== rawCur.line.text } };
  }, [lectureValues, rawCur]);

  // いま出しておくスライド：ここまでで最後に指定されたもの
  const slide = useMemo<Slide | null>(() => {
    let s: Slide | null = null;
    for (let i = 0; i <= Math.min(idx, items.length - 1); i++) {
      const v = items[i]?.line.slide;
      if (v !== undefined) s = v;
    }
    if (!s) return null;
    const resolveText = (value?: string) => value === undefined ? undefined : interpolateAdventureText(value, lectureValues);
    return {
      ...s,
      h: resolveText(s.h),
      left: resolveText(s.left),
      right: resolveText(s.right),
      items: s.items?.map((item) => interpolateAdventureText(item, lectureValues)),
    };
  }, [idx, items, lectureValues]);

  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; voice.stop(); }; }, [voice]);

  useEffect(() => {
    if (!cur) return;
    const run = ++runIdRef.current;
    (async () => {
      await voice.speak(cur.line);
      if (!aliveRef.current || runIdRef.current !== run) return;
      const pauseMs = (cur.line.pause ?? 0.7) * 1000;
      const t0 = Date.now();
      while (Date.now() - t0 < pauseMs) {
        await sleep(80);
        await voice.waitWhilePaused();
        if (!aliveRef.current || runIdRef.current !== run) return;
      }
      // アドベンチャーゲームと同じく、音声が終わっても勝手に進まない。
      // プレイヤーが文字を読み終えてから、タップまたは「次へ」を押す。
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  function next() {
    if (asking || idx < 0) return;
    voice.stop();
    runIdRef.current++;
    if (idx + 1 < items.length) setIdx(idx + 1);
    else onDone();
  }
  function prev() {
    if (asking || idx <= 0) return;
    voice.stop();
    runIdRef.current++;
    setIdx((i) => Math.max(0, i - 1));
  }
  function openAsk() {
    if (tickets <= 0) return;
    voice.pause();
    setAsking(true);
  }
  function closeAsk() {
    setAsking(false);
    voice.resume();
  }

  const totalScenes = Math.max(1, new Set(items.flatMap((item) => item.scene ? [item.scene.no] : [])).size);
  const sceneLabel = cur?.scene ? `SCENE ${cur.scene.no}/${totalScenes}｜${cur.scene.title}` : undefined;

  return (
    <div className="lrn-class">
      {idx < 0 ? (
        <div className="lrn-exp-gate">
          <img src={ERICKSON_CUTOUT} alt="ミルトン・エリクソン" />
          <h2>事件の答えを、講義で整理します</h2>
          <p>漫画と捜査で見つけた「観察とUtilization」に、ここで名前と限界を与えます。<br />分からない箇所では、🎫で先生を止めて質問できます。</p>
          <button className="lrn-cta" onClick={() => setIdx(0)}>{startLabel}</button>
        </div>
      ) : (
        <>
          <Stage line={cur?.line ?? null} speaking={voice.speaking} slide={slide} sceneLabel={sceneLabel} dim={dim}
            aside={showTickets ? (
              /* 吹き出しの右隣。キャラクターに被せない */
              <div className="lrn-ticket-wrap" onClick={(e) => e.stopPropagation()}>
                <button className="lrn-ticket" onClick={openAsk} disabled={tickets <= 0} title="質問チケット">
                  🎫 <b>× {tickets}</b>
                  <span>先生に聞く</span>
                </button>
                {cur?.scene?.ticketHint && <span className="lrn-ticket-hint">{cur.scene.ticketHint}</span>}
              </div>
            ) : undefined} />
          <div className="lrn-adv-controls" onClick={(e) => e.stopPropagation()}>
            <button onClick={prev} disabled={idx <= 0}>← 戻る</button>
            <button onClick={voice.stop} disabled={!voice.speaking}>⏩ 音声スキップ</button>
            <button className="next" onClick={next}>次へ →</button>
          </div>
          <div className="lrn-tapnote">{voice.engine === "silent" ? "音が出ていません ・ 次へで進みます" : "台詞は自動で進みません"}</div>
          {asking && cur && (
            <AskSheet ep={ep} sceneNo={cur.scene?.no ?? 0} tickets={tickets} onUse={onUseTicket} onClose={closeAsk}
              context={{
                location: cur.scene?.title ?? "解説講義",
                objective: "事件で体験した観察手順を、催眠とUtilizationの理屈・限界として理解する",
                nodeKind: "lecture",
                theme: lectureValues.theme,
                exception: lectureValues.exception,
                exceptionScore: lectureValues.exceptionScore,
                clue: lectureValues.clue,
                resource: lectureValues.resource,
              }} title="講義中に先生へ質問" />
          )}
        </>
      )}
    </div>
  );
}

function QaPart({ ep, part, tickets, onUseTicket, onDone, lastScene }: {
  ep: string; part: Extract<Part, { kind: "qa" }>; tickets: number; onUseTicket: () => void; onDone: () => void; lastScene: number;
}) {
  const [asking, setAsking] = useState(false);
  const [context] = useState(() => {
    const read = (key: string, fallback: string) => {
      if (typeof window === "undefined") return fallback;
      try { return window.localStorage.getItem(`learn:${ep}:${key}`)?.trim() || fallback; }
      catch { return fallback; }
    };
    return {
      location: "講義後の振り返り",
      objective: "学んだUtilizationを、自分の具体例へ安全に当てはめて理解する",
      nodeKind: "final-qa",
      theme: read("theme", "今変えたいこと"),
      exception: read("exception", "100ではなかった瞬間"),
      exceptionScore: read("exceptionScore", "100未満"),
      clue: read("clue", "その瞬間にあった具体的な違い"),
      resource: read("resource", "その違いを一つ小さく試す"),
    };
  });
  return (
    <div className="lrn-qa">
      <img src={ERICKSON.smile} alt="" />
      <h2>{part.title}</h2>
      <p className="rest">残り 🎫 × {tickets}</p>
      <div className="lrn-sheet-btns col">
        {tickets > 0 && <button className="main" onClick={() => setAsking(true)}>🎫 先生に聞く</button>}
        <button className="ghost" onClick={onDone}>{tickets > 0 ? "もう大丈夫。先へ ▶" : "先へ ▶"}</button>
      </div>
      {asking && <AskSheet ep={ep} sceneNo={lastScene} tickets={tickets} onUse={onUseTicket} onClose={() => setAsking(false)} title="質問タイム" context={context} />}
    </div>
  );
}

function CardPart({ ep, part, voice, onDone }: { ep: string; part: Extract<Part, { kind: "card" }>; voice: ReturnType<typeof useVoice>; onDone: () => void }) {
  const [phase, setPhase] = useState<"intro" | "card" | "after">("intro");
  const [lineIdx, setLineIdx] = useState(0);
  const lines = phase === "intro" ? part.lines : phase === "after" ? part.after : [];
  const [cardValues] = useState<Record<string, string>>(() => {
    const read = (key: string, fallback: string) => {
      if (typeof window === "undefined") return fallback;
      try { return window.localStorage.getItem(`learn:${ep}:${key}`)?.trim() || fallback; }
      catch { return fallback; }
    };
    return { theme: read("theme", "今変えたいこと"), clue: read("clue", "見つけた違い"), resource: read("resource", "見つけた違いを一つ試す") };
  });
  const rawLine = lines[lineIdx] ?? null;
  const line = rawLine ? { ...rawLine, text: interpolateAdventureText(rawLine.text, cardValues), dynamic: rawLine.dynamic || rawLine.text.includes("{{") } : null;

  useEffect(() => {
    if (line) void voice.speak(line);
    return () => voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lineIdx]);

  function advanceLine() {
    voice.stop();
    if (lineIdx + 1 < lines.length) {
      setLineIdx((current) => current + 1);
      return;
    }
    if (phase === "intro") {
      setPhase("card");
      setLineIdx(0);
      return;
    }
    onDone();
  }

  function backLine() {
    if (lineIdx <= 0) return;
    voice.stop();
    setLineIdx((current) => Math.max(0, current - 1));
  }

  function take() {
    try {
      const key = "learn:cards";
      const parsed: unknown = JSON.parse(localStorage.getItem(key) || "[]");
      const have: Record<string, unknown>[] = Array.isArray(parsed)
        ? parsed.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        : [];
      if (!have.some((card) => card.ep === ep)) {
        have.push({ ep, at: new Date().toISOString(), card: part.card });
        localStorage.setItem(key, JSON.stringify(have));
      }
    } catch { /* ignore */ }
    setPhase("after");
    setLineIdx(0);
  }

  return (
    <div className="lrn-cardpart">
      {phase !== "card" && (
        <>
          <Stage line={line} speaking={voice.speaking} slide={null} dim />
          <div className="lrn-adv-controls">
            <button onClick={backLine} disabled={lineIdx <= 0}>← 戻る</button>
            <button onClick={voice.stop} disabled={!voice.speaking}>⏩ 音声スキップ</button>
            <button className="next" onClick={advanceLine}>次へ →</button>
          </div>
          <div className="lrn-tapnote">台詞は自動で進みません</div>
        </>
      )}
      {phase === "card" && (
        <div className="lrn-cardget">
          <div className="lrn-pcard">
            <div className="series">{part.card.series} {part.card.no}</div>
            <div className="name">{part.card.name}</div>
            <div className="principle">{part.card.principle.map((t, i) => <div key={i}>{t}</div>)}</div>
          </div>
          <button className="lrn-cta" onClick={take}>カードを受け取る</button>
        </div>
      )}
    </div>
  );
}

function TeaserPart({ part, epNo }: { part: Extract<Part, { kind: "teaser" }>; epNo: number }) {
  return (
    <div className="lrn-teaser">
      <div className="lrn-nextcase-stage">
        <img className="lrn-nextcase-bg" src="/learn/adventure/erickson-study-v1.webp" alt="夜の書斎" />
        <div className="lrn-nextcase-shade" />
        <div className="lrn-nextcase-kicker">NEXT CASE 02</div>
        <h2>「催眠なんか絶対に<br />かかりません」</h2>
        <div className="lrn-nextcase-dialogue is-man"><b>男性</b><span>私は絶対に、催眠なんかにかかりません。</span></div>
        <img className="lrn-nextcase-erickson" src={ERICKSON_CUTOUT} alt="ミルトン・エリクソン" />
        <div className="lrn-nextcase-dialogue is-teacher"><b>エリクソン</b><span>では、かからないようにしてください。</span></div>
      </div>
      <div className="lrn-nextcase-info">
        <div className="lrn-hook">{part.hook.map((t, i) => <div key={i}>{t}</div>)}</div>
        <div className="lrn-next">
          <div className="no">{part.next.no}</div>
          <div className="title">{part.next.title}</div>
          <div className="series">{part.next.series}</div>
          <div className="principle">{part.next.principle}</div>
        </div>
        <div className="lrn-manga-end">
          <p>第{epNo}話 おわり</p>
          <Link href="/learn" className="lrn-cta">一覧にもどる</Link>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ 本体 ═══════════════════════ */

const PART_LABEL: Record<Part["kind"], string> = {
  manga: "漫画", experience: "体験", classroom: "教室", adventure: "推理", qa: "質問", card: "原理", outro: "次回へ", teaser: "次回",
};

export function LearnPlayer({ episode, startPart }: { episode: Episode; startPart?: number }) {
  const [pi, setPi] = useState(() => {
    const clamp = (value: number) => Math.max(0, Math.min(episode.parts.length - 1, value));
    if (startPart !== undefined) return clamp(startPart);
    if (typeof window === "undefined") return 0;
    try { return clamp(Number(window.localStorage.getItem(`learn:${episode.key}:flow:v7:part`) || 0)); }
    catch { return 0; }
  });
  const [tickets, setTickets] = useState(episode.tickets);
  const voice = useVoice(episode.key);
  const part = episode.parts[pi];
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    try { window.localStorage.setItem(`learn:${episode.key}:flow:v7:part`, String(pi)); } catch { /* ignore */ }
  }, [episode.key, pi]);

  const next = useCallback(() => {
    voice.stop();
    setPi((p) => Math.min(episode.parts.length - 1, p + 1));
  }, [episode.parts.length, voice]);
  const previousPart = useCallback(() => {
    voice.stop();
    setPi((p) => Math.max(0, p - 1));
  }, [voice]);

  const classroom = episode.parts.find((p) => p.kind === "classroom") as Extract<Part, { kind: "classroom" }> | undefined;
  const lastScene = classroom ? classroom.scenes[classroom.scenes.length - 1].no : 0;

  function body() {
    switch (part.kind) {
      case "manga":
        return <MangaPart ep={episode.key} part={part} onDone={next} label="エリクソンに答える ▶" />;
      case "experience":
        return <ExperiencePart ep={episode.key} part={part} voice={voice} onDone={next} />;
      case "classroom": {
        const items: Flat[] = part.scenes.flatMap((s, si) => s.lines.map((l) => ({ line: l, scene: s, sceneIdx: si })));
        return <DialoguePart ep={episode.key} items={items} voice={voice} tickets={tickets} onUseTicket={() => setTickets((t) => Math.max(0, t - 1))}
          onDone={next} showTickets startLabel="▶ 授業をはじめる" />;
      }
      case "adventure":
        return <AdventurePart ep={episode.key} scenario={part.scenario} voice={voice} onDone={next} />;
      case "qa":
        return <QaPart ep={episode.key} part={part} tickets={tickets} onUseTicket={() => setTickets((t) => Math.max(0, t - 1))} onDone={next} lastScene={lastScene} />;
      case "card":
        return <CardPart ep={episode.key} part={part} voice={voice} onDone={next} />;
      case "outro": {
        const items: Flat[] = part.lines.map((l) => ({ line: l, scene: null, sceneIdx: -1 }));
        return <DialoguePart ep={episode.key} items={items} voice={voice} tickets={tickets} onUseTicket={() => {}} onDone={next} showTickets={false} />;
      }
      case "teaser":
        return <TeaserPart part={part} epNo={episode.no} />;
    }
  }

  return (
    <div className="lrn">
      <header className="lrn-head">
        {pi > 0
          ? <button type="button" className="back" onClick={previousPart} aria-label="前のパートへ戻る">‹</button>
          : <Link href="/learn" className="back" aria-label="一覧へ戻る">‹</Link>}
        <div className="mid">
          <span className="ep">第{episode.no}話</span>
          <span className="part">{PART_LABEL[part.kind]}</span>
        </div>
        <span className="tickets">🎫 × {tickets}</span>
      </header>
      <div className="lrn-progress">
        {episode.parts.map((p, i) => (
          <span key={i} className={`seg ${i < pi ? "is-done" : i === pi ? "is-now" : ""}`} title={PART_LABEL[p.kind]} />
        ))}
      </div>
      <div className="lrn-body" ref={scrollRef}>{body()}</div>
    </div>
  );
}
