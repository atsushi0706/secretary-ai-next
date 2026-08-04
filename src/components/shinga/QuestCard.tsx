"use client";

import { useState } from "react";
import { ArrivalFx } from "./ArrivalFx";
import { VoiceInput } from "./VoiceInput";

/**
 * 未来からのクエストカード。
 * 抽象シンボルの絵を見て、本人が「今日乗り越えること」を受け取る → AI(清瀬リンク)が今日の課題に深める → 立ち向かう。
 * 画像は public/quest-sym-1.png 〜 quest-sym-16.png。無ければプレースホルダー表示。
 */
export type Card = { date: string; symbol: number; interpretation: string; challenge: string; action?: string; done: boolean };

export function QuestCard({ card, onClose, onDone }: { card: Card; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState(card.interpretation ?? "");
  const [challenge, setChallenge] = useState(card.challenge ?? "");
  const [action, setAction] = useState(card.action ?? "");
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
      setAction(d.card?.action ?? "");
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  async function face() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/quest-card", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "done", action_text: action }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.error || `HTTP ${r.status}`); return; }
      onDone();
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  // 課題が出る前＝「届いた瞬間」だけ派手に降臨させる
  const arriving = !challenge;

  return (
    <div className="qcard-screen">
      {arriving && <ArrivalFx tone="violet" />}
      <div className={`qcard ${arriving ? "arrive-in shimmer-sweep" : ""}`}>
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
            {/* 書くより、話したほうが出てくることがある。話した内容は整えてから入る */}
            <VoiceInput mode="quest" compact onText={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))} />
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
              <div className="qc-adopted">
                🔨 受け取ると、これが今日の<b>ハイヤークエスト</b>になるよ。
                {action && <><br /><span className="qc-act">「{action}」</span></>}
                <br /><span className="qc-note">受け取らなくてもいい。決めるのはきみ。</span>
              </div>
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
