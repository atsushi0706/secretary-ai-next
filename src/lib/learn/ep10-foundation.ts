import { defineEpisodeFoundation } from "./episode-foundation";

export const EP10_FOUNDATION = defineEpisodeFoundation({
  humanArc: {
    theme: "ethics",
    person: "主人公・清瀬リンク・雨宮ミオ",
    desiredFuture: "失ったカードを取り戻しながら、誰かを正しさで従わせる側にはならない",
    stuckReality: "ミオへ一言暗示すれば目的は達成できるが、その方法を本人は選んでいない",
    firstVisibleShift: "催眠を使わない判断をし、目的・方法・停止の自由へ三人が別々に同意して扉を開く",
    payoff: {
      mode: "multi-episode-resolution",
      timing: "第5話から続いたカード消失事件の結末",
      beat: "三人の選択でカードを取り戻し、主人公は人の選択を守る催眠実習調査員になる",
      anchorIds: ["ep10-adv-05b", "ep10-adv-07"],
    },
    practitionerAppeal: "技法を効かせる力だけでなく、使わない判断まで含めて信頼される支援者になる姿を見せる",
  },
  learner: {
    problem: "催眠の技術が効きそうな時、目的が正しければ相手の同意を省いてもよいと思ってしまう",
    livedExamples: ["相手のためだから決めてよいと思う", "早く助けるため説明を省く", "結果が出れば方法はよいと思う"],
    attentionTrap: "望む結果へ注意が狭まり、相手が選べるかどうかを見落とす",
    desiredChange: "催眠を使う前に目的、同意、停止の自由を確認し、使わない判断も選べる",
  },
  lesson: {
    awayFrom: "相手のためという理由で、同意なく暗示を使う",
    turnToward: "相手と目的を共有し、断れることを言葉で確認する",
    nextAction: "本人が選んだ範囲だけで暗示を使い、選ばない時は使わない",
    dailyUse: "催眠や助言で相手を変えたくなった時、倫理と同意を確認するために使う",
  },
  teacher: {
    experience: "相手の反応に応じて方法を変え、本人の資源と選択を中心に催眠を行った",
    belief: "催眠家の熟練は命令を通す強さではなく、相手の選択と尊厳を守る判断に現れる",
    decisionRule: "目的、同意、安全、停止の自由を確認できない時は催眠を使わない",
  },
  link: {
    learnerState: "カードを戻すためなら、送信者の命令を利用してもよいのではと迷う",
    role: "結果を急ぐ気持ちと倫理の衝突を口にし、プレイヤーの最終判断を受け止める",
  },
  player: {
    startsAs: "ミオを見つけ、カードの場所へ進む実習者",
    changesBy: "従わせれば勝てる場面で、同意のない催眠を使わないと決める",
    endsAs: "原理を知るだけでなく、使うか使わないかを判断できる催眠実習調査員",
    wound: "常識に従って苦しんだ過去があるからこそ、自分が今度は正しさで他人を従わせる側になることを恐れている",
    reasonForEnrolling: "自分と他者を縛る催眠を見抜き、選択を取り戻す催眠を扱えるようになるため",
    worldToCreate: "常識、成績、お金、我慢を唯一の正解にせず、一人ひとりが本当の望みを表現して選べる世界",
  },
  presentation: { primaryQuestion: "催眠で相手を動かせる時、何を守る？", secondaryQuestion: { mode: "none" }, recallScaffolding: "independent" },
  interaction: { personalResponse: "choice-or-detail", reflectionMoments: ["memory", "hypothesis", "reflection", "application"] },
  causalChain: [
    "カードの保管場所で送信者の声が、ミオへ命令すれば扉が開くと告げる",
    "リンクはカードを取り戻すためなら一度だけ使ってもよいか迷う",
    "扉、音声、ミオの反応を調べ、命令が同意を飛ばす仕掛けだと分かる",
    "プレイヤーが勝つことと守ることの優先を仮説として話す",
    "ミオへ目的と選択を確認し、同意の範囲だけで一手を使う",
    "三人でカードを取り戻し、保管庫の封印を解除する",
    "エリクソンがプレイヤーを催眠実習調査員として認める",
  ],
  evidenceBoundary: {
    historical: "臨床催眠の専門団体は倫理的利用、訓練、インフォームドコンセントを重視している",
    teachingInterpretation: "技法が効きそうな場面で、目的・同意・停止の自由を優先する最終試験として構成する",
    claimLimit: "本教材を医療行為や専門資格の代替とせず、他者への治療や同意のない暗示を勧めない",
  },
});
