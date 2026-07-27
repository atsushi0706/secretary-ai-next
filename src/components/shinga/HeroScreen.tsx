"use client";

import { useEffect, useState } from "react";

/**
 * 主人公レベルアップ画面。
 * 未設定なら「主人公を決める」フォーム。設定済みなら5領域のレベル＋AIコメント＋今日の1％＋変化の線。
 */
type Domain = "inner" | "embodiment" | "relationship" | "delivery" | "socialization";
const DOMAINS: { key: Domain; label: string }[] = [
  { key: "inner", label: "内側" }, { key: "embodiment", label: "体現" },
  { key: "relationship", label: "関係" }, { key: "delivery", label: "提供" },
  { key: "socialization", label: "社会化" },
];
type Levels = Record<Domain, number>;
type Hero = {
  enemy_world: string; desired_world: string; needed_people: string; hero_statement: string;
  levels: Levels | null; assessment: any | null; history: { at: string; levels: Levels }[] | null;
};

export function HeroScreen({ guideName, avatarUrl, onBack }: { guideName: string; avatarUrl: string; onBack: () => void }) {
  const [hero, setHero] = useState<Hero | null>(null);
  const [hasId, setHasId] = useState<boolean | null>(null);
  const [editing, setEditing] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // フォーム
  const [ew, setEw] = useState(""); const [dw, setDw] = useState("");
  const [np, setNp] = useState(""); const [hs, setHs] = useState("");

  function fill(h: Hero | null) {
    setEw(h?.enemy_world ?? ""); setDw(h?.desired_world ?? "");
    setNp(h?.needed_people ?? ""); setHs(h?.hero_statement ?? "");
  }

  async function load() {
    try {
      const r = await fetch("/api/hero");
      const d = await r.json();
      if (d.error) { setErr(d.error); return; }
      setHero(d.hero); setHasId(!!d.hasIdentity); fill(d.hero);
      if (!d.hasIdentity) setEditing(true);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!dw.trim() && !hs.trim()) { setErr("増やしたい世界か、主人公像のどちらかは入れてね"); return; }
    setErr(null);
    const r = await fetch("/api/hero", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", enemy_world: ew, desired_world: dw, needed_people: np, hero_statement: hs }),
    });
    const d = await r.json();
    if (!r.ok) { setErr(d?.error ?? "保存できませんでした"); return; }
    setHero(d.hero); setHasId(true); setEditing(false);
  }

  async function assess() {
    setAssessing(true); setErr(null);
    try {
      const r = await fetch("/api/hero", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assess" }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? "見立てに失敗しました"); return; }
      setHero(d.hero);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setAssessing(false); }
  }

  const a = hero?.assessment;
  const levels = hero?.levels;

  return (
    <div className="hero">
      <button className="singa-back" onClick={onBack}>← 地図にもどる</button>
      <div className="hero-card">
        <div className="rep-head">
          <img className="singa-face" src={avatarUrl} alt={guideName} />
          <div><div className="rep-sub">主人公</div><div className="rep-who">きみが生きると決めた人</div></div>
        </div>

        {err && <div className="rep-err">{err}</div>}

        {editing ? (
          <div className="hero-form">
            <label>増やしたい世界</label>
            <textarea value={dw} onChange={(e) => setDw(e.target.value)} rows={2} placeholder="例：誰もが自分の可能性を信じて挑戦できる世界" />
            <label>減らしたい世界（今の違和感）</label>
            <textarea value={ew} onChange={(e) => setEw(e.target.value)} rows={2} placeholder="例：自信がなくて挑戦を諦める人が多い世界" />
            <label>その世界に必要な人</label>
            <textarea value={np} onChange={(e) => setNp(e.target.value)} rows={2} placeholder="例：人の一歩を応援し、勇気を渡せる人" />
            <label>主人公像（〜として生きる）</label>
            <textarea value={hs} onChange={(e) => setHs(e.target.value)} rows={2} placeholder="例：私は、人の一歩を生み出す人として生きる" />
            <button className="hero-btn is-go" onClick={save}>この主人公で生きる</button>
            {hasId && <button className="hero-btn" onClick={() => { fill(hero); setEditing(false); }}>やめる</button>}
          </div>
        ) : (
          <>
            <div className="hero-world">
              <div className="k">増やしたい世界</div>
              <p>{hero?.desired_world || "—"}</p>
              <div className="k">主人公</div>
              <p className="hs">{hero?.hero_statement || "—"}</p>
              <button className="hero-edit" onClick={() => setEditing(true)}>✏️ 書きなおす</button>
            </div>

            {levels ? (
              <>
                <div className="hero-levels">
                  {DOMAINS.map((d) => (
                    <div key={d.key} className={`hero-lv ${a?.growth === d.key ? "is-growth" : ""} ${a?.strongest === d.key ? "is-strong" : ""}`}>
                      <span className="lb">{d.label}{a?.strongest === d.key ? " ⭐" : ""}{a?.growth === d.key ? " ↗" : ""}</span>
                      <span className="bar"><span style={{ width: `${levels[d.key]}%` }} /></span>
                      <span className="n">Lv.{levels[d.key]}</span>
                    </div>
                  ))}
                </div>

                {a?.summary && <p className="hero-summary">{a.summary}</p>}

                {a?.nextAction && (
                  <div className="hero-action">
                    <div className="k">今日の1％</div>
                    <div className="t">{a.nextAction.title}</div>
                    <div className="d">{a.nextAction.description}</div>
                    {a.nextAction.fallback && <div className="f">むずかしければ：{a.nextAction.fallback}</div>}
                  </div>
                )}

                {hero?.history && hero.history.length >= 2 && <ChangeLine history={hero.history} />}

                <button className="hero-btn" onClick={assess} disabled={assessing}>
                  {assessing ? "見立て中…" : "🔄 いまのレベルを見なおす"}
                </button>
              </>
            ) : (
              <button className="hero-btn is-go" onClick={assess} disabled={assessing}>
                {assessing ? "見立て中…" : "✨ 今のレベルを見てみる"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** 変化の線（各領域の合計レベルの推移） */
function ChangeLine({ history }: { history: { at: string; levels: Levels }[] }) {
  const pts = history.map((h) => Object.values(h.levels).reduce((a, b) => a + b, 0) / 5);
  const max = 100, min = 0;
  const w = 260, hgt = 60;
  const step = pts.length > 1 ? w / (pts.length - 1) : w;
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(hgt - ((v - min) / (max - min)) * hgt).toFixed(1)}`).join(" ");
  return (
    <div className="hero-change">
      <div className="k">変化の流れ（平均レベル）</div>
      <svg viewBox={`0 0 ${w} ${hgt}`} className="hero-line">
        <path d={path} fill="none" stroke="#eed69b" strokeWidth="2" />
        {pts.map((v, i) => (
          <circle key={i} cx={i * step} cy={hgt - ((v - min) / (max - min)) * hgt} r="2.5" fill="#eed69b" />
        ))}
      </svg>
    </div>
  );
}
