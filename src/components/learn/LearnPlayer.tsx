"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Episode, ExpStep, Face, Line, Part, Scene, Slide } from "@/lib/learn/types";
import type { AdventureEvidence, AdventureNode, AdventureScenario } from "@/lib/learn/adventure";
import { interpolateAdventureText } from "@/lib/learn/adventure";
import { VoiceInput } from "@/components/shinga/VoiceInput";
import { MangaArt } from "./MangaArt";

/* ═══════════════════════ 声 ═══════════════════════
 * 第1話の音声は品質が揃うまで停止する。画面遷移側の呼び出し規約は残し、
 * 将来ひとつの声で再開しても各パートを書き換えずに済むようにしている。
 */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function useVoice(ep: string) {
  void ep;
  const pausedRef = useRef(false);
  const speaking = false;
  const engine = "silent" as const;

  const waitWhilePaused = useCallback(async () => {
    while (pausedRef.current) await sleep(120);
  }, []);

  const stop = useCallback(() => {}, []);

  const speak = useCallback(async (line: Line): Promise<void> => {
    void line;
    await waitWhilePaused();
  }, [waitWhilePaused]);

  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);
  const resume = useCallback(() => {
    pausedRef.current = false;
  }, []);
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
          <div className="l">{(slide.left ?? "").split("\n").map((t, i) => <div key={i}>{t}</div>)}</div>
          <div className="arrow"><span>→</span><small>言い換える</small></div>
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

function splitJapaneseSentences(text: string) {
  const sentences: string[] = [];
  let buffer = "";
  let quoted = 0;
  for (const character of text) {
    buffer += character;
    if ("『「（【".includes(character)) quoted += 1;
    if ("』」）】".includes(character)) quoted = Math.max(0, quoted - 1);
    if (quoted === 0 && "。！？".includes(character)) {
      sentences.push(buffer);
      buffer = "";
    }
  }
  if (buffer) sentences.push(buffer);
  return sentences.length ? sentences : [text];
}

function SentenceText({ text }: { text: string }) {
  const manualParagraphs = text.split("\n").map((paragraph) => paragraph.trim()).filter(Boolean);
  const sentences = manualParagraphs.length > 1 ? manualParagraphs : splitJapaneseSentences(text);
  return <>{sentences.map((sentence, index) => <span className="lrn-sentence-block" key={`${index}-${sentence}`}>{sentence}</span>)}</>;
}

function TypewriterText({ text, speed = 18 }: { text: string; speed?: number }) {
  const characters = useMemo(() => Array.from(text), [text]);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setVisibleCount(characters.length));
      return () => window.cancelAnimationFrame(frame);
    }
    const timer = window.setInterval(() => {
      setVisibleCount((count) => {
        if (count >= characters.length) {
          window.clearInterval(timer);
          return count;
        }
        return count + 1;
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [characters, speed]);

  return <span className="lrn-typewriter" aria-label={text}><span aria-hidden="true">{characters.slice(0, visibleCount).join("")}</span></span>;
}

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
            <p><TypewriterText text={line.text} /></p>
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
type LearnNote = { question: string; answer: string; savedAt: string };

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
  const [notes, setNotes] = useState<LearnNote[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const value = JSON.parse(window.localStorage.getItem(`learn:${ep}:notes`) ?? "[]");
      return Array.isArray(value) ? value.filter((note): note is LearnNote => Boolean(note?.question && note?.answer)) : [];
    } catch { return []; }
  });
  const threadRef = useRef<HTMLDivElement | null>(null);

  function saveNote(answerIndex: number) {
    const answer = messages[answerIndex]?.text?.trim();
    const question = messages[answerIndex - 1]?.role === "user" ? messages[answerIndex - 1].text.trim() : "先生に聞いたこと";
    if (!answer) return;
    const next = notes.some((note) => note.question === question && note.answer === answer)
      ? notes
      : [...notes, { question, answer, savedAt: new Date().toISOString() }];
    setNotes(next);
    try { window.localStorage.setItem(`learn:${ep}:notes`, JSON.stringify(next)); } catch { /* ignore */ }
  }

  async function ask(suggested?: string) {
    const question = (suggested ?? q).trim();
    if (!question || busy || (!ticketUsed && tickets <= 0)) return;
    setBusy(true); setErr("");
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
    } catch (error: unknown) { setErr(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
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
              <div className="lrn-answer-who"><img src={ERICKSON.smile} alt="" /><span>エリクソン</span></div>
              <p>{message.text}</p>
              <button className="lrn-save-note" onClick={() => saveNote(i)} disabled={notes.some((note) => note.answer === message.text)}>
                {notes.some((note) => note.answer === message.text) ? "✓ メモに保存済み" : "＋ この回答をメモに保存"}
              </button>
            </div>
          ))}
        </div>}

        {notes.length > 0 && <details className="lrn-saved-notes">
          <summary>保存した学習メモ（{notes.length}）</summary>
          <div>
            {notes.map((note, i) => <article key={`${note.savedAt}-${i}`}><b>Q. {note.question}</b><p>{note.answer}</p></article>)}
          </div>
        </details>}

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

