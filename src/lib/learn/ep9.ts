import type { Episode, Line, Scene, Slide } from "./types";
import { EP9_ADVENTURE } from "./ep9-adventure";
import { EP9_FOUNDATION } from "./ep9-foundation";
import { assertEpisodeLearningFlow } from "./episode-review";
import { assertEpisodeExperience } from "./episode-experience-review";

const T = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "teacher", text, ...extra });
const L = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "link", text, ...extra });
const S = (slide: Slide): Slide => slide;

const SCENES: Scene[] = [
  { no: 1, title: "助けたい焦りは、命令に変わる", lines: [
    L("ep9-lec1-1", "戻ってほしいから『戻れ』と言いたくなりました。でも、その瞬間にミオの体が固まった。", { face: "think", slide: S({ h: "助けたい\n↓\n今すぐ戻れ\n↓\n相手の選択が消える", style: "flow" }) }),
    T("ep9-lec1-2", "善意でも、相手が断れない言葉になれば命令です。まず、望みと怖さを両方聞きます。"),
    T("ep9-lec1-2b", "『相談されたなら、早く元気にすべきだ』という文化的催眠は、助ける側を急がせ、相手の時間を見えなくします。"),
    L("ep9-lec1-3", "戻りたい気持ちだけを本音だと決めなかったんですね。", { face: "aha" }),
  ], ticketHint: "善意が命令へ変わる境目を質問できます" },
  { no: 2, title: "しない自由を、先に言葉へ入れる", lines: [
    T("ep9-lec2-1", "『今は戻らなくてもよい』と先に伝えました。そのうえで、一歩だけ試す可能性を置きます。", { slide: S({ h: "しなくてもよい\n＋\n一歩だけ試してもよい", style: "vs", left: "拒否できる", right: "可能性を選べる" }) }),
    L("ep9-lec2-2", "戻らせる言葉ではなく、ミオが選べる範囲を広げた。", { face: "aha" }),
    T("ep9-lec2-3", "これを Permissive Suggestion、許可形の暗示と呼びます。"),
  ], ticketHint: "許可形の暗示の作り方を質問できます" },
  { no: 3, title: "優しい言い方でも、操作にはなる", lines: [
    T("ep9-lec3-1", "『できれば戻ってほしいな』も、断れば罪悪感を与えるなら自由な提案ではありません。", { slide: S({ h: "優しい口調\n＝\n自由な暗示？", style: "cross" }) }),
    L("ep9-lec3-2", "言葉の柔らかさより、本当に断れるかを見るんですね。", { face: "think" }),
    T("ep9-lec3-3", "はい。目的、関係、安全、止める自由がなければ、許可形だけ真似しても催眠の倫理は守れません。"),
  ], ticketHint: "許可と操作の違いを質問できます" },
  { no: 4, title: "主人公は、相手の時間を奪わない", lines: [
    T("ep9-lec4-1", "あなたは我慢を正しさとして押し付けられたからこそ、今度は助ける側の正しさを相手へ押し付けないと決めました。"),
    L("ep9-lec4-2", "僕らが作りたいのは、早く正解へ動く世界じゃない。本人が自分の時間で選べる世界です。", { face: "smile" }),
    T("ep9-lec4-3", "その判断が、催眠を技法から関係へ変えます。"),
  ], ticketHint: "催眠と本人の時間について質問できます" },
];

