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
import { ReportScreen } from "./ReportScreen";
import { DailyReflection } from "./DailyReflection";
import { HeroScreen } from "./HeroScreen";
import { TaskListPanel } from "./TaskListPanel";
import { InnerHud } from "./InnerHud";
import { FutureLetter, type Letter } from "./FutureLetter";
import { QuestCard, type Card } from "./QuestCard";

type Face = "neutral" | "smile" | "anxious";
type Choice = { label: string; mode?: ModeKey };
type Message = { role: "user" | "assistant"; content: string };

// タグが本文に混じっても画面に出さない（最初のタグ開始で切る）
function stripTags(t: string): string {
  const i = t.search(/<(face|move|choices|quest_to_add|hero_delta|wall)\b/);
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
  anxious: "/kiyose.png", // ※ kiyose_anxious.png が未提供のため neutral で代用（画像切れ防止）
};

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
  const [wallStage, setWallStage] = useState(1); // ウォールブレイク：扉の開き具合(1=閉〜5=全開)
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
  const [heroToast, setHeroToast] = useState<{ label: string; from: number; to: number }[] | null>(null);
  const heroToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [letter, setLetter] = useState<Letter | null>(null);   // 未来からの手紙
  const [card, setCard] = useState<Card | null>(null);         // 未来からのクエストカード（3日連続で届く）
  const [showCard, setShowCard] = useState(false);
  const [letterDramatic, setLetterDramatic] = useState(true);  // 初回は派手に降臨・読み返しは静かに
  // ゾーン突入演出（扉タップ→背景がフュンとズームイン→タイトル→会話へ。タップでスキップ）
  const [entering, setEntering] = useState<ModeKey | null>(null);
  const enterFxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function skipZoneIntro() {
    if (enterFxTimer.current) clearTimeout(enterFxTimer.current);
    setEntering(null);
  }
  // 起動フロー：① 気分 → ② パフォーマンス → ③ 手紙 → ④ 世界。1日1回・続きから再開。
  // boot = 判定中（サーバに今日チェック済みか確認してから出す＝端末をまたいで二重チェックしない）
  const [phase, setPhase] = useState<"boot" | "mood" | "perf" | "letter" | "done">("boot");
  const moodRef = useRef<number | null>(null);

  function todayStrLocal(): string {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }
  // 今日、もう状態チェック（気分）を済ませたか。済んでいれば感情の再チェックはしない。
  function checkedTodayLocal(): boolean {
    try { return !!localStorage.getItem(`iw-mood-${todayStrLocal()}`); } catch { return false; }
  }
  async function loadLetter(mood?: number | null, perf?: number | null) {
    try {
      const p = new URLSearchParams();
      if (mood != null) p.set("mood", String(mood));
      if (perf != null) p.set("perf", String(perf));
      const qs = p.toString();
      const d = await (await fetch(`/api/link-letter${qs ? `?${qs}` : ""}`)).json();
      if (d?.letter?.body) setLetter(d.letter);
    } catch { /* 手紙が取れなくても進める */ }
  }

  useEffect(() => {
    const today = todayStrLocal();
    let moodV: string | null = null, perfV: string | null = null, letterSeen = false;
    try {
      moodV = localStorage.getItem(`iw-mood-${today}`);
      perfV = localStorage.getItem(`iw-perf-${today}`);
      letterSeen = !!localStorage.getItem(`iw-letterseen-${today}`);
    } catch { /* ignore */ }
    if (moodV != null) moodRef.current = Number(moodV);

    // この端末で全部済んでいれば即・世界へ（速い・サーバ確認不要）
    if (moodV != null && perfV != null && letterSeen) { setPhase("done"); return; }

    // それ以外は「別の端末で今日もうチェックしたか」をサーバに確認してから決める
    // （チェックは1日1回。スマホで済ませたらPCでは出さない）
    (async () => {
      try {
        const d = await fetch("/api/emotions").then((r) => r.json());
        if (d && typeof d.todayCount === "number" && d.todayCount > 0) {
          try {
            localStorage.setItem(`iw-mood-${today}`, moodV ?? "3");
            localStorage.setItem(`iw-perf-${today}`, perfV ?? "6");
            localStorage.setItem(`iw-letterseen-${today}`, "1");
          } catch { /* ignore */ }
          setPhase("done");
          return;
        }
      } catch { /* サーバに聞けなければ、この端末のローカル判定で進める */ }
      if (moodV == null) { setPhase("mood"); return; }
      if (perfV == null) { setPhase("perf"); return; }
      if (!letterSeen) { setPhase("letter"); void loadLetter(Number(moodV), Number(perfV)); return; }
      setPhase("done");
    })();
  }, []);

  // 未来からのクエストカード（3日連続で使うと届く）。ホームで「届いてる」演出を出すため先読み。
  useEffect(() => {
    fetch("/api/quest-card").then((r) => r.json()).then((d) => {
      if (d?.card) setCard(d.card);
    }).catch(() => {});
  }, []);

  // ① 気分 → ② パフォーマンスへ（保存はパフォーマンスまで答えてから1レコードにまとめる）
  function onIntroMood(n: number) {
    moodRef.current = n;
    setFace(n <= 4 ? "smile" : n <= 7 ? "neutral" : "anxious");
    try { localStorage.setItem(`iw-mood-${todayStrLocal()}`, String(n)); } catch { /* ignore */ }
    setPhase("perf");
  }
  // ② パフォーマンス → ③ その状態を踏まえた手紙へ
  //   ここで「気分(level)＋動けそう度(energy)」を1レコードに保存＝週次レポートの土台（推測でなく実測）
  function onIntroPerf(n: number) {
    try { localStorage.setItem(`iw-perf-${todayStrLocal()}`, String(n)); } catch { /* ignore */ }
    const mood = moodRef.current;
    if (typeof mood === "number") {
      fetch("/api/emotions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: mood, energy: n }),
      }).catch(() => {});
    }
    void loadLetter(mood, n);
    setPhase("letter");
  }
  // ③ 手紙を読み終えて世界へ
  function enterWorldFromLetter() {
    try { localStorage.setItem(`iw-letterseen-${todayStrLocal()}`, "1"); } catch { /* ignore */ }
    setPhase("done");
  }
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
  // 気分メーター・呼吸ガイドは1セッション1回だけ（一度終えたら二度と出さない）
  const emotionDoneRef = useRef(false);
  const breathDoneRef = useRef(false);

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

  // ウォールブレイクに入ったら、扉の5段階を先読みしておく（開くとき一瞬のチラつき防止）
  useEffect(() => {
    if (mode !== "breakthrough") return;
    for (let i = 1; i <= 5; i++) { const im = new window.Image(); im.src = `/wall-${i}.png`; }
  }, [mode]);

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

  async function enter(m: ModeKey, resume = false) {
    setMode(m);
    setPlace(MODES[m].place);
    setView("talk");
    setChoices(null);
    setWidget(null);          // 前のゾーンの呼吸ガイド・感情メーターを持ち込まない
    setEmoPick(null);
    // 新規で入るときだけ、ゲーム開始風のゾーン突入演出（続き再開では出さない）
    if (!resume) {
      setEntering(m);
      if (enterFxTimer.current) clearTimeout(enterFxTimer.current);
      enterFxTimer.current = setTimeout(() => setEntering(null), 2600);
    }
    emotionDoneRef.current = false; // 新しいセッション＝気分メーター・呼吸は一度だけ許可
    breathDoneRef.current = false;
    if (m === "breakthrough" && !resume) setWallStage(1); // 扉は固く閉じた状態から始める
    if (!resume) setMessages([]);

    // 開始の一言はテンプレで即表示（AIを待たない＝速い）。
    // 頭を使うのは、ユーザーが最初の返事をした"あと"から。
    const op = MODE_OPENERS[m];
    if (op) {
      // ピークステート（呼吸）は何度やってもOK。今日もう状態チェック済みなら、
      // 感情の再チェックはせず、そのまま呼吸から整える（＝各ステップの画像が出るところ）。
      if (m === "peak" && checkedTodayLocal()) {
        setMessages([{ role: "assistant", content: "オッケー、状態はさっき教えてもらったね😊 じゃあ呼吸から整えていこう。ピークステートは何回やってもいいからね。" }]);
        setFace("smile");
        setWidget("breath");
        return;
      }
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
    setWidget(null); setEmoPick(null);   // パネル・メーターの持ち込み防止
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
          // 一度でも気分を答えていたら、二度と出さない（被り防止）
          if (!emotionDoneRef.current) { setEmoPick(null); setWidget("emotion"); }
        } else if (name === "breath") {
          // 一度呼吸を終えていたら、二度と出さない（被り防止）
          if (!breathDoneRef.current) setWidget("breath");
        } else if (name === "wall") {
          // ウォールブレイク：壁が解けた度合いに応じて扉が開く（1〜5）
          const s = Number(data?.stage);
          if (Number.isFinite(s)) setWallStage(Math.max(1, Math.min(5, s)));
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
    emotionDoneRef.current = true; // 以後この気分メーターは出さない
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

  // パラレルウォークを終える → 歩いた記録を残して地図へ
  function endWalk() {
    const transcript = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n").trim();
    if (transcript) {
      fetch("/api/walk-logs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: transcript.slice(0, 2000) }),
      }).catch(() => {});
    }
    setView("home"); setChoices(null); setMode(null); setWidget(null); setEmoPick(null);
  }

  // 呼吸トレーニングが終わった → AIに知らせる
  function breathDone() {
    breathDoneRef.current = true; // 以後この呼吸ガイドは出さない
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
                  ? `/wall-${wallStage}.png` // 壁が解けるほど扉が開く（1=閉〜5=全開）
                  : here.image
            })`,
            transition: "background-image .6s ease-in-out",
          }}
        />
      </div>

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

      {view === "home" && phase === "boot" ? (
        /* 判定中：世界の背景だけ見せて、チェックを出すか確認する（一瞬） */
        <div className="iw-boot-screen" />
      ) : view === "home" && phase === "mood" ? (
        /* ① 今の気分（穏やか↔しんどい） */
        <MoodCheck guideName={guideName} avatarUrl={faceSrc} onPick={onIntroMood} />
      ) : view === "home" && phase === "perf" ? (
        /* ② 今日のパフォーマンス（動けなさ↔動けそう） */
        <PerformanceCheck guideName={guideName} avatarUrl={faceSrc} onPick={onIntroPerf} />
      ) : view === "home" && phase === "letter" && letter ? (
        /* ② 今の状態を踏まえた、未来の自分からの手紙 */
        <FutureLetter
          letter={letter}
          onClose={enterWorldFromLetter}
          onGoIdeal={() => { enterWorldFromLetter(); setHeroOpen(true); }}
          onGoPeak={() => { enterWorldFromLetter(); void enter("peak"); }}
          onGoSetup={() => { try { window.location.href = "/settings"; } catch { /* ignore */ } }}
          dramatic={letterDramatic}
        />
      ) : showCard && card ? (
        /* 未来からのクエストカード */
        <QuestCard
          card={card}
          onClose={() => setShowCard(false)}
          onDone={() => { setCard((c) => (c ? { ...c, done: true } : c)); setShowCard(false); }}
        />
      ) : heroOpen ? (
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
          onLetter={letter ? () => { setLetterDramatic(false); setPhase("letter"); } : undefined}
          onCard={card && !card.done ? () => setShowCard(true) : undefined}
          sending={sending}
        />
      ) : (
        <>
          <button className="singa-back" onClick={() => { setView("home"); setChoices(null); setWidget(null); setEmoPick(null); skipZoneIntro(); }}>
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

          {/* パラレルウォーク：1対1で完結。終わるボタンだけ出す */}
          {mode === "walk" && (
            <button className="walk-end-btn" onClick={endWalk}>🌱 終わる</button>
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

      {/* ゾーン突入演出：背景がフュンとズームイン→タイトル（ゲームのチャプター開始風・タップでスキップ） */}
      {entering && (
        <div className="zone-intro" onClick={skipZoneIntro} role="button" aria-label="スキップ">
          <div
            className="zi-bg"
            style={{ backgroundImage: `url(${entering === "breakthrough" ? "/wall-1.png" : PLACES[MODES[entering].place].image})` }}
          />
          <div className="zi-veil" />
          <div className="zi-title">
            <span className="zi-en">{MODES[entering].en}</span>
            <span className="zi-ja">{MODES[entering].label}</span>
            <span className="zi-line" />
          </div>
          <span className="zi-skip">タップでスキップ</span>
        </div>
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

// 1日の振り返りは、この時刻以降だけ出す（朝に振り返っても意味がないので）
const REFLECT_FROM_HOUR = 18;

function greetLine(): string {
  const h = new Date().getHours();
  const time = h < 5 ? "こんな時間まで起きてたの？" : h < 11 ? "おはよ😊" : h < 18 ? "よっ、来たね😊" : "おつかれ😊";
  return `${time} ここは『インナーワールド』——きみの内側の世界だよ。\n今日はまず、ピークステートから。ぜったい、そこで“整える”のが先だよ😊`;
}

const DOORS: { key: ModeKey; emoji: string }[] = [
  { key: "peak", emoji: "✨" },
  { key: "walk", emoji: "🚶" },
  { key: "akashic", emoji: "📖" },
];
const DOORS_SUB: { key: ModeKey; emoji: string }[] = [
  { key: "breakthrough", emoji: "🗝" },
  { key: "travel", emoji: "🚀" },
];

// パフォーマンス（今日どれくらい動けそうか）の色：低=青グレー → 高=ゴールド
function perfColor(n: number): string {
  const t = Math.max(0, Math.min(1, (n - 1) / 9));
  const a = [96, 110, 140], b = [232, 193, 90];
  const l = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${l(0)},${l(1)},${l(2)})`;
}

