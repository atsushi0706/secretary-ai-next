"use client";

/**
 * からだの記録（毎朝の体重・体脂肪率）。
 *
 * 入れるのは2つだけ、小数第2位まで。朝いちで10秒で終わることを最優先にする。
 * 見せ方の芯：
 *  - 前日差ではなく **7日平均** を主役に。水分で±1kgは普通に動くので、
 *    日々の上下で一喜一憂させない
 *  - 増えた日を責めない。線だけ淡々と見せる
 */
import { useCallback, useEffect, useMemo, useState } from "react";

type Day = { date: string; weight: number | null; fat: number | null };
type StepDay = { date: string; steps: number };
type StepSum = {
  today: number; streak: number; bestStreak: number; total: number; days: number;
  best: { date: string; steps: number } | null;
  history: StepDay[];
  next: { label: string; at: number; left: number } | null;
};
type Summary = {
  today: Day | null; yesterday: Day | null;
  avg7: { weight: number | null; fat: number | null };
  prevAvg7: { weight: number | null; fat: number | null };
  days: number; streak: number;
  lightest: { date: string; weight: number } | null;
  since: { date: string; weight: number } | null;
  history: Day[];
  needsMigration?: boolean;
};

const fmt = (v: number | null | undefined, unit: string) =>
  typeof v === "number" ? `${v.toFixed(2)}${unit}` : "—";

function todayStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export function WeightPanel({ guideName, avatarUrl, onBack }: {
  guideName: string; avatarUrl: string; onBack: () => void;
}) {
  const [sum, setSum] = useState<Summary | null>(null);
  const [w, setW] = useState("");
  const [f, setF] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [range, setRange] = useState<30 | 90 | 180>(30);
  // 歩数もここで見られるようにする（朝ここを開けば、からだの数字が全部そろう）
  const [steps, setSteps] = useState<StepSum | null>(null);

  const load = useCallback(() => {
    fetch("/api/weight").then((r) => r.json()).then((d: any) => {
      if (d?.error) { setErr(d.error === "unauthenticated" ? "ログインが切れているみたい。開き直してね。" : String(d.error)); return; }
      setSum(d as Summary);
      if (d.today?.weight != null) setW(String(d.today.weight));
      if (d.today?.fat != null) setF(String(d.today.fat));
    }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/steps").then((r) => r.json()).then((d: any) => {
      if (!d?.error) setSteps(d as StepSum);
    }).catch(() => {});
  }, []);

  async function save() {
    setBusy(true); setErr(""); setMsg("");
    try {
      const r = await fetch("/api/weight", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayStr(), weight: w || null, fat: f || null }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "保存できなかった");
      setSum(d);
      // 保存された値を欄に戻す。画面の数字と、貯まっている数字を必ず一致させる
      setW(d.today?.weight != null ? String(d.today.weight) : "");
      setF(d.today?.fat != null ? String(d.today.fat) : "");
      setMsg("記録したよ。おつかれさま。");
      setTimeout(() => setMsg(""), 2600);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  // 7日平均の動き（主役）
  const trend = useMemo(() => {
    const a = sum?.avg7?.weight, p = sum?.prevAvg7?.weight;
    if (typeof a !== "number" || typeof p !== "number") return null;
    return Math.round((a - p) * 100) / 100;
  }, [sum]);

  const days = useMemo(() => (sum?.history ?? []).slice(0, range).reverse(), [sum, range]);

  /**
   * 体重と体脂肪率を、同じ枠に重ねて描く。
   *
   * kg と % は数の大きさが違うので、**それぞれ自分の幅**で上下いっぱいに伸ばす。
   * だから縦軸に共通の目盛りは無い。前は目盛りの上端・下端（68.7 / 67.8）を
   * 左右に並べていて、横軸の日付のように見えて意味が通らなかった。
   * 見るべきなのは数字の目盛りではなく「線の向き」と「実際の値」なので、
   * 値は線の最後に直接そえる。
   */
  function series(pick: (d: Day) => number | null) {
    const vs = days.map(pick).filter((v): v is number => typeof v === "number");
    if (vs.length < 2) return null;
    const min = Math.min(...vs), max = Math.max(...vs);
    const pad = Math.max(0.4, (max - min) * 0.18);
    const lo = min - pad, hi = max + pad;
    const pts = days.map((d, i) => {
      const v = pick(d);
      if (typeof v !== "number") return null;
      return {
        x: (i / Math.max(1, days.length - 1)) * 100,
        y: 100 - ((v - lo) / (hi - lo)) * 100,
        v, date: d.date,
      };
    }).filter(Boolean) as { x: number; y: number; v: number; date: string }[];
    return { pts, min, max, first: pts[0], last: pts[pts.length - 1] };
  }
  const wChart = useMemo(() => series((d) => d.weight), [days]);
  const fChart = useMemo(() => series((d) => d.fat), [days]);
  const hasChart = !!(wChart || fChart);

  return (
    <div className="wt-screen">
      <button className="singa-back" onClick={onBack}>← 地図にもどる</button>
      <div className="wt-card">
        <div className="rep-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="singa-face" src={avatarUrl} alt={guideName} />
          <div><div className="rep-sub">からだの記録</div><div className="rep-who">毎朝、数字を1つ置いていく</div></div>
        </div>

        {sum?.needsMigration && <p className="wt-err">記録の保存先がまだ作られていません（weight_logs）。</p>}

        {/* 入力：ここが主役。10秒で終わるように */}
        <div className="wt-input">
          <div className="wt-day">{todayStr()}{sum?.today ? " ・記録ずみ（上書きできます）" : ""}</div>
          <div className="wt-fields">
            <label>
              <span className="k">体重</span>
              <input type="number" inputMode="decimal" step="0.01" placeholder="62.35"
                value={w} onChange={(e) => setW(e.target.value)} />
              <span className="u">kg</span>
            </label>
            <label>
              <span className="k">体脂肪率</span>
              <input type="number" inputMode="decimal" step="0.01" placeholder="18.40"
                value={f} onChange={(e) => setF(e.target.value)} />
              <span className="u">%</span>
            </label>
          </div>
          {err && <p className="wt-err">{err}</p>}
          {msg && <p className="wt-ok">{msg}</p>}
          <button className="wt-save" onClick={() => void save()} disabled={busy || (!w && !f)}>
            {busy ? "記録中…" : sum?.today ? "この内容で上書きする" : "今日の数字を記録する"}
          </button>
          <p className="wt-hint">
            ※ 朝いちばん、トイレのあと・食事の前がいちばんブレません。<br />
            ※ 小数点以下2桁まで入れられます（例：62.35）
          </p>
        </div>

        {/* 7日平均が主役。日々の上下で一喜一憂しないため */}
        <div className="wt-stats">
          <div className="wt-stat is-main">
            <span className="k">7日平均</span>
            <b>{fmt(sum?.avg7?.weight, "")}</b><span className="u">kg</span>
            {trend != null && (
              <span className={`t ${trend < 0 ? "down" : trend > 0 ? "up" : ""}`}>
                {trend > 0 ? "+" : ""}{trend.toFixed(2)}
              </span>
            )}
          </div>
          <div className="wt-stat">
            <span className="k">体脂肪 7日平均</span>
            <b>{fmt(sum?.avg7?.fat, "")}</b><span className="u">%</span>
          </div>
          <div className="wt-stat">
            <span className="k">連続</span><b>{sum?.streak ?? 0}</b><span className="u">日</span>
          </div>
          <div className="wt-stat">
            <span className="k">記録した日</span><b>{sum?.days ?? 0}</b><span className="u">日</span>
          </div>
        </div>

        {trend != null && (
          <p className="wt-read">
            {trend <= -0.1 ? "先週より、線がゆっくり下を向いてる。" :
             trend >= 0.1 ? "先週より少し上。水分や食事のタイミングでも動くから、線で見ていこう。" :
             "先週とほぼ同じ。保てているのも、ちゃんとした結果。"}
          </p>
        )}

        {/* 線グラフ */}
        <div className="wt-chartwrap">
          <div className="wt-range">
            {([30, 90, 180] as const).map((n) => (
              <button key={n} className={range === n ? "on" : ""} onClick={() => setRange(n)}>{n}日</button>
            ))}
          </div>
          {!hasChart ? (
            <p className="wt-empty">2日ぶん記録すると、ここに線が出るよ。</p>
          ) : (
            <>
              <MiniChart title="体重" unit="kg" tone="w" s={wChart} />
              <MiniChart title="体脂肪率" unit="%" tone="f" s={fChart} />
              <p className="wt-axis-note">
                ※ 高さの目盛りは出していない。日々の増減は水分でも動くから、
                見るのは<b>線の向き</b>と、いまの数字。
              </p>
            </>
          )}
        </div>

        {(sum?.lightest || sum?.since) && (
          <div className="wt-marks">
            {sum?.lightest && <div>いちばん軽かった日：{sum.lightest.date.slice(5)}　{sum.lightest.weight.toFixed(2)}kg</div>}
            {sum?.since && sum.avg7?.weight != null && (
              <div>
                はじめた日（{sum.since.date.slice(5)}）から：
                <b>{(sum.avg7!.weight! - sum.since.weight > 0 ? "+" : "")}{(sum.avg7!.weight! - sum.since.weight).toFixed(2)}kg</b>
              </div>
            )}
          </div>
        )}

        {/* 歩数（散歩のおともで自動でたまるぶん） */}
        <StepsSection steps={steps} range={range} />

        {/* 過去の記録 */}
        {(sum?.history?.length ?? 0) > 0 && (
          <details className="wt-log">
            <summary>これまでの記録（{sum!.history.length}日ぶん）</summary>
            <div className="wt-rows">
              {sum!.history.map((d) => (
                <div key={d.date} className="wt-row">
                  <span className="d">{d.date.slice(5)}</span>
                  <span className="w">{fmt(d.weight, "kg")}</span>
                  <span className="f">{fmt(d.fat, "%")}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

type Pt = { x: number; y: number; v: number; date: string };
type Series = { pts: Pt[]; min: number; max: number; first: Pt; last: Pt } | null;

/**
 * 1つの数字ぶんの小さな折れ線。
 *
 * 体重と体脂肪は単位が違うので、重ねずに1本ずつ描く。
 * 縦軸の数字は出さない——前は上限・下限（68.7 / 67.8）を左右に並べていて、
 * 横軸の日付のように見えてしまい、何の数字か分からなくなっていた。
 * 代わりに「いまの値」を大きく、「動いた幅」を小さく、日付を横軸に出す。
 */
function MiniChart({ title, unit, tone, s }: { title: string; unit: string; tone: "w" | "f"; s: Series }) {
  if (!s) {
    return (
      <div className={`wt-mini is-${tone}`}>
        <div className="wm-head"><span className="wm-title">{title}</span>
          <span className="wm-none">2日ぶん記録すると、線が出るよ</span></div>
      </div>
    );
  }
  const diff = Math.round((s.last.v - s.first.v) * 100) / 100;
  const color = tone === "w" ? "#eed69b" : "#7fc4d8";
  return (
    <div className={`wt-mini is-${tone}`}>
      <div className="wm-head">
        <span className="wm-title">{title}</span>
        <span className="wm-now"><b>{s.last.v.toFixed(2)}</b>{unit}</span>
        <span className={`wm-diff ${diff < 0 ? "down" : diff > 0 ? "up" : ""}`}>
          {diff > 0 ? "+" : ""}{diff.toFixed(2)}{unit}
        </span>
      </div>
      <svg className="wt-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={s.pts.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <circle cx={s.last.x} cy={s.last.y} r="2" fill={color} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="wt-axis">
        <span>{s.first.date.slice(5).replace("-", "/")}</span>
        <span className="wm-band">この間 {s.min.toFixed(1)}〜{s.max.toFixed(1)}{unit}</span>
        <span>今日</span>
      </div>
    </div>
  );
}

/** 歩数のふりかえり。パラレルウォークで自動でたまったぶんが、ここに積み上がる */
function StepsSection({ steps, range }: { steps: StepSum | null; range: 30 | 90 | 180 }) {
  const days = ((steps?.history ?? []).slice(0, range)).reverse();
  const max = Math.max(3000, ...days.map((d) => d.steps));
  const md = (s: string) => s.slice(5).replace("-", "/");

  return (
    <div className="wt-steps">
      <div className="ws-head">
        <span className="ws-title">👟 歩数</span>
        {steps && steps.streak > 0 && <span className="ws-streak">🔥 {steps.streak}日つづけて</span>}
      </div>

      <div className="wt-stats">
        <div className="wt-stat is-main">
          <span className="k">今日</span>
          <b>{(steps?.today ?? 0).toLocaleString()}</b><span className="u">歩</span>
          {steps?.next && (
            <span className="t">「{steps.next.label}」まで あと{steps.next.left.toLocaleString()}</span>
          )}
        </div>
        <div className="wt-stat">
          <span className="k">歩いた日</span><b>{steps?.days ?? 0}</b><span className="u">日</span>
        </div>
        <div className="wt-stat">
          <span className="k">累計</span><b>{(steps?.total ?? 0).toLocaleString()}</b><span className="u">歩</span>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="wt-empty">パラレルウォークを歩くと、ここに積み上がっていくよ。</p>
      ) : (
        <>
          <div className="sc-chart" style={{ marginTop: 10 }}>
            {days.map((d) => (
              <span key={d.date} className="sc-col" title={`${d.date}　${d.steps.toLocaleString()}歩`}>
                <span className={`sc-colbar ${d.steps >= 3000 ? "is-goal" : ""}`}
                  style={{ height: `${Math.max(3, (d.steps / max) * 100)}%` }} />
              </span>
            ))}
          </div>
          <div className="wt-axis">
            <span>{days[0] ? md(days[0].date) : ""}</span><span>今日</span>
          </div>
          {steps?.best && (
            <div className="wt-marks">いちばん歩いた日：{md(steps.best.date)}　{steps.best.steps.toLocaleString()}歩</div>
          )}
        </>
      )}
    </div>
  );
}
