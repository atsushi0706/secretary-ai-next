"use client";

/**
 * チャットの記録（読むだけの保管庫）。
 *
 * ChatGPT のサイドバーと同じ形：
 *   左＝一覧（日付ごとに、どの部屋で何を話し始めたか）／右＝その中身。
 * スマホは1画面ずつ（一覧 → 開く → ←で一覧へ）。
 *
 * 読むだけの場所だが、ここから **その続きを話しはじめる** ことはできる。
 * （前は「落ちたら続きの帯を出す」形にしたが、毎回聞かれるのが煩わしいので、
 *   続きたいときにここから選ぶ形にした ——淳くん：基本一回でいい）
 *
 * 探すこともできる。「なに話したっけ」で見つけられないと、溜まっても使えない。
 */
import { useEffect, useState } from "react";

type Session = {
  key: string; date: string; room: string; roomJa: string; count: number; title: string;
  /** 探したとき、どこが当たったか */
  hit?: string;
};
type Msg = { role: string; content: string; at?: string };

/** 2026-08-11 → 8/11（月） */
function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return date;
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}（${w}）`;
}

export function ChatHistory() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [sel, setSel] = useState<Session | null>(null);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  /** この記録の続きから話せるか（話せるなら、どのワークか） */
  const [resume, setResume] = useState<string | null>(null);

  /*
   * 探す。打つたびに聞きに行くと騒がしいので、手が止まってから（300ms）。
   * 空にすると、ぜんぶの一覧に戻る。
   */
  const [q, setQ] = useState("");
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      const url = q.trim() ? `/api/history?q=${encodeURIComponent(q.trim())}` : "/api/history";
      fetch(url).then((r) => r.json()).then((d) => {
        if (!alive) return;
        if (d.error) setErr(d.error);
        setSessions(d.sessions ?? []);
      }).catch((e) => { if (alive) { setErr(String(e?.message ?? e)); setSessions([]); } });
    }, q.trim() ? 300 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  async function open(s: Session) {
    setSel(s); setMsgs(null); setBusy(true); setErr(""); setResume(null);
    try {
      const r = await fetch(`/api/history?key=${encodeURIComponent(s.key)}`);
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "開けなかった"); return; }
      setMsgs(d.messages ?? []);
      setResume(typeof d.resume === "string" ? d.resume : null);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  // 日付ごとの見出しを作る（一覧は新しい日が上で届く）
  const byDay: { date: string; items: Session[] }[] = [];
  for (const s of sessions ?? []) {
    const last = byDay[byDay.length - 1];
    if (last && last.date === s.date) last.items.push(s);
    else byDay.push({ date: s.date, items: [s] });
  }

  return (
    <div className={`chx ${sel ? "has-sel" : ""}`}>
      {/* 一覧（サイドバー） */}
      <div className="chx-list">
        <div className="chx-find">
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="なに話したっけ？（ことばで探す）"
            aria-label="記録の中を探す"
          />
          {q && <button onClick={() => setQ("")} aria-label="消す">×</button>}
        </div>
        {sessions === null && <div className="chx-note">読みこんでいます…</div>}
        {q.trim() && sessions?.length === 0 && (
          <div className="chx-note">「{q.trim()}」は見つからなかった。<br />別のことばでも試してみて。</div>
        )}
        {!q.trim() && sessions?.length === 0 && (
          <div className="chx-note">まだ記録がない。どこかの部屋で話すと、ここに残っていくよ。</div>
        )}
        {byDay.map((d) => (
          <div key={d.date} className="chx-day">
            <div className="chx-day-h">{dayLabel(d.date)}</div>
            {d.items.map((s) => (
              <button key={s.key} className={`chx-item ${sel?.key === s.key ? "is-on" : ""}`}
                onClick={() => void open(s)}>
                <span className="room">{s.roomJa}</span>
                <span className="title">{s.hit || s.title || "（ひとことも残っていない）"}</span>
                <span className="cnt">{s.count}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* 中身 */}
      <div className="chx-view">
        {sel ? (
          <>
            <div className="chx-view-h">
              {/* スマホでは一覧に戻る道が要る（画面が1つずつなので） */}
              <button className="chx-back" onClick={() => { setSel(null); setMsgs(null); }}>← 一覧</button>
              <div className="t">
                <b>{sel.roomJa}</b>
                <span>{dayLabel(sel.date)}</span>
              </div>
              {/* 続きを話したくなったとき、ここから、この会話を持ったまま部屋へ入れる */}
              {resume && msgs && msgs.length > 0 && (
                <button
                  className="chx-go"
                  onClick={() => {
                    try {
                      window.location.href =
                        `/shinga?open=${encodeURIComponent(resume)}&from=${encodeURIComponent(sel.key)}`;
                    } catch { /* ignore */ }
                  }}
                >この続きから話す →</button>
              )}
            </div>
            {err && <div className="chx-err">{err}</div>}
            {busy && <div className="chx-note">開いています…</div>}
            <div className="chx-msgs">
              {msgs?.map((m, i) => (
                <div key={i} className={`chx-line ${m.role === "user" ? "is-me" : ""}`}>
                  <p>{m.content}</p>
                </div>
              ))}
              {msgs?.length === 0 && <div className="chx-note">この日は、カードだけで言葉が残っていない。</div>}
            </div>
          </>
        ) : (
          <div className="chx-empty">
            左の一覧から選ぶと、ここに会話が出るよ。<br />
            続きを話したくなったら、開いたあとの「この続きから話す」から。
          </div>
        )}
      </div>
    </div>
  );
}
