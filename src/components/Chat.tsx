"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useDictation } from "@/components/useDictation";

type Message = { role: "user" | "assistant"; content: string };

/**
 * 画像から読み取ったタスクの候補。
 *
 * 【なぜ候補で止めるのか】
 * 前は読み取った結果をそのままGoogleタスクに追加していた。使ってくれている方から
 * 「何も入力していないのにタスクが増えている」と連絡があり、原因はそこだった。
 * 受信箱のスクリーンショットから、メールの件名がそのままタスクになっていた。
 * **本人が見て選ぶまで作らない。**
 */
type TaskCand = {
  title: string; notes: string; due: string | null;
  category: string; urgency: string; importance: string; time: string;
};

function slotify(text: string): string {
  return text.replace(
    /^[\s・\-\*●○◇◆]*(\d{1,2}:\d{2})\s*[-〜~–—]\s*(\d{1,2}:\d{2})\s*[:：]?\s*(.+?)\s*$/gm,
    (_, t1, t2, lbl) =>
      `<div class="slot"><span class="time">${t1}–${t2}</span><span>${lbl}</span></div>`,
  );
}

function mdToHtml(text: string): string {
  let s = slotify(text);
  // 見出し（### 明日の時間割）を生のまま出さない
  s = s.replace(/^#{1,3}\s+(.+)$/gm, '<strong class="md-h">$1</strong>');
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  s = s.replace(/^- (.+)$/gm, "<li>$1</li>");
  s = s.replace(/(<li>.+<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  s = s.replace(/\n/g, "<br/>");
  return s;
}

// AI 応答から時間割行だけを抽出して、拡張機能が読める形式
// "HH:MM-HH:MM タスク名" に整形する
function extractScheduleFromReply(reply: string): string {
  if (!reply) return "";
  const lines = reply.split(/\n+/);
  const out: string[] = [];
  for (const line of lines) {
    const m = line.match(
      /^[\s\|｜・\-\*●○◇◆]*(\d{1,2}):(\d{2})\s*[-–〜~]\s*(\d{1,2}):(\d{2})\s*[:：\|｜]?\s*(.+?)\s*$/,
    );
    if (!m) continue;
    const [, h1, m1, h2, m2, taskRaw] = m;
    const task = taskRaw
      .replace(/\*\*/g, "")
      .replace(/^[\|｜:：\s]+/, "")
      .replace(/[\|｜]+/g, " ")
      .trim();
    if (!task) continue;
    // 17時以降は除外（秘書ルール: 稼働9-17時）
    const startHour = parseInt(h1, 10);
    if (startHour >= 17 || startHour < 5) continue;
    out.push(`${h1}:${m1}-${h2}:${m2} ${task}`);
  }
  return out.join("\n");
}

async function readSse(
  resp: Response,
  onEvent: (event: string, data: any) => void,
) {
  if (!resp.body) return;
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split("\n\n");
    buf = chunks.pop() ?? "";
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      let eventName = "message";
      let dataStr = "";
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
      }
      if (!dataStr) continue;
      try { onEvent(eventName, JSON.parse(dataStr)); }
      catch { /* ignore */ }
    }
  }
}