// ② 今日のパフォーマンス（動けそう度）を10段階でチェック。気分とは別軸。
function PerformanceCheck({ guideName, avatarUrl, onPick }: { guideName: string; avatarUrl: string; onPick: (n: number) => void }) {
  return (
    <div className="iw-moodscreen">
      <Image className="iw-ms-figure" src={avatarUrl} alt={guideName} width={220} height={330} priority unoptimized={avatarUrl.startsWith("http")} />
      <div className="iw-ms-bubble"><span className="who">{guideName}</span><p>じゃあ、今日はどれくらい"動けそう"？ しんどくても、前に進めそうならそれでいいよ。</p></div>
      <div className="iw-ms-meter">
        <div className="emeter">
          <div className="emeter-head"><span className="emeter-title">今日のパフォーマンス</span></div>
          <div className="emeter-bar">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} className="emeter-seg" style={{ background: perfColor(n) }}
                onClick={() => onPick(n)} aria-label={`${n}`}>
                <span className="num">{n}</span>
              </button>
            ))}
          </div>
          <div className="emeter-ends"><span>動けない</span><span>ふつう</span><span>バリバリ動ける</span></div>
        </div>
      </div>
    </div>
  );
}

// 起動して最初：今の状態を10段階でチェックするだけの画面（中央寄せ・最小）
function MoodCheck({ guideName, avatarUrl, onPick }: { guideName: string; avatarUrl: string; onPick: (n: number) => void }) {
  return (
    <div className="iw-moodscreen">
      <Image className="iw-ms-figure" src={avatarUrl} alt={guideName} width={220} height={330} priority unoptimized={avatarUrl.startsWith("http")} />
      <div className="iw-ms-bubble"><span className="who">{guideName}</span><p>まず、いまの状態を教えて。近いところをタップしてね。</p></div>
      <div className="iw-ms-meter">
        <EmotionMeter value={null} onChange={onPick} title="いま、どんな状態？" />
      </div>
    </div>
  );
}

