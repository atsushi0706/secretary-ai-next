"use client";

/**
 * じぶんワークをつくる／カードを引く演出。
 *
 * 作り方は2ステップだけ（初めての人が迷わないように）：
 *   ① 「どんな時間にしたい？」をひとこと書く → 清瀬リンクが下書き
 *   ② 出てきた進め方（ブロックの列）を、直したいところだけ触って保存
 *
 * ブロックは2種類だけ：💬 問いかけ ／ 🎴 カードを引く。
 * カードの絵は、もともとアプリにある紋章から選ぶ（じぶんの札も作れる）。
 */
import { useEffect, useState } from "react";
import {
  CARD_ART, ORACLE_DECK, drawCard,
  type CustomWork, type OwnCard, type WorkStep,
} from "@/lib/custom-work-types";

/* ───────────────────────── カードを引く演出（実行中に使う） */

export function CardDrawOverlay({ work, deck, lead, onDone }: {
  work: CustomWork; deck: "oracle" | "own"; lead?: string;
  onDone: (card: OwnCard) => void;
}) {
  const [card, setCard] = useState<OwnCard | null>(null);
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="cd-overlay">
      <div className="cd-stage">
        <div className="cd-lead">{lead || "一枚、引いてみよう"}</div>
        {!card ? (
          <button className="cd-deck" onClick={() => {
            const c = drawCard(work, deck);
            setCard(c);
            setTimeout(() => setFlipped(true), 350);
          }}>
            <span className="cd-back">🜂</span>
            <span className="cd-hint">タップして引く</span>
          </button>
        ) : (
          <div className={`cd-card ${flipped ? "is-flipped" : ""}`}>
            <div className="cd-face cd-face-back"><span>🜂</span></div>
            <div className="cd-face cd-face-front">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.img} alt="" />
              <div className="cd-name">{card.name}</div>
              <div className="cd-meaning">{card.meaning}</div>
            </div>
          </div>
        )}
        {card && flipped && (
          <button className="cd-take" onClick={() => onDone(card)}>このカードを受け取る</button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── つくる画面 */

export function WorkMaker({ initial, onSaved, onBack }: {
  initial?: CustomWork | null;
  onSaved: () => void;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<"ask" | "edit">(initial ? "edit" : "ask");
  const [purpose, setPurpose] = useState(initial?.purpose ?? "");
  const [work, setWork] = useState<CustomWork>(initial ?? {
    name: "", emoji: "🌟", purpose: "", intro: "", closing: "", steps: [], cards: [],
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cardsOpen, setCardsOpen] = useState(false);

  async function draft() {
    if (!purpose.trim()) { setErr("ひとことでいいので教えて"); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/custom-works", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft", purpose }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "下書きに失敗");
      setWork({
        name: d.draft.name ?? "わたしのワーク",
        emoji: d.draft.emoji ?? "🌟",
        purpose,
        intro: d.draft.intro ?? "",
        closing: d.draft.closing ?? "",
        steps: (d.draft.steps ?? []).filter((s: any) => s?.kind === "q" ? s.q : s?.kind === "card"),
        cards: [],
      });
      setPhase("edit");
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!work.name.trim() || work.steps.length === 0) { setErr("名前と、進め方が1つ以上必要だよ"); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/custom-works", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", work }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "保存に失敗");
      onSaved();
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  const setStep = (i: number, s: WorkStep) =>
    setWork((w) => ({ ...w, steps: w.steps.map((x, j) => (j === i ? s : x)) }));
  const move = (i: number, dir: -1 | 1) => setWork((w) => {
    const st = [...w.steps];
    const j = i + dir;
    if (j < 0 || j >= st.length) return w;
    [st[i], st[j]] = [st[j], st[i]];
    return { ...w, steps: st };
  });
  const remove = (i: number) => setWork((w) => ({ ...w, steps: w.steps.filter((_, j) => j !== i) }));

  /* ── ① ひとこと ── */
  if (phase === "ask") {
    return (
      <div className="wm-screen">
        <button className="singa-back" onClick={onBack}>← もどる</button>
        <div className="wm-head">
          <h2>🎨 じぶんワークをつくる</h2>
          <p className="wm-lead">
            どんな時間にしたい？ ひとことで教えて。<br />
            清瀬リンクが、進め方の下書きを作るよ。
          </p>
        </div>
        <textarea className="wm-purpose" rows={3} value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="例：寝る前に、今日の不安をぜんぶ手放して眠りたい" />
        <div className="wm-examples">
          {["寝る前に今日の不安を手放したい", "朝、自分に火を入れる5分がほしい", "月に1回、自分と作戦会議したい"].map((ex) => (
            <button key={ex} onClick={() => setPurpose(ex)}>{ex}</button>
          ))}
        </div>
        {err && <p className="wm-err">{err}</p>}
        <button className="wm-go" onClick={() => void draft()} disabled={busy}>
          {busy ? "下書きをつくっています…" : "✨ 下書きをつくってもらう"}
        </button>
      </div>
    );
  }

  /* ── ② ブロックを整えて保存 ── */
  return (
    <div className="wm-screen">
      <button className="singa-back" onClick={() => (initial ? onBack() : setPhase("ask"))}>← もどる</button>
      <div className="wm-head">
        <h2>進め方をととのえる</h2>
        <p className="wm-lead">直したいところだけ触ればOK。上から順番に進むよ。</p>
      </div>

      <div className="wm-title-row">
        <input className="wm-emoji" value={work.emoji} maxLength={2}
          onChange={(e) => setWork((w) => ({ ...w, emoji: e.target.value }))} />
        <input className="wm-name" value={work.name} placeholder="ワークの名前"
          onChange={(e) => setWork((w) => ({ ...w, name: e.target.value }))} />
      </div>

      <label className="wm-label">始まりのひとこと（清瀬リンクが言う）</label>
      <input className="wm-input" value={work.intro}
        onChange={(e) => setWork((w) => ({ ...w, intro: e.target.value }))} />

      <label className="wm-label">進め方（上から順に）</label>
      <div className="wm-steps">
        {work.steps.map((s, i) => (
          <div key={i} className={`wm-step ${s.kind === "card" ? "is-card" : ""}`}>
            <span className="ws-icon">{s.kind === "q" ? "💬" : "🎴"}</span>
            {s.kind === "q" ? (
              <input value={s.q} onChange={(e) => setStep(i, { kind: "q", q: e.target.value })}
                placeholder="問いかけを書く" />
            ) : (
              <div className="ws-card">
                <select value={s.deck}
                  onChange={(e) => setStep(i, { ...s, deck: e.target.value as "oracle" | "own" })}>
                  <option value="oracle">星の紋章（16枚・内蔵）</option>
                  <option value="own">じぶんの札{work.cards.length ? `（${work.cards.length}枚）` : "（まだ0枚）"}</option>
                </select>
                <input value={s.lead ?? ""} placeholder="引く前のひとこと（任意）"
                  onChange={(e) => setStep(i, { ...s, lead: e.target.value })} />
              </div>
            )}
            <span className="ws-ops">
              <button onClick={() => move(i, -1)} title="上へ">▲</button>
              <button onClick={() => move(i, 1)} title="下へ">▼</button>
              <button onClick={() => remove(i)} title="削除">✕</button>
            </span>
          </div>
        ))}
      </div>
      <div className="wm-add">
        <button onClick={() => setWork((w) => ({ ...w, steps: [...w.steps, { kind: "q", q: "" }] }))}>＋ 💬 問いかけ</button>
        <button onClick={() => setWork((w) => ({ ...w, steps: [...w.steps, { kind: "card", deck: "oracle" }] }))}>＋ 🎴 カードを引く</button>
      </div>

      <label className="wm-label">締めかた</label>
      <input className="wm-input" value={work.closing}
        onChange={(e) => setWork((w) => ({ ...w, closing: e.target.value }))}
        placeholder="例：今日の自分にひとこと置いて、深呼吸して終わる" />

      {/* じぶんの札 */}
      <button className="wm-cards-toggle" onClick={() => setCardsOpen((v) => !v)}>
        {cardsOpen ? "▲ じぶんの札を閉じる" : `▼ じぶんの札をつくる（${work.cards.length}枚）`}
      </button>
      {cardsOpen && (
        <OwnCardsEditor cards={work.cards}
          onChange={(cards) => setWork((w) => ({ ...w, cards }))} />
      )}

      {err && <p className="wm-err">{err}</p>}
      <button className="wm-go" onClick={() => void save()} disabled={busy}>
        {busy ? "保存中…" : "💾 このワークを保存する"}
      </button>
    </div>
  );
}

/** じぶんの札：名前・意味・絵（既存の紋章から選ぶ） */
function OwnCardsEditor({ cards, onChange }: { cards: OwnCard[]; onChange: (c: OwnCard[]) => void }) {
  const [pickFor, setPickFor] = useState<number | null>(null);
  const set = (i: number, c: OwnCard) => onChange(cards.map((x, j) => (j === i ? c : x)));
  return (
    <div className="oc-editor">
      <p className="oc-lead">カードに「名前」と「意味（引いた人への言葉）」を書いて、絵を選んでね。</p>
      {cards.map((c, i) => (
        <div key={i} className="oc-row">
          <button className="oc-art" onClick={() => setPickFor(pickFor === i ? null : i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.img} alt="" />
          </button>
          <div className="oc-fields">
            <input value={c.name} placeholder="カードの名前" maxLength={12}
              onChange={(e) => set(i, { ...c, name: e.target.value })} />
            <input value={c.meaning} placeholder="意味（例：急がなくていい合図）" maxLength={60}
              onChange={(e) => set(i, { ...c, meaning: e.target.value })} />
          </div>
          <button className="oc-del" onClick={() => onChange(cards.filter((_, j) => j !== i))}>✕</button>
          {pickFor === i && (
            <div className="oc-artpick">
              {CARD_ART.map((img) => (
                <button key={img} className={c.img === img ? "on" : ""}
                  onClick={() => { set(i, { ...c, img }); setPickFor(null); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <button className="oc-add"
        onClick={() => onChange([...cards, { name: "", meaning: "", img: CARD_ART[cards.length % CARD_ART.length] }])}>
        ＋ 札を1枚ふやす
      </button>
      <p className="oc-note">※ 3枚以上あると、引くたびに変わって楽しいよ。足りないぶんは内蔵の紋章で補われる。</p>
    </div>
  );
}
