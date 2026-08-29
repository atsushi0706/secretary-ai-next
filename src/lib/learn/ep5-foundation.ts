import { defineEpisodeFoundation } from "./episode-foundation";

export const EP5_FOUNDATION = defineEpisodeFoundation({
  learner: {
    problem: "信じていた相手に予想外の行動をされると、最初に浮かんだ意味を事実だと決めて動けなくなる",
    livedExamples: ["仲間が突然いなくなる", "大切に集めたものが失われる", "短いメッセージから相手の全てを決めつける"],
    attentionTrap: "混乱を早く終わらせるため、証拠のない物語へ注意を固定する",
    desiredChange: "今分かる事実、まだ決められない意味、今できる一手を分けて注意を戻せる",
  },
  lesson: {
    awayFrom: "混乱した瞬間に裏切りの意味を一つへ決める",
    turnToward: "目の前の事実を三つ数え、解釈と区別する",
    nextAction: "まだ分からないことを残したまま、確認できる一手を選ぶ",
    dailyUse: "予想外の出来事や言葉で頭が真っ白になり、思い込みへ引き込まれた時に使う",
  },
  teacher: {
    experience: "混乱が起きた時、結論を急がせず現在の感覚と確認可能な事実へ注意を戻した",
    belief: "混乱は人を操る道具ではなく、固まった見方を一度ゆるめて選択を取り戻す契機にできる",
    decisionRule: "事実と解釈を分け、安全と同意を確認し、本人が選べる次の一手へ再定位する",
  },
  link: {
    learnerState: "ミオを信じていた分、全てが嘘だったと決めて感情に飲まれる",
    role: "プレイヤーと同じショックを受け、事実へ戻ることで次の物語を進める相棒になる",
  },
  player: {
    startsAs: "教えられた原理を集める生徒",
    changesBy: "失ったカードとミオの行動を調べ、事実と解釈を分けて次の捜査を選ぶ",
    endsAs: "答えを受け取るだけでなく、催眠の倫理と事件を自分で追う調査役",
  },
  presentation: { primaryQuestion: "信じていた相手に予想を裏切られた時、催眠をどう解く？", secondaryQuestion: { mode: "none" }, recallScaffolding: "independent" },
  interaction: { personalResponse: "choice-or-detail", reflectionMoments: ["memory", "hypothesis", "reflection", "application"] },
  causalChain: [
    "原理カードの保管庫が空になり、ミオが消える",
    "鍵の印と短いメモが見つかり、リンクは裏切りだと決めそうになる",
    "過去の場面を調べ直し、分かる事実と解釈を分ける",
    "ミオの映像からカードを持ち出した事実だけが確定する",
    "プレイヤーが現在の事実を三つ数え、次の確認行動を選ぶ",
    "講義で混乱からの再定位と、混乱技法の倫理的な限界を学ぶ",
    "プレイヤーが生徒から事件を追う調査役へ変わる",
  ],
  evidenceBoundary: {
    historical: "エリクソンは混乱技法を発表したが、万能な操作術としての主張ではない",
    teachingInterpretation: "事件による混乱から、事実と解釈を分けて現在へ注意を戻す学習体験として構成する",
    claimLimit: "混乱させて同意を奪う使用を肯定せず、医療・心理支援の代替や治療効果の保証をしない",
  },
});
