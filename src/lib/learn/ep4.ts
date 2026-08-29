import type { Episode, Line, Scene, Slide } from "./types";
import { EP4_ADVENTURE } from "./ep4-adventure";
import { EP4_FOUNDATION } from "./ep4-foundation";
import { assertEpisodeLearningFlow } from "./episode-review";
import { assertEpisodeExperience } from "./episode-experience-review";

const T = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "teacher", text, ...extra });
const L = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "link", text, ...extra });
const S = (slide: Slide): Slide => slide;

const SCENES: Scene[] = [
  { no: 1, title: "『落ち着いて』が届かない理由", lines: [
    T("ep4-lec1-1", "緊張している人に『落ち着いて』と言っても、その人が落ち着きを確認できなければ、言葉と体験はつながりません。", { slide: S({ h: "まだ分からない結論\n『落ち着いて』\n×\n今、確かめられる体験", style: "cross" }) }),
    L("ep4-lec1-2", "あの時は『落ち着けない自分はだめだ』まで増えました。", { face: "think" }),
    T("ep4-lec1-3", "だから先に、本人が今うなずける事実へ言葉を合わせます。"),
  ], ticketHint: "抽象的な励ましとの違いを質問できます" },
  { no: 2, title: "二つ合わせて、一つ導く", lines: [
    T("ep4-lec2-1", "足は床にある。息は吐ける。二つの事実が本人の体験と合った後で、『次の一言だけ』と提案しました。", { slide: S({ h: "事実 1\n＋\n事実 2\n↓\n小さな提案 1", style: "flow" }) }),
    L("ep4-lec2-2", "分かることが続いたから、その次も自分で試せる候補になったんですね。", { face: "aha" }),
    T("ep4-lec2-3", "これを、現在へ合わせるペーシングと、次へ導くリーディングと呼びます。"),
  ], ticketHint: "二つの事実の作り方を質問できます" },
  { no: 3, title: "心を当てず、観察できるものを言う", lines: [
    L("ep4-lec3-1", "『本当は安心している』みたいに、相手の心を言い当てるのもペーシングですか？", { face: "think", slide: S({ h: "PACING AND LEADING\n（ペーシング＆リーディング）", style: "steps", items: ["観察できる事実を二つ", "本人が確かめる", "選べる提案を一つ"] }) }),
    T("ep4-lec3-2", "いいえ。本人が否定できる心情を断定すると、そこで言葉が外れます。見える姿勢、聞こえる音、本人が答えられる感覚を使います。"),
    T("ep4-lec3-3", "提案も命令ではありません。試す、待つ、やめるを本人が選べる大きさにします。"),
    L("ep4-lec3-4", "相手に合わせることと、相手を操ることは別なんですね。", { face: "aha" }),
  ], ticketHint: "観察と決めつけの境界を質問できます" },
  { no: 4, title: "言葉が外れたら、戻って確かめる", lines: [
    T("ep4-lec4-1", "相手が『違う』『分からない』と言ったら、失敗を隠しません。今確かめられる別の事実へ戻ります。", { slide: S({ h: "違うと言われた\n↓\n止まる\n↓\n別の事実を確かめる", style: "flow" }) }),
    L("ep4-lec4-2", "催眠を成功させるために、相手の返事を正解へ誘導しないんですね。", { face: "think" }),
    T("ep4-lec4-3", "その通りです。同意と選択が残って初めて、これは本人の体験を使う催眠になります。"),
  ], ticketHint: "言葉が外れた時の戻り方を質問できます" },
];

