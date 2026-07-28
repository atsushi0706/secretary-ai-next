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
        <li>口をつむんで、すき間から「ふーっ」と少しずつ吐く。お腹に圧をかけて吐ききる。</li>
        <li>吐ききったら「はぁー」と吸って、目をつむって身体に馴染ませる。</li>
        <li>これを3回。立って、体を左右にゆらしながら。</li>
      </ol>
      <div className="singa-panel-sub">いまの状態</div>
      <StatePanel embedded />
    </div>
  );
}
