"use client";

/**
 * 理想の方向を、体で探すためのレーダー。
 *
 * 【何をする道具か】
 * 「きみの理想が叶っている世界は、この360度のどこかにある。
 *   アンテナみたいに体を動かして、いちばん馴染む方向を探して」
 * ——この手順を、言葉だけでなく**目に見える形**にしたもの。
 *
 * 【決まり】
 * ・方向の意味は読み解かない（右上は未来、みたいな話はしない）
 * ・**歩き出すための合図**であって、話の中身ではない。決めたらもう出さない
 * ・「わからない」でいつでも抜けられる。粘らない
 * ・上下（真上・真下）も選べる。360度は平面だけではない
 */
import { useRef, useState } from "react";

/** 平面の16方位。時計回り、真正面（自分の向いているほう）が0 */
export const DIRS = [
  "正面", "正面すこし右", "右ななめ前", "右のかなり前",
  "真右", "右のうしろ寄り", "右ななめ後ろ", "うしろすこし右",
  "真うしろ", "うしろすこし左", "左ななめ後ろ", "左のうしろ寄り",
  "真左", "左のかなり前", "左ななめ前", "正面すこし左",
] as const;

/** 上下。平面で決まらない人のために必ず出す */
export const VERTICAL = ["ずっと上", "すこし上", "すこし下", "ずっと下"] as const;

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

  const R = 92;      // 目盛りの半径
  const C = 110;     // 中心

  return (
    <div className="rdr">
      <div className="rdr-lead">
        きみの理想が叶っている世界は、<b>この360度のどこか</b>にある。<br />
        アンテナみたいに体を動かして——右にひねったり、左にひねったり、
        ちょっと上を向いたりしながら、<b>いちばん体が馴染む方向</b>を探して。
      </div>

      <div className="rdr-dial">
        <svg viewBox="0 0 220 220" role="img" aria-label="理想の方向を探すレーダー">
          <circle className="rdr-ring" cx={C} cy={C} r={R} />
          <circle className="rdr-ring rdr-ring2" cx={C} cy={C} r={R * 0.66} />
          <circle className="rdr-ring rdr-ring3" cx={C} cy={C} r={R * 0.33} />
          <path className="rdr-cross" d={`M${C} ${C - R} V${C + R} M${C - R} ${C} H${C + R}`} />

          {/* まだ選んでいないあいだ、光がゆっくり回る */}
          {!sel && (
            <g className="rdr-sweep" style={{ transformOrigin: `${C}px ${C}px` }}>
              <path d={`M${C} ${C} L${C} ${C - R} A${R} ${R} 0 0 1 ${C + R * 0.72} ${C - R * 0.69} Z`} />
            </g>
          )}

          {/* 選んだ方向へ、まっすぐ伸びる線 */}
          {sel && sel.deg != null && (
            <g className="rdr-beam" style={{ transform: `rotate(${sel.deg}deg)`, transformOrigin: `${C}px ${C}px` }}>
              <path d={`M${C} ${C} V${C - R - 6}`} />
            </g>
          )}

          {DIRS.map((d, i) => {
            const a2 = (i * 22.5 - 90) * (Math.PI / 180);
            const x = C + Math.cos(a2) * R * 0.82;
            const y = C + Math.sin(a2) * R * 0.82;
            const on = sel?.label === d;
            return (
              <circle
                key={d} className={`rdr-dot ${on ? "is-on" : ""}`}
                cx={x} cy={y} r={on ? 9.5 : 7}
                role="button" tabIndex={0} aria-label={d}
                onClick={() => setSel({ label: d, deg: i * 22.5, up: false })}
              />
            );
          })}
          <circle className="rdr-me" cx={C} cy={C} r="5" />
          <text className="rdr-front" x={C} y="14" textAnchor="middle">正面</text>
        </svg>
        <div className="rdr-now">{sel ? sel.label : "体を動かして、探してみて"}</div>
      </div>

      {/* 平面で決まらない人へ。上下も 360度のうち */}
      <div className="rdr-vert">
        {VERTICAL.map((v) => (
          <button
            key={v} className={sel?.label === v ? "is-on" : ""}
            onClick={() => setSel({ label: v, deg: null, up: true })}
          >{v}</button>
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
