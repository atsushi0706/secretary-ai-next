import type { EpisodeFoundation } from "./episode-foundation";

export type SeriesHumanArcReview = {
  ok: boolean;
  issues: string[];
};

/**
 * 毎話同じ「後日報告」に揃える検査ではない。
 * 人物の変化が一つのテンプレートへ固定されず、物語全体で異なる形に回収されるかを見る。
 */
export function reviewSeriesHumanArcs(foundations: EpisodeFoundation[]): SeriesHumanArcReview {
  const issues: string[] = [];
  const modes = foundations.map((foundation) => foundation.humanArc.payoff.mode);

  if (new Set(modes).size < 4) {
    issues.push("変化の見せ方が単調です。即時行動、相手の反応、後の回収、失敗からの再挑戦などへ分散してください。");
  }

  modes.forEach((mode, index) => {
    if (index >= 2 && mode === modes[index - 1] && mode === modes[index - 2]) {
      issues.push(`第${index - 1}〜${index + 1}話で変化の見せ方「${mode}」が三回連続しています。`);
    }
  });

  const desireSet = new Set(foundations.map((foundation) => foundation.humanArc.desiredFuture));
  if (desireSet.size !== foundations.length) {
    issues.push("複数の回が同じ望みを使っています。技法ではなく、その人物固有の人生目標から作り直してください。");
  }

  return { ok: issues.length === 0, issues };
}

export function assertSeriesHumanArcs(foundations: EpisodeFoundation[]): SeriesHumanArcReview {
  const report = reviewSeriesHumanArcs(foundations);
  if (!report.ok) throw new Error(`Series failed human-arc gate:\n${report.issues.map((issue) => `- ${issue}`).join("\n")}`);
  return report;
}
