"use client";

import { useState } from "react";

/**
 * パラレルウォーク（ChatGPTs 連携）。
 *
 * フロー:
 *  1. 「これから、どこへ行く？」で行き先を選ぶ（直感）。
 *  2. ChatGPT でパラレルウォークする（外部リンク）。
 *  3. 戻ってきたら「終わった」→ ChatGPT の要約を貼って保存。
 *  貼られた要約は蓄積され、いつ・どんなワークで・どう変化したかの記録になる。
 */

// ★ 淳くんの ChatGPTs のリンク（後で入れる）。空なら「準備中」表示。
const CHATGPT_WALK_URL = "";

const DESTINATIONS = [
  { emoji: "🌅", label: "海辺・水辺" },
  { emoji: "🌲", label: "森・自然の中" },
  { emoji: "🏙", label: "街・にぎやかな場所" },
  { emoji: "🏡", label: "家の近く・いつもの道" },
  { emoji: "🌧", label: "外に出られない（その場でOK）" },
];

export function ParallelWalk({ onBack }: { onBack: () => void }) {
  const [dest, setDest] = useState<string | null>(null);
  const [phase, setPhase] = useState<"choose" | "walk" | "paste" | "done">("choose");
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

      {phase === "choose" && (
        <div className="pwalk-card">
          <div className="pwalk-glow" />
          <div className="pwalk-sub">PARALLEL WALK</div>
          <h1>これから、どこへ行く？</h1>
          <p className="pwalk-lead">
            歩きながら、望む世界を声にする。<br />
            <b>理想の現実をつくりたいなら、パラレルウォークは絶対にやってね。</b>
          </p>
          <div className="pwalk-dests">
            {DESTINATIONS.map((d) => (
              <button
                key={d.label}
                className={`pwalk-dest ${dest === d.label ? "is-on" : ""}`}
                onClick={() => setDest(d.label)}
              >
                <span className="e">{d.emoji}</span>
                <span>{d.label}</span>
              </button>
            ))}
          </div>
          <p className="pwalk-note">
            🌧 雨の日など、外を歩けないときは、その場でとりあえず<b>喋り続けるだけでもOK！</b>
          </p>
          <button className="pwalk-go" disabled={!dest} onClick={() => setPhase("walk")}>
            この行き先で、はじめる →
          </button>
        </div>
      )}

      {phase === "walk" && (
        <div className="pwalk-card">
          <div className="pwalk-glow" />
          <div className="pwalk-sub">{dest}</div>
          <h1>歩きながら、話そう</h1>
          <p className="pwalk-lead">
            下のボタンから ChatGPT を開いて、パラレルウォークをはじめてね。<br />
            終わったら、ここに戻ってきて「終わった」を押して。
          </p>

          {CHATGPT_WALK_URL ? (
            <a className="pwalk-go is-chat" href={CHATGPT_WALK_URL} target="_blank" rel="noreferrer">
              💬 ChatGPTでパラレルウォークする
            </a>
          ) : (
            <div className="pwalk-prep">💬 ChatGPTのリンクは準備中です（もうすぐ）</div>
          )}

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
          <div className="pwalk-sub">保存しました</div>
          <h1>おつかれさま 🌱</h1>
          <p className="pwalk-lead">
            今日の歩きを記録したよ。こうやって溜まっていくと、<br />
            きみの変化がだんだん見えてくる。
          </p>
          <button className="pwalk-go" onClick={onBack}>地図にもどる</button>
        </div>
      )}
    </div>
  );
}
