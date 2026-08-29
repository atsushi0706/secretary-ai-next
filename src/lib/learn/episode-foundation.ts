import type { HumanChangeArc } from "./coaching-world";

/**
 * 台詞の禁止語集ではなく、人物と学習体験の因果を先に定める。
 * 各話のコピー、漫画、選択、講義はこの状態遷移から作る。
 */
export type EpisodeFoundation = {
  /** 技法ではなく、人物の望みから始まるこの回の人間ドラマ。 */
  humanArc: HumanChangeArc;
  learner: {
    problem: string;
    livedExamples: [string, string, string];
    attentionTrap: string;
    desiredChange: string;
  };
  lesson: {
    awayFrom: string;
    turnToward: string;
    nextAction: string;
    dailyUse: string;
  };
  teacher: {
    experience: string;
    belief: string;
    decisionRule: string;
  };
  link: {
    learnerState: string;
    role: string;
  };
  player: {
    startsAs: string;
    changesBy: string;
    endsAs: string;
    /** 主人公が催眠を学ばなければならない、過去から続く痛み。 */
    wound?: string;
    /** 催眠学校へ入った理由。技法の収集ではなく、人生上の目的を書く。 */
    reasonForEnrolling?: string;
    /** 催眠を学んだ先で、主人公が実現したい世界。 */
    worldToCreate?: string;
  };
  presentation: {
    /** 入口から事件、推理までを貫く、この回で唯一の中心質問。 */
    primaryQuestion: string;
    /**
     * 主見出しだけで意味が通る時は none。補助質問を足す場合は、
     * 主見出しだけでは欠ける前提を adds に言語化してから使う。
     */
    secondaryQuestion:
      | { mode: "none" }
      | { mode: "needed"; text: string; adds: string };
    /** 第1話は答え方を見せ、以後は段階的に支援を外す。 */
    recallScaffolding: "full-example" | "partial-cue" | "independent";
  };
  interaction: {
    /** 本人の場面を選択と自由記述のどちらで受け取るか。 */
    personalResponse: "choice-required" | "detail-required" | "choice-or-detail";
    /** 証拠を見る前後に、プレイヤー自身の言葉を会話へ返す。 */
    reflectionMoments: ("memory" | "hypothesis" | "reflection" | "application")[];
  };
  causalChain: [string, string, string, string, string, ...string[]];
  evidenceBoundary: {
    historical: string;
    teachingInterpretation: string;
    claimLimit: string;
  };
};

export function defineEpisodeFoundation<const T extends EpisodeFoundation>(foundation: T): T {
  return foundation;
}
