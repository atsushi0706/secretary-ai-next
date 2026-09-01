import type { Episode, Line, Scene, Slide } from "./types";
import { EP3_ADVENTURE_V2 as EP3_ADVENTURE } from "./erickson-adventures-v2";
import { EP3_FOUNDATION } from "./ep3-foundation";
import { assertEpisodeLearningFlow } from "./episode-review";
import { assertEpisodeExperience } from "./episode-experience-review";
import { canonicalMangaFrames } from "./erickson-canon";

const T = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "teacher", text, ...extra });
const L = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "link", text, ...extra });
const S = (slide: Slide): Slide => slide;

const SCENES: Scene[] = [
  { no: 1, title: "催眠は、無心になる試験ではない", lines: [
    L("ep3-lec1-1", "僕は、催眠に入るなら頭を空にしなきゃいけないと思っていました。", { face: "think", slide: S({ h: "考えが浮かぶ\n＝ 催眠失敗？", style: "cross" }) }),
    T("ep3-lec1-2", "考えが浮かぶのは失敗ではありません。止めようと命令すると、できたかどうかを何度も確認するため、かえって考えへ注意が戻ります。"),
    T("ep3-lec1-2b", "『こんなので、本当に変われるわけない』が自分の声に聞こえても、親や学校や周囲の評価から覚えた文化的催眠かもしれません。内容を真実と決めず、浮かんだ後の行動を選びます。"),
    T("ep3-lec1-3", "今回変えたのは、考えの有無ではなく、考えが浮かんだ後にすることです。"),
  ], ticketHint: "考えが多い時の催眠について質問できます" },
  { no: 2, title: "浮かんだ一つを、次の合図にする", lines: [
    T("ep3-lec2-1", "言葉が一つ浮かんだ。その事実を確認したら、息を一つ吐く。内容を分析せず、次の感覚へつなぎます。", { slide: S({ h: "言葉が浮かぶ\n↓\n息を一つ確かめる\n↓\n次の間を待つ", style: "flow" }) }),
    L("ep3-lec2-2", "考えを止める暗示じゃなくて、考えが来た時の動きを変える暗示なんですね。", { face: "aha" }),
    T("ep3-lec2-3", "はい。すでに起きている反応を、次の暗示の合図にしています。"),
  ], ticketHint: "自分の考えをどの感覚へつなぐか質問できます" },
  { no: 3, title: "内的対話のUtilization", lines: [
    L("ep3-lec3-1", "でも、どんな考えでも呼吸の合図にしていいんですか？", { face: "think", slide: S({ h: "INNER DIALOGUE UTILIZATION\n（内的対話のユーティライゼーション）", style: "steps", items: ["考えを止めようとしない", "浮かんだ一つを確認する", "今できる感覚へ一つだけつなぐ"] }) }),
    T("ep3-lec3-2", "つらい内容を掘り下げる必要はありません。『何か浮かんだ』とだけ扱い、呼吸や椅子の感覚など安全に確かめられるものへ戻ります。"),
    T("ep3-lec3-3", "苦しさが強い時や眠れない状態が続く時は、この練習だけで解決しようとせず、専門家へ相談してください。"),
    L("ep3-lec3-4", "考えを消す技術じゃない。考えが来ても、自分で戻る道を作る技術なんですね。", { face: "aha" }),
  ], ticketHint: "安全に止める目安も質問できます" },
  { no: 4, title: "次の実習では、相手へ言葉をかける", lines: [
    T("ep3-lec4-1", "今日、あなたはミオの反応を見て、自分の一言で次の呼吸へつなぎました。", { slide: S({ h: "観察する\n↓\n一言を作る\n↓\n相手の変化を見る", style: "flow" }) }),
    L("ep3-lec4-2", "次は、僕たちが誰かへ催眠をかける番ですか？", { face: "think" }),
    T("ep3-lec4-3", "その前に、言葉を置く順番を学びます。相手が今確かめられる事実から始めます。"),
  ], ticketHint: "次回の実習について質問できます" },
];

