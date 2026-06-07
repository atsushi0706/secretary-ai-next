"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

function slotify(text: string): string {
  // 19:30-20:00 ◯◯ → カード化
  return text.replace(
    /^[\s・\-\*●○◇◆]*(\d{1,2}:\d{2})\s*[-〜~–—]\s*(\d{1,2}:\d{2})\s*[:：]?\s*(.+?)\s*$/gm,
    (_, t1, t2, lbl) =>
      `<div class="slot"><span class="time">${t1}–${t2}</span><span>${lbl}</span></div>`,
  );
}

function mdToHtml(text: string): string {
  // 超簡易 Markdown レンダラ（**bold**, *italic*, 改行）
  let s = slotify(text);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  s = s.replace(/^- (.+)$/gm, "<li>$1</li>");
  s = s.replace(/(<li>.+<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  s = s.replace(/\n/g, "<br/>");
  return s;
}

export function Chat({
  initialMessages,
  isMorning,
  onTasksUpdated,
}: {
  initialMessages: Message[];
  isMorning: boolean;
  onTasksUpdated: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages]);

  async function send() {
    if (sending) return;
    const text = input.trim();
    if (!text && !file) return;

    setSending(true);
    try {
      if (file) {
        // 画像送信
        const fd = new FormData();
        fd.append("file", file);
        fd.append("hint", text);
        fd.append("isMorning", String(isMorning));
        const userMsg: Message = {
          role: "user",
          content: `📎 画像「${file.name}」を共有${text ? "（補足: " + text + "）" : ""}`,
        };
        setMessages((prev) => [...prev, userMsg]);
        const r = await fetch("/api/extract-image", { method: "POST", body: fd });
        const data = await r.json();
        const added = (data.added ?? []) as string[];
        const reply = added.length > 0
          ? `画像から ${added.length}件 抜き出した → 自動で追加したよ: ${added.map((t) => `「${t}」`).join(" / ")}`
          : data.error
            ? `画像読み取りでエラー: ${data.error}`
            : "画像見たけど、新しく追加すべきタスクは見つからなかったよ。";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        setInput(""); setFile(null);
        if (added.length > 0) onTasksUpdated();
      } else {
        const userMsg: Message = { role: "user", content: text };
        setMessages((prev) => [...prev, userMsg]);
        const r = await fetch("/api/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, isMorning }),
        });
        const data = await r.json();
        if (data.error) {
          setMessages((prev) => [...prev, {
            role: "assistant", content: `（エラー: ${data.error}）`,
          }]);
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
          if (data.addedTitles?.length > 0) onTasksUpdated();
        }
        setInput("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card flex flex-col" style={{ height: 460 }}>
      <div ref={scroller} className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm pt-8">
            清瀬リンクとの会話がここに表示されます
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`bubble ${m.role === "user" ? "bubble-me" : "bubble-bot"}`}
              dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) }}
            />
          </div>
        ))}
        {sending && (
          <div className="text-xs text-gray-400">清瀬リンクが考えてます…</div>
        )}
      </div>

      {file && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs flex items-center gap-2 mb-2">
          📎 {file.name}
          <button onClick={() => setFile(null)} className="ml-auto text-gray-500">×</button>
        </div>
      )}

      <div className="flex gap-2 items-end pt-2 border-t">
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
          placeholder={isMorning ? "今日の優先順位や、入れといて欲しいタスクなど…" : "明日のことを話そう…"}
          rows={1}
          className="flex-1 resize-none p-2 border rounded-lg text-sm min-h-[40px] max-h-32"
        />
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
