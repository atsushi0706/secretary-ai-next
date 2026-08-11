"use client";

/**
 * おぼえていること（記憶の棚）。
 *
 * GPTの「メモリ」と同じ立ち位置：
 * ・AIが会話から覚えた「続く事実」が並ぶ（時間で上書きされる）
 * ・本人がいつでも見られる・消せる（消したものは二度と使われない）
 * ・「いま整理する」で、覚える・上書き・忘れるを手動でもまわせる
 */
import { useEffect, useState } from "react";

type Mem = { id: string; kind: string; fact: string; updated_at: string };
const KIND_JA: Record<string, string> = {
  work: "仕事", person: "人", health: "からだ", habit: "習慣",
  like: "好み", plan: "進行中", other: "その他",
};

export function MemoryVault() {
  const [mems, setMems] = useState<Mem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sql, setSql] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    try {
      const r = await fetch("/api/memory");
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "読めなかった"); setSql(d.sql || ""); return; }
      setErr(""); setSql("");
      setMems(d.memories ?? []);
    } catch (e: any) { setErr(String(e?.message ?? e)); setMems([]); }
  }
  useEffect(() => { void load(); }, []);

  async function refresh() {
    if (busy) return;
    setBusy(true); setNote("");
    try {
      const r = await fetch("/api/memory", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "整理できなかった"); setSql(d.sql || ""); return; }
      setMems(d.memories ?? []);
      setNote(d.ran
        ? `整理した：おぼえた ${d.added}・上書き ${d.updated}・忘れた ${d.forgotten}`
        : "最近の会話が無いので、いまは整理するものが無かった");
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  async function forget(id: string) {
    // 消すのは戻せないので、一度だけ確かめる
    if (!confirm("これを忘れさせる？（もう会話で使われなくなるよ）")) return;
    try {
      await fetch(`/api/memory?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setMems((p) => (p ?? []).filter((m) => m.id !== id));
    } catch { /* 消えなくても一覧は生きている */ }
  }

  return (
    <div className="mem">
      <p className="mem-lead">
        会話から覚えた「続くこと」がここに並ぶよ。新しいことが分かったら<b>上書き</b>される。<br />
        消したものは、もう会話で使われない。
      </p>

      {err && (
        <div className="mem-err">
          {err}
          {sql && <details><summary>先にSupabaseで表を作る必要があります（押すとSQL）</summary><pre>{sql}</pre></details>}
        </div>
      )}
      {note && <div className="mem-note">{note}</div>}

      <button className="mem-refresh" disabled={busy} onClick={() => void refresh()}>
        {busy ? "整理しています…" : "🧠 いま整理する（覚える・上書き・忘れる）"}
      </button>

      {mems === null && <div className="mem-empty">読みこんでいます…</div>}
      {mems?.length === 0 && !err && (
        <div className="mem-empty">まだ何も覚えていない。話していくうちに、ここに増えていくよ。</div>
      )}
      <div className="mem-list">
        {mems?.map((m) => (
          <div key={m.id} className="mem-item">
            <span className="kind">{KIND_JA[m.kind] ?? "その他"}</span>
            <span className="fact">{m.fact}</span>
            <button className="del" onClick={() => void forget(m.id)} aria-label="これを忘れる">忘れる</button>
          </div>
        ))}
      </div>
    </div>
  );
}
