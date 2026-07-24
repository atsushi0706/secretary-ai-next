"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PLACES, type PlaceKey } from "@/lib/places";
import { MODES, type ModeKey } from "@/lib/modes";
import { VoiceBar } from "./VoiceBar";
import { PeakPanel } from "./PeakPanel";
import { AkashicPanel } from "./AkashicPanel";
import { EmotionMeter, emoName } from "./EmotionMeter";
import { BreathGuide } from "./BreathGuide";
import { ParallelWalk } from "./ParallelWalk";
import { ReportScreen } from "./ReportScreen";

type Face = "neutral" | "smile" | "anxious";
type Choice = { label: string; mode?: ModeKey };
type Message = { role: "user" | "assistant"; content: string };

// タグが本文に混じっても画面に出さない（最初のタグ開始で切る）
function stripTags(t: string): string {
  const i = t.search(/<(face|move|choices|quest_to_add)\b/);
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // タイプ演出：流れてきた文字を一定ペースで少しずつ表示（考えながらピピピ）
  const targetRef = useRef("");     // これまでに届いた生テキスト
  const shownRef = useRef(0);        // 表示済み文字数
  const finalRef = useRef(false);    // 生成終了フラグ

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

  async function enter(m: ModeKey, resume = false) {
    setMode(m);
    setPlace(MODES[m].place);
    setView("talk");
    setChoices(null);
    if (!resume) setMessages([]);
    // パラレルウォークは会話ではなく専用画面（ChatGPT連携）。AI挨拶は呼ばない
    if (m === "walk") return;
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
    if (!greet) setMessages((prev) => [...prev, { role: "user", content: body }]);

    // 新しい assistant 行を用意して、タイプ演出を開始
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    targetRef.current = "";
    shownRef.current = 0;
    finalRef.current = false;
    setTyping(true);

    try {
      const r = await fetch("/api/shinga/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body, place: p, mode: m ?? undefined, greet }),
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
      {/* 地図（背景）— 会話中はその場所へ上がっていく */}
      <div
        className="singa-map"
        style={{
          transform:
            view === "home"
              ? "scale(1.28)"
              : `scale(1.7) translate(${(50 - here.x) * 0.62}%, ${(50 - here.y) * 0.62}%)`,
        }}
      >
        <div className="singa-map-img" />
      </div>

      {reportOpen ? (
        <ReportScreen guideName={guideName} avatarUrl={faceSrc} onBack={() => setReportOpen(false)} />
      ) : view === "home" ? (
        <Home
          guideName={guideName}
          avatarUrl={faceSrc}
          onPick={(m) => void enter(m)}
          onTalk={(t) => void enterFree(t)}
          onReport={() => setReportOpen(true)}
          sending={sending}
        />
      ) : mode === "walk" ? (
        <ParallelWalk onBack={() => { setView("home"); setChoices(null); setMode(null); }} />
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

          {/* 音声入力バー */}
          <VoiceBar onSend={(t) => talk(t)} disabled={sending} />

          {/* その場所の道具 */}
          {hasPanel && panelOpen && (
            <div className="singa-panel-wrap">
              <button className="singa-panel-close" onClick={() => setPanelOpen(false)} title="しまう">×</button>
              {here.panel === "peak" && <PeakPanel />}
              {here.panel === "akashic" && <AkashicPanel />}
            </div>
          )}
          {hasPanel && !panelOpen && (
            <button className="singa-panel-open" onClick={() => setPanelOpen(true)}>道具をひらく</button>
          )}
        </>
      )}
    </div>
  );
}

// ── ホーム：キヨセリンクが世界の中で出迎えて、行き先へ案内する ──
// 「ただのシステム」ではなく、入り込める世界にするため、最初に必ず相棒が話す。

function greetLine(): string {
  const h = new Date().getHours();
  const time = h < 5 ? "こんな時間まで起きてたの？" : h < 11 ? "おはよ😊" : h < 18 ? "よっ、来たね😊" : "おつかれ😊";
  return `${time} ここは『インナーワールド』——きみの内側の世界だよ。\n今日はどこから行く？迷ったら、まず真ん中で“整える”のがおすすめ。`;
}

const DOORS: { key: ModeKey; emoji: string }[] = [
  { key: "peak", emoji: "✨" },
  { key: "walk", emoji: "🚶" },
  { key: "akashic", emoji: "📖" },
];
const DOORS_SUB: { key: ModeKey; emoji: string }[] = [
  { key: "breakthrough", emoji: "🗝" },
  { key: "higher", emoji: "🔥" },
  { key: "deep", emoji: "🪞" },
];

function Home({
  guideName, avatarUrl, onPick, onTalk, onReport, sending,
}: {
  guideName: string;
  avatarUrl: string;
  onPick: (m: ModeKey) => void;
  onTalk: (text: string) => void;
  onReport: () => void;
  sending: boolean;
}) {
  return (
    <div className="iw-home">
      {/* 世界の中に立つキヨセリンク＋吹き出し */}
      <div className="iw-scene">
        <div className="iw-bubble">
          <span className="who">{guideName}</span>
          <p>{greetLine()}</p>
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

      {/* 話しかける（ここで即・打てる／話せる） */}
      <VoiceBar onSend={onTalk} disabled={sending} placeholder={`${guideName}に話しかける…`} />

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

      {/* この頃のわたし（変化のふりかえり） */}
      <button className="iw-report" onClick={onReport}>🌱 この頃のわたし（変化をみる）</button>
    </div>
  );
}
