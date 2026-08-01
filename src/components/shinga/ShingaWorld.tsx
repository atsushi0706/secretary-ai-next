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
import { PartsGate, PartsIntro, PartsProgress, GuardianReveal, ChildReveal, type GuardianEvent } from "./PartsTemple";
import { BroadcastStudio } from "./BroadcastStudio";
import { ManualScreen } from "./ManualScreen";
import type { PartColor, PartsStep } from "@/lib/parts";

type Face = "neutral" | "smile" | "anxious";
type Choice = { label: string; mode?: ModeKey };
type Message = { role: "user" | "assistant"; content: string };

// タグが本文に混じっても画面に出さない（最初のタグ開始で切る）
// ※ ここに書き忘れたタグは、生成中そのまま画面に出てしまう。新しいタグを足したら必ずここにも足す。
function stripTags(t: string): string {
  const i = t.search(/<(face|move|choices|quest_to_add|hero_delta|wall|breath|emotion|guardian|parts_step|travel|walk)\b/);
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

// パラレルウォークで歩いた地点。背景の絵（/walk-1..10.jpg）と対応している。
// 「理想がどれだけ具体的に見えているか」で進む。最後は理想郷。
const WALK_PLACE: string[] = [
  "門のほとり",       // 1
  "谷が見えてくる",   // 2
  "花の道",           // 3
  "せせらぎのそば",   // 4
  "ひらけた谷",       // 5
  "庭園",             // 6
  "黄金の橋",         // 7
  "都が見えた",       // 8
  "大伽藍のふもと",   // 9
  "理想郷",           // 10
];

// パラレルトラベルの高度。背景の絵（/travel-1..10.jpg）と対応している。
// 数字ではなく「いまどこまで視点が上がったか」を言葉で見せる。
const TRAVEL_ALT: string[] = [
  "目の前のこと",       // 1 神殿のふもと
  "暮らしのなか",       // 2 空に浮かぶ島
  "ありたい自分",       // 3 島々が見えてくる
  "人生で大事なこと",   // 4 空の高み
  "身近な人へ",         // 5 惑星が見える
  "届けたい人へ",       // 6 惑星の全景
  "世の中へ",           // 7 星の海へ
  "生き方そのもの",     // 8 銀河
  "存在そのもの",       // 9 銀河の群れ
  "すべてがつながる",   // 10 宇宙の網目
];

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
  const [travelStage, setTravelStage] = useState(1); // パラレルトラベル：高度(1=目の前 〜 10=すべてがつながる)
  const [walkStage, setWalkStage] = useState(1);     // パラレルウォーク：どこまで歩いたか(1=門 〜 10=理想郷)
  // 内なる子の神殿：入口(gate)で守り手を選ぶ → ワーク中は色と段階を持つ
  const [partsGate, setPartsGate] = useState(false);
  // 守り手を選んだ直後、会話の前に「幻獣を見せてしくみを渡す」導入画面を挟む
  const [partsIntro, setPartsIntro] = useState<PartColor | null>(null);
  const [partColor, setPartColor] = useState<PartColor | null>(null);
  // 選んだ直後にすぐ talk() へ渡す必要があるので、state と同時に ref にも入れる
  const partColorRef = useRef<PartColor | null>(null);
  const [partsStep, setPartsStep] = useState<PartsStep>(1);
  const [guardianEv, setGuardianEv] = useState<GuardianEvent | null>(null);
  // 段階4で一度だけ、「守り手はこの子を守っていた」を絵で見せる
  const [childReveal, setChildReveal] = useState<PartColor | null>(null);
  const childShownRef = useRef(false);
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
  const [castOpen, setCastOpen] = useState(false);   // 発信スタジオ
  const [manualOpen, setManualOpen] = useState(false); // 自分の取扱説明書
  // ワークを終えると、その1回ぶんが発信の素材になる（ここで知らせて、そのまま投稿へ行ける）
  const [materialToast, setMaterialToast] = useState<{ id?: number; title: string } | null>(null);
  const savingWorkRef = useRef(false);
  const [heroToast, setHeroToast] = useState<{ label: string; from: number; to: number }[] | null>(null);
  const heroToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [letter, setLetter] = useState<Letter | null>(null);   // 未来からの手紙
  const [card, setCard] = useState<Card | null>(null);         // 未来からのクエストカード（3日連続で届く）
  const [showCard, setShowCard] = useState(false);
  const [isAdventurer, setIsAdventurer] = useState(false); // 100%到達＝称号バッジを付ける
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

  // 未来からのクエストカード（毎日1枚）。開いた時点でその日の分が用意されるので、
  // 朝の通知を受け取れていなくても、アプリを開けば必ず届く。
  useEffect(() => {
    fetch("/api/quest-card").then((r) => r.json()).then((d) => {
      if (d?.card) setCard(d.card);
      else if (d?.needsMigration) console.warn("[quest-card] テーブル未作成のためカードを配れません");
    }).catch(() => {});
    // 称号（100%到達）の判定
    fetch("/api/inner-hud").then((r) => r.json()).then((d) => {
      if (d?.level && d.level.level >= d.level.max) setIsAdventurer(true);
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

  // リアルバースの「休憩する」から来たとき（?rest=1）は、
  // 何も操作しなくても呼吸ガイドまで自動で進む（目を瞑るだけで整えられるように）
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("rest") !== "1") return;
    } catch { return; }
    setPhase("done");
    setView("talk");
    setMode("peak");
    setPlace("peak");
    setMessages([{ role: "assistant", content: "おつかれ😊 よく戦ったね。\nこのまま目を瞑って、呼吸だけ合わせていこう。" }]);
    setFace("smile");
    const t = setTimeout(() => setWidget("breath"), 1200); // 少し間を置いてから呼吸へ
    return () => clearTimeout(t);
  }, []);

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
    for (let i = 1; i <= 10; i++) { const im = new window.Image(); im.src = `/travel-${i}.jpg`; }
    for (let i = 1; i <= 10; i++) { const im = new window.Image(); im.src = `/walk-${i}.jpg`; }
  }, [mode]);

  // タイプ演出のループ
  useEffect(() => {
    if (!typing) return;
    const id = setInterval(() => {
      const target = targetRef.current;
      const shownText = stripTags(target);
      // 表示ずみが本文より長い＝サーバから短い「タグを削った本文」が届いた直後。
      // ここで縮めないと、タグ入りの古い本文が画面に残り続ける。
      if (shownRef.current > shownText.length) {
        shownRef.current = shownText.length;
        setMessages((prev) => {
          const arr = [...prev];
          const last = arr[arr.length - 1];
          if (last?.role === "assistant") arr[arr.length - 1] = { ...last, content: shownText };
          return arr;
        });
        return;
      }
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

  /**
   * ワークを終える（地図に戻る／別のワークへ移る）ときに、その1回ぶんを素材として残す。
   * 発信スタジオはここで貯まったものだけを使う（会話を後からまとめて漁らない）。
   */
  const finishWork = useCallback(async (m: ModeKey | null, msgs: Message[]) => {
    if (!m || savingWorkRef.current) return;
    const mine = msgs.filter((x) => x.role === "user" && x.content.trim());
    if (mine.length < 2) return;            // ほとんど話していない＝素材にしない
    savingWorkRef.current = true;
    try {
      const r = await fetch("/api/work-session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: m, messages: msgs }),
      });
      const d = await r.json();
      if (d?.session?.title) setMaterialToast({ id: d.session.id, title: d.session.title });
    } catch { /* 残せなくてもワークは終わっている */ }
    finally { savingWorkRef.current = false; }
  }, []);

  const moveTo = useCallback((next: PlaceKey) => {
    setMoving(true);
    setPanelOpen(true);
    setTimeout(() => setPlace(next), 260);
    setTimeout(() => setMoving(false), 1100);
  }, []);

  async function enter(m: ModeKey, resume = false) {
    // 別のワークへ移るときも、いま終えたぶんを素材として残しておく
    if (!resume && mode && mode !== m) void finishWork(mode, messages);
    // 内なる子の神殿は、いきなり会話に入らない。まず守り手を選ぶ盤面を出す。
    if (m === "parts" && !resume) {
      setMode("parts");
      setPlace(MODES.parts.place);
      setView("talk");
      setChoices(null); setWidget(null); setEmoPick(null);
      setMessages([]);
      partColorRef.current = null;
      childShownRef.current = false;
      setPartsIntro(null);
      setPartColor(null);
      setPartsStep(1);
      setPartsGate(true);
      return;
    }
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
    if (m === "travel" && !resume) setTravelStage(1);     // 旅は「目の前の出来事」から始まる
    if (m === "walk" && !resume) setWalkStage(1);         // 歩きは門のほとりから始まる
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
        body: JSON.stringify({
          text: body, place: p, mode: m ?? undefined, greet, opener,
          partColor: m === "parts" ? partColorRef.current ?? undefined : undefined,
          debug: debugAvailable && debug,
        }),
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
        } else if (name === "walk") {
          // パラレルウォーク：理想がはっきりするほど、景色が開けていく
          const n = Number(data?.stage);
          if (Number.isFinite(n)) setWalkStage(Math.max(1, Math.min(10, n)));
        } else if (name === "travel") {
          // パラレルトラベル：話が抽象へ上がるほど、背景が引いていく（1〜10）
          const n = Number(data?.stage);
          if (Number.isFinite(n)) setTravelStage(Math.max(1, Math.min(10, n)));
        } else if (name === "parts_step") {
          // 内なる子の神殿：段階が進むと、前に出る姿が守り手→内なる子へ変わる
          const s = Number(data?.step);
          if (Number.isFinite(s)) setPartsStep(Math.max(1, Math.min(8, s)) as PartsStep);
        } else if (name === "guardian") {
          // 守り手が解き放たれた。進化演出を出す（色が未確定だったならここで確定）
          const ev = data as GuardianEvent;
          partColorRef.current = ev.color;
          setPartColor(ev.color);
          setPartsStep(8);
          setGuardianEv(ev);
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

  // 背景の絵。ここ1か所で決める（ホーム／ウォールブレイクの扉／トラベルの高度／各ゾーン）
  const bgUrl =
    view === "home" || reportOpen ? "/singa-map.jpg"
    : mode === "breakthrough" ? `/wall-${wallStage}.png`
    : mode === "travel" ? `/travel-${travelStage}.jpg`
    : mode === "walk" ? `/walk-${walkStage}.jpg`
    : here.image;
  // 直前の絵を覚えておき、上に新しい絵をふわっと重ねて切り替える
  const [prevBg, setPrevBg] = useState<string | null>(null);
  const bgRef = useRef(bgUrl);
  useEffect(() => {
    if (bgRef.current === bgUrl) return;
    setPrevBg(bgRef.current);
    bgRef.current = bgUrl;
    const t = setTimeout(() => setPrevBg(null), 1400);
    return () => clearTimeout(t);
  }, [bgUrl]);

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
            backgroundImage: `url(${bgUrl})`,
          }}
        />
        {/* 前の風景。新しい風景が上にふわっと重なるので、切り替わりが滑らかになる
            （background-image は CSS のトランジションが効かないため、2枚重ねで実現する） */}
        {prevBg && prevBg !== bgUrl && (
          <div key={prevBg} className="singa-map-img is-prev" style={{ backgroundImage: `url(${prevBg})` }} />
        )}
      </div>

      {/* ワークが終わって、発信の素材が1件たまった */}
      {materialToast && (
        <div className="material-toast">
          <div className="mt-body">
            <span className="mt-kicker">📣 発信の素材になったよ</span>
            <span className="mt-title">{materialToast.title}</span>
          </div>
          <button className="mt-go" onClick={() => { setMaterialToast(null); setCastOpen(true); }}>投稿にする</button>
          <button className="mt-close" onClick={() => setMaterialToast(null)}>あとで</button>
        </div>
      )}

      {/* 内なる子に出会った瞬間：守り手との前後関係を絵で見せる */}
      {childReveal && <ChildReveal color={childReveal} onClose={() => setChildReveal(null)} />}

      {/* 守り手が解き放たれた瞬間：ガーディアンへの進化演出 */}
      {guardianEv && <GuardianReveal ev={guardianEv} onClose={() => setGuardianEv(null)} />}

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
      ) : view === "home" && phase === "letter" && !letter ? (
        /* 手紙が届くまでの待ち時間（朝いち）：未来から手紙が飛んでくる演出 */
        <LetterIncoming />
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
      ) : castOpen ? (
        <BroadcastStudio guideName={guideName} onBack={() => setCastOpen(false)} />
      ) : manualOpen ? (
        <ManualScreen guideName={guideName} onBack={() => setManualOpen(false)} />
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
          onBalance={() => void enter("balance")}
          onCast={() => setCastOpen(true)}
          onManual={() => setManualOpen(true)}
          isAdventurer={isAdventurer}
          sending={sending}
        />
      ) : (
        <>
          <button className="singa-back" onClick={() => { void finishWork(mode, messages); setView("home"); setChoices(null); setWidget(null); setEmoPick(null); setPartsGate(false); setPartsIntro(null); skipZoneIntro(); }}>
            ← 地図にもどる
          </button>

          <div className="singa-place-name">
            <span className="en">{mode ? MODES[mode].en : here.en}</span>
            <span className="ja">{mode ? MODES[mode].label : here.ja}</span>
          </div>

          {/* 内なる子の神殿：まず守り手を選ぶ盤面（選んだらワークの会話が始まる） */}
          {mode === "parts" && partsGate && (
            <PartsGate onStart={(c) => {
              partColorRef.current = c;
              setPartColor(c);
              setPartsStep(1);
              setPartsGate(false);
              // 守り手が決まっているときは、まず幻獣を見せてから会話に入る
              if (c) setPartsIntro(c);
              else void enter("parts", true);
            }} />
          )}

          {/* 導入：幻獣を大きく見せて「その感情はきみを守るために出ている」を渡す */}
          {mode === "parts" && partsIntro && (
            <PartsIntro color={partsIntro} onStart={() => { setPartsIntro(null); void enter("parts", true); }} />
          )}

          {/* ワーク中の進行帯：守り手→内なる子→才能 の関係を常に見せておく */}
          {mode === "parts" && !partsGate && !partsIntro && <PartsProgress color={partColor} step={partsStep} />}

          {/* パラレルウォーク：いまどこまで歩いたか（背景の風景と対応） */}
          {mode === "walk" && (
            <div className="travel-alt is-walk">
              <span className="ta-label">🚶 歩いた道のり</span>
              <span className="ta-track">
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} className={`ta-seg ${i < walkStage ? "on" : ""} ${i === walkStage - 1 ? "now" : ""}`} />
                ))}
              </span>
              <span className="ta-name">{WALK_PLACE[walkStage - 1]}</span>
            </div>
          )}

          {/* パラレルトラベル：いまどこまで視点が上がったか（背景の風景と対応） */}
          {mode === "travel" && (
            <div className="travel-alt">
              <span className="ta-label">▲ いまの高さ</span>
              <span className="ta-track">
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} className={`ta-seg ${i < travelStage ? "on" : ""} ${i === travelStage - 1 ? "now" : ""}`} />
                ))}
              </span>
              <span className="ta-name">{TRAVEL_ALT[travelStage - 1]}</span>
            </div>
          )}

          {/* 会話（メッセージごとにキヨセリンクの顔アイコンを出す） */}
          <div ref={scrollRef} className="singa-talk" style={partsIntro ? { display: "none" } : undefined}>
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
            style={{ backgroundImage: `url(${entering === "breakthrough" ? "/wall-1.png" : entering === "travel" ? "/travel-1.jpg" : entering === "walk" ? "/walk-1.jpg" : PLACES[MODES[entering].place].image})` }}
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

