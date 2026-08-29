import { defineEpisodeFoundation } from "./episode-foundation";

export const EP7_FOUNDATION = defineEpisodeFoundation({
  learner: {
    problem: "二つの選択肢を出されると、その外にも選べる道があることを忘れる",
    livedExamples: ["今やるか後でやるかだけを迫られる", "買う二択だけを見せられる", "断る選択を言い出せない"],
    attentionTrap: "選択肢を選ぶことに集中し、二択に共通する前提を見落とす",
    desiredChange: "二択の共通前提を見抜き、保留や拒否を含む自分の選択を取り戻せる",
  },
  lesson: {
    awayFrom: "出された二択のどちらかを必ず選ばなければと思う",
    turnToward: "二つの選択に共通して起きることを確かめる",
    nextAction: "断る、保留する、別案を出す選択が残っているか確認する",
    dailyUse: "営業、交渉、対人場面で選ばされている感覚がある時に使う",
  },
  teacher: {
    experience: "治療的な bind を、どちらを選んでも本人の目的へ近づける形で用いた",
    belief: "選択肢は本人の自由を奪うためではなく、動ける道を増やすためにある",
    decisionRule: "目的を共有し、どちらも安全で、選ばない自由まで残る時だけ選択型の暗示を使う",
  },
  link: {
    learnerState: "旧校舎の扉から二択を出され、どちらを選んでも一人で入る前提に気づかない",
    role: "選んでいるつもりで選ばされる怖さを担い、プレイヤーに第三の道を求める",
  },
  player: {
    startsAs: "言葉に隠れた前提を見抜いた調査役",
    changesBy: "扉の二択に共通する前提と、消された選択を見つける",
    endsAs: "二択の外に本人の選択を戻し、安全な道を作れる調査役",
    wound: "周囲に用意された正解の中から選ぶことが自分で決めることだと思い、断る道を持てなかった",
    reasonForEnrolling: "誰かが作った選択肢の外にも、自分で選べる道があると取り戻すため",
    worldToCreate: "断る、待つ、別の道を作ることまで、恥じずに選べる世界",
  },
  presentation: { primaryQuestion: "選ばされた二択から、自分の選択を取り戻すには？", secondaryQuestion: { mode: "none" }, recallScaffolding: "independent" },
  interaction: { personalResponse: "choice-or-detail", reflectionMoments: ["memory", "hypothesis", "reflection", "application"] },
  causalChain: [
    "旧校舎の扉が、一人で今入るか一分後に入るかを迫る",
    "リンクは時間だけの二択だと思い、入ること自体が前提だと気づかない",
    "扉の表示、施錠、非常口を調べて消された選択を探す",
    "プレイヤーが二択の共通前提を言葉にする",
    "リンクへ、保留と別案を含む選択を返す",
    "講義で therapeutic bind と強制的な false choice を区別する",
    "二人で入る第三の経路を選び、旧校舎へ進む",
  ],
  evidenceBoundary: {
    historical: "エリクソンの資料には permissive language と therapeutic double binds の使用が記録されている",
    teachingInterpretation: "二択の共通前提と拒否権を見抜く校舎の扉として体験化する",
    claimLimit: "治療的 bind を人を追い込む二択と同一視せず、同意・安全・拒否権を欠く使用を肯定しない",
  },
});
