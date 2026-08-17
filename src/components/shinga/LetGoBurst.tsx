"use client";

/**
 * 「手放す」を押した瞬間の演出。
 *
 * 淳くん：「ボタンを押した時に、画面の上の方からヒラヒラと落ちてきて、
 *   バリーンと割れるような感じに。手に握っているボールペンを一緒に離す。カランカラン」
 *
 * 【流れ】
 *   ① 上から、思い込みの塊（暗い結晶）がヒラヒラ落ちてくる（1.4秒）
 *   ② 床の円陣に当たった瞬間、白く光ってバリーンと割れる。破片が四方へ飛ぶ（0.9秒）
 *   ③ 破片が光の粒になって消える。円陣にひと筋、光が走る（0.8秒）
 *   合計 3秒ちょっと。終わったら親に知らせて、消える。
 *
 * 【決まり】
 * ・演出は**押した本人のペンが落ちる時間**に重ねる。だから長すぎない。
 * ・音は鳴らさない（本物のペンが床に落ちる音を聞いてもらう場面。こちらの音で消さない）
 * ・動きを減らす設定の人には、割れたあとの完成形だけを一瞬見せる
 */
import { useEffect, useState } from "react";

const SHARDS = 18;

export function LetGoBurst({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"fall" | "burst" | "fade">("fall");

  useEffect(() => {
    const reduce = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("fade");
      const t = setTimeout(onDone, 900);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setPhase("burst"), 1400);
    const t2 = setTimeout(() => setPhase("fade"), 2300);
    const t3 = setTimeout(onDone, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`lgb is-${phase}`} aria-hidden="true">
      <div className="lgb-veil" />

      {/* ① 上から落ちてくる、思い込みの塊 */}
      {phase === "fall" && (
        <div className="lgb-fall">
          <svg viewBox="0 0 80 100" className="lgb-crystal">
            <polygon points="40,4 68,36 58,92 22,92 12,36" />
            <polyline points="40,4 40,92" />
            <polyline points="12,36 68,36" />
          </svg>
        </div>
      )}

      {/* ② 当たって割れる。閃光と破片 */}
      {phase !== "fall" && (
        <div className="lgb-hit">
          <div className="lgb-flash" />
          <div className="lgb-ring" />
          {Array.from({ length: SHARDS }, (_, i) => {
            const a = (i / SHARDS) * 360 + (i % 2) * 11;
            const d = 110 + (i % 3) * 46;
            const s = 0.7 + (i % 4) * 0.22;
            const r = (i * 53) % 360;
            return (
              <span
                key={i} className="lgb-shard"
                style={{ ["--a" as any]: `${a}deg`, ["--d" as any]: `${d}px`, ["--s" as any]: s, ["--r" as any]: `${r}deg` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
