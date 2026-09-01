import { defineAdventureScenario, reviewAdventureScenario } from "./adventure";

export const EP8_ADVENTURE = defineAdventureScenario({
  id: "ep8-therapeutic-metaphor",
  caseNo: "CASE 08",
  title: "説明しても届かない時、催眠をどう伝える？",
  objective: "物語を説明の代わりにせず、本人の気づきを引き出す",
  startLabel: "ミオが残した物語を読む",
  background: "/learn/adventure/erickson-study-v1.webp",
  teacherSprite: "/learn/adventure/erickson-cutout-v1.webp",
  linkSprite: "/learn/chars/link-neutral.webp",
  guestSprite: "/learn/chars/mio-worry-v1.webp",
  guestName: "雨宮ミオ",
  evidence: [
    { id: "bird-one", title: "鍵を預かった司書", summary: "司書は町の人から大切な本の鍵を預かった", detail: "物語の出発点。ミオの現実と同じだとは、まだ決めない。", icon: "1", sceneId: "ep8-canon-1" },
    { id: "bird-two", title: "販売の注文書", summary: "本の言葉を『人を従わせる手引き』として売る注文があった", detail: "司書は鍵を隠したが、仲間へ相談しなかった。守ろうとしたことと問題のある手段が両方描かれている。", icon: "2", sceneId: "ep8-canon-2" },
    { id: "bird-three", title: "物語の結末", summary: "本は守られたが、仲間の信頼は傷ついた", detail: "物語は司書を無条件に正当化していない。守ったものと壊したものを並べている。", icon: "3", sceneId: "ep8-canon-3" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep8-adv-01", scene: "答えのない物語", camera: "link", line: { id: "ep8-adv-01", who: "link", face: "think", text: "鳥、火事、鍵。ミオは何を言いたいんだ。答えを書けばいいのに、また分からなくしてる。" }, nextLabel: "最初の印象を話す" },
    { kind: "recall", id: "ep8-memory", scene: "答えのない物語", purpose: "memory", title: "鳥が保管庫の鍵をくわえて飛び去った場面だけなら、その鳥をどう見た？", prompt: "リンク「正解じゃなくていい。最初に感じたことを教えて。」", placeholder: "鳥をどう見たか一言で書く", helper: "泥棒、怖い、理由があるかも、どれでも大丈夫です。", storeAs: "ep8Memory", skipLabel: "まだ決めない", skipValue: "鍵を持ち出した理由は分からない", replyFallback: "最初は、鍵を持ち出した行動しか見えないよね。" },
    { kind: "dialogue", id: "ep8-adv-02", scene: "答えのない物語", camera: "link", line: { id: "ep8-adv-02", who: "link", face: "think", text: "{{ep8MemoryReply}} 僕もその一場面だけで、鳥を悪者にしそうになった。続きを一緒に見よう。", dynamic: true }, nextLabel: "三場面を読む" },
    { kind: "guided-investigation", id: "ep8-guided", scene: "物語の意味を探す", title: "一場面ずつ、見方がどう変わるか確かめる", steps: [
      { id: "ep8-guide-1", linkPrompt: "最初は、鳥が鍵を持ち出した場面。ここで分かることだけを見よう。", actionLabel: "物語 1/3 を読む", evidenceId: "bird-one", linkComment: "鍵を運んだのは事実。でも泥棒は、仲間が付けた意味だ。", reflectionPrompt: "鳥が鍵を持ち去った理由は、この場面だけで決められる？", placeholder: "理由や目的について書く", helper: "行動と目的を分けてください。", storeAs: "ep8Observe1", skipLabel: "まだ分からない", skipValue: "なぜ鍵を運んだかは不明", replyFallback: "鍵を運んだ理由は、まだ物語に出ていない。", linkResponse: "{{ep8Observe1Reply}} 次の場面で、鍵のあった場所に何が起きるか見よう。" },
      { id: "ep8-guide-2", linkPrompt: "鳥が去った後、保管庫へ火が近づいた。最初の行動の見え方は変わる？", actionLabel: "物語 2/3 を読む", evidenceId: "bird-two", linkComment: "持ち出したことが、盗むだけではなく守る可能性にも見えてきた。", reflectionPrompt: "火事を見た後、鳥の行動にどんな別の意味が生まれる？", placeholder: "最初と違う見方を書く", helper: "一つに断定せず、可能性で大丈夫です。", storeAs: "ep8Observe2", skipLabel: "別の見方を見る", skipValue: "鍵を火から守った可能性がある", replyFallback: "盗んだだけでなく、火から離した可能性が出てきた。", linkResponse: "{{ep8Observe2Reply}} 最後に、鳥が鍵をどうしたか確かめよう。" },
      { id: "ep8-guide-3", linkPrompt: "鳥は鍵を壊さず、森の外の箱に置いた。ここまでで物語は何を見せた？", actionLabel: "物語 3/3 を読む", evidenceId: "bird-three", linkComment: "同じ『持ち出した』でも、後の場面で意味が変わった。", reflectionPrompt: "この物語は、ミオの事件の何と重なる？", placeholder: "鳥とミオの共通点を書く", helper: "持ち出した物、危険、保管場所を見てください。", storeAs: "ep8Observe3", skipLabel: "まだ決められない", skipValue: "カードを危険から離して守った可能性", replyFallback: "ミオもカードを奪ったのではなく、別の危険から離した可能性がある。", linkResponse: "{{ep8Observe3Reply}} {{userName}}は、この物語を見て僕らに何を考えてほしいと思う？" },
    ], nextLabel: "自分の仮説を話す" },
    { kind: "recall", id: "ep8-hypothesis", scene: "物語から生まれた仮説", purpose: "hypothesis", title: "鍵を盗んだように見えた鳥の物語は、ミオの行動へどんな可能性を示した？", prompt: "リンク「答えを一つにせず、今いちばん確かめたい仮説を教えて。」", placeholder: "物語と事件をつなぐ仮説を書く", helper: "カードを持ち出した理由と、別の影を考えてください。", storeAs: "ep8Hypothesis", skipLabel: "まだ決められない", skipValue: "カードを誰かから守った可能性を確かめたい", replyFallback: "ミオがカードを守るために持ち出した可能性を、本人に確かめたいね。" },
    { kind: "dialogue", id: "ep8-adv-03", scene: "物語から生まれた仮説", camera: "teacher", line: { id: "ep8-adv-03", who: "teacher", text: "{{ep8HypothesisReply}} 物語は答えを隠すためではありません。聞いた人が、自分で確かめたい意味を見つけるために使います。", dynamic: true }, nextLabel: "第一推理へ" },
    { kind: "deduction", id: "ep8-deduction-1", scene: "第一推理", title: "鳥の物語から別の可能性が生まれた後、ミオ本人へ何を確かめる？", prompt: "物語の意味を事実にせず、次の質問へ変えてください。", questionBasis: { subject: "ミオが残した鍵を運ぶ鳥の物語", before: "三場面を読み終えた後", asks: "事件で次に確認する仮説", goal: "メタファーを一つの正解として押し付けず本人への質問へつなげる" }, options: [
      { id: "hero", label: "ミオは善人で、最初から全て正しかった", correct: false, feedback: "物語から人物の全ては決められません。カードを守った可能性を本人へ確かめてください。" },
      { id: "ask-danger", label: "カードを別の危険から守るために持ち出したのか", correct: true, feedback: "物語から生まれた仮説を、本人へ確かめられる質問にできています。" },
      { id: "ignore", label: "物語は作り話なので、事件とは関係ない", correct: false, feedback: "ミオが事件現場へ残した事実があります。答えではなく、次の仮説として使ってください。" },
    ] },
    { kind: "reveal", id: "ep8-reveal-1", scene: "物語の役目", kicker: "STORY CREATES EXPERIENCE", title: "説明ではなく、\n自分で気づく体験へ。", body: "物語の場面を追う。\n自分に重なる意味を見つける。\nその意味を、次の質問へ変える。", nextLabel: "リンクへ物語を使う" },
    { kind: "dialogue", id: "ep8-adv-04", scene: "自分を責めるリンク", camera: "link", line: { id: "ep8-adv-04", who: "link", face: "think", text: "僕は第5話で、ミオを全部嘘だと決めた。調査役なのに、最初から向いてなかったのかもしれない。" }, nextLabel: "短い物語を選ぶ" },
    { kind: "apply", id: "ep8-apply", scene: "自分を責めるリンク", title: "自分は調査役に向かないと言うリンクへ、どの物語を話す？", prompt: "正論で否定せず、今のリンクに重なる短い場面を選びます。", questionBasis: { subject: "一度決めつけた自分を責めるリンク", before: "鳥の物語からミオの別の可能性に気づいた後", asks: "自分で別の見方を発見できる短いメタファー", goal: "失敗の説明ではなく体験から調査役としての成長へ気づけるようにする" }, storeAs: "ep8Move", options: [
      { id: "lecture", label: "『人は認知バイアスで判断を誤るものです』", correct: false, value: "理屈だけで間違いを説明した", feedback: "正しい説明でも、今のリンクには責められた感覚が残ります。体験が重なる短い物語を選んでください。" },
      { id: "lamp", label: "『暗い部屋で最初の影を犯人と思った子が、灯りを増やして扉を見つけた話』", correct: true, value: "灯りを増やす物語で、見直す力に気づかせた", feedback: "間違いを否定せず、証拠を増やした行動が調査役の力だと本人が発見できます。" },
      { id: "praise", label: "『大丈夫。君は最高の調査役だよ』", correct: false, value: "根拠なく調査役として褒めた", feedback: "今の自己評価と反対の断定を置いただけです。本人の体験と重なる物語を使ってください。" },
    ], freeAnswer: { label: "自分の短い物語を作る", placeholder: "状況が似ていて、別の見方が生まれる短い話を書く", helper: "教訓を最後に説明せず、相手に何が重なったか聞ける形にします。", storeAs: "ep8CustomMove", correctCriteria: "相手の状況と似た構造があり、失敗を否定せず、本人が自分の意味を見つけられる短い物語", incorrectCriteria: "正論を説明する、結論を押し付ける、根拠なく褒める、恥や恐怖で動かす" } },
    { kind: "dialogue", id: "ep8-adv-05", scene: "自分を責めるリンク", camera: "link", line: { id: "ep8-adv-05", who: "link", face: "aha", text: "最初の影を間違えたことより、灯りを増やして見直したことが調査なんだ。僕も、まだ続けられる。" }, nextLabel: "変化を考える" },
    { kind: "recall", id: "ep8-reflection", scene: "自分を責めるリンク", purpose: "reflection", title: "リンクは、なぜ説明されずに自分で答えを見つけた？", prompt: "リンク「向いてると言われたわけじゃないのに、続けられると思えた。物語の何が働いた？」", placeholder: "物語と自分の発見をつなぐ", helper: "誰が意味を決めたかを考えてください。", storeAs: "ep8Reflection", skipLabel: "まだ分からない", skipValue: "自分に重なる場面から、自分で意味を選んだから", replyFallback: "物語の意味を押し付けられず、自分に重なる答えを自分で見つけたからですね。" },
    { kind: "dialogue", id: "ep8-adv-06", scene: "自分を責めるリンク", camera: "teacher", line: { id: "ep8-adv-06", who: "teacher", text: "{{ep8ReflectionReply}} これが治療的メタファーです。説明を、本人が経験する気づきへ変えます。", dynamic: true }, nextLabel: "最後の確認へ" },
    { kind: "deduction", id: "ep8-deduction-2", scene: "倫理の確認", title: "物語を催眠に使う時、避けることは？", prompt: "本人の解釈を尊重する使い方と、答えを押し込む使い方を分けます。", questionBasis: { subject: "催眠で使う物語とメタファー", before: "相手が物語に自分の体験を重ねる時", asks: "本人の意味を奪う使い方", goal: "Therapeutic Metaphor を結論の押し付けや隠れた操作として誤用しない" }, options: [
      { id: "ask", label: "どこが自分に重なったか、本人に聞く", correct: false, feedback: "これは本人の意味を尊重する質問です。一つの正解を術者が決めません。" },
      { id: "force-meaning", label: "この物語の意味はこれだと、本人の答えを決める", correct: true, feedback: "それでは説明を遠回しに押し付けただけです。意味は本人と確かめます。" },
      { id: "short", label: "相手の体験に合う短い場面を選ぶ", correct: false, feedback: "これは物語を本人の体験へ合わせる準備です。決めつけないことが必要です。" },
    ] },
    { kind: "reveal", id: "ep8-reveal-2", scene: "資料室の奥へ", kicker: "THERAPEUTIC METAPHOR", title: "物語で、\n本人の気づきを呼び起こす。", body: "似た構造の物語を語る。\n何が重なったか本人に聞く。\n見つけた意味を、次の一歩へ使う。", nextLabel: "物語の続きへ" },
    { kind: "dialogue", id: "ep8-adv-07", scene: "資料室の奥へ", camera: "mio", line: { id: "ep8-adv-07", who: "mio", face: "think", text: "……そこまで読んだなら、来て。カードを持ち出した理由を、今度は私の言葉で話す。" }, nextLabel: "講義へ戻る" },
  ],
});

export const EP8_ADVENTURE_QUALITY = reviewAdventureScenario(EP8_ADVENTURE);