function Home({
  guideName, avatarUrl, onPick, onTalk, onReport, onDaily, onHero, onTasks, onLetter, onCard, sending,
}: {
  guideName: string;
  avatarUrl: string;
  onPick: (m: ModeKey) => void;
  onTalk: (text: string) => void;
  onReport: () => void;
  onDaily: () => void;
  onHero: () => void;
  onTasks: () => void;
  onLetter?: () => void;
  onCard?: () => void;
  sending: boolean;
}) {
  return (
    <div className="iw-home">
      {/* 未来からのクエストが届いた（3日連続で使うと届く・目立たせる） */}
      {onCard && (
        <button className="iw-card-arrived" onClick={onCard}>
          <span className="ico">🎴</span>
          <span className="tx"><b>未来からのクエストが届いてる</b><small>タップして受け取る</small></span>
          <span className="arr">→</span>
        </button>
      )}

      {/* 手紙を読み返す（小さく・じゃまにならない） */}
      {onLetter && (
        <button className="iw-letter-reopen" onClick={onLetter}>📜 未来からの手紙を読み返す</button>
      )}

      {/* 世界の中に立つキヨセリンク＋吹き出し（すべて中央寄せ） */}
      <div className="iw-scene is-centered">
        <Image
          className="iw-figure"
          src={avatarUrl}
          alt={guideName}
          width={280}
          height={420}
          priority
          unoptimized={avatarUrl.startsWith("http")}
        />
        <div className="iw-bubble is-centered">
          <span className="who">{guideName}</span>
          <p>{greetLine()}</p>
        </div>
      </div>

      {/* ゲームHUD：空想↔現実のバランス＋ハイヤークエスト */}
      <InnerHud guideName={guideName} />

      {/* または、行き先を選ぶ */}
      <div className="iw-doors">
        {DOORS.map((d) => {
          const m = MODES[d.key];
          return (
            <button key={d.key} className={`iw-door ${d.key === "peak" ? "is-start" : ""}`} onClick={() => onPick(d.key)}>
              {d.key === "peak" && <span className="tag">まずここから</span>}
              <span className="emoji">{d.emoji}</span>
              <span className="ja">{m.label}</span>
            </button>
          );
        })}
        {DOORS_SUB.map((d) => {
          const m = MODES[d.key];
          return (
            <button key={d.key} className="iw-door is-sub" onClick={() => onPick(d.key)}>
              <span className="emoji">{d.emoji}</span>
              <span className="ja">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* 主人公（レベル）＋ふりかえり */}
      <div className="iw-reflect-row">
        <button className="iw-report is-hero" onClick={onHero}>🦸 主人公（レベル）</button>
        <button className="iw-report is-tasks" onClick={onTasks}>📋 タスクリスト</button>
        {/* 1日の振り返りは夜だけ。夜になったらプッシュ通知で「開いたよ」と知らせる（それまでは鍵） */}
        {new Date().getHours() >= REFLECT_FROM_HOUR
          ? <button className="iw-report is-night" onClick={onDaily}>🌙 1日の振り返り</button>
          : <button className="iw-report is-locked" disabled title={`夜（${REFLECT_FROM_HOUR}時）に通知でお知らせして開くよ`}>🔒 夜に通知で開く</button>}
        <button className="iw-report" onClick={onReport}>🌱 この頃のわたし</button>
      </div>
    </div>
  );
}