function MangaPart({ part, userName, onDone, label }: { part: Extract<Part, { kind: "manga" }>; userName: string; onDone: () => void; label: string }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [introStep, setIntroStep] = useState(() => part.schoolIntro ? 0 : part.briefing ? 1 : 2);
  const [schoolBeatIndex, setSchoolBeatIndex] = useState(0);
  const resolveIntro = useCallback((text: string) => text.replaceAll("{{userName}}", userName), [userName]);

  function go(to: number) {
    const next = Math.max(0, Math.min(part.frames.length - 1, to));
    const track = trackRef.current;
    if (track) track.scrollTo({ left: track.clientWidth * next, behavior: "smooth" });
    setIndex(next);
  }

  if (introStep === 0 && part.schoolIntro) {
    const intro = part.schoolIntro;
    const beat = intro.beats[Math.min(schoolBeatIndex, intro.beats.length - 1)];
    const isLastBeat = schoolBeatIndex >= intro.beats.length - 1;
    const speakerName = beat.who === "teacher" ? "エリクソン" : "清瀬リンク";
    const beatContent = <>
      <b>{speakerName}</b>
      <span key={schoolBeatIndex}>{resolveIntro(beat.text)}</span>
      {!isLastBeat && <small>タップして次へ <i>›</i></small>}
    </>;
    return (
      <div className={`lrn-school-intro is-${beat.who} ${isLastBeat ? "is-final" : ""}`}>
        <img className="lrn-school-bg" src="/learn/adventure/erickson-study-v1.webp" alt="夜の催眠学校の教室" />
        <div className="lrn-school-shade" />
        <div className="lrn-school-sign"><b>{intro.kicker}</b><span>HYPNOSIS SCHOOL</span></div>
        <img className={`lrn-school-erickson ${beat.who === "teacher" ? "is-speaking" : "is-listening"}`} src={ERICKSON_CUTOUT} alt="ミルトン・エリクソン" />
        <img className={`lrn-school-link ${beat.who === "link" ? "is-speaking" : "is-listening"}`} src={linkSrc(beat.who === "link" ? "think" : "neutral", false)} alt="清瀬リンク" />
        <div className="lrn-school-beat-progress" aria-label={`${intro.beats.length}場面中${schoolBeatIndex + 1}場面`}>
          {intro.beats.map((_, i) => <i key={i} className={i <= schoolBeatIndex ? "is-on" : ""} />)}
        </div>
        {isLastBeat ? (
          <div className={`lrn-school-beat is-${beat.who} tone-${beat.tone || "question"}`}>{beatContent}</div>
        ) : (
          <button className={`lrn-school-beat is-${beat.who} tone-${beat.tone || "question"}`} onClick={() => setSchoolBeatIndex((value) => Math.min(intro.beats.length - 1, value + 1))}>
            {beatContent}
          </button>
        )}
        {isLastBeat && <button className="lrn-cta" onClick={() => setIntroStep(part.briefing ? 1 : 2)}>{resolveIntro(intro.cta)}</button>}
      </div>
    );
  }

  if (introStep === 1 && part.briefing) {
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
          <button className="lrn-cta" onClick={() => setIntroStep(2)}>{briefing.cta}</button>
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

function ExperiencePart({ ep, part, userName, voice, onDone }: {
  ep: string; part: Extract<Part, { kind: "experience" }>; voice: ReturnType<typeof useVoice>;
  userName: string; onDone: () => void;
}) {
  const [started, setStarted] = useState(() => !part.bridge && !part.gate);
  const [timeline, setTimeline] = useState<ExpStep[]>(part.steps);
  const [idx, setIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return { userName };
    const saved: Record<string, string> = { userName };
    for (const key of ["stuckMoment", "firstJudgment", "channel", "theme", "exception", "clue"]) {
      try {
        const value = window.localStorage.getItem(`learn:${ep}:${key}`)?.trim();
        if (value) saved[key] = value;
      } catch { /* ignore */ }
    }
    return saved;
  });
  const [hintStepId, setHintStepId] = useState<string | null>(null);
  const [pendingChoice, setPendingChoice] = useState<Extract<ExpStep, { kind: "choice" }>["options"][number] | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [bridgeBeatIndex, setBridgeBeatIndex] = useState(0);
  const bridge = part.bridge;
  const bridgeBeats = bridge?.beats?.length
    ? bridge.beats
    : bridge?.line
      ? [{ who: "teacher" as const, text: bridge.line }]
      : [];
  const bridgeBeat = bridgeBeats[Math.min(bridgeBeatIndex, Math.max(0, bridgeBeats.length - 1))];
  const bridgeIsLast = bridgeBeatIndex >= bridgeBeats.length - 1;
  const gate = part.gate;
  const step = timeline[idx];
  const activeSpeaker = step?.kind === "say" ? step.line.who : "teacher";
  const activeFace: Face = step?.kind === "say" ? (step.line.face ?? "neutral") : "neutral";
  const mentorImage = activeSpeaker === "link" ? linkSrc(activeFace, false) : ERICKSON_CUTOUT;
  const mentorAlt = activeSpeaker === "link" ? "清瀬リンク" : "ミルトン・エリクソン";
  const mentorName = activeSpeaker === "link" ? "清瀬リンク" : "MILTON H. ERICKSON";
  const mentorSpeaker = activeSpeaker === "link" ? "リンク" : "エリクソン";
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
  const detailReady = step?.kind === "choice" && step.detail
    ? Boolean(values[step.detail.id]?.trim())
    : false;

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

  function advanceBridge() {
    if (!bridgeIsLast) {
      setBridgeBeatIndex((value) => Math.min(bridgeBeats.length - 1, value + 1));
      return;
    }
    start();
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
        setBridgeBeatIndex(Math.max(0, bridgeBeats.length - 1));
        setStarted(false);
      }
      return;
    }
    voice.stop();
    setIdx((i) => Math.max(0, i - 1));
  }

  async function choose(option: Extract<ExpStep, { kind: "choice" }>["options"][number]) {
    voice.stop();
    const updates: Record<string, string> = {};
    if (step?.kind === "choice" && step.storeAs && option.value) {
      const value = resolve(option.value);
      updates[step.storeAs] = value;
    }
    if (step?.kind === "choice" && step.detail) {
      const detailValue = values[step.detail.id]?.trim();
      const fallback = option.value ? resolve(option.value) : resolve(option.label);
      const storeAs = step.detail.storeAs ?? step.detail.id;
      if (detailValue) {
        setSummarizing(true);
        const localSummary = detailValue.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 90);
        let summary = localSummary;
        try {
          const response = await fetch("/api/learn/summarize", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text: detailValue }),
          });
          const data = await response.json().catch(() => ({}));
          if (response.ok && typeof data.summary === "string" && data.summary.trim()) summary = data.summary.trim();
        } catch { /* 通信に失敗しても、入力を一文に整えて先へ進める */ }
        updates[storeAs] = summary;
        try { localStorage.setItem(`learn:${ep}:${storeAs}Raw`, detailValue); } catch { /* ignore */ }
      } else {
        updates[storeAs] = fallback;
      }
    }
    if (Object.keys(updates).length > 0) {
      setValues((old) => ({ ...old, ...updates }));
      for (const [key, value] of Object.entries(updates)) {
        try { localStorage.setItem(`learn:${ep}:${key}`, value); } catch { /* ignore */ }
      }
    }
    setTimeline((old) => [...old.slice(0, idx + 1), ...option.then]);
    setPendingChoice(null);
    setIdx(idx + 1);
    setSummarizing(false);
  }

  function confirmChoice() {
    if (step?.kind !== "choice") return;
    if (pendingChoice) {
      void choose(pendingChoice);
      return;
    }
    const detailValue = step.detail ? values[step.detail.id]?.trim() : "";
    if (step.completion !== "option-or-detail" || !step.detail || !detailValue) return;
    void choose({
      label: detailValue,
      value: detailValue,
      then: step.detail.then ?? [],
    });
  }

  function skipInput(input: Extract<ExpStep, { kind: "input" }>) {
    if (!input.skip) return;
    voice.stop();
    setValues((old) => ({ ...old, ...input.skip!.values }));
    for (const [key, value] of Object.entries(input.skip.values)) {
      try { localStorage.setItem(`learn:${ep}:${key}`, value); } catch { /* ignore */ }
    }
    setTimeline((old) => [...old.slice(0, idx + 1), ...input.skip!.then]);
    setIdx(idx + 1);
  }

  return (
    <div className={`lrn-exp ${!started && bridge ? "is-bridge" : step ? `is-${step.kind}` : ""} ${step?.kind === "fade" ? "is-fade" : ""}`}>
      {!started && bridge ? (
        <div className="lrn-exp-bridge">
          <img className="lrn-exp-bridge-bg" src={bridge.background ?? "/learn/adventure/erickson-study-v1.webp"} alt="" />
          <div className="lrn-exp-bridge-shade" />
          <img className={`lrn-exp-bridge-person ${bridgeBeat?.who === "teacher" ? "is-speaking" : "is-listening"}`} src={ERICKSON_CUTOUT} alt="ミルトン・エリクソン" />
          <img className={`lrn-exp-bridge-link ${bridgeBeat?.who === "link" ? "is-speaking" : "is-listening"}`} src={linkSrc(bridgeBeat?.who === "link" ? "think" : "neutral", false)} alt="清瀬リンク" />
          {bridge.narration?.trim() && <p className="lrn-exp-bridge-narration">{resolve(bridge.narration)}</p>}
          <div className="lrn-exp-bridge-progress" aria-label={`${bridgeBeats.length}場面中${bridgeBeatIndex + 1}場面`}>
            {bridgeBeats.map((_, index) => <i key={index} className={index <= bridgeBeatIndex ? "is-on" : ""} />)}
          </div>
          <div className={`lrn-exp-bridge-dialogue is-${bridgeBeat?.who ?? "teacher"}`}>
            <b>{bridgeBeat?.who === "link" ? "清瀬リンク" : "エリクソン"}</b>
            <p><TypewriterText key={`bridge-${bridgeBeatIndex}`} text={bridgeBeat ? resolve(bridgeBeat.text) : "漫画の続きを、あなた自身の場面へつなげます。"} /></p>
          </div>
          <button className="lrn-cta" onClick={advanceBridge}>{bridgeIsLast ? resolve(bridge.cta) : "会話を続ける →"}</button>
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
          <span className="lrn-exp-time">{gate.note ?? `約${part.minutes ?? 3}分 ・ タップで進行`}</span>
        </div>
      ) : (
        <>
          <div className={`lrn-exp-mentor is-${activeSpeaker} ${voice.speaking ? "is-on" : ""}`}>
            <div className="lrn-exp-aura" />
            <img src={mentorImage} alt={mentorAlt} />
            <div className="lrn-exp-name"><b>{mentorName}</b><span>{voice.speaking ? "語りかけています" : step?.kind === "input" || step?.kind === "scale" || step?.kind === "choice" ? "あなたの答えを待っています" : "次へ進めます"}</span></div>
          </div>

          <div className="lrn-exp-dialogue">
            {line && <div className="lrn-exp-speaker">{mentorSpeaker}</div>}
            {step?.kind === "say" && <p key={step.line.id} className="lrn-exp-line"><TypewriterText text={resolve(step.line.text)} /></p>}
            {step?.kind === "input" && (
              <div className="lrn-exp-turn">
                {line && <p className="lrn-exp-question-line"><TypewriterText key={line.id} text={line.text} /></p>}
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
                {step.skip && <button type="button" className="lrn-exp-skip" onClick={() => skipInput(step)}>{step.skip.label}</button>}
                <textarea rows={3} value={values[step.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [step.id]: e.target.value }))} placeholder={step.placeholder ? resolve(step.placeholder) : undefined} autoFocus />
                {step.helper && <small>{resolve(step.helper)}</small>}
                </div>
              </div>
            )}
            {step?.kind === "scale" && (
              <div className="lrn-exp-turn">
                {line && <p className="lrn-exp-question-line"><TypewriterText key={line.id} text={line.text} /></p>}
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
                  {step.options.map((o, i) => <button key={o.label} className={pendingChoice?.label === o.label ? "is-selected" : ""} onClick={() => step.detail ? setPendingChoice(o) : void choose(o)}><b>{String(i + 1).padStart(2, "0")}</b><span>{resolve(o.label)}</span><i>{pendingChoice?.label === o.label ? "✓" : "→"}</i></button>)}
                </div>
                {step.detail && <div className="lrn-exp-choice-detail">
                  <label htmlFor={`learn-detail-${step.detail.id}`}>{resolve(step.detail.label)} <small>{step.completion === "option-or-detail" ? "三択なしでも送れます" : "任意"}</small></label>
                  <div className="lrn-exp-choice-detail-field">
                    <textarea id={`learn-detail-${step.detail.id}`} rows={3} value={values[step.detail.id] ?? ""}
                      onChange={(e) => setValues((old) => ({ ...old, [step.detail!.id]: e.target.value }))}
                      placeholder={step.detail.placeholder ? resolve(step.detail.placeholder) : undefined} />
                    <div className="lrn-exp-choice-detail-actions">
                      <VoiceInput mode="learning" compact onText={(text) => setValues((old) => ({
                        ...old,
                        [step.detail!.id]: old[step.detail!.id]?.trim() ? `${old[step.detail!.id].trim()}\n${text}` : text,
                      }))} />
                      {step.completion === "option-or-detail" && <button type="button" className="lrn-exp-choice-send" onClick={confirmChoice} disabled={!detailReady || summarizing} aria-label="自由記述を送る">
                        {summarizing ? "…" : "送る"}
                      </button>}
                    </div>
                  </div>
                  {step.detail.helper && <p>{summarizing ? "話してくれた内容を、一文にまとめています…" : resolve(step.detail.helper)}</p>}
                </div>}
              </div>
            )}
            {step?.kind === "fade" && <div className="lrn-fade">{step.text}</div>}
          </div>

          <div className="lrn-exp-controls">
            <button onClick={back} disabled={idx === 0 && !bridge}>← 戻る</button>
            {step && step.kind !== "choice" && step.kind !== "fade" && (
              <button className="lrn-exp-next" onClick={next} disabled={!inputReady}>{step.kind === "input" ? "この答えで進む" : step.kind === "scale" ? "この点数で進む" : "次へ"} →</button>
            )}
            {step?.kind === "choice" && step.detail && (
              <button className="lrn-exp-next" onClick={confirmChoice} disabled={(!pendingChoice && !(step.completion === "option-or-detail" && detailReady)) || summarizing}>{summarizing ? "一文にまとめています…" : "この内容で進む →"}</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════ シナリオ駆動アドベンチャー ═══════════════════════ */

function AdventurePart({ ep, scenario, userName, voice, onDone }: {
  ep: string;
  scenario: AdventureScenario;
  userName: string;
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
      userName,
      stuckMoment: read("stuckMoment", "やりたいのに、最初の一歩を始められない"),
      theme: read("stuckMoment", "やりたいのに、最初の一歩を始められない"),
      exception: "できない方向から目を外し、今分かる感覚へ注意を移した場面",
      clue: read("channel", "今、聞こえている声"),
      resource: "『できないのに、やらなきゃ』から目を外し、今できる方向から次の暗示を作る",
      firstJudgment: read("firstJudgment", "最初の一動作をする自分へ注意を移した"),
      channel: read("channel", "").startsWith("『海辺")
        ? read("channel", "")
        : "『海辺はそのままでいい。今、私の声は聞こえますか？』",
    };
  });
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [activeEvidence, setActiveEvidence] = useState<{ evidence: AdventureEvidence; comment: string } | null>(null);
  const [guidedCompletedIds, setGuidedCompletedIds] = useState<string[]>([]);
  const [guidedSubmittedId, setGuidedSubmittedId] = useState<string | null>(null);
  const [summarizingKey, setSummarizingKey] = useState<string | null>(null);
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

  function inspectGuided(step: Extract<AdventureNode, { kind: "guided-investigation" }>['steps'][number]) {
    const evidence = scenario.evidence.find((item) => item.id === step.evidenceId);
    if (!evidence) return;
    setEvidenceIds((ids) => ids.includes(evidence.id) ? ids : [...ids, evidence.id]);
    setActiveEvidence({ evidence, comment: step.linkComment });
  }

  async function summarizePlayerAnswer(raw: string, question: string) {
    const cleaned = raw.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
    if (cleaned.length <= 55) return cleaned.replace(/[。！？]+$/, "");
    try {
      const response = await fetch("/api/learn/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleaned, question, mode: "insight" }),
      });
      const payload = await response.json().catch(() => ({}));
      const summary = typeof payload?.summary === "string" ? payload.summary.trim() : "";
      if (response.ok && summary) return summary;
    } catch { /* 元の意味を変えない短縮へフォールバック */ }
    const firstSentence = cleaned.split(/[。！？]/)[0]?.trim() || cleaned;
    return firstSentence.length <= 70 ? firstSentence : `${firstSentence.slice(0, 69)}…`;
  }

  async function createDialogueReply(
    raw: string,
    question: string,
    fallback: string,
    speaker: "teacher" | "link" = "link",
  ) {
    try {
      const response = await fetch("/api/learn/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: raw, question, mode: "reply", speaker }),
      });
      const payload = await response.json().catch(() => ({}));
      const reply = typeof payload?.summary === "string" ? payload.summary.trim() : "";
      const comparable = (value: string) => value.replace(/[\s『』「」、。！？?!・ー〜～]/g, "").toLowerCase();
      const rawCore = comparable(raw);
      const replyCore = comparable(reply);
      const repeatsInput = rawCore.length >= 6 && (replyCore.includes(rawCore) || rawCore.includes(replyCore));
      const usesParrotTemplate = /なるほど|つまり|ってことだね|と考えたんだね|と見たんだね/.test(reply);
      if (response.ok && reply && !repeatsInput && !usesParrotTemplate) return reply;
    } catch { /* 会話を止めず、台本で用意した自然な返答を使う */ }
    return fallback;
  }

  async function submitRecall(recall: Extract<AdventureNode, { kind: "recall" }>, forcedValue?: string) {
    const raw = (forcedValue ?? values[recall.storeAs] ?? "").trim();
    if (!raw || summarizingKey) return;
    setSummarizingKey(recall.storeAs);
    const question = resolve(recall.title);
    const [value, reply] = forcedValue
      ? [raw, recall.replyFallback]
      : await Promise.all([
        summarizePlayerAnswer(raw, question),
        createDialogueReply(raw, question, recall.replyFallback, recall.purpose === "reflection" ? "teacher" : "link"),
      ]);
    const replyKey = `${recall.storeAs}Reply`;
    setValues((old) => ({ ...old, [recall.storeAs]: value, [replyKey]: reply }));
    try {
      localStorage.setItem(`learn:${ep}:${recall.storeAs}`, value);
      localStorage.setItem(`learn:${ep}:${replyKey}`, reply);
      if (!forcedValue) localStorage.setItem(`learn:${ep}:${recall.storeAs}Raw`, raw);
    } catch { /* ignore */ }
    setSummarizingKey(null);
    advance();
  }

  async function submitGuidedReflection(
    step: Extract<AdventureNode, { kind: "guided-investigation" }>["steps"][number],
    forcedValue?: string,
  ) {
    const raw = (forcedValue ?? values[step.storeAs] ?? "").trim();
    if (!raw || summarizingKey) return;
    setSummarizingKey(step.storeAs);
    const question = resolve(step.reflectionPrompt);
    const [value, reply] = forcedValue
      ? [raw, step.replyFallback]
      : await Promise.all([
        summarizePlayerAnswer(raw, question),
        createDialogueReply(raw, question, step.replyFallback),
      ]);
    const replyKey = `${step.storeAs}Reply`;
    setValues((old) => ({ ...old, [step.storeAs]: value, [replyKey]: reply }));
    try {
      localStorage.setItem(`learn:${ep}:${step.storeAs}`, value);
      localStorage.setItem(`learn:${ep}:${replyKey}`, reply);
      if (!forcedValue) localStorage.setItem(`learn:${ep}:${step.storeAs}Raw`, raw);
    } catch { /* ignore */ }
    setGuidedSubmittedId(step.id);
    setSummarizingKey(null);
  }

  function completeGuidedReflection(stepId: string) {
    setGuidedCompletedIds((ids) => ids.includes(stepId) ? ids : [...ids, stepId]);
    setGuidedSubmittedId(null);
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

  async function evaluateFreeAnswer(challenge: Extract<AdventureNode, { kind: "apply" }>) {
    if (!challenge.freeAnswer || summarizingKey) return;
    const raw = (values[challenge.freeAnswer.storeAs] ?? "").trim();
    if (!raw) return;
    setSummarizingKey(challenge.freeAnswer.storeAs);
    let correct = !/(全部(?:やれ|やる|終わら|完成)|終わるまで|できるまで|理由を.*考|頑張れ)/.test(raw);
    let responseText = correct
      ? "正解です。完成ではなく、今できる一動作へ注意を移せています。"
      : "まだ『できない完成』へ注意が残っています。今すぐ本当にできる一動作まで小さくしてください。";
    try {
      const response = await fetch("/api/learn/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: resolve(challenge.title),
          answer: raw,
          correctCriteria: challenge.freeAnswer.correctCriteria,
          incorrectCriteria: challenge.freeAnswer.incorrectCriteria,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && typeof payload?.correct === "boolean" && typeof payload?.feedback === "string") {
        correct = payload.correct;
        responseText = payload.feedback.trim();
      }
    } catch { /* 通信できない場合も、画面内の基準で判定して止めない */ }
    setSelectedId("custom-answer");
    setFeedback(responseText);
    if (correct) {
      setSolved((old) => ({ ...old, [challenge.id]: true }));
      setValues((old) => ({ ...old, [challenge.storeAs]: raw }));
      try {
        localStorage.setItem(`learn:${ep}:${challenge.storeAs}`, raw);
        localStorage.setItem(`learn:${ep}:${challenge.freeAnswer.storeAs}`, raw);
      } catch { /* ignore */ }
    }
    setSummarizingKey(null);
  }

  const speaker = currentLine?.who ?? (node?.kind === "recall" || node?.kind === "guided-investigation" ? "link" : null);
  const sceneName = node?.scene ?? scenario.title;
  const gatheredHere = node?.kind === "investigate"
    ? node.spots.filter((spot) => evidenceIds.includes(spot.evidenceId)).length
    : 0;
  const investigateDone = node?.kind === "investigate" && gatheredHere === node.spots.length;
  const currentInvestigateSpot = node?.kind === "investigate" ? node.spots[gatheredHere] ?? null : null;
  const gatheredGuided = node?.kind === "guided-investigation"
    ? node.steps.filter((step) => guidedCompletedIds.includes(step.id)).length
    : 0;
  const currentGuidedStep = node?.kind === "guided-investigation" ? node.steps[gatheredGuided] ?? null : null;
  const guidedDone = node?.kind === "guided-investigation" && gatheredGuided === node.steps.length;
  const currentGuidedViewed = currentGuidedStep ? evidenceIds.includes(currentGuidedStep.evidenceId) : false;
  const currentGuidedSubmitted = currentGuidedStep ? guidedSubmittedId === currentGuidedStep.id : false;
  const availableEvidenceIds = useMemo(() => new Set(evidenceIds), [evidenceIds]);
  const availableEvidence = scenario.evidence.filter((item) => availableEvidenceIds.has(item.id));

  return (
    <div className={`lrn-av lrn-av-camera-${node?.kind === "dialogue" ? (node.camera ?? "wide") : node?.kind === "recall" || node?.kind === "guided-investigation" ? "link" : "evidence"}`}
      style={{ backgroundImage: `linear-gradient(180deg,rgba(5,9,18,.05),rgba(5,9,18,.78)),url(${scenario.background})` }}>
      <div className="lrn-av-vignette" />

      {!started ? (
        <div className="lrn-av-start">
          <div className="lrn-av-case-no">{scenario.caseNo}</div>
          <h2>{resolve(scenario.title)}</h2>
          {scenario.question && <p className="lrn-av-question">{resolve(scenario.question)}</p>}
          <div className="lrn-av-start-cast" aria-hidden="true">
            <img className="teacher" src={scenario.teacherSprite} alt="" />
            <img className="link" src={scenario.linkSprite} alt="" />
          </div>
          <div className="lrn-av-objective"><b>MISSION</b><span>{resolve(scenario.objective)}</span></div>
          <button className="lrn-av-primary" onClick={() => setStarted(true)}>{scenario.startLabel ?? "捜査を始める"}</button>
        </div>
      ) : (
        <>
          <div className="lrn-av-hud">
            <div className="lrn-av-hud-case"><b>{scenario.caseNo}</b><span>{sceneName}</span></div>
            <div className="lrn-av-hud-goal">目的：{resolve(scenario.objective)}</div>
            <div className={`lrn-av-hud-actions ${node?.kind === "dialogue" ? "is-dialogue" : ""}`}>
              <button onClick={back} disabled={idx === 0} aria-label="一つ前へ戻る">↶</button>
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
              <p><TypewriterText text={currentLine.text} /></p>
              <div className="lrn-av-dialogue-controls">
                <button onClick={back} disabled={idx === 0}>← 戻る</button>
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
              {currentInvestigateSpot && !activeEvidence && <button key={currentInvestigateSpot.id} className="lrn-av-hotspot"
                style={{ left: `${currentInvestigateSpot.x}%`, top: `${currentInvestigateSpot.y}%` }} onClick={() => inspect(currentInvestigateSpot)}>
                <i>!</i><span>{currentInvestigateSpot.label}</span>
              </button>}
              {investigateDone && !activeEvidence && <button className="lrn-av-primary lrn-av-investigate-next" onClick={advance}>3つの場面で推理する</button>}
            </div>
          )}

          {node?.kind === "recall" && (
            <div className="lrn-av-recall">
              <div className="lrn-av-recall-card">
                <div className="lrn-av-recall-speaker"><img src={scenario.linkSprite} alt="" /><b>清瀬リンク</b></div>
                <h3>{resolve(node.title)}</h3>
                <p>{resolve(node.prompt)}</p>
                <div className="lrn-av-recall-field">
                  <textarea rows={3} value={values[node.storeAs] ?? ""}
                    onChange={(event) => setValues((old) => ({ ...old, [node.storeAs]: event.target.value }))}
                    placeholder={node.placeholder ? resolve(node.placeholder) : undefined} autoFocus />
                  <VoiceInput mode="learning" compact onText={(text) => setValues((old) => ({
                    ...old,
                    [node.storeAs]: old[node.storeAs]?.trim() ? `${old[node.storeAs].trim()}\n${text}` : text,
                  }))} />
                </div>
                {node.helper && <small>{resolve(node.helper)}</small>}
                <div className="lrn-av-recall-actions">
                  {node.skipLabel && node.skipValue && <button onClick={() => submitRecall(node, node.skipValue)}>{node.skipLabel}</button>}
                  <button className="lrn-av-primary" disabled={!values[node.storeAs]?.trim()} onClick={() => submitRecall(node)}>リンクに答える</button>
                </div>
              </div>
            </div>
          )}

          {node?.kind === "guided-investigation" && (
            <div className="lrn-av-guided">
              <div className="lrn-av-guided-card">
                <div className="lrn-av-guided-count">本を読み返す　{Math.min(gatheredGuided + 1, node.steps.length)} / {node.steps.length}</div>
                <div className="lrn-av-guided-link"><img src={scenario.linkSprite} alt="" /><b>清瀬リンク</b></div>
                <h3>{resolve(node.title)}</h3>
                {currentGuidedStep && !activeEvidence && !currentGuidedViewed && <>
                  <p>{resolve(currentGuidedStep.linkPrompt)}</p>
                  <button className="lrn-av-primary" onClick={() => inspectGuided(currentGuidedStep)}>{currentGuidedStep.actionLabel}</button>
                </>}
                {currentGuidedStep && !activeEvidence && currentGuidedViewed && !currentGuidedSubmitted && <>
                  <p className="lrn-av-guided-question">{resolve(currentGuidedStep.reflectionPrompt)}</p>
                  <div className="lrn-av-recall-field">
                    <textarea rows={3} value={values[currentGuidedStep.storeAs] ?? ""}
                      onChange={(event) => setValues((old) => ({ ...old, [currentGuidedStep.storeAs]: event.target.value }))}
                      placeholder={currentGuidedStep.placeholder ? resolve(currentGuidedStep.placeholder) : undefined} />
                    <VoiceInput mode="learning" compact onText={(text) => setValues((old) => ({
                      ...old,
                      [currentGuidedStep.storeAs]: old[currentGuidedStep.storeAs]?.trim() ? `${old[currentGuidedStep.storeAs].trim()}\n${text}` : text,
                    }))} />
                  </div>
                  {currentGuidedStep.helper && <small>{resolve(currentGuidedStep.helper)}</small>}
                  <div className="lrn-av-recall-actions">
                    {currentGuidedStep.skipLabel && currentGuidedStep.skipValue && <button disabled={Boolean(summarizingKey)} onClick={() => void submitGuidedReflection(currentGuidedStep, currentGuidedStep.skipValue)}>{currentGuidedStep.skipLabel}</button>}
                    <button className="lrn-av-primary" disabled={!values[currentGuidedStep.storeAs]?.trim() || Boolean(summarizingKey)} onClick={() => void submitGuidedReflection(currentGuidedStep)}>
                      {summarizingKey === currentGuidedStep.storeAs ? "考えをまとめています…" : "リンクに答える"}
                    </button>
                  </div>
                </>}
                {currentGuidedStep && !activeEvidence && currentGuidedSubmitted && <>
                  <div className="lrn-av-guided-response">
                    <b>リンク</b>
                    <p><TypewriterText text={resolve(currentGuidedStep.linkResponse)} /></p>
                  </div>
                  <button className="lrn-av-primary" onClick={() => completeGuidedReflection(currentGuidedStep.id)}>{currentGuidedStep.nextLabel ?? "次へ進む"}</button>
                </>}
                {guidedDone && !activeEvidence && <>
                  <p>見た場面をつなげて、リンクに気づいたことを一言で話してみよう。</p>
                  <button className="lrn-av-primary" onClick={advance}>{node.nextLabel ?? "会話を続ける"}</button>
                </>}
              </div>
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
              {node.kind === "apply" && node.freeAnswer && <div className="lrn-av-free-answer">
                <label htmlFor={`learn-${node.id}-free`}>{resolve(node.freeAnswer.label)}</label>
                <div className="lrn-av-recall-field">
                  <textarea id={`learn-${node.id}-free`} rows={3}
                    value={values[node.freeAnswer.storeAs] ?? ""}
                    onChange={(event) => setValues((old) => ({ ...old, [node.freeAnswer!.storeAs]: event.target.value }))}
                    placeholder={resolve(node.freeAnswer.placeholder)} />
                  <VoiceInput mode="learning" compact onText={(text) => setValues((old) => ({
                    ...old,
                    [node.freeAnswer!.storeAs]: old[node.freeAnswer!.storeAs]?.trim() ? `${old[node.freeAnswer!.storeAs].trim()}\n${text}` : text,
                  }))} />
                </div>
                <small>{resolve(node.freeAnswer.helper)}</small>
                <button type="button" className="lrn-av-free-submit"
                  disabled={!values[node.freeAnswer.storeAs]?.trim() || Boolean(summarizingKey) || Boolean(solved[node.id])}
                  onClick={() => void evaluateFreeAnswer(node)}>
                  {summarizingKey === node.freeAnswer.storeAs ? "判定しています…" : "この一言を判定する"}
                </button>
              </div>}
              {feedback && <div className={`lrn-av-feedback ${solved[node.id] ? "is-correct" : ""}`}><b>リンク</b><span><TypewriterText key={feedback} text={feedback} /></span></div>}
              {solved[node.id] && <button className="lrn-av-primary" onClick={advance}>{node.kind === "apply" ? "この一手を使う" : "推理を確定する"}</button>}
            </div>
          )}

          {node?.kind === "reveal" && (
            <div className="lrn-av-reveal">
              <div className="lrn-av-reveal-kicker">{node.kicker}</div>
              <h3>{resolve(node.title)}</h3>
              <p><SentenceText text={resolve(node.body)} /></p>
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
            <div className="lrn-av-evidence-modal" role="dialog" aria-label={node?.kind === "guided-investigation" ? "漫画の場面を確認" : "証拠を発見"}>
              <div className="lrn-av-evidence-card">
                <div className="lrn-av-evidence-found">{node?.kind === "guided-investigation" ? "MANGA SCENE" : "EVIDENCE FOUND"}</div>
                <div className="icon">{activeEvidence.evidence.icon}</div>
                <h3>{activeEvidence.evidence.title}</h3>
                {activeEvidence.evidence.image && <img className="lrn-av-evidence-scene" src={activeEvidence.evidence.image} alt={activeEvidence.evidence.imageAlt ?? activeEvidence.evidence.title} />}
                <b>{activeEvidence.evidence.summary}</b>
                <p>{activeEvidence.evidence.detail}</p>
                <div className="link-comment"><img src={scenario.linkSprite} alt="清瀬リンク" /><span><TypewriterText text={activeEvidence.comment} /></span></div>
                <button className="lrn-av-primary" onClick={() => setActiveEvidence(null)}>{node?.kind === "guided-investigation" ? "本を閉じてリンクと話す" : "証拠ファイルへ保存"}</button>
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
  ep, items, userName, voice, tickets, onUseTicket, onDone, showTickets, startLabel, dim,
}: {
  ep: string; items: Flat[]; voice: ReturnType<typeof useVoice>; tickets: number; onUseTicket: () => void;
  userName: string; onDone: () => void; showTickets: boolean; startLabel?: string; dim?: boolean;
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
      userName,
      stuckMoment: read("stuckMoment", "やりたいのに、最初の一歩を始められない"),
      theme: read("stuckMoment", "やりたいのに、最初の一歩を始められない"),
      exception: "できない方向から目を外し、今分かる感覚へ注意を移した場面",
      clue: read("channel", "今、聞こえている声"),
      resource: "『できないのに、やらなきゃ』から目を外し、今できる方向から次の暗示を作る",
      firstJudgment: read("firstJudgment", "最初の一動作をする自分へ注意を移した"),
      channel: read("channel", "").startsWith("『海辺")
        ? read("channel", "")
        : "『海辺はそのままでいい。今、私の声は聞こえますか？』",
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
          <h2>「できない」から目を外すと、何が変わる？</h2>
          <p>命令、自己暗示、リンクへの催眠、あなたの最初の一動作。注意がどこからどこへ移ったかを、ここで一つにつなげます。<br />分からない箇所では、🎫で先生を止めて質問できます。</p>
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
            <button className="next" onClick={next}>次へ →</button>
          </div>
          <div className="lrn-tapnote">タップまたは「次へ」で進みます</div>
          {asking && cur && (
            <AskSheet ep={ep} sceneNo={cur.scene?.no ?? 0} tickets={tickets} onUse={onUseTicket} onClose={closeAsk}
              context={{
                location: cur.scene?.title ?? "解説講義",
                objective: "事件と短い催眠体験を、催眠・暗示・Utilizationの仕組みとして理解する",
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
      objective: "命令と暗示の違い、自己暗示とUtilizationのつながりを理解する",
      nodeKind: "final-qa",
      theme: read("stuckMoment", "やりたいのに、最初の一歩を始められない"),
      exception: "できない方向から目を外し、今分かる感覚へ注意を移した場面",
      clue: read("channel", "今、聞こえている声"),
      resource: read("firstJudgment", "最初の一動作をする自分へ注意を移した"),
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
    return {
      theme: read("stuckMoment", "やりたいのに、最初の一歩を始められない"),
      clue: read("channel", "今、聞こえている声"),
      resource: read("firstJudgment", "最初の一動作をする自分へ注意を移した"),
    };
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
            {part.card.reading && <div className="reading">{part.card.reading}</div>}
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
        <h2>{part.next.title}</h2>
        <div className="lrn-nextcase-dialogue is-man"><b>男性</b><span>私は絶対に、催眠なんかにかかりません。</span></div>
        <img className="lrn-nextcase-erickson" src={ERICKSON_CUTOUT} alt="ミルトン・エリクソン" />
        <div className="lrn-nextcase-dialogue is-teacher"><b>エリクソン</b><span>では、かからないようにしてください。</span></div>
        <div className="lrn-nextcase-unlock">
          <b>{part.next.no}｜{part.next.series}</b>
          <button type="button" disabled>{part.unlock[0] ?? "準備中"}</button>
          <span>第{epNo}話 おわり</span>
          <Link href="/learn">一覧にもどる</Link>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ 本体 ═══════════════════════ */

const PART_LABEL: Record<Part["kind"], string> = {
  manga: "漫画", experience: "体験", classroom: "教室", adventure: "推理", qa: "質問", card: "原理", outro: "次回へ", teaser: "次回",
};

const LEARN_PROGRESS_VERSION = "v12";

export function LearnPlayer({ episode, userName, startPart }: { episode: Episode; userName: string; startPart?: number }) {
  const clampPart = useCallback((value: number) => Math.max(0, Math.min(episode.parts.length - 1, value)), [episode.parts.length]);
  const [pi, setPi] = useState(() => {
    if (startPart !== undefined) return Math.max(0, Math.min(episode.parts.length - 1, startPart));
    return 0;
  });
  const [progressReady, setProgressReady] = useState(startPart !== undefined);
  const [tickets, setTickets] = useState(episode.tickets);
  const [restartKey, setRestartKey] = useState(0);
  const voice = useVoice(episode.key);
  const part = episode.parts[pi];
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (startPart !== undefined) return;
    const restoreProgress = window.setTimeout(() => {
      let savedPart = 0;
      try {
        savedPart = clampPart(Number(window.localStorage.getItem(`learn:${episode.key}:flow:${LEARN_PROGRESS_VERSION}:part`) || 0));
      } catch { /* ignore */ }
      setPi(savedPart);
      setProgressReady(true);
    }, 0);
    return () => window.clearTimeout(restoreProgress);
  }, [clampPart, episode.key, startPart]);

  useEffect(() => {
    if (!progressReady) return;
    scrollRef.current?.scrollTo({ top: 0 });
    try { window.localStorage.setItem(`learn:${episode.key}:flow:${LEARN_PROGRESS_VERSION}:part`, String(pi)); } catch { /* ignore */ }
  }, [episode.key, pi, progressReady]);

  const next = useCallback(() => {
    voice.stop();
    setPi((p) => Math.min(episode.parts.length - 1, p + 1));
  }, [episode.parts.length, voice]);
  const previousPart = useCallback(() => {
    voice.stop();
    setPi((p) => Math.max(0, p - 1));
  }, [voice]);

  function restartEpisode() {
    if (!window.confirm("第1話の途中経過を消して、最初の学校画面から見直しますか？")) return;
    voice.stop();
    try {
      const prefix = `learn:${episode.key}:`;
      Object.keys(window.localStorage).filter((key) => key.startsWith(prefix)).forEach((key) => window.localStorage.removeItem(key));
    } catch { /* ignore */ }
    setTickets(episode.tickets);
    setPi(0);
    setRestartKey((value) => value + 1);
  }

  const classroom = episode.parts.find((p) => p.kind === "classroom") as Extract<Part, { kind: "classroom" }> | undefined;
  const lastScene = classroom ? classroom.scenes[classroom.scenes.length - 1].no : 0;

  if (!progressReady) {
    return (
      <div className="lrn lrn-resume-loading" role="status" aria-live="polite">
        <span>授業を開いています…</span>
      </div>
    );
  }

  function body() {
    switch (part.kind) {
      case "manga":
        return <MangaPart key={`manga-${restartKey}`} part={part} userName={userName} onDone={next} label="催眠学校へ戻る ▶" />;
      case "experience":
        return <ExperiencePart key={`experience-${restartKey}`} ep={episode.key} part={part} userName={userName} voice={voice} onDone={next} />;
      case "classroom": {
        const items: Flat[] = part.scenes.flatMap((s, si) => s.lines.map((l) => ({ line: l, scene: s, sceneIdx: si })));
        return <DialoguePart key={`classroom-${restartKey}`} ep={episode.key} items={items} userName={userName} voice={voice} tickets={tickets} onUseTicket={() => setTickets((t) => Math.max(0, t - 1))}
          onDone={next} showTickets startLabel="▶ 授業をはじめる" />;
      }
      case "adventure":
        return <AdventurePart key={`adventure-${restartKey}`} ep={episode.key} scenario={part.scenario} userName={userName} voice={voice} onDone={next} />;
      case "qa":
        return <QaPart ep={episode.key} part={part} tickets={tickets} onUseTicket={() => setTickets((t) => Math.max(0, t - 1))} onDone={next} lastScene={lastScene} />;
      case "card":
        return <CardPart ep={episode.key} part={part} voice={voice} onDone={next} />;
      case "outro": {
        const items: Flat[] = part.lines.map((l) => ({ line: l, scene: null, sceneIdx: -1 }));
        return <DialoguePart key={`outro-${restartKey}`} ep={episode.key} items={items} userName={userName} voice={voice} tickets={tickets} onUseTicket={() => {}} onDone={next} showTickets={false} />;
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
        <div className="lrn-head-actions">
          <button type="button" className="restart" onClick={restartEpisode}>↻ 最初から</button>
          <span className="tickets">🎫 × {tickets}</span>
        </div>
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
