"use client";

/**
 * 影獣の鏡：画面部品。
 *
 *  - ShadowGate       … 入口。しくみと約束ごとを見せて、最初に安全をたしかめる
 *  - ShadowProgress   … ワーク中の段階表示（1〜9）
 *  - ShadowEmblem     … 影／光の紋章（専用画像が来るまでのCSS紋章）
 *  - ShadowCardReveal … 光を回収できたときの完成カード
 *
 * 大事な順番：内省より先に、現実の安全。
 * ゲートで「いま危険がある」が選ばれたら、ワークには入らず窓口を出す。
 */
import { useState } from "react";
import { SHADOW_PAIRS, SHADOW_STEPS, type ShadowCard, type ShadowPair } from "@/lib/shadow";

export type ShadowSafety = "normal" | "boundary";

/* ── 紋章（画像が無い間の顔）── */
export function ShadowEmblem({ pair, lit, size = 72 }: { pair: ShadowPair; lit: boolean; size?: number }) {
  return (
    <span
      className={`sm-emblem ${lit ? "is-light" : "is-shadow"}`}
      style={{ ["--sc" as any]: pair.hue, width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {pair.emoji}
    </span>
  );
}

/* ── 入口：しくみ → 安全のたしかめ ── */
export function ShadowGate({ onStart, onLeave }: {
  onStart: (safety: ShadowSafety) => void;
  onLeave: () => void;
}) {
  const [danger, setDanger] = useState(false);

  if (danger) {
    return (
      <div className="sm-gate">
        <div className="sm-gate-head">
          <h2>まず、きみの安全がいちばん</h2>
          <p className="sm-lead">
            いま危険が続いているなら、心のワークはやらない。<br />
            それはきみのせいじゃないし、後回しにしていいものでもないから。
          </p>
        </div>
        <div className="sm-crisis">
          <div className="sm-crisis-row"><b>緊急のとき</b><span>110（警察）／119（救急）</span></div>
          <div className="sm-crisis-row"><b>警察相談</b><span>#9110</span></div>
          <div className="sm-crisis-row"><b>DV相談ナビ</b><span>#8008（最寄りの窓口へ）</span></div>
          <div className="sm-crisis-row"><b>よりそいホットライン</b><span>0120-279-338（24時間・無料）</span></div>
          <div className="sm-crisis-row"><b>#いのちSOS</b><span>0120-061-338（24時間）</span></div>
        </div>
        <p className="sm-note">
          できること：記録を残す（日時・言われたこと・見た人）／物理的に距離を取る／信頼できる人に話す。<br />
          このアプリは医療・カウンセリング・法律相談の代わりにはなれません。
        </p>
        <div className="sm-gate-btns">
          <button className="sm-btn is-ghost" onClick={onLeave}>地図にもどる</button>
          <button className="sm-btn" onClick={() => onStart("boundary")}>境界線だけ、一緒に決める</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sm-gate">
      <div className="sm-gate-head">
        <h2>影獣の鏡</h2>
        <p className="sm-lead">
          現実に、嫌な人が現れた。<br />
          ——その人に強く反応してしまうのは、きみの中の<b>まだ認めていない光</b>が、<br />
          歪んだ影の姿で見えているからかもしれない。
        </p>
        <div className="sm-howto">
          <div className="sh-row"><span className="sh-n">1</span><span>その人との<b>一つの場面</b>を思い出す（人物まるごとは扱わない）</span></div>
          <div className="sh-row"><span className="sh-n">2</span><span>そこに現れた<b>影獣</b>を、8つの影から見つける</span></div>
          <div className="sh-row"><span className="sh-n">3</span><span>影の奥にある<b>光の力</b>を、自分の中に取り戻す</span></div>
          <div className="sh-row"><span className="sh-n">4</span><span>相手の責任は相手に返して、<b>境界線と一歩</b>を決める</span></div>
        </div>
        <div className="sm-vow">
          <b>先に、約束ごと。</b><br />
          相手がしたことの責任は、相手にある。きみが引き寄せたんじゃない。<br />
          許すことも、感謝することも、ゴールじゃない。取り戻すのは<b>きみの選択権</b>。
        </div>
      </div>

      <div className="sm-ring">
        {SHADOW_PAIRS.map((p) => (
          <div key={p.id} className="sm-slot" style={{ ["--sc" as any]: p.hue }}>
            <ShadowEmblem pair={p} lit={false} size={54} />
            <span className="sm-slot-name">{p.shadow.short}</span>
          </div>
        ))}
      </div>

      <div className="sm-safety">
        <p className="sm-q">はじめる前に、ひとつだけ。<br />その人から<b>いまも</b>、暴力・脅し・つきまとい・強い監視を受けている？</p>
        <div className="sm-gate-btns is-col">
          <button className="sm-btn" onClick={() => onStart("normal")}>ううん、いまは安全（はじめる）</button>
          <button className="sm-btn is-soft" onClick={() => onStart("boundary")}>こわさが続いてる（境界線だけ決めたい）</button>
          <button className="sm-btn is-alert" onClick={() => setDanger(true)}>いま危険がある</button>
        </div>
      </div>
      <p className="sm-note">
        ここでの話は、きみの心を整理するためのもの。医療や心理の診断ではありません。
      </p>
    </div>
  );
}

/* ── 進行表示 ── */
export function ShadowProgress({ step, safety }: { step: number; safety: ShadowSafety }) {
  // 境界線優先モードは 1→2→8→9。影の見立てと鏡の段階（3〜7）を通らない
  const skip = safety === "boundary" ? [2, 3, 4, 5, 6] : [];
  return (
    <div className="sm-progress" aria-label={`いま ${step}/9`}>
      {SHADOW_STEPS.map((label, i) => {
        const n = i + 1;
        if (skip.includes(i)) return null;
        return (
          <span key={n} className={`smp-dot ${n < step ? "is-done" : n === step ? "is-now" : ""}`}>
            <i />{n === step && <em>{label}</em>}
          </span>
        );
      })}
    </div>
  );
}

/* ── 完成カード ── */
export function ShadowCardReveal({ card, onClose }: { card: ShadowCard; onClose: () => void }) {
  const pair = SHADOW_PAIRS.find((p) => p.id === card.pairId) ?? SHADOW_PAIRS[0];
  return (
    <div className="sm-reveal" onClick={onClose}>
      <div className="sm-card" style={{ ["--sc" as any]: pair.hue }} onClick={(e) => e.stopPropagation()}>
        <div className="sm-card-kicker">LIGHT RECLAIMED</div>
        <div className="sm-card-arc">
          <div className="sm-arc-side">
            <ShadowEmblem pair={pair} lit={false} size={64} />
            <span>{pair.shadow.short}</span>
          </div>
          <span className="sm-arc-arrow">→</span>
          <div className="sm-arc-side is-light">
            <ShadowEmblem pair={pair} lit size={84} />
            <span>{pair.light.short}</span>
          </div>
        </div>
        <h3>{pair.light.label}</h3>
        {card.ownership && <p className="sm-own">“{card.ownership}”</p>}
        <div className="sm-card-rows">
          {card.otherResp && <div className="sm-row"><b>相手に返す責任</b><span>{card.otherResp}</span></div>}
          {card.boundary && <div className="sm-row"><b>今回の境界線</b><span>{card.boundary}</span></div>}
          {card.action24h && <div className="sm-row"><b>24時間の一歩</b><span>{card.action24h}</span></div>}
          {(card.before != null || card.after != null) && (
            <div className="sm-row"><b>感情の強さ</b>
              <span>{card.before ?? "—"} → {card.after ?? "—"}{card.after != null && card.before != null && card.after >= card.before ? "（下がらなくても、前進は前進）" : ""}</span>
            </div>
          )}
        </div>
        <p className="sm-card-close-note">
          倒したのは相手じゃない。預けていた光を、自分の中に取り戻した。
        </p>
        <button className="sm-btn" onClick={onClose}>受け取る</button>
      </div>
    </div>
  );
}