function SendToExtensionButton({
  scheduleText, slotCount,
}: {
  scheduleText: string;
  slotCount: number;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "no-ext">("idle");
  function send() {
    if (state === "sending") return;
    setState("sending");
    // 拡張がインストールされていれば content.js が pong を返す
    const timer = setTimeout(() => {
      // 5秒待っても応答無ければ「拡張なし」
      setState("no-ext");
      window.removeEventListener("message", onMsg);
    }, 5000);
    function onMsg(event: MessageEvent) {
      if (event.source !== window) return;
      const d = event.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "kiyose:setScheduleResult") {
        clearTimeout(timer);
        window.removeEventListener("message", onMsg);
        setState(d.ok ? "done" : "no-ext");
        setTimeout(() => setState("idle"), 3000);
      }
    }
    window.addEventListener("message", onMsg);
    window.postMessage({ type: "kiyose:setSchedule", scheduleText }, "*");
  }
  return (
    <button
      onClick={send}
      disabled={state === "sending"}
      className="ml-10 text-xs bg-white/90 hover:bg-purple-50 border border-purple-200 rounded-full px-3 py-1 shadow-sm transition disabled:opacity-50"
      title="Chrome 拡張機能「清瀬リンク 集中モード」のタイマーバッジに、この時間割を反映"
    >
      {state === "idle" && `📌 拡張機能に送る（${slotCount}スロット）`}
      {state === "sending" && "送信中…"}
      {state === "done" && "✓ 拡張機能に送りました"}
      {state === "no-ext" && "⚠ 拡張機能が見つかりません（インストール&リロード必要）"}
    </button>
  );
}

