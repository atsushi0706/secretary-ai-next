import { defineAdventureScenario, reviewAdventureScenario } from "./adventure";

export const EP7_ADVENTURE = defineAdventureScenario({
  id: "ep7-choice-bind",
  caseNo: "CASE 07",
  title: "選ばされた二択から、自分の選択を取り戻すには？",
  objective: "二択に共通する前提と、消された選択を見つける",
  startLabel: "旧校舎の扉を調べる",
  background: "/learn/adventure/erickson-study-v1.webp",
  teacherSprite: "/learn/adventure/erickson-cutout-v1.webp",
  linkSprite: "/learn/chars/link-neutral.webp",
  guestSprite: "/learn/chars/mio-betray-v1.webp",
  guestName: "雨宮ミオ",
  evidence: [
    { id: "door-choice", title: "扉の二択", summary: "『今一人で入る／一分後に一人で入る』と表示された", detail: "時間は選べるが、一人で入ることは両方に共通している。入らない、二人で入る選択は画面にない。", icon: "1", image: "/learn/ep7/manga-v1/02.webp", imageAlt: "旧校舎の扉に二つの選択肢が表示される漫画" },
    { id: "lock", title: "遠隔操作の錠", summary: "正面扉の錠は外から操作されている", detail: "表示された二択を選ばなくても、扉の管理方法を調べることはできる。", icon: "2", image: "/learn/ep7/manga-v1/03.webp", imageAlt: "旧校舎の遠隔操作された錠を調べる漫画" },
    { id: "side-route", title: "管理用通路", summary: "二人で通れる管理用の通路が見つかった", detail: "正面扉の二択以外にも進む方法がある。今入らず、学校へ戻る選択も残っている。", icon: "3", image: "/learn/ep7/manga-v1/04.webp", imageAlt: "旧校舎の横に管理用通路を見つける漫画" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep7-adv-01", scene: "選ばされる扉", camera: "link", line: { id: "ep7-adv-01", who: "link", face: "think", text: "『今入る』『一分後に入る』。時間を選べるなら、無理やりじゃないよね。どっちにしよう。" }, nextLabel: "二択を読み直す" },
    { kind: "recall", id: "ep7-memory", scene: "選ばされる扉", purpose: "memory", title: "『今入る』『一分後に入る』のどちらを選んでも、リンクに起きることは？", prompt: "リンク「違う部分じゃなく、同じ部分を教えて。」", placeholder: "二択に共通することを書く", helper: "誰が、何人で、何をするかを見てください。", storeAs: "ep7Memory", skipLabel: "共通点を見る", skipValue: "どちらも一人で扉へ入る", replyFallback: "時間は違っても、どちらも一人で入ることになるね。" },
    { kind: "dialogue", id: "ep7-adv-02", scene: "選ばされる扉", camera: "link", line: { id: "ep7-adv-02", who: "link", face: "think", text: "{{ep7MemoryReply}} 選べるのは時間だけ。入るかどうかも、誰と入るかも選べていなかった。", dynamic: true }, nextLabel: "扉の周りを調べる" },
    { kind: "guided-investigation", id: "ep7-guided", scene: "第三の道", title: "二択の外にある選択を探す", steps: [
      { id: "ep7-guide-1", linkPrompt: "表示された二択に共通する前提を、もう一度画面で確かめよう。", actionLabel: "1つ目の証拠を見る", evidenceId: "door-choice", linkComment: "どちらにも『一人で入る』が入っている。ここは選べていない。", reflectionPrompt: "扉の二択では、『入らない』を選べるように見える？", placeholder: "二択から消えた選択を書く", helper: "入らない、二人で入る、後で決めるを考えてください。", storeAs: "ep7Observe1", skipLabel: "まだ分からない", skipValue: "一人で入らない選択が見えない", replyFallback: "入らないことも、二人で入ることも画面にはないね。", linkResponse: "{{ep7Observe1Reply}} 表示を押す前に、扉そのものを調べよう。" },
      { id: "ep7-guide-2", linkPrompt: "正面扉は遠隔操作されている。表示以外の手がかりはあるかな。", actionLabel: "2つ目の証拠を見る", evidenceId: "lock", linkComment: "二択を選ばなくても、錠の仕組みを調べることはできる。", reflectionPrompt: "今すぐ二択を選ばずにできることは？", placeholder: "保留したままできる行動を書く", helper: "調べる、戻る、相談するでも大丈夫です。", storeAs: "ep7Observe2", skipLabel: "一度止まる", skipValue: "錠を調べて別の道を探す", replyFallback: "選ばずに、錠と周囲を調べられる。", linkResponse: "{{ep7Observe2Reply}} 右の壁に、管理用の印がある。" },
      { id: "ep7-guide-3", linkPrompt: "管理用通路は二人で通れる。正面の二択とは別の道だ。", actionLabel: "3つ目の証拠を見る", evidenceId: "side-route", linkComment: "二人で進む、今は戻る。どちらも僕らが選べる。", reflectionPrompt: "三つ目の選択として、何ができる？", placeholder: "二択以外の行動を書く", helper: "安全を保てる行動を選んでください。", storeAs: "ep7Observe3", skipLabel: "別の道を選ぶ", skipValue: "二人で管理用通路を進む", replyFallback: "二人で管理用通路へ進める。戻る選択も残る。", linkResponse: "{{ep7Observe3Reply}} {{userName}}、この二択は何を選ばせる仕掛けだったと思う？" },
    ], nextLabel: "仮説を話す" },
    { kind: "recall", id: "ep7-hypothesis", scene: "二択の前提", purpose: "hypothesis", title: "扉の二択は、何を選んだことにしようとした？", prompt: "リンク「時間を選ぶ前に、もう決まったことにされていたのは何？」", placeholder: "二択に共通する前提を書く", helper: "行く時間ではなく、行く行為を見てください。", storeAs: "ep7Hypothesis", skipLabel: "まだ分からない", skipValue: "一人で扉に入ること", replyFallback: "時間を選ばせながら、一人で入ることは決まったものにしていたんだね。" },
    { kind: "dialogue", id: "ep7-adv-03", scene: "二択の前提", camera: "teacher", line: { id: "ep7-adv-03", who: "teacher", text: "{{ep7HypothesisReply}} 二つを選ばせる言葉は、共通する行動を前提として受け入れやすくします。", dynamic: true }, nextLabel: "第一推理へ" },
    { kind: "deduction", id: "ep7-deduction-1", scene: "第一推理", title: "この二択で、リンクが選べていなかったものは？", prompt: "違う部分ではなく、二つに共通する部分を見てください。", questionBasis: { subject: "正面扉に表示された二択", before: "今入るか一分後に入るかを選ぼうとした時", asks: "選択肢から隠された決定", goal: "二択の外にある拒否と別案を見つけて安全な調査判断を取り戻す" }, options: [
      { id: "time", label: "今入るか、一分後に入るか", correct: false, feedback: "時間は画面で選べます。両方に共通している行動を見てください。" },
      { id: "alone-entry", label: "一人で正面扉へ入るかどうか", correct: true, feedback: "そこは選択肢にありません。二つとも一人で入る前提です。" },
      { id: "countdown", label: "一分をどう数えるか", correct: false, feedback: "数え方は事件の中心ではありません。誰が何をするかを比べてください。" },
    ] },
    { kind: "reveal", id: "ep7-reveal-1", scene: "第三の選択", kicker: "THE HIDDEN PREMISE", title: "二択を選ぶ前に、\n共通点を見る。", body: "どちらでも起きることが、隠れた前提。\n選ばない自由と、別の道を取り戻す。", nextLabel: "リンクへ選択を返す" },
    { kind: "dialogue", id: "ep7-adv-04", scene: "選択を返す", camera: "link", line: { id: "ep7-adv-04", who: "link", face: "think", text: "でも管理用通路も罠かもしれない。行くか戻るか、今度は僕が決められなくなった。" }, nextLabel: "三つの選択を作る" },
    { kind: "apply", id: "ep7-apply", scene: "選択を返す", title: "決められないリンクへ、どんな選択を渡す？", prompt: "安全、保留、拒否を含め、本人が本当に選べる形にします。", questionBasis: { subject: "旧校舎へ進むか迷うリンク", before: "正面扉の二択が仕掛けだと分かった後", asks: "安全と拒否権を残す選択の渡し方", goal: "選択型の暗示を強制ではなく本人の判断を助ける形で使う" }, storeAs: "ep7Move", options: [
      { id: "force-side", label: "『正面は罠だから、管理用通路へ行こう』", correct: false, value: "別の一択へリンクを従わせた", feedback: "正面の二択を、別の一択へ変えただけです。戻る、保留する選択も残してください。" },
      { id: "real-choice", label: "『二人で通路を調べる、学校へ戻る、ここで待つ。今はどれにする？』", correct: true, value: "安全な別案と保留と撤退を並べ、リンクに選択を返した", feedback: "どれを選んでも本人の安全と意思が残ります。選ばない自由も含まれています。" },
      { id: "shame", label: "『怖くないなら入れるよね』", correct: false, value: "勇気を試す言葉で入るよう追い込んだ", feedback: "入らない選択を恥に結びつけています。本人が断れる選択を言葉にしてください。" },
    ], freeAnswer: { label: "自分の三つの選択を作る", placeholder: "進む／保留／戻るを含む選択を書く", helper: "どれを選んでも罰や恥がない言い方にしてください。", storeAs: "ep7CustomMove", correctCriteria: "安全に進む案、保留または拒否、別案を含み、本人が罰なく選べる", incorrectCriteria: "どの選択でも同じ行動を強制する、断ることを恥にする、危険な道だけを選ばせる" } },
    { kind: "dialogue", id: "ep7-adv-05", scene: "選択を返す", camera: "link", line: { id: "ep7-adv-05", who: "link", face: "aha", text: "今は二人で、通路の入口だけ確かめたい。危なければ戻る。自分で決めたら、足が動く。" }, nextLabel: "変化を考える" },
    { kind: "recall", id: "ep7-reflection", scene: "選択を返す", purpose: "reflection", title: "リンクは、なぜ決められるようになった？", prompt: "リンク「選択肢は増えたのに、さっきより迷いが減った。何が違う？」", placeholder: "選べる範囲の変化を書く", helper: "正解の数ではなく、断れるかを見てください。", storeAs: "ep7Reflection", skipLabel: "まだ分からない", skipValue: "保留と撤退を含め、本当に選べるようになったから", replyFallback: "進まない自由まで戻ったから、進む時も自分で選べたんですね。" },
    { kind: "dialogue", id: "ep7-adv-06", scene: "選択を返す", camera: "teacher", line: { id: "ep7-adv-06", who: "teacher", text: "{{ep7ReflectionReply}} 治療的な二択は、選択を奪うためではなく、本人が動ける道を増やすために使います。", dynamic: true }, nextLabel: "最後の確認へ" },
    { kind: "deduction", id: "ep7-deduction-2", scene: "倫理の確認", title: "治療的な二択と、追い込む二択の違いは？", prompt: "本人の目的、拒否権、安全が残るかを見てください。", questionBasis: { subject: "催眠で使う選択型の暗示", before: "相手へ二つ以上の行動を提案する時", asks: "本人の自由を守る条件", goal: "Therapeutic Bind と強制的な False Choice を区別する" }, options: [
      { id: "clever", label: "相手が気づけないほど巧妙に作る", correct: false, feedback: "巧妙さは倫理の条件ではありません。本人が断れるか、安全かを確認してください。" },
      { id: "autonomy", label: "どれも安全で、選ばない自由まで本人に残す", correct: true, feedback: "その条件なら、選択は本人の目的を助ける提案になります。" },
      { id: "same-goal", label: "どれを選んでも術者だけが望む結果になる", correct: false, feedback: "術者の目的だけへ追い込む二択です。本人の目的と拒否権がありません。" },
    ] },
    { kind: "reveal", id: "ep7-reveal-2", scene: "旧校舎へ", kicker: "THERAPEUTIC BIND", title: "選択を狭めず、\n動ける道を増やす。", body: "共通する前提を見る。\n拒否・保留・別案を残す。\n本人が選んだ一歩だけを進める。", nextLabel: "管理用通路へ" },
    { kind: "dialogue", id: "ep7-adv-07", scene: "旧校舎へ", camera: "link", line: { id: "ep7-adv-07", who: "link", face: "smile", text: "通路の先に資料室がある。ミオは、僕らが二択を破れるか試していたのかな。" }, nextLabel: "講義へ戻る" },
  ],
});

export const EP7_ADVENTURE_QUALITY = reviewAdventureScenario(EP7_ADVENTURE);