/**
 * ホームの挨拶。時間帯（深夜/朝/昼/夜）× その場で選ぶ言い回しで、毎回ちがう一言になる。
 * 定型文にしないため、開くたびにランダムで組み合わせる。
 */
const GREET_TIME: Record<"night" | "morning" | "day" | "evening", string[]> = {
  night: ["こんな時間まで起きてたの？", "夜更かしだね😌", "静かな時間だ。よく来たね", "眠れない夜？ ここにいていいよ"],
  morning: ["おはよ😊", "おはよう。いい時間に来たね", "朝だ。ここから始めよっか", "おはよ。今日はまだ、まっさらだよ"],
  day: ["よっ、来たね😊", "お、ちょうどいい時間", "今日の途中、寄ってくれたんだ", "やっほ。ひと息つこ😊"],
  evening: ["おつかれ😊", "今日もよくやったね", "おつかれさま。もう夜だね", "一日の終わり。ここで降ろしていこ"],
};
const GREET_LEAD: string[] = [
  "ここは『インナーワールド』——きみの内側の世界だよ。",
  "ここは、きみの内側だけでできてる世界。",
  "ようこそ。ここでは、外の事情はいったん置いていい。",
  "きみの内側の地図の上に、いま立ってるよ。",
];
const GREET_PUSH: string[] = [
  "今日はまず、ピークステートから。そこで“整える”のが先だよ😊",
  "まずは呼吸で整えよっか。そこからの方が、ぜんぶ早いから。",
  "先に整えよう。ピークステート、行っておいで😊",
  "何をするにも、まず状態から。整えるとこから始めよ。",
];
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function greetLine(): string {
  const h = new Date().getHours();
  const slot = h < 5 ? "night" : h < 11 ? "morning" : h < 18 ? "day" : "evening";
  return `${pick(GREET_TIME[slot])} ${pick(GREET_LEAD)}\n${pick(GREET_PUSH)}`;
}

