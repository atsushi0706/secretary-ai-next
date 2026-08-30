import { defineEpisodeFoundation } from "./episode-foundation";

export const EP8_FOUNDATION = defineEpisodeFoundation({
  humanArc: {
    theme: "communication",
    person: "清瀬リンク",
    desiredFuture: "一度間違えても自分を無能と決めず、相手の話を聞き直して関係と仕事を続けたい",
    stuckReality: "ミオを裏切り者と決めた自分を責め、『調査役に向いていない』と次の証拠を読む手が止まる",
    firstVisibleShift: "物語を自分へ重ね、間違いより見直した行動に気づき、調査を続けると決める",
    payoff: {
      mode: "other-person-response",
      timing: "物語の意味を自分で見つけた後",
      beat: "リンクが『まだ続けられる』と話した直後、ミオが自分の言葉を聞きに来るよう応答する",
      anchorIds: ["ep8-adv-05", "ep8-adv-07"],
    },
    practitionerAppeal: "正論で納得させず、本人が自分の経験から次の可能性を見つける会話を見せる",
  },
  culturalHypnosis: {
    situation: "悩みを話した直後に『考え方を変えればいい』『気にしすぎ』と説明され、黙って聞く",
    source: "正しい助言は素直に受け入れるべきで、分からないと言うのは理解力がないという学校や人間関係の空気",
    voiceAnchor: "でも、そんな単純じゃないと言ったら、面倒な人だと思われそう",
    authenticWish: "責められずに自分の速さで意味をつかみ、納得した言葉で次を選びたい",
    releaseMove: "正解を押し込まず、似た物語を通して本人が重なる意味を選ぶ",
    evidenceSources: ["https://note.com/t_nachi/n/n1a3045ea154e"],
  },
  learner: {
    problem: "正しい説明を長くされるほど、自分が責められているように感じて内容が入らなくなる",
    livedExamples: ["注意されると反論だけが浮かぶ", "説明が長いと心を閉じる", "自分の話だと認めるのが怖い"],
    attentionTrap: "説明の正しさではなく、責められているかどうかだけを見張る",
    desiredChange: "物語を通して自分の意味を見つけ、押し付けられずに別の見方を試せる",
  },
  lesson: {
    awayFrom: "正解を直接説明し、相手に認めさせようとする",
    turnToward: "相手の状況と似た構造を持つ短い物語を体験してもらう",
    nextAction: "物語のどこが自分に重なったかを本人に選んでもらう",
    dailyUse: "助言が届かない時や、自分を責めずに別の見方を試したい時に使う",
  },
  teacher: {
    experience: "同じ逸話でも相手に応じて焦点を変え、本人が自分の意味を見つけられるように語った",
    belief: "物語は答えを隠すためではなく、説明を体験へ変えるために使う",
    decisionRule: "相手の体験に合う比喩を短く示し、意味を一つに決めつけず本人の解釈を聞く",
  },
  link: {
    learnerState: "ミオの残した寓話を暗号の正解探しとして読み、何度も読み違える",
    role: "物語には一つの答えがあると思う初学者として、プレイヤーと意味を発見する",
  },
  player: {
    startsAs: "旧校舎へ第三の道から入った調査役",
    changesBy: "ミオの短い物語を証拠と照らし、自分たちに重なる意味を選ぶ",
    endsAs: "説明を押し付けず、物語から本人の気づきを引き出せる調査役",
    wound: "正しい説明を受け入れられない自分を悪いと思い、分からないと言えずに我慢してきた",
    reasonForEnrolling: "正解を押し込むのではなく、人が自分で気づける伝え方を学ぶため",
    worldToCreate: "理解の速さや表現の違いで人を置いていかず、それぞれの意味から学べる世界",
  },
  presentation: { primaryQuestion: "説明しても届かない時、催眠をどう伝える？", secondaryQuestion: { mode: "none" }, recallScaffolding: "independent" },
  interaction: { personalResponse: "choice-or-detail", reflectionMoments: ["memory", "hypothesis", "reflection", "application"] },
  causalChain: [
    "旧校舎の資料室で、ミオが残した鍵を運ぶ鳥の物語を見つける",
    "リンクは暗号の正解を一つに決めようとして迷う",
    "物語の三場面と現実の事件を一つずつ比べる",
    "プレイヤーが自分に重なる意味を仮説として話す",
    "物語を使って、自分を責めるリンクへ別の見方を提案する",
    "講義で therapeutic metaphor と説明の違いを学ぶ",
    "物語の最後から、ミオがカードを守るために運んだ可能性が生まれる",
  ],
  evidenceBoundary: {
    historical: "エリクソンは逸話とメタファーを相手に合わせて使い、本人が自分の意味を発見する語りを行った",
    teachingInterpretation: "ミオの寓話を一つの正解ではなく、事件と自分を考える体験として用いる",
    claimLimit: "物語が無意識を必ず変えるとは断定せず、本人の解釈を術者が決めつけない",
  },
});
