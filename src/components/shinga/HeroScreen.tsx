"use client";

import { useEffect, useState } from "react";
import { AwakenChart } from "./AwakenChart";

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

const DOMAINS: { key: Domain; label: string; sub: string; kind: "state" | "reach"; steps: { label: string; value: number }[] }[] = [
  { key: "inner", label: "① 心の中", sub: "その理想の自分でいるとき、心の中はどうなってる？", kind: "state", steps: [
    { label: "まだ実感がない（他人事に感じる）", value: 15 },
    { label: "たまに、そうなれた気がする瞬間がある", value: 35 },
    { label: "落ち着いているときは、その自分でいられる", value: 55 },
    { label: "揺れても、その自分に戻ってこられる", value: 75 },
    { label: "もうそれが普通の自分になっている", value: 92 } ] },
  { key: "embodiment", label: "② 毎日の行動", sub: "その自分なら選ぶ行動を、どれだけ選べてる？", kind: "state", steps: [
    { label: "まだ行動は変わっていない", value: 15 },
    { label: "たまに、その自分らしい選択ができる", value: 35 },
    { label: "続いている小さな習慣がある", value: 58 },
    { label: "日常の選択が、だいたいその自分と一致", value: 78 },
    { label: "迷ったときも、その自分として選べる", value: 92 } ] },
  { key: "relationship", label: "③ 人との関わり", sub: "身近な人の前でも、その自分でいられてる？", kind: "state", steps: [
    { label: "身近な人の前では出せない", value: 15 },
    { label: "少しずつ出そうとしている", value: 38 },
    { label: "言いたいことを言葉にできている", value: 60 },
    { label: "流されず、その自分の態度でいられる", value: 78 },
    { label: "相手にも、その自分として受け取られている", value: 92 } ] },
  { key: "delivery", label: "④ 誰かに届ける", sub: "その自分として、誰かに何かを渡せてる？", kind: "reach", steps: [
    { label: "まだ誰にも渡していない", value: 12 },
    { label: "身近な誰かに渡したことがある", value: 30 },
    { label: "求められれば渡せる", value: 45 },
    { label: "自分から声をかけて渡している", value: 62 },
    { label: "続けて渡せている", value: 78 },
    { label: "対価が生まれ、仕事になっている", value: 95 } ] },
  { key: "socialization", label: "⑤ 世の中への広がり", sub: "自分ひとりを超えて、どこまで広がってる？", kind: "reach", steps: [
    { label: "まだ自分ひとりの範囲", value: 12 },
    { label: "やり方を言葉にできている", value: 35 },
    { label: "他の人に教えられる", value: 55 },
    { label: "誰かが受け取って、その人も動き出している", value: 72 },
    { label: "自分がいなくても広がっていく", value: 92 } ] },
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
        ) : !hasLevels && hasId ? (
          <div className="hero-firstrun">
            <p>
              主人公は決まってる。あとは<b>「今どのへんにいるか」</b>を教えて。<br />
              5つの層をポチポチ選ぶだけ（1分）。分からないところは「まだ分からない」でOK。
            </p>
            <button className="hero-btn is-go" onClick={() => setPicking(true)}>現在地を選ぶ（1分）</button>
          </div>
        ) : picking ? (
          <div className="hero-pick">
            <p className="hero-pick-lead">
              <b>「{hero?.hero_statement || "その主人公"}」</b>——この自分を、いまの自分だとしたら。<br />
              内側から外側へ、5つの層で正直なところを選んでね。<br />
              <span>心の中 → 毎日の行動 → 人との関わり → 誰かに届ける → 世の中への広がり。分からないものは「まだ分からない」でOK。</span>
            </p>
            {DOMAINS.map((d) => (
              <div key={d.key} className="hero-pick-domain">
                <div className="hd">{d.label}<span>{d.kind === "state" ? "（今の深さ）" : "（規模・到達）"}</span></div>
                <div className="hd-sub">{d.sub}</div>
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
                    const idx = v == null ? -1 : d.steps.findIndex((s) => s.value === v);
                    const stageLabel = idx >= 0 ? d.steps[idx].label : "まだ分からない";
                    return (
                      <div key={d.key} className="hero-lv">
                        <div className="top">
                          <span className="lb">{d.label}</span>
                          <span className="stagechip">{idx >= 0 ? `${idx + 1}/${d.steps.length}` : "—"}</span>
                        </div>
                        <div className={`state ${v == null ? "is-unk" : ""}`}>{stageLabel}</div>
                        {v == null
                          ? <span className="bar unk"><span style={{ width: "0%" }} /></span>
                          : <span className={`bar ${d.kind === "reach" ? "is-reach" : ""}`}><span style={{ width: `${((idx + 1) / d.steps.length) * 100}%` }} /></span>}
                      </div>
                    );
                  })}
                </div>
                {hero?.history && hero.history.length >= 2 && <HeroChange history={hero.history} />}
                <AwakenChart />
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

/** 変化（今日/1週間/1か月の増減＋分かっている領域の平均の推移） */
type Snap = { at: string; levels: Levels };
function avgKnown(lv: Levels): number {
  const vals = Object.values(lv).filter((v): v is number => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

/** 期間の変化 = 今の平均 − その期間が始まる直前（＝基準）の平均 */
function periodDelta(history: Snap[], sinceMs: number): number | null {
  if (history.length < 2) return null;
  const now = avgKnown(history[history.length - 1].levels);
  // 期間開始より前の最後のスナップショット（無ければ最古）を基準にする
  let base: Snap | null = null;
  for (const h of history) {
    if (new Date(h.at).getTime() < sinceMs) base = h;
  }
  const baseAvg = avgKnown((base ?? history[0]).levels);
  return Math.round(now - baseAvg);
}

function HeroChange({ history }: { history: Snap[] }) {
  const now = Date.now();
  const day = 86400000;
  const periods: { label: string; d: number | null }[] = [
    { label: "今日", d: periodDelta(history, now - day) },
    { label: "1週間", d: periodDelta(history, now - 7 * day) },
    { label: "1か月", d: periodDelta(history, now - 30 * day) },
  ];

  const pts = history.map((h) => avgKnown(h.levels));
  const w = 260, hgt = 56;
  const step = pts.length > 1 ? w / (pts.length - 1) : w;
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(hgt - (v / 100) * hgt).toFixed(1)}`).join(" ");

  return (
    <div className="hero-change">
      <div className="k">この頃の変化（分かっている領域の平均）</div>
      <div className="hero-deltas">
        {periods.map((p) => (
          <div key={p.label} className={`hd-chip ${p.d == null ? "z" : p.d > 0 ? "up" : p.d < 0 ? "down" : "z"}`}>
            <span className="t">{p.label}</span>
            <span className="v">{p.d == null ? "—" : p.d > 0 ? `＋${p.d}` : p.d < 0 ? `${p.d}` : "±0"}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${hgt}`} className="hero-line">
        <path d={path} fill="none" stroke="#eed69b" strokeWidth="2" />
        {pts.map((v, i) => <circle key={i} cx={i * step} cy={hgt - (v / 100) * hgt} r="2.5" fill="#eed69b" />)}
      </svg>
    </div>
  );
}
