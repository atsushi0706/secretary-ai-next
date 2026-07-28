"use client";

import { StatePanel } from "./StatePanel";

/**
 * ピークステートのパネル。
 * 状態づくり（呼吸）は会話でガイドするので、ここは記録に集中する。
 * 呼吸の手順は、いつでも見返せるよう静かに置いておく。
 */
export function PeakPanel() {
  return (
    <div className="singa-panel">
      <div className="singa-panel-title">波動を上げる呼吸</div>
      <ol className="singa-breath">
        <li>立って体をゆらしながら、口をすぼめて（ろうそくを細く消すように）強く、少しずつ吐ききる。</li>
        <li>吐ききったら、少し止めて“真空”をつくる（5秒）。</li>
        <li>そこから一気に、強く吸う。</li>
        <li>ゆっくり呼吸で、15秒かけて整える。これを3回。</li>
      </ol>
      <div className="singa-panel-sub">いまの状態</div>
      <StatePanel embedded />
    </div>
  );
}