export const EP9: Episode = {
  key: "ep9", no: 9,
  title: "戻りたいのに動けない相手へ、催眠をどう使う？",
  subtitle: "変態催眠学者の催眠の極意09｜Permissive Suggestion",
  listing: { cover: "/learn/ep9/manga-v1/01.webp", coverAlt: "資料室の出口を見つめながら動けないミオ", caseNo: "CASE 09", hook: "戻れと言えば、また止まる。", principleNo: "エリクソン原理 09", mangaPages: 5, classroomScenes: 4, minutes: 23 },
  goal: { before: ["助けたい相手へ正解を強く求める", "ためらいを消そうとする", "優しい口調なら自由だと思う"], after: ["望みと怖さを両方聞く", "しない自由を先に残す", "一歩を可能性として提案する"], takeaway: "相手を正解へ動かさず、しない自由を残したまま、選べる一歩を許可形で提案する。" },
  tickets: 5,
  parts: [
    { kind: "manga", title: "第9の催眠事件", schoolIntro: { kicker: "SINGA WORLD 催眠学校｜資料室の奥", beats: [
      { who: "teacher", tone: "question", text: "助けたい相手ほど、『今すぐこうして』と強く言いたくなることはありませんか？" },
      { who: "teacher", tone: "example", text: "落ち込んだ友人から相談を受けた夜、返事が薄いほど『相談されたんだから、早く元気にしてあげなきゃ』と、励ます言葉を重ねる。それも文化的催眠です。" },
      { who: "link", tone: "reaction", text: "ミオを見つけたら、僕は絶対『戻れ』と言ってしまいます。" },
      { who: "teacher", tone: "reveal", text: "相手を早く正解へ動かすことと、相手が自分で動けることは違います。" },
      { who: "link", tone: "example", text: "資料室の奥にミオがいます。戻りたいのに、出口の前から動けない。" },
      { who: "teacher", tone: "address", text: "{{userName}}。戻らせるのではなく、ミオが自分で選べる最初の一歩を作ってください。" },
    ], cta: "ミオのもとへ行く →" }, briefing: { caseNo: "CASE 09", eyebrow: "SINGA WORLD｜THE PERMITTED STEP", title: "戻れないミオ", principle: "変態催眠学者の催眠の極意", hook: "『戻れ』と言わずに、どう一歩を生む？", teaser: "戻りたい。壊したくない。二つの気持ちが同時にあった。", cta: "事件の漫画を見る →", note: "EPISODE 09｜漫画は1ページずつ進みます" }, frames: [1,2,3,4,5].map((n) => ({ img: "/learn/ep9/manga-v1/0" + n + ".webp", alt: "出口の前で動けないミオへ言葉を選ぶ漫画 " + n + "ページ目" })) },
    { kind: "experience", title: "助けたい焦りが出る場面を選ぶ", minutes: 2, bridge: { beats: [
      { who: "teacher", text: "戻ってほしいという願いが強いほど、リンクの言葉は命令へ近づきました。" },
      { who: "link", text: "あなたも、相手を助けたくて急がせてしまうことはありますか？" },
      { who: "teacher", text: "{{userName}}。近い場面を選んでください。後で、その人が断れる暗示へ変えます。" },
    ], cta: "自分の場面を選ぶ →" }, steps: [{ kind: "choice", q: "助けたいほど、相手を急がせやすいのはどんな時ですか？", help: "近いものを選ぶか、自分の場面を一文で書けます。", storeAs: "helpingRush", completion: "option-or-detail", detail: { id: "ep9Detail", storeAs: "helpingRush", label: "どんな相手を急がせてしまいますか？", placeholder: "落ち込む相手へ、早く元気になってと言う時、など", helper: "相手の名前は書かなくて大丈夫です。", then: [{ kind: "say", line: T("ep9-exp-detail", "その場面を、相手が断れる許可形へ変えます。") }, { kind: "fade", text: "ミオのもとへ行く" }] }, options: [
      { label: "落ち込む人へ『元気を出して』と言う時", value: "落ち込む人へ元気を出すよう急がせる時", then: [{ kind: "say", line: T("ep9-exp-a", "元気を求める前に、今の気持ちと時間を認めます。") }, { kind: "fade", text: "ミオのもとへ行く" }] },
      { label: "迷う人へ『早く決めて』と言う時", value: "迷う人へ早く決めるよう急がせる時", then: [{ kind: "say", line: T("ep9-exp-b", "待つ選択も残し、決められる最小の範囲を探します。") }, { kind: "fade", text: "ミオのもとへ行く" }] },
      { label: "離れた人へ『戻ってきて』と言う時", value: "離れた人へ戻るよう強く求める時", then: [{ kind: "say", line: T("ep9-exp-c", "戻らない自由も残したうえで、本人の望みを聞きます。") }, { kind: "fade", text: "ミオのもとへ行く" }] },
    ] }] },
    { kind: "adventure", scenario: EP9_ADVENTURE },
    { kind: "classroom", intro: { title: "『戻れ』と言われなかったミオが、なぜ出口へ一歩進んだ？", lead: "ミオには、二人のもとへ戻りたい気持ちと、戻れば学びを壊すという怖さがありました。リンクたちは戻らない自由を残し、出口へ一歩だけ進む可能性を渡しました。本人が自分で選べる許可形の暗示を整理します。", basis: { subjectAnchor: "ミオ", eventAnchor: "戻れ", learningGoal: "しない自由を残し、本人が選べる一歩を許可形で提案する" } }, scenes: SCENES },
    { kind: "qa", title: "Permissive Suggestion、許可と操作、断れる言葉について質問はありますか？" },
    { kind: "card", lines: [T("ep9-card-01", "ミオが自分で選んだ一歩を、原理カードへ記録します。")], card: { series: "ERICKSON PRINCIPLE", no: "09", name: "PERMISSIVE SUGGESTION", reading: "パーミッシブ・サジェスチョン（許可形の暗示）", principle: ["しない自由を残し、", "一歩を可能性として提案する。"], summary: "今の気持ちを否定せず、しない自由を言葉にしたうえで、小さな変化を『してもよい』という可能性として渡す方法。", effect: "正解を迫られて固まった人が、自分の時間と意思で次の一歩を選びやすくする。", useWhen: ["戻りたいが怖くて動けない時", "助けたい相手を急がせそうな時", "自分へ強い命令をかけている時"], howTo: ["望みとためらいを両方認める", "しない・待つ自由を言葉にする", "最小の一歩を可能性として一つ提案する"] }, after: [T("ep9-card-02", "ミオは保管室の扉を指しました。そこには、最後の選択が待っています。", { face: "think" })] },
    { kind: "outro", lines: [
      L("ep9-out-01", "{{helpingRush}}という時ほど、助ける側が結果を急いでいたのかもしれない。", { dynamic: true, face: "aha" }),
      T("ep9-out-02", "あなたはミオへ、{{ep9Move}}。戻らせず、本人が選べる可能性を渡しました。", { dynamic: true, face: "smile" }),
      L("ep9-out-03", "ミオは一歩進んで、カードがある保管室を教えてくれました。でも、扉には条件があります。", { face: "think" }),
      T("ep9-out-04", "今日の講義はここまでです。次は、使えば勝てる催眠を前に、使わない判断を学びます。"),
      L("ep9-out-05", "カードを戻すためなら、一度だけ相手へ暗示を使ってもいいんでしょうか？", { face: "think" }),
    ] },
    { kind: "teaser", manga: [{ rows: [{ panels: [{ art: "archive-door", narr: "保管室の扉に、最後の条件が表示された。" }] }, { panels: [{ art: "mio-video", say: { who: "雨宮ミオ", text: "私へ『戻れ』と暗示すれば、扉は開きます。" } }, { art: "link-think", say: { who: "リンク", text: "使えば、カードを全部取り戻せる。" } }] }] }], hook: ["使えば勝てる。", "それでも、使ってよいとは限らない。"], next: { no: "第10話", title: "催眠で相手を動かせる時、何を守る？", series: "変態催眠学者の催眠の極意10", principle: "暗示の前に、本人の同意を守る" }, preview: { caseNo: "NEXT CASE 10", first: { who: "清瀬リンク", text: "ミオもカードを返したいなら、一度くらい使ってもいいのかな。" }, teacher: "結果が正しくても、本人の選択を省けば、あなたが壊したかった世界と同じになります。" }, unlock: ["第10話へ進む"] },
  ],
  sceneSummaries: ["資料室の奥で、戻りたいのに動けないミオを見つける。", "リンクは助けたい焦りから『戻れ』と言いかけ、ミオの反応で止まる。", "プレイヤーは言葉・視線・距離を確かめ、しない自由を残す暗示を作る。", "ミオは一歩を自分で選び、カードの保管場所を話す。", "主人公は助ける側の正しさより、本人の選択と時間を守る実習者へ成長する。"],
};

export const EP9_LEARNING_FLOW_QUALITY = assertEpisodeLearningFlow(EP9, EP9_FOUNDATION);
export const EP9_EXPERIENCE_QUALITY = assertEpisodeExperience(EP9);
