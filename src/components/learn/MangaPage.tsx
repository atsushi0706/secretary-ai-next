"use client";

import type { MangaPage, Panel } from "@/lib/learn/types";
import { MangaArt } from "./MangaArt";

/**
 * 日本の漫画のページ。
 * 段（Row）を上から下へ、段の中のコマは **右から左** へ並べる（row-reverse）。
 * 縦スクロール漫画のように一列にはしない。
 */
export function MangaPageView({ page, index }: { page: MangaPage; index: number }) {
  return (
    <div className="lrn-page" aria-label={`${index + 1}ページ`}>
      {page.rows.map((row, ri) => (
        <div className="lrn-row" key={ri} style={{ flex: row.h ?? 1 }}>
          {row.panels.map((p, pi) => <PanelView key={pi} p={p} />)}
        </div>
      ))}
      <span className="lrn-pageno">{index + 1}</span>
    </div>
  );
}

function PanelView({ p }: { p: Panel }) {
  return (
    <div className="lrn-panel" style={{ flex: p.w ?? 1 }}>
      {p.img
        ? <img src={p.img} alt="" className="lrn-art" />
        : <MangaArt art={p.art} />}
      {p.narr && <div className="lrn-narr">{p.narr}</div>}
      {p.say && (
        <div className="lrn-say">
          <span className="who">{p.say.who}</span>
          {p.say.text}
        </div>
      )}
      {p.think && <div className="lrn-think">{p.think}</div>}
      {p.sfx && <div className="lrn-sfx">{p.sfx}</div>}
      {p.big && (
        <div className="lrn-big">
          {p.big.map((t, i) => <div key={i}>{t}</div>)}
          {p.sub && <div className="sub">{p.sub}</div>}
        </div>
      )}
      {!p.big && p.sub && <div className="lrn-sub">{p.sub}</div>}
    </div>
  );
}
