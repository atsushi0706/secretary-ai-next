"use client";

/**
 * タイムトラベルボックス（過去の宝箱）。
 *
 * 週刊レポートを「ただ溜める場所」にしない。
 * 収支レポートのように数字が積み上がっても、
 * **何に悩んで、それをどう捉え直して、何が進んだのか**は見えてこない。
 * この箱は、そこが見えるようにするためにある。
 *
 * 1週＝1つの巻物。開くと、
 *   ・進んだこと
 *   ・引っかかっていたこと → どう捉え直したか（ここが成長の中身）
 *   ・手に入れたもの
 *   ・その週の手紙（全文）
 * が並ぶ。古い週ほど下に沈んでいく。
 */
import { useEffect, useMemo, useState } from "react";
import { CardArt } from "./CardArt";

type Facets = { progressed: string[]; struggled: string; reframed: string; gained: string[] };
type Weekly = { id: string; week_start: string; body: string; facets?: Facets | null };
type Card = { key: string; title: string; body: string; rarity: "bronze" | "silver" | "gold"; source: string; date: string };

const md = (s: string) => s.slice(5).replace("-", "/");
const weekEnd = (start: string) => {
  const d = new Date(`${start}T00:00:00+09:00`);
  d.setDate(d.getDate() + 6);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};

export function TimeTravelBox({ guideName, avatarUrl, onBack }: {
  guideName: string; avatarUrl: string; onBack: () => void;
}) {
  const [weeks, setWeeks] = useState<Weekly[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/weekly").then((r) => r.json()).catch(() => ({})),
      fetch("/api/awaken").then((r) => r.json()).catch(() => ({})),
    ]).then(([w, a]) => {
      setWeeks(Array.isArray(w?.reports) ? w.reports : []);
      setCards(Array.isArray(a?.cards) ? a.cards : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // いちばん新しい週は最初から開けておく（毎回タップさせない）
    if (weeks.length > 0 && open === null) setOpen(weeks[0].id);
  }, [weeks, open]);

  /** その週のあいだに手に入れたカード */
  const cardsOfWeek = useMemo(() => {
    const m = new Map<string, Card[]>();
    for (const w of weeks) {
      const end = new Date(`${w.week_start}T00:00:00+09:00`);
      end.setDate(end.getDate() + 7);
      const endStr = end.toISOString().slice(0, 10);
      m.set(w.id, cards.filter((c) => c.date >= w.week_start && c.date < endStr));
    }
    return m;
  }, [weeks, cards]);

  const totalGained = useMemo(
    () => weeks.reduce((n, w) => n + (w.facets?.gained?.length ?? 0), 0),
    [weeks],
  );

  return (
    <div className="tt-screen">
      <button className="singa-back" onClick={onBack}>← 地図にもどる</button>

      <div className="tt-card">
        <div className="rep-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="singa-face" src={avatarUrl} alt={guideName} />
          <div>
            <div className="rep-sub">タイムトラベルボックス</div>
            <div className="rep-who">歩いてきた道が、ここに残る</div>
          </div>
        </div>

        {loading && <div className="rep-loading">箱をあけている…</div>}

        {!loading && weeks.length === 0 && (
          <p className="tt-empty">
            まだ何も入っていないよ。<br />
            毎週金曜に、その週のふりかえりがひとつ増えていく。<br />
            続けるほど、この箱は重くなる。
          </p>
        )}

        {!loading && weeks.length > 0 && (
          <>
            <div className="tt-stats">
              <span><b>{weeks.length}</b>週ぶん</span>
              <span><b>{cards.length}</b>枚のカード</span>
              <span><b>{totalGained}</b>の気づき</span>
            </div>

            <div className="tt-line">
              {weeks.map((w, i) => {
                const f = w.facets ?? null;
                const got = cardsOfWeek.get(w.id) ?? [];
                const isOpen = open === w.id;
                return (
                  <div key={w.id} className={`tt-week ${isOpen ? "is-open" : ""} ${i === 0 ? "is-new" : ""}`}>
                    <button className="tt-week-head" onClick={() => setOpen(isOpen ? null : w.id)}>
                      <span className="tt-when">{md(w.week_start)} 〜 {weekEnd(w.week_start)}</span>
                      {i === 0 && <span className="tt-new">いちばん新しい</span>}
                      <span className="tt-chev">{isOpen ? "▲" : "▼"}</span>
                    </button>

                    {isOpen && (
                      <div className="tt-body">
                        {f?.progressed?.length ? (
                          <div className="tt-sec">
                            <div className="tt-sec-t">進んだこと</div>
                            {f.progressed.map((p, k) => <div key={k} className="tt-item">✓ {p}</div>)}
                          </div>
                        ) : null}

                        {(f?.struggled || f?.reframed) && (
                          <div className="tt-sec is-shift">
                            <div className="tt-sec-t">引っかかっていたこと → どう見たか</div>
                            {f?.struggled && <div className="tt-from">{f.struggled}</div>}
                            {f?.reframed && (
                              <>
                                <div className="tt-arrow">↓</div>
                                <div className="tt-to">{f.reframed}</div>
                              </>
                            )}
                          </div>
                        )}

                        {f?.gained?.length ? (
                          <div className="tt-sec">
                            <div className="tt-sec-t">手に入れたもの</div>
                            {f.gained.map((g, k) => <div key={k} className="tt-item is-gain">✦ {g}</div>)}
                          </div>
                        ) : null}

                        {got.length > 0 && (
                          <div className="tt-sec">
                            <div className="tt-sec-t">この週に手に入れたカード</div>
                            <div className="tt-cards">
                              {got.map((c) => (
                                <span key={c.key} className="tt-cardchip" title={c.body}>
                                  <CardArt seed={`${c.key}${c.title}`} rarity={c.rarity} size={40} />
                                  <span>{c.title}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="tt-sec">
                          <div className="tt-sec-t">この週の手紙</div>
                          <p className="tt-letter">{w.body}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="tt-note">古い週ほど下に沈んでいく。開くと、その週の中身が見えるよ。</p>
          </>
        )}
      </div>
    </div>
  );
}
