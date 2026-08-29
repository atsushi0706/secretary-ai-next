"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PrincipleCard } from "@/lib/learn/types";

export type PrincipleCatalogEntry = {
  ep: string;
  episodeNo: number;
  episodeTitle: string;
  card: PrincipleCard;
};

type SavedUnlock = { ep?: unknown };

/**
 * 保存データは「どの話で獲得したか」だけを解放判定に使う。
 * カード本文をlocalStorageから復元すると、改稿前の誤った原理が残り続けるため、
 * 表示内容は必ずサーバー側の最新カタログから解決する。
 */
export function CardShelf({ catalog, previewUnlocked = false }: {
  catalog: PrincipleCatalogEntry[];
  previewUnlocked?: boolean;
}) {
  const [unlockedEpisodes, setUnlockedEpisodes] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const saved = JSON.parse(localStorage.getItem("learn:cards") || "[]") as SavedUnlock[];
        setUnlockedEpisodes(saved.flatMap((item) => typeof item?.ep === "string" ? [item.ep] : []));
      } catch {
        setUnlockedEpisodes([]);
      } finally {
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const cards = useMemo(
    () => previewUnlocked ? catalog : catalog.filter((entry) => unlockedEpisodes.includes(entry.ep)),
    [catalog, previewUnlocked, unlockedEpisodes],
  );

  if (!loaded && !previewUnlocked) {
    return <div className="lrn-vault-loading">宝箱を開いています…</div>;
  }

  if (cards.length === 0) {
    return (
      <section className="lrn-vault-empty">
        <div className="lrn-vault-chest" aria-hidden="true"><span /></div>
        <h2>最初の宝箱は、まだ空です</h2>
        <p>授業を最後まで体験すると、学んだ催眠の原理がここへ収められます。</p>
        <Link href="/learn/ep1">第1話へ行く</Link>
      </section>
    );
  }

  return (
    <div className="lrn-vault-cards">
      {cards.map(({ ep, episodeNo, episodeTitle, card }) => (
        <article className="lrn-vault-card" key={`${ep}-${card.no}`}>
          <header>
            <span>第{episodeNo}話で獲得</span>
            <b>{card.series} {card.no}</b>
          </header>

          <div className="lrn-vault-card-title">
            <h2>{card.name}</h2>
            {card.reading && <span>{card.reading}</span>}
          </div>

          <section>
            <h3>どんな原理？</h3>
            <p>{card.summary}</p>
          </section>

          <section>
            <h3>何に役立つ？</h3>
            <p>{card.effect}</p>
          </section>

          <section>
            <h3>いつ使う？</h3>
            <ul>{card.useWhen.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>

          <section>
            <h3>どう使う？</h3>
            <ol>{card.howTo.map((item) => <li key={item}>{item}</li>)}</ol>
          </section>

          <Link className="lrn-vault-revisit" href={`/learn/${ep}`}>
            <span>授業をもう一度見る</span>
            <small>{episodeTitle}</small>
          </Link>
        </article>
      ))}
    </div>
  );
}
