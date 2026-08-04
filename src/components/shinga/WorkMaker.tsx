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

/** 最初のひとことを選びやすくする種。書いてもいいし、選んでもいい */
const SEEDS = [
  { emoji: "🌙", text: "寝る前に、今日の不安を手放したい" },
  { emoji: "🔥", text: "朝、自分に火を入れる5分がほしい" },
  { emoji: "🧭", text: "月に1回、自分と作戦会議したい" },
  { emoji: "🌊", text: "感情が波立ったとき、静める時間がほしい" },
  { emoji: "🎯", text: "迷ったときに、決めるための問いがほしい" },
  { emoji: "🌱", text: "うまくいった日を、ちゃんと味わいたい" },
];
const EMOJIS = ["🌟", "🌙", "🔥", "🧭", "🌊", "🎯", "🌱", "🜂", "🪞", "🕯", "🗝", "🦋", "☘️", "🌸", "⚓", "🎴"];


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
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [saved, setSaved] = useState(false);

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
      setSaved(true);
      setTimeout(() => onSaved(), 900);   // 「保存した」を見せてから戻る
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
        <div className="wm-hero">
          <div className="wm-orb"><span>🎨</span></div>
          <h2>じぶんの儀式をつくる</h2>
          <p className="wm-lead">
            きみだけのワークを、ここで編む。<br />
            <b>どんな時間にしたい？</b> ひとことでいい。
          </p>
        </div>

        {/* 何ができる場所なのか、先に渡す。無いまま置かれても手が動かない */}
        <div className="wm-about">
          <div className="wm-about-t">これは、何をするところ？</div>
          <p>
            <b>自分専用のワークを作って、地図に置ける</b>ところです。<br />
            作ると、地図に扉が増えます。押すと、決めた順に相棒が問いかけてくれます。
          </p>
          <div className="wm-about-l">
            <div><span>①</span>どんな時間にしたいかを、ひとこと決める</div>
            <div><span>②</span>問いかけと、カードを引くところを並べる</div>
            <div><span>③</span>保存すると、地図に扉ができる</div>
            <div><span>④</span>いつでも入って、何度でもできる</div>
          </div>
          <p className="wm-about-n">
            作ったあとも、扉を長押し（右クリック）で書き直せます。消すのも自由です。
          </p>
        </div>

        <div className="wm-seeds">
          {SEEDS.map((sd) => (
            <button key={sd.text} className={`wm-seed ${purpose === sd.text ? "on" : ""}`}
              onClick={() => setPurpose(sd.text)}>
              <span className="ws-emoji">{sd.emoji}</span>
              <span className="ws-txt">{sd.text}</span>
            </button>
          ))}
        </div>

        <textarea className="wm-purpose" rows={3} value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="自分の言葉で書いてもいい（例：夜、今日の不安を全部おろして眠りたい）" />

        {err && <p className="wm-err">{err}</p>}
        <button className="wm-go" onClick={() => void draft()} disabled={busy}>
          {busy ? "✧ 編んでいます…" : "✨ 儀式の型をつくってもらう"}
        </button>
        <p className="wm-note">できた型は、あとから自由に組み替えられるよ。</p>

        {/* 型をもらわず、まっさらから自分で組みたい人のために */}
        <button className="wm-blank" disabled={busy}
          onClick={() => {
            setWork({
              name: "", emoji: "🌟", purpose: purpose.trim(),
              intro: "", closing: "",
              steps: [{ kind: "q", q: "" }],   // 空の問いを1つだけ置いて始める
              cards: [],
            });
            setErr("");
            setPhase("edit");
          }}>
          📄 白紙から、自分で組む
        </button>
        <p className="wm-note">問いも順番も、ぜんぶ自分で決めたいときはこちら。</p>
      </div>
    );
  }

  /* ── ② ブロックを整えて保存 ── */
  const qCount = work.steps.filter((x) => x.kind === "q").length;
  const cCount = work.steps.filter((x) => x.kind === "card").length;

  return (
    <div className="wm-screen">
      <button className="singa-back" onClick={() => (initial ? onBack() : setPhase("ask"))}>← もどる</button>

      {/* 作りかけの儀式。ここが主役に見えるように */}
      <div className="wm-scroll">
        <div className="wm-scroll-top">
          <button className="wm-emoji" onClick={() => setEmojiOpen((v) => !v)} title="しるしを選ぶ">
            {work.emoji || "🌟"}
          </button>
          <input className="wm-name" value={work.name} placeholder="この儀式の名前"
            onChange={(e) => setWork((w) => ({ ...w, name: e.target.value }))} />
        </div>
        {emojiOpen && (
          <div className="wm-emojipick">
            {EMOJIS.map((e) => (
              <button key={e} className={work.emoji === e ? "on" : ""}
                onClick={() => { setWork((w) => ({ ...w, emoji: e })); setEmojiOpen(false); }}>{e}</button>
            ))}
          </div>
        )}
        <div className="wm-meta">
          <span>💬 {qCount}</span><span>🎴 {cCount}</span>
          <span className="wm-min">およそ {Math.max(2, work.steps.length * 2)} 分</span>
        </div>
      </div>

      {/* 始まりのひとこと */}
      <label className="wm-label">はじまりの言葉（清瀬リンクが言う）</label>
      <input className="wm-input" value={work.intro} placeholder="例：今日もおつかれさま。ここからは、ぜんぶ降ろしていい時間だよ。"
        onChange={(e) => setWork((w) => ({ ...w, intro: e.target.value }))} />

      {/* 道のり */}
      <label className="wm-label">道のり（上から順に歩く）</label>
      <div className="wm-path">
        {work.steps.map((st, i) => (
          <div key={i} className={`wm-node ${st.kind === "card" ? "is-card" : ""}`}>
            <span className="wn-mark">{st.kind === "q" ? "💬" : "🎴"}</span>
            <div className="wn-body">
              {st.kind === "q" ? (
                <input value={st.q} placeholder="ここで聞くこと"
                  onChange={(e) => setStep(i, { kind: "q", q: e.target.value })} />
              ) : (
                <>
                  <div className="wn-decks">
                    {(["oracle", "own"] as const).map((dk) => (
                      <button key={dk} className={st.deck === dk ? "on" : ""}
                        onClick={() => setStep(i, { ...st, deck: dk })}>
                        {dk === "oracle" ? "星の紋章（16枚）" : `じぶんの札（${work.cards.length}）`}
                      </button>
                    ))}
                  </div>
                  <input value={st.lead ?? ""} placeholder="引く前のひとこと（任意）"
                    onChange={(e) => setStep(i, { ...st, lead: e.target.value })} />
                </>
              )}
            </div>
            <span className="wn-ops">
              <button onClick={() => move(i, -1)} title="上へ">▲</button>
              <button onClick={() => move(i, 1)} title="下へ">▼</button>
              <button onClick={() => remove(i)} title="外す">✕</button>
            </span>
          </div>
        ))}
        <div className="wm-node is-end"><span className="wn-mark">🏁</span>
          <div className="wn-body">
            <input value={work.closing} placeholder="どう締めたい？（例：深呼吸して終わる）"
              onChange={(e) => setWork((w) => ({ ...w, closing: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="wm-add">
        <button onClick={() => setWork((w) => ({ ...w, steps: [...w.steps, { kind: "q", q: "" }] }))}>
          ＋ 💬 問いかけ
        </button>
        <button onClick={() => setWork((w) => ({ ...w, steps: [...w.steps, { kind: "card", deck: "oracle" }] }))}>
          ＋ 🎴 カードを引く
        </button>
      </div>

      <button className="wm-cards-toggle" onClick={() => setCardsOpen((v) => !v)}>
        {cardsOpen ? "▲ じぶんの札を閉じる" : `🃏 じぶんの札をつくる（${work.cards.length}枚）`}
      </button>
      {cardsOpen && (
        <OwnCardsEditor cards={work.cards} onChange={(cards) => setWork((w) => ({ ...w, cards }))} />
      )}

      {err && <p className="wm-err">{err}</p>}
      {saved && <p className="wm-saved">✓ 保存したよ。地図に扉が増えてる。</p>}
      <button className="wm-go" onClick={() => void save()} disabled={busy}>
        {busy ? "刻んでいます…" : "🜂 この儀式を刻む"}
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
