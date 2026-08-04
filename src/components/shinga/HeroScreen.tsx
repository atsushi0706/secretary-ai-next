"use client";

import { useEffect, useRef, useState } from "react";
import { AwakenChart } from "./AwakenChart";
import { DOMAINS, STEPS, type HeroDomain } from "@/lib/hero-domains";

/**
 * 主人公とレベル。
 *
 * 【前はこうだった／なぜ変えたか】
 * 5つの領域の段階を、本人がボタンで選ぶ形だった。
 * でも「いま自分はどの段階か」を判断する基準がどこにもないので、選ぶ手が止まる。
 * 選び直すたびに「この頃の変化 −19」のような数字が出るが、それが何なのかも伝わらない。
 *
 * だから **数字は本人に選ばせない**。週に1回、相棒が話しかけてきて、
 * 暮らしの様子をいくつか聞く。その答えから、こちらでレベルを決める。
 * 本人がやることは、聞かれたことに答えるだけ。
 *
 * 【測る前は、数字を出さない】
 * 内部の基準は真ん中（50）だが、測る前から「あなたは50です」と出しても意味がない。
 * 一度も測っていない領域は、空のままにしておく。
 *
 * 【一気に下げない】
 * 悪い週があっても叩き落とさない。1回で下がるのは最大6まで（サーバ側で止めている）。
 */
type Levels = Record<HeroDomain, number | null>;
type Hero = {
  enemy_world: string; desired_world: string; needed_people: string; hero_statement: string;
  levels: Levels | null; history: { at: string; levels: Levels }[] | null;
};
type CheckState = { due: boolean; daysUntilDue: number; lastCheckedAt: string | null; measured: boolean };
type Pick = { domain: HeroDomain; value: number; why: string };
type Line = { role: "assistant" | "user"; content: string };

/** サーバが決めた値が、どの段階に当たるかを探す（ぴったり無ければ、いちばん近いもの） */
function stepOf(d: HeroDomain, v: number | null): { idx: number; label: string; total: number } {
  const steps = STEPS[d];
  if (v == null) return { idx: -1, label: "まだ測っていない", total: steps.length };
  let best = 0;
  for (let i = 1; i < steps.length; i++) {
    if (Math.abs(steps[i].value - v) < Math.abs(steps[best].value - v)) best = i;
  }
  return { idx: best, label: steps[best].label, total: steps.length };
}

