"use client";

import { useEffect, useState } from "react";

/**
 * 「この頃のわたし」— 蓄積データからの変化のふりかえり。
 * 変わってきたことを証拠から返す＝「無理」の反証を積む画面。
 */
type Glance = {
  walkCount7: number;
  emotionTrend: string;
  quests: number;
  doneQuests: number;
  taskTotal: number;
  recentEmotions: number[];
  generatedAt: string;
};

function emoColor(n: number): string {
  const t = Math.max(0, Math.min(1, (n - 1) / 9));
  const stops = [[63, 174, 90], [230, 200, 50], [232, 140, 42], [214, 60, 50]];
  const seg = Math.min(2, Math.floor(t * 3));
  const u = t * 3 - seg;
  const a = stops[seg], b = stops[seg + 1];
  const l = (i: number) => Math.round(a[i] + (b[i] - a[i]) * u);
  return `rgb(${l(0)},${l(1)},${l(2)})`;
}

export function ReportScreen({ guideName, avatarUrl, onBack }: { guideName: string; avatarUrl: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState("");
  const [glance, setGlance] = useState<Glance | null>(null);
  const [empty, setEmpty] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/report")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setErr(d.error); return; }
        if (d.empty) { setEmpty(true); return; }
        setReport(d.report ?? "");
        setGlance(d.glance ?? null);
      })
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
            <div className="rep-sub">この頃のわたし</div>
            <div className="rep-who">{guideName} より</div>
          </div>
        </div>

        {loading && <div className="rep-loading">これまでの記録を読んでいる…</div>}
        {err && <div className="rep-err">{err}</div>}
        {empty && (
          <p className="rep-empty">
            まだ記録が少ないよ。あと何日か歩いたら、ここが読めるようになる📖<br />
            気分をタップしたり、パラレルウォークをすると、きみの「変化」が溜まっていくよ🌱
          </p>
        )}

        {!loading && report && (
          <>
            <p className="rep-body">{report}</p>

            {/* 数字は「意味が出るもの」だけ。ゼロや空は出さない（顧客を迷わせない） */}
            {glance && (glance.recentEmotions.length >= 3 || glance.walkCount7 > 0 || glance.quests > 0) && (
              <div className="rep-glance">
                {glance.recentEmotions.length >= 3 && (
                  <div className="rep-stat">
                    <span className="k">心の状態の流れ（左が前、右が今）</span>
                    <span className="bars">
                      {glance.recentEmotions.map((n, i) => (
                        <span key={i} style={{ height: `${n * 10}%`, background: emoColor(n) }} />
                      ))}
                    </span>
                  </div>
                )}
                <div className="rep-nums">
                  {glance.walkCount7 > 0 && <span>今週 歩いた <b>{glance.walkCount7}</b> 回</span>}
                  {glance.quests > 0 && <span>やってみたいこと <b>{glance.quests}</b></span>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
