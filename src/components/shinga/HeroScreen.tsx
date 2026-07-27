"use client";

import { useEffect, useState } from "react";

/**
 * 主人公レベル画面（本人が現在地を選ぶ）。
 * 各領域は「どこに到達したか」を段階ボタンで選ぶ＝それが定義。不明はそのまま不明に。
 * 内面は状態値（完成を置かない）、提供・社会化は到達・規模。変化の線で伸びが見える。
 */
type Domain = "inner" | "embodiment" | "relationship" | "delivery" | "socialization";
type Levels = Record<Domain, number | null>;
type Hero = {
  enemy_world: string; desired_world: string; needed_people: string; hero_statement: string;
  levels: Levels | null; history: { at: string; levels: Levels }[] | null;
};

const DOMAINS: { key: Domain; label: string; kind: "state" | "reach"; steps: { label: string; value: number }[] }[] = [
  { key: "inner", label: "内側", kind: "state", steps: [
    { label: "まだ言葉にできない", value: 15 }, { label: "増やしたい世界を言葉にできる", value: 35 },
    { label: "なぜ望むのかも分かっている", value: 55 }, { label: "古い思い込みに気づけている", value: 72 },
    { label: "迷っても望む方向を思い出せる", value: 90 } ] },
  { key: "embodiment", label: "体現", kind: "state", steps: [
    { label: "まだ生活には出ていない", value: 15 }, { label: "自分に実践しようとしている", value: 35 },
    { label: "続いている小さな行動がある", value: 58 }, { label: "言うことと生活がだいたい一致", value: 78 },
    { label: "自分が望む世界の見本になっている", value: 92 } ] },
  { key: "relationship", label: "関係", kind: "state", steps: [
    { label: "まだ身近な人には出せていない", value: 15 }, { label: "身近な人にも出そうとしている", value: 38 },
    { label: "感謝・応援を言葉にできている", value: 60 }, { label: "流されず、自分の態度で表せる", value: 78 },
    { label: "相手から肯定的な反応がある", value: 92 } ] },
  { key: "delivery", label: "提供", kind: "reach", steps: [
    { label: "まだ提供していない", value: 12 }, { label: "誰かに提供したことがある", value: 30 },
    { label: "場があれば提供できる", value: 45 }, { label: "自分で募集して提供できる", value: 62 },
    { label: "継続的に提供できている", value: 78 }, { label: "対価が出て、仕事になっている", value: 95 } ] },
  { key: "socialization", label: "社会化", kind: "reach", steps: [
    { label: "まだ自分ひとりの範囲", value: 12 }, { label: "方法を言語化できている", value: 35 },
    { label: "他者に教えられる", value: 55 }, { label: "教材・サービスに体系化している", value: 72 },
    { label: "自分抜きでも価値が届く／広がっている", value: 92 } ] },
];

