"use client";

import { useEffect, useState } from "react";
import { ArrivalFx } from "./ArrivalFx";
import { feelGuide } from "@/lib/feelGuide";
import { FeelScene } from "./FeelScene";

/**
 * 未来からの手紙（全画面）。アプリを開いた最初は、これだけを見せる。
 * 差出人は「理想が叶った未来の自分」。ただし「未来のわたし」等の呼称は使わない（呼び名は人それぞれ・未確定のため）。
 * 具体は言えない＝今日きみが決めるから。理想の感情はピークステートで吸う。
 * 「未来の私」の写真を登録していれば、差出人としてそっと添える（臨場感のため・任意）。
 */
export type Letter = { date: string; body: string; emotion: string; hasIdeal: boolean; needsSetup?: boolean };

export function FutureLetter({
  letter, onClose, onGoIdeal, onGoPeak, onGoSetup, dramatic = true,
}: {
  letter: Letter;
  onClose: () => void;
  onGoIdeal?: () => void;
  onGoPeak?: () => void;
  onGoSetup?: () => void;
  dramatic?: boolean;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/future-self").then((r) => r.json()).then((d) => {
      if (typeof d?.url === "string" && d.url) setPhoto(d.url);
    }).catch(() => {});
  }, []);

  return (
    <div className="fletter-screen">
      {dramatic && <ArrivalFx tone="gold" />}
      <div className={`fletter-paper ${dramatic ? "arrive-in shimmer-sweep" : ""}`}>
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
            {(() => {
              const g = feelGuide(letter.emotion);
              return g ? (
                <div className="fletter-feel">
                  {/* 手紙の時点でも、その感覚の絵を見せておく（呼吸で同じ絵に再会する） */}
                  <FeelScene scene={g.scene} label={g.image} />
                  <div className="ff-body">{g.body}</div>
                  <div className="ff-img">{g.image}</div>
                </div>
              ) : null;
            })()}
            {/* ピークステートが何なのかを、ここで必ず渡す（知らないまま押させない） */}
            <div className="fletter-peekdef">
              <b>ピークステート</b>とは——<br />
              <em>あなたの理想が叶っている状態に、先になること。</em><br />
              叶ってから感じるんじゃなくて、<b>先に感じる</b>。そこから現実が動きだす。
            </div>
            <button className="fletter-cta is-main" onClick={() => { onGoPeak?.(); onClose(); }}>
              <span className="c-lead">▶ ここから始める</span>
              <span className="c-main">ピークステートで、この感情を吸う</span>
              <span className="c-sub">いまの気分を整えて、この感情に先になる（5分）</span>
            </button>
          </div>
        ) : null}

        <div className="fletter-sign">— きみが叶える、その世界から</div>
        <button className="fletter-close" onClick={onClose}>あとで（地図から自分で選ぶ）</button>
      </div>
    </div>
  );
}