export const EP4: Episode = {
  key: "ep4", no: 4,
  title: "緊張している相手へ、催眠の言葉をどの順番でかける？",
  subtitle: "変態催眠学者の催眠の極意04｜Pacing and Leading",
  listing: { cover: "/learn/ep4/manga-v1/01.webp", coverAlt: "公開実習の舞台で緊張し声が出ないリンクと、観察するミオ", caseNo: "CASE 04", hook: "『落ち着いて』が届かない。", principleNo: "エリクソン原理 04", mangaPages: 5, classroomScenes: 4, minutes: 19 },
  goal: { before: ["いきなり落ち着けと励ます", "相手の心情を決めつける", "一度に完成を求める"], after: ["確認できる事実を二つ言う", "本人の反応を確かめる", "選べる一動作を一つ提案する"], takeaway: "相手が今うなずける二つの事実に合わせ、その続きへ小さな暗示を一つ置く。" }, tickets: 5,
  parts: [
    { kind: "manga", title: "第4の催眠事件", schoolIntro: { kicker: "SINGA WORLD 催眠学校", beats: [
      { who: "teacher", tone: "question", text: "緊張して動けない相手へ、『落ち着いて』と言って、届かなかったことはありませんか？" },
      { who: "teacher", tone: "example", text: "『大丈夫』『いつも通りで』。正しい励ましでも、相手が今確かめられなければ言葉は外れます。" },
      { who: "link", tone: "reaction", text: "今日の実習、まさにそれでした。大丈夫と言われても、何が大丈夫か分からなかった。" },
      { who: "teacher", tone: "reveal", text: "そこでミオは、足と呼吸という二つの事実から始めました。" },
      { who: "link", tone: "reaction", text: "ただ事実を言うだけで、催眠の言葉になるんですか？" },
      { who: "teacher", tone: "address", text: "{{userName}}。三人で初めて実習をつないだ順番を、あなたが完成させてください。" },
    ], cta: "公開実習を見る →" }, briefing: { caseNo: "CASE 04", eyebrow: "変態催眠学者｜MILTON H. ERICKSON", title: "声が出ない公開実習", principle: "第4の催眠事件", hook: "『落ち着いて』で固まったリンクが、なぜ一言を話せた？", teaser: "ミオは二つの事実を言い、その続きに一つだけ提案した。", cta: "事件の漫画を見る →", note: "EPISODE 04｜漫画は1ページずつ進みます" }, frames: [1,2,3,4,5].map((n) => ({ img: `/learn/ep4/manga-v1/0${n}.webp`, alt: `リンクとミオの公開催眠実習を追う漫画 ${n}ページ目` })) },
    { kind: "experience", title: "言葉が届かなかった場面を選ぶ", minutes: 2, bridge: { beats: [
      { who: "teacher", text: "リンクは、緊張が消えたから話したのではありません。今分かる二つの事実から、次の一言を選びました。" },
      { who: "link", text: "あなたなら、誰がどんな時に言葉を失う場面を助けたいですか？" },
      { who: "teacher", text: "{{userName}}。一番近い場面を選んでください。その相手へ言う順番を後で作ります。" },
    ], cta: "相手の場面を選ぶ →" }, steps: [{ kind: "choice", q: "言葉をかけても届きにくいのは、どんな場面ですか？", help: "近いものを選ぶか、具体的な場面を一文で書けます。", storeAs: "tensionScene", completion: "option-or-detail", detail: { id: "ep4Detail", storeAs: "tensionScene", label: "相手が固まる具体的な場面は？", placeholder: "例：発表の直前、手が震えて声が出ない", helper: "一文か音声で答えられます。", then: [{ kind: "say", line: T("ep4-exp-detail", "その場面で相手が今確かめられる事実から、言葉を組み立てます。") }, { kind: "fade", text: "三人で実習を始める" }] }, options: [
      { label: "人前に出ると、声が出なくなる", value: "人前で声が出なくなる相手", then: [{ kind: "say", line: T("ep4-exp-a", "声を出せと求める前に、今分かる二つを確かめます。") }, { kind: "fade", text: "三人で実習を始める" }] },
      { label: "初対面の人を前に、手が震える", value: "初対面の人を前に手が震える相手", then: [{ kind: "say", line: T("ep4-exp-b", "震えを消す前に、本人が今確認できる事実を使います。") }, { kind: "fade", text: "三人で実習を始める" }] },
      { label: "失敗が怖くて、最初の一言を言えない", value: "失敗が怖くて最初の一言を言えない相手", then: [{ kind: "say", line: T("ep4-exp-c", "完成ではなく、次の一言までを催眠でつなぎます。") }, { kind: "fade", text: "三人で実習を始める" }] },
    ] }] },
    { kind: "adventure", scenario: EP4_ADVENTURE },
    { kind: "classroom", intro: { title: "なぜ、二つの事実の後なら一言を試せた？", lead: "今の体験へ言葉を合わせ、その続きに小さな提案を置く順番を整理します。" }, scenes: SCENES },
    { kind: "qa", title: "緊張している相手へ言葉を合わせる催眠について、質問はありますか？" },
    { kind: "card", lines: [T("ep4-card-01", "相手へ言葉を置く順番を、三段階で持って帰ってください。")], card: { series: "ERICKSON PRINCIPLE", no: "04", name: "PACING AND LEADING", reading: "ペーシング＆リーディング", principle: ["今確かめられる事実を二つ。", "その続きへ、選べる暗示を一つ。"], summary: "本人が今うなずける事実へ言葉を合わせ、その延長に小さな変化の提案を置く催眠の順番。", effect: "抽象的な励ましで押さず、本人の現在の体験から次の一動作を選びやすくする。", useWhen: ["人前で緊張して声が出ない時", "『落ち着いて』が相手に届かない時", "催眠の導入で相手の反応を確かめながら進む時"], howTo: ["観察できる事実を一つ言う", "もう一つ確かめられる事実を言う", "その続きに選べる一動作を提案する"] }, after: [T("ep4-card-02", "二つと一つは暗記の呪文ではありません。相手の返事が違えば止まり、別の事実へ戻ってください。", { face: "smile" })] },
    { kind: "outro", lines: [
      L("ep4-out-01", "{{tensionScene}}という場面でも、本人が今分かることから始めるんですね。", { dynamic: true, face: "aha" }),
      T("ep4-out-02", "あなたはミオへ、{{ep4Move}}。事実を二つ確かめ、次の一動作を本人へ返しました。", { dynamic: true, face: "smile" }),
      T("ep4-out-03", "今日、あなたは三人の実習を自分の言葉で最後までつなぎました。", { face: "smile" }),
      T("ep4-out-04", "今日の講義は、ここまでです。", { face: "smile" }),
      L("ep4-out-05", "ありがとうございました。ミオ、原理カードを保管庫へ戻すのも手伝ってくれる？", { face: "smile" }),
      T("ep4-out-06", "鍵はいつもの場所です。三人で片づけてください。", { face: "smile" }),
    ] },
    { kind: "teaser", manga: [{ rows: [{ panels: [{ art: "empty-vault", narr: "翌朝。保管庫の扉が開いていた。" }] }, { panels: [{ art: "link-shock", say: { who: "リンク", text: "カードが……全部ない。" } }, { art: "mio-key", sub: "机には、鍵の印。" }] }] }], hook: ["積み上げた原理カードが、すべて消えた。", "信じていたミオも、学校からいなくなった。"], next: { no: "第5話", title: "信じていた相手に予想を裏切られた時、催眠をどう解く？", series: "変態催眠学者の催眠の極意05", principle: "混乱を結論で埋めず、事実から選択を取り戻す" }, preview: { caseNo: "NEXT CASE 05", first: { who: "清瀬リンク", text: "ミオがいない。カードも全部ない。" }, teacher: "意味は、まだ決めない。今分かる事実を三つ言ってください。" }, unlock: ["🔒 70コインで解放"] },
  ],
  sceneSummaries: ["第4話は、緊張している相手へ、二つの確認できる事実と一つの小さな提案を順番に置く催眠を学ぶ。", "公開実習でリンクが固まり、抽象的な励ましは届かなかった。", "ミオが足と呼吸を言葉にし、リンクは次の一言を自分で選べた。", "プレイヤーはミオへ自分の催眠の一言を作り、相手の反応から順番の意味を考える。", "三人の信頼が深まり、ミオは原理カードを保管庫へ戻す作業へ加わる。", "ペーシングとリーディングは相手を操る方法ではなく、同意と観察を保ったまま次の一歩を提案する順番として扱う。"],
};

export const EP4_LEARNING_FLOW_QUALITY = assertEpisodeLearningFlow(EP4, EP4_FOUNDATION);
export const EP4_EXPERIENCE_QUALITY = assertEpisodeExperience(EP4);
