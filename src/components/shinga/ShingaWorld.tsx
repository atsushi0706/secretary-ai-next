"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PLACES, type PlaceKey } from "@/lib/places";
import { MODES, MODE_OPENERS, type ModeKey } from "@/lib/modes";
import { VoiceBar } from "./VoiceBar";
import { PeakPanel } from "./PeakPanel";
import { AkashicPanel } from "./AkashicPanel";
import { EmotionMeter, emoName } from "./EmotionMeter";
import { BreathGuide } from "./BreathGuide";
import { WalkLanding } from "./WalkLanding";
import { ReportScreen } from "./ReportScreen";
import { DailyReflection } from "./DailyReflection";
import { HeroScreen } from "./HeroScreen";
import { TaskListPanel } from "./TaskListPanel";
import { InnerHud } from "./InnerHud";

type Face = "neutral" | "smile" | "anxious";
type Choice = { label: string; mode?: ModeKey };
type Message = { role: "user" | "assistant"; content: string };

// タグが本文に混じっても画面に出さない（最初のタグ開始で切る）
function stripTags(t: string): string {
  const i = t.search(/<(face|move|choices|quest_to_add|hero_delta)\b/);
  return (i >= 0 ? t.slice(0, i) : t).trimEnd();
}

async function readSse(resp: Response, onEvent: (event: string, data: any) => void) {
  if (!resp.body) return;
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split("\n\n");
    buf = chunks.pop() ?? "";
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      let name = "message";
      let dataStr = "";
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) name = line.slice(6).trim();
        else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
      }
      if (!dataStr) continue;
      try { onEvent(name, JSON.parse(dataStr)); } catch { /* ignore */ }
    }
  }
}

const FACE_SRC: Record<Face, string> = {
  neutral: "/kiyose.png",
  smile: "/kiyose_smile.png",
  anxious: "/kiyose_anxious.png",
};

// タップした瞬間に鳴る、やさしい単音（外部ファイル不要・Web Audio）。
// 穏やか(1)ほど高く澄んだ音、しんどい(10)ほど低くやわらかい音。
function playChime(n: number) {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 680 - ((n - 1) / 9) * (680 - 320);
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.start(t); o.stop(t + 0.72);
    o.onended = () => { try { ctx.close(); } catch { /* ignore */ } };
  } catch { /* 音が出なくても体験は進む */ }
}

// 地図の光の粒の位置（取り組み日数ぶん・決定的にばらす）
function moteStyle(i: number) {
  const gx = (i * 37) % 100, gy = (i * 61) % 100;
  return { left: `${6 + gx * 0.86}%`, top: `${14 + gy * 0.66}%`, animationDelay: `${(i % 8) * 0.45}s` } as const;
}

// 気分に応じた、キヨセリンクの一言（低い数字＝穏やかを責めない・高い数字＝しんどいを休ませる）
function moodLineFor(n: number): string {
  if (n <= 2) return "いい感じだね😊 その穏やかさのまま、今日の理想を歩きにいこ。";
  if (n <= 4) return "落ち着いてるね。ここから整えていけるよ。まずピークステート、どう？";
  if (n <= 6) return "ふつうくらいか😊 じゃあ軽く整えてから、やりたいこと見にいこ。";
  if (n <= 8) return "ちょっとしんどめだね。無理しなくていいよ。まず呼吸で整えよっか。";
  return "今日はよく来たね。ここで休んでいいよ。何もしなくて、大丈夫。";
}

