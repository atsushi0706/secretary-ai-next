import { defineAdventureScenario, reviewAdventureScenario } from "./adventure";

export const EP4_ADVENTURE = defineAdventureScenario({
  id: "ep4-pacing-leading",
  caseNo: "CASE 04",
  title: "緊張している相手へ、催眠の言葉をどの順番でかける？",
  objective: "二つの確認できる事実から、次の一動作へ導く",
  startLabel: "三人で実習へ入る",
  background: "/learn/adventure/erickson-study-v1.webp",
  teacherSprite: "/learn/adventure/erickson-cutout-v1.webp",
  linkSprite: "/learn/chars/link-neutral.webp",
  guestSprite: "/learn/chars/mio-neutral-v1.webp",
  guestName: "雨宮ミオ",
  evidence: [
    { id: "abstract-help", title: "公開実習で止まった時", summary: "リンクは前に立ったまま声が出なかった", detail: "失敗への恐れはリンクの心の声。外から見える事実は、前に立ち、まだ話せていないこと。", icon: "1", sceneId: "ep4-canon-1" },
    { id: "two-facts", title: "二つの事実を聞いた時", summary: "足が床にあることと、声が聞こえることを確かめた", detail: "ミオは心を当てず、リンクが今うなずける事実を二つ確かめた。", icon: "2", sceneId: "ep4-canon-2" },
    { id: "one-next", title: "名前だけを提案された時", summary: "リンクは名前と最初の問いを話した", detail: "ミオは完璧な実習を求めず、名前だけを選べる形で提案した。リンクはその後、最初の問いも自分で話した。", icon: "3", sceneId: "ep4-canon-3" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep4-adv-01", scene: "公開実習", camera: "link", line: { id: "ep4-adv-01", who: "link", face: "shy", text: "人前に出た瞬間、頭が真っ白になりました。『落ち着いて』も『大丈夫』も、何をすればいいか分からなかった。" }, nextLabel: "場面を思い出す" },
    { kind: "recall", id: "ep4-memory", scene: "場面を思い出す", purpose: "memory", title: "『落ち着いて』で固まったリンクが、ミオの言葉で確かめられたものは？", prompt: "リンク「漫画で覚えている、最初に確かめられたものを教えて。」", placeholder: "リンクが確かめられた事実を書く", helper: "一つだけで大丈夫です。", storeAs: "ep4Memory", skipLabel: "まだ思い出せない", skipValue: "足が床についていること", replyFallback: "最初に分かったのは、気持ちではなく身体の事実だったね。" },
    { kind: "dialogue", id: "ep4-adv-02", scene: "場面を思い出す", camera: "mio", line: { id: "ep4-adv-02", who: "mio", face: "think", text: "{{ep4MemoryReply}} 私が偶然うまく言えただけか、順番に理由があるのか、三つの場面で確かめよう。", dynamic: true }, nextLabel: "実習記録を開く" },
    { kind: "guided-investigation", id: "ep4-guided", scene: "実習記録を読む", title: "言葉が届いた順番を、三段階で確かめる", steps: [
      { id: "ep4-guide-1", linkPrompt: "最初の励ましは、僕がその場で確かめられる内容だったか見よう。", actionLabel: "1つ目の記録を見る", evidenceId: "abstract-help", linkComment: "『落ち着いて』も『いつも通り』も、今の僕には確かめられなかった。", reflectionPrompt: "最初の励ましが、リンクに届かなかったのはなぜ？", placeholder: "言葉とリンクの状態を比べる", helper: "リンクが『分からない』と言ったものを見てください。", storeAs: "ep4Observe1", skipLabel: "まだ分からない", skipValue: "今の自分に確かめられない言葉だったから", replyFallback: "今のリンクが確かめられない結論を、先に求めていたんだね。", linkResponse: "{{ep4Observe1Reply}} 次は、ミオが最初に言った二つを見よう。" },
      { id: "ep4-guide-2", linkPrompt: "ミオは気持ちを当てたのか、見える事実を言ったのかを確かめよう。", actionLabel: "2つ目の記録を見る", evidenceId: "two-facts", linkComment: "足が床にある。息を吐ける。どちらも、その場で僕が確かめられた。", reflectionPrompt: "『足は床にある』『息は吐ける』に共通することは？", placeholder: "足と呼吸に共通する性質を書く", helper: "正しい助言かではなく、確認できるかを見てください。", storeAs: "ep4Observe2", skipLabel: "まだ分からない", skipValue: "今その場で確かめられる事実", replyFallback: "どちらも、リンクが今うなずける事実だったね。", linkResponse: "{{ep4Observe2Reply}} 最後に、事実の後で何を頼んだか見よう。" },
      { id: "ep4-guide-3", linkPrompt: "ミオは実習全部を求めたのか、一つだけ頼んだのかを見よう。", actionLabel: "3つ目の記録を見る", evidenceId: "one-next", linkComment: "求められたのは『こんばんは』という次の一言だけだった。", reflectionPrompt: "二つの事実の後、リンクへ頼んだのは何？", placeholder: "次に試した一動作を書く", helper: "実習全体ではなく、最初の言葉を見てください。", storeAs: "ep4Observe3", skipLabel: "まだ分からない", skipValue: "次の一言だけ言ってみること", replyFallback: "全部ではなく、次の一言だけへ進んだんだね。", linkResponse: "{{ep4Observe3Reply}} この順番の意味を、君の仮説で聞かせて。" },
    ], nextLabel: "仮説をミオへ話す" },
    { kind: "recall", id: "ep4-hypothesis", scene: "三人で仮説を作る", purpose: "hypothesis", title: "人前で固まったリンクが、『足・呼吸・次の一言』の順番なら話せたのはなぜ？", prompt: "ミオ「淳の考えを聞きたい。どうして、いきなり『話して』ではなかったんだと思う？」", placeholder: "三つの場面をつないだ仮説を書く", helper: "確認できることが何個続いたかも手がかりです。", storeAs: "ep4Hypothesis", skipLabel: "まだ仮説がない", skipValue: "分かる事実の続きとして一言を試せたから", replyFallback: "分かることが続いた先なら、次の一言も試せる候補になったのかもしれないね。" },
    { kind: "dialogue", id: "ep4-adv-03", scene: "三人で仮説を作る", camera: "link", line: { id: "ep4-adv-03", who: "link", face: "aha", text: "{{ep4HypothesisReply}} 先生。この順番の肝を、僕たちに選ばせてください。", dynamic: true }, nextLabel: "順番を推理する" },
    { kind: "deduction", id: "ep4-deduction-1", scene: "第一推理", title: "ミオの言葉は、なぜリンクに届いた？", prompt: "二つの事実と、一つの提案の順番を見てください。", questionBasis: { subject: "人前で固まったリンク", before: "『落ち着いて』が分からなかった時", asks: "ミオの言葉なら次へ進めた理由", goal: "ペーシングからリーディングへ移る順番を特定する" }, options: [
      { id: "praise", label: "ミオが優しい声で褒めたから", correct: false, feedback: "優しさだけでは順番を説明できません。リンクが実際に確かめた二つを見てください。" },
      { id: "facts-next", label: "二つの分かる事実の後に、次の一言だけを提案したから", correct: true, feedback: "そうです。現在の体験に言葉を合わせ、その続きに小さな提案を置きました。" },
      { id: "pressure", label: "みんなが見ているので、断れない空気を作ったから", correct: false, feedback: "断れない圧力は催眠の技術として扱いません。リンクがうなずけた事実を見てください。" },
    ] },
    { kind: "reveal", id: "ep4-reveal-1", scene: "第一推理成立", kicker: "PACE TWICE, LEAD ONCE", title: "二つ合わせて、\n一つだけ導く。", body: "足は床にある。息は吐ける。\nその二つを確かめた後で、次の一言だけを提案した。", evidenceIds: ["abstract-help", "two-facts", "one-next"], nextLabel: "淳の一言で試す" },
    { kind: "dialogue", id: "ep4-adv-03b", scene: "二回目の実習", camera: "link", line: { id: "ep4-adv-03b", who: "link", face: "think", text: "理屈を知るだけじゃなく、淳の言葉で本当に次へ進めるか見たいです。ミオ、相手役をお願いしてもいい？" }, nextLabel: "ミオへ頼む" },
    { kind: "dialogue", id: "ep4-adv-04", scene: "二回目の実習", camera: "mio", line: { id: "ep4-adv-04", who: "mio", face: "smile", text: "今度は私が相手役になります。初対面の人の前で、手が震えて言葉が出ない。淳、最初から順番を作って。" }, nextLabel: "言葉を組み立てる" },
    { kind: "dialogue", id: "ep4-adv-05", scene: "二回目の実習", camera: "teacher", line: { id: "ep4-adv-05", who: "teacher", text: "心を決めつけず、ミオが今確かめられる事実を二つ。その後に、次の一動作を一つです。" }, nextLabel: "一手を選ぶ" },
    { kind: "apply", id: "ep4-apply", scene: "二回目の実習", title: "手が震えて話せないミオへ、最初にどう言う？", prompt: "二つの確認できる事実と、一つの小さな提案を順番にします。", questionBasis: { subject: "初対面の人を前に手が震えるミオ", before: "言葉が出ないと話した時", asks: "現在の体験に合わせた最初の催眠誘導", goal: "確認できる事実から本人が選べる次の一動作へ進む" }, storeAs: "ep4Move", options: [
      { id: "calm", label: "『大丈夫。もう落ち着いて話せます』", correct: false, value: "落ち着けると先に断定した", feedback: "ミオはまだ落ち着いたとは確かめられません。今すでに分かる事実から始めてください。" },
      { id: "pace-lead", label: "『足は床にある。息は吐ける。そのまま名前だけ言ってみる？』", correct: true, value: "二つの事実の後に名前だけ言う提案をした", feedback: "二つの確認できる事実から、次の一動作へ自然につながっています。" },
      { id: "ignore", label: "『震えは気にしないで、最後まで話して』", correct: false, value: "震えを無視して全部話すよう求めた", feedback: "今ある震えを否定し、完成まで一度に求めています。事実を二つ確かめてください。" },
    ], freeAnswer: { label: "自分の言葉で組み立てる", placeholder: "事実を二つ、提案を一つ書く", helper: "例：○○は分かる。△△もできる。そのまま□□してみる？", storeAs: "ep4CustomMove", correctCriteria: "本人が今確認できる事実を二つ含み、その延長に小さく選べる提案が一つある", incorrectCriteria: "心情を断定する、落ち着けと命令する、一度に完成を求める" } },
    { kind: "dialogue", id: "ep4-adv-06", scene: "ミオに起きた変化", camera: "mio", line: { id: "ep4-adv-06", who: "mio", face: "aha", text: "足は分かる。息も吐ける。……雨宮ミオです。震えはあるけど、名前まで言えました。" }, nextLabel: "変化を確かめる" },
    { kind: "dialogue", id: "ep4-adv-07", scene: "ミオに起きた変化", camera: "link", line: { id: "ep4-adv-07", who: "link", face: "smile", text: "さっきの僕と同じだ。『落ち着け』じゃなくて、分かることの続きを一つだけ選べた。" }, nextLabel: "理由を話す" },
    { kind: "recall", id: "ep4-reflection", scene: "変化を言葉にする", purpose: "reflection", title: "ミオは、なぜ震えが残ったまま名前を言えた？", prompt: "リンク「淳の言葉の順番が、何を変えたと思う？」", placeholder: "言葉の順番と変化をつなぐ", helper: "最初の二つと、最後の一つを分けて考えてください。", storeAs: "ep4Reflection", skipLabel: "まだ分からない", skipValue: "分かる事実の続きとして一動作を選べたから", replyFallback: "分かる事実に注意が乗った後だから、次の一つを試せたんですね。" },
    { kind: "dialogue", id: "ep4-adv-07b", scene: "変化を言葉にする", camera: "teacher", line: { id: "ep4-adv-07b", who: "teacher", text: "{{ep4ReflectionReply}} 最後に、この順番が相手へ強制していないものを選びましょう。", dynamic: true }, nextLabel: "最終推理へ" },
    { kind: "deduction", id: "ep4-deduction-2", scene: "最終推理", title: "リンクとミオへの催眠誘導で、二人に強制していないことはどれ？", prompt: "本人の体験に合わせることと、相手を操ることを分けてください。", questionBasis: { subject: "リンクとミオへの催眠誘導", before: "緊張して言葉が出なかった時", asks: "この方法が相手へ強制していないもの", goal: "ペーシングと操作を混同せず説明する" }, options: [
      { id: "facts", label: "本人が今確かめられる事実を言葉にする", correct: false, feedback: "これは実際に行いました。足や呼吸という確認できる事実を言葉にしています。" },
      { id: "choice", label: "次の一動作を、本人が試せる形で提案する", correct: false, feedback: "これも行いました。名前を言うかどうかは本人が選べる提案でした。" },
      { id: "control", label: "本人の意思を奪い、必ず命令通りに動かす", correct: true, feedback: "その通りです。体験に合わせることと、本人の意思を奪うことは別です。" },
    ] },
    { kind: "reveal", id: "ep4-reveal-2", scene: "実習成功", kicker: "PACING AND LEADING", title: "今の体験へ合わせ、\n次の一歩へ導く。", body: "確かめられる事実を二つ。\nその後に、選べる小さな提案を一つ。\nこれがペーシング＆リーディングです。", nextLabel: "講義へ戻る" },
    { kind: "dialogue", id: "ep4-adv-08", scene: "三人の約束", camera: "mio", line: { id: "ep4-adv-08", who: "mio", face: "smile", text: "淳もリンクも、今日はすごくよかった。原理カードを戻すところまで、私も一緒に手伝うよ。" }, nextLabel: "三人で片づける" },
  ],
});

export const EP4_ADVENTURE_QUALITY = reviewAdventureScenario(EP4_ADVENTURE);
