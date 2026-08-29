import { defineEpisodeFoundation } from "./episode-foundation";

export const EP6_FOUNDATION = defineEpisodeFoundation({
  humanArc: {
    theme: "communication",
    person: "主人公と清瀬リンク",
    desiredFuture: "他人の短い言葉や社会の常識に人生を決められず、自分が本当に望む条件で行動したい",
    stuckReality: "『旧校舎へ』という一文に『一人ですぐ行け』まで足し、危険を確かめず従いそうになる",
    firstVisibleShift: "書かれた言葉と自分が足した意味を分け、二人で安全を確かめて行く条件を選ぶ",
    payoff: {
      mode: "later-callback",
      timing: "主人公の入学理由を明かした後の最初の校外行動",
      beat: "文化的催眠に苦しんだ主人公の目的が、リンクと条件を選び直す行動として初めて外の世界へ表れる",
      anchorIds: ["ep6-adv-05", "ep6-adv-07"],
    },
    practitionerAppeal: "相手が言葉へ足した意味を責めず、どの前提を今も選ぶか一緒に確かめる支援を見せる",
  },
  learner: {
    problem: "短い言葉を見た時、相手が言っていない意味まで自分で足し、それを事実だと思ってしまう",
    livedExamples: ["返信が短くて嫌われたと思う", "注意されて自分は無能だと思う", "広告の言葉から成功が約束されたと思う"],
    attentionTrap: "実際の言葉ではなく、自分が補った意味へ注意を固定する",
    desiredChange: "相手が言った言葉と、自分が受け取った意味を分け、受け入れる前提を選び直せる",
  },
  lesson: {
    awayFrom: "言われていない意味を、言われた事実として扱う",
    turnToward: "実際の言葉と、自分の中で生まれた意味を二段に分ける",
    nextAction: "隠れた前提を一つ言葉にし、受け入れるかを自分で決める",
    dailyUse: "短いメッセージ、広告、強い言い回しで考えが一方向へ引かれた時に使う",
  },
  teacher: {
    experience: "言葉が直接命令しなくても、聞き手が推論した意味によって体験が変わることを催眠で用いた",
    belief: "暗示の力は言葉そのものだけでなく、聞き手がそこから作る意味にも生まれる",
    decisionRule: "何が実際に言われ、何を聞き手が補ったかを分け、同意なく前提を押し込まない",
  },
  link: {
    learnerState: "ミオの映像に隠れた意味を早く決め、指定された場所へ走ろうとする",
    role: "言葉から意味を作る瞬間を見せ、プレイヤーと一緒に隠れた前提を見抜く相棒になる",
  },
  player: {
    startsAs: "映像の送信元を追う新米の調査役",
    changesBy: "メッセージの文字と、自分たちが補った意味を分ける",
    endsAs: "言葉に隠れた前提を見抜き、信じる前に確かめられる調査役",
    wound: "迷惑をかけるな、我慢しろ、目立つな、良い成績こそ価値だという周囲の常識を自分の声だと思い込み、本当は何を望むのか分からなくなった",
    reasonForEnrolling: "社会や自分の中にある催眠を見抜き、自分の人生を自分で選び直せるようになるため",
    worldToCreate: "誰かが決めた普通へ無意識に従うのではなく、一人ひとりが受け入れる前提と生き方を自分で選べる世界",
  },
  presentation: { primaryQuestion: "言われていない意味を信じた時、催眠をどう解く？", secondaryQuestion: { mode: "none" }, recallScaffolding: "independent" },
  interaction: { personalResponse: "choice-or-detail", reflectionMoments: ["memory", "hypothesis", "reflection", "application"] },
  causalChain: [
    "入学前の主人公が、周囲の常識を自分の声だと思って苦しんだ過去を思い出す",
    "ミオの映像の送信元が学校の外だと判明する",
    "新しいメッセージが届き、リンクは一人で来いという意味だと受け取る",
    "文字、映像、位置情報を順に確認し、実際に言われたことを分ける",
    "プレイヤーが言われていない前提を仮説として言葉にする",
    "リンクへ、言葉と受け取った意味を分ける一言を使う",
    "講義で Verbal Implication と Presupposition の違いを学ぶ",
    "旧校舎へ向かうが、一人で行くという前提は受け入れない",
  ],
  evidenceBoundary: {
    historical: "エリクソンは verbal implication と presupposition を催眠言語で広く用いたと記録されている",
    teachingInterpretation: "事件の短いメッセージから、言葉と聞き手が補った意味を分ける体験として構成する",
    claimLimit: "暗示が必ず働く、無意識に誰でも操作できるとは断定せず、同意のない誘導を肯定しない",
  },
});
