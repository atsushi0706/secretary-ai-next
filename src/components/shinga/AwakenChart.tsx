"use client";

import { useEffect, useState } from "react";

/**
 * 覚醒能力（六角形）と、手に入れたスキルカード。
 * 主人公レベル(%)＝外側の進捗、こっち＝ワークで磨かれた内側の力。
 */
type Ability = { key: string; label: string; desc: string; how: string; locked: boolean; value: number };
type Card = { key: string; title: string; body: string; rarity: "bronze" | "silver" | "gold"; source: string; date: string };

const RARITY_LABEL: Record<string, string> = { gold: "金", silver: "銀", bronze: "銅" };

export function AwakenChart() {
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [sel, setSel] = useState<Ability | null>(null);

  useEffect(() => {
    fetch("/api/awaken").then((r) => r.json()).then((d) => {
      setAbilities(d.abilities ?? []);
      setCards(d.cards ?? []);
    }).catch(() => {});
  }, []);

  if (abilities.length === 0) return null;

  // 六角形の頂点（上から時計回り）
  const R = 74, cx = 100, cy = 92;
  const pt = (i: number, r: number) => {
    const ang = (Math.PI / 3) * i - Math.PI / 2;
    return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
  };
  const hexPath = (r: number) =>
    Array.from({ length: 6 }, (_, i) => pt(i, r)).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + " Z";
  const valuePath = abilities
    .map((a, i) => pt(i, (Math.max(6, a.value) / 100) * R))
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + " Z";

  return (
    <div className="awaken">
      <div className="aw-title">✦ 覚醒能力</div>
      <p className="aw-lead">ワークを重ねるほど磨かれる、きみだけの力。</p>

      <svg className="aw-chart" viewBox="-24 -6 248 200">
        {[0.25, 0.5, 0.75, 1].map((s) => (
          <path key={s} d={hexPath(R * s)} className="aw-grid" />
        ))}
        {abilities.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="aw-spoke" />;
        })}
        <path d={valuePath} className="aw-value" />
        {abilities.map((a, i) => {
          const [x, y] = pt(i, R + 16);
          return (
            <text key={a.key} x={x} y={y} className={`aw-label ${a.locked ? "is-locked" : ""}`}
              textAnchor={x > cx + 5 ? "start" : x < cx - 5 ? "end" : "middle"} dominantBaseline="middle">
              {a.locked ? "🔒" : a.label}
            </text>
          );
        })}
      </svg>

      <div className="aw-list">
        {abilities.map((a) => (
          <button key={a.key} className={`aw-item ${a.locked ? "is-locked" : ""} ${sel?.key === a.key ? "is-open" : ""}`}
            onClick={() => setSel(sel?.key === a.key ? null : a)}>
            <span className="n">{a.locked ? "🔒 ？？？" : a.label}</span>
            <span className="v">{a.locked ? "—" : `${a.value}`}</span>
            {sel?.key === a.key && (
              <span className="d">{a.desc}<em>{a.locked ? "解放条件は、これから明かされる" : `伸ばし方：${a.how}`}</em></span>
            )}
          </button>
        ))}
      </div>

      <div className="aw-cards">
        <div className="aw-title">🃏 スキルカード <span className="aw-count">{cards.length}枚</span></div>
        {cards.length === 0 ? (
          <p className="aw-lead">ワークの中でブロックが壊れたとき、新しい力がカードになって手に入るよ。</p>
        ) : (
          <div className="aw-cardlist">
            {cards.map((c) => (
              <div key={c.key} className={`aw-card r-${c.rarity}`}>
                <div className="c-top">
                  <span className="c-rar">{RARITY_LABEL[c.rarity] ?? "銅"}</span>
                  <span className="c-title">{c.title}</span>
                </div>
                <div className="c-body">{c.body}</div>
                <div className="c-src">{c.source}・{c.date}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
