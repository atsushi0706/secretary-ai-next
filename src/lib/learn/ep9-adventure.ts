import { defineAdventureScenario, reviewAdventureScenario } from "./adventure";

export const EP9_ADVENTURE = defineAdventureScenario({
  id: "ep9-permissive-suggestion",
  caseNo: "CASE 09",
  title: "戻りたいのに動けない相手へ、催眠をどう使う？",
  objective: "拒否を残し、本人が選べる可能性として一歩を提案する",
  startLabel: "ミオの言葉と反応を確かめる",
  background: "/learn/adventure/erickson-study-v1.webp",
  teacherSprite: "/learn/adventure/erickson-cutout-v1.webp",
  linkSprite: "/learn/chars/link-neutral.webp",
  guestSprite: "/learn/chars/mio-worry-v1.webp",
  guestName: "雨宮ミオ",
  evidence: [
    { id: "mio-words", title: "ミオの二つの言葉", summary: "『戻りたい。でも戻れば二人の学びを壊す』と話した", detail: "戻りたい望みと、戻ることへの怖さが同時にある。どちらか一方だけが本心とは決められない。", icon: "1", image: "/learn/ep9/manga-v1/02.webp", imageAlt: "ミオが戻りたいが戻れないと話す漫画" },
    { id: "mio-body", title: "出口を見る視線", summary: "戻れないと言いながら、ミオは何度も出口を見た", detail: "体は出口へ注意を向けている。戻る意思の証明ではないが、選べる方向の手がかりになる。", icon: "2", image: "/learn/ep9/manga-v1/03.webp", imageAlt: "ミオが出口を何度も見る漫画" },
    { id: "distance", title: "出口まで三歩", summary: "ミオの場所から出口まで三歩で、扉は開いている", detail: "三歩で外へ出られる。出るかどうかはミオが選べる。最初の一歩だけを試すこともできる。", icon: "3", image: "/learn/ep9/manga-v1/04.webp", imageAlt: "ミオと開いた出口の間に三歩の距離がある漫画" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep9-adv-01", scene: "見つけたミオ", camera: "mio", line: { id: "ep9-adv-01", who: "mio", face: "think", text: "カードは守っています。でも私は戻れない。戻れば、あなたたちが学んだものまで壊します。" }, nextLabel: "聞こえた望みを話す" },
    { kind: "recall", id: "ep9-memory", scene: "見つけたミオ", purpose: "memory", title: "『戻りたい。でも戻れば壊す』と言うミオは、何を望み、何を怖がっていた？", prompt: "リンク「戻れないだけじゃない。もう一つ、何と言っていた？」", placeholder: "望みと怖さを分けて書く", helper: "『戻りたい』と『戻れない』の両方を見てください。", storeAs: "ep9Memory", skipLabel: "二つを聞く", skipValue: "戻りたいが、壊すのが怖くて戻れない", replyFallback: "戻りたい望みと、壊すのが怖い気持ちが同時にあるね。" },
    { kind: "dialogue", id: "ep9-adv-02", scene: "見つけたミオ", camera: "link", line: { id: "ep9-adv-02", who: "link", face: "think", text: "{{ep9MemoryReply}} なら『今すぐ戻れ』は、怖い方を踏みつぶす命令になる。", dynamic: true }, nextLabel: "三つの反応を見る" },
    { kind: "guided-investigation", id: "ep9-guided", scene: "動ける可能性", title: "言葉・視線・距離から、選べる一歩を探す", steps: [
      { id: "ep9-guide-1", linkPrompt: "まずミオの言葉。戻りたい望みと、戻れない怖さを両方残そう。", actionLabel: "1つ目を確かめる", evidenceId: "mio-words", linkComment: "どちらかを否定すると、ミオの今の体験から外れる。", reflectionPrompt: "『戻れば二人の学びを壊す』と怖がるミオへ、まず何を認める？", placeholder: "二つの気持ちを短く書く", helper: "両方あってよい形にしてください。", storeAs: "ep9Observe1", skipLabel: "両方を認める", skipValue: "戻りたい気持ちも怖さもある", replyFallback: "戻りたい気持ちも、壊すのが怖い気持ちもある。", linkResponse: "{{ep9Observe1Reply}} 次は、言葉と一緒に体が向いている場所を見る。" },
      { id: "ep9-guide-2", linkPrompt: "戻れないと言いながら、ミオは出口を見た。命令せず、この反応をどう使える？", actionLabel: "2つ目を確かめる", evidenceId: "mio-body", linkComment: "出口を見ることはもう起きている。戻る決定にせず、気づいてもらうことはできる。", reflectionPrompt: "すでに起きている反応として、何を伝える？", placeholder: "本人が確かめられる反応を書く", helper: "心を決めつけず、見える動作を使います。", storeAs: "ep9Observe2", skipLabel: "動作を見る", skipValue: "何度か出口を見ている", replyFallback: "何度か出口を見ている。その反応は本人も確かめられる。", linkResponse: "{{ep9Observe2Reply}} 最後は距離。全部戻る以外の動きを探そう。" },
      { id: "ep9-guide-3", linkPrompt: "出口まで三歩。今すぐ戻るか、永遠に残るかの二択ではない。", actionLabel: "3つ目を確かめる", evidenceId: "distance", linkComment: "一歩だけ試して止まることも、今日は動かないこともできる。", reflectionPrompt: "ミオが自分で選べる最小の変化は？", placeholder: "一歩、向きを変える、待つなどを書く", helper: "やめる自由も一緒に残してください。", storeAs: "ep9Observe3", skipLabel: "一歩だけ考える", skipValue: "出口へ一歩だけ進み、止まってもよい", replyFallback: "出口へ一歩だけ。そこで止まることも、動かないことも選べる。", linkResponse: "{{ep9Observe3Reply}} {{userName}}、ミオへ命令せずに、どんな可能性を渡せると思う？" },
    ], nextLabel: "仮説を話す" },
    { kind: "recall", id: "ep9-hypothesis", scene: "許可形の暗示", purpose: "hypothesis", title: "戻るよう命令せず、ミオが自分で一歩を選べる暗示に必要なものは？", prompt: "リンク「戻れと決めるのは僕らじゃない。何を残せば、ミオが選べる？」", placeholder: "拒否、可能性、最初の一歩を考える", helper: "しない自由と、できるかもしれない提案を分けてください。", storeAs: "ep9Hypothesis", skipLabel: "まだ分からない", skipValue: "動かない自由を残し、一歩だけ可能性として提案する", replyFallback: "動かない自由を残して、一歩だけを可能性として提案すればいい。" },
    { kind: "dialogue", id: "ep9-adv-03", scene: "許可形の暗示", camera: "teacher", line: { id: "ep9-adv-03", who: "teacher", text: "{{ep9HypothesisReply}} 『してもよい』『しなくてもよい』。選べる言葉が、本人の反応を守ります。", dynamic: true }, nextLabel: "第一推理へ" },
    { kind: "deduction", id: "ep9-deduction-1", scene: "第一推理", title: "ミオへ使う最初の暗示として合うものは？", prompt: "戻る結果を命じず、本人が選べる一歩を許可形で示します。", questionBasis: { subject: "戻りたいが怖くて動けないミオ", before: "出口を見て、三歩の距離を確かめた後", asks: "拒否権を残す最初の催眠暗示", goal: "許可形と直接命令を区別し本人の選択で変化を始められるようにする" }, options: [
      { id: "return", label: "『大丈夫だから、今すぐ学校へ戻って』", correct: false, feedback: "怖さを消したことにして、結果まで命じています。動かない自由を残してください。" },
      { id: "may-step", label: "『今は戻らなくていい。一歩だけ試すか、ここにいるか選べます』", correct: true, feedback: "拒否を残したまま、本人が一歩を可能性として選べます。" },
      { id: "guilt", label: "『二人を信じるなら、戻れるはずです』", correct: false, feedback: "信頼を条件にして動かそうとしています。本人が断れる言葉へ変えてください。" },
    ] },
    { kind: "reveal", id: "ep9-reveal-1", scene: "許可された一歩", kicker: "PERMISSION BEFORE CHANGE", title: "しない自由を残し、\nできる可能性を置く。", body: "今の気持ちを否定しない。\n小さな変化を許可形で提案する。\n選ぶ時間を本人へ返す。", nextLabel: "ミオへ実際に使う" },
    { kind: "dialogue", id: "ep9-adv-03b", scene: "許可された一歩", camera: "link", line: { id: "ep9-adv-03b", who: "link", face: "think", text: "『戻らなくてもいい』と言ったら、本当に戻らなくなる気がして怖い。でも、戻らせることが目的になったら違うんですよね。" }, nextLabel: "誰が選ぶか確かめる" },
    { kind: "dialogue", id: "ep9-adv-04", scene: "ミオへの実習", camera: "link", line: { id: "ep9-adv-04", who: "link", face: "think", text: "{{userName}}。ここからは、君の言葉でミオへ伝えて。僕が焦って命令しそうだから。" }, nextLabel: "一言を作る" },
    { kind: "apply", id: "ep9-apply", scene: "ミオへの実習", title: "戻りたいが怖いミオへ、最初に何と言う？", prompt: "気持ちを認め、しない自由と、一つの可能性を言葉にします。", questionBasis: { subject: "戻れば学びを壊すと思い、出口の前で固まるミオ", before: "戻りたい望みと出口を見る反応を確かめた後", asks: "本人が選べる許可形の暗示", goal: "相手を戻らせるのではなく、相手自身が最初の一歩を選べるようにする" }, storeAs: "ep9Move", options: [
      { id: "command", label: "『もう誤解だと分かった。今すぐ戻ろう』", correct: false, value: "誤解だと決め、今すぐ戻るよう命じた", feedback: "誰の声だったかも、危険が終わったかも未確認です。戻らない自由を残してください。" },
      { id: "permission", label: "『怖さがあってもいい。ここにいるか、一歩だけ近づくか、自分で選べる』", correct: true, value: "怖さと拒否を認め、一歩を本人の選択として提案した", feedback: "怖さを消さず、動かない選択と一歩の可能性を本人へ返せています。" },
      { id: "prove", label: "『本当に仲間なら、戻って証明して』", correct: false, value: "仲間である証明として戻るよう迫った", feedback: "関係を条件にして選択を狭めています。戻らない自由を言葉にしてください。" },
    ], freeAnswer: { label: "自分の許可形暗示を作る", placeholder: "認める言葉＋しない自由＋一つの可能性を書く", helper: "『○○でもいい。△△することも、しないことも選べる』の形でも大丈夫です。", storeAs: "ep9CustomMove", correctCriteria: "現在の怖さやためらいを認め、しない自由を残し、小さな変化を可能性として一つ提案する", incorrectCriteria: "戻ることを命令する、関係や罪悪感で迫る、安全を断定する" } },
    { kind: "dialogue", id: "ep9-adv-05", scene: "ミオが選ぶ", camera: "mio", line: { id: "ep9-adv-05", who: "mio", face: "aha", text: "……戻らなくてもいいと言われたら、自分で一歩だけ試したくなりました。ここまでなら、私が選べます。" }, nextLabel: "変化を考える" },
    { kind: "recall", id: "ep9-reflection", scene: "ミオが選ぶ", purpose: "reflection", title: "ミオは、なぜ命令されない方が一歩を選べた？", prompt: "リンク「戻れと言ってないのに、ミオは出口へ動いた。どこで自分の選択になった？」", placeholder: "言葉と選択の変化を書く", helper: "拒否できることと、可能性の言葉を見てください。", storeAs: "ep9Reflection", skipLabel: "まだ分からない", skipValue: "しない自由があり、一歩を自分で選べたから", replyFallback: "しない自由が守られたから、一歩を自分の選択にできたんですね。" },
    { kind: "dialogue", id: "ep9-adv-06", scene: "ミオが選ぶ", camera: "teacher", line: { id: "ep9-adv-06", who: "teacher", text: "{{ep9ReflectionReply}} これを Permissive Suggestion、許可形の暗示と呼びます。", dynamic: true }, nextLabel: "最後の確認へ" },
    { kind: "dialogue", id: "ep9-adv-06b", scene: "倫理の確認", camera: "link", line: { id: "ep9-adv-06b", who: "link", face: "think", text: "言い方を優しくするだけじゃ足りない。本当に断れるかまで確かめるんですね。" }, nextLabel: "止める条件を選ぶ" },
    { kind: "deduction", id: "ep9-deduction-2", scene: "倫理の確認", title: "許可形でも催眠を止めるべき時は？", prompt: "言い方だけでなく、同意と安全を確認してください。", questionBasis: { subject: "相手へ使う許可形の暗示", before: "相手がためらいや拒否を示した時", asks: "暗示を続けない条件", goal: "Permissive Suggestion を安全な言い換えだけで万能と誤解しない" }, options: [
      { id: "pause", label: "本人がやめたい、怖い、分からないと伝えた時", correct: true, feedback: "その時は止め、目的と安全を改めて本人と確認します。" },
      { id: "slow", label: "本人がゆっくり一歩を選んだ時", correct: false, feedback: "遅さは失敗ではありません。本人が望むなら、その反応に合わせます。" },
      { id: "no-trance", label: "すぐ催眠らしい反応が出ない時", correct: false, feedback: "反応を強制しません。本人の希望を聞き、別の方法か終了を選べます。" },
    ] },
    { kind: "reveal", id: "ep9-reveal-2", scene: "カードの場所", kicker: "PERMISSIVE SUGGESTION", title: "命じず、\n選べる可能性を渡す。", body: "今の体験を認める。\nしない自由を残す。\n一つの小さな変化を許可形で提案する。", nextLabel: "ミオの話を聞く" },
    { kind: "dialogue", id: "ep9-adv-07", scene: "カードの場所", camera: "mio", line: { id: "ep9-adv-07", who: "mio", face: "think", text: "カードは奥の保管室です。でも扉は、私へ暗示を使えば開くように変えられた。次は、使うかどうかを選ばされます。" }, nextLabel: "講義へ戻る" },
  ],
});

export const EP9_ADVENTURE_QUALITY = reviewAdventureScenario(EP9_ADVENTURE);
