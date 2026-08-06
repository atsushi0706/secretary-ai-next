"use client";

/**
 * 速学力プレゼント企画のポイント。清瀬リンクの右上に出す。
 *
 * 【見せ方の考え】
 * ・ふだんは**数字と残り日数だけ**。小さく光っているだけにする
 *   （毎回大きな説明が出ると、ワークより企画が前に出てしまう）
 * ・押すと、何で何点入ったかの内訳と、企画の中身がひらく
 * ・内訳を見せるのは、**説明できる仕組みにしてあるから**。
 *   ポイントは記録から数え直しているので、いつでも「なぜこの点数か」を出せる。
 */
import { useCallback, useEffect, useState } from "react";

type Breakdown = { label: string; points: number };
type DayPoints = { date: string; points: number; raw: number; capped: boolean };
type Rule = { label: string; points: string; note?: string };
type Data = {
  campaign: { name: string; from: string; to: string; prize: string };
  daysLeft: number;
  dailyCap: number;
  rules: Rule[];
  total: number;
  days: number;
  breakdown: Breakdown[];
  byDay: DayPoints[];
  trimmed: number;
};

const md = (d: string) => d.slice(5).replace("-", "/");

export function PointsBadge() {
  const [d, setD] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    fetch("/api/points")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && !j.error) setD(j); })
      .catch(() => { /* 出せなくても、ワークの邪魔はしない */ });
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!d) return null;

  return (
    <>
      <button className="pb" onClick={() => { setOpen(true); load(); }}
        title="速学力プレゼント企画のポイント">
        <span className="pb-spark">✦</span>
        <span className="pb-num">{d.total}</span>
        <span className="pb-unit">pt</span>
        {d.daysLeft > 0 && <span className="pb-left">あと{d.daysLeft}日</span>}
      </button>

      {open && (
        <div className="pb-sheet" onClick={() => setOpen(false)}>
          <div className="pb-card" onClick={(e) => e.stopPropagation()}>
            <button className="pb-x" onClick={() => setOpen(false)}>×</button>

            <div className="pb-head">
              <div className="pb-en">SOKUGAKURYOKU</div>
              <div className="pb-ja">速学力プレゼント企画</div>
              <div className="pb-when">
                {md(d.campaign.from)} 〜 {md(d.campaign.to)}
                {d.daysLeft > 0 ? `　のこり${d.daysLeft}日` : "　終了しました"}
              </div>
            </div>

            <div className="pb-big">
              <strong>{d.total}</strong><span>pt</span>
              <em>{d.days}日ぶん</em>
            </div>

            <div className="pb-prize">
              🎁 {d.campaign.prize}
            </div>

            <p className="pb-lead">
              学んだことや、もう持っている力を、<b>最速で自分の力に変える</b>ためのメソッドだよ。<br />
              AIとの会話やワークへの挑戦が、そのままポイントになる。
              どんどん自分の内側と向き合って、使い倒してみて。
            </p>

            {/*
              何をすると増えるのか。ここがいちばん先に要る。
              分からないと、そもそもやる気にならないので、内訳より上に置く。
            */}
            <div className="pb-t">どうすると増える？</div>
            <div className="pb-rules">
              {(d.rules ?? []).map((r, i) => (
                <div key={i} className={`pb-rule ${i < 3 ? "is-top" : ""}`}>
                  <span className="l">
                    {r.label}
                    {r.note && <small>{r.note}</small>}
                  </span>
                  <span className="p">{r.points}</span>
                </div>
              ))}
              <div className="pb-rule is-cap">
                <span className="l">1日に入るのは、ぜんぶ合わせて<b>{d.dailyCap}pt</b>まで
                  <small>まとめて詰め込むより、毎日ちょっとずつのほうが伸びる</small></span>
              </div>
            </div>

            {d.breakdown.length > 0 ? (
              <>
                <div className="pb-t">何で入ったか</div>
                <div className="pb-list">
                  {d.breakdown.map((b, i) => (
                    <div key={i} className="pb-row">
                      <span className="l">{b.label}</span>
                      <span className="p">+{b.points}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="pb-lead">
                まだ0ptだよ。どの部屋でもいいから、ひとつ話してみて。
              </p>
            )}

            {/* 上限で削ったぶんは、黙って消さずに書く */}
            {d.trimmed > 0 && (
              <p className="pb-note">
                1日に入るのは{d.dailyCap}ptまでにしてあるから、
                合計{d.trimmed}ptぶんは上限で外れてる。
                <b>まとめて詰め込むより、毎日ちょっとずつのほうが伸びるよ。</b>
              </p>
            )}

            {d.byDay.length > 0 && (
              <>
                <div className="pb-t">日ごと</div>
                <div className="pb-days">
                  {d.byDay.slice(-14).map((x) => (
                    <span key={x.date} className={`pb-day ${x.capped ? "is-cap" : ""}`}>
                      <b>{x.points}</b><small>{md(x.date)}</small>
                    </span>
                  ))}
                </div>
              </>
            )}

            <p className="pb-note">
              ポイントは、残っている記録から毎回数え直してるよ。
              だから、あとから増やしたり減らしたりはできない。
            </p>
          </div>
        </div>
      )}
    </>
  );
}