const DOORS: { key: ModeKey; emoji: string }[] = [
  { key: "peak", emoji: "✨" },
  { key: "walk", emoji: "🚶" },
  { key: "akashic", emoji: "📖" },
];
const DOORS_SUB: { key: ModeKey; emoji: string }[] = [
  { key: "parts", emoji: "🜂" },
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
/**
 * 未来からの手紙が届くまでの演出（朝いちの待ち時間）。
 * 手紙が遠い光の中から、こちらへ飛んでくる。生成が終わると自動で本文に切り替わる。
 */
const LETTER_WAIT_LINES = [
  "未来の空に、手紙をとりにいってる…",
  "叶ったあの世界から、便箋をひらいてる…",
  "きみに届く言葉を、選んでる…",
  "もうすぐ、届くよ",
];
function LetterIncoming() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % LETTER_WAIT_LINES.length), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="lincoming">
      <div className="li-sky">
        {Array.from({ length: 12 }, (_, k) => (
          <span key={k} className="li-star" style={{ ["--d" as any]: `${k * 0.42}s`, left: `${6 + k * 8}%` }} />
        ))}
      </div>
      <div className="li-envelope">
        <span className="li-trail" />
        <span className="li-paper">✉️</span>
      </div>
      <p className="li-text" key={i}>{LETTER_WAIT_LINES[i]}</p>
      <span className="li-dots"><span /><span /><span /></span>
    </div>
  );
}

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
  guideName, avatarUrl, onPick, onTalk, onReport, onDaily, onHero, onTasks, onLetter, onCard, onBalance, onCast, onManual, isAdventurer, sending,
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
  /** メーターから「どうすれば真ん中に戻る？」の対話へ */
  onBalance?: () => void;
  /** 発信スタジオ（ワーク体験→SNS投稿） */
  onCast?: () => void;
  /** 自分の取扱説明書（生年月日×16問） */
  onManual?: () => void;
  isAdventurer?: boolean;
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
        <div className="iw-figure-wrap">
          <Image
            className="iw-figure"
            src={avatarUrl}
            alt={guideName}
            width={280}
            height={420}
            priority
            unoptimized={avatarUrl.startsWith("http")}
          />
          {/* 100%到達者の称号バッジ（枠は出さず、ここにそっと付く） */}
          {isAdventurer && <span className="iw-badge" title="人生の冒険者">🏆</span>}
        </div>
        <div className="iw-bubble is-centered">
          <span className="who">{guideName}</span>
          <p>{greetLine()}</p>
        </div>
      </div>

      {/* ゲームHUD：空想↔現実のバランス＋ハイヤークエスト */}
      <InnerHud guideName={guideName} onTalkBalance={onBalance} />

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
        <button className="iw-report is-cast" onClick={onCast}>📣 発信スタジオ</button>
        <button className="iw-report is-manual" onClick={onManual}>📖 自分の取扱説明書</button>
        {/* 1日の振り返りは夜だけ。夜になったらプッシュ通知で「開いたよ」と知らせる（それまでは鍵） */}
        {new Date().getHours() >= REFLECT_FROM_HOUR
          ? <button className="iw-report is-night" onClick={onDaily}>🌙 1日の振り返り</button>
          : <button className="iw-report is-locked" disabled title={`夜（${REFLECT_FROM_HOUR}時）に通知でお知らせして開くよ`}>🔒 夜に通知で開く</button>}
        <button className="iw-report" onClick={onReport}>🌱 この頃のわたし</button>
      </div>
    </div>
  );
}
