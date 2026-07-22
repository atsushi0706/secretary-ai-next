"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  guideName, initialPlace,
}: {
  guideName: string;
  initialPlace?: PlaceKey;
}) {
  const [place, setPlace] = useState<PlaceKey>(initialPlace ?? "map");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [moving, setMoving] = useState(false);
  const [questBump, setQuestBump] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

  const here = PLACES[place];

  // 会話の続きを読み込む → 空なら最初のひとことをもらう
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
        // 直前にいた場所から再開する（行き先を指定して開いたときは、そちらを優先）
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
    // 地図が動く間を見せてから場所を切り替える
    setTimeout(() => { setPlace(next); }, 220);
    setTimeout(() => { setMoving(false); }, 900);
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

  return (
    <div
      className={`singa-stage ${moving ? "is-moving" : ""}`}
      style={{ ["--place-hue" as any]: here.hue }}
    >
      {/* 地図。今いる場所が光る */}
      <MapLayer place={place} onPick={(k) => { moveTo(k); }} />

      {/* 中央: 案内役との対話 */}
      <div className="singa-center">
        <div className="singa-place-name">
          <span className="en">{here.en}</span>
          <span className="ja">{here.ja}</span>
          <span className="tag">{here.tagline}</span>
        </div>

        <div ref={scrollRef} className="singa-talk">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "singa-line is-me" : "singa-line"}>
              {m.role === "assistant" && <span className="who">{guideName}</span>}
              <p>{m.content || (thinking && i === messages.length - 1 ? "…" : "")}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="singa-line">
              <p className="opacity-60">…</p>
            </div>
          )}
        </div>

        <div className="singa-input">
          <VoiceInput
            mode="speech"
            onText={(t) => setInput((prev) => (prev ? prev + " " + t : t))}
          />
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
          <button
            onClick={() => void talk(input)}
            disabled={sending || !input.trim()}
            className="singa-send"
          >
            話す
          </button>
        </div>
      </div>

      {/* その場所で開く道具 */}
      {here.panel === "state" && <StatePanel />}
      {here.panel === "quests" && <QuestPanel bump={questBump} />}
      {here.panel === "reflect" && <QuestPanel bump={questBump} reflectMode />}
      {here.panel === "walk" && (
        <div className="singa-panel">
          <div className="singa-panel-title">歩きながら</div>
          <p className="text-xs leading-relaxed">
            まとめなくていいので、浮かんだことをそのまま話してください。
            マイクを押したまま歩いて、思いついたら喋るだけで大丈夫です。
          </p>
        </div>
      )}

      {/* 状態パラメーターはどこにいても押せる（常設） */}
      {here.panel !== "state" && <StateButton onOpen={() => moveTo("river")} />}
    </div>
  );
}

/** 地図のレイヤー。今いる場所が光り、他の場所は薄く残る */
function MapLayer({ place, onPick }: { place: PlaceKey; onPick: (k: PlaceKey) => void }) {
  const keys = (Object.keys(PLACES) as PlaceKey[]).filter((k) => k !== "map");
  return (
    <div className="singa-map" aria-hidden={false}>
      {keys.map((k) => {
        const p = PLACES[k];
        const on = k === place;
        return (
          <button
            key={k}
            onClick={() => onPick(k)}
            className={`singa-spot ${on ? "is-here" : ""}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, ["--spot-hue" as any]: p.hue }}
            title={`${p.ja} — ${p.tagline}`}
          >
            <span className="dot" />
            <span className="name">{p.ja}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 常設の状態パラメーターボタン */
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
      <span className="label">
        {done === true ? "記録済み" : "いまの状態"}
      </span>
    </button>
  );
}
