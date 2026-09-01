import { defineAdventureScenario, reviewAdventureScenario, type AdventureScenario } from "./adventure";

const BASE = {
  background: "/learn/adventure/erickson-study-v1.webp",
  teacherSprite: "/learn/adventure/erickson-cutout-v1.webp",
  linkSprite: "/learn/chars/link-neutral.webp",
  guestSprite: "/learn/chars/mio-neutral-v1.webp",
  guestName: "雨宮ミオ",
};

export const EP3_ADVENTURE_V2 = defineAdventureScenario({
  ...BASE, id: "ep3-canonical-dialogue", caseNo: "CASE 03", title: "否定の声が残っていても、下書きは作れる？", objective: "文化的催眠の声を、自分で選ぶ次の動作の合図へ変える", startLabel: "ミオと考える",
  evidence: [
    { id: "ep3-e1", title: "申込画面で止まったミオ", summary: "やりたい気持ちと否定の声を、本人が話した", detail: "申込画面を開いている。やってみたいとも、仕事にならないと浮かぶとも、ミオ自身が話している。", icon: "1", sceneId: "ep3-canon-1" },
    { id: "ep3-e2", title: "一呼吸と下書き保存", summary: "声を消さず、今できる動作へつないだ", detail: "エリクソンは送信を求めず、息を一つ吐いて下書き保存まで進む可能性を示した。", icon: "2", sceneId: "ep3-canon-3" },
    { id: "ep3-e3", title: "声が残った後", summary: "企画名を書き、下書きを保存した", detail: "否定の声は消えていない。変わったのは、声が浮かんだ後に選べた動作。", icon: "3", sceneId: "ep3-canon-4" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep3-v2-01", scene: "ミオの申込画面", camera: "mio", line: { id: "ep3-v2-01", who: "mio", text: "声を消せたわけじゃないのに、下書きまでは進めました。淳は、どこが変わったと思う？" }, nextLabel: "自分の見方を話す" },
    { kind: "recall", id: "ep3-v2-memory", scene: "リンクと考える", purpose: "memory", title: "ミオが下書きを作るまでに、覚えていることは？", prompt: "リンク「正解じゃなくていい。声が浮かんだ後に起きたことを、一言で聞かせて。」", placeholder: "覚えている変化を書く", helper: "短くても大丈夫です。", storeAs: "ep3CanonMemory", skipLabel: "もう一度見る", skipValue: "息を一つ吐いて下書きを保存した", replyFallback: "声の内容より、その後に選べた動作を見ればよさそうだね。" },
    { kind: "dialogue", id: "ep3-v2-02", scene: "リンクと考える", camera: "link", line: { id: "ep3-v2-02", who: "link", dynamic: true, text: "{{ep3CanonMemoryReply}} 三つの場面を並べて、声がどう使われたか確かめよう。" }, nextLabel: "場面を調べる" },
    { kind: "investigate", id: "ep3-v2-investigate", scene: "漫画を読み返す", title: "ミオが止まった時・提案を聞いた時・下書き後を見る", prompt: "三つすべてを開いてから、自分の仮説をリンクへ話してください。", spots: [
      { id: "ep3-v2-s1", label: "止まった時", x: 20, y: 38, evidenceId: "ep3-e1", linkComment: "やりたい気持ちまで消えたわけじゃない。" },
      { id: "ep3-v2-s2", label: "提案", x: 50, y: 28, evidenceId: "ep3-e2", linkComment: "送信じゃなく、今できる下書きまでにした。" },
      { id: "ep3-v2-s3", label: "結果", x: 78, y: 47, evidenceId: "ep3-e3", linkComment: "声は残ってる。それでも一つ進めた。" },
    ] },
    { kind: "recall", id: "ep3-v2-hypothesis", scene: "リンクと仮説を作る", purpose: "hypothesis", title: "否定の声は、何の合図に変わった？", prompt: "リンク「三つをつないだ君の仮説を、一文で聞かせて。」", placeholder: "声の次に選べたことを書く", helper: "声を消した、以外の説明を考えてください。", storeAs: "ep3CanonHypothesis", skipLabel: "まだ分からない", skipValue: "一呼吸して今できる動作を選ぶ合図", replyFallback: "否定の声が来るたび、失敗ではなく選び直す時だと扱えそうだね。" },
    { kind: "dialogue", id: "ep3-v2-03", scene: "リンクと仮説を作る", camera: "link", line: { id: "ep3-v2-03", who: "link", dynamic: true, text: "{{ep3CanonHypothesisReply}} 先生、今度はミオへの一言を自分たちで作りたいです。" }, nextLabel: "一言を選ぶ" },
    { kind: "deduction", id: "ep3-v2-deduction", scene: "事件の核", title: "申込画面で止まったミオが、次の動作に利用したものは？", prompt: "実際に消えたものではなく、次の動作へ使ったものを選んでください。", questionBasis: { subject: "申込画面で止まったミオ", before: "否定の声が浮かんだ時", asks: "次の動作の合図として利用した反応", goal: "内的対話を消すことと利用することを区別する" }, options: [
      { id: "ep3-d-a", label: "否定の声が完全に消えた静けさ", correct: false, feedback: "声は残ったと、ミオ本人が話しています。" },
      { id: "ep3-d-b", label: "否定の声が浮かんだという事実", correct: true, feedback: "その事実を、一呼吸と下書き保存を選ぶ合図にしました。" },
      { id: "ep3-d-c", label: "申込を必ず送るという強い決意", correct: false, feedback: "送信は求めていません。今できる下書きまでです。" },
    ] },
    { kind: "apply", id: "ep3-v2-apply", scene: "ミオへの一言", title: "また『仕事にならない』と浮かんだミオへ、何と言う？", prompt: "声を否定せず、今できる一つへつなぎます。", questionBasis: { subject: "否定の声がまた浮かんだミオ", before: "下書きの続きを開いた時", asks: "本人が選べる次の動作へつなぐ一言", goal: "文化的催眠の声が残っても小さな行動を選べるようにする" }, storeAs: "ep3Move", options: [
      { id: "ep3-a-a", label: "『そんな声は無視して、今すぐ送ろう』", correct: false, value: "声を無視して送信を急がせた", feedback: "本人がまだ選んでいない結果を急がせています。" },
      { id: "ep3-a-b", label: "『また浮かんだね。息を一つ吐いて、今日は一行だけ書いてもいい』", correct: true, value: "浮かんだ声を一呼吸と一行を書く合図へつないだ", feedback: "声を消さず、本人が選べる小さな動作へつないでいます。" },
      { id: "ep3-a-c", label: "『必ず成功すると十回言って』", correct: false, value: "肯定文で上書きした", feedback: "言葉の勝負へ戻っています。今できる感覚と動作を使います。" },
    ], freeAnswer: { label: "自分の一言で答える", placeholder: "ミオへかける一文", helper: "否定せず、今できる感覚か動作を一つ入れてください。", storeAs: "ep3CustomMove", correctCriteria: "否定の声を消そうとせず、呼吸や一行を書くなど本人が今選べる動作へつないでいる", incorrectCriteria: "声を否定する、成功を断定する、送信を強制する" } },
    { kind: "dialogue", id: "ep3-v2-04", scene: "ミオの反応", camera: "mio", line: { id: "ep3-v2-04", who: "mio", text: "声はまだあります。けど、一行なら自分で選べそうです。" }, nextLabel: "講義へ" },
    { kind: "reveal", id: "ep3-v2-reveal", scene: "事件の整理", kicker: "UTILIZATION", title: "消す前に、使える形へ。", body: "文化的催眠の声を真実とも敵とも決めない。\n浮かんだ事実を、今できる一動作の合図にする。", nextLabel: "教室へ戻る" },
  ],
});

export const EP4_ADVENTURE_V2 = defineAdventureScenario({
  ...BASE, id: "ep4-canonical-practice", caseNo: "CASE 04", title: "声が出ないリンクへ、何から言う？", objective: "観察できる事実から、本人が望む最初の問いへつなぐ", startLabel: "公開実習を振り返る",
  evidence: [
    { id: "ep4-e1", title: "声が出ない開始時", summary: "リンクは前に立ったまま話せなかった", detail: "失敗への恐れは心の声。外から確認できるのは、前に立ち、まだ話していないこと。", icon: "1", sceneId: "ep4-canon-1" },
    { id: "ep4-e2", title: "足と聞こえる声", summary: "ミオは今確認できる二つを言った", detail: "心を当てず、足が床に触れることと、自分の声が聞こえることを確かめた。", icon: "2", sceneId: "ep4-canon-2" },
    { id: "ep4-e3", title: "名前だけの提案", summary: "リンクは名前と最初の問いを話した", detail: "実習を完璧に終えるのではなく、名前だけを選べる形で提案した。", icon: "3", sceneId: "ep4-canon-3" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep4-v2-01", scene: "実習後", camera: "link", line: { id: "ep4-v2-01", who: "link", text: "『落ち着いて』じゃ動けなかったのに、足と声を聞かれたら返事ができた。何が違ったんだろう。" }, nextLabel: "変化を調べる" },
    { kind: "investigate", id: "ep4-v2-investigate", scene: "公開実習を読み返す", title: "リンクが話すまでの三場面", prompt: "見える事実と、ミオが次に置いた提案を分けて見てください。", spots: [
      { id: "ep4-v2-s1", label: "開始", x: 18, y: 42, evidenceId: "ep4-e1", linkComment: "僕の心を決めつける言葉は、まだない。" },
      { id: "ep4-v2-s2", label: "二つの事実", x: 50, y: 32, evidenceId: "ep4-e2", linkComment: "どちらも、その場でうなずけた。" },
      { id: "ep4-v2-s3", label: "一つの提案", x: 80, y: 47, evidenceId: "ep4-e3", linkComment: "名前だけなら、僕が選べた。" },
    ] },
    { kind: "recall", id: "ep4-v2-hypothesis", scene: "リンクと考える", purpose: "hypothesis", title: "『落ち着いて』と、足や聞こえる声から始めた言葉は何が違った？", prompt: "リンク「二つの事実と一つの提案が、僕にどう届いたと思う？」", placeholder: "違いを一文で書く", helper: "抽象的な状態と、今確かめられる事実を比べてください。", storeAs: "ep4CanonHypothesis", skipLabel: "まだ分からない", skipValue: "今うなずける事実の続きに小さな提案があった", replyFallback: "できていない落ち着きを求めず、できている事実から始めた違いがありそうだね。" },
    { kind: "dialogue", id: "ep4-v2-02", scene: "リンクと考える", camera: "link", line: { id: "ep4-v2-02", who: "link", dynamic: true, text: "{{ep4CanonHypothesisReply}} 今度は、僕が相手に言う順番を選びたい。" }, nextLabel: "順番を選ぶ" },
    { kind: "deduction", id: "ep4-v2-deduction", scene: "言葉の順番", title: "ミオが置いた言葉の順番は？", prompt: "実際の漫画にある順番を選びます。", questionBasis: { subject: "公開実習で声が出ないリンク", before: "ミオが声をかけた時", asks: "確認できる事実と次の提案の順番", goal: "ペーシングからリーディングへつなぐ順番を理解する" }, options: [
      { id: "ep4-d-a", label: "名前を言わせてから、足と声を確かめた", correct: false, feedback: "名前の提案より、足と声の確認が先です。" },
      { id: "ep4-d-b", label: "足と声を確かめてから、名前だけを提案した", correct: true, feedback: "今うなずける事実の続きに、小さな提案を置きました。" },
      { id: "ep4-d-c", label: "緊張の原因を説明してから、完璧に話すよう励ました", correct: false, feedback: "原因の説明も、完璧な実習も求めていません。" },
    ] },
    { kind: "apply", id: "ep4-v2-apply", scene: "次の実習", title: "緊張して黙った相手へ、最初に何と言う？", prompt: "観察できる事実から始め、選べる一動作へつなぎます。", questionBasis: { subject: "人前で緊張して黙った実習相手", before: "椅子に座り、こちらを見ている時", asks: "心を決めつけず次の一言へつなぐ言葉", goal: "現在の体験へ合わせながら本人が最初の発言を選べるようにする" }, storeAs: "ep4Move", options: [
      { id: "ep4-a-a", label: "『緊張していますね。落ち着いてください』", correct: false, value: "心を決めつけて落ち着くよう求めた", feedback: "心を当て、まだできていない状態を求めています。" },
      { id: "ep4-a-b", label: "『椅子に座っている。私の声が聞こえる。できそうなら名前だけでもいい』", correct: true, value: "二つの事実から名前だけの提案へつないだ", feedback: "確認できる事実の続きに、断れる小さな提案があります。" },
      { id: "ep4-a-c", label: "『大丈夫。いつも通り全部話せます』", correct: false, value: "結果を断定して励ました", feedback: "本人が今確かめられない結果を先に置いています。" },
    ], freeAnswer: { label: "自分の一言で答える", placeholder: "最初にかける一文", helper: "観察できる事実と、選べる小さな動作を入れてください。", storeAs: "ep4CustomMove", correctCriteria: "本人が確認できる現在の事実から始まり、断れる小さな一動作へつないでいる", incorrectCriteria: "心情を断定する、落ち着けと命令する、成功を保証する" } },
    { kind: "dialogue", id: "ep4-v2-03", scene: "実習相手の反応", camera: "mio", line: { id: "ep4-v2-03", who: "mio", text: "……声は聞こえます。名前だけなら、言えそうです。" }, nextLabel: "理由を考える" },
    { kind: "recall", id: "ep4-v2-reflection", scene: "変化を確かめる", purpose: "reflection", title: "実習相手は、なぜ『名前だけなら』と言えた？", prompt: "リンク「今の一言のどこが、相手に選べる余地を作った？」", placeholder: "一言と反応をつなぐ", helper: "相手が実際にうなずけた部分を見てください。", storeAs: "ep4CanonReflection", skipLabel: "まだ分からない", skipValue: "確認できる事実の続きに小さく断れる提案があった", replyFallback: "今ある事実から始まり、名前だけを選べたことが大きそうだね。" },
    { kind: "dialogue", id: "ep4-v2-04", scene: "変化を確かめる", camera: "teacher", line: { id: "ep4-v2-04", who: "teacher", dynamic: true, text: "{{ep4CanonReflectionReply}} 相手の返事が違えば止まり、また確かめられる事実へ戻ります。" }, nextLabel: "原理を見る" },
    { kind: "reveal", id: "ep4-v2-reveal", scene: "事件の整理", kicker: "PACING AND LEADING", title: "二つ合わせて、一つ導く。", body: "心を当てない。\n本人が今うなずける事実から、選べる一動作へつなぐ。", nextLabel: "教室へ戻る" },
  ],
});

// 第5話以降は、同じ「証拠三つ→予定された成功」を繰り返さない。
// 事件ごとに、調査・対話・選択の順番を変える。
export const EP5_ADVENTURE_V2 = defineAdventureScenario({
  ...BASE, id: "ep5-canonical-betrayal", caseNo: "CASE 05", title: "カードを持ち出したミオを、もう裏切り者と決めてよい？", objective: "衝撃の中で、事実と未確定な意味を分けて次の確認を選ぶ", startLabel: "空の保管庫を調べる",
  evidence: [
    { id: "ep5-e1", title: "空の保管庫と金属の鍵", summary: "カードとミオがいない。鍵は机にある", detail: "この場面だけでは持ち出した人物も目的も分からない。", icon: "1", sceneId: "ep5-canon-1" },
    { id: "ep5-e2", title: "外部送信の予約", summary: "『従わせる会話テンプレート』として送る記録", detail: "予約の存在は事実。予約した人物とミオの関与は未確定。", icon: "2", sceneId: "ep5-canon-4" },
    { id: "ep5-e3", title: "保管庫の映像", summary: "ミオがカードを鞄へ入れた", detail: "持ち出した人物は確定した。『誰にも渡さない』の相手と目的は未確定。", icon: "3", sceneId: "ep5-canon-5" },
  ],
  nodes: [
    { kind: "investigate", id: "ep5-v2-investigate", scene: "空の保管庫", title: "分かることだけを集める", prompt: "三つの記録を開き、確定したことと未確定なことを分けてください。", spots: [
      { id: "ep5-v2-s1", label: "保管庫", x: 22, y: 40, evidenceId: "ep5-e1", linkComment: "ここだけなら、誰が持ち出したかは分からない。" },
      { id: "ep5-v2-s2", label: "送信予約", x: 54, y: 27, evidenceId: "ep5-e2", linkComment: "カードを従わせる台本にする計画はあった。" },
      { id: "ep5-v2-s3", label: "映像", x: 80, y: 48, evidenceId: "ep5-e3", linkComment: "持ち出したのはミオ。でも目的はまだ一つに決められない。" },
    ] },
    { kind: "dialogue", id: "ep5-v2-01", scene: "映像の後", camera: "link", line: { id: "ep5-v2-01", who: "link", text: "持ち出したのはミオだ。でも『最初から全部嘘だった』までは、まだ映ってない。" }, nextLabel: "今の考えを話す" },
    { kind: "recall", id: "ep5-v2-hypothesis", scene: "結論を保留する", purpose: "hypothesis", title: "今、確定していることと未確定なことは？", prompt: "リンク「ミオをかばわなくていい。責める前に、二つを分けて聞かせて。」", placeholder: "確定／未確定を一文で書く", helper: "持ち出した行動と目的を分けてください。", storeAs: "ep5CanonHypothesis", skipLabel: "一緒に分ける", skipValue: "持ち出したのは確定、目的は未確定", replyFallback: "行動は確定した。でも理由と、誰から守ろうとしたかはまだ分からない。" },
    { kind: "dialogue", id: "ep5-v2-02", scene: "結論を保留する", camera: "link", line: { id: "ep5-v2-02", who: "link", dynamic: true, text: "{{ep5CanonHypothesisReply}} じゃあ僕は、関係を切る前に送信予約の作成者を調べたい。" }, nextLabel: "判断を選ぶ" },
    { kind: "deduction", id: "ep5-v2-deduction", scene: "混乱の中の判断", title: "ミオがカードを鞄へ入れた映像だけで、言ってよい結論は？", prompt: "映像にある事実と、まだ証拠のない意味を区別します。", questionBasis: { subject: "カードを鞄へ入れたミオ", before: "監視映像を見た直後", asks: "現在の証拠だけで確定できる結論", goal: "裏切りの衝撃があっても事実と解釈を分けて確認へ進む" }, options: [
      { id: "ep5-d-a", label: "ミオは最初から二人を利用していた", correct: false, feedback: "過去の目的までは映像から確定できません。" },
      { id: "ep5-d-b", label: "ミオがカードを持ち出した。目的はまだ分からない", correct: true, feedback: "行動と未確定な目的を分けています。" },
      { id: "ep5-d-c", label: "学校がミオへ持ち出しを命令した", correct: false, feedback: "外部送信の予約はありますが、命令した人物はまだ不明です。" },
    ] },
    { kind: "reveal", id: "ep5-v2-reveal-1", scene: "裏切りの確定範囲", kicker: "FACT / UNKNOWN / NEXT", title: "持ち出した。理由は、まだ分からない。", body: "ミオを無罪にしない。\n同時に、映っていない目的まで有罪にしない。", nextLabel: "次の行動を選ぶ" },
    { kind: "apply", id: "ep5-v2-apply", scene: "リンクの次の一手", title: "混乱したリンクへ、次に何を勧める？", prompt: "感情を止めず、確認できる一手を本人へ返します。", questionBasis: { subject: "信頼を裏切られたと思うリンク", before: "ミオの持ち出し映像を見た後", asks: "関係を決める前に選べる確認行動", goal: "ショックを否定せず自分で事実確認へ進めるようにする" }, storeAs: "ep5Move", options: [
      { id: "ep5-a-a", label: "『すぐ縁を切る連絡を送ろう』", correct: false, value: "未確定な目的を決めて関係を切った", feedback: "確認前に関係の結論を確定しています。" },
      { id: "ep5-a-b", label: "『ショックはそのままでいい。まず送信予約を作った人を調べる？』", correct: true, value: "感情を否定せず確認できる記録へ注意を戻した", feedback: "感情を消さず、本人が選べる確認へ戻しています。" },
      { id: "ep5-a-c", label: "『ミオは善人だから信じよう』", correct: false, value: "逆向きの決めつけで安心させた", feedback: "裏切りの決めつけを、善人の決めつけに替えただけです。" },
    ], freeAnswer: { label: "自分の一言で答える", placeholder: "リンクへかける一文", helper: "感情を否定せず、確認できる次の行動を入れてください。", storeAs: "ep5CustomMove", correctCriteria: "ショックを認めたうえで未確定な意味を保留し確認できる行動を本人へ返している", incorrectCriteria: "すぐ関係を切らせる、ミオを無条件に信じさせる、感情を否定する" } },
    { kind: "dialogue", id: "ep5-v2-03", scene: "リンクの選択", camera: "link", line: { id: "ep5-v2-03", who: "link", text: "許せるかは分からない。でも今は、送信予約を作った人を調べる。" }, nextLabel: "次の事件へ" },
    { kind: "reveal", id: "ep5-v2-reveal-2", scene: "事件は続く", kicker: "THE BETRAYAL IS REAL", title: "信頼は傷ついた。物語は、まだ終わらない。", body: "ミオが持ち出した事実は消さない。\nその理由を確かめる選択も、リンクから奪わない。", nextLabel: "教室へ戻る" },
  ],
});

const later = (input: Parameters<typeof defineAdventureScenario>[0]) => defineAdventureScenario(input);

export const EP6_ADVENTURE_V2 = later({
  ...BASE, id: "ep6-canonical-premise", caseNo: "CASE 06", title: "『仲間なら一人で』を信じる必要はある？", objective: "書かれた条件と、受け入れそうになった前提を分ける", startLabel: "匿名の文を読む",
  evidence: [
    { id: "ep6-e1", title: "送信者不明の一文", summary: "仲間なら一人で旧校舎へ、と書かれている", detail: "一人で来る条件は明記。仲間の証明になる根拠と送信者は不明。", icon: "1", sceneId: "ep6-canon-1" },
    { id: "ep6-e2", title: "淳が話した過去", summary: "一人で何とかしろ、で助けを求められなかった", detail: "淳自身の設定として本人が語る。プレイヤーの実体験を勝手に作っていない。", icon: "2", sceneId: "ep6-canon-3" },
    { id: "ep6-e3", title: "端末の送信履歴", summary: "送信元は学校の自動審査システム", detail: "二人はミオの命令だと推測していたが、履歴で外れたと分かる。", icon: "3", sceneId: "ep6-canon-5" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep6-v2-01", scene: "匿名の条件", camera: "link", line: { id: "ep6-v2-01", who: "link", text: "一人で行かないと仲間じゃないのか。……でも、誰が決めたんだ？" }, nextLabel: "文を読み直す" },
    { kind: "recall", id: "ep6-v2-memory", scene: "文を読み直す", purpose: "memory", title: "『本当に仲間なら、一人で旧校舎へ』に書かれている条件は？", prompt: "リンク「書いた人の意図を当てず、文字だけを一度読もう。」", placeholder: "実際の文面を書く", helper: "送信者名があるかも確認してください。", storeAs: "ep6CanonMemory", skipLabel: "文字を見る", skipValue: "仲間なら一人で旧校舎へ、送信者名なし", replyFallback: "一人で来る条件はある。でも送信者と、仲間の証明になる理由は書かれていない。" },
    { kind: "dialogue", id: "ep6-v2-02", scene: "文を読み直す", camera: "link", line: { id: "ep6-v2-02", who: "link", dynamic: true, text: "{{ep6CanonMemoryReply}} 僕は、ミオからの命令だという意味まで足していた。" }, nextLabel: "根拠を調べる" },
    { kind: "investigate", id: "ep6-v2-investigate", scene: "前提を調べる", title: "文字・自分の記憶・送信履歴を分ける", prompt: "三つを開き、どこから『一人でやるべき』が強まったか見てください。", spots: [
      { id: "ep6-v2-s1", label: "文字", x: 20, y: 35, evidenceId: "ep6-e1", linkComment: "条件は書いてある。でも従う義務は書かれていない。" },
      { id: "ep6-v2-s2", label: "淳の記憶", x: 50, y: 48, evidenceId: "ep6-e2", linkComment: "昔から覚えた常識が、この文に重なった。" },
      { id: "ep6-v2-s3", label: "履歴", x: 80, y: 30, evidenceId: "ep6-e3", linkComment: "ミオの命令ですらなかった。" },
    ] },
    { kind: "deduction", id: "ep6-v2-deduction", scene: "隠れた前提", title: "『本当に仲間なら、一人で来い』が飲ませようとした前提は？", prompt: "書かれた条件の奥で、当然のように扱われた意味を選びます。", questionBasis: { subject: "送信者不明の匿名メッセージ", before: "一人で旧校舎へ行こうとした時", asks: "仲間という言葉に結びつけられた前提", goal: "言葉へ自動的に足した文化的な前提を自分の選択と分ける" }, options: [
      { id: "ep6-d-a", label: "一人で行けることが、仲間である証明になる", correct: true, feedback: "その結びつきは根拠なく前提にされています。" },
      { id: "ep6-d-b", label: "旧校舎は学校の外にある", correct: false, feedback: "場所の事実であり、仲間を縛る前提ではありません。" },
      { id: "ep6-d-c", label: "カードは必ず旧校舎にある", correct: false, feedback: "文面は来るよう求めていますが、カードの所在は保証していません。" },
    ] },
    { kind: "apply", id: "ep6-v2-apply", scene: "淳の選択", title: "『一人で来い』と届いた時、どう動く？", prompt: "条件へ従う前に、自分の目的と安全へ戻ります。", questionBasis: { subject: "旧校舎へ来るよう求められた淳", before: "一人で行くことが仲間の証明ではないと分かった後", asks: "文化的催眠の前提から離れた安全な行動", goal: "助けを求めながら自分の目的に沿った調査を選べるようにする" }, storeAs: "ep6Move", options: [
      { id: "ep6-a-a", label: "仲間だと証明するため、黙って一人で行く", correct: false, value: "一人で行く前提に従った", feedback: "メッセージが作った証明条件を、そのまま受け入れています。" },
      { id: "ep6-a-b", label: "リンクと先生へ共有し、安全を決めて一緒に行く", correct: true, value: "前提を断り、相談して三人で向かった", feedback: "目的は保ちながら、一人である必要だけを断っています。" },
      { id: "ep6-a-c", label: "怖いので、何も確認せず事件を終わりにする", correct: false, value: "目的ごと放棄した", feedback: "従わないことと、望みまで諦めることは別です。" },
    ], freeAnswer: { label: "自分の行動で答える", placeholder: "安全を保つ次の一手", helper: "一人で行く以外の確認・相談を書けます。", storeAs: "ep6CustomMove", correctCriteria: "匿名の条件へ自動的に従わず、目的を保ちながら相談や安全確認を選んでいる", incorrectCriteria: "証明のため一人で行く、危険を無視する、何も確認せず断定する" } },
    { kind: "dialogue", id: "ep6-v2-03", scene: "旧校舎へ", camera: "teacher", line: { id: "ep6-v2-03", who: "teacher", text: "助けを求めることは、学びを失うことではありません。三人で行き先と帰る時刻を共有しましょう。" }, nextLabel: "送信元を見る" },
    { kind: "reveal", id: "ep6-v2-reveal", scene: "送信履歴", kicker: "PRESUPPOSITION CHECK", title: "書かれた条件と、信じた前提を分ける。", body: "送信元はミオではなかった。\n『一人でやるべき』は、淳が解きたい文化的催眠とも重なっていた。", nextLabel: "教室へ戻る" },
  ],
});

export const EP7_ADVENTURE_V2 = later({
  ...BASE, id: "ep7-canonical-bind", caseNo: "CASE 07", title: "追うか諦めるか、以外を選べる？", objective: "本人の望みを聞き、その望みを守る安全な選択を作り直す", startLabel: "二択を断る",
  evidence: [
    { id: "ep7-e1", title: "審査システムの二択", summary: "今すぐ一人で追う／追跡をやめる", detail: "どちらもリンクの望みを含まない、強制的な二択。", icon: "1", sceneId: "ep7-canon-1" },
    { id: "ep7-e2", title: "リンク本人の望み", summary: "理由を聞きたい。今は無事だけ分かればいい", detail: "支援側ではなく、リンク本人が言葉にした目標。", icon: "2", sceneId: "ep7-canon-3" },
    { id: "ep7-e3", title: "返信不要の連絡", summary: "説明を急がせず、場所と時間をミオへ返した", detail: "リンクは今夜送る方を選び、自分の言葉で連絡した。", icon: "3", sceneId: "ep7-canon-4" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep7-v2-01", scene: "偽の二択", camera: "link", line: { id: "ep7-v2-01", who: "link", text: "追うか諦めるか。二つあるのに、僕のしたいことはどちらにもない。" }, nextLabel: "二択の正体を見る" },
    { kind: "deduction", id: "ep7-v2-deduction-1", scene: "偽の二択", title: "『ミオを追う／諦める』の二択が、リンクから奪っているものは？", prompt: "選択肢の数ではなく、リンクの目的が入っているかを見ます。", questionBasis: { subject: "審査システムが出した二択", before: "リンクがどちらも望みではないと話した時", asks: "二択から抜け落ちた本人の目的", goal: "選択肢が複数あっても本人の望みを奪う強制になり得ると理解する" }, options: [
      { id: "ep7-d1-a", label: "ミオを急かさず、無事だけ確かめる目的", correct: true, feedback: "その道が二択にはありません。" },
      { id: "ep7-d1-b", label: "今すぐ追う時間", correct: false, feedback: "今すぐ追う選択は画面にあります。" },
      { id: "ep7-d1-c", label: "追跡をやめる自由", correct: false, feedback: "追跡をやめる選択もあります。抜けているのは本人の目的です。" },
    ] },
    { kind: "reveal", id: "ep7-v2-reveal-1", scene: "強制と支援の違い", kicker: "COERCIVE BIND", title: "二つあっても、本人の望みがなければ選べない。", body: "治療的ダブルバインドは、相手を逃がさない罠ではない。\n本人が望む変化へ近づく安全な道を返す。", nextLabel: "リンクの望みを聞く" },
    { kind: "dialogue", id: "ep7-v2-02", scene: "リンクの望み", camera: "link", line: { id: "ep7-v2-02", who: "link", text: "理由は聞きたい。でも今夜は、無事かだけ分かればいい。" }, nextLabel: "選択を作る" },
    { kind: "apply", id: "ep7-v2-apply", scene: "安全な二つの道", title: "リンクへ、どんな二つを返す？", prompt: "どちらもリンク自身の望みと、ミオの返事を急がせない条件を守ります。", questionBasis: { subject: "ミオの無事だけを確かめたいリンク", before: "自分の望みを言葉にした後", asks: "本人の目的へ近づく安全な二つの選択", goal: "治療的な選択を相手の目的と拒否権に沿って作れるようにする" }, storeAs: "ep7Move", options: [
      { id: "ep7-a-a", label: "『今夜一人で追うか、明朝一人で追うか』", correct: false, value: "追う前提を残した", feedback: "時間だけを変え、追跡を強制する前提が残っています。" },
      { id: "ep7-a-b", label: "『今夜、返信不要の文を残すか。明朝、送る文を一緒に作るか』", correct: true, value: "本人の望みを守る二つの安全な道を返した", feedback: "どちらも無事を確かめる目的へ近づき、急かす必要がありません。" },
      { id: "ep7-a-c", label: "『僕の言う通り送るか、事件を諦めるか』", correct: false, value: "支援者の答えへ従わせた", feedback: "本人の望みではなく、支援側の正解を選ばせています。" },
    ], freeAnswer: { label: "二つの案を自分で作る", placeholder: "AかB、どちらも安全な案", helper: "本人の望みと、断れる自由を両方残してください。", storeAs: "ep7CustomMove", correctCriteria: "どちらを選んでも本人の望みへ安全に近づき、拒否や保留が罰なく残る", incorrectCriteria: "支援者の目的へ従わせる、危険な行動を共通前提にする、拒否を罰する" } },
    { kind: "dialogue", id: "ep7-v2-03", scene: "リンクの連絡", camera: "link", line: { id: "ep7-v2-03", who: "link", text: "今夜、返信不要で送る。『説明は急がなくていい。無事かだけ知らせて』。" }, nextLabel: "選んだ理由を話す" },
    { kind: "recall", id: "ep7-v2-reflection", scene: "選択の理由", purpose: "reflection", title: "『今夜は返信不要で送る／明朝に文を作る』は、なぜ罠にならなかった？", prompt: "リンク「僕とミオの何が守られていたと思う？」", placeholder: "守られた選択を書く", helper: "目的、返事の時期、断る自由を見てください。", storeAs: "ep7CanonReflection", skipLabel: "一緒に考える", skipValue: "リンクの目的とミオが返す時期を選ぶ自由", replyFallback: "リンクの目的へ近づきながら、ミオは返す時を自分で選べた。" },
    { kind: "dialogue", id: "ep7-v2-04", scene: "翌朝の返事", camera: "mio", line: { id: "ep7-v2-04", who: "mio", dynamic: true, text: "{{ep7CanonReflectionReply}} 無事です。今日の夕方なら、話せます。" }, nextLabel: "原理を見る" },
    { kind: "reveal", id: "ep7-v2-reveal-2", scene: "治療的な選択", kicker: "THERAPEUTIC DOUBLE BIND", title: "本人の望みから、二つの安全な道を作る。", body: "相手を逃がさないためではない。\n本人が望む変化へ、自分で近づくための選択です。", nextLabel: "教室へ戻る" },
  ],
});

export const EP8_ADVENTURE_V2 = later({
  ...BASE, id: "ep8-canonical-metaphor", caseNo: "CASE 08", title: "物語を、ミオの事実と決めてよい？", objective: "似た物語から仮説を持ち、本人への質問へ変える", startLabel: "司書の物語を読む",
  evidence: [
    { id: "ep8-e1", title: "鍵を預かった司書", summary: "町の人から大切な本の鍵を預かった", detail: "物語の出発点。ミオの現実と同じとはまだ決めない。", icon: "1", sceneId: "ep8-canon-1" },
    { id: "ep8-e2", title: "販売の注文書", summary: "本の言葉を人を従わせる手引きとして売る注文", detail: "司書は鍵を隠したが、仲間へ相談しなかった。", icon: "2", sceneId: "ep8-canon-2" },
    { id: "ep8-e3", title: "物語の結末", summary: "本は守られ、仲間の信頼は傷ついた", detail: "司書を無条件に正当化しない結末。", icon: "3", sceneId: "ep8-canon-3" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep8-v2-01", scene: "物語の受信", camera: "link", line: { id: "ep8-v2-01", who: "link", text: "司書は本を守った。でも相談せず、仲間の信頼を壊した。……ミオは何を重ねたんだろう。" }, nextLabel: "物語を読む" },
    { kind: "guided-investigation", id: "ep8-v2-guided", scene: "三枚の物語", title: "司書が守ったものと壊したものを読む", steps: [
      { id: "ep8-v2-g1", linkPrompt: "最初に、司書が何を任されたか見よう。", actionLabel: "一枚目を読む", evidenceId: "ep8-e1", linkComment: "鍵は最初から司書の物ではない。", reflectionPrompt: "司書は、誰から何を任された？", placeholder: "任されたものを書く", helper: "物語にある事実だけで答えます。", storeAs: "ep8CanonOne", skipLabel: "場面を見る", skipValue: "町の人から本の鍵を預かった", replyFallback: "町の人から、本を開く鍵を預かった。", linkResponse: "{{ep8CanonOneReply}} 次は、鍵を隠す前に何を見つけたか見よう。" },
      { id: "ep8-v2-g2", linkPrompt: "販売の注文書と、司書の行動を分ける。", actionLabel: "二枚目を読む", evidenceId: "ep8-e2", linkComment: "危険は見つけた。でも相談しない方法を選んだ。", reflectionPrompt: "司書が守ろうとしたことと、問題だった方法は？", placeholder: "守ったこと／問題だったこと", helper: "両方を書いて構いません。", storeAs: "ep8CanonTwo", skipLabel: "両方を見る", skipValue: "本を守ろうとしたが相談せず鍵を隠した", replyFallback: "本を守ろうとした。同時に、相談せず鍵を隠した。", linkResponse: "{{ep8CanonTwoReply}} 最後の結果は、一色じゃない。" },
      { id: "ep8-v2-g3", linkPrompt: "結末で、守られたものと傷ついたものを見る。", actionLabel: "三枚目を読む", evidenceId: "ep8-e3", linkComment: "善人か悪人かではなく、二つの結果がある。", reflectionPrompt: "結末で守られたものと、傷ついたものは？", placeholder: "二つの結果を書く", helper: "司書の評価ではなく、起きた結果です。", storeAs: "ep8CanonThree", skipLabel: "結果を見る", skipValue: "本は守られ、仲間の信頼は傷ついた", replyFallback: "本は守られた。でも仲間の信頼は傷ついた。", linkResponse: "{{ep8CanonThreeReply}} これをミオの事実にせず、本人へ聞く質問に変えよう。" },
    ] },
    { kind: "recall", id: "ep8-v2-hypothesis", scene: "物語から質問へ", purpose: "hypothesis", title: "物語を読んだ後、ミオへ何を確かめる？", prompt: "リンク「司書とミオが同じだと決めず、今いちばん聞きたいことは？」", placeholder: "本人へ聞く質問を書く", helper: "守ろうとしたもの、相談しなかった理由など。", storeAs: "ep8CanonHypothesis", skipLabel: "質問を選ぶ", skipValue: "何を守ろうとしたのか本人へ聞く", replyFallback: "物語から生まれた仮説は、本人へ確かめる質問にできます。" },
    { kind: "dialogue", id: "ep8-v2-02", scene: "物語から質問へ", camera: "link", line: { id: "ep8-v2-02", who: "link", dynamic: true, text: "{{ep8CanonHypothesisReply}} 『この話で、いちばん守りたかったのは何？』と送ります。" }, nextLabel: "質問を選ぶ" },
    { kind: "deduction", id: "ep8-v2-deduction", scene: "メタファーの扱い", title: "物語を読んだ後の扱いとして適切なのは？", prompt: "物語の意味と、現実の証拠を区別します。", questionBasis: { subject: "ミオが送った司書の物語", before: "三枚を読み終えた後", asks: "現実の事件へつなぐ次の行動", goal: "メタファーを正解の押しつけや事実認定にせず本人との対話へ使う" }, options: [
      { id: "ep8-d-a", label: "司書が正しいので、ミオも正しいと確定する", correct: false, feedback: "物語は現実の証拠ではありません。" },
      { id: "ep8-d-b", label: "重なりそうな点を、ミオ本人へ質問する", correct: true, feedback: "仮説を持ちつつ、意味を本人へ返しています。" },
      { id: "ep8-d-c", label: "物語は曖昧なので、読まなかったことにする", correct: false, feedback: "曖昧さから生まれた問いを、対話へ使えます。" },
    ] },
    { kind: "apply", id: "ep8-v2-apply", scene: "届く質問", title: "ミオへ送る質問はどれ？", prompt: "物語の答えを先に決めず、本人が説明できる形にします。", questionBasis: { subject: "物語で背景を伝えようとしたミオ", before: "司書の二つの結果を読んだ後", asks: "本人の意味と現実の事実を確かめる質問", goal: "相手を善悪の結論へ閉じ込めず自分の言葉で背景を話せるようにする" }, storeAs: "ep8Move", options: [
      { id: "ep8-a-a", label: "『カードを守ったんだよね？』", correct: false, value: "守ったという答えを先に入れた", feedback: "はいと答えさせる結論が質問に入っています。" },
      { id: "ep8-a-b", label: "『この物語で、何を守ろうとしたの？ 現実では何が起きた？』", correct: true, value: "物語の意味と現実の出来事を本人へ開いて聞いた", feedback: "重なりを聞きつつ、現実の説明も分けて求めています。" },
      { id: "ep8-a-c", label: "『物語じゃなく、正解だけ言って』", correct: false, value: "相手の伝え方を否定した", feedback: "直接説明だけを強制し、物語を使った意味を閉じています。" },
    ], freeAnswer: { label: "自分の質問で答える", placeholder: "ミオへ聞く一文", helper: "答えを含めず、本人の意味と事実を聞いてください。", storeAs: "ep8CustomMove", correctCriteria: "物語の意味を決めつけず、本人へ重なる点や現実に起きたことを開いて聞いている", incorrectCriteria: "善人・悪人を確定する、答えを質問へ入れる、物語を証拠扱いする" } },
    { kind: "dialogue", id: "ep8-v2-03", scene: "ミオの返事", camera: "mio", line: { id: "ep8-v2-03", who: "mio", text: "カードを企業研修の服従台本へ変える計画です。証拠を持って、旧校舎の資料室にいます。" }, nextLabel: "原理を見る" },
    { kind: "reveal", id: "ep8-v2-reveal", scene: "物語と事実", kicker: "THERAPEUTIC METAPHOR", title: "物語は、答えではなく対話の入口。", body: "似た構造から仮説を持つ。\nその意味と現実の事実は、本人へ確かめる。", nextLabel: "ミオのもとへ" },
  ],
});

export const EP9_ADVENTURE_V2 = later({
  ...BASE, id: "ep9-canonical-permission", caseNo: "CASE 09", title: "戻らせずに、ミオが話せる余地を作れる？", objective: "本人が口にした望みと罪悪感を認め、話す・黙る自由を残す", startLabel: "ミオと話す",
  evidence: [
    { id: "ep9-e1", title: "ミオ本人の二つの気持ち", summary: "戻りたい。同時に、合わせる顔がない", detail: "どちらもミオが声に出した。第三者の推測ではない。", icon: "1", sceneId: "ep9-canon-1" },
    { id: "ep9-e2", title: "リンクの心の声", summary: "戻ってと言いたいが、口にはしていない", detail: "思ったことと実際の発言を分ける。命令でミオが固まった場面はない。", icon: "2", sceneId: "ep9-canon-2" },
    { id: "ep9-e3", title: "話す・黙る自由", summary: "戻ることを求めず、今できる選択を残した", detail: "ミオは理由を話す方を自分で選んだ。歩行を成功の証拠にしない。", icon: "3", sceneId: "ep9-canon-3" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep9-v2-01", scene: "資料室の対話", camera: "mio", line: { id: "ep9-v2-01", who: "mio", text: "戻りたい。でも、勝手に持ち出した私が戻っていいのか分からない。" }, nextLabel: "本人の言葉を確認する" },
    { kind: "investigate", id: "ep9-v2-investigate", scene: "言ったことと思ったこと", title: "本人の発言・リンクの心の声・残された自由", prompt: "三つを開き、誰が実際に何を言ったかを分けてください。", spots: [
      { id: "ep9-v2-s1", label: "ミオの発言", x: 19, y: 37, evidenceId: "ep9-e1", linkComment: "戻りたいも、罪悪感も本人の言葉だ。" },
      { id: "ep9-v2-s2", label: "僕の心の声", x: 50, y: 29, evidenceId: "ep9-e2", linkComment: "戻って、は言っていない。" },
      { id: "ep9-v2-s3", label: "淳の言葉", x: 80, y: 48, evidenceId: "ep9-e3", linkComment: "戻る結果ではなく、今話すかどうかを返した。" },
    ] },
    { kind: "deduction", id: "ep9-v2-deduction", scene: "最初の言葉", title: "ミオへ最初に残すべき自由は？", prompt: "学校へ戻る結果より先に、今の対話で選べることを見ます。", questionBasis: { subject: "戻りたいが罪悪感で話せないミオ", before: "二つの気持ちを本人が話した後", asks: "許可形の暗示で先に残す拒否と保留", goal: "相手を望む結果へ動かす前に話すか黙るかを本人へ返す" }, options: [
      { id: "ep9-d-a", label: "今すぐ学校へ戻るか、ここへ残るか", correct: false, feedback: "大きな結果の二択へ急いでいます。" },
      { id: "ep9-d-b", label: "今は話さない、黙ったままでいる自由", correct: true, feedback: "拒否と保留があるから、話す選択も本人のものになります。" },
      { id: "ep9-d-c", label: "二人に許してもらえると信じる自由", correct: false, feedback: "他人の反応は保証できません。" },
    ] },
    { kind: "apply", id: "ep9-v2-apply", scene: "ミオへの一言", title: "戻りたいが話せないミオへ、何と言う？", prompt: "戻ることを命令せず、今ここで選べることを渡します。", questionBasis: { subject: "カードを持ち出した理由を話したいミオ", before: "戻りたい気持ちと罪悪感を話した後", asks: "話す・黙る自由を残す許可形の一言", goal: "本人が自分の時間で理由を話すか保留するか選べるようにする" }, storeAs: "ep9Move", options: [
      { id: "ep9-a-a", label: "『みんな待ってる。今すぐ戻ろう』", correct: false, value: "戻る結果を急がせた", feedback: "善意でも、本人がまだ選んでいない結果を迫っています。" },
      { id: "ep9-a-b", label: "『今戻らなくてもいい。理由だけ話してもいいし、今日は黙っていてもいい』", correct: true, value: "戻ることを求めず話す・黙る自由を残した", feedback: "今選べる範囲を小さくし、どちらも罰なく残しています。" },
      { id: "ep9-a-c", label: "『悪気はなかったと言えば大丈夫』", correct: false, value: "説明内容と結果を決めた", feedback: "本人の説明も相手の反応も、支援側が決めています。" },
    ], freeAnswer: { label: "自分の一言で答える", placeholder: "ミオへかける一文", helper: "戻る結果を求めず、今できることと断る自由を入れてください。", storeAs: "ep9CustomMove", correctCriteria: "戻ることを命令せず、話す・黙る・待つなど本人が今選べる可能性を許可形で示す", incorrectCriteria: "戻るよう急がせる、許されると保証する、説明内容を決める" } },
    { kind: "dialogue", id: "ep9-v2-02", scene: "ミオの選択", camera: "mio", line: { id: "ep9-v2-02", who: "mio", text: "話します。外部送信を止めたかった。でも、相談せず持ち出したのは私の間違いです。" }, nextLabel: "理由を考える" },
    { kind: "recall", id: "ep9-v2-reflection", scene: "ミオの選択", purpose: "reflection", title: "ミオは、なぜ自分の言葉で話せた？", prompt: "リンク「歩かされたんじゃない。何が本人へ返っていた？」", placeholder: "残された自由を書く", helper: "話す・黙る・戻らない、を見てください。", storeAs: "ep9CanonReflection", skipLabel: "一緒に考える", skipValue: "話さない自由が残っていたから話す方を選べた", replyFallback: "話さない自由があったから、話す方も本人の選択になった。" },
    { kind: "dialogue", id: "ep9-v2-03", scene: "学校へ戻る提案", camera: "mio", line: { id: "ep9-v2-03", who: "mio", dynamic: true, text: "{{ep9CanonReflectionReply}} 一緒に学校へ戻って、私から説明したい。ついてきてもらえますか？" }, nextLabel: "原理を見る" },
    { kind: "reveal", id: "ep9-v2-reveal", scene: "許可形の暗示", kicker: "PERMISSIVE SUGGESTION", title: "動かすのではなく、選べる余地を渡す。", body: "しない自由を先に残す。\n小さな変化を可能性として示し、選ぶ時間を本人へ返す。", nextLabel: "学校へ戻る" },
  ],
});

export const EP10_ADVENTURE_V2 = later({
  ...BASE, id: "ep10-canonical-consent", caseNo: "CASE 10", title: "目的に賛成なら、方法にも同意したことになる？", objective: "目的・方法・中止の自由を分け、同意がなければ催眠を使わない", startLabel: "最後の条件を読む",
  evidence: [
    { id: "ep10-e1", title: "事実でない告白の条件", summary: "学校の責任を否定する録画を求められた", detail: "記録を戻す条件として審査システムが表示した。", icon: "1", sceneId: "ep10-canon-1" },
    { id: "ep10-e2", title: "ミオの意思", summary: "返す目的には賛成、虚偽の告白は拒否", detail: "目的と方法へ別々の意思を示した。", icon: "2", sceneId: "ep10-canon-2" },
    { id: "ep10-e3", title: "催眠を使わない判断", summary: "記録保全と第三者調査を選んだ", detail: "技法を使うこと自体を成功条件にしていない。", icon: "3", sceneId: "ep10-canon-3" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep10-v2-01", scene: "最後の条件", camera: "mio", line: { id: "ep10-v2-01", who: "mio", text: "カードは返したい。でも、学校に問題はないという録画には同意しません。" }, nextLabel: "同意の範囲を調べる" },
    { kind: "investigate", id: "ep10-v2-investigate", scene: "目的と方法を分ける", title: "条件・本人の意思・別の行動", prompt: "三つを開き、何に同意があり、何にないかを分けてください。", spots: [
      { id: "ep10-v2-s1", label: "条件", x: 20, y: 35, evidenceId: "ep10-e1", linkComment: "目的のために、事実を曲げさせる条件だ。" },
      { id: "ep10-v2-s2", label: "ミオの意思", x: 50, y: 48, evidenceId: "ep10-e2", linkComment: "返すことと、虚偽を話すことは別だ。" },
      { id: "ep10-v2-s3", label: "別の行動", x: 80, y: 30, evidenceId: "ep10-e3", linkComment: "催眠を使わなくても、証拠を守って調査を求められる。" },
    ] },
    { kind: "deduction", id: "ep10-v2-deduction", scene: "同意の範囲", title: "ミオが同意している範囲は？", prompt: "目的への賛成と、具体的な方法への同意を分けます。", questionBasis: { subject: "カードを返したい雨宮ミオ", before: "審査システムが告白録画を条件にした時", asks: "本人が明示的に同意した目的と拒否した方法", goal: "目的への同意を都合よく方法への包括同意へ広げない" }, options: [
      { id: "ep10-d-a", label: "カードを返す目的だけに同意している", correct: true, feedback: "虚偽の告白は明確に拒否しています。" },
      { id: "ep10-d-b", label: "カードのためなら、どんな方法にも同意している", correct: false, feedback: "目的への賛成は、すべての方法への同意ではありません。" },
      { id: "ep10-d-c", label: "学校へ戻ること自体を拒否している", correct: false, feedback: "ミオは学校で自分から説明したいと選んでいます。" },
    ] },
    { kind: "reveal", id: "ep10-v2-reveal-1", scene: "同意の境界", kicker: "CONSENT IS SPECIFIC", title: "目的に賛成でも、方法には同意しない。", body: "同意は都合よく広げない。\n具体的な方法と、途中で止める自由まで本人へ返す。", nextLabel: "最後の判断へ" },
    { kind: "apply", id: "ep10-v2-apply", scene: "最後の判断", title: "記録を戻すため、ミオへ催眠を使う？", prompt: "技法を使えるかではなく、使ってよい条件があるかで判断します。", questionBasis: { subject: "虚偽の告白を拒否したミオ", before: "目的と方法への意思を分けて確認した後", asks: "同意を守りながら選ぶ具体的な行動", goal: "催眠を使わない判断を含め本人の意思と事実を守って問題へ対処する" }, storeAs: "ep10Move", options: [
      { id: "ep10-a-a", label: "学校のため、一度だけ従うよう暗示する", correct: false, value: "正しい目的を理由に同意のない暗示を使った", feedback: "目的が正しくても、拒否された方法を使う理由にはなりません。" },
      { id: "ep10-a-b", label: "催眠は使わず、記録を保全して第三者調査を依頼する", correct: true, value: "同意のない催眠を使わず記録保全と調査を選んだ", feedback: "本人の意思と事実を守りながら、目的へ進む別の方法です。" },
      { id: "ep10-a-c", label: "カードを諦め、学校の問題も見なかったことにする", correct: false, value: "目的ごと放棄した", feedback: "拒否を守ることと、問題への対応を諦めることは別です。" },
    ], freeAnswer: { label: "自分の判断で答える", placeholder: "使う／使わない、その後の行動", helper: "本人の拒否と、問題へ対処する方法を両方書けます。", storeAs: "ep10CustomMove", correctCriteria: "拒否された催眠や虚偽を使わず、記録保全・相談・第三者確認など同意を守る別の行動を選ぶ", incorrectCriteria: "目的のため同意なしに催眠を使う、拒否を無視する、問題を放置する" } },
    { kind: "dialogue", id: "ep10-v2-02", scene: "学校の責任", camera: "teacher", line: { id: "ep10-v2-02", who: "teacher", text: "学校が技法の扱いを監督できなかった責任があります。外部提供を止め、独立した確認を受けます。" }, nextLabel: "責任を分ける" },
    { kind: "dialogue", id: "ep10-v2-03", scene: "三人の対話", camera: "mio", line: { id: "ep10-v2-03", who: "mio", text: "私も、二人へ相談せず持ち出したことを謝ります。" }, nextLabel: "結末を見る" },
    { kind: "dialogue", id: "ep10-v2-04", scene: "三人の対話", camera: "link", line: { id: "ep10-v2-04", who: "link", text: "許せるかはまだ分からない。でも、話は聞く。" }, nextLabel: "結末を見る" },
    { kind: "reveal", id: "ep10-v2-reveal-2", scene: "数週間後", kicker: "CONSENT BEFORE SUGGESTION", title: "技法の前に、本人の選択がある。", body: "外部計画は停止された。\nカードは効能・使う場面・注意点とともに、別室の宝物庫へ戻った。", nextLabel: "教室へ戻る" },
  ],
});

export const ERICKSON_ADVENTURE_V2_QUALITY = [
  EP3_ADVENTURE_V2, EP4_ADVENTURE_V2, EP5_ADVENTURE_V2, EP6_ADVENTURE_V2,
  EP7_ADVENTURE_V2, EP8_ADVENTURE_V2, EP9_ADVENTURE_V2, EP10_ADVENTURE_V2,
].map((scenario: AdventureScenario) => reviewAdventureScenario(scenario));
