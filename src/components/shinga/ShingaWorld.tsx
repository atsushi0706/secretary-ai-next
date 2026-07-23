"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PLACES, type PlaceKey } from "@/lib/places";
import { MODES, type ModeKey } from "@/lib/modes";
import { VoiceBar } from "./VoiceBar";
import { StatePanel } from "./StatePanel";
import { QuestPanel } from "./QuestPanel";

type Message = { role: "user" | "assistant"; content: string };
type Summary = { world?: string; step?: string; anchor?: string };

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

// 主役の3つ / 控えめの3つ
const MAIN: ModeKey[] = ["attune", "walk", "flow"];
const SUB: ModeKey[] = ["sothen", "metaup"];

export function ShingaWorld({
  guideName, avatarUrl, initialPlace,
}: {
  guideName: string;
  avatarUrl: string;
  initialPlace?: PlaceKey;
}) {
  const [view, setView] = useState<"home" | "talk">(initialPlace ? "talk" : "home");
  const [mode, setMode] = useState<ModeKey | null>(null);
  const [place, setPlace] = useState<PlaceKey>(initialPlace ?? "map");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [moving, setMoving] = useState(false);
  const [questBump, setQuestBump] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [hasHistory, setHasHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const here = PLACES[place];
  const isHttpAvatar = avatarUrl.startsWith("http");

  // 前回の続きがあるか、だけ先に見ておく（ホームの「前回の続き」を出すため）
  useEffect(() => {
    fetch("/api/shinga/chat")
      .then((r) => r.json())
      .then((d) => setHasHistory((d.messages ?? []).length > 0))
      .catch(() => {});
  }, []);

  // 「振り返る」等で場所を指定して開いたときは、そのまま会話に入る
  useEffect(() => {
    if (initialPlace) void enter(undefined, initialPlace, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, summary]);

  const moveTo = useCallback((next: PlaceKey) => {
    if (next === place) return;
    setMoving(true);
    setPanelOpen(true);
    setTimeout(() => setPlace(next), 260);
    setTimeout(() => setMoving(false), 1000);
  }, [place]);

  // 体験を始める（モード or 場所を決めて会話へ）
  async function enter(m: ModeKey | undefined, p: PlaceKey, resume = false) {
    setMode(m ?? null);
    setPlace(p);
    setView("talk");
    setSummary(null);
    if (!resume) setMessages([]);
    await talk("", true, m ?? null, p, resume);
  }

  async function talk(
    textIn: string,
    greet = false,
    m: ModeKey | null = mode,
    p: PlaceKey = place,
    resume = false,
  ) {
    if (sending) return;
    const body = textIn.trim();
    if (!body && !greet) return;

    setSending(true);
    setThinking(true);
    if (!greet) setMessages((prev) => [...prev, { role: "user", content: body }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const r = await fetch("/api/shinga/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body, place: p, mode: m ?? undefined, greet, resume }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setMessages((prev) => {
          const arr = [...prev];
          arr[arr.length - 1] = { role: "assistant", content: `（うまく届かなかった: ${err?.error ?? r.status}）` };
          return arr;
        });
        return;
      }
      await readSse(r, (name, data) => {
        if (name === "delta") {
          setThinking(false);
          setMessages((prev) => {
            const arr = [...prev];
            const last = arr[arr.length - 1];
            if (last?.role === "assistant") arr[arr.length - 1] = { ...last, content: last.content + data.text };
            return arr;
          });
        } else if (name === "replace") {
          setMessages((prev) => {
            const arr = [...prev];
            const last = arr[arr.length - 1];
            if (last?.role === "assistant") arr[arr.length - 1] = { ...last, content: data.text };
            return arr;
          });
        } else if (name === "move") {
          moveTo(data.place as PlaceKey);
        } else if (name === "quests") {
          setQuestBump((n) => n + 1);
        } else if (name === "summary") {
          setSummary(data.summary as Summary);
        }
      });
    } catch (e: any) {
      setMessages((prev) => {
        const arr = [...prev];
        arr[arr.length - 1] = { role: "assistant", content: `（うまく届かなかった: ${String(e?.message ?? e)}）` };
        return arr;
      });
    } finally {
      setSending(false);
      setThinking(false);
      setHasHistory(true);
    }
  }

  const hasPanel = here.panel !== "none";

  return (
    <div className={`singa-stage ${moving ? "is-moving" : ""}`} style={{ ["--place-hue" as any]: here.hue }}>
      {/* 地図（背景） */}
      <div
        className="singa-map"
        style={{
          transform:
            view === "home" || place === "map"
              ? "scale(1)"
              : `scale(1.35) translate(${(50 - here.x) * 0.55}%, ${(50 - here.y) * 0.55}%)`,
        }}
      >
        <div className="singa-map-img" />
        {view === "talk" &&
          (Object.keys(PLACES) as PlaceKey[])
            .filter((k) => k !== "map")
            .map((k) => {
              const p = PLACES[k];
              return (
                <button
                  key={k}
                  onClick={() => moveTo(k)}
                  className={`singa-spot ${k === place ? "is-here" : ""}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%`, ["--spot-hue" as any]: p.hue }}
                  title={`${p.ja} — ${p.tagline}`}
                >
                  <span className="dot" />
                </button>
              );
            })}
      </div>

      {view === "home" ? (
        <Home
          hasHistory={hasHistory}
          onPick={(m) => void enter(m, MODES[m].place)}
          onContinue={() => void enter(undefined, "map", true)}
        />
      ) : (
        <>
          {/* もどる */}
          <button className="singa-back" onClick={() => { setView("home"); setSummary(null); }}>
            ← 入口にもどる
          </button>

          {/* 今いる場所 / いまの体験 */}
          <div className="singa-place-name">
            <span className="en">{mode ? MODES[mode].en : here.en}</span>
            <span className="ja">{mode ? MODES[mode].label : here.ja}</span>
            <span className="tag">{mode ? MODES[mode].desc : here.tagline}</span>
          </div>

          {/* 案内役 */}
          <div className="singa-avatar">
            <Image src={avatarUrl} alt={guideName} width={420} height={640} priority unoptimized={isHttpAvatar} />
          </div>

          {/* 会話 */}
          <div ref={scrollRef} className="singa-talk">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "singa-line is-me" : "singa-line"}>
                {m.role === "assistant" && <span className="who">{guideName}</span>}
                <p>
                  {m.content ||
                    (thinking && i === messages.length - 1
                      ? <span className="typing-dots"><span /><span /><span /></span>
                      : "")}
                </p>
              </div>
            ))}
            {summary && <SummaryCard summary={summary} />}
          </div>

          {/* 音声入力バー（送信ボタンあり・確認してから送る） */}
          <VoiceBar onSend={(t) => talk(t)} disabled={sending} />

          {/* その場所の道具 */}
          {hasPanel && panelOpen && (
            <div className="singa-panel-wrap">
              <button className="singa-panel-close" onClick={() => setPanelOpen(false)} title="しまう">×</button>
              {here.panel === "state" && <StatePanel />}
              {here.panel === "quests" && <QuestPanel bump={questBump} />}
              {here.panel === "reflect" && <QuestPanel bump={questBump} reflectMode />}
              {here.panel === "walk" && (
                <div className="singa-panel">
                  <div className="singa-panel-title">歩きながら</div>
                  <p className="text-xs leading-relaxed">
                    まとめなくていいので、浮かんだことをそのまま話してください。
                    マイクを押して歩いて、思いついたら喋るだけで大丈夫です。
                  </p>
                </div>
              )}
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

// ── ホーム：開いた瞬間に選べる入口 ──────────────────────────
function Home({
  hasHistory, onPick, onContinue,
}: {
  hasHistory: boolean;
  onPick: (m: ModeKey) => void;
  onContinue: () => void;
}) {
  return (
    <div className="singa-home">
      <div className="singa-home-hero">
        <span className="sub">SINGA WORLD</span>
        <h1>今日のシンガワールドを起動する</h1>
        <p>今の自分を整え、望む世界を言葉にし、今日の行動につなげる。</p>
      </div>

      <div className="singa-home-main">
        {MAIN.map((k) => {
          const m = MODES[k];
          return (
            <button key={k} className="singa-entry" onClick={() => onPick(k)}>
              <span className="min">{m.minutes}分</span>
              <span className="en">{m.en}</span>
              <span className="ja">{m.label}</span>
              <span className="desc">{m.desc}</span>
            </button>
          );
        })}
      </div>

      <div className="singa-home-sub">
        {SUB.map((k) => {
          const m = MODES[k];
          return (
            <button key={k} className="singa-entry-s" onClick={() => onPick(k)}>
              <span className="ja">{m.label}</span>
              <span className="en">{m.en}</span>
            </button>
          );
        })}
        {hasHistory && (
          <button className="singa-entry-s" onClick={onContinue}>
            <span className="ja">前回の続き</span>
            <span className="en">Continue</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── セッションの着地 ────────────────────────────────────────
function SummaryCard({ summary }: { summary: Summary }) {
  return (
    <div className="singa-summary">
      <div className="singa-summary-title">今日のまとめ</div>
      {summary.world && (
        <div className="row"><span className="k">今日見えた世界</span><span className="v">{summary.world}</span></div>
      )}
      {summary.step && (
        <div className="row"><span className="k">今日の一手</span><span className="v">{summary.step}</span></div>
      )}
      {summary.anchor && (
        <div className="row"><span className="k">戻るための言葉</span><span className="v">{summary.anchor}</span></div>
      )}
    </div>
  );
}
