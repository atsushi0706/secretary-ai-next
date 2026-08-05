"use client";

/**
 * ホームの音声入力。
 *
 * 地図に扉が並んでいても、初めての人には「どれが自分に要るのか」が分からない。
 * だから、思っていることをそのまま喋ってもらって、こちらが行き先を出す。
 *
 * 出すのは **鍵が開いている部屋だけ**。押しても開かないボタンは出さない。
 * ピンとこなければ、そのまま話す道も残す。
 */
import { useState } from "react";
import { VoiceInput } from "./VoiceInput";
import { WORK_GUIDE } from "@/lib/work-guide";
import type { ModeKey } from "@/lib/modes";

type Pick = { mode: ModeKey; label: string; why: string };

export function HomeVoice({ openWorks, onGo, onTalk }: {
  /** いま鍵が開いている部屋 */
  openWorks: ModeKey[];
  /** その部屋へ入る */
  onGo: (m: ModeKey) => void;
  /** 部屋には入らず、このまま話す */
  onTalk: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [say, setSay] = useState("");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [asked, setAsked] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);

  async function ask(t: string) {
    const body = t.trim();
    if (!body || busy) return;
    setBusy(true); setErr(""); setSay(""); setPicks([]); setAsked(body);
    try {
      const r = await fetch("/api/shinga/where", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body, openWorks }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? "うまく聞けなかった"); return; }
      setSay(d.say ?? "");
      setPicks(Array.isArray(d.picks) ? d.picks : []);
      setText("");
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="hv">
      <button className="hv-head" onClick={() => setOpen((v) => !v)}>
        <span className="hv-t">🎙 話しかけて、行き先を決める</span>
        <span className="hv-toggle">{open ? "▲ 閉じる" : "▼ ひらく"}</span>
      </button>

      {open && (
        <div className="hv-body">
          <p className="hv-lead">
            いま思っていることを、そのまま話してみて。<br />
            <b>どの部屋がよさそうか</b>、こっちで見立てて出すよ。どれを選ぶかは自由。
          </p>

          <div className="hv-input">
            <textarea rows={2} value={text} disabled={busy}
              placeholder="例：やりたいのに、なんか動けない"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void ask(text); }} />
            <div className="hv-btns">
              {/* 話した内容は、そのまま欄に入る（自分で直せる） */}
              <VoiceInput compact onText={(t) => setText((p) => (p ? `${p} ${t}` : t))} />
              <button className="hv-go" onClick={() => void ask(text)} disabled={busy || !text.trim()}>
                {busy ? "考えてる…" : "聞いてみる"}
              </button>
            </div>
          </div>

          {err && <div className="hv-err">{err}</div>}

          {(say || picks.length > 0) && (
            <div className="hv-answer">
              {asked && <div className="hv-asked">「{asked}」</div>}
              {say && <div className="hv-say">{say}</div>}

              {picks.map((p) => {
                const g = WORK_GUIDE[p.mode];
                return (
                  <button key={p.mode} className="hv-pick" onClick={() => onGo(p.mode)}>
                    <span className="hv-pick-t">{p.label} へ行く</span>
                    {p.why && <span className="hv-pick-w">{p.why}</span>}
                    {g && <span className="hv-pick-o">{g.oneLine}</span>}
                  </button>
                );
              })}

              {/* 部屋に入らず、このまま話す道も残す */}
              <button className="hv-plain" onClick={() => onTalk(asked)}>
                {picks.length > 0 ? "どれもピンとこない。このまま話す" : "このまま話す"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