export function ShingaWorld({
  guideName, avatarUrl, initialPlace,
}: {
  guideName: string;
  avatarUrl: string;
  initialPlace?: PlaceKey;
}) {
  const [view, setView] = useState<"home" | "talk">(initialPlace ? "talk" : "home");
  const [mode, setMode] = useState<ModeKey | null>(null);
  const [place, setPlace] = useState<PlaceKey>(initialPlace ?? "peak");
  const [messages, setMessages] = useState<Message[]>([]);
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [widget, setWidget] = useState<"emotion" | "breath" | null>(null);
  const [emoPick, setEmoPick] = useState<number | null>(null);
  const [face, setFace] = useState<Face>("neutral");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [moving, setMoving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [heroOpen, setHeroOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [walkLanding, setWalkLanding] = useState(false); // パラレルウォーク→今日に落とす着地
  const [homeMood, setHomeMood] = useState<number | null>(null); // 起動直後の「気分1タップ」
  const [moodLine, setMoodLine] = useState<string | null>(null);
  const [activeDays, setActiveDays] = useState(0);               // 地図の育ち（取り組み日数）
  const [heroStatement, setHeroStatement] = useState("");        // 常設する主人公像（物語の核）

  // 主人公像を読み込んで、常に見える場所に置く（物語をモーダルに隠さない）
  useEffect(() => {
    fetch("/api/hero").then((r) => r.json()).then((d) => {
      setHeroStatement(d?.hero?.hero_statement?.trim() || d?.hero?.desired_world?.trim() || "");
    }).catch(() => {});
  }, []);
  const [heroToast, setHeroToast] = useState<{ label: string; from: number; to: number }[] | null>(null);
  const heroToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debug, setDebug] = useState(false);
  const [debugAvailable, setDebugAvailable] = useState(false); // ?debug=1 のときだけ（お客さんには出さない）
  const [debugTrace, setDebugTrace] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // URL に ?debug=1 が付いているときだけ、可視化パネルを使えるようにする（開発用）
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("debug") === "1") {
        setDebugAvailable(true);
        setDebug(true);
      }
    } catch { /* ignore */ }
  }, []);

  // タイプ演出：流れてきた文字を一定ペースで少しずつ表示（考えながらピピピ）
  const targetRef = useRef("");     // これまでに届いた生テキスト
  const shownRef = useRef(0);        // 表示済み文字数
  const finalRef = useRef(false);    // 生成終了フラグ
  // テンプレで出した開始の一言。最初の返事のときだけAIへ渡して文脈をつなぐ（DBにも積む）
  const pendingOpenerRef = useRef<{ mode: ModeKey; line: string } | null>(null);

  const here = PLACES[place];
  const isDefaultFace = avatarUrl === "/kiyose.png";
  const [faceSrc, setFaceSrc] = useState(avatarUrl);

  useEffect(() => {
    // カスタムアバターを使っている人は表情差し替えをしない（画像が無いので）
    setFaceSrc(isDefaultFace ? FACE_SRC[face] : avatarUrl);
  }, [face, avatarUrl, isDefaultFace]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, choices]);

  // タイプ演出のループ
  useEffect(() => {
    if (!typing) return;
    const id = setInterval(() => {
      const target = targetRef.current;
      const shownText = stripTags(target);
      if (shownRef.current < shownText.length) {
        // 遅れているほど速く追いつく（詰まっても自然に見せる）
        const behind = shownText.length - shownRef.current;
        shownRef.current += Math.max(2, Math.ceil(behind / 8));
        if (shownRef.current > shownText.length) shownRef.current = shownText.length;
        const shown = shownText.slice(0, shownRef.current);
        setMessages((prev) => {
          const arr = [...prev];
          const last = arr[arr.length - 1];
          if (last?.role === "assistant") arr[arr.length - 1] = { ...last, content: shown };
          return arr;
        });
      } else if (finalRef.current) {
        // 追いつき終わり＆生成も終了
        setTyping(false);
      }
    }, 22);
    return () => clearInterval(id);
  }, [typing]);

  const moveTo = useCallback((next: PlaceKey) => {
    setMoving(true);
    setPanelOpen(true);
    setTimeout(() => setPlace(next), 260);
    setTimeout(() => setMoving(false), 1100);
  }, []);

  // 起動直後の「気分1タップ」→ 押した瞬間に世界が反応する（光・表情・音）。責めない。
  function moodReact(n: number) {
    setHomeMood(n);
    setMoodLine(moodLineFor(n));
    setFace(n <= 4 ? "smile" : n <= 7 ? "neutral" : "anxious");
    playChime(n);
    fetch("/api/emotions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: n }),
    }).catch(() => {});
  }

  async function enter(m: ModeKey, resume = false) {
    setMode(m);
    setPlace(MODES[m].place);
    setView("talk");
    setChoices(null);
    if (!resume) setMessages([]);
    setWalkLanding(false);

    // 開始の一言はテンプレで即表示（AIを待たない＝速い）。
    // 頭を使うのは、ユーザーが最初の返事をした"あと"から。
    const op = MODE_OPENERS[m];
    if (op) {
      setMessages([{ role: "assistant", content: op.line }]);
      setFace("smile");
      pendingOpenerRef.current = { mode: m, line: op.line };
      if (op.emotion) { setEmoPick(null); setWidget("emotion"); }
      if (op.choices) setChoices(op.choices as Choice[]);
      return;
    }
    await talk("", true, m, MODES[m].place);
  }

  // ホームでそのまま話しかけた → 行き先を決めず、自由に会話へ
  async function enterFree(text: string) {
    setMode(null);
    setPlace("peak");
    setView("talk");
    setChoices(null);
    setMessages([{ role: "assistant", content: greetLine() }]);
    await talk(text, false, null, "peak");
  }

  async function talk(textIn: string, greet = false, m: ModeKey | null = mode, p: PlaceKey = place) {
    if (sending) return;
    const body = textIn.trim();
    if (!body && !greet) return;

    setSending(true);
    setChoices(null);
    setWidget(null);
    if (debug) setDebugTrace([]);
    if (!greet) setMessages((prev) => [...prev, { role: "user", content: body }]);

    // 新しい assistant 行を用意して、タイプ演出を開始
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    targetRef.current = "";
    shownRef.current = 0;
    finalRef.current = false;
    setTyping(true);

    // テンプレで出した開始の一言を、最初の返事のときだけ一緒に渡す（AIの文脈＆履歴に載せる）
    let opener: string | undefined;
    if (!greet && pendingOpenerRef.current && pendingOpenerRef.current.mode === m) {
      opener = pendingOpenerRef.current.line;
    }
    pendingOpenerRef.current = null;

    try {
      const r = await fetch("/api/shinga/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body, place: p, mode: m ?? undefined, greet, opener, debug: debugAvailable && debug }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        targetRef.current = `（うまく届かなかった: ${err?.error ?? r.status}）`;
        finalRef.current = true;
        return;
      }
      await readSse(r, (name, data) => {
        if (name === "delta") {
          targetRef.current += data.text;
        } else if (name === "replace") {
          targetRef.current = data.text; // タグを削った最終本文
        } else if (name === "face") {
          setFace(data.face as Face);
        } else if (name === "choices") {
          setChoices(data.choices as Choice[]);
        } else if (name === "emotion") {
          setEmoPick(null);
          setWidget("emotion");
        } else if (name === "breath") {
          setWidget("breath");
        } else if (name === "move") {
          moveTo(data.place as PlaceKey);
          setMode(data.place as ModeKey);
        } else if (name === "hero") {
          const changes = (data.changes as { label: string; from: number; to: number }[]) ?? [];
          if (changes.length) {
            setHeroToast(changes);
            if (heroToastTimer.current) clearTimeout(heroToastTimer.current);
            heroToastTimer.current = setTimeout(() => setHeroToast(null), 5200);
          }
        } else if (name === "debug") {
          setDebugTrace((prev) => [...prev, data]);
        }
      });
    } catch (e: any) {
      targetRef.current = `（うまく届かなかった: ${String(e?.message ?? e)}）`;
    } finally {
      finalRef.current = true;
      setSending(false);
    }
  }

  function pickChoice(c: Choice) {
    setChoices(null);
    if (c.mode) void enter(c.mode, true);
    else void talk(c.label);
  }

  // 感情メーターで選んだ → 記録して、AIに気分を伝える
  function pickEmotion(n: number) {
    setEmoPick(n);
    // 状態記録（1日2回まで。失敗しても会話は進める）
    fetch("/api/emotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: n }),
    }).catch(() => {});
    setWidget(null);
    void talk(`いまの気分は「${emoName(n)}」`);
  }

  // 呼吸トレーニングが終わった → AIに知らせる
  function breathDone() {
    setWidget(null);
    void talk("（呼吸トレーニングが終わった）");
  }

  const hasPanel = here.panel !== "none";
  // パラレルウォークだけ、明るい空の画面にする（暗いと沈むので）
  const bright = view === "talk" && place === "walk";

  return (
    <div
      className={`singa-stage ${moving ? "is-moving" : ""} ${bright ? "is-bright" : ""} ${view === "home" ? "is-home" : ""}`}
      style={{ ["--place-hue" as any]: here.hue }}
    >
      {/* 背景。ホームは全体マップ、各ゾーンはそのゾーン専用の絵に切り替わる */}
      <div className="singa-map" style={{ transform: view === "home" ? "scale(1.02)" : "scale(1.05)" }}>
        <div
          className="singa-map-img"
          style={{
            backgroundImage: `url(${
              view === "home" || reportOpen
                ? "/singa-map.jpg"
                : mode === "breakthrough"
                  ? "/zone-breakthrough.jpg" // 専用の門の絵
                  : here.image
            })`,
          }}
        />
      </div>

      {/* 地図が育つ：取り組んだ日数だけ、光の粒がマップに増える（数字より景色） */}
      {view === "home" && activeDays > 0 && (
        <div className="iw-grow" aria-hidden>
          {Array.from({ length: Math.min(activeDays, 24) }).map((_, i) => (
            <span key={i} className="mote" style={moteStyle(i)} />
          ))}
        </div>
      )}

      {/* 気分タップで世界が反応：穏やかなら朝の光、しんどいなら夜に沈む */}
      {view === "home" && homeMood != null && (
        <>
          <div className="iw-glow" style={{ opacity: Math.max(0, (5 - homeMood) / 4) * 0.5 }} />
          <div className="iw-veil" style={{ opacity: Math.max(0, (homeMood - 5) / 5) * 0.72 }} />
        </>
      )}

      {/* 会話で主人公レベルが動いたときの、そっと出るお知らせ */}
      {heroToast && (
        <div className="hero-toast" onClick={() => { setHeroToast(null); setHeroOpen(true); }}>
          <span className="ht-ico">🦸</span>
          <span className="ht-body">
            {heroToast.map((c, i) => {
              const up = c.to >= c.from;
              return (
                <span key={i} className={`ht-row ${up ? "up" : "down"}`}>
                  {c.label} <b>{up ? "＋" : "−"}{Math.abs(c.to - c.from)}</b>
                </span>
              );
            })}
          </span>
        </div>
      )}

      {heroOpen ? (
        <HeroScreen guideName={guideName} avatarUrl={faceSrc} onBack={() => setHeroOpen(false)} />
      ) : tasksOpen ? (
        <TaskListPanel guideName={guideName} avatarUrl={faceSrc} onBack={() => setTasksOpen(false)} />
      ) : reportOpen ? (
        <ReportScreen guideName={guideName} avatarUrl={faceSrc} onBack={() => setReportOpen(false)} />
      ) : dailyOpen ? (
        <DailyReflection guideName={guideName} avatarUrl={faceSrc} onBack={() => setDailyOpen(false)} />
      ) : view === "home" ? (
        <Home
          guideName={guideName}
          avatarUrl={faceSrc}
          onPick={(m) => void enter(m)}
          onTalk={(t) => void enterFree(t)}
          onReport={() => setReportOpen(true)}
          onDaily={() => setDailyOpen(true)}
          onHero={() => setHeroOpen(true)}
          onTasks={() => setTasksOpen(true)}
          mood={homeMood}
          moodLine={moodLine}
          onMood={moodReact}
          heroStatement={heroStatement}
          onStats={(s) => setActiveDays(s.activeDays)}
          sending={sending}
        />
      ) : walkLanding ? (
        <WalkLanding
          transcript={messages.filter((m) => m.role === "user").map((m) => m.content).join("\n")}
          onDone={() => { setWalkLanding(false); setView("home"); setChoices(null); setMode(null); }}
        />
      ) : (
        <>
          <button className="singa-back" onClick={() => { setView("home"); setChoices(null); }}>
            ← 地図にもどる
          </button>

          <div className="singa-place-name">
            <span className="en">{mode ? MODES[mode].en : here.en}</span>
            <span className="ja">{mode ? MODES[mode].label : here.ja}</span>
          </div>

          {/* 会話（メッセージごとにキヨセリンクの顔アイコンを出す） */}
          <div ref={scrollRef} className="singa-talk">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const showDots = m.role === "assistant" && isLast && typing && !m.content;
              return (
                <div key={i} className={m.role === "user" ? "singa-line is-me" : "singa-line"}>
                  {m.role === "assistant" && (
                    <img
                      className={`singa-face ${isLast && typing ? "is-talking" : ""}`}
                      src={faceSrc}
                      alt={guideName}
                      onError={() => setFaceSrc(avatarUrl)}
                    />
                  )}
                  <div className="singa-line-body">
                  {m.role === "assistant" && <span className="who">{guideName}</span>}
                  <p>
                    {showDots
                      ? <span className="typing-dots"><span /><span /><span /></span>
                      : m.content}
                  </p>
                  </div>
                </div>
              );
            })}

            {/* 選択肢ボタン */}
            {choices && !typing && (
              <div className="singa-choices">
                {choices.map((c, i) => (
                  <button key={i} className="singa-choice" onClick={() => pickChoice(c)}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {/* ピークステート：感情メーター（会話の中に出る） */}
            {widget === "emotion" && !typing && (
              <div className="singa-inline">
                <EmotionMeter value={emoPick} onChange={pickEmotion} />
              </div>
            )}

            {/* ピークステート：誘導音声の呼吸トレーニング */}
            {widget === "breath" && !typing && (
              <div className="singa-inline">
                <BreathGuide onDone={breathDone} />
              </div>
            )}
          </div>

          {/* パラレルウォーク：歩き終えて、理想を今日に落とす */}
          {mode === "walk" && messages.some((m) => m.role === "user") && (
            <button className="walk-land-btn" onClick={() => setWalkLanding(true)}>
              🌱 歩き終わる → 今日に落とす
            </button>
          )}

          {/* 音声入力バー */}
          <VoiceBar onSend={(t) => talk(t)} disabled={sending} />

          {/* その場所のパネル（ゾーンに応じて中身が変わる） */}
          {hasPanel && panelOpen && (
            <div className="singa-panel-wrap">
              <button className="singa-panel-close" onClick={() => setPanelOpen(false)} title="しまう">×</button>
              {here.panel === "peak" && <PeakPanel />}
              {here.panel === "akashic" && <AkashicPanel />}
            </div>
          )}
          {hasPanel && !panelOpen && (
            <button className="singa-panel-open" onClick={() => setPanelOpen(true)}>
              {here.panel === "peak" ? "🌬 呼吸で整える" : here.panel === "akashic" ? "📖 流れを読む・落とし込む" : "ひらく"}
            </button>
          )}
        </>
      )}

      {/* 可視化トグル：URLに ?debug=1 を付けたときだけ（お客さんには出ない・開発用） */}
      {debugAvailable && (
        <>
          <button
            className="singa-debug-toggle"
            onClick={() => setDebug((v) => !v)}
            title="なかを見る（何を読み込みAIに渡したか）"
          >
            {debug ? "🔍ON" : "🔍OFF"}
          </button>
          {debug && debugTrace.length > 0 && <DebugPanel trace={debugTrace} onClear={() => setDebugTrace([])} />}
        </>
      )}
    </div>
  );
}

// ── 可視化パネル：どのタイミングで何を読み込み、AIがどう反応したか ──
function DebugPanel({ trace, onClear }: { trace: any[]; onClear: () => void }) {
  const input = trace.find((t) => t.stage === "input");
  const output = trace.find((t) => t.stage === "output");
  return (
    <div className="dbg">
      <div className="dbg-head">
        <b>🔍 なかを見る</b>
        <button onClick={onClear}>クリア</button>
      </div>
      {input && (
        <>
          <div className="dbg-row"><span className="k">今日</span><span>{input.today}／モード:{String(input.mode)}／place:{input.place}／greet:{String(input.greet)}</span></div>
          <div className="dbg-row"><span className="k">誕生日等</span><span>date:{String(input.settingsBirth?.date)} name:{String(input.settingsBirth?.name)} gender:{String(input.settingsBirth?.gender)}</span></div>

          <div className="dbg-sec">① DBから読んだ履歴（{input.loadedFromDb?.length ?? 0}件）</div>
          {(!input.loadedFromDb || input.loadedFromDb.length === 0)
            ? <div className="dbg-empty">なし（新しいスレッド）</div>
            : input.loadedFromDb.map((m: any, i: number) => (
                <div key={i} className={`dbg-msg ${m.date !== input.today ? "is-old" : ""}`}>
                  <span className="d">{m.date}{m.date !== input.today ? " ⚠別日" : ""}</span>
                  <span className="r">{m.role}</span>
                  <span className="c">{m.content}</span>
                </div>
              ))}

          <div className="dbg-sec">② AIに渡したメッセージ列（{input.sentToAI?.length ?? 0}件）</div>
          {input.sentToAI?.map((m: any, i: number) => (
            <div key={i} className="dbg-msg">
              <span className="r">{m.role}</span>
              <span className="c">{m.content}</span>
            </div>
          ))}

          <details className="dbg-sys">
            <summary>③ システムプロンプト（{input.systemPrompt?.length ?? 0}字）</summary>
            <pre>{input.systemPrompt}</pre>
          </details>
        </>
      )}
      {output && (
        <details className="dbg-sys" open>
          <summary>④ AIの生レスポンス</summary>
          <pre>{output.raw}</pre>
          <div className="dbg-row"><span className="k">抽出</span><span>{JSON.stringify(output.extracted)}</span></div>
        </details>
      )}
    </div>
  );
}

// ── ホーム：キヨセリンクが世界の中で出迎えて、行き先へ案内する ──
// 「ただのシステム」ではなく、入り込める世界にするため、最初に必ず相棒が話す。

function greetLine(): string {
  const h = new Date().getHours();
  const time = h < 5 ? "こんな時間まで起きてたの？" : h < 11 ? "おはよ😊" : h < 18 ? "よっ、来たね😊" : "おつかれ😊";
  return `${time} ここは『インナーワールド』——きみの内側の世界だよ。\n今日はまず、ピークステートから。ぜったい、そこで“整える”のが先だよ😊`;
}

// カタカナ名だけだと「押す前に何が起きるか」の仮説が立たない → 動詞を添える（玉樹式・直感のデザイン）
const VERB: Record<string, string> = {
  peak: "いまを整える",
  walk: "歩きながら未来を決める",
  akashic: "流れを読む",
  breakthrough: "壁をこわす",
  travel: "「どうなる？」で上げる",
};
const DOORS: { key: ModeKey; emoji: string }[] = [
  { key: "peak", emoji: "✨" },
  { key: "walk", emoji: "🚶" },
  { key: "akashic", emoji: "📖" },
];
const DOORS_SUB: { key: ModeKey; emoji: string }[] = [
  { key: "breakthrough", emoji: "🗝" },
  { key: "travel", emoji: "🚀" },
];

// 地図の場所そのものを押せるホットスポット（絵の外のボタン列だけに頼らない）
const HOTSPOTS: { key: ModeKey; x: number; y: number; label: string }[] = [
  { key: "peak", x: 50, y: 40, label: "✨ 整える" },
  { key: "walk", x: 40, y: 66, label: "🚶 歩く" },
  { key: "akashic", x: 82, y: 44, label: "📖 流れ" },
  { key: "breakthrough", x: 15, y: 70, label: "🗝 壁" },
  { key: "travel", x: 68, y: 24, label: "🚀 上へ" },
];

function Home({
  guideName, avatarUrl, onPick, onTalk, onReport, onDaily, onHero, onTasks, mood, moodLine, onMood, heroStatement, onStats, sending,
}: {
  guideName: string;
  avatarUrl: string;
  onPick: (m: ModeKey) => void;
  onTalk: (text: string) => void;
  onReport: () => void;
  onDaily: () => void;
  onHero: () => void;
  onTasks: () => void;
  mood: number | null;
  moodLine: string | null;
  onMood: (n: number) => void;
  heroStatement: string;
  onStats?: (s: { activeDays: number }) => void;
  sending: boolean;
}) {
  return (
    <div className="iw-home">
      {/* 主人公の物語を常設（モーダルに隠さない） */}
      {heroStatement && (
        <button className="iw-hero-banner" onClick={onHero} title="主人公を見る">
          🦸 <span>{heroStatement}</span>
        </button>
      )}

      {/* 地図の場所そのものを押せる（世界観と操作を一致させる） */}
      <div className="iw-hotspots">
        {HOTSPOTS.map((h) => (
          <button key={h.key} className={`iw-spot ${h.key === "peak" ? "is-start" : ""}`}
            style={{ left: `${h.x}%`, top: `${h.y}%` }} onClick={() => onPick(h.key)}>
            <span className="dot" /><span className="lb">{h.label}</span>
          </button>
        ))}
      </div>

      {/* 世界の中に立つキヨセリンク＋吹き出し（気分を押すと反応が変わる） */}
      <div className="iw-scene">
        <div className="iw-bubble">
          <span className="who">{guideName}</span>
          <p>{moodLine ?? greetLine()}</p>
        </div>
        <Image
          className="iw-figure"
          src={avatarUrl}
          alt={guideName}
          width={420}
          height={640}
          priority
          unoptimized={avatarUrl.startsWith("http")}
        />
      </div>

      {/* まず1タップ：いまの気分（押した瞬間に世界が反応する＝直感の入口） */}
      <div className="iw-mood">
        <div className="iw-mood-q">{mood == null ? "まず、いまの気分をタップ" : "気分、変わったら押してね"}</div>
        <EmotionMeter value={mood} onChange={onMood} />
      </div>

      {/* 話しかける（ここで即・打てる／話せる） */}
      <VoiceBar onSend={onTalk} disabled={sending} placeholder={`${guideName}に話しかける…`} />

      {/* ゲームHUD：🔮イメージ力／🔨現実化力＋今日のナゾ */}
      <InnerHud guideName={guideName} onStats={onStats} />

      {/* または、行き先を選ぶ */}
      <div className="iw-doors">
        {DOORS.map((d) => {
          const m = MODES[d.key];
          return (
            <button key={d.key} className={`iw-door ${d.key === "peak" ? "is-start" : ""}`} onClick={() => onPick(d.key)}>
              {d.key === "peak" && <span className="tag">まずここから</span>}
              <span className="emoji">{d.emoji}</span>
              <span className="ja">{m.label}</span>
              <span className="verb">{VERB[d.key]}</span>
            </button>
          );
        })}
        {DOORS_SUB.map((d) => {
          const m = MODES[d.key];
          return (
            <button key={d.key} className="iw-door is-sub" onClick={() => onPick(d.key)}>
              <span className="emoji">{d.emoji}</span>
              <span className="ja">{m.label}</span>
              <span className="verb">{VERB[d.key]}</span>
            </button>
          );
        })}
      </div>

      {/* 主人公（レベル）＋ふりかえり */}
      <div className="iw-reflect-row">
        <button className="iw-report is-hero" onClick={onHero}>🦸 主人公（レベル）</button>
        <button className="iw-report is-tasks" onClick={onTasks}>📋 タスクリスト</button>
        <button className="iw-report" onClick={onDaily}>🌙 1日の振り返り</button>
        <button className="iw-report" onClick={onReport}>🌱 この頃のわたし</button>
      </div>
    </div>
  );
}