export function HeroScreen({ guideName, avatarUrl, onBack }: { guideName: string; avatarUrl: string; onBack: () => void }) {
  const [hero, setHero] = useState<Hero | null>(null);
  const [hasId, setHasId] = useState<boolean | null>(null);
  const [check, setCheck] = useState<CheckState | null>(null);
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [ew, setEw] = useState(""); const [dw, setDw] = useState("");
  const [np, setNp] = useState(""); const [hs, setHs] = useState("");
  function fill(h: Hero | null) { setEw(h?.enemy_world ?? ""); setDw(h?.desired_world ?? ""); setNp(h?.needed_people ?? ""); setHs(h?.hero_statement ?? ""); }

  // ── 週1回のレベルチェック（会話）
  const [inCheck, setInCheck] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/hero"); const d = await r.json();
      if (d.error) { setErr(d.error); return; }
      setHero(d.hero); setHasId(!!d.hasIdentity); setCheck(d.check ?? null); fill(d.hero);
      if (!d.hasIdentity) setEditing(true);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines, busy]);

  async function saveIdentity() {
    if (!dw.trim() && !hs.trim()) { setErr("増やしたい世界か、主人公像のどちらかは入れてね"); return; }
    setErr(null);
    const r = await fetch("/api/hero", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", enemy_world: ew, desired_world: dw, needed_people: np, hero_statement: hs }) });
    const d = await r.json();
    if (!r.ok) { setErr(d?.error ?? "保存できませんでした"); return; }
    setHero(d.hero); setHasId(true); setEditing(false);
  }

  /** 相棒に次の一言（＋分かったぶんの埋め）をもらう */
  async function turn(history: Line[], known: Pick[]) {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/hero", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_turn", history,
          filled: Array.from(new Set(known.map((p) => p.domain))),
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? "うまく聞けなかった"); return; }

      const got: Pick[] = Array.isArray(d.picks) ? d.picks : [];
      // 同じ領域が二度出たら、あとの答えを採る
      const merged = [...known.filter((p) => !got.some((g) => g.domain === p.domain)), ...got];
      setPicks(merged);
      setLines([...history, { role: "assistant", content: String(d.say ?? "") }]);
      if (d.done) setFinished(true);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  function startCheck() {
    setInCheck(true); setLines([]); setPicks([]); setFinished(false); setDraft("");
    turn([], []);
  }

  function send() {
    const t = draft.trim();
    if (!t || busy) return;
    setDraft("");
    turn([...lines, { role: "user", content: t }], picks);
  }

  /** 結果を確定。ここで初めて数字が動く */
  async function commit() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/hero", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_commit", picks }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? "記録できませんでした"); return; }
      setInCheck(false);
      await load();
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  const measured = !!check?.measured;
  const due = !!check?.due;

  return (
    <div className="hero">
      <button className="singa-back" onClick={onBack}>← 地図にもどる</button>
      <div className="hero-card">
        <div className="rep-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
        ) : inCheck ? (
          <div className="hchk">
            <div className="hchk-lead">
              <b>レベルチェック</b>
              <span>いまの様子をいくつか聞くね。思ったままでいいよ。</span>
            </div>

            <div className="hchk-log">
              {lines.map((l, i) => (
                <div key={i} className={`hchk-line is-${l.role}`}>
                  <span>{l.content}</span>
                </div>
              ))}
              {busy && <div className="hchk-line is-assistant is-wait"><span>…</span></div>}
              <div ref={endRef} />
            </div>

            {/* 話しながら埋まっていくのが見える。数字は出さない（数字に合わせて答えてしまうから） */}
            <div className="hchk-fill">
              {DOMAINS.map((d) => {
                const on = picks.some((p) => p.domain === d.key);
                const why = picks.find((p) => p.domain === d.key)?.why;
                return (
                  <div key={d.key} className={`hchk-item ${on ? "is-on" : ""}`}>
                    <span className="ci-mark">{on ? "✓" : "○"}</span>
                    <span className="ci-label">{d.label}</span>
                    {why && <span className="ci-why">{why}</span>}
                  </div>
                );
              })}
            </div>

            {!finished ? (
              <div className="hchk-input">
                <textarea value={draft} rows={2} placeholder="思ったままでいいよ"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
                <button className="hero-btn is-go" onClick={send} disabled={busy || !draft.trim()}>送る</button>
              </div>
            ) : (
              <div className="hchk-done">
                <p>ここまでで、{picks.length}つ分かったよ。記録しておく？</p>
                <button className="hero-btn is-go" onClick={commit} disabled={busy || !picks.length}>
                  {busy ? "記録中…" : "これで記録する"}
                </button>
              </div>
            )}
            <button className="hero-btn" onClick={() => setInCheck(false)} disabled={busy}>やめる</button>
          </div>
        ) : (
          <>
            <div className="hero-world">
              <div className="k">増やしたい世界</div><p>{hero?.desired_world || "—"}</p>
              <div className="k">主人公</div><p className="hs">{hero?.hero_statement || "—"}</p>
              <button className="hero-edit" onClick={() => setEditing(true)}>✏️ 書きなおす</button>
            </div>

            {measured && hero?.levels && (
              <div className="hero-levels">
                {DOMAINS.map((d) => {
                  const v = hero.levels![d.key];
                  const st = stepOf(d.key, v);
                  return (
                    <div key={d.key} className="hero-lv">
                      <div className="top">
                        <span className="lb">{d.label}</span>
                        <span className="stagechip">{st.idx >= 0 ? `${st.idx + 1}/${st.total}` : "—"}</span>
                      </div>
                      <div className={`state ${v == null ? "is-unk" : ""}`}>{st.label}</div>
                      {v == null
                        ? <span className="bar unk"><span style={{ width: "0%" }} /></span>
                        : <span className={`bar ${d.kind === "reach" ? "is-reach" : ""}`}><span style={{ width: `${((st.idx + 1) / st.total) * 100}%` }} /></span>}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="hero-check-cta">
              {!measured && (
                <p className="hcc-lead">
                  まだ一度も測っていないよ。<br />
                  <b>相棒がいくつか聞くから、答えるだけ</b>でいい。数字は選ばなくて大丈夫。
                </p>
              )}
              {due ? (
                <button className="hero-btn is-go" onClick={startCheck} disabled={!hasId}>
                  {measured ? "🏅 今週のレベルチェックをする" : "🏅 はじめてのレベルチェックをする"}
                </button>
              ) : (
                <>
                  <button className="hero-btn" disabled>次のチェックまで、あと{check?.daysUntilDue}日</button>
                  <p className="hero-note">
                    週に1回のペースで測るよ。毎日測っても揺れが見えるだけだから、間を置くほうが効く。
                  </p>
                </>
              )}
              {!hasId && <p className="hero-note">先に、上の「主人公」を書いてね。</p>}
            </div>

            {measured && <AwakenChart />}
          </>
        )}
      </div>
    </div>
  );
}
