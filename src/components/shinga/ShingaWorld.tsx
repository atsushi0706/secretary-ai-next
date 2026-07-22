"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PLACES, type PlaceKey } from "@/lib/places";
import { VoiceInput } from "./VoiceInput";
import { StatePanel } from "./StatePanel";
import { QuestPanel } from "./QuestPanel";

type Message = { role: "user" | "assistant"; content: string };

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

export function ShingaWorld({
  guideName, avatarUrl, initialPlace,
}: {
  guideName: string;
  avatarUrl: string;
  initialPlace?: PlaceKey;
}) {
  const [place, setPlace] = useState<PlaceKey>(initialPlace ?? "map");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [moving, setMoving] = useState(false);
  const [questBump, setQuestBump] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

  const here = PLACES[place];
  const isHttpAvatar = avatarUrl.startsWith("http");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/shinga/chat");
        const d = await r.json();
        if (cancelled) return;
        const past: Message[] = (d.messages ?? []).map((m: any) => ({
          role: m.role, content: m.content,
        }));
        setMessages(past);
        const lastPlace = d.messages?.[d.messages.length - 1]?.place;
        if (!initialPlace && lastPlace && lastPlace in PLACES) setPlace(lastPlace as PlaceKey);
        if (past.length === 0 && !greetedRef.current) {
          greetedRef.current = true;
          void talk("", true);
        }
      } catch { /* 会話が読めなくても、話しかけられる状態にはしておく */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const moveTo = useCallback((next: PlaceKey) => {
    if (next === place) return;
    setMoving(true);
    setPanelOpen(true);
    setTimeout(() => { setPlace(next); }, 260);
    setTimeout(() => { setMoving(false); }, 1000);
  }, [place]);

  async function talk(text: string, greet = false) {
    if (sending) return;
    const body = text.trim();
    if (!body && !greet) return;

    setSending(true);
    setThinking(true);
    if (!greet) {
      setMessages((prev) => [...prev, { role: "user", content: body }]);
      setInput("");
    }
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const r = await fetch("/api/shinga/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body, place, greet }),
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
            if (last?.role === "assistant") {
              arr[arr.length - 1] = { ...last, content: last.content + data.text };
            }
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
    }
  }

  const hasPanel = here.panel !== "none";

  return (
    <div className={`singa-stage ${moving ? "is-moving" : ""}`} style={{ ["--place-hue" as any]: here.hue }}>
      {/* 地図。今いる場所へ寄っていく */}
      <div
        className="singa-map"
        style={{
          transform: `scale(${place === "map" ? 1 : 1.35}) translate(${(50 - here.x) * (place === "map" ? 0 : 0.55)}%, ${(50 - here.y) * (place === "map" ? 0 : 0.55)}%)`,
        }}
      >
        <div className="singa-map-img" />
        {(Object.keys(PLACES) as PlaceKey[])
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

      {/* 今いる場所 */}
      <div className="singa-place-name">
        <span className="en">{here.en}</span>
        <span className="ja">{here.ja}</span>
        <span className="tag">{here.tagline}</span>
      </div>

      {/* 案内役。地図の左下に立って、そこから話しかけてくる */}
      <div className="singa-avatar">
        <Image
          src={avatarUrl}
          alt={guideName}
          width={420}
          height={640}
          priority
          unoptimized={isHttpAvatar}
        />
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
      </div>

      {/* 入力 */}
      <div className="singa-input">
        <VoiceInput mode="speech" compact onText={(t) => setInput((p) => (p ? p + " " + t : t))} />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void talk(input);
            }
          }}
          rows={1}
          placeholder="話す"
          className="singa-textarea"
        />
        <button onClick={() => void talk(input)} disabled={sending || !input.trim()} className="singa-send">
          話す
        </button>
      </div>

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
        <button className="singa-panel-open" onClick={() => setPanelOpen(true)}>
          道具をひらく
        </button>
      )}

      {/* 状態パラメーターはどこにいても押せる */}
      {here.panel !== "state" && <StateButton onOpen={() => moveTo("river")} />}
    </div>
  );
}

function StateButton({ onOpen }: { onOpen: () => void }) {
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/emotions")
      .then((r) => r.json())
      .then((d) => setDone(!!d.doneThisSlot))
      .catch(() => setDone(null));
  }, []);

  return (
    <button onClick={onOpen} className="singa-state-fab" title="いまの状態を記録する">
      <span className="ring" />
      <span className="label">{done === true ? "記録済み" : "いまの状態"}</span>
    </button>
  );
}
