"use client";

import { useEffect, useState } from "react";

/** 獲得した原理カード（いまは端末に保存。淳くんだけの試作なので） */
export function CardShelf() {
  const [cards, setCards] = useState<any[]>([]);
  useEffect(() => {
    try { setCards(JSON.parse(localStorage.getItem("learn:cards") || "[]")); } catch { /* ignore */ }
  }, []);
  return (
    <div className="lrn-coll">
      <h2>🃏 獲得した原理</h2>
      {cards.length === 0 ? (
        <p className="none">まだありません。第1話を最後まで受けると、最初の原理カードが手に入ります。</p>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {cards.map((c, i) => (
            <div className="mini" key={i}>
              <span>{c.card.series} {c.card.no}</span>
              <span>{c.card.name}</span>
              <span>{(c.card.principle as string[]).join("")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
