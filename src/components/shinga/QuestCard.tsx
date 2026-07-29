"use client";

import { useState } from "react";

/**
 * 未来からのクエストカード。
 * 抽象シンボルの絵を見て、本人が「今日乗り越えること」を受け取る → AI(清瀬リンク)が今日の課題に深める → 立ち向かう。
 * 画像は public/quest-sym-1.png 〜 quest-sym-16.png。無ければプレースホルダー表示。
 */
export type Card = { date: string; symbol: number; interpretation: string; challenge: string; done: boolean };

export function QuestCard({ card, onClose, onDone }: { card: Card; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState(card.interpretation ?? "");
  const [challenge, setChallenge] = useState(card.challenge ?? "");
  const [busy, setBusy] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const [err, setErr] = useState("");

  async function receive() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/quest-card", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "interpret", text }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || `HTTP ${r.status}`); return; }
      setChallenge(d.card?.challenge ?? "");
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  async function face() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/quest-card", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "done" }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.error || `HTTP ${r.status}`); return; }
      onDone();
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="qcard-screen">
      <div className="qcard">
        <div className="qcard-from">🎴 未来から、クエストが届いた</div>

        <div className="qcard-sym">
          {imgOk
            ? <img src={`/quest-sym-${card.symbol}.png`} alt="" onError={() => setImgOk(false)} />
            : <div className="qcard-sym-ph"><span>✦</span></div>}
        </div>

        {!challenge ? (
          <>
            <p className="qcard-lead">この絵は、いまのきみに何を映してる？<br />今日きみが"乗り越えること"を、この絵から受け取ってみて。</p>
            <textarea
              className="qcard-input" value={text} onChange={(e) => setText(e.target.value)} rows={3}
              placeholder="例：ずっと避けてた連絡。今日は逃げるなってことかも。"
            />
            {err && <div className="qcard-err">{err}</div>}
            <button className="qcard-btn is-go" disabled={busy} onClick={receive}>
              {busy ? "受け取ってる…" : "受け取る →"}
            </button>
            <button className="qcard-btn is-later" onClick={onClose}>また後で</button>
          </>
        ) : (
          <>
            <div className="qcard-challenge">
              <div className="k">未来からのクエスト</div>
              <p>{challenge}</p>
            </div>
            {err && <div className="qcard-err">{err}</div>}
            <button className="qcard-btn is-go" disabled={busy} onClick={face}>
              {busy ? "…" : "🔥 これに立ち向かう"}
            </button>
            <button className="qcard-btn is-later" onClick={onClose}>今日はここまで</button>
          </>
        )}
      </div>
    </div>
  );
}
