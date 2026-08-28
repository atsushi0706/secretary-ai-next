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
type Count = { key: string; label: string; n: number };

const RARITY: Record<string, string> = { gold: "金", silver: "銀", bronze: "銅" };

/*
 * 週の見せ方は「土曜〜金曜」。
 * レポートは金曜の夜に作って送るので、中身は前の土曜からその金曜まで。
 * 鍵（week_start）は月曜だが、人に見せる期間は土→金で揃える。
 */
const shiftJst = (start: string, days: number) => {
  const d = new Date(`${start}T00:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const md = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
const periodOf = (start: string) => ({ from: shiftJst(start, -2), to: shiftJst(start, 4) });
const weekLabel = (start: string) => { const p = periodOf(start); return `${md(p.from)}（土）〜${md(p.to)}（金）`; };

export function TimeTravelBox({ guideName, avatarUrl, onBack, onOpened }: {
  guideName: string; avatarUrl: string; onBack: () => void;
  /** 開いた＝読んだ。地図の印を消すために知らせる */
  onOpened?: () => void;
}) {
  const [weeks, setWeeks] = useState<Weekly[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [counts, setCounts] = useState<Count[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [openCards, setOpenCards] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/weekly").then((r) => r.json()).catch(() => ({})),
      fetch("/api/awaken").then((r) => r.json()).catch(() => ({})),
      fetch("/api/treasure").then((r) => r.json()).catch(() => ({})),
    ]).then(([w, a, t]) => {
      setWeeks(Array.isArray(w?.reports) ? w.reports : []);
      setCards(Array.isArray(a?.cards) ? a.cards : []);
      setCounts(Array.isArray(t?.counts) ? t.counts : []);
    }).finally(() => setLoading(false));
    // 開いた合図を送る（未読の印を消す）。失敗しても読むことはできる
    fetch("/api/weekly", { method: "POST" }).then(() => onOpened?.()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // いちばん新しい週は最初から開けておく（毎回タップさせない）
    if (weeks.length > 0 && open === null) setOpen(weeks[0].id);
  }, [weeks, open]);

  /** その週のあいだに手に入れたカード */
  const cardsOfWeek = useMemo(() => {
    const m = new Map<string, Card[]>();
    for (const w of weeks) {
      const p = periodOf(w.week_start);
      m.set(w.id, cards.filter((c) => c.date >= p.from && c.date <= p.to));
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

        {/* ① これまで何回やってきたか。積み上がりが目で見えるように */}
        {!loading && counts.some((c) => c.n > 0) && (
          <div className="tt-counts">
            <div className="tt-sec-t">ここまでの積み上がり</div>
            <div className="tt-count-grid">
              {counts.filter((c) => c.n > 0).map((c) => (
                <div key={c.key} className="tt-count">
                  <b>{c.n}</b>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ② 手に入れたスキルカード */}
        {!loading && cards.length > 0 && (
          <div className="tt-vault">
            <button className="tt-vault-head" onClick={() => setOpenCards((v) => !v)}>
              <span>🃏 スキルカード <b>{cards.length}</b>枚</span>
              <span className="tt-chev">{openCards ? "▲ 閉じる" : "▼ 見る"}</span>
            </button>
            {openCards && (
              <div className="aw-cardlist">
                {cards.map((c) => (
                  <div key={c.key} className={`aw-card r-${c.rarity}`}>
                    <div className="c-top">
                      <CardArt seed={`${c.key}${c.title}`} rarity={c.rarity} size={44} className="c-art" />
                      <span className="c-rar">{RARITY[c.rarity] ?? "銅"}</span>
                      <span className="c-title">{c.title}</span>
                    </div>
                    <div className="c-body">{c.body}</div>
                    <div className="c-src">{c.source}・{c.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && weeks.length === 0 && (
          <p className="tt-empty">
            週のふりかえりは、まだ入っていないよ。<br />
            毎週金曜に、その週のものがひとつ増えていく。<br />
            続けるほど、この箱は重くなる。
          </p>
        )}

        {!loading && weeks.length > 0 && (
          <>
            <div className="tt-sec-t tt-weekhead">週のふりかえり（{weeks.length}週ぶん・{totalGained}の気づき）</div>

            <div className="tt-line">
              {weeks.map((w, i) => {
                const f = w.facets ?? null;
                const got = cardsOfWeek.get(w.id) ?? [];
                const isOpen = open === w.id;
                return (
                  <div key={w.id} className={`tt-week ${isOpen ? "is-open" : ""} ${i === 0 ? "is-new" : ""}`}>
                    <button className="tt-week-head" onClick={() => setOpen(isOpen ? null : w.id)}>
                      <span className="tt-when">{weekLabel(w.week_start)}</span>
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
