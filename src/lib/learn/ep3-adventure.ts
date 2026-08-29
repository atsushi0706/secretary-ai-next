import { defineAdventureScenario, reviewAdventureScenario } from "./adventure";

export const EP3_ADVENTURE = defineAdventureScenario({
  id: "ep3-inner-dialogue",
  caseNo: "CASE 03",
  title: "目を閉じても頭の中のおしゃべりが止まらない時、催眠をどう使う？",
  objective: "考えを消さず、次の呼吸を確かめる合図へ変える",
  startLabel: "ミオと実習を始める",
  background: "/learn/adventure/erickson-study-v1.webp",
  teacherSprite: "/learn/adventure/erickson-cutout-v1.webp",
  linkSprite: "/learn/chars/link-neutral.webp",
  guestSprite: "/learn/chars/mio-neutral-v1.webp",
  guestName: "雨宮ミオ",
  evidence: [
    { id: "stop-failed", title: "止めようとした時", summary: "止めようとするほど別の考えが浮かんだ", detail: "ミオは静かにしようと努力したが、明日や失敗の言葉が次々に浮かんだ。", icon: "1", image: "/learn/ep3/manga-v1/01.webp", imageAlt: "考えを止めようとして疲れているミオの漫画" },
    { id: "thought-cue", title: "言葉を合図にした時", summary: "浮かんだ一語の後に、息を一つ確かめた", detail: "考えの内容を直さず、言葉が浮かんだ事実を一呼吸の合図にした。", icon: "2", image: "/learn/ep3/manga-v1/03.webp", imageAlt: "浮かんだ言葉を呼吸の合図へ変える漫画" },
    { id: "thought-remains", title: "考えが残った時", summary: "考えは消えなくても、追いかけずに間を作れた", detail: "成功は無心になることではなく、考えが来ても次の呼吸へ戻れたことだった。", icon: "3", image: "/learn/ep3/manga-v1/05.webp", imageAlt: "考えが残ったまま立ち上がるミオの漫画" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep3-adv-01", scene: "新しい実習生", camera: "link", line: { id: "ep3-adv-01", who: "link", face: "think", text: "先生、考えを止められないのに催眠なんてできるんですか？ ミオも、止めようとして余計につらそうでした。" }, nextLabel: "覚えている場面を話す" },
    { kind: "recall", id: "ep3-memory", scene: "リンクと記憶を確かめる", purpose: "memory", title: "ミオが考えを止めようとした時、何が起きた？", prompt: "リンク「正確じゃなくていい。漫画で覚えている変化を一言で教えて。」", placeholder: "止めようとした時に起きたことを書く", helper: "思い出せなければ、そのまま進めます。", storeAs: "ep3Memory", skipLabel: "まだ思い出せない", skipValue: "止めようとするほど考えが増えた", replyFallback: "止めようとするほど、別の言葉が浮かんでいたよね。順に見直そう。" },
    { kind: "dialogue", id: "ep3-adv-02", scene: "リンクと記憶を確かめる", camera: "link", line: { id: "ep3-adv-02", who: "link", face: "think", text: "{{ep3MemoryReply}} 三つの場面で、先生が何を変えなかったのか見よう。", dynamic: true }, nextLabel: "本を読み返す" },
    { kind: "guided-investigation", id: "ep3-guided", scene: "本を読み返す", title: "考えが合図に変わるまでを順番に見る", steps: [
      { id: "ep3-guide-1", linkPrompt: "最初は、ミオが何を成功条件にしていたかを見よう。", actionLabel: "1つ目の場面を見る", evidenceId: "stop-failed", linkComment: "考えが一つでも浮かぶと、ミオは失敗だと思っている。", reflectionPrompt: "ミオは、何ができれば成功だと思っていた？", placeholder: "成功だと思っていた状態を書く", helper: "最初のミオの言葉を手がかりにしてください。", storeAs: "ep3Observe1", skipLabel: "まだ分からない", skipValue: "考えを完全に止めること", replyFallback: "考えが消えることだけを成功にしていたんだね。", linkResponse: "{{ep3Observe1Reply}} 次は、先生が考えをどう扱ったか見よう。" },
      { id: "ep3-guide-2", linkPrompt: "先生は浮かんだ考えを消したのか、何かの合図にしたのかを見よう。", actionLabel: "2つ目の場面を見る", evidenceId: "thought-cue", linkComment: "言葉が浮かんだ直後に、息を一つ確かめている。", reflectionPrompt: "浮かんだ一つの言葉を、何の合図にした？", placeholder: "次に確かめたものを書く", helper: "身体で実際に起きたことを見てください。", storeAs: "ep3Observe2", skipLabel: "まだ分からない", skipValue: "息を一つ確かめる合図", replyFallback: "考えを消さず、一呼吸へ戻る合図にしたんだね。", linkResponse: "{{ep3Observe2Reply}} 最後は、考えが本当に消えたか確かめよう。" },
      { id: "ep3-guide-3", linkPrompt: "最後のミオは無心になったのか、それとも考えが残っていたのかを見よう。", actionLabel: "3つ目の場面を見る", evidenceId: "thought-remains", linkComment: "考えは残っている。それでも一呼吸ずつ確かめ、席を立てた。", reflectionPrompt: "考えが残ったのに、ミオは何ができるようになった？", placeholder: "消えなかったものと、できたことを書く", helper: "最後の二つの台詞を見てください。", storeAs: "ep3Observe3", skipLabel: "まだ分からない", skipValue: "追いかけずに呼吸へ戻れた", replyFallback: "考えをなくさず、次の呼吸へ戻れるようになったんだね。", linkResponse: "{{ep3Observe3Reply}} 三つをつないだ君の仮説を聞かせて。" },
    ], nextLabel: "仮説をリンクへ話す" },
    { kind: "recall", id: "ep3-hypothesis", scene: "リンクと仮説を作る", purpose: "hypothesis", title: "止まらない考えが、なぜ催眠の邪魔ではなくなった？", prompt: "リンク「考えは消えてないのに、何が変わったと思う？ 一言で聞かせて。」", placeholder: "三つの場面をつないだ仮説を書く", helper: "正解でなくて大丈夫です。考えの『次』に注目してください。", storeAs: "ep3Hypothesis", skipLabel: "まだ仮説がない", skipValue: "考えを呼吸の合図に変えたから", replyFallback: "考えが来るたび失敗する代わりに、戻る合図へ変えたのかもしれないね。" },
    { kind: "dialogue", id: "ep3-adv-03", scene: "リンクと仮説を作る", camera: "link", line: { id: "ep3-adv-03", who: "link", face: "aha", text: "{{ep3HypothesisReply}} 先生。漫画で起きたことを、僕たちにも選ばせてください。", dynamic: true }, nextLabel: "事件の答えを選ぶ" },
    { kind: "deduction", id: "ep3-deduction-1", scene: "第一推理", title: "先生は、止まらない考えをどう扱った？", prompt: "ミオの考えが浮かんだ直後に、何をしていたか選んでください。", questionBasis: { subject: "考えを止められないミオ", before: "考えが浮かぶたび失敗だと思っていた時", asks: "先生が考えへ加えた新しい役割", goal: "止まらない反応を催眠の次の合図へ変える" }, options: [
      { id: "erase", label: "考えが消えるまで、頭を空にする練習を続けた", correct: false, feedback: "考えは最後まで残っています。消えたかではなく、浮かんだ直後の行動を見てください。" },
      { id: "cue", label: "考えが浮かぶたび、息を一つ確かめる合図にした", correct: true, feedback: "そうです。止まらない考えを、一呼吸へ戻る合図として使いました。" },
      { id: "argue", label: "浮かんだ考えが間違いだと、一つずつ言い直した", correct: false, feedback: "考えの内容は直していません。何を考えたかより、その次に何をしたかを見てください。" },
    ] },
    { kind: "reveal", id: "ep3-reveal-1", scene: "第一推理成立", kicker: "THE THOUGHT BECOMES A CUE", title: "止まらない考えを、\n戻る合図へ変えた。", body: "考えは消していない。\n一つ浮かぶたび、息を一つ確かめた。\n催眠は、すでに起きているものから始まった。", evidenceIds: ["stop-failed", "thought-cue", "thought-remains"], nextLabel: "ミオで試す" },
    { kind: "dialogue", id: "ep3-adv-04", scene: "ミオへの一言", camera: "mio", line: { id: "ep3-adv-04", who: "mio", face: "think", text: "また『明日失敗したら』って浮かびました。止めようとすると、もっと続きます。淳なら、次に何と言いますか？" }, nextLabel: "一言を作る" },
    { kind: "dialogue", id: "ep3-adv-05", scene: "ミオへの一言", camera: "teacher", line: { id: "ep3-adv-05", who: "teacher", text: "考えを消す約束はしません。今起きた考えを、ミオが確かめられる次の感覚へつないでください。" }, nextLabel: "一言を選ぶ" },
    { kind: "apply", id: "ep3-apply", scene: "ミオへの一言", title: "『また失敗を考えた』と言うミオへ、次に何と言う？", prompt: "考えを止めさせず、浮かんだ事実から一呼吸へつなぎます。", questionBasis: { subject: "失敗の考えがまた浮かんだミオ", before: "止めようとすると考えが続くと言った時", asks: "考えを次の呼吸へ変える一言", goal: "考えが浮かんでも催眠を続けられる体験を作る" }, storeAs: "ep3Move", options: [
      { id: "stop", label: "『何も考えないで。頭を空にして』", correct: false, value: "考えを止めるよう命令した", feedback: "今できないことをもう一度求めています。浮かんだ考えを、そのまま次の感覚へつないでください。" },
      { id: "breath", label: "『浮かんだね。それを合図に、息を一つ吐いてみて』", correct: true, value: "浮かんだ考えを一呼吸の合図へ変えた", feedback: "考えを否定せず、今できる一呼吸へつなげています。" },
      { id: "positive", label: "『失敗しないと、強く言い聞かせて』", correct: false, value: "否定的な考えを肯定文で上書きした", feedback: "考えの正しさを争うと、また頭の中の勝負になります。内容ではなく次の感覚を使ってください。" },
    ], freeAnswer: { label: "自分の一言でも答える", placeholder: "ミオへかける短い一言を書く", helper: "考えを消さず、今できる感覚を一つ入れてください。", storeAs: "ep3CustomMove", correctCriteria: "考えを否定せず、考えが浮かんだことを呼吸など今できる感覚の合図にしている", incorrectCriteria: "考えるなと命令する、考えの内容を論破する、効果を断定する" } },
    { kind: "dialogue", id: "ep3-adv-06", scene: "ミオに起きた変化", camera: "mio", line: { id: "ep3-adv-06", who: "mio", face: "aha", text: "……また浮かびました。でも今、息を一つ吐けました。考えと戦わない分、少しだけ間があります。" }, nextLabel: "変化を考える" },
    { kind: "dialogue", id: "ep3-adv-07", scene: "ミオに起きた変化", camera: "link", line: { id: "ep3-adv-07", who: "link", face: "aha", text: "考えは残ってる。でも『また失敗した』じゃなくて、『次の息の合図が来た』に変わったんだ。" }, nextLabel: "理由をリンクへ話す" },
    { kind: "recall", id: "ep3-reflection", scene: "変化を言葉にする", purpose: "reflection", title: "ミオは、なぜ考えが残ったまま少し楽になれた？", prompt: "リンク「君の一言のどこが、ミオの注意を変えたと思う？」", placeholder: "一言と変化をつないで書く", helper: "考えを消したかではなく、考えの次を見てください。", storeAs: "ep3Reflection", skipLabel: "まだ分からない", skipValue: "考えを失敗ではなく呼吸の合図にしたから", replyFallback: "考えが来るたび失敗する流れを、呼吸へ戻る流れに変えたんですね。" },
    { kind: "dialogue", id: "ep3-adv-07b", scene: "変化を言葉にする", camera: "teacher", line: { id: "ep3-adv-07b", who: "teacher", text: "{{ep3ReflectionReply}} では最後に、消えたものではなく、実際に変わったものを選んでください。", dynamic: true }, nextLabel: "最終推理へ" },
    { kind: "deduction", id: "ep3-deduction-2", scene: "最終推理", title: "ミオに起きた変化を、最も正確に言うと？", prompt: "考えが消えたか、考えとの関わり方が変わったかを区別してください。", questionBasis: { subject: "一呼吸を確かめたミオ", before: "考えが浮かぶたび失敗だと思っていた時", asks: "実際に変わったもの", goal: "催眠の成功を無心と誤解せず説明する" }, options: [
      { id: "blank", label: "頭の中から、考えが完全になくなった", correct: false, feedback: "ミオは考えが残っていると言っています。消失ではなく、次にできたことを見てください。" },
      { id: "relationship", label: "考えを失敗とせず、呼吸へ戻る合図として使えた", correct: true, feedback: "その通りです。考えの有無ではなく、その次の行動が変わりました。" },
      { id: "obedience", label: "先生の命令へ従う力が強くなった", correct: false, feedback: "命令への従順さを測ってはいません。ミオ自身が確かめられた呼吸を見てください。" },
    ] },
    { kind: "reveal", id: "ep3-reveal-2", scene: "事件解決", kicker: "INNER DIALOGUE UTILIZATION", title: "止まらない声を、\n次の暗示へつなぐ。", body: "止めようとするのを、いったんやめる。\n浮かんだ一つを、今できる感覚の合図にする。\nそれが内的対話のユーティライゼーションです。", nextLabel: "講義で整理する" },
    { kind: "dialogue", id: "ep3-adv-08", scene: "新しい仲間", camera: "mio", line: { id: "ep3-adv-08", who: "mio", face: "smile", text: "淳、ありがとう。次の実習、私も手伝わせて。今度は私が、二人の観察役になる。" }, nextLabel: "三人で教室へ戻る" },
  ],
});

export const EP3_ADVENTURE_QUALITY = reviewAdventureScenario(EP3_ADVENTURE);
