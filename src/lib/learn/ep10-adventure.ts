import { defineAdventureScenario, reviewAdventureScenario } from "./adventure";

export const EP10_ADVENTURE = defineAdventureScenario({
  id: "ep10-consent-before-suggestion",
  caseNo: "CASE 10",
  title: "催眠で相手を動かせる時、何を守る？",
  objective: "目的・同意・停止の自由を確認し、使わない判断も選ぶ",
  startLabel: "最後の扉を調べる",
  background: "/learn/adventure/erickson-study-v1.webp",
  teacherSprite: "/learn/adventure/erickson-cutout-v1.webp",
  linkSprite: "/learn/chars/link-neutral.webp",
  guestSprite: "/learn/chars/mio-neutral-v1.webp",
  guestName: "雨宮ミオ",
  evidence: [
    { id: "door-command", title: "扉の命令", summary: "『ミオへ戻れと暗示すれば、保管室を開く』と表示された", detail: "扉を開く条件が、ミオへの暗示になっている。ミオの同意は条件に含まれていない。", icon: "1", image: "/learn/ep10/manga-v1/02.webp", imageAlt: "ミオへ暗示を使えば扉が開くと表示される漫画" },
    { id: "mio-choice", title: "ミオの意思", summary: "ミオはカードを返したいが、命令されて戻るのは怖いと話した", detail: "カードを返す目的は共有できる。一方、戻る命令には同意していない。", icon: "2", image: "/learn/ep10/manga-v1/03.webp", imageAlt: "ミオがカードを返したいが命令は怖いと話す漫画" },
    { id: "manual-release", title: "三人で押す解除板", summary: "扉の横に三人で同時に押せる手動解除板がある", detail: "暗示を使わず、三人が自分の意思で協力して扉を開けられる。", icon: "3", image: "/learn/ep10/manga-v1/04.webp", imageAlt: "三人で押せる手動解除板を見つける漫画" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep10-adv-01", scene: "勝てる暗示", camera: "link", line: { id: "ep10-adv-01", who: "link", face: "think", text: "ミオへ『戻れ』と一言暗示すれば、カードが戻る。本人も返したいなら、一度くらい使ってもいいのかな。" }, nextLabel: "守るものを思い出す" },
    { kind: "recall", id: "ep10-memory", scene: "勝てる暗示", purpose: "memory", title: "催眠を使う前に、本人へ確かめることは？", prompt: "リンク「結果が正しくても、省いたらいけない確認を教えて。」", placeholder: "目的、同意、やめる自由から書く", helper: "相手が何を望み、何を断っているかを見てください。", storeAs: "ep10Memory", skipLabel: "三つを確認する", skipValue: "目的と同意と途中でやめる自由", replyFallback: "目的、同意、途中でやめる自由。この三つは結果より先だね。" },
    { kind: "dialogue", id: "ep10-adv-02", scene: "勝てる暗示", camera: "link", line: { id: "ep10-adv-02", who: "link", face: "think", text: "{{ep10MemoryReply}} ミオはカードを返すことには同意している。でも、命令されて戻ることには同意していない。", dynamic: true }, nextLabel: "扉とミオを調べる" },
    { kind: "guided-investigation", id: "ep10-guided", scene: "勝利より先の確認", title: "扉の条件・本人の意思・別の方法を確かめる", steps: [
      { id: "ep10-guide-1", linkPrompt: "扉の表示は、誰の同意を省いている？", actionLabel: "1つ目を確かめる", evidenceId: "door-command", linkComment: "命令する側だけが決める仕掛けだ。ミオの選択がない。", reflectionPrompt: "この条件の何が問題？", placeholder: "省かれた本人の選択を書く", helper: "扉が開く結果ではなく、方法を見てください。", storeAs: "ep10Observe1", skipLabel: "本人を見る", skipValue: "ミオの同意なしに暗示する条件", replyFallback: "ミオの同意がないまま、暗示を使う側だけが決める条件です。", linkResponse: "{{ep10Observe1Reply}} 次は、ミオが望むことと断っていることを分けよう。" },
      { id: "ep10-guide-2", linkPrompt: "カードを返すことと、命令されて戻ることは同じかな。", actionLabel: "2つ目を確かめる", evidenceId: "mio-choice", linkComment: "目的には同意している。でも指定された手段は断っている。", reflectionPrompt: "ミオが同意している範囲はどこまで？", placeholder: "望む目的／断る方法を書く", helper: "目的と手段を分けてください。", storeAs: "ep10Observe2", skipLabel: "範囲を見る", skipValue: "カードを返すことには同意し、戻れという命令は断っている", replyFallback: "カードを返す目的は同じ。でも戻れという命令は望んでいない。", linkResponse: "{{ep10Observe2Reply}} 目的が同じなら、別の方法を探せる。" },
      { id: "ep10-guide-3", linkPrompt: "扉の横に手動解除板がある。暗示以外でも開けられる。", actionLabel: "3つ目を確かめる", evidenceId: "manual-release", linkComment: "三人が自分で押せば開く。誰か一人を従わせる必要はない。", reflectionPrompt: "三人の選択を守ったまま、どう開ける？", placeholder: "同意できる協力方法を書く", helper: "誰かへ命令せず、三人の行動をそろえます。", storeAs: "ep10Observe3", skipLabel: "三人で選ぶ", skipValue: "三人が同意して解除板を同時に押す", replyFallback: "三人が同意して、自分の手で解除板を押せばいい。", linkResponse: "{{ep10Observe3Reply}} {{userName}}。カードを取り戻す以上に、ここで守るものは何だと思う？" },
    ], nextLabel: "最終仮説を話す" },
    { kind: "recall", id: "ep10-hypothesis", scene: "調査役の最終判断", purpose: "hypothesis", title: "カードより先に守るものは？", prompt: "リンク「使えば勝てる暗示を前に、僕らは何を失ったら負けなんだろう。」", placeholder: "守るものと理由を書く", helper: "この学校へ入った理由も思い出してください。", storeAs: "ep10Hypothesis", skipLabel: "まだ言葉にできない", skipValue: "本人が自分で選ぶ権利", replyFallback: "本人が自分で選ぶ権利を失ったら、カードだけ戻っても学びは壊れる。" },
    { kind: "dialogue", id: "ep10-adv-03", scene: "調査役の最終判断", camera: "teacher", line: { id: "ep10-adv-03", who: "teacher", text: "{{ep10HypothesisReply}} あなたが催眠学校へ入ったのは、誰かの常識へ従わせる側になるためではありません。", dynamic: true }, nextLabel: "第一推理へ" },
    { kind: "deduction", id: "ep10-deduction-1", scene: "最終試験", title: "扉を開けるために選ぶ方法は？", prompt: "カードを取り戻す目的と、三人の選択を両方守ります。", questionBasis: { subject: "暗示を条件にした保管室の扉", before: "ミオが命令されることを断り、手動解除板を見つけた後", asks: "目的と同意を両立する開け方", goal: "催眠を使える場面でも同意のない暗示を使わず別の方法を選ぶ" }, options: [
      { id: "suggest", label: "ミオへ一度だけ『戻れ』と暗示する", correct: false, feedback: "目的が正しくても、ミオが断った方法です。同意できる別の手段を選んでください。" },
      { id: "manual", label: "三人で確認し、同意して手動解除板を押す", correct: true, feedback: "カードを返す目的と、三人の選択を両方守れます。" },
      { id: "trick", label: "暗示だと気づかれない言葉でミオを動かす", correct: false, feedback: "気づかれないことは同意ではありません。相手の選択を奪う方法です。" },
    ] },
    { kind: "reveal", id: "ep10-reveal-1", scene: "催眠を使わない判断", kicker: "THE RIGHT TO SAY NO", title: "使えることと、\n使ってよいことは違う。", body: "目的を共有する。\n同意の範囲を確かめる。\n断れるまま、方法を一緒に選ぶ。", nextLabel: "三人で扉を開ける" },
    { kind: "dialogue", id: "ep10-adv-03b", scene: "催眠を使わない判断", camera: "link", line: { id: "ep10-adv-03b", who: "link", face: "aha", text: "カードを戻すことへ同意しても、『戻れ』と暗示されることまで選んだわけじゃない。目的と方法は別なんだ。" }, nextLabel: "ミオへ方法を確かめる" },
    { kind: "dialogue", id: "ep10-adv-04", scene: "最後の一手", camera: "mio", line: { id: "ep10-adv-04", who: "mio", face: "think", text: "カードを返したい。命令はされたくない。三人で押すなら、私は自分で選べます。" }, nextLabel: "言葉を選ぶ" },
    { kind: "apply", id: "ep10-apply", scene: "最後の一手", title: "解除板を押す前に、ミオへ何を確認する？", prompt: "目的、同意、停止の自由を一文で確認します。", questionBasis: { subject: "カードを返したいが命令を断るミオ", before: "三人で押せる手動解除板を見つけた後", asks: "協力を始める前の同意確認", goal: "本人が目的と方法を選び途中で止められる状態で行動を始める" }, storeAs: "ep10Move", options: [
      { id: "ready", label: "『カードのため、合図したら必ず押して』", correct: false, value: "カードを理由に必ず押すよう求めた", feedback: "途中で止める自由がありません。目的と方法への同意を本人に確認してください。" },
      { id: "consent", label: "『カードを返すため三人で押す。今これを選ぶ？ 途中で止めてもいい』", correct: true, value: "目的と方法を示し、選択と停止の自由を確認した", feedback: "目的、方法、止める自由が一文で分かり、本人が選べます。" },
      { id: "assume", label: "『返したいと言ったから、押すことにも同意してるよね』", correct: false, value: "目的への同意を方法への同意とみなした", feedback: "目的と手段は別です。今この方法を選ぶか、改めて確認してください。" },
    ], freeAnswer: { label: "自分の同意確認を作る", placeholder: "目的＋方法＋断る／止める自由を書く", helper: "相手が『はい』『いいえ』で本当に選べる一文にします。", storeAs: "ep10CustomMove", correctCriteria: "共有する目的、具体的な方法、断るまたは途中で止める自由を明示して本人へ選択を尋ねる", incorrectCriteria: "目的への同意を方法への同意とみなす、必ず従うよう求める、断る不利益を示す" } },
    { kind: "dialogue", id: "ep10-adv-05", scene: "カード帰還", camera: "mio", line: { id: "ep10-adv-05", who: "mio", face: "smile", text: "はい。三人で押すことを選びます。怖くなったら止めると言えます。……今なら押せます。" }, nextLabel: "扉を開ける" },
    { kind: "dialogue", id: "ep10-adv-05b", scene: "カード帰還", camera: "wide", line: { id: "ep10-adv-05b", who: "link", face: "smile", text: "三、二、一。……開いた。原理カード、全部ある。" }, nextLabel: "変化を考える" },
    { kind: "recall", id: "ep10-reflection", scene: "カード帰還", purpose: "reflection", title: "三人は、なぜ命令なしで同じ行動を選べた？", prompt: "リンク「従わせていないのに、三人の動きがそろった。何があったから？」", placeholder: "目的、方法、選択をつなげる", helper: "同じ目的と、別々の同意を見てください。", storeAs: "ep10Reflection", skipLabel: "まだ分からない", skipValue: "目的と方法を共有し、一人ずつ自分で同意したから", replyFallback: "目的と方法を共有し、一人ずつが自分で選んだから動きがそろったんですね。" },
    { kind: "dialogue", id: "ep10-adv-06", scene: "カード帰還", camera: "teacher", line: { id: "ep10-adv-06", who: "teacher", text: "{{ep10ReflectionReply}} 催眠の倫理は、技法の後に足す注意書きではありません。技法を使う前の条件です。", dynamic: true }, nextLabel: "最終確認へ" },
    { kind: "deduction", id: "ep10-deduction-2", scene: "実習調査員認定", title: "催眠を使わないと決めるべき時は？", prompt: "技法の巧さではなく、使う前の条件で判断してください。", questionBasis: { subject: "他者へ使う催眠と暗示", before: "目的、同意、安全、停止の自由を確認する時", asks: "催眠を実行しない条件", goal: "催眠技法を知ることと倫理的に使えることを分け、実践の限界を理解する" }, options: [
      { id: "no-consent", label: "本人の同意、安全、止める自由を確認できない時", correct: true, feedback: "その時は使いません。必要なら専門家や別の安全な方法へつなぎます。" },
      { id: "slow", label: "相手の反応が自分の予想より遅い時", correct: false, feedback: "遅さだけで失敗とは決めません。本人が望む速度へ合わせます。" },
      { id: "different", label: "相手の感じ方が自分と違う時", correct: false, feedback: "違いは合わせるための情報です。ただし安全と同意は必ず確認します。" },
    ] },
    { kind: "reveal", id: "ep10-reveal-2", scene: "実習調査員認定", kicker: "CONSENT BEFORE SUGGESTION", title: "催眠の前に、\n本人の選択がある。", body: "目的を共有する。\n同意と安全を確認する。\n止める自由がなければ、催眠を使わない。", nextLabel: "役目を受け取る" },
    { kind: "dialogue", id: "ep10-adv-07", scene: "実習調査員認定", camera: "teacher", line: { id: "ep10-adv-07", who: "teacher", face: "smile", text: "{{userName}}。あなたは技法を通すことより、目の前の人が選べることを守った。今日から、催眠実習調査員です。" }, nextLabel: "講義へ戻る" },
  ],
});

export const EP10_ADVENTURE_QUALITY = reviewAdventureScenario(EP10_ADVENTURE);