export function Chat({
  initialMessages,
  isMorning,
  onTasksUpdated,
  autoGreet,
  secretaryName,
  secretaryAvatarUrl,
}: {
  initialMessages: Message[];
  isMorning: boolean;
  onTasksUpdated: () => void;
  autoGreet: boolean;
  secretaryName?: string;
  secretaryAvatarUrl?: string;
}) {
  const sName = secretaryName || "清瀬リンク";
  const sAvatar = secretaryAvatarUrl || "/kiyose.png";
  const isHttpAvatar = sAvatar.startsWith("http");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [searching, setSearching] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recError, setRecError] = useState("");
  // Typeless級の音声入力（小声OK・無音で切れない・整った文章で入る）
  const dict = useDictation();
  async function toggleDict() {
    if (dict.phase === "recording") {
      const t = await dict.stop("秘書AIへの指示・タスク・相談");
      if (t) setInput((v) => (v ? v + " " : "") + t);
    } else if (dict.phase === "idle") {
      await dict.start();
    }
  }
  const scroller = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages]);

  // 初回ロード: 挨拶＋時間割をSSEで流す
  useEffect(() => {
    if (!autoGreet || greetedRef.current) return;
    greetedRef.current = true;
    let cancelled = false;
    (async () => {
      setThinking(true);
      // 45秒経っても1チャンクも来なかったら諦めて秘書AIメッセージを出す。
      // AbortController で fetch 自体を中断 → サーバー側のストリームも close。
      const abort = new AbortController();
      let receivedAnyDelta = false;
      const timeoutId = setTimeout(() => {
        if (!receivedAnyDelta) {
          abort.abort();
        }
      }, 45_000);
      try {
        const resp = await fetch(`/api/greet?isMorning=${isMorning}`, { signal: abort.signal });
        if (!resp.ok) return;
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        await readSse(resp, (event, data) => {
          if (cancelled) return;
          if (event === "delta") {
            receivedAnyDelta = true;
            setThinking(false);
            setMessages((prev) => {
              const arr = [...prev];
              const last = arr[arr.length - 1];
              if (last?.role === "assistant") {
                arr[arr.length - 1] = { ...last, content: last.content + data.text };
              }
              return arr;
            });
          }
        });
      } catch (e: any) {
        const isAbort = e?.name === "AbortError";
        console.error(isAbort ? "greet timed out (45s no chunk)" : "greet failed", e);
        if (!cancelled) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            const friendly =
              "おはよう。ごめん、AI 側が今ちょっと反応遅いみたい (45秒待っても返事が来なかった)。\n" +
              "もう一度ブラウザをリロードするか、下のチャット欄から「今日の予定」って送ってみて。";
            if (last?.role === "assistant" && !last.content) {
              return [...prev.slice(0, -1), { role: "assistant", content: friendly }];
            }
            return [...prev, { role: "assistant", content: friendly }];
          });
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setThinking(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGreet, isMorning]);

  function toggleRecording() {
    if (recording) {
      try { recogRef.current?.stop(); } catch { /* ignore */ }
      setRecording(false);
      return;
    }
    setRecError("");
    const SR =
      (typeof window !== "undefined" && (
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      )) as any;
    if (!SR) {
      setRecError("お使いのブラウザは音声入力に未対応 (Chrome 推奨)");
      return;
    }
    const recog = new SR();
    recog.lang = "ja-JP";
    recog.continuous = true;
    recog.interimResults = true;
    let finalText = "";
    recog.onresult = (e: any) => {
      let interim = "";
      let finalSeg = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalSeg += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (finalSeg) finalText += finalSeg;
      setInput((finalText + interim).trim());
    };
    recog.onerror = (e: any) => {
      setRecError("マイクエラー: " + (e?.error ?? ""));
      setRecording(false);
    };
    recog.onend = () => {
      setRecording(false);
    };
    recog.start();
    recogRef.current = recog;
    setRecording(true);
  }

  /** 画像から読み取った候補（まだ作っていない）。選ばれたぶんだけ作る */
  const [cands, setCands] = useState<TaskCand[] | null>(null);
  const [candPick, setCandPick] = useState<Record<number, boolean>>({});
  const [candSaving, setCandSaving] = useState(false);

  /** 選ばれた候補だけをGoogleタスクにする */
  async function addPicked() {
    if (!cands || candSaving) return;
    setCandSaving(true);
    const picked = cands.filter((_, i) => candPick[i]);
    const done: string[] = [];
    try {
      for (const c of picked) {
        try {
          const r = await fetch("/api/tasks", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "add", title: c.title, notes: c.notes, due: c.due,
              category: c.category, urgency: c.urgency, importance: c.importance, time: c.time,
            }),
          });
          if (r.ok) done.push(c.title);
        } catch { /* 1件失敗しても、残りは進める */ }
      }
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: done.length
          ? `Googleタスクに入れたよ: ${done.map((t) => `「${t}」`).join(" / ")}`
          : "入れるものが選ばれてなかったから、何もしてないよ。",
      }]);
      setCands(null); setCandPick({});
      if (done.length) onTasksUpdated();
    } finally { setCandSaving(false); }
  }

  async function send() {
    if (sending) return;
    const text = input.trim();
    if (!text && !file) return;

    setSending(true);
    setThinking(true);
    try {
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("hint", text);
        fd.append("isMorning", String(isMorning));
        const userMsg: Message = {
          role: "user",
          content: `画像「${file.name}」を共有${text ? "（補足: " + text + "）" : ""}`,
        };
        setMessages((prev) => [...prev, userMsg]);
        const r = await fetch("/api/extract-image", { method: "POST", body: fd });
        const data = await r.json();
        const cs = (data.candidates ?? []) as TaskCand[];
        const reply = cs.length > 0
          ? `画像から ${cs.length}件 見つけた。**入れるものを選んでね**（勝手には入れないよ）`
          : data.error
            ? `画像読み取りでエラー: ${data.error}`
            : "画像見たけど、やることは見つからなかった。";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        // 最初から全部にチェックを入れると、結局そのまま押されて同じことになる。
        // **こちらからは1つもチェックしない。**選ぶのは本人。
        setCands(cs.length ? cs : null);
        setCandPick({});
        setInput(""); setFile(null);
      } else {
        const userMsg: Message = { role: "user", content: text };
        setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);
        setInput("");

        const r = await fetch("/api/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, isMorning }),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: r.statusText }));
          setMessages((prev) => {
            const arr = [...prev];
            arr[arr.length - 1] = { role: "assistant", content: `（エラー: ${err.error}）` };
            return arr;
          });
          return;
        }
        let needsRefresh = false;
        await readSse(r, (event, data) => {
          if (event === "delta") {
            setThinking(false);
            setMessages((prev) => {
              const arr = [...prev];
              const last = arr[arr.length - 1];
              if (last?.role === "assistant") {
                arr[arr.length - 1] = { ...last, content: last.content + data.text };
              }
              return arr;
            });
          } else if (event === "replace") {
            // タグ除去後の本文で最後の assistant メッセージを置き換え
            setMessages((prev) => {
              const arr = [...prev];
              const last = arr[arr.length - 1];
              if (last?.role === "assistant") {
                arr[arr.length - 1] = { ...last, content: data.text };
              }
              return arr;
            });
          } else if (event === "tool") {
            if (data.name === "web_search") setSearching(true);
          } else if (event === "added") {
            needsRefresh = true;
          } else if (event === "removed") {
            needsRefresh = true;
          } else if (event === "calendar_added") {
            needsRefresh = true;
          } else if (event === "done") {
            setSearching(false);
            if (data.addedTitles?.length > 0) needsRefresh = true;
            if (data.addedEvents?.length > 0) needsRefresh = true;
            if (data.removedTitles?.length > 0) needsRefresh = true;
            if (data.removedEvents?.length > 0) needsRefresh = true;
          } else if (event === "error") {
            setMessages((prev) => {
              const arr = [...prev];
              const last = arr[arr.length - 1];
              if (last?.role === "assistant" && !last.content) {
                arr[arr.length - 1] = { role: "assistant", content: `（エラー: ${data.message}）` };
              }
              return arr;
            });
          }
        });
        if (needsRefresh) onTasksUpdated();
      }
    } finally {
      setSending(false);
      setThinking(false);
      setSearching(false);
    }
  }

  return (
    <div className="chat-stage flex flex-col" style={{ height: 600 }}>
      {/* 上部ヘッダー（半透明白バー） */}
      <div className="stage-header">
        <Image
          src={sAvatar}
          alt=""
          width={28}
          height={28}
          className="rounded-full border border-purple-200"
          unoptimized={isHttpAvatar}
        />
        <div className="flex-1">
          <div className="name">{sName}</div>
          <div className="status">● オンライン</div>
        </div>
      </div>

      {/* 考え中ドット（キャラ前面に重ねる） */}
      {thinking && (
        <div className="stage-thinking" aria-hidden>
          <span /><span /><span />
        </div>
      )}

      {/* メッセージリスト */}
      <div ref={scroller} className="stage-messages space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm pt-8 drop-shadow-sm">
            {sName}との会話がここに表示されます
          </div>
        )}
        {messages.map((m, i) => {
          const extractedSchedule = m.role === "assistant" ? extractScheduleFromReply(m.content) : "";
          const slotCount = extractedSchedule ? extractedSchedule.split("\n").length : 0;
          return (
            <div key={i} className={`flex flex-col gap-1 ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"} w-full`}>
                {m.role === "assistant" && (
                  <Image
                    src={sAvatar}
                    alt={sName}
                    width={32}
                    height={32}
                    className="rounded-full border border-purple-200 shrink-0 bg-white"
                    unoptimized={isHttpAvatar}
                  />
                )}
                <div
                  className={`bubble ${m.role === "user" ? "bubble-me" : "bubble-bot"}`}
                  dangerouslySetInnerHTML={{
                    __html: m.content
                      ? mdToHtml(m.content)
                      : '<span class="typing-dots"><span></span><span></span><span></span></span>',
                  }}
                />
              </div>
              {/* 時間割が3スロット以上含まれていれば「拡張機能に送る」ボタン */}
              {slotCount >= 3 && (
                <SendToExtensionButton scheduleText={extractedSchedule} slotCount={slotCount} />
              )}
            </div>
          );
        })}
        {searching && (
          <div className="text-xs text-purple-700 flex items-center gap-1 bg-white/70 inline-flex px-2 py-1 rounded-full">
            🔎 Web を検索中…
          </div>
        )}
      </div>

      {/*
        画像から見つけたタスクの候補。
        **ここで選ばれるまで、Googleタスクには何も作らない。**
        以前はここが無く、読み取った結果をそのまま追加していたので、
        受信箱のスクリーンショットからメールの件名がタスクになっていた。
      */}
      {cands && cands.length > 0 && (
        <div className="mx-2 mb-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
          <div className="text-xs font-bold text-amber-800 mb-2">
            📋 画像から見つけたもの — <span className="underline">入れるものだけ</span>選んでね
          </div>
          <div className="space-y-1.5">
            {cands.map((c, i) => (
              <label key={i}
                className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-sm cursor-pointer ${
                  candPick[i] ? "border-amber-500 bg-white" : "border-amber-200 bg-white/60"}`}>
                <input type="checkbox" className="mt-0.5 w-4 h-4 shrink-0"
                  checked={!!candPick[i]}
                  onChange={(e) => setCandPick({ ...candPick, [i]: e.target.checked })} />
                <span className="flex-1 leading-snug">
                  {c.title}
                  {c.due && <span className="ml-1 text-[10px] text-gray-500">〆{c.due.slice(5, 10)}</span>}
                  {c.notes && <span className="block text-[10px] text-gray-500 mt-0.5">{c.notes}</span>}
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-2.5">
            <button
              className="flex-1 rounded-lg bg-purple-600 text-white text-xs font-bold py-2 disabled:opacity-40"
              disabled={candSaving || !Object.values(candPick).some(Boolean)}
              onClick={() => void addPicked()}>
              {candSaving ? "入れてる…" : "選んだものを入れる"}
            </button>
            <button
              className="rounded-lg border border-gray-300 bg-white text-xs text-gray-600 px-3 py-2"
              onClick={() => { setCands(null); setCandPick({}); }}>
              入れない
            </button>
          </div>
        </div>
      )}

      {/* 入力欄 */}
      {file && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg mx-2 px-3 py-2 text-xs flex items-center gap-2">
          📎 {file.name}
          <button onClick={() => setFile(null)} className="ml-auto text-gray-500">×</button>
        </div>
      )}
      {(recError || dict.error) && (
        <div className="bg-red-50 border border-red-200 rounded-lg mx-2 px-3 py-2 text-xs text-red-700">
          {recError || dict.error}
        </div>
      )}
      {dict.phase === "recording" && (
        <div className="mx-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          録音中 {Math.floor(dict.seconds / 60)}:{String(dict.seconds % 60).padStart(2, "0")} — 小声でもOK
          <span className="flex-1 h-1.5 rounded bg-red-100 overflow-hidden"><span className="block h-full bg-red-400 transition-all" style={{ width: `${Math.round(dict.level * 100)}%` }} /></span>
        </div>
      )}
      <div className="stage-input">
        <label className="cursor-pointer p-2 hover:bg-purple-50 rounded-lg" title="画像を添付">
          📎
          <input
            type="file" accept="image/*" className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault(); send();
            }
          }}
          placeholder={dict.phase === "recording"
            ? `聞いています… 小声でもOK（🎤で確定）`
            : isMorning ? "話しかける…（タスク追加、入れといて、相談）" : "明日のことを話そう…"}
          rows={1}
          className="flex-1 resize-none p-2 border rounded-lg text-sm min-h-[40px] max-h-32 bg-white/80"
        />
        {dict.supported && (
          <button
            onClick={() => void toggleDict()}
            disabled={sending || dict.phase === "transcribing"}
            className={`px-3 py-2 rounded-lg font-bold text-sm border transition-colors ${
              dict.phase === "recording"
                ? "bg-red-500 text-white border-red-500 animate-pulse"
                : dict.phase === "transcribing"
                  ? "bg-purple-100 text-purple-500 border-purple-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-purple-50"
            }`}
            title={dict.phase === "recording" ? "タップで確定" : "音声入力（Typeless級）"}
          >
            {dict.phase === "recording" ? "■" : dict.phase === "transcribing" ? "…" : "🎤"}
          </button>
        )}
        <button
          onClick={send} disabled={sending}
          className="bg-[var(--accent)] text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
        >
          送信
        </button>
      </div>
    </div>
  );
}
