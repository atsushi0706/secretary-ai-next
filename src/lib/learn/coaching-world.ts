/**
 * SINGA WORLD の舞台背景。
 *
 * これは台詞を縛る禁止語・定型文ではない。
 * 「なぜこの人物は催眠を学ぶ／受けるのか」を、人物の望みと人生から作るための世界設定。
 * 各話では同じ型を画面へ出さず、会話・行動・失敗・後の回収へ分散して見せる。
 *
 * 相談テーマの根拠:
 * - ICF Global Coaching Client Study: self-esteem/confidence, work/life balance,
 *   career opportunities, relationships, performance, communication などが主要な相談理由。
 * - ICF 2022 Global Consumer Awareness Study: communication, confidence,
 *   productivity, work-life balance の改善が多く報告されている。
 *
 * ここに置く人物は実在相談者の再現ではなく、上記の傾向から作るフィクションの複合人物。
 */

export type CoachingTheme =
  | "confidence"
  | "work-life-balance"
  | "career"
  | "relationships"
  | "communication"
  | "performance"
  | "productivity"
  | "wellbeing"
  | "autonomy"
  | "ethics";

/** 同じ「後日報告」を反復せず、変化を物語のどこで見せるか。 */
export type ChangeRevealMode =
  | "in-session-action"
  | "other-person-response"
  | "next-scene-consequence"
  | "later-callback"
  | "setback-and-retry"
  | "multi-episode-resolution";

export type HumanChangeArc = {
  /** 調査で確認した、現実のコーチング相談領域。 */
  theme: CoachingTheme;
  /** この回で望みを持つ人物。主人公・リンク・相談者・ミオのいずれでもよい。 */
  person: string;
  /** 技法名ではなく、その人が人生で実現したい具体的な方向。 */
  desiredFuture: string;
  /** 「こうしたいのに、こうできない」が一場面で見える現実。 */
  stuckReality: string;
  /** この回だけで起こせる、小さく観察可能な変化。完全解決を約束しない。 */
  firstVisibleShift: string;
  /** 変化を毎話同じ報告カードにせず、物語の中でどう回収するか。 */
  payoff: {
    mode: ChangeRevealMode;
    timing: string;
    beat: string;
    /** 実装中の台詞・操作・場面ID。設定だけで終わっていないことを検査する。 */
    anchorIds: [string, ...string[]];
  };
  /** 読者が「自分もこの人の変化を支えたい」と思える、コーチ側の魅力。 */
  practitionerAppeal: string;
};

export const SINGA_COACHING_WORLD = {
  premise:
    "人は、社会や過去から受け取った『こうすべき』を自分の声だと思い、望む方向へ動けなくなることがある。SINGA WORLD催眠学校は、その催眠を見抜き、本人の選択を取り戻す催眠を学ぶ場所。",
  protagonist:
    "主人公も『迷惑をかけるな』『我慢しろ』『正解から外れるな』という文化的催眠で、本当に望むことを選べなかった。だから催眠を、他人を操る力ではなく、本人が望む人生へ戻るための技術として学ぶ。",
  audiencePromise:
    "読者は原理を暗記するだけでなく、目の前の人が『こうなりたいのに、できない』と話した時、その人の今できる反応から望む方向への一歩を一緒に作れるようになる。",
  storyEngine: {
    desire: "まず人物の望む未来がある",
    conflict: "次に、望んでいるのに止まる具体的な一場面が起きる",
    hypnosis: "催眠は、その場面で固まった注意・前提・反応の使い方を変える",
    change: "変化は、台詞の理解ではなく、本人が選んだ行動として見える",
    continuity: "完全解決ではなくても、その選択が後の会話・失敗・再挑戦・関係へ残る",
  },
  researchBackedNeeds: [
    "自信を持って発言・挑戦したい",
    "仕事と生活の両方を守りたい",
    "望むキャリアへ一歩進みたい",
    "人間関係やコミュニケーションを変えたい",
    "先延ばしを越えて、始めたことを進めたい",
    "支援する側として、相手の選択を守りながら変化を助けたい",
  ],
} as const;