export const EP3: Episode = {
  key: "ep3", no: 3,
  title: "やりたいことを始める時、『こんなので、本当に変われるわけない』と浮かんだら、催眠をどう使う？",
  subtitle: "変態催眠学者の催眠の極意03｜内的対話のUtilization",
  listing: { cover: "/learn/ep3/manga-v1/01.webp", coverAlt: "授業後も考えを止められず席に残る雨宮ミオ", caseNo: "CASE 03", hook: "止めるほど、頭の声が大きくなる。", principleNo: "エリクソン原理 03", mangaPages: 5, classroomScenes: 4, minutes: 18 },
  goal: { before: ["考えを止めようと命令する", "浮かぶたび催眠失敗だと思う", "内容を延々と分析する"], after: ["浮かんだ一つを確認する", "一呼吸の合図へ変える", "考えが残っても次へ戻る"], takeaway: "止まらない頭の声を消さず、今できる感覚へ戻る合図として使う。" },
  tickets: 5,
  parts: [
    { kind: "manga", title: "第3の催眠事件", schoolIntro: { kicker: "SINGA WORLD 催眠学校", beats: [
      { who: "teacher", tone: "question", text: "本当にやりたいことを始めようとした途端、頭の中の言葉で手が止まることはありませんか？" },
      { who: "teacher", tone: "example", text: "理想の自分を言葉にする動画を試した翌朝、やりたい企画の申込画面を開く。そこで『こんなので、本当に変われるわけない』『好きなことばかりして、人にどう思われる？』と浮かぶ。" },
      { who: "link", tone: "reaction", text: "自分の考えだと思ってた。でも、親や学校や周りの目から覚えた言葉も混ざってるのか。" },
      { who: "teacher", tone: "reveal", text: "自分の声のように選択を止める。それが文化的催眠です。止めずに、次の合図へ変えます。" },
      { who: "link", tone: "reaction", text: "その声を消さなくても、自分がやりたい方へ戻れるんですか？" },
      { who: "teacher", tone: "address", text: "{{userName}}。新しい実習生ミオと、声が合図へ変わった夜を見てください。" },
    ], cta: "ミオの事件を見る →" }, briefing: { caseNo: "CASE 03", eyebrow: "変態催眠学者｜MILTON H. ERICKSON", title: "自分の声に聞こえる常識", principle: "第3の催眠事件", hook: "否定の声が消えていないのに、なぜミオは下書きを作れた？", teaser: "文化的催眠を論破せず、その声が浮かんだ後に自分へ戻る道を作った。", cta: "事件の漫画を見る →", note: "EPISODE 03｜漫画は1ページずつ進みます" }, frames: canonicalMangaFrames(3) },
    { kind: "experience", title: "自分の頭の声を一つ選ぶ", minutes: 2, bridge: { beats: [
      { who: "teacher", text: "ミオが望んだのは、頭を完全に空にすることではありません。考えが浮かんでも、休む時や次の行動へ自分で戻れることでした。" },
      { who: "link", text: "考えは残ってるのに、ミオは息を一つ確かめて、次の実習を手伝うと決められた。僕たちにも似た場面はありますか？" },
      { who: "teacher", text: "{{userName}}。あなたに一番近い場面を一つ選んでください。後で、その場面に使う暗示を作ります。" },
    ], cta: "自分の場面を選ぶ →" }, steps: [{ kind: "choice", q: "考えを止めようとして、余計に続くのはどんな時ですか？", help: "近いものを選ぶか、自分の場面を一文で書いてください。", storeAs: "innerDialogueScene", completion: "option-or-detail", detail: { id: "ep3Detail", storeAs: "innerDialogueScene", label: "あなたの場合は、どんな言葉が頭に浮かびますか？", placeholder: "例：明日の失敗を何度も考える", helper: "一文か音声で答えられます。", then: [{ kind: "say", line: T("ep3-exp-detail", "その言葉を消さず、次に戻る合図へ変えてみましょう。") }, { kind: "fade", text: "ミオと催眠を組み立てる" }] }, options: [
      { label: "眠る前に、明日のことを考え続ける", value: "眠る前に明日のことを考え続ける", then: [{ kind: "say", line: T("ep3-exp-a", "眠るために考えを消すのではなく、浮かんだ後の一呼吸を作ります。") }, { kind: "fade", text: "ミオと催眠を組み立てる" }] },
      { label: "失敗を思い出し、頭の中で反省を続ける", value: "失敗を思い出し反省を続ける", then: [{ kind: "say", line: T("ep3-exp-b", "反省を止めろと命令せず、次に戻る合図へ変えます。") }, { kind: "fade", text: "ミオと催眠を組み立てる" }] },
      { label: "集中したいのに、別の言葉が浮かぶ", value: "集中したい時に別の言葉が浮かぶ", then: [{ kind: "say", line: T("ep3-exp-c", "浮かぶたび失敗にせず、戻る動作を一つ作ります。") }, { kind: "fade", text: "ミオと催眠を組み立てる" }] },
    ] }] },
    { kind: "adventure", scenario: EP3_ADVENTURE },
    { kind: "classroom", intro: { title: "考えを止められないミオが、なぜ席を立てた？", lead: "エリクソンは、ミオの考えを消そうとせず、考えが浮かぶたび一呼吸を確かめる合図にしました。考えが残ったまま次の行動へ戻る催眠の順番を整理します。", basis: { subjectAnchor: "ミオ", eventAnchor: "考え", learningGoal: "止まらない考えを、次の行動へ戻る合図として使う順番" } }, scenes: SCENES },
    { kind: "qa", title: "止まらない考えを使う催眠について、エリクソンに聞きたいことはありますか？" },
    { kind: "card", lines: [T("ep3-card-01", "止まらない声と戦わず、次へ戻る順番を持って帰ってください。")], card: { series: "ERICKSON PRINCIPLE", no: "03", name: "INNER DIALOGUE UTILIZATION", reading: "内的対話のユーティライゼーション", principle: ["考えを止めようとしない。", "浮かんだ一つを、今できる感覚の合図にする。"], summary: "頭に浮かぶ言葉を失敗として消そうとせず、呼吸など今確かめられる感覚へ戻る合図として使う方法。", effect: "考えが残っていても、追いかけ続けず、自分で次の注意へ戻る道を作れる。", useWhen: ["眠る前に考えが次々に浮かぶ時", "静かにしようとするほど頭が騒がしくなる時", "集中から外れた自分を責め続ける時"], howTo: ["考えが浮かんだ事実だけを確認する", "一呼吸や接触感覚へ一つだけつなぐ", "考えが来るたび同じ戻り方を選ぶ"] }, after: [T("ep3-card-02", "考えを消せたかではなく、考えの次に何を選べたかを見てください。", { face: "smile" })] },
    { kind: "outro", lines: [
      L("ep3-out-01", "{{innerDialogueScene}}という場面に、今日のやり方を使えるんですね。", { dynamic: true, face: "aha" }),
      T("ep3-out-02", "あなたはミオへ、{{ep3Move}}。考えを失敗ではなく、次へ戻る合図に変えました。", { dynamic: true, face: "smile" }),
      T("ep3-out-03", "今日、あなたは初めて、目の前の相手へ催眠の一言を組み立てました。", { face: "smile" }),
      T("ep3-out-04", "今日の講義は、ここまでです。", { face: "smile" }),
      L("ep3-out-05", "先生。言葉を作れても、人前で緊張した相手には順番を間違えそうです。何から言えばいいんですか？", { face: "think" }),
      T("ep3-out-06", "次は、相手が今確かめられる二つの事実から始めます。ミオにも、観察役を頼みましょう。", { face: "smile" }),
    ] },
    { kind: "teaser", manga: [{ rows: [{ panels: [{ art: "link-worry", say: { who: "リンク", text: "……声が出ない。" } }, { art: "mio-observe", say: { who: "ミオ", text: "足は床についてる。" } }] }, { panels: [{ art: "erickson-say", say: { who: "エリクソン", text: "二つ合わせて、一つ導きます。" } }] }] }], hook: ["人前で固まり、声が出ないリンク。", "『落ち着いて』では届かない時、何から言う？"], next: { no: "第4話", title: "緊張している相手へ、催眠の言葉をどの順番でかける？", series: "変態催眠学者の催眠の極意04", principle: "今確かめられる事実へ合わせ、次の一動作へ導く" }, preview: { caseNo: "NEXT CASE 04", first: { who: "清瀬リンク", text: "人前に出たら、声が出なくなりました。" }, teacher: "足は床にある。息は吐ける。その後に、次の一言だけです。" }, unlock: ["🔒 次の話は準備中"] },
  ],
  sceneSummaries: ["第3話は、止まらない内的対話を消さず、呼吸へ戻る合図として使う催眠を学ぶ。", "新しい実習生の雨宮ミオは、考えを止めようとするほど疲れていた。", "考えは残ったが、一つ浮かぶたびに息を一つ確かめ、席を立てた。", "プレイヤーは漫画を三段階で読み返し、考えの次に何が変わったかを推理する。", "プレイヤーはミオへ一言を作り、相手の反応を見て理由を言葉にする。", "内的対話のユーティライゼーションは治療の保証ではなく、現在の体験から注意を戻す短い練習として扱う。"],
};

export const EP3_LEARNING_FLOW_QUALITY = assertEpisodeLearningFlow(EP3, EP3_FOUNDATION);
export const EP3_EXPERIENCE_QUALITY = assertEpisodeExperience(EP3);
