import { defineEpisodeFoundation } from "./episode-foundation";

export const EP3_FOUNDATION = defineEpisodeFoundation({
  learner: {
    problem: "目を閉じても考えが次々に浮かび、考えを止められない自分は催眠に向いていないと思ってしまう",
    livedExamples: ["眠ろうとすると明日のことを考える", "失敗を思い出して頭の中で反省を続ける", "静かにしようとするほど別の言葉が浮かぶ"],
    attentionTrap: "考えを消すことだけを成功条件にして、浮かぶたびに失敗したと判断する",
    desiredChange: "浮かんだ考えを、一呼吸や小さな間を確かめる合図へ変えられる",
  },
  lesson: {
    awayFrom: "考えを止めろと自分へ命令し続ける",
    turnToward: "今すでに浮かんだ一つの言葉を、そのまま確かめる",
    nextAction: "言葉が浮かぶたび、息を一つ吐いて次の間を待つ",
    dailyUse: "眠る前や集中したい時、考えを消そうとして余計に頭が騒がしくなる場面で使う",
  },
  teacher: {
    experience: "止まらない内的対話を失敗とせず、次の呼吸や静かな間を知らせる合図として利用した",
    belief: "催眠は無心になる試験ではない。本人に起きている体験から注意の向きを作れる",
    decisionRule: "考えの内容を正そうとせず、考えが浮かんだ事実を次の観察へ一対一でつなぐ",
  },
  link: {
    learnerState: "催眠に入るには頭を空にしなければならないと思っている",
    role: "ミオと一緒に混乱し、考えが残ったまま何が変わったのかを初学者の言葉で確かめる",
  },
  player: {
    startsAs: "先生の答えを選ぶだけの見習い",
    changesBy: "ミオの考えを消さず、次の呼吸へつなぐ一言を自分で作る",
    endsAs: "目の前の反応を観察し、短い催眠の一手を組み立てられる実習生",
  },
  presentation: { primaryQuestion: "目を閉じても頭の中のおしゃべりが止まらない時、催眠をどう使う？", secondaryQuestion: { mode: "none" }, recallScaffolding: "partial-cue" },
  interaction: { personalResponse: "choice-or-detail", reflectionMoments: ["memory", "hypothesis", "reflection", "application"] },
  causalChain: [
    "授業後も考えを止めようとして疲れているミオと出会う",
    "エリクソンが考えを止めず、次の言葉が来る瞬間を待つよう伝える",
    "浮かんだ言葉を合図に息を一つ確かめる",
    "考えは残っているが、追いかけずに小さな間を作れる",
    "プレイヤーがミオへ次の一言を作り、その反応を見る",
    "講義で内的対話のユーティライゼーションとして整理する",
  ],
  evidenceBoundary: {
    historical: "エリクソン派では、本人の現在の行動や体験を暗示へ利用する考え方が記述されている",
    teachingInterpretation: "内的対話が浮かぶたび一呼吸を確かめる、短い注意訓練として教材化する",
    claimLimit: "不眠や不安の治療効果を保証せず、つらさが続く場合は専門家への相談を妨げない",
  },
});
