"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Episode, ExpStep, Face, Line, Part, Scene, Slide } from "@/lib/learn/types";
import { VOICE_OF, audioUrl } from "@/lib/learn/types";
import type { AdventureEvidence, AdventureNode, AdventureScenario } from "@/lib/learn/adventure";
import { interpolateAdventureText } from "@/lib/learn/adventure";
import { MangaPageView } from "./MangaPage";
import { MangaArt } from "./MangaArt";

/* ═══════════════════════ 声 ═══════════════════════
 * 1行ずつ鳴らす。焼き込み済みの mp3 → 無ければ /api/tts（VOICEVOX）→ それも駄目なら
 * ブラウザの読み上げ → 全部駄目なら文字数ぶん待つ。
 * 質問チケットのために、途中で止めて・続きから再開できる。
 */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function useVoice(ep: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const runRef = useRef(0);
  const pausedRef = useRef(false);
  const [speaking, setSpeaking] = useState(false);
  const [engine, setEngine] = useState<"baked" | "tts" | "browser" | "silent">("baked");

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
    await waitWhilePaused();
    if (runRef.current !== run) return;

    // ① 焼き込み済み。ユーザー入力を含む動的台詞は、その場で合成する。
    let ok = false;
    if (!line.dynamic) {
      ok = await playUrl(audioUrl(ep, line.id), run);
      if (runRef.current !== run) return;
      if (ok) { setEngine("baked"); setSpeaking(false); return; }
    }

    // ② その場で VOICEVOX
    try {
      const r = await fetch("/api/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: line.text, speaker: VOICE_OF[line.who] }),
      });
      if (runRef.current !== run) return;
      if (r.ok) {
        const url = URL.createObjectURL(await r.blob());
        ok = await playUrl(url, run);
        URL.revokeObjectURL(url);
        if (runRef.current !== run) return;
        if (ok) { setEngine("tts"); setSpeaking(false); return; }
      }
    } catch { /* 次へ */ }

    // ③ ブラウザの読み上げ（声が無い環境では onend が来ないことがあるので、文字数ぶんで打ち切る）
    const done = await new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), 1200 + line.text.length * 220);
      try {
        if (!window.speechSynthesis) { resolve(false); return; }
        const u = new SpeechSynthesisUtterance(line.text);
        u.lang = "ja-JP";
        u.rate = 0.95;
        u.pitch = line.who === "link" ? 1.25 : 0.85;
        u.onend = () => resolve(true);
        u.onerror = () => resolve(false);
        setSpeaking(true);
        window.speechSynthesis.speak(u);
      } catch { resolve(false); }
    });
    if (runRef.current !== run) return;
    setSpeaking(false);
    if (done) { setEngine("browser"); return; }

    // ④ 何も鳴らない：読める時間だけ待つ
    setEngine("silent");
    setSpeaking(true);
    await sleep(600 + line.text.length * 140);
    setSpeaking(false);
  }, [ep, playUrl, stop, waitWhilePaused]);

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
                <div className="lrn-item" key={i} style={{ animationDelay: `${i * 0.35}s` }}>
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
  const tFace: Face = (who === "teacher" ? line?.face : line?.react) ?? "neutral";
  const lFace: Face = (who === "link" ? line?.face : line?.react) ?? "neutral";
  const tMouth = useMouth(speaking && who === "teacher");
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
          <img src={who === "teacher" && tMouth ? ERICKSON.talk : ERICKSON[tFace]} alt="エリクソン" />
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
          body: JSON.stringify({ text: String(d.answer).slice(0, 480), speaker: VOICE_OF.teacher }),
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

