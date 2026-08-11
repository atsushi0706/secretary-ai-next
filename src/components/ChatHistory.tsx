"use client";

/**
 * チャットの記録（読むだけの保管庫）。
 *
 * ChatGPT のサイドバーと同じ形：
 *   左＝一覧（日付ごとに、どの部屋で何を話し始めたか）／右＝その中身。
 * スマホは1画面ずつ（一覧 → 開く → ←で一覧へ）。
 *
 * ここから話しかけることはできない。**読むだけ**。
 * 続きを話したくなったら、その部屋へ行けばいい（会話はぜんぶ今日の履歴に繋がっている）。
 */
import { useEffect, useState } from "react";

type Session = { key: string; date: string; room: string; roomJa: string; count: number; title: string };
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

  useEffect(() => {
    fetch("/api/history").then((r) => r.json()).then((d) => {
      if (d.error) setErr(d.error);
      setSessions(d.sessions ?? []);
    }).catch((e) => { setErr(String(e?.message ?? e)); setSessions([]); });
  }, []);

  async function open(s: Session) {
    setSel(s); setMsgs(null); setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/history?key=${encodeURIComponent(s.key)}`);
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "開けなかった"); return; }
      setMsgs(d.messages ?? []);
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
        {sessions === null && <div className="chx-note">読みこんでいます…</div>}
        {sessions?.length === 0 && (
          <div className="chx-note">まだ記録がない。どこかの部屋で話すと、ここに残っていくよ。</div>
        )}
        {byDay.map((d) => (
          <div key={d.date} className="chx-day">
            <div className="chx-day-h">{dayLabel(d.date)}</div>
            {d.items.map((s) => (
              <button key={s.key} className={`chx-item ${sel?.key === s.key ? "is-on" : ""}`}
                onClick={() => void open(s)}>
                <span className="room">{s.roomJa}</span>
                <span className="title">{s.title || "（ひとことも残っていない）"}</span>
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
            ここは読むだけの場所。続きを話したくなったら、その部屋へ。
          </div>
        )}
      </div>
    </div>
  );
}
