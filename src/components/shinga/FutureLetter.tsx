"use client";

/**
 * 未来からの手紙（全画面）。アプリを開いた最初は、これだけを見せる。
 * 差出人は10年後の自分。具体は言えない＝今日きみが決めるから。理想の感情はピークステートで吸う。
 */
export type Letter = { date: string; body: string; emotion: string; hasIdeal: boolean };

export function FutureLetter({
  letter, onClose, onGoIdeal, onGoPeak,
}: {
  letter: Letter;
  onClose: () => void;
  onGoIdeal?: () => void;
  onGoPeak?: () => void;
}) {
  return (
    <div className="fletter-screen">
      <div className="fletter-paper">
        <div className="fletter-from">📜 未来のわたしから</div>
        <p className="fletter-txt">{letter.body}</p>

        {!letter.hasIdeal ? (
          <button className="fletter-cta" onClick={() => { onGoIdeal?.(); onClose(); }}>増やしたい世界を書く →</button>
        ) : letter.emotion ? (
          <div className="fletter-emo">
            <div className="k">この世界の感情</div>
            <div className="v">「{letter.emotion}」</div>
            <button className="fletter-cta" onClick={() => { onGoPeak?.(); onClose(); }}>
              ピークステートで、この感情を吸う →
            </button>
          </div>
        ) : null}

        <div className="fletter-sign">— 10年後のわたし より</div>
        <button className="fletter-close" onClick={onClose}>世界へ入る →</button>
      </div>
    </div>
  );
}
