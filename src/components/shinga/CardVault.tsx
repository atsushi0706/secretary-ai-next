"use client";

/**
 * カード保管庫。
 *
 * ワークで手に入れたスキルカード（壁を壊した力・解き放った守り手・回収した光）を、
 * ひとつの場所に集めて眺められるようにする。
 * 旅の戦利品が散らばったままだと、続けてきた事実そのものが見えなくなるので、
 * 「集まっている」ことが一目で分かる棚にした。
 */
import { useEffect, useMemo, useState } from "react";
import { CardArt } from "./CardArt";

type Card = {
  key: string;
  title: string;
  body: string;
  rarity: "bronze" | "silver" | "gold";
  source: string;
  date: string;
};

const RARITY_LABEL: Record<string, string> = { gold: "金", silver: "銀", bronze: "銅" };
const RARITY_ORDER: Record<string, number> = { gold: 0, silver: 1, bronze: 2 };

/** どのワークで手に入れたか（source の文言から、ざっくり分ける） */
function groupOf(source: string): string {
  if (/神殿|守り手|ガーディアン/.test(source)) return "内なる子の神殿";
  if (/ミラーオブワールド|影獣/.test(source)) return "ミラーオブワールド";
  if (/ウォールブレイク|破壊/.test(source)) return "ウォールブレイク";
  if (/歩|散歩/.test(source)) return "歩いて手に入れた";
  if (/じぶんワーク|儀式/.test(source)) return "じぶんワーク";
  return "その他の旅路";
}

export function CardVault({ guideName, avatarUrl, onBack }: {
  guideName: string; avatarUrl: string; onBack: () => void;
}) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"all" | "gold" | "silver" | "bronze">("all");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/awaken")
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) { setErr(String(d.error)); return; }
        setCards(Array.isArray(d.cards) ? d.cards : []);
      })
      .catch((e) => setErr(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { gold: 0, silver: 0, bronze: 0 };
    for (const x of cards) if (x.rarity in c) c[x.rarity]++;
    return c;
  }, [cards]);

  const shown = useMemo(() => {
    const list = filter === "all" ? cards : cards.filter((c) => c.rarity === filter);
    return [...list].sort((a, b) => {
      const r = (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9);
      return r !== 0 ? r : String(b.date).localeCompare(String(a.date));
    });
  }, [cards, filter]);

  // ワークごとにまとめる（どの旅で何を得たかが見えるように）
  const groups = useMemo(() => {
    const m = new Map<string, Card[]>();
    for (const c of shown) {
      const g = groupOf(c.source ?? "");
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(c);
    }
    return [...m.entries()];
  }, [shown]);

  return (
    <div className="cv-screen">
      <button className="singa-back" onClick={onBack}>← 地図にもどる</button>

      <div className="cv-card">
        <div className="rep-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="singa-face" src={avatarUrl} alt={guideName} />
          <div>
            <div className="rep-sub">カード保管庫</div>
            <div className="rep-who">旅で手に入れた力</div>
          </div>
        </div>

        {loading && <div className="rep-loading">棚をひらいている…</div>}
        {err && <div className="rep-err">{err}</div>}

        {!loading && cards.length === 0 && (
          <p className="cv-empty">
            まだ1枚もないよ。<br />
            ウォールブレイクで「無理」を越えたり、守り手を解き放ったりすると、<br />
            そのとき生まれた力がカードになって、ここに並んでいく。
          </p>
        )}

        {!loading && cards.length > 0 && (
          <>
            <div className="cv-stats">
              <span className="cv-total"><b>{cards.length}</b>枚</span>
              <span className="cv-rar r-gold">金 {counts.gold}</span>
              <span className="cv-rar r-silver">銀 {counts.silver}</span>
              <span className="cv-rar r-bronze">銅 {counts.bronze}</span>
            </div>

            <div className="cv-filters">
              {([["all", "ぜんぶ"], ["gold", "金"], ["silver", "銀"], ["bronze", "銅"]] as const).map(([k, label]) => (
                <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{label}</button>
              ))}
            </div>

            {groups.map(([g, list]) => (
              <div key={g} className="cv-group">
                <div className="cv-group-title">{g} <span>{list.length}</span></div>
                <div className="cv-grid">
                  {list.map((c) => (
                    <button
                      key={c.key}
                      className={`cv-item r-${c.rarity} ${open === c.key ? "is-open" : ""}`}
                      onClick={() => setOpen(open === c.key ? null : c.key)}
                    >
                      <span className="cv-face">
                        {/* 柄はカードの名前から決まる。同じカードなら必ず同じ紋章が出る */}
                        <CardArt seed={`${c.key}${c.title}`} rarity={c.rarity} size={open === c.key ? 132 : 76} />
                        <span className="cv-rarity">{RARITY_LABEL[c.rarity] ?? "銅"}</span>
                      </span>
                      <span className="cv-title">{c.title}</span>
                      {open === c.key && (
                        <>
                          <span className="cv-body">{c.body}</span>
                          <span className="cv-src">{c.source}・{c.date}</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <p className="cv-note">タップすると、そのカードの中身が開くよ。</p>
          </>
        )}
      </div>
    </div>
  );
}
