"use client";

import { useEffect, useState } from "react";

/**
 * 未来からの手紙。アプリを開いた最初に"開いた状態"で迎える（その日の初回だけ自動で開く）。
 * 差出人は10年後の自分。具体は言えない＝今日きみが決めるから。理想の感情はピークステートで吸う。
 */
type Letter = { date: string; body: string; emotion: string; hasIdeal: boolean };

export function FutureLetter({ guideName, onGoIdeal, onGoPeak }: { guideName: string; onGoIdeal?: () => void; onGoPeak?: () => void }) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/link-letter").then((r) => r.json()).then((d) => {
      if (!d?.letter) return;
      setLetter(d.letter);
      // その日の初回だけ、自動で開いて迎える
      try {
        const key = `iw-letter-opened-${d.letter.date}`;
        if (!localStorage.getItem(key)) { setOpen(true); localStorage.setItem(key, "1"); }
      } catch { setOpen(true); }
    }).catch(() => {});
  }, []);

  if (!letter) return null;

  return (
    <div className={`fletter ${open ? "is-open" : ""}`}>
      <button className="fletter-head" onClick={() => setOpen((v) => !v)}>
        <span className="ttl">📜 未来のわたしから、手紙が届いてる</span>
        <span className="chev">{open ? "とじる ▲" : "ひらく ▼"}</span>
      </button>

      {open && (
        <div className="fletter-body">
          <p className="txt">{letter.body}</p>

          {!letter.hasIdeal ? (
            <button className="fletter-cta" onClick={onGoIdeal}>増やしたい世界を書く →</button>
          ) : letter.emotion ? (
            <div className="fletter-emo">
              <div className="k">この世界の感情</div>
              <div className="v">「{letter.emotion}」</div>
              <button className="fletter-cta" onClick={onGoPeak}>ピークステートで、この感情を吸いにいく →</button>
            </div>
          ) : null}

          <div className="sign">— 10年後の{guideName ? "" : ""}わたし より</div>
        </div>
      )}
    </div>
  );
}
