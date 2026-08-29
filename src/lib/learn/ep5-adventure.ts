import { defineAdventureScenario, reviewAdventureScenario } from "./adventure";

export const EP5_ADVENTURE = defineAdventureScenario({
  id: "ep5-betrayal-reorientation",
  caseNo: "CASE 05",
  title: "信じていた相手に予想を裏切られた時、催眠をどう解く？",
  objective: "事実・まだ分からない意味・今できる一手を分ける",
  startLabel: "消えたカードを調べる",
  background: "/learn/adventure/erickson-study-v1.webp",
  teacherSprite: "/learn/adventure/erickson-cutout-v1.webp",
  linkSprite: "/learn/chars/link-neutral.webp",
  guestSprite: "/learn/chars/mio-betray-v1.webp",
  guestName: "雨宮ミオ",
  evidence: [
    { id: "empty-vault", title: "空の保管庫", summary: "原理カードが保管庫からなくなっていた", detail: "扉は開き、カードはない。ただし、誰がいつ持ち出したかはこの時点では分からない。", icon: "1", image: "/learn/ep5/manga-v1/01.webp", imageAlt: "空になった原理カード保管庫の漫画" },
    { id: "key-note", title: "鍵の印と短い紙", summary: "ミオの机に鍵の印と『教えてくれてありがとう』が残った", detail: "ミオがいないこと、印と紙があることは事実。紙の意味はまだ一つに決められない。", icon: "2", image: "/learn/ep5/manga-v1/02.webp", imageAlt: "ミオの机に鍵の印とメモが残る漫画" },
    { id: "recorded-confession", title: "途中で切れた映像", summary: "ミオはカードを持ち出したと話した", detail: "持ち出した事実は確定したが、目的とカードの場所は説明されないまま映像が切れた。", icon: "3", image: "/learn/ep5/manga-v1/04.webp", imageAlt: "ミオがカードを持ち出したと告げる映像の漫画" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep5-adv-01", scene: "保管庫事件", camera: "link", line: { id: "ep5-adv-01", who: "link", face: "think", text: "カードが全部ない。ミオもいない。僕らを最初から騙してたんだ。そうとしか思えない。" }, nextLabel: "今ある記憶を話す" },
    { kind: "recall", id: "ep5-memory", scene: "混乱を止める", purpose: "memory", title: "今この場で、確実に分かることを一つ挙げると？", prompt: "リンク「僕の推測じゃなくて、淳が今見て分かることを一つ教えて。」", placeholder: "今見て確かめられる事実を一つ書く", helper: "『なぜ』ではなく、見えるものだけで大丈夫です。", storeAs: "ep5Memory", skipLabel: "まだ言葉にできない", skipValue: "保管庫にカードがない", replyFallback: "まず確実なのは、保管庫にカードがないことだね。意味は後で考えよう。" },
    { kind: "dialogue", id: "ep5-adv-02", scene: "混乱を止める", camera: "teacher", line: { id: "ep5-adv-02", who: "teacher", text: "{{ep5MemoryReply}} それで結構です。混乱した時は、答えを作る前に、今分かる事実へ注意を戻します。", dynamic: true }, nextLabel: "三つの証拠を見る" },
    { kind: "guided-investigation", id: "ep5-guided", scene: "事件を調べ直す", title: "分かることと、まだ分からないことを分ける", steps: [
      { id: "ep5-guide-1", linkPrompt: "最初は空の保管庫。見ただけで分かることと、まだ分からないことを分けよう。", actionLabel: "1つ目の証拠を見る", evidenceId: "empty-vault", linkComment: "カードがないのは事実。でも、誰が持ち出したかはまだ映っていない。", reflectionPrompt: "空の保管庫だけで、確実に言えることは何？", placeholder: "見えている事実だけを書く", helper: "犯人や目的はまだ書かなくて大丈夫です。", storeAs: "ep5Observe1", skipLabel: "まだ分からない", skipValue: "保管庫にカードがない", replyFallback: "カードがない。ここまでは確実ですね。誰が、なぜはまだ別です。", linkResponse: "{{ep5Observe1Reply}} 次は、ミオの机に残ったものを見よう。" },
      { id: "ep5-guide-2", linkPrompt: "短い紙を見て、書いてある言葉と、僕たちが足した意味を分けよう。", actionLabel: "2つ目の証拠を見る", evidenceId: "key-note", linkComment: "紙には『教えてくれてありがとう』だけ。裏切りとも別れとも書いていない。", reflectionPrompt: "紙に実際に書いてあることと、まだ書いていないことは？", placeholder: "書いてある言葉／書いていない意味を分ける", helper: "文字そのものを見てください。", storeAs: "ep5Observe2", skipLabel: "まだ分からない", skipValue: "感謝は書いてあるが、目的は書いていない", replyFallback: "感謝の言葉はある。でも、目的も居場所もまだ書かれていないね。", linkResponse: "{{ep5Observe2Reply}} 最後に、映像で初めて確定したことを見よう。" },
      { id: "ep5-guide-3", linkPrompt: "映像で、ミオが自分の言葉で認めた事実だけを拾おう。", actionLabel: "3つ目の証拠を見る", evidenceId: "recorded-confession", linkComment: "ミオは『カードは私が持ち出した』と言った。場所と目的は話していない。", reflectionPrompt: "映像で確定したことと、まだ分からないことは？", placeholder: "確定した事実／不明なことを書く", helper: "映像が切れた後を想像で埋めないでください。", storeAs: "ep5Observe3", skipLabel: "まだ分からない", skipValue: "ミオが持ち出したことは確定し、目的と場所は不明", replyFallback: "持ち出したのはミオ。けれど、なぜ、どこへはまだ分からない。", linkResponse: "{{ep5Observe3Reply}} 僕はすぐ『全部嘘』にした。君はどう考える？" },
    ], nextLabel: "リンクへ仮説を話す" },
    { kind: "recall", id: "ep5-hypothesis", scene: "事実と解釈を分ける", purpose: "hypothesis", title: "『ミオは最初から全部嘘だった』は、事実？ それとも解釈？", prompt: "リンク「第3話と第4話のミオまで嘘だったと、今の証拠だけで決めていいのかな。」", placeholder: "事実か解釈かと、その理由を書く", helper: "持ち出した事実と、過去の気持ちは分けてください。", storeAs: "ep5Hypothesis", skipLabel: "まだ決められない", skipValue: "今は解釈で、過去の気持ちまでは分からない", replyFallback: "持ち出した事実は確定。でも、過去の助けまで嘘だったかはまだ決められないね。" },
    { kind: "dialogue", id: "ep5-adv-03", scene: "事実と解釈を分ける", camera: "link", line: { id: "ep5-adv-03", who: "link", face: "think", text: "{{ep5HypothesisReply}} ショックを早く終わらせたくて、僕は答えを一つに決めたのかもしれない。", dynamic: true }, nextLabel: "最初の推理を選ぶ" },
    { kind: "deduction", id: "ep5-deduction-1", scene: "第一推理", title: "今の証拠で、確定していることはどれ？", prompt: "見た事実と、まだ証拠のない物語を分けてください。", questionBasis: { subject: "消えたカードとミオ", before: "映像が途中で切れた直後", asks: "現時点で確実に言えること", goal: "混乱を結論で埋めず、確認可能な事実へ注意を戻す" }, options: [
      { id: "all-lie", label: "ミオは第3話からずっと二人を騙していた", correct: false, feedback: "過去の気持ちを示す証拠はありません。映像で本人が認めた一文だけを見てください。" },
      { id: "took-cards", label: "ミオが原理カードを保管庫から持ち出した", correct: true, feedback: "ここまでは映像の本人の言葉で確定しています。目的と居場所はまだ不明です。" },
      { id: "destroyed", label: "ミオは原理カードを全部壊した", correct: false, feedback: "カードが壊れた証拠はありません。なくなったことと、壊されたことを分けてください。" },
    ] },
    { kind: "reveal", id: "ep5-reveal-1", scene: "第一推理成立", kicker: "FACT IS NOT THE WHOLE STORY", title: "事実は一つ。\n意味は、まだ決めない。", body: "ミオがカードを持ち出した。\nなぜ、どこへ、過去も嘘だったかは未確定。\n混乱を、想像の答えで埋めない。", evidenceIds: ["empty-vault", "key-note", "recorded-confession"], nextLabel: "リンクを混乱から戻す" },
    { kind: "dialogue", id: "ep5-adv-04", scene: "リンクの混乱", camera: "link", line: { id: "ep5-adv-04", who: "link", face: "think", text: "分けても、頭の中は『裏切りだ』『追え』『もう信じるな』でいっぱいです。淳、僕を今ここへ戻して。" }, nextLabel: "一言を組み立てる" },
    { kind: "dialogue", id: "ep5-adv-05", scene: "リンクの混乱", camera: "teacher", line: { id: "ep5-adv-05", who: "teacher", text: "混乱を消せとは言いません。今分かる事実を三つ、その後に選べる確認行動を一つです。" }, nextLabel: "次の一手を選ぶ" },
    { kind: "apply", id: "ep5-apply", scene: "リンクの混乱", title: "混乱しているリンクへ、最初に何と言う？", prompt: "結論を押し付けず、現在の事実と選べる一手へ注意を戻します。", questionBasis: { subject: "ミオへの考えで頭がいっぱいのリンク", before: "裏切り、追え、信じるなという言葉が続く時", asks: "現在へ再定位する最初の一言", goal: "混乱が残っていても確認可能な次の行動を選べるようにする" }, storeAs: "ep5Move", options: [
      { id: "trust", label: "『ミオは本当はいい人だから、信じて待とう』", correct: false, value: "ミオは善人だと決めて待つよう求めた", feedback: "善人という結論もまだ証拠がありません。リンクが今確かめられる事実へ戻してください。" },
      { id: "facts-action", label: "『カードがない。印がある。映像は切れた。次に何を確認する？』", correct: true, value: "三つの事実から次の確認行動を選ばせた", feedback: "事実と解釈を分けたまま、本人が次の確認行動を選べます。" },
      { id: "forget", label: "『考えるのをやめて、全部忘れよう』", correct: false, value: "事件を考えず忘れるよう命令した", feedback: "混乱を消す命令になっています。今ある事実を確かめ、次の一手を選べるようにしてください。" },
    ], freeAnswer: { label: "自分の一言で戻す", placeholder: "事実と次の確認行動を含む一言を書く", helper: "断定を増やさず、今見えるものから始めてください。", storeAs: "ep5CustomMove", correctCriteria: "事実と解釈を区別し、現在確認できるものと選べる次の行動へ注意を戻している", incorrectCriteria: "犯人や動機を断定する、忘れろと命令する、混乱に乗じて従わせる" } },
    { kind: "dialogue", id: "ep5-adv-06", scene: "リンクが現在へ戻る", camera: "link", line: { id: "ep5-adv-06", who: "link", face: "aha", text: "カードがない。鍵の印がある。映像は切れた。……まず映像の送信元を確認したい。今なら、それを選べます。" }, nextLabel: "変化を確かめる" },
    { kind: "dialogue", id: "ep5-adv-07", scene: "リンクが現在へ戻る", camera: "teacher", line: { id: "ep5-adv-07", who: "teacher", text: "混乱は残っています。それでもリンクは、想像の結論ではなく、確かめる一手を自分で選びました。" }, nextLabel: "理由を言葉にする" },
    { kind: "recall", id: "ep5-reflection", scene: "変化を言葉にする", purpose: "reflection", title: "リンクは、なぜ混乱が残ったまま動けた？", prompt: "リンク「何が正しいかはまだ分からない。でも次は選べた。淳の一言のどこが違った？」", placeholder: "一言とリンクの変化をつなげる", helper: "混乱が消えたかではなく、注意がどこへ戻ったかを見てください。", storeAs: "ep5Reflection", skipLabel: "まだ分からない", skipValue: "事実と解釈を分け、今できる確認へ戻ったから", replyFallback: "結論を急がず、今分かる事実から選択を取り戻したんですね。" },
    { kind: "dialogue", id: "ep5-adv-07b", scene: "変化を言葉にする", camera: "teacher", line: { id: "ep5-adv-07b", who: "teacher", text: "{{ep5ReflectionReply}} 最後に、混乱を使う時に越えてはいけない線を選んでください。", dynamic: true }, nextLabel: "最終推理へ" },
    { kind: "deduction", id: "ep5-deduction-2", scene: "最終推理", title: "混乱を催眠に使う時、越えてはいけない線は？", prompt: "再定位と、人の判断を奪う操作を区別してください。", questionBasis: { subject: "混乱している人への催眠", before: "何が起きたか整理できず判断が揺れている時", asks: "倫理上してはいけない使い方", goal: "混乱技法を同意のない操作術として誤用しない" }, options: [
      { id: "facts", label: "本人と一緒に、今分かる事実を確かめる", correct: false, feedback: "これは現在へ注意を戻す方法です。本人の選択を支える範囲で行います。" },
      { id: "pause", label: "まだ決められない意味を、未確定のまま残す", correct: false, feedback: "これは答えを急がないために必要です。分からないことを分からないまま置けます。" },
      { id: "exploit", label: "混乱に乗じて、本人が選んでいない命令へ従わせる", correct: true, feedback: "その通りです。混乱を利用して同意や判断を奪うことは、この授業の催眠ではありません。" },
    ] },
    { kind: "reveal", id: "ep5-reveal-2", scene: "事件は続く", kicker: "CONFUSION AND REORIENTATION", title: "混乱を消さず、\n現在へ注意を戻す。", body: "事実。まだ分からない意味。今できる一手。\n三つを分けると、選択を取り戻せる。\n混乱を、相手を操るために使ってはいけない。", nextLabel: "新しい役目を受け取る" },
    { kind: "dialogue", id: "ep5-adv-08", scene: "生徒から調査役へ", camera: "teacher", line: { id: "ep5-adv-08", who: "teacher", text: "淳。カードを受け取る授業は、ここで終わりです。ここからは、催眠をどう使うかを自分で判断し、ミオを追ってください。" }, nextLabel: "事件簿を受け取る" },
  ],
});

export const EP5_ADVENTURE_QUALITY = reviewAdventureScenario(EP5_ADVENTURE);
