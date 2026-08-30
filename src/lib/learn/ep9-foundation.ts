import { defineEpisodeFoundation } from "./episode-foundation";

export const EP9_FOUNDATION = defineEpisodeFoundation({
  humanArc: {
    theme: "relationships",
    person: "雨宮ミオ",
    desiredFuture: "二人のところへ戻り、カードを持ち出した理由を自分の言葉で話したい",
    stuckReality: "戻りたい気持ちはあるのに、戻れば二人の学びを壊すと思い、出口まで三歩の場所で動けない",
    firstVisibleShift: "戻らない自由を確認したうえで、自分が選べる一歩だけを踏み出し、カードの場所を話す",
    payoff: {
      mode: "in-session-action",
      timing: "資料室の出口での実習中",
      beat: "ミオが一歩を自分で選び、隠していた保管室の場所を二人へ伝える",
      anchorIds: ["ep9-adv-05", "ep9-adv-07"],
    },
    practitionerAppeal: "支援者が望む正解へ急がせず、怖さがある本人自身から行動が生まれる瞬間を見せる",
  },
  culturalHypnosis: {
    situation: "落ち込んだ友人や迷っている相手を前に、沈黙へ耐えられず『早く元気になって』と重ねて言う",
    source: "良い友人や支援者なら、相手を早く立ち直らせて正しい行動へ導くべきだという空気",
    voiceAnchor: "相談されたんだから、早く元気にしてあげなきゃ",
    authenticWish: "相手を置き去りにせず、本人が自分の時間で次の一歩を選べるよう支えたい",
    releaseMove: "助ける側の期限を外し、しない自由と小さな可能性を相手へ返す",
    evidenceSources: ["https://note.com/yotuba03/n/n2ea8fee0ff89"],
  },
  learner: {
    problem: "相手を助けたい時ほど、正しい行動を強く求め、相手がさらに動けなくなる",
    livedExamples: ["戻ってきてと強く迫る", "落ち着いてと繰り返す", "早く決めてと相手を急がせる"],
    attentionTrap: "相手の選択より、自分が望む結果を早く出すことへ注意を固定する",
    desiredChange: "相手がしない自由を残したまま、選べる小さな変化を許可形で提案できる",
  },
  lesson: {
    awayFrom: "正しい結果へ相手を直接動かそうとする",
    turnToward: "今しない自由、選べる変化、本人の時間を言葉にする",
    nextAction: "できるかもしれない一歩を、許可形で一つだけ提案する",
    dailyUse: "ためらう相手や自分へ、強制せず次の一歩を提案したい時に使う",
  },
  teacher: {
    experience: "直接命令が合わない相手へ、間接的で permissive な暗示を用いた",
    belief: "暗示は結果を奪う命令ではなく、本人が自分の反応を選べる提案である",
    decisionRule: "拒否と停止の自由を残し、可能性の言葉で一つだけ提案し、反応に合わせる",
  },
  link: {
    learnerState: "ミオを見つけて感情が先に立ち、今すぐ戻れと命令しそうになる",
    role: "助けたい焦りが強制へ変わる瞬間を見せ、プレイヤーに言葉を託す",
  },
  player: {
    startsAs: "ミオの行動に別の意味があると気づいた調査役",
    changesBy: "戻れないミオへ、拒否を残した許可形の暗示を使う",
    endsAs: "相手の選択を守りながら、変化の可能性を提案できる実習者",
    wound: "助けたい気持ちが強いほど正しい行動を押し付け、相手にも自分にも我慢を求めてしまった",
    reasonForEnrolling: "人を従わせず、その人自身が選べる変化を支えるため",
    worldToCreate: "助ける側の正しさより、本人の選択と時間が守られる世界",
  },
  presentation: { primaryQuestion: "戻りたいのに動けない相手へ、催眠をどう使う？", secondaryQuestion: { mode: "none" }, recallScaffolding: "independent" },
  interaction: { personalResponse: "choice-or-detail", reflectionMoments: ["memory", "hypothesis", "reflection", "application"] },
  causalChain: [
    "資料室の奥でミオを見つけるが、彼女は戻れないと繰り返す",
    "リンクは今すぐ戻れと言いかけ、ミオの体が固まる",
    "ミオの言葉、視線、出口との距離を順に確かめる",
    "プレイヤーがミオの望みと怖さを分けて仮説を話す",
    "拒否を残した permissive suggestion をミオへ使う",
    "ミオが自分で一歩を選び、カードの場所を話す",
    "講義で間接暗示と曖昧な操作を区別する",
  ],
  evidenceBoundary: {
    historical: "エリクソンの重要な貢献として permissive suggestion と indirect suggestion が位置づけられている",
    teachingInterpretation: "動けないミオへ拒否権を残し、可能性として一歩を提案する体験にする",
    claimLimit: "許可形なら必ず安全とはせず、同意、関係、目的、停止の自由を必要条件として扱う",
  },
});
