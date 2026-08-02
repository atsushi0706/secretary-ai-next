"use client";

/**
 * 「今日のあなたの取扱説明書」。
 * アカシックレコーダーを開いた最初に、これが出る。
 *
 * 差出人は10年後の自分。だから演出は「未来から届く」向き：
 *   光の粒が集まる → 巻物がほどける → 見出し → よいこと2つ → 気をつけること1つ → 締め
 * 1枚ずつ順に立ち上がって、読む速度に合わせて意識が乗るようにしている。
 *
 * 読み終えたら、今日/今週/今月/今年/なんで今こうなの？ を選ぶか、そのまま話しかけられる。
 */
import { useEffect, useState } from "react";

export type ManualPoint = { title: string; body: string };
export type TodayManualData = {
  date: string;
  headline: string;
  good: ManualPoint[];
  care: ManualPoint;
  closing: string;
};

/** 読む流れに合わせて、順番に出す */
const REVEAL_MS = [0, 900, 1700, 2500, 3300, 4100];

export function TodayManual({
  guideName, avatarUrl, onPick, onClose,
}: {
  guideName: string;
  avatarUrl: string;
  /** 流れのボタンを選んだ（その言葉を清瀬リンクに聞く） */
  onPick: (label: string) => void;
  /** 説明書を閉じて、そのまま自由に話す */
  onClose: () => void;
}) {
  const [d, setD] = useState<TodayManualData | null>(null);
  const [err, setErr] = useState("");
  const [phase, setPhase] = useState(0);   // 何枚目まで出したか

  useEffect(() => {
    let alive = true;
    fetch("/api/today-manual")
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        if (res.error) { setErr(res.error); return; }
        setD(res.manual as TodayManualData);
      })
      .catch((e) => alive && setErr(String(e?.message ?? e)));
    return () => { alive = false; };
  }, []);

  // 届いたら、1枚ずつ立ち上げる
  useEffect(() => {
    if (!d) return;
    const timers = REVEAL_MS.map((ms, i) => setTimeout(() => setPhase(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [d]);

  const skip = () => setPhase(REVEAL_MS.length);
  const shown = (n: number) => phase > n;

  if (err) {
    return (
      <div className="tm-wrap">
        <div className="tm-err">
          今日の説明書が受け取れなかった：{err}
          <button className="tm-btn is-ghost" onClick={onClose}>そのまま話す</button>
        </div>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="tm-wrap">
        <div className="tm-loading">
          <span className="tm-spark" />
          <span className="tm-loading-t">10年後のきみから、今日の手引きが届いている…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tm-wrap" onClick={skip}>
      <div className="tm-scroll">
        {/* 差出人 */}
        <div className={`tm-from ${shown(0) ? "in" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tm-face" src={avatarUrl} alt={guideName} />
          <div>
            <div className="tm-kicker">10年後、理想が叶っているきみから</div>
            <div className="tm-title">今日のあなたの取扱説明書</div>
          </div>
        </div>

        {/* 見出し */}
        <div className={`tm-headline ${shown(1) ? "in" : ""}`}>{d.headline}</div>

        {/* よいこと2つ */}
        {d.good.map((g, i) => (
          <div key={i} className={`tm-card is-good ${shown(2 + i) ? "in" : ""}`}>
            <span className="tm-badge">{i === 0 ? "やってみるといい" : "この流れは、いい"}</span>
            <b>{g.title}</b>
            <p>{g.body}</p>
          </div>
        ))}

        {/* 気をつけること1つ */}
        <div className={`tm-card is-care ${shown(4) ? "in" : ""}`}>
          <span className="tm-badge">ひとつだけ、気をつけて</span>
          <b>{d.care.title}</b>
          <p>{d.care.body}</p>
        </div>

        {/* 締め */}
        <div className={`tm-closing ${shown(5) ? "in" : ""}`}>{d.closing}</div>

        {/* 読み終えたら、流れを選ぶ／そのまま話す */}
        <div className={`tm-next ${shown(5) ? "in" : ""}`} onClick={(e) => e.stopPropagation()}>
          <div className="tm-next-q">もっと知りたい流れがあれば、選んでみて。<br />そのまま話しかけてくれてもいいよ。</div>
          <div className="tm-flows">
            {["今日の流れ", "今週の流れ", "今月の流れ", "今年の流れ", "なんで今こうなの？"].map((label) => (
              <button key={label} className="tm-flow" onClick={() => onPick(label)}>{label}</button>
            ))}
          </div>
          <button className="tm-btn is-ghost" onClick={onClose}>閉じて、自由に話す</button>
        </div>
      </div>

      {phase < REVEAL_MS.length && <div className="tm-skip">タップで全部ひらく</div>}
    </div>
  );
}
