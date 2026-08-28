/**
 * 台詞の禁止語集ではなく、人物と学習体験の因果を先に定める。
 * 各話のコピー、漫画、選択、講義はこの状態遷移から作る。
 */
export type EpisodeFoundation = {
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
