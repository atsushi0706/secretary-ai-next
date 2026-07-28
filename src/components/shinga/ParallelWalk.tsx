"use client";

import { useEffect, useState } from "react";
import { EmotionMeter, emoName } from "./EmotionMeter";

/**
 * パラレルウォーク（ChatGPTs 連携）。
 *
 * 行き先の選択はしない。「じゃあ、理想の未来をたくさん語ってきて。
 * 上を見て歩いて、その感覚を体に落としてきて。いってらっしゃい」の温度で送り出す。
 *
 * フロー:
 *  1. 送り出し → ChatGPT でパラレルウォーク（外部リンク）。
 *  2. 戻ってきたら「終わった」→ ChatGPT の要約を貼って保存（蓄積）。
 */

// ★ 淳くんの ChatGPTs のリンク。空なら「準備中」表示。
const CHATGPT_WALK_URL = "https://chatgpt.com/g/g-67efcfaf9e6481918ed2b6b3e2593819-kiyohuratuku";

export function ParallelWalk({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<"walk" | "paste" | "done" | "focus">("walk");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const t = summary.trim();
    if (!t) return;
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/walk-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: t }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? "保存できませんでした"); return; }
      setPhase("done");
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pwalk">
      <button className="singa-back" onClick={onBack}>← 地図にもどる</button>

      {phase === "walk" && (
        <div className="pwalk-card">
          <div className="pwalk-glow" />
          <div className="pwalk-sub">PARALLEL WALK</div>
          <h1>いってらっしゃい 🌅</h1>
          <p className="pwalk-lead">
            じゃあ——きみの<b>理想の未来</b>を、たくさん語ってきて。<br />
            上を見ながら歩いて、その<b>体の感覚</b>を、ちゃんと体に落としてきてね。<br />
            <span className="pwalk-small">本当の自分がつくりたい世界を、見てきて。</span>
          </p>

          {CHATGPT_WALK_URL ? (
            <a className="pwalk-go is-chat" href={CHATGPT_WALK_URL} target="_blank" rel="noreferrer">
              💬 ChatGPTでパラレルウォークする
            </a>
          ) : (
            <div className="pwalk-prep">💬 ChatGPTのリンクは準備中です（もうすぐ）</div>
          )}

          <p className="pwalk-note">
            🌧 雨の日など、外を歩けないときは、その場でとりあえず<b>喋り続けるだけでもOK！</b>
          </p>

          <button className="pwalk-done" onClick={() => setPhase("paste")}>
            終わった
          </button>
        </div>
      )}

      {phase === "paste" && (
        <div className="pwalk-card">
          <div className="pwalk-sub">おかえり</div>
          <h1>今日のパラレルウォークを残そう</h1>
          <p className="pwalk-lead">
            ChatGPT の最後にまとめてもらった<b>要約</b>を、そのまま貼り付けてね。
          </p>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={6}
            placeholder="ここに、ChatGPTの要約を貼り付け…"
            className="pwalk-paste"
            autoFocus
          />
          {err && <div className="pwalk-err">{err}</div>}
          <div className="pwalk-row">
            {CHATGPT_WALK_URL && (
              <a className="pwalk-done" href={CHATGPT_WALK_URL} target="_blank" rel="noreferrer">💬 ChatGPTに戻る</a>
            )}
            <button className="pwalk-go" disabled={!summary.trim() || saving} onClick={save}>
              {saving ? "保存中…" : "保存する"}
            </button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="pwalk-card">
          <div className="pwalk-glow" />
          <div className="pwalk-sub">おつかれさま 🌱</div>
          <h1>歩いてみて、今どう？</h1>
          <p className="pwalk-lead">
            さっきと比べて、今の状態はどのへん？<br />
            <span className="pwalk-small">歩く前と後で、どう変わったか見てみよう。</span>
          </p>
          <StateRecheck />
          <button className="pwalk-go" onClick={() => setPhase("focus")}>→ 最後に、今日の1つを決める</button>
        </div>
      )}

      {phase === "focus" && (
        <FocusStep onBack={onBack} />
      )}
    </div>
  );
}

/**
 * 歩いたあと、その理想を「今日1日」に落とす最後のひと手間。
 * ① 今日どんな感情でいようと思う？ ② その理想を今日に入れる、ちっちゃな最優先の一歩は？
 * → 今日のフォーカスとして保存し、最優先はタスク（リアルバース）にも入れる。
 */
const EMOTION_CHIPS = ["安心", "ワクワク", "満たされてる", "落ち着き", "軽やか", "自信", "感謝", "楽しい"];

function FocusStep({ onBack }: { onBack: () => void }) {
  const [emotion, setEmotion] = useState("");
  const [priority, setPriority] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      <div className="pwalk-card">
        <div className="pwalk-glow" />
        <div className="pwalk-sub">決まったね 🌱</div>
        <h1>今日は、これでいこう</h1>
        <p className="pwalk-lead">
          {emotion && <>今日の感情は <b>{emotion}</b>。<br /></>}
          {priority && <>最優先の一歩「<b>{priority}</b>」は、<br />リアルバースの今日のタスクに入れておいたよ。</>}
        </p>
        <button className="pwalk-done" onClick={onBack}>地図にもどる</button>
      </div>
    );
  }

  return (
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
        <button className="pwalk-done" onClick={onBack}>スキップ</button>
        <button className="pwalk-go" disabled={saving || (!emotion.trim() && !priority.trim())} onClick={save}>
          {saving ? "保存中…" : "今日のタスクに入れる"}
        </button>
      </div>
    </div>
  );
}

/** ワーク後の状態チェック（さっき→今の変化） */
function StateRecheck() {
  const [last, setLast] = useState<number | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/emotions").then((r) => r.json()).then((d) => setLast(d?.last?.level ?? null)).catch(() => {});
  }, []);

  async function choose(n: number) {
    setPick(n);
    setSaved(false);
    try {
      await fetch("/api/emotions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: n }),
      });
      setSaved(true);
    } catch { /* 保存に失敗しても表示はする */ }
  }

  return (
    <div className="pwalk-recheck">
      <EmotionMeter value={pick} onChange={choose} title="今の状態" />
      {pick != null && (
        <div className="pwalk-change">
          {last != null ? (
            <>さっきは<b>{emoName(last)}</b> → 今は<b>{emoName(pick)}</b>{saved ? "　記録したよ🌱" : ""}</>
          ) : (
            <>今は<b>{emoName(pick)}</b>{saved ? "　記録したよ🌱" : ""}</>
          )}
        </div>
      )}
    </div>
  );
}
