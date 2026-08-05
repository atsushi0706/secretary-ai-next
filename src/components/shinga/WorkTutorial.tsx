"use client";

/**
 * 各ワークの「歩き方」。
 *
 * 【なぜ要るか】
 * 名前と3行の詩だけ見せて部屋に置かれても、
 * 「何をしながら、これをするのか」が分からないまま手が止まる。
 * 歩きながらなのか、声に出すのか、どこで終わるのか——そこが要る。
 *
 * 【いつ出るか】
 * ・その部屋に **初めて入ったときは、必ず出す**
 * ・2回目からは出さない。ただし **いつでも「？」から開ける**
 *
 * 初めてかどうかは、この端末に覚えておく（DBを増やさない）。
 * 別の端末で開いたときは、もう一度出る——それは害ではないので、そのままにしている。
 */
import { useEffect, useState } from "react";
import { MODES, type ModeKey } from "@/lib/modes";
import { WORK_GUIDE } from "@/lib/work-guide";

const KEY = "singa.tutorial.seen";

function seenSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); }
  catch { return new Set(); }
}

/** その部屋を、もう見たことがあるか */
export function tutorialSeen(mode: ModeKey): boolean {
  if (typeof window === "undefined") return true;   // 判定できないときは出さない（邪魔しない）
  return seenSet().has(mode);
}

export function markTutorialSeen(mode: ModeKey): void {
  if (typeof window === "undefined") return;
  try {
    const s = seenSet(); s.add(mode);
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch { /* 覚えられなくても、読むことはできる */ }
}

/** **強調** を太字にする */
function rich(t: string) {
  return t.split(/(\*\*[^*]+\*\*)/g).map((x, i) =>
    x.startsWith("**") && x.endsWith("**")
      ? <b key={i}>{x.slice(2, -2)}</b>
      : <span key={i}>{x}</span>);
}

export function WorkTutorial({ mode, first, onClose }: {
  mode: ModeKey;
  /** 初めて入ったときか（そのときだけ言い方を変える） */
  first?: boolean;
  onClose: () => void;
}) {
  const g = WORK_GUIDE[mode];
  const h = g?.howTo;
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  if (!g || !h) return null;

  return (
    <div className={`wtut ${ready ? "is-in" : ""}`} onClick={onClose}>
      <div className="wtut-card" onClick={(e) => e.stopPropagation()}>
        <div className="wtut-top">
          <div className="wtut-en">{MODES[mode].en}</div>
          <div className="wtut-ja">{MODES[mode].label}</div>
          <div className="wtut-one">{g.oneLine}</div>
        </div>

        {first && (
          <div className="wtut-first">
            はじめての部屋だね。<b>どう使うか</b>だけ、先に渡しておくよ。
          </div>
        )}

        <div className="wtut-sec">
          <div className="wtut-t">何をするためのもの？</div>
          <p className="wtut-p">{rich(h.purpose)}</p>
        </div>

        <div className="wtut-sec">
          <div className="wtut-t">こういう風に使います</div>
          <ol className="wtut-steps">
            {h.use.map((x, i) => (
              <li key={i}><span className="wtut-n">{i + 1}</span><span>{rich(x)}</span></li>
            ))}
          </ol>
        </div>

        <div className="wtut-leaves">
          <span>ここを出るとき残るもの</span>
          <b>{h.leaves}</b>
        </div>

        <button className="wtut-go" onClick={onClose}>
          {first ? "わかった。はじめる" : "閉じる"}
        </button>
        <p className="wtut-note">この案内は、部屋の右上の <b>？</b> からいつでも開けます。</p>
      </div>
    </div>
  );
}