function MangaPart({ part, onDone, label }: { part: Extract<Part, { kind: "manga" }>; onDone: () => void; label: string }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  function go(to: number) {
    const next = Math.max(0, Math.min(part.frames.length - 1, to));
    const track = trackRef.current;
    if (track) track.scrollTo({ left: track.clientWidth * next, behavior: "smooth" });
    setIndex(next);
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

function ExperiencePart({ ep, part, voice, tickets, onUseTicket, onDone }: {
  ep: string; part: Extract<Part, { kind: "experience" }>; voice: ReturnType<typeof useVoice>;
  tickets: number; onUseTicket: () => void; onDone: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [timeline, setTimeline] = useState<ExpStep[]>(part.steps);
  const [idx, setIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [asking, setAsking] = useState(false);
  const step = timeline[idx];
  const line = step?.kind === "say" ? step.line : step?.kind === "input" ? (step.line ?? null) : null;
  const inputReady = step?.kind !== "input" || Boolean(values[step.id]?.trim());

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
    if (step?.kind === "input") {
      try { localStorage.setItem(`learn:${ep}:${step.id}`, values[step.id].trim()); } catch { /* ignore */ }
    }
    if (idx + 1 < timeline.length) setIdx(idx + 1);
    else onDone();
  }

  function back() {
    if (idx <= 0) return;
    voice.stop();
    setIdx((i) => Math.max(0, i - 1));
  }

  function choose(option: Extract<ExpStep, { kind: "choice" }>["options"][number]) {
    voice.stop();
    setTimeline((old) => [...old.slice(0, idx + 1), ...option.then]);
    setIdx(idx + 1);
  }

  return (
    <div className={`lrn-exp ${step?.kind === "fade" ? "is-fade" : ""}`}>
      {!started ? (
        <div className="lrn-exp-gate">
          <div className="lrn-exp-gate-portrait"><img src={ERICKSON_CUTOUT} alt="ミルトン・エリクソン" /></div>
          <div className="lrn-kicker">EXPERIMENT 01</div>
          <h2>{part.title}</h2>
          <p className="lead">悩みを解決する体験ではありません。<br />無意識がすでに作っている「例外」を一つ探します。</p>
          <div className="lrn-exp-brief">
            <div><b>01</b><span>変えたいことを書く</span></div>
            <div><b>02</b><span>1％だけ軽い瞬間を探す</span></div>
            <div><b>03</b><span>何が違うかを選ぶ</span></div>
          </div>
          <button className="lrn-cta" onClick={start}>体験をはじめる →</button>
          <span className="lrn-exp-time">約{part.minutes ?? 3}分 ・ 戻る/音声スキップ対応</span>
        </div>
      ) : (
        <>
          <div className={`lrn-exp-mentor ${voice.speaking ? "is-on" : ""}`}>
            <div className="lrn-exp-aura" />
            <img src={ERICKSON_CUTOUT} alt="ミルトン・エリクソン" />
            <div className="lrn-exp-name"><b>MILTON H. ERICKSON</b><span>{voice.speaking ? "語りかけています" : "あなたの答えを待っています"}</span></div>
          </div>

          <div className="lrn-exp-dialogue">
            {line && <div className="lrn-exp-speaker">エリクソン</div>}
            {step?.kind === "say" && <p key={step.line.id} className="lrn-exp-line">{step.line.text}</p>}
            {step?.kind === "show" && (
              <div className="lrn-exp-prompt">
                <h3>「1％だけ違う瞬間」のヒント</h3>
                <div className="lrn-exp-items">{step.items.map((t, i) => <div key={t} className="lrn-exp-item"><b>0{i + 1}</b>{t}</div>)}</div>
              </div>
            )}
            {step?.kind === "input" && (
              <div className="lrn-exp-prompt">
                <div className="lrn-exp-step">INPUT ・ {idx + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.prompt}</p>
                <textarea rows={3} value={values[step.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [step.id]: e.target.value }))} placeholder={step.placeholder} autoFocus />
                {step.helper && <small>{step.helper}</small>}
              </div>
            )}
            {step?.kind === "choice" && (
              <div className="lrn-exp-choice">
                <div className="lrn-exp-step">SELECT ・ {idx + 1}</div>
                <h3>{step.q}</h3>
                {step.help && <p>{step.help}</p>}
                <div className="lrn-exp-options">
                  {step.options.map((o, i) => <button key={o.label} onClick={() => choose(o)}><b>{String(i + 1).padStart(2, "0")}</b><span>{o.label}</span><i>→</i></button>)}
                </div>
              </div>
            )}
            {step?.kind === "fade" && <div className="lrn-fade">{step.text}</div>}
          </div>

          <div className="lrn-exp-controls">
            <button onClick={back} disabled={idx === 0}>← 戻る</button>
            <button onClick={voice.stop} disabled={!voice.speaking}>⏩ 音声を飛ばす</button>
            <button onClick={() => { voice.pause(); setAsking(true); }} disabled={tickets <= 0}>✦ 先生に聞く ×{tickets}</button>
          </div>
          {step && step.kind !== "choice" && step.kind !== "fade" && (
            <button className="lrn-exp-next" onClick={next} disabled={!inputReady}>{step.kind === "input" ? "この答えで進む" : "次へ"} →</button>
          )}
          {asking && <AskSheet ep={ep} sceneNo={0} tickets={tickets} onUse={onUseTicket}
            context={{
              location: step?.kind === "input" ? step.title : "最初の催眠体験",
              objective: "自分の中にすでにある小さな例外を見つける",
              nodeKind: step?.kind,
              theme: values.theme,
              exception: values.exception,
            }}
            onClose={() => { setAsking(false); voice.resume(); }} title="体験について聞く" />}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════ シナリオ駆動アドベンチャー ═══════════════════════ */

function AdventurePart({ ep, scenario, voice, tickets, onUseTicket, onDone }: {
  ep: string;
  scenario: AdventureScenario;
  voice: ReturnType<typeof useVoice>;
  tickets: number;
  onUseTicket: () => void;
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
      exception: read("exception", "まだ見つかっていない一パーセントの例外"),
      resource: read("resource", "小さな違いを観察する"),
    };
  });
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [activeEvidence, setActiveEvidence] = useState<{ evidence: AdventureEvidence; comment: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const [asking, setAsking] = useState(false);
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
      const value = option.value;
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
            <div className="lrn-av-hud-actions">
              <button onClick={back} disabled={idx === 0} aria-label="一つ前へ戻る">↶</button>
              <button onClick={voice.stop} disabled={!voice.speaking} aria-label="音声をスキップ">≫</button>
              <button className="ask" onClick={() => { voice.pause(); setAsking(true); }} disabled={tickets <= 0}>質問 ×{tickets}</button>
            </div>
          </div>

          <div className="lrn-av-evidence-tray" aria-label={`証拠 ${evidenceIds.length}個`}>
            {scenario.evidence.map((evidence) => (
              <span key={evidence.id} className={evidenceIds.includes(evidence.id) ? "is-found" : ""} title={evidence.title}>
                {evidenceIds.includes(evidence.id) ? evidence.icon : "?"}
              </span>
            ))}
          </div>

          <div className="lrn-av-cast" aria-hidden="true">
            <img className={`teacher ${speaker === "teacher" ? "is-speaking" : speaker ? "is-dim" : ""}`} src={scenario.teacherSprite} alt="" />
            <img className={`link ${speaker === "link" ? "is-speaking" : speaker ? "is-dim" : ""}`} src={scenario.linkSprite} alt="" />
          </div>

          {node?.kind === "dialogue" && currentLine && (
            <div className={`lrn-av-dialogue is-${currentLine.who}`} key={node.id}>
              <div className="lrn-av-speaker">{currentLine.who === "teacher" ? "ミルトン・エリクソン" : "清瀬リンク"}</div>
              <p>{currentLine.text}</p>
              <button onClick={advance}>{node.nextLabel ?? "会話を続ける"} <span>›</span></button>
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

          {asking && <AskSheet ep={ep} sceneNo={idx + 1} tickets={tickets} onUse={onUseTicket}
            context={{
              scenarioId: scenario.id,
              caseTitle: `${scenario.caseNo} ${scenario.title}`,
              location: sceneName,
              objective: scenario.objective,
              nodeKind: node?.kind,
              evidence: scenario.evidence.filter((item) => evidenceIds.includes(item.id)).map((item) => `${item.title}：${item.summary}`),
              theme: values.theme,
              exception: values.exception,
              resource: values.resource,
              lastInteraction: feedback || undefined,
            }}
            onClose={() => { setAsking(false); voice.resume(); }} title="この場面について聞く" />}
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
  const cur = idx >= 0 ? items[idx] : null;

  // いま出しておくスライド：ここまでで最後に指定されたもの
  const slide = useMemo<Slide | null>(() => {
    let s: Slide | null = null;
    for (let i = 0; i <= Math.min(idx, items.length - 1); i++) {
      const v = items[i]?.line.slide;
      if (v !== undefined) s = v;
    }
    return s;
  }, [idx, items]);

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

  const sceneLabel = cur?.scene ? `SCENE ${cur.scene.no}｜${cur.scene.title}` : undefined;

  return (
    <div className="lrn-class">
      {idx < 0 ? (
        <div className="lrn-exp-gate">
          <img src={ERICKSON.smile} alt="" />
          <h2>教室へ</h2>
          <p>先生とリンクの授業がはじまります。<br />分からなくなったら、いつでも 🎫 で先生を止めて聞けます。</p>
          <button className="lrn-cta" onClick={() => setIdx(0)}>{startLabel}</button>
        </div>
      ) : (
        <>
          <Stage line={cur?.line ?? null} speaking={voice.speaking} slide={slide} sceneLabel={sceneLabel} onTap={next} dim={dim}
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
          <div className="lrn-tapnote">{voice.engine === "silent" ? "音が出ていません" : "画面タップでも進めます"}</div>
          {asking && cur && (
            <AskSheet ep={ep} sceneNo={cur.scene?.no ?? 0} tickets={tickets} onUse={onUseTicket} onClose={closeAsk} />
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
  return (
    <div className="lrn-qa">
      <img src={ERICKSON.smile} alt="" />
      <h2>{part.title}</h2>
      <p className="rest">残り 🎫 × {tickets}</p>
      <div className="lrn-sheet-btns col">
        {tickets > 0 && <button className="main" onClick={() => setAsking(true)}>🎫 先生に聞く</button>}
        <button className="ghost" onClick={onDone}>{tickets > 0 ? "もう大丈夫。先へ ▶" : "先へ ▶"}</button>
      </div>
      {asking && <AskSheet ep={ep} sceneNo={lastScene} tickets={tickets} onUse={onUseTicket} onClose={() => setAsking(false)} title="質問タイム" />}
    </div>
  );
}

function CardPart({ ep, part, voice, onDone }: { ep: string; part: Extract<Part, { kind: "card" }>; voice: ReturnType<typeof useVoice>; onDone: () => void }) {
  const [phase, setPhase] = useState<"intro" | "card" | "after">("intro");
  const [line, setLine] = useState<Line | null>(null);
  const aliveRef = useRef(true);
  const startedRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      for (const l of part.lines) {
        if (!aliveRef.current) return;
        setLine(l); await voice.speak(l); await sleep((l.pause ?? 0.7) * 1000);
      }
      if (aliveRef.current) setPhase("card");
    })();
    return () => { aliveRef.current = false; voice.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function take() {
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
    for (const l of part.after) {
      if (!aliveRef.current) return;
      setLine(l); await voice.speak(l); await sleep((l.pause ?? 0.7) * 1000);
    }
    if (aliveRef.current) onDone();
  }

  return (
    <div className="lrn-cardpart">
      {phase !== "card" && <Stage line={line} speaking={voice.speaking} slide={null} dim />}
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
    <div className="lrn-manga lrn-teaser">
      {part.manga.map((pg, i) => <MangaPageView key={i} page={pg} index={i} />)}
      <div className="lrn-hook">{part.hook.map((t, i) => <div key={i}>{t}</div>)}</div>
      <div className="lrn-next">
        <div className="no">{part.next.no}</div>
        <div className="title">{part.next.title}</div>
        <div className="series">{part.next.series}</div>
        <div className="principle">{part.next.principle}</div>
      </div>
      <div className="lrn-unlock">
        {part.unlock.map((u, i) => <button key={i} className={i === 0 ? "ghost" : "main"} disabled>{u}</button>)}
        <p className="note">（第2話は準備中）</p>
      </div>
      <div className="lrn-manga-end">
        <p>第{epNo}話 おわり</p>
        <Link href="/learn" className="lrn-cta">一覧にもどる</Link>
      </div>
    </div>
  );
}

/* ═══════════════════════ 本体 ═══════════════════════ */

const PART_LABEL: Record<Part["kind"], string> = {
  manga: "漫画", experience: "体験", classroom: "教室", adventure: "推理", qa: "質問", card: "原理", outro: "次回へ", teaser: "次回",
};

export function LearnPlayer({ episode, startPart = 0 }: { episode: Episode; startPart?: number }) {
  const [pi, setPi] = useState(Math.max(0, Math.min(episode.parts.length - 1, startPart)));
  const [tickets, setTickets] = useState(episode.tickets);
  const voice = useVoice(episode.key);
  const part = episode.parts[pi];
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [pi]);

  const next = useCallback(() => {
    voice.stop();
    setPi((p) => Math.min(episode.parts.length - 1, p + 1));
  }, [episode.parts.length, voice]);

  const classroom = episode.parts.find((p) => p.kind === "classroom") as Extract<Part, { kind: "classroom" }> | undefined;
  const lastScene = classroom ? classroom.scenes[classroom.scenes.length - 1].no : 0;

  function body() {
    switch (part.kind) {
      case "manga":
        return <MangaPart part={part} onDone={next} label="体験へ ▶" />;
      case "experience":
        return <ExperiencePart ep={episode.key} part={part} voice={voice} tickets={tickets}
          onUseTicket={() => setTickets((t) => Math.max(0, t - 1))} onDone={next} />;
      case "classroom": {
        const items: Flat[] = part.scenes.flatMap((s, si) => s.lines.map((l) => ({ line: l, scene: s, sceneIdx: si })));
        return <DialoguePart ep={episode.key} items={items} voice={voice} tickets={tickets} onUseTicket={() => setTickets((t) => Math.max(0, t - 1))}
          onDone={next} showTickets startLabel="▶ 授業をはじめる" />;
      }
      case "adventure":
        return <AdventurePart ep={episode.key} scenario={part.scenario} voice={voice} tickets={tickets}
          onUseTicket={() => setTickets((t) => Math.max(0, t - 1))} onDone={next} />;
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
        <Link href="/learn" className="back">‹</Link>
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
