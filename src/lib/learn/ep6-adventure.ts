import { defineAdventureScenario, reviewAdventureScenario } from "./adventure";

export const EP6_ADVENTURE = defineAdventureScenario({
  id: "ep6-verbal-implication",
  caseNo: "CASE 06",
  title: "言われていない意味を信じた時、催眠をどう解く？",
  objective: "実際の言葉と、自分が足した意味を分ける",
  startLabel: "送信された言葉を調べる",
  background: "/learn/adventure/erickson-study-v1.webp",
  teacherSprite: "/learn/adventure/erickson-cutout-v1.webp",
  linkSprite: "/learn/chars/link-neutral.webp",
  guestSprite: "/learn/chars/mio-betray-v1.webp",
  guestName: "雨宮ミオ",
  evidence: [
    { id: "message", title: "届いた一文", summary: "『カードを取り戻したいなら、旧校舎へ』と表示された", detail: "書かれているのは行き先と条件だけ。一人で来い、今すぐ来い、ミオを信じるなとは書かれていない。", icon: "1", image: "/learn/ep6/manga-v1/02.webp", imageAlt: "端末に旧校舎へ来るよう表示された漫画" },
    { id: "location", title: "送信位置", summary: "映像は旧校舎の資料室から送られていた", detail: "位置情報は送信場所を示す。ミオ本人が送ったか、そこに今もいるかまでは示さない。", icon: "2", image: "/learn/ep6/manga-v1/03.webp", imageAlt: "旧校舎の位置情報を確認する漫画" },
    { id: "video-frame", title: "映像の端", summary: "切れた映像にミオ以外の影が一瞬映った", detail: "別の人がいる可能性はある。ただし誰か、味方か敵かは、この一場面だけでは決められない。", icon: "3", image: "/learn/ep6/manga-v1/04.webp", imageAlt: "ミオの映像の端に別の影が映る漫画" },
  ],
  nodes: [
    { kind: "dialogue", id: "ep6-adv-01", scene: "校外からの暗示", camera: "link", line: { id: "ep6-adv-01", who: "link", face: "think", text: "『カードを取り戻したいなら、旧校舎へ』。ミオは僕らだけで来いと言ってる。すぐ行こう。" }, nextLabel: "言葉を読み直す" },
    { kind: "recall", id: "ep6-memory", scene: "言葉を読み直す", purpose: "memory", title: "届いた『カードを取り戻したいなら、旧校舎へ』に、実際に書いてあったことは？", prompt: "リンク「僕が足した意味は外して、画面の文字だけを教えて。」", placeholder: "画面に書かれた言葉だけを書く", helper: "『きっと』『つまり』は一度外してください。", storeAs: "ep6Memory", skipLabel: "文字だけ見る", skipValue: "カードを取り戻したいなら旧校舎へ", replyFallback: "書かれているのは、カードを取り戻したいなら旧校舎へ、だけだね。" },
    { kind: "dialogue", id: "ep6-adv-02", scene: "言葉を読み直す", camera: "link", line: { id: "ep6-adv-02", who: "link", face: "think", text: "{{ep6MemoryReply}} ……『僕らだけで』『今すぐ』は、僕が勝手に足していました。", dynamic: true }, nextLabel: "三つの証拠を確認する" },
    { kind: "guided-investigation", id: "ep6-guided", scene: "送信記録を追う", title: "言葉・場所・映像を一つずつ分ける", steps: [
      { id: "ep6-guide-1", linkPrompt: "まず画面の一文。文字にある条件と、文字にない条件を分けよう。", actionLabel: "1つ目の証拠を見る", evidenceId: "message", linkComment: "旧校舎へは書いてある。でも、一人で来いとは書いていない。", reflectionPrompt: "『旧校舎へ』だけでは、誰と、いつ行くかまで決められる？", placeholder: "文字にないことを一つ書く", helper: "人数、時間、送り主を見てください。", storeAs: "ep6Observe1", skipLabel: "まだ分からない", skipValue: "誰といつ行くかは決められない", replyFallback: "人数も時間も、文字だけでは決められないね。", linkResponse: "{{ep6Observe1Reply}} 次は、位置情報が何を示すかだけ見よう。" },
      { id: "ep6-guide-2", linkPrompt: "位置情報は場所を示す。でも、送り主まで示しているかな。", actionLabel: "2つ目の証拠を見る", evidenceId: "location", linkComment: "旧校舎の資料室から送られた。誰が端末を使ったかは別の問題だ。", reflectionPrompt: "位置情報で分かることと、分からないことは？", placeholder: "分かること／分からないことを書く", helper: "場所と人を分けてください。", storeAs: "ep6Observe2", skipLabel: "まだ分からない", skipValue: "送信場所は分かるが送り主は不明", replyFallback: "場所は旧校舎。でも送った人はまだ不明です。", linkResponse: "{{ep6Observe2Reply}} 最後に、切れた映像の端を止めて見る。" },
      { id: "ep6-guide-3", linkPrompt: "ミオの横の影。影がある事実と、その正体の予想を分けよう。", actionLabel: "3つ目の証拠を見る", evidenceId: "video-frame", linkComment: "誰かの影はある。でも、それだけで犯人とも仲間とも決められない。", reflectionPrompt: "この影から確実に言えることは？", placeholder: "見えていることだけを書く", helper: "人物の名前や目的はまだ付けません。", storeAs: "ep6Observe3", skipLabel: "影だけ見る", skipValue: "ミオ以外の影が映った", replyFallback: "ミオ以外の影がある。正体と目的はまだ分からない。", linkResponse: "{{ep6Observe3Reply}} 三つ見た。{{userName}}は、この言葉にどんな前提が隠れていると思う？" },
    ], nextLabel: "リンクへ仮説を話す" },
    { kind: "recall", id: "ep6-hypothesis", scene: "隠れた前提", purpose: "hypothesis", title: "リンクが受け入れかけた、言われていない前提は？", prompt: "リンク「僕は何を『当然そうだ』と思って、走り出そうとしたんだろう。」", placeholder: "言葉にないのに信じたことを書く", helper: "誰と行くか、いつ行くか、誰が送ったかを考えてください。", storeAs: "ep6Hypothesis", skipLabel: "まだ決められない", skipValue: "一人で今すぐ行く必要があると思った", replyFallback: "旧校舎へ行くことから、一人で今すぐ行く必要まで作ってしまったんだね。" },
    { kind: "dialogue", id: "ep6-adv-03", scene: "隠れた前提", camera: "teacher", line: { id: "ep6-adv-03", who: "teacher", text: "{{ep6HypothesisReply}} 言葉が直接命じなくても、聞いた人が補った意味が暗示になります。", dynamic: true }, nextLabel: "第一推理へ" },
    { kind: "deduction", id: "ep6-deduction-1", scene: "第一推理", title: "この一文が、直接言っていないことはどれ？", prompt: "画面の文字と、リンクが推論した意味を分けてください。", questionBasis: { subject: "旧校舎へ来るよう求める一文", before: "リンクが一人ですぐ行こうとした時", asks: "文字に存在しない条件", goal: "言葉と自分が補った意味を区別して安全な調査判断を取り戻す" }, options: [
      { id: "annex", label: "カードを取り戻したいなら旧校舎へ来ること", correct: false, feedback: "これは実際に画面へ書かれています。文字にない人数と時間を見てください。" },
      { id: "alone-now", label: "一人で、今すぐ旧校舎へ行くこと", correct: true, feedback: "その条件は書かれていません。リンクが文から補った意味です。" },
      { id: "cards", label: "旧校舎が原理カードに関係すること", correct: false, feedback: "カードを取り戻す条件として旧校舎が示されています。直接ないのは人数と時間です。" },
    ] },
    { kind: "reveal", id: "ep6-reveal-1", scene: "言葉の二層", kicker: "WORDS / INFERENCE", title: "言われたこと。\n自分が足した意味。", body: "二つを分けると、隠れた暗示が見える。\n意味を受け入れるかは、自分で選び直せる。", nextLabel: "リンクへ使う" },
    { kind: "dialogue", id: "ep6-adv-04", scene: "走り出す前に", camera: "link", line: { id: "ep6-adv-04", who: "link", face: "think", text: "でも『相棒なら一人で来られるよね』って、次の文字が出た。行かなきゃ卑怯な気がする。" }, nextLabel: "一言を選ぶ" },
    { kind: "apply", id: "ep6-apply", scene: "走り出す前に", title: "一人で行かなければ卑怯だと感じるリンクへ、何と言う？", prompt: "書かれた言葉と、リンクが受け取った意味を分けます。", questionBasis: { subject: "一人で行かなければ相棒ではないと感じるリンク", before: "『相棒なら一人で来られる』という文字を見た時", asks: "隠れた前提を外して調査を続ける一言", goal: "勇気と単独行動を同一視せず、安全な行動を本人が選べるようにする" }, storeAs: "ep6Move", options: [
      { id: "prove", label: "『相棒だと証明するため、一人ですぐ行こう』", correct: false, value: "相棒なら一人で行くべきだと受け入れた", feedback: "相手が置いた前提をそのまま受け入れています。相棒であることと人数を分けてください。" },
      { id: "separate", label: "『相棒かどうかと、一人で行くかは別だ。二人で送信元を確かめよう』", correct: true, value: "相棒であることと単独行動を分け、二人で確認すると決めた", feedback: "隠れた前提を外し、安全な確認行動を二人で選べています。" },
      { id: "deny", label: "『全部嘘だ。メッセージは無視しよう』", correct: false, value: "メッセージを全部嘘だと決めて無視した", feedback: "送り主も目的もまだ不明です。反対の結論へ飛ばず、言葉と意味を分けてください。" },
    ], freeAnswer: { label: "自分の一言で前提を外す", placeholder: "言葉と意味を分け、安全な次の一手を書く", helper: "『○○と△△は別だ。そのうえで□□を選ぼう』の形でも大丈夫です。", storeAs: "ep6CustomMove", correctCriteria: "相棒や勇気と単独行動を分け、言われていない前提を外し、安全な確認行動を本人が選べる", incorrectCriteria: "単独行動を強制する、全て嘘と断定する、相手の価値を脅して従わせる" } },
    { kind: "dialogue", id: "ep6-adv-05", scene: "選び直した調査", camera: "link", line: { id: "ep6-adv-05", who: "link", face: "aha", text: "相棒だから一人で行くんじゃない。相棒だから、二人で確かめる。条件は僕らで選ぶ。" }, nextLabel: "変化を考える" },
    { kind: "recall", id: "ep6-reflection", scene: "選び直した調査", purpose: "reflection", title: "リンクは、なぜ同じメッセージを見ても選び直せた？", prompt: "リンク「文字は消えていないのに、一人で急ぐ感じが弱くなった。何が変わった？」", placeholder: "言葉と注意の変化をつなぐ", helper: "メッセージではなく、受け取った前提を見てください。", storeAs: "ep6Reflection", skipLabel: "まだ分からない", skipValue: "言葉と自分が足した意味を分けたから", replyFallback: "言葉そのものではなく、自分が足した前提を外したから選べたんですね。" },
    { kind: "dialogue", id: "ep6-adv-06", scene: "選び直した調査", camera: "teacher", line: { id: "ep6-adv-06", who: "teacher", text: "{{ep6ReflectionReply}} これが、言葉の暗示を見抜く第一歩です。", dynamic: true }, nextLabel: "最後の確認へ" },
    { kind: "deduction", id: "ep6-deduction-2", scene: "倫理の確認", title: "言葉の暗示を使う時、してはいけないことは？", prompt: "気づきを促す言葉と、隠して従わせる言葉を分けてください。", questionBasis: { subject: "言葉から意味を作る暗示", before: "聞き手が言われていない前提を補う時", asks: "同意を奪う使い方", goal: "Verbal Implication を気づかれない操作術として誤用しない" }, options: [
      { id: "check", label: "相手がどんな意味を受け取ったか確かめる", correct: false, feedback: "これは誤解を減らす確認です。相手が受け取った意味を一緒に見られます。" },
      { id: "hide", label: "相手に分からないよう、不利な前提を受け入れさせる", correct: true, feedback: "その使い方は同意と選択を奪います。この授業で扱う催眠ではありません。" },
      { id: "separate", label: "実際の言葉と、聞き手が補った意味を分ける", correct: false, feedback: "これは暗示を見抜き、選択を取り戻すための方法です。" },
    ] },
    { kind: "reveal", id: "ep6-reveal-2", scene: "校外調査へ", kicker: "VERBAL IMPLICATION", title: "言葉にない意味を、\n聞き手が作る。", body: "実際の言葉。\n自分が補った意味。\n二つを分け、受け入れる前提を選び直す。", nextLabel: "旧校舎へ向かう" },
    { kind: "dialogue", id: "ep6-adv-07", scene: "校外調査へ", camera: "link", line: { id: "ep6-adv-07", who: "link", face: "smile", text: "{{userName}}、二人で行こう。送信者の条件じゃなく、僕らの条件でミオを探す。" }, nextLabel: "講義へ戻る" },
  ],
});

export const EP6_ADVENTURE_QUALITY = reviewAdventureScenario(EP6_ADVENTURE);
