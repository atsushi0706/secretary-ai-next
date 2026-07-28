"use client";

import { useEffect, useState } from "react";
import { emoColor, emoName } from "./EmotionMeter";

/**
 * 1日の振り返り。今日の状態の「はじまり → いま」と、今日話したこと・歩いたことで締める。
 * ディープアイデンティティの代わりに置く。
 */
type Daily = {
  empty: boolean;
  start: { level: number } | null;
  now: { level: number } | null;
  count: number;
  closing: string;
  oneLine?: string;
};

export function DailyReflection({ guideName, avatarUrl, onBack }: { guideName: string; avatarUrl: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<Daily | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/daily")
      .then((r) => r.json())
      .then((data) => { if (data.error) setErr(data.error); else setD(data); })
      .catch((e) => setErr(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

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
        {d?.empty && (
          <p className="rep-empty">
            今日はまだ記録が少ないみたい。<br />
            状態をチェックしたり、少し話したりすると、一日の流れが見えてくるよ🌱
          </p>
        )}

        {d && !d.empty && (
          <>
            {d.start && d.now && (
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
            <p className="rep-body">{d.closing}</p>

            {/* 今日の1行カード（他人に語れる＝物語になる／コピーできる） */}
            {d.oneLine && (
              <div className="daily-oneline">
                <div className="ol-text">{d.oneLine}</div>
                <button className="ol-copy" onClick={() => { try { navigator.clipboard?.writeText(d.oneLine!); } catch { /* ignore */ } }}>
                  📋 コピー
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
