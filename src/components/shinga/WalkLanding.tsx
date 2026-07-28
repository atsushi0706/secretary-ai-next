"use client";

import { useEffect, useRef, useState } from "react";

/**
 * パラレルウォークを歩き終えたあと、その理想を「今日1日」に落とす着地ステップ。
 * ① 今日どんな感情でいる？ ② 理想を今日に入れる最優先の一手は？
 * → 今日のフォーカスに保存＋最優先はリアルバースのタスクへ。歩いた記録(walk_log)も残す。
 */
const EMOTION_CHIPS = ["安心", "ワクワク", "満たされてる", "落ち着き", "軽やか", "自信", "感謝", "楽しい"];

export function WalkLanding({ transcript, onDone }: { transcript: string; onDone: () => void }) {
  const [emotion, setEmotion] = useState("");
  const [priority, setPriority] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const savedLog = useRef(false);

  // 歩いた記録を残す（イメージ力・レポートの素材に）。1回だけ。
  useEffect(() => {
    const t = transcript.trim();
    if (savedLog.current || !t) return;
    savedLog.current = true;
    fetch("/api/walk-logs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: t.slice(0, 2000) }),
    }).catch(() => {});
  }, [transcript]);

  async function save() {
    setSaving(true); setErr(null);
    try {
      const r = await fetch("/api/daily-focus", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotion, priority, addTask: true }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? "保存できませんでした"); return; }
      setDone(true);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setSaving(false); }
  }

  if (done) {
    return (
      <div className="pwalk">
        <div className="pwalk-card">
          <div className="pwalk-glow" />
          <div className="pwalk-sub">決まったね 🌱</div>
          <h1>今日は、これでいこう</h1>
          <p className="pwalk-lead">
            {emotion && <>今日の感情は <b>{emotion}</b>。<br /></>}
            {priority && <>最優先の一歩「<b>{priority}</b>」は、<br />リアルバースの今日のタスクに入れておいたよ。</>}
          </p>
          <button className="pwalk-done" onClick={onDone}>地図にもどる</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pwalk">
      <div className="pwalk-card">
        <div className="pwalk-sub">今日に、落とす</div>
        <h1>この理想を、今日1日に</h1>
        <div className="pwalk-focus">
          <label>今日1日、どんな感情でいようと思う？</label>
          <input value={emotion} onChange={(e) => setEmotion(e.target.value)} placeholder="例：安心・ワクワク" className="pwalk-paste" />
          <div className="pwalk-chips">
            {EMOTION_CHIPS.map((c) => (
              <button key={c} className={emotion === c ? "on" : ""} onClick={() => setEmotion(c)}>{c}</button>
            ))}
          </div>
          <label>理想の状態を、ちっちゃくても今日に入れるとしたら？（最優先の一歩）</label>
          <textarea value={priority} onChange={(e) => setPriority(e.target.value)} rows={3}
            placeholder="例：朝、鏡の前で背筋を伸ばして深呼吸する／気になってた人に一言だけ送る" className="pwalk-paste" />
        </div>
        {err && <div className="pwalk-err">{err}</div>}
        <div className="pwalk-row">
          <button className="pwalk-done" onClick={onDone}>スキップ</button>
          <button className="pwalk-go" disabled={saving || (!emotion.trim() && !priority.trim())} onClick={save}>
            {saving ? "保存中…" : "今日のタスクに入れる"}
          </button>
        </div>
      </div>
    </div>
  );
}
