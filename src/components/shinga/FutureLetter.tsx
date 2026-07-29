"use client";

import { useEffect, useState } from "react";

/**
 * 未来からの手紙（全画面）。アプリを開いた最初は、これだけを見せる。
 * 差出人は「理想が叶った未来の自分」。ただし「未来のわたし」等の呼称は使わない（呼び名は人それぞれ・未確定のため）。
 * 具体は言えない＝今日きみが決めるから。理想の感情はピークステートで吸う。
 * 「未来の私」の写真を登録していれば、差出人としてそっと添える（臨場感のため・任意）。
 */
export type Letter = { date: string; body: string; emotion: string; hasIdeal: boolean; needsSetup?: boolean };

export function FutureLetter({
  letter, onClose, onGoIdeal, onGoPeak, onGoSetup,
}: {
  letter: Letter;
  onClose: () => void;
  onGoIdeal?: () => void;
  onGoPeak?: () => void;
  onGoSetup?: () => void;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/future-self").then((r) => r.json()).then((d) => {
      if (typeof d?.url === "string" && d.url) setPhoto(d.url);
    }).catch(() => {});
  }, []);

  return (
    <div className="fletter-screen">
      <div className="fletter-paper">
        {photo && (
          <img className="fletter-photo" src={photo} alt="未来の私" onError={() => setPhoto(null)} />
        )}
        <div className="fletter-from">📜 未来から、手紙が届いてる</div>
        <p className="fletter-txt">{letter.body}</p>

        {letter.needsSetup ? (
          <button className="fletter-cta" onClick={() => { onGoSetup?.(); }}>初期設定を終わらせる →</button>
        ) : !letter.hasIdeal ? (
          <button className="fletter-cta" onClick={() => { onGoIdeal?.(); onClose(); }}>増やしたい世界を書く →</button>
        ) : letter.emotion ? (
          <div className="fletter-emo">
            <div className="k">この叶った世界の感情</div>
            <div className="v">「{letter.emotion}」</div>
            <button className="fletter-cta" onClick={() => { onGoPeak?.(); onClose(); }}>
              ピークステートで、この感情を吸う →
            </button>
          </div>
        ) : null}

        <div className="fletter-sign">— きみが叶える、その世界から</div>
        <button className="fletter-close" onClick={onClose}>世界へ入る →</button>
      </div>
    </div>
  );
}
