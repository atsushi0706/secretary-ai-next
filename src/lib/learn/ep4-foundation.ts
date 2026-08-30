import { defineEpisodeFoundation } from "./episode-foundation";

export const EP4_FOUNDATION = defineEpisodeFoundation({
  humanArc: {
    theme: "confidence",
    person: "清瀬リンクと雨宮ミオ",
    desiredFuture: "人前で緊張しても、自分の言葉で最初の一言を伝えたい",
    stuckReality: "実習の前へ出ると手が冷たくなり、『落ち着いて』と励まされるほど声が出ない",
    firstVisibleShift: "緊張や震えを消さず、足と呼吸を確かめた続きに自分の名前を一言伝える",
    payoff: {
      mode: "other-person-response",
      timing: "二回目の公開実習",
      beat: "ミオが名前まで言えたと報告し、リンクも自分の体験と重ねて言葉の順番を理解する",
      anchorIds: ["ep4-adv-06", "ep4-adv-07"],
    },
    practitionerAppeal: "相手の緊張を消したふりにせず、その場で本人が言えた一言を一緒に作る仕事として見せる",
  },
  culturalHypnosis: {
    situation: "発表や初対面の自己紹介で全員の視線が集まり、最初の一言が出なくなる",
    source: "学校や職場で、間違えず、堂々と、最後まで話せる人が評価される場面を重ねて見たこと",
    voiceAnchor: "また声が震えたら、仕事ができない人だと思われる",
    authenticWish: "緊張があっても、自分が伝えたい最初の一言を話したい",
    releaseMove: "成功した姿を求める前に、足と呼吸など今確かめられる事実へ注意を戻す",
    evidenceSources: ["https://note.com/as_azuki/n/n160fc624d9f0"],
  },
  learner: {
    problem: "緊張している相手へ『落ち着いて』『大丈夫』と言っても届かず、次に何を言えばよいか分からない",
    livedExamples: ["人前で声が出なくなった相手を励ます", "怖がる相手へ大丈夫と言い続ける", "相手が今分かるものを確かめず助言する"],
    attentionTrap: "相手がまだ確かめられない安心や成功を先に言い、言葉と体験を離してしまう",
    desiredChange: "相手が今確かめられる事実を二つ言い、その延長に小さな暗示を一つ置ける",
  },
  lesson: {
    awayFrom: "いきなり落ち着ける、うまくできると求める",
    turnToward: "床、呼吸、声など相手が今うなずける事実を言葉にする",
    nextAction: "二つの事実の後に、次の一動作だけを提案する",
    dailyUse: "催眠の導入や、人前で緊張している相手の最初の一歩を支える時に使う",
  },
  teacher: {
    experience: "相手の現在の体験に言葉を合わせてから、小さな変化へ導くペーシングとリーディングを用いた",
    belief: "確かめられる言葉が続くと、次の提案も自分の体験として検討しやすくなる",
    decisionRule: "観察できない心情を断定せず、二つの現実の後に一つだけ提案する",
  },
  link: {
    learnerState: "実習で声が出ず、落ち着けと言われるほど何も分からなくなる",
    role: "身体で違いを体験し、なぜミオの言葉なら次へ進めたかをプレイヤーへ問い返す",
  },
  player: {
    startsAs: "催眠の原理を知っているが、相手へ順番に言葉をかけた経験が少ない実習生",
    changesBy: "リンクが確かめられる二つの事実と、次の一言を選んで実習を前へ進める",
    endsAs: "観察した事実から相手へ短い催眠誘導を組み立てられる案内役",
  },
  presentation: { primaryQuestion: "緊張している相手へ、催眠の言葉をどの順番でかける？", secondaryQuestion: { mode: "none" }, recallScaffolding: "independent" },
  interaction: { personalResponse: "choice-or-detail", reflectionMoments: ["memory", "hypothesis", "reflection", "application"] },
  causalChain: [
    "実習でリンクが人前に立つが声が出なくなる",
    "周囲の抽象的な励ましはリンクに届かない",
    "ミオが足と呼吸という二つの確認できる事実を言う",
    "プレイヤーが次の一言だけを提案する",
    "リンクが自分の言葉で実習を始め、三人で最後までつなぐ",
    "講義でペーシングとリーディングの順番に名前を付ける",
  ],
  evidenceBoundary: {
    historical: "エリクソン派の教育では、現在の体験に合わせるペーシングと変化を促すリーディングが扱われる",
    teachingInterpretation: "二つの確認できる事実と一つの小さな提案へ単純化して実習する",
    claimLimit: "言葉の順番だけで誰にでも催眠をかけられるとはせず、同意と中止の選択を常に残す",
  },
});
