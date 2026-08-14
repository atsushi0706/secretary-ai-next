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
 * ① 丸い目盛りに点を16個。押せるが、名前が出ていない
 *    → 淳くん：「右なのか左なのかも全然わからなくない？」その通りだった
 * ② 言葉を書いた3×3のボタン（右ななめ前・真左…）を、盤の下に並べた
 *    → 淳くん：「レーダーの方向の方から直接押せたと思う。時計みたいな感じにして、
 *      そこをチェックボタンで選択できるように」
 * ③ いま：**時計の文字盤**。12時＝まっすぐ前。盤の上を直接押す。
 *    押した時刻にチェックが付き、そっちへ光の線が伸びる。
 *    どこを押すのか分かるように、盤に**時刻の数字と方向の名前**を出す。
 *
 * 【決まり】
 * ・**方向だけ。**上下（ちょっと上・ちょっと下）はやめた（淳くん：もういらない）
 * ・方向の意味は読み解かない（右上は未来、みたいな話はしない）
 * ・**歩き出すための合図**であって、話の中身ではない。決めたらもう出さない
 * ・「わからない」でいつでも抜けられる。粘らない
 */
import { useEffect, useRef, useState } from "react";

/**
 * 時計の文字盤。12時が「まっすぐ前」。
 * deg は 12時を0として時計回り（＝時刻 × 30度）。
 */
export const CLOCK = [
  { h: 12, ja: "まっすぐ前" },
  { h: 1, ja: "右ななめ前" },
  { h: 2, ja: "右の やや前" },
  { h: 3, ja: "真右" },
  { h: 4, ja: "右の やや後ろ" },
  { h: 5, ja: "右ななめ後ろ" },
  { h: 6, ja: "真うしろ" },
  { h: 7, ja: "左ななめ後ろ" },
  { h: 8, ja: "左の やや後ろ" },
  { h: 9, ja: "真左" },
  { h: 10, ja: "左の やや前" },
  { h: 11, ja: "左ななめ前" },
] as const;

export type DirPick = { label: string; deg: number; hour: number };

/** その時刻が指す向き（12時＝0度、時計回り） */
export function degOf(hour: number): number {
  return ((hour % 12) * 30 + 360) % 360;
}

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
  const goRef = useRef<HTMLButtonElement | null>(null);

  /*
   * 時刻を押したら、「◯◯でいく」が見えるところまで送る。
   * 盤が大きいので、押しただけでは決めるボタンが画面の下に隠れていた
   *（実機の大きさで測って気づいた）。次にどうすればいいのか分からなくなる。
   */
  useEffect(() => {
    if (!sel) return;
    goRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [sel]);

  function go() {
    if (doneRef.current || !sel) return;
    doneRef.current = true;
    onPick(sel);
  }

  const C = 130;      // 盤の中心
  const R = 96;       // 時刻を置く輪の半径
  const at = (hour: number, r: number) => {
    const a = (degOf(hour) - 90) * (Math.PI / 180);
    return { x: C + Math.cos(a) * r, y: C + Math.sin(a) * r };
  };

  return (
    <div className="rdr">
      {/*
        説明は書かない。**清瀬リンクが先に聞いてくれている**から
       （淳くん：リンクが聞いてから羅針盤が出ないと、前後の流れがおかしくなる）。
        ここに同じ話をもう一度書くと、盤が縦に伸びて、
        そのリンクの問いが画面の外へ押し出されてしまう。目印だけ置く。
      */}
      <div className="rdr-hint">体をひねって探して。押すのは、いちばん馴染む時刻（12時＝まっすぐ前）</div>

      {/* 時計の文字盤。**ここを直接押す** */}
      <div className="rdr-dial">
        <svg viewBox="0 0 260 260" role="group" aria-label="理想の方向を選ぶ時計盤">
          <circle className="rdr-ring" cx={C} cy={C} r={R + 18} />
          <circle className="rdr-ring rdr-ring2" cx={C} cy={C} r={R * 0.5} />
          <path className="rdr-cross" d={`M${C} ${C - R - 18} V${C + R + 18} M${C - R - 18} ${C} H${C + R + 18}`} />

          {/* まだ選んでいないあいだ、光がゆっくり回る */}
          {!sel && (
            <g className="rdr-sweep" style={{ transformOrigin: `${C}px ${C}px` }}>
              <path d={`M${C} ${C} L${C} ${C - R - 18} A${R + 18} ${R + 18} 0 0 1 ${C + (R + 18) * 0.5} ${C - (R + 18) * 0.87} Z`} />
            </g>
          )}

          {/* 選んだ時刻へ、光の線が伸びる */}
          {sel && (
            <g className="rdr-beam" style={{ transform: `rotate(${sel.deg}deg)`, transformOrigin: `${C}px ${C}px` }}>
              <path d={`M${C} ${C} V${C - R - 14}`} />
            </g>
          )}

          <circle className="rdr-me" cx={C} cy={C} r="5" />

          {CLOCK.map(({ h, ja }) => {
            const p = at(h, R);
            const on = sel?.hour === h;
            return (
              <g
                key={h} className={`rdr-h ${on ? "is-on" : ""}`}
                role="button" tabIndex={0}
                aria-label={`${h}時（${ja}）`} aria-pressed={on}
                onClick={() => setSel({ hour: h, deg: degOf(h), label: `${h}時（${ja}）` })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSel({ hour: h, deg: degOf(h), label: `${h}時（${ja}）` });
                  }
                }}
              >
                {/* 押せる範囲（指の大きさを確保する。見えない） */}
                <circle className="rdr-hit" cx={p.x} cy={p.y} r="24" />
                <circle className="rdr-h-bg" cx={p.x} cy={p.y} r="17" />
                {on
                  ? <path className="rdr-check" d={`M${p.x - 7} ${p.y} l5 6 l9 -11`} />
                  : <text className="rdr-h-n" x={p.x} y={p.y + 5} textAnchor="middle">{h}</text>}
              </g>
            );
          })}
        </svg>
      </div>

      {/* いま選んでいる方向を、言葉でも出す（数字だけだと分からない） */}
      <div className="rdr-now">{sel ? sel.label : "時計盤の、いちばん馴染む時刻を押して"}</div>

      {/* 決めるのは、ここを押したときだけ */}
      <button ref={goRef} className="rdr-go" disabled={!sel} onClick={go}>
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
