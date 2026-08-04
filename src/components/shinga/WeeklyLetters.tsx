"use client";

/**
 * 週刊レポート（本人用）。
 * マスターが確認してOKを出したものだけがここに並ぶ。未承認のものは出ない。
 */
import { useEffect, useState } from "react";

type Weekly = { id: string; week_start: string; body: string };
const md = (s: string) => s.slice(5).replace("-", "/");

export function WeeklyLetters({ guideName, avatarUrl, onBack }: {
  guideName: string; avatarUrl: string; onBack: () => void;
}) {
  const [list, setList] = useState<Weekly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/weekly").then((r) => r.json())
      .then((d) => setList(Array.isArray(d.reports) ? d.reports : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rep">
      <button className="singa-back" onClick={onBack}>← 地図にもどる</button>
      <div className="rep-card">
        <div className="rep-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="singa-face" src={avatarUrl} alt={guideName} />
          <div>
            <div className="rep-sub">今週のふりかえり</div>
            <div className="rep-who">{guideName} より</div>
          </div>
        </div>

        {loading && <div className="rep-loading">手紙をひらいている…</div>}
        {!loading && list.length === 0 && (
          <p className="rep-empty">
            まだ届いた手紙はないよ。<br />
            毎週金曜に1週間ぶんをまとめて、届いたら通知でお知らせするね。
          </p>
        )}
        {list.map((w, i) => (
          <div key={w.id} className={`wk-letter ${i === 0 ? "is-new" : ""}`}>
            <div className="wk-week">{md(w.week_start)} の週{i === 0 ? "　（いちばん新しい）" : ""}</div>
            <p className="rep-body">{w.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
