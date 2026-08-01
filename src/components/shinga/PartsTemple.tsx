"use client";

import { useEffect, useRef, useState } from "react";
import { PARTS, PART_COLORS, STEP_LABEL, type PartColor, type PartFace, type PartsStep } from "@/lib/parts";

/**
 * 内なる子の神殿。
 *  - PartsGate     … 入口。4体の守り手から「いま前に出ている子」を選ぶ盤面＋図鑑
 *  - PartsProgress … ワーク中に上に出る進行帯（誰が前にいるかが姿で分かる）
 *  - GuardianReveal… 解放の瞬間。守り手 → ガーディアンへ進化する演出
 *
 * 画像（/parts/*.png）が未配置でも壊れないよう、色の紋章にフォールバックする。
 */

/**
 * 画像が無いときは、その色の紋章（漢字）を出す。
 * onError だけだと、ハイドレーション前に読み込み失敗した画像を取りこぼすので、
 * マウント時にも「読み終わっているのに幅が0＝失敗」を見て判定する。
 */
function PartArt({ face, color, size = 120, glow = false, full = false }: {
  face: PartFace; color: PartColor; size?: number; glow?: boolean;
  /** true なら説明つきのカード全体、false なら顔だけの正方形 */
  full?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLImageElement | null>(null);
  const p = PARTS[color];
  const src = full ? face.img : face.face;

  useEffect(() => {
    setBroken(false);
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setBroken(true);
  }, [src]);

  if (broken) {
    return (
      <span className={`pt-art is-emblem ${glow ? "is-glow" : ""}`}
        style={{ width: size, height: size, ["--pc" as any]: p.hue }}
        aria-label={face.name}>
        <span className="pt-kanji">{p.kanji}</span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} className={`pt-art ${glow ? "is-glow" : ""} ${full ? "is-full" : ""}`} src={src} alt=""
      style={full ? { width: size, height: "auto", ["--pc" as any]: p.hue } : { width: size, height: size, ["--pc" as any]: p.hue }}
      onError={() => setBroken(true)}
      onLoad={(e) => { if ((e.currentTarget as HTMLImageElement).naturalWidth === 0) setBroken(true); }} />
  );
}

/* ────────────────────────────────────────────────────────── 入口 */

export function PartsGate({ onStart }: { onStart: (color: PartColor | null) => void }) {
  const [released, setReleased] = useState<PartColor[]>([]);
  const [peek, setPeek] = useState<PartColor | null>(null);

  useEffect(() => {
    fetch("/api/parts").then((r) => r.json()).then((d) => {
      setReleased(((d.guardians ?? []) as any[]).map((g) => g.color));
    }).catch(() => {});
  }, []);

  const complete = PART_COLORS.every((c) => released.includes(c));

  return (
    <div className="pt-gate">
      <div className="pt-gate-head">
        <h2>内なる子の神殿</h2>
        <p className="pt-lead">
          カッとなる。逃げたくなる。黙り込む。凹む。<br />
          ——それは全部、<b>守り手</b>の働き。
        </p>
        <div className="pt-howto">
          <div className="ph-row"><span className="ph-n">1</span>
            <span>奥に<b>内なる子</b>がいる。傷ついたときのまま、時間が止まっている</span></div>
          <div className="ph-row"><span className="ph-n">2</span>
            <span>守り手は、その子がもう傷つかないように<b>前に立って</b>その反応を出している</span></div>
          <div className="ph-row"><span className="ph-n">3</span>
            <span>奥へ入って子に会い、癒して<b>今の自分に取り込む</b></span></div>
          <div className="ph-row"><span className="ph-n">4</span>
            <span>守り手は守る役目を終えて、<b>才能</b>として自由になる</span></div>
        </div>
      </div>

      <div className="pt-ring">
        {PART_COLORS.map((c) => {
          const p = PARTS[c];
          const done = released.includes(c);
          const face = done ? p.guardian : p.defense;
          return (
            <button key={c} className={`pt-slot ${done ? "is-released" : ""} ${peek === c ? "is-peek" : ""}`}
              style={{ ["--pc" as any]: p.hue }}
              onClick={() => setPeek(peek === c ? null : c)}>
              <PartArt face={face} color={c} size={96} glow={done} />
              <span className="pt-slot-name">{face.name}</span>
              <span className="pt-slot-title">{face.title}</span>
              {done && <span className="pt-slot-badge">解放ずみ</span>}
            </button>
          );
        })}
      </div>

      {peek && <PeekCard color={peek} released={released.includes(peek)} onStart={() => onStart(peek)} />}

      {!peek && (
        <div className="pt-gate-foot">
          <p className="pt-hint">👆 いま自分に近いと感じる守り手を1つ選んでみて。</p>
          <button className="pt-unknown" onClick={() => onStart(null)}>
            どれかわからない → 話しながら一緒に見つける
          </button>
        </div>
      )}

      <div className={`pt-ledger ${complete ? "is-complete" : ""}`}>
        <span className="pl-title">🜂 四守の環</span>
        <span className="pl-dots">
          {PART_COLORS.map((c) => (
            <span key={c} className={`pl-dot ${released.includes(c) ? "on" : ""}`} style={{ ["--pc" as any]: PARTS[c].hue }} />
          ))}
        </span>
        <span className="pl-count">{released.length} / 4</span>
      </div>
      {complete && (
        <p className="pt-complete">
          四守の環が完成した。守り手はもう誰も、きみを閉じ込めていない。🏵
        </p>
      )}
    </div>
  );
}

/** 選んだ守り手の詳細。ここで「奥にいる子」までチラ見せして、行きたくさせる */
function PeekCard({ color, released, onStart }: { color: PartColor; released: boolean; onStart: () => void }) {
  const p = PARTS[color];
  return (
    <div className="pt-peek" style={{ ["--pc" as any]: p.hue }}>
      {/* カード画像そのものが説明を持っているので、絵を主役にする */}
      <div className="pk-card">
        <PartArt face={released ? p.guardian : p.defense} color={color} size={400} glow={released} full />
      </div>

      <div className="pk-cue">こういうとき前に出る：{p.cue}</div>

      {!released ? (
        <>
          <div className="pk-behind">
            <span className="pk-behind-label">この守り手の奥にいるのは…</span>
            <div className="pk-behind-row">
              <PartArt face={p.child} color={color} size={64} />
              <div>
                <div className="pk-child-title">{p.child.title}</div>
                <div className="pk-child-acts">{p.child.acts.join("・")}</div>
              </div>
            </div>
          </div>
          <button className="pk-go" onClick={onStart}>この守り手に会いにいく →</button>
        </>
      ) : (
        <>
          <div className="pk-msg">「{p.guardian.message}」</div>
          <button className="pk-go is-again" onClick={onStart}>もう一度、この子と話す</button>
        </>
      )}
    </div>
  );
}

/* ────────────────────────────────────── ワーク中の進行帯（常時表示のカード列） */

/**
 * ワーク中、ずっと上に出ている。
 *
 * 【守り手】→まもる→【内なる子】⇒解放⇒【ガーディアン】
 *
 * この3枚をいつでも見せておかないと、いま誰の話をしているのか・
 * 何が何を守っているのかが分からなくなる。だから1体だけ出す形はやめた。
 * まだ出会っていない姿は伏せておき、進むにつれて開く。
 */
function ChainCard({ face, color, label, active, revealed }: {
  face: PartFace; color: PartColor; label: string; active: boolean; revealed: boolean;
}) {
  return (
    <div className={`pc-card ${active ? "is-now" : ""} ${revealed ? "" : "is-hidden"}`}>
      {revealed
        ? <PartArt face={face} color={color} size={44} glow={active} />
        : <span className="pc-veil">？</span>}
      <span className="pc-role">{label}</span>
      <span className="pc-name">{revealed ? face.name : "？？？"}</span>
    </div>
  );
}

export function PartsProgress({ color, step }: { color: PartColor | null; step: PartsStep }) {
  if (!color) {
    return (
      <div className="pt-prog is-searching">
        <span className="pp-step">守り手をさがしている…</span>
      </div>
    );
  }
  const p = PARTS[color];
  // 1-4=守り手の話 / 5-7=内なる子の話 / 8-9=解き放たれた姿
  const stage = step <= 4 ? 0 : step <= 7 ? 1 : 2;
  const metChild = step >= 5;     // 出会うまで内なる子は伏せる
  const released = step >= 8;     // 解放するまでガーディアンは伏せる

  return (
    <div className="pt-chain" style={{ ["--pc" as any]: p.hue }}>
      <div className="pc-cards">
        <ChainCard face={p.defense} color={color} label="守り手" active={stage === 0} revealed />
        <span className="pc-arrow"><b>→</b>まもる</span>
        <ChainCard face={p.child} color={color} label="内なる子" active={stage === 1} revealed={metChild} />
        <span className={`pc-arrow ${released ? "is-on" : ""}`}><b>⇒</b>解放</span>
        <ChainCard face={p.guardian} color={color} label="才能" active={stage === 2} revealed={released} />
      </div>
      <div className="pc-foot">
        <span className="pc-track">
          {([1, 2, 3, 4, 5, 6, 7, 8, 9] as PartsStep[]).map((n) => (
            <span key={n} className={`pc-seg ${n <= step ? "on" : ""} ${n === step ? "now" : ""}`} title={STEP_LABEL[n]} />
          ))}
        </span>
        <span className="pc-step">{step}/9　{STEP_LABEL[step]}</span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────── ワークの導入（幻獣をバンと出す） */

/**
 * 守り手を選んだ直後に出る。会話はここが終わってから始まる。
 * いきなり質問に入らず、まず「その感情はきみを守るために出ている」を見せて渡す。
 */
export function PartsIntro({ color, onStart }: { color: PartColor; onStart: () => void }) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const p = PARTS[color];
  useEffect(() => {
    const a = setTimeout(() => setPhase(1), 1400);
    const b = setTimeout(() => setPhase(2), 2800);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  return (
    <div className="pi-screen" style={{ ["--pc" as any]: p.hue }}>
      <div className={`pi-inner ph-${phase}`}>
        <div className="pi-beast">
          <PartArt face={p.defense} color={color} size={230} glow />
        </div>
        <div className="pi-name">{p.defense.name}</div>
        <div className="pi-title">{p.defense.title}</div>

        <p className="pi-line-1">
          いま出てきたその感情は——<br />
          <b>きみを守るために出ている。</b>
        </p>

        {phase >= 1 && (
          <p className="pi-line-2">
            この守り手は、その感情を出すことで<b>何か</b>を守っている。<br />
            {p.defense.acts.slice(0, 3).join("・")}——全部そのため。
          </p>
        )}

        {phase >= 2 && (
          <>
            <div className="pi-behind">
              <span className="pi-behind-label">そして、その守っている先に</span>
              <div className="pi-behind-row">
                <PartArt face={p.child} color={color} size={72} />
                <div className="pi-behind-txt">
                  <b>内なる子</b>がいる。<br />
                  傷ついたときのまま、ずっと待っている。
                </div>
              </div>
            </div>
            <button className="pi-go" onClick={onStart}>
              この守り手が何を守っているのか、聞いてみる →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────── 出会いの瞬間（守り手 → 守られていた子） */

/**
 * 段階4で一度だけ出す。
 * 「あの守り手は、この子を守っていた」という前後関係を、絵で分からせる。
 * 文章だけだと関係が伝わらないので、ここは必ず視覚で見せる。
 */
export function ChildReveal({ color, onClose }: { color: PartColor; onClose: () => void }) {
  const [phase, setPhase] = useState<0 | 1>(0);
  const p = PARTS[color];
  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 1100);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="cr-overlay" onClick={phase === 1 ? onClose : undefined}>
      <div className={`cr-card ph-${phase}`} style={{ ["--pc" as any]: p.hue }} onClick={(e) => e.stopPropagation()}>
        <div className="cr-kicker">この守り手が、守っていたのは</div>
        <div className="cr-row">
          <div className="cr-side">
            <PartArt face={p.defense} color={color} size={110} />
            <span className="cr-name">{p.defense.name}</span>
            <span className="cr-role">前に立って守っていた</span>
          </div>
          {/* 向きは 守り手 → 内なる子。守っているのは守り手のほう */}
          <div className="cr-arrow">まもっていた</div>
          <div className="cr-side is-child">
            <PartArt face={p.child} color={color} size={130} glow />
            <span className="cr-name">{p.child.title}</span>
            <span className="cr-role">傷ついたまま、待っていた</span>
          </div>
        </div>
        {phase === 1 && (
          <>
            <p className="cr-msg">
              {p.defense.message}<br />
              その奥で、この子はずっと「{p.child.acts[0]}」と思っていた。
            </p>
            <button className="cr-close" onClick={onClose}>この子に会いにいく</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────── 解放の瞬間 */

export type GuardianEvent = {
  color: PartColor; first: boolean; total: number;
  name: string; title: string; from: string; message: string; complete: boolean;
};

export function GuardianReveal({ ev, onClose }: { ev: GuardianEvent; onClose: () => void }) {
  // 守り手 → 光 → ガーディアン、の3拍で見せる
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const p = PARTS[ev.color];

  useEffect(() => {
    const a = setTimeout(() => setPhase(1), 900);
    const b = setTimeout(() => setPhase(2), 2000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  return (
    <div className="gr-overlay" onClick={phase === 2 ? onClose : undefined}>
      <div className={`gr-card ph-${phase}`} style={{ ["--pc" as any]: p.hue }} onClick={(e) => e.stopPropagation()}>
        <div className="gr-stage">
          <span className="gr-burst" />
          <span className="gr-old"><PartArt face={p.defense} color={ev.color} size={190} /></span>
          <span className="gr-new"><PartArt face={p.guardian} color={ev.color} size={190} glow /></span>
        </div>

        {phase < 2 ? (
          <div className="gr-mid">{phase === 0 ? "役割を、降りていく…" : "✦"}</div>
        ) : (
          <div className="gr-body">
            <div className="gr-kicker">守り手が解き放たれた</div>
            <div className="gr-name">{ev.name}</div>
            <div className="gr-title">{ev.title}</div>
            <div className="gr-from">{ev.from} → 解放</div>
            {/* 手に入れたカードを、そのまま見せる */}
            <div className="gr-cardart"><PartArt face={p.guardian} color={ev.color} size={340} glow full /></div>
            {ev.first && <div className="gr-gain">🃏 スキルカード獲得 ／ ✦ 統合力 +25</div>}
            <div className="gr-ring">四守の環　{ev.total} / 4</div>
            {ev.complete && <div className="gr-complete">🏵 四守の環、完成。</div>}
            <button className="gr-close" onClick={onClose}>受け取る</button>
          </div>
        )}
      </div>
    </div>
  );
}
