"use client";

/**
 * 理想の方向を、体で探すためのレーダー。
 *
 * 【何をする道具か】
 * 「きみの理想が叶っている世界は、この360度のどこかにある。
 *   アンテナみたいに体を動かして、いちばん馴染む方向を探して」
 * ——この手順を、言葉だけでなく**目に見える形**にしたもの。
 *
 * 【たどり着いた形】
 * ① 丸い目盛りに点を16個並べて、押して選ぶ形にした
 *    → 淳くん：「右なのか左なのかも全然わからなくない？」その通りだった。
 *      点には名前が出ていないので、押すまで何を選ぶのか分からない。
 * ② いま：**言葉の書いてあるボタン**を、方向のとおりに並べる。
 *    左上のボタンは左ななめ前、右下のボタンは右うしろ。**置き場所＝その方向**。
 *    丸い目盛りは、選んだ方向に光の線が伸びる「絵」として残す（押す場所ではない）。
 *
 * 【決まり】
 * ・方向の意味は読み解かない（右上は未来、みたいな話はしない）
 * ・**歩き出すための合図**であって、話の中身ではない。決めたらもう出さない
 * ・「わからない」でいつでも抜けられる。粘らない
 * ・上下（見上げる・見下ろす）も選べる。360度は平面だけではない
 */
import { useRef, useState } from "react";

/**
 * 押せる方向。**並び順がそのまま画面の並び**（3×3の枠）。
 * 真ん中は自分なので空。deg は真正面を0として時計回り。
 */
export const DIR_GRID = [
  { label: "左ななめ前", deg: 315 },
  { label: "まっすぐ前", deg: 0 },
  { label: "右ななめ前", deg: 45 },
  { label: "真左", deg: 270 },
  null,
  { label: "真右", deg: 90 },
  { label: "左うしろ", deg: 225 },
  { label: "真うしろ", deg: 180 },
  { label: "右うしろ", deg: 135 },
] as const;

/**
 * 上下。「ずっと上」「すこし上」では何のことか分からなかったので、
 * **体の動きで**書く（見上げる／見下ろす）。
 */
export const VERTICAL = [
  { label: "上（見上げる）", up: true },
  { label: "下（見下ろす）", up: true },
] as const;

export type DirPick = { label: string; deg: number | null; up: boolean };

/** 選んだ方向を、AIに渡す一言にする（方角の意味は付けない） */
export function dirSentence(p: DirPick): string {
  return `理想の方向は「${p.label}」だった`;
}

export function DirectionRadar({ onPick, onSkip }: {
  onPick: (p: DirPick) => void;
  onSkip: () => void;
}) {
  /**
   * 選ぶのは2手。
   * 押した瞬間に決まると、指がかすっただけで歩き出してしまう
   *（淳くん：間違ってうっちゃって進んでしまうときがある）。
   * だから、押す＝選ぶ。決めるのは「この方向でいく」を押したときだけ。
   */
  const [sel, setSel] = useState<DirPick | null>(null);
  const doneRef = useRef(false);

  function go() {
    if (doneRef.current || !sel) return;
    doneRef.current = true;
    onPick(sel);
  }

  const R = 74;      // 目盛りの半径
  const C = 88;      // 中心

  return (
    <div className="rdr">
      <div className="rdr-lead">
        きみの理想が叶っている世界は、<b>この360度のどこか</b>にある。<br />
        アンテナみたいに体をひねって、<b>いちばん馴染む方向</b>を探して。
      </div>

      {/* 絵（押す場所ではない）。選ぶと、その方向に光が伸びる */}
      <div className="rdr-dial">
        <svg viewBox="0 0 176 176" aria-hidden="true" focusable="false">
          <circle className="rdr-ring" cx={C} cy={C} r={R} />
          <circle className="rdr-ring rdr-ring2" cx={C} cy={C} r={R * 0.62} />
          <path className="rdr-cross" d={`M${C} ${C - R} V${C + R} M${C - R} ${C} H${C + R}`} />
          {!sel && (
            <g className="rdr-sweep" style={{ transformOrigin: `${C}px ${C}px` }}>
              <path d={`M${C} ${C} L${C} ${C - R} A${R} ${R} 0 0 1 ${C + R * 0.72} ${C - R * 0.69} Z`} />
            </g>
          )}
          {sel && sel.deg != null && (
            <g className="rdr-beam" style={{ transform: `rotate(${sel.deg}deg)`, transformOrigin: `${C}px ${C}px` }}>
              <path d={`M${C} ${C} V${C - R - 5}`} />
              <circle cx={C} cy={C - R - 5} r="4" />
            </g>
          )}
          <circle className="rdr-me" cx={C} cy={C} r="4.5" />
          <text className="rdr-front" x={C} y="12" textAnchor="middle">正面</text>
        </svg>
      </div>

      {/* 押す場所。**並びがそのまま方向**（左上のボタン＝左ななめ前） */}
      <div className="rdr-grid">
        {DIR_GRID.map((d, i) => (
          d
            ? (
              <button
                key={d.label}
                className={sel?.label === d.label ? "is-on" : ""}
                onClick={() => setSel({ label: d.label, deg: d.deg, up: false })}
              >{d.label}</button>
            )
            : <span key={`me-${i}`} className="rdr-center">きみ</span>
        ))}
      </div>

      {/* 平面で決まらない人へ。上下も 360度のうち */}
      <div className="rdr-vert">
        {VERTICAL.map((v) => (
          <button
            key={v.label} className={sel?.label === v.label ? "is-on" : ""}
            onClick={() => setSel({ label: v.label, deg: null, up: true })}
          >{v.label}</button>
        ))}
      </div>

      {/* 決めるのは、ここを押したときだけ */}
      <button className="rdr-go" disabled={!sel} onClick={go}>
        {sel ? `「${sel.label}」でいく →` : "方向を選んでね"}
      </button>

      <div className="rdr-foot">
        <button className="rdr-skip" onClick={() => { doneRef.current = true; onSkip(); }}>
          わからない（このまま歩き出す）
        </button>
      </div>
    </div>
  );
}
