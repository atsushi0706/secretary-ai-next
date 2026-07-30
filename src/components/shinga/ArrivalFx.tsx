"use client";

/**
 * 「降臨」演出。光の爆発＋舞い上がるスパーク＋リング。
 * 手紙・クエストカードが届く瞬間に、背後で一度だけ再生する（CSSのみ・スマホでも軽い）。
 * pointer-events: none なので操作の邪魔をしない。
 */
export function ArrivalFx({ tone = "gold" }: { tone?: "gold" | "violet" }) {
  const sparks = Array.from({ length: 14 }, (_, i) => i);
  return (
    <div className={`arrival-fx tone-${tone}`} aria-hidden>
      <span className="afx-burst" />
      <span className="afx-ring" />
      <span className="afx-ring afx-ring2" />
      <div className="afx-sparks">
        {sparks.map((i) => (
          <span
            key={i}
            className="afx-spark"
            style={{
              // 円周状にばらまく（角度と距離をindexで散らす＝Math.randomを使わない）
              ["--ang" as any]: `${(i * 360) / 14 + (i % 3) * 12}deg`,
              ["--dist" as any]: `${210 + (i % 4) * 70}px`,
              ["--delay" as any]: `${(i % 5) * 60}ms`,
              ["--sz" as any]: `${7 + (i % 3) * 5}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
