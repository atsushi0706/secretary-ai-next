"use client";

import { useCallback, useEffect, useState } from "react";
import { emoColor, emoName } from "./EmotionMeter";

/**
 * 1日の振り返り（夜20時の通知で開く場所）。
 *
 *  1. まず「今日はどんな一日だった？」を8種類から選ぶ（選び直せる）
 *  2. 今日の状態チェックの経過（何時に・どの状態だったか）を並べる
 *  3. 2回以上チェックしていたら「はじまり → いま」の矢印
 *  4. 締めのひとこと
 *
 * チェックしていないものは出さない。無いものを有るように見せない。
 */
type Check = { level: number; at: string; note: string };
type Kind = { kind: string; emoji: string; label: string; hint: string };
type Mark = { date: string; kind: string };
type Daily = {
  empty: boolean;
  start: { level: number } | null;
  now: { level: number } | null;
  count?: number;
  checks: Check[];
  dayKind: string | null;
  kinds: Kind[];
  marks: Mark[];
  closing?: string;
};

const hm = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const md = (s: string) => s.slice(5).replace("-", "/");

export function DailyReflection({ guideName, avatarUrl, onBack }: { guideName: string; avatarUrl: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<Daily | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/daily")
      .then((r) => r.json())
      .then((data) => { if (data.error) setErr(data.error); else { setErr(null); setD(data); } })
      .catch((e) => setErr(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function pickKind(kind: string) {
    if (saving) return;
    setSaving(true);
    try {
      const r = await fetch("/api/daily", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const res = await r.json();
      if (!r.ok) { setErr(res.error || "保存できなかった"); return; }
      load();   // 選んだ言葉を締めのひとことにも反映させる
    } finally { setSaving(false); }
  }

  const kinds = d?.kinds ?? [];
  const kindOf = (k: string) => kinds.find((x) => x.kind === k);

  return (
    <div className="rep">
      <button className="singa-back" onClick={onBack}>← 地図にもどる</button>
      <div className="rep-card">
        <div className="rep-head">
          <img className="singa-face" src={avatarUrl} alt={guideName} />
          <div>
            <div className="rep-sub">1日の振り返り</div>
            <div className="rep-who">{guideName} より</div>
          </div>
        </div>

        {loading && <div className="rep-loading">今日をふりかえっている…</div>}
        {err && <div className="rep-err">{err}</div>}

        {/* ① 今日はどんな一日だった？（未選択なら最初に。選んだあとも選び直せる） */}
        {!loading && d && (
          <div className="dk-sec">
            <div className="dk-q">{d.dayKind ? "今日はこんな一日" : "今日は、どんな一日だった？"}</div>
            <div className="dk-grid">
              {kinds.map((k) => (
                <button key={k.kind}
                  className={`dk-chip ${d.dayKind === k.kind ? "on" : ""}`}
                  disabled={saving}
                  onClick={() => void pickKind(k.kind)}>
                  <span className="e">{k.emoji}</span>
                  <span className="l">{k.label}</span>
                  <span className="h">{k.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ② 今日のチェックの経過（記録があるときだけ） */}
        {!loading && d && d.checks.length > 0 && (
          <div className="dk-timeline">
            <div className="dk-tl-title">今日のチェック（{d.checks.length}回）</div>
            {d.checks.map((c, i) => (
              <div key={i} className="dk-tl-row">
                <span className="t">{hm(c.at)}</span>
                <span className="dot" style={{ background: emoColor(c.level) }} />
                <span className="v">{emoName(c.level)}</span>
                {c.note && <span className="n">{c.note}</span>}
              </div>
            ))}
          </div>
        )}

        {/* ③ はじまり→いま（今日2回以上チェックしたときだけ。1回では変化は語れない） */}
        {!loading && d?.start && d?.now && (
          <div className="daily-arc">
            <div className="pt">
              <span className="dot" style={{ background: emoColor(d.start.level) }} />
              <span className="t">はじまり</span>
              <span className="v">{emoName(d.start.level)}</span>
            </div>
            <span className="arrow">→</span>
            <div className="pt">
              <span className="dot" style={{ background: emoColor(d.now.level) }} />
              <span className="t">いま</span>
              <span className="v">{emoName(d.now.level)}</span>
            </div>
          </div>
        )}

        {d?.empty && (
          <p className="rep-empty">
            今日はまだ記録が少ないみたい。<br />
            上の8つから「今日がどんな一日だったか」だけでも置いていってね🌱
          </p>
        )}

        {/* ④ 締めのひとこと */}
        {!loading && d && !d.empty && d.closing && <p className="rep-body">{d.closing}</p>}

        {/* ⑤ この一週間の並び（経過） */}
        {!loading && (d?.marks?.length ?? 0) > 0 && (
          <div className="dk-week">
            <div className="dk-tl-title">この頃の一日たち</div>
            <div className="dk-week-row">
              {[...d!.marks].reverse().map((m) => {
                const k = kindOf(m.kind);
                return (
                  <span key={m.date} className="dk-day" title={`${m.date} ${k?.label ?? ""}`}>
                    <span className="e">{k?.emoji ?? "・"}</span>
                    <span className="d">{md(m.date)}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
