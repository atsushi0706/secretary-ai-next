"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Episode, ExpStep, Face, Line, Part, Scene, Slide } from "@/lib/learn/types";
import { VOICE_OF, audioUrl } from "@/lib/learn/types";
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

    // ① 焼き込み済み
    let ok = await playUrl(audioUrl(ep, line.id), run);
    if (runRef.current !== run) return;
    if (ok) { setEngine("baked"); setSpeaking(false); return; }

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
const LINK_BASE: Record<Face, string> = {
  neutral: "link-neutral", smile: "link-smile", laugh: "link-smile", aha: "link-smile",
  think: "link-neutral", shy: "link-worry",
};
function linkSrc(face: Face, open: boolean) {
  return `/learn/chars/${LINK_BASE[face]}${open ? "-open" : ""}.webp`;
}

/** 口パク：話している間だけ 開↔閉 を切り替える */
function useMouth(active: boolean) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!active) { setOpen(false); return; }
    let alive = true;
    const tick = () => {
      if (!alive) return;
      setOpen((o) => !o);
      setTimeout(tick, 120 + Math.random() * 120);
    };
    tick();
    return () => { alive = false; };
  }, [active]);
  return open;
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

function AskSheet({
  ep, sceneNo, tickets, onUse, onClose, title = "先生に聞く",
}: { ep: string; sceneNo: number; tickets: number; onUse: () => void; onClose: () => void; title?: string }) {
  const [q, setQ] = useState("");
  const [a, setA] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voicing, setVoicing] = useState(false);

  async function ask() {
    if (!q.trim() || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/learn/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ep, sceneNo, question: q.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? "答えが返ってこなかった"); return; }
      setA(d.answer);
      onUse();
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
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }
  useEffect(() => () => { try { audioRef.current?.pause(); } catch { /* ignore */ } }, []);

  return (
    <div className="lrn-sheet" role="dialog">
      <div className="lrn-sheet-card">
        <div className="lrn-sheet-head">
          <span>🎫 {title}</span>
          <span className="rest">残り 🎫 × {tickets}</span>
        </div>
        {!a ? (
          <>
            <p className="lrn-sheet-lead">授業はここで止まっています。いま聞きたいことを、そのまま書いて。</p>
            <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3} placeholder="例：じゃあ怒りも使える？" autoFocus />
            {err && <p className="lrn-err">{err}</p>}
            <div className="lrn-sheet-btns">
              <button className="ghost" onClick={onClose}>やっぱり戻る</button>
              <button className="main" disabled={!q.trim() || busy || tickets <= 0} onClick={ask}>
                {busy ? "先生が考えている…" : "チケットを使って聞く"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="lrn-answer">
              <div className="lrn-answer-who"><img src={ERICKSON[voicing ? "talk" : "smile"]} alt="" /><span>エリクソン</span></div>
              <p>{a}</p>
            </div>
            <div className="lrn-sheet-btns">
              <button className="main" onClick={onClose}>授業に戻る ▶</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════ 各パート ═══════════════════════ */

function MangaPart({ part, onDone, label }: { part: Extract<Part, { kind: "manga" }>; onDone: () => void; label: string }) {
  return (
    <div className="lrn-manga">
      {part.pages.map((pg, i) => <MangaPageView key={i} page={pg} index={i} />)}
      <div className="lrn-manga-end">
        {part.close?.map((t, i) => <p key={i}>{t}</p>)}
        <button className="lrn-cta" onClick={onDone}>{label}</button>
      </div>
    </div>
  );
}

function ExperiencePart({ ep, part, voice, onDone }: { ep: string; part: Extract<Part, { kind: "experience" }>; voice: ReturnType<typeof useVoice>; onDone: () => void }) {
  const [line, setLine] = useState<Line | null>(null);
  const [shown, setShown] = useState<string[]>([]);
  const [choice, setChoice] = useState<{ q: string; options: { label: string }[] } | null>(null);
  const [fade, setFade] = useState<string | null>(null);
  const pickRef = useRef<((i: number) => void) | null>(null);
  const aliveRef = useRef(true);
  const startedRef = useRef(false);
  const [started, setStarted] = useState(false);
  const steps = part.steps;
  const speak = voice.speak;

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; voice.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(async (list: ExpStep[]) => {
    for (const s of list) {
      if (!aliveRef.current) return;
      if (s.kind === "say") {
        setLine(s.line);
        await speak(s.line);
        await sleep((s.wait ?? 0.9) * 1000);
      } else if (s.kind === "show") {
        setShown([]);
        for (const it of s.items) {
          if (!aliveRef.current) return;
          setShown((p) => [...p, it]);
          await sleep((s.each ?? 1.5) * 1000);
        }
      } else if (s.kind === "choice") {
        setLine(null);
        setChoice({ q: s.q, options: s.options.map((o) => ({ label: o.label })) });
        const i = await new Promise<number>((res) => { pickRef.current = res; });
        setChoice(null);
        setShown([]);
        await run(s.options[i].then);
      } else if (s.kind === "fade") {
        setFade(s.text ?? "");
        await sleep(1600);
      }
    }
  }, [speak]);

  async function start() {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
    await run(steps);
    if (aliveRef.current) onDone();
  }

  return (
    <div className={`lrn-exp ${fade !== null ? "is-fade" : ""}`}>
      {!started ? (
        <div className="lrn-exp-gate">
          <img src={ERICKSON.neutral} alt="" />
          <h2>{part.title}</h2>
          <p>先生の声と画面だけで進みます。約{part.minutes ?? 2}分。</p>
          <button className="lrn-cta" onClick={start}>▶ はじめる</button>
        </div>
      ) : (
        <>
          <div className="lrn-exp-text">
            {line && <p key={line.id} className="lrn-exp-line">{line.text}</p>}
            {shown.length > 0 && (
              <div className="lrn-exp-items">
                {shown.map((t, i) => <div key={i} className="lrn-exp-item">{t}</div>)}
              </div>
            )}
            {choice && (
              <div className="lrn-exp-choice">
                <h3>{choice.q}</h3>
                {choice.options.map((o, i) => (
                  <button key={o.label} className="lrn-cta" onClick={() => pickRef.current?.(i)}>{o.label}</button>
                ))}
              </div>
            )}
          </div>
          <div className={`lrn-exp-teacher ${voice.speaking ? "is-on" : ""}`}>
            <img src={voice.speaking ? ERICKSON.talk : ERICKSON.neutral} alt="" />
          </div>
          {fade !== null && <div className="lrn-fade">{fade}</div>}
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
      if (idx + 1 < items.length) setIdx(idx + 1);
      else onDone();
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
          <div className="lrn-tapnote">{voice.engine === "silent" ? "（音が出ていません。タップで進む）" : "タップで次へ"}</div>
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
      const have = JSON.parse(localStorage.getItem(key) || "[]");
      if (!have.some((c: any) => c.ep === ep)) {
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
  manga: "漫画", experience: "体験", classroom: "教室", qa: "質問", card: "原理", outro: "次回へ", teaser: "次回",
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
        return <ExperiencePart ep={episode.key} part={part} voice={voice} onDone={next} />;
      case "classroom": {
        const items: Flat[] = part.scenes.flatMap((s, si) => s.lines.map((l) => ({ line: l, scene: s, sceneIdx: si })));
        return <DialoguePart ep={episode.key} items={items} voice={voice} tickets={tickets} onUseTicket={() => setTickets((t) => Math.max(0, t - 1))}
          onDone={next} showTickets startLabel="▶ 授業をはじめる" />;
      }
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
