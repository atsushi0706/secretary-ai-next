"use client";

import { getCanonicalMangaScene } from "@/lib/learn/erickson-canon";
import type { CanonicalMangaCharacter } from "@/lib/learn/types";

const CHARACTER: Record<CanonicalMangaCharacter, { name: string; src: string }> = {
  jun: { name: "清瀬 淳", src: "/learn/chars/jun-neutral-v1.png" },
  link: { name: "清瀬リンク", src: "/learn/chars/link-neutral.webp" },
  mio: { name: "雨宮ミオ", src: "/learn/chars/mio-neutral-v1.webp" },
  teacher: { name: "ミルトン・エリクソン", src: "/learn/adventure/erickson-cutout-v1.webp" },
};

export function CanonicalMangaSceneView({ sceneId, compact = false }: { sceneId: string; compact?: boolean }) {
  const scene = getCanonicalMangaScene(sceneId);
  return (
    <div className={`lrn-canon-manga setting-${scene.setting} ${compact ? "is-compact" : ""}`} data-scene-id={scene.id}>
      <img className="lrn-canon-bg" src="/learn/adventure/erickson-study-v1.webp" alt="" draggable={false} />
      <div className="lrn-canon-atmosphere" />
      <div className="lrn-canon-scene-label"><b>SCENE {scene.episode}-{scene.page}</b><span>{scene.time}</span></div>
      {scene.narration && <p className="lrn-canon-narration">{scene.narration}</p>}
      <div className={`lrn-canon-cast count-${scene.present.length}`}>
        {scene.present.map((who) => (
          <img
            key={who}
            className={`lrn-canon-character is-${who} ${scene.focus === who ? "is-focus" : "is-support"}`}
            src={CHARACTER[who].src}
            alt={CHARACTER[who].name}
            draggable={false}
          />
        ))}
      </div>
      <div className="lrn-canon-lines">
        {scene.lines.map((line, index) => (
          <div key={`${line.who}-${index}`} className={`lrn-canon-line is-${line.who} ${line.kind === "thought" ? "is-thought" : ""}`}>
            <b>{CHARACTER[line.who].name}{line.kind === "thought" ? "・心の声" : ""}</b>
            <span>{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