export function HeroScreen({ guideName, avatarUrl, onBack }: { guideName: string; avatarUrl: string; onBack: () => void }) {
  const [hero, setHero] = useState<Hero | null>(null);
  const [hasId, setHasId] = useState<boolean | null>(null);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [levels, setLevels] = useState<Levels>({ inner: null, embodiment: null, relationship: null, delivery: null, socialization: null });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [ew, setEw] = useState(""); const [dw, setDw] = useState("");
  const [np, setNp] = useState(""); const [hs, setHs] = useState("");
  function fill(h: Hero | null) { setEw(h?.enemy_world ?? ""); setDw(h?.desired_world ?? ""); setNp(h?.needed_people ?? ""); setHs(h?.hero_statement ?? ""); }

  async function load() {
    try {
      const r = await fetch("/api/hero"); const d = await r.json();
      if (d.error) { setErr(d.error); return; }
      setHero(d.hero); setHasId(!!d.hasIdentity); fill(d.hero);
      if (d.hero?.levels) setLevels(d.hero.levels);
      if (!d.hasIdentity) setEditing(true);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
  }
  useEffect(() => { load(); }, []);

  async function saveIdentity() {
    if (!dw.trim() && !hs.trim()) { setErr("増やしたい世界か、主人公像のどちらかは入れてね"); return; }
    setErr(null);
    const r = await fetch("/api/hero", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", enemy_world: ew, desired_world: dw, needed_people: np, hero_statement: hs }) });
    const d = await r.json();
    if (!r.ok) { setErr(d?.error ?? "保存できませんでした"); return; }
    setHero(d.hero); setHasId(true); setEditing(false);
  }

  async function saveLevels() {
    setSaving(true); setErr(null);
    try {
      const r = await fetch("/api/hero", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "levels", levels }) });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? "保存できませんでした"); return; }
      setHero(d.hero); setPicking(false);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setSaving(false); }
  }

  const hasLevels = hero?.levels && Object.values(hero.levels).some((v) => v != null);

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
            <button className="hero-btn is-go" onClick={saveIdentity}>この主人公で生きる</button>
            {hasId && <button className="hero-btn" onClick={() => { fill(hero); setEditing(false); }}>やめる</button>}
          </div>
        ) : picking ? (
          <div className="hero-pick">
            <p className="hero-pick-lead">今のきみは、どのへん？ 正直なところを選んでね。<br /><span>分からないものは「まだ分からない」でOK。</span></p>
            {DOMAINS.map((d) => (
              <div key={d.key} className="hero-pick-domain">
                <div className="hd">{d.label}<span>{d.kind === "state" ? "（今の深さ）" : "（規模・到達）"}</span></div>
                <div className="steps">
                  {d.steps.map((s) => (
                    <button key={s.value} className={levels[d.key] === s.value ? "is-on" : ""}
                      onClick={() => setLevels((p) => ({ ...p, [d.key]: s.value }))}>{s.label}</button>
                  ))}
                  <button className={`unk ${levels[d.key] == null ? "is-on" : ""}`}
                    onClick={() => setLevels((p) => ({ ...p, [d.key]: null }))}>まだ分からない</button>
                </div>
              </div>
            ))}
            <button className="hero-btn is-go" onClick={saveLevels} disabled={saving}>{saving ? "保存中…" : "これで記録する"}</button>
            <button className="hero-btn" onClick={() => setPicking(false)}>やめる</button>
          </div>
        ) : (
          <>
            <div className="hero-world">
              <div className="k">増やしたい世界</div><p>{hero?.desired_world || "—"}</p>
              <div className="k">主人公</div><p className="hs">{hero?.hero_statement || "—"}</p>
              <button className="hero-edit" onClick={() => setEditing(true)}>✏️ 書きなおす</button>
            </div>

            {hasLevels ? (
              <>
                <div className="hero-levels">
                  {DOMAINS.map((d) => {
                    const v = hero!.levels![d.key];
                    return (
                      <div key={d.key} className="hero-lv">
                        <span className="lb">{d.label}</span>
                        {v == null
                          ? <span className="bar unk"><span style={{ width: "0%" }} /></span>
                          : <span className={`bar ${d.kind === "reach" ? "is-reach" : ""}`}><span style={{ width: `${v}%` }} /></span>}
                        <span className="n">{v == null ? "不明" : `Lv.${v}`}</span>
                      </div>
                    );
                  })}
                </div>
                {hero?.history && hero.history.length >= 2 && <ChangeLine history={hero.history} />}
                <button className="hero-btn is-go" onClick={() => setPicking(true)}>今の現在地を選びなおす</button>
                <p className="hero-note">選んだ値が基礎。これから会話（パラレルウォーク等）の中でも動いていくよ。</p>
              </>
            ) : (
              <button className="hero-btn is-go" onClick={() => setPicking(true)}>✨ 今の現在地を選ぶ</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** 変化の線（分かっている領域の平均の推移） */
function ChangeLine({ history }: { history: { at: string; levels: Levels }[] }) {
  const avg = (lv: Levels) => {
    const vals = Object.values(lv).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const pts = history.map((h) => avg(h.levels));
  const w = 260, hgt = 56;
  const step = pts.length > 1 ? w / (pts.length - 1) : w;
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(hgt - (v / 100) * hgt).toFixed(1)}`).join(" ");
  const diff = pts.length >= 2 ? Math.round(pts[pts.length - 1] - pts[0]) : 0;
  return (
    <div className="hero-change">
      <div className="k">変化の流れ（分かっている領域の平均）{diff !== 0 && <b>{diff > 0 ? `＋${diff}` : diff}</b>}</div>
      <svg viewBox={`0 0 ${w} ${hgt}`} className="hero-line">
        <path d={path} fill="none" stroke="#eed69b" strokeWidth="2" />
        {pts.map((v, i) => <circle key={i} cx={i * step} cy={hgt - (v / 100) * hgt} r="2.5" fill="#eed69b" />)}
      </svg>
    </div>
  );
}
