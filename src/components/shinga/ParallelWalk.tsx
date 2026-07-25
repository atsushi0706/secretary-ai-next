"use client";

import { useState } from "react";

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
  const [phase, setPhase] = useState<"walk" | "paste" | "done">("walk");
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
